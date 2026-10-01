<?php

use craft\elements\Entry;
use craft\elements\Asset;
use craft\elements\GlobalSet;
use craft\elements\User;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Exception\ConnectException;
use modules\headless\HeadlessModule;
use modules\headless\cache_revalidation\CacheTagBuilder as Tags;
use modules\headless\cache_revalidation\NextRevalidator;

// Reuse the existing marked disposable Craft fixture; never bootstrap project env.
$app = require dirname(__DIR__, 3) . '/plugins/ubiq-editorial-permissions/tests/bootstrap.php';
$fixture = json_decode(file_get_contents(CRAFT_BASE_PATH . '/fixture.json'), true);
$checks = 0;
$assert = function(bool $value, string $message) use (&$checks) {
    if (!$value) throw new RuntimeException($message);
    $checks++;
};
$load = fn($id) => Entry::find()->id($id)->status(null)->one();
putenv('CRAFT_REVALIDATE_URL=http://127.0.0.1:1/api/revalidate');
putenv('REVALIDATE_SECRET=disposable-cache-test');
$history = [];
$queue = new MockHandler();
$handler = HandlerStack::create($queue);
$handler->push(Middleware::history($history));
Craft::$container->set(Client::class, fn($container, $params) => new Client(array_replace($params[0] ?? [], ['handler' => $handler])));

foreach ([200 => 1, 400 => 1, 401 => 1, 403 => 1, 404 => 1, 501 => 1, 408 => 2, 429 => 2, 500 => 2, 502 => 2, 503 => 2, 504 => 2] as $status => $attempts) {
    $queue->reset(); $history = [];
    $queue->append(new Response($status), new Response(200));
    NextRevalidator::send(['craft:news']);
    $assert(count($history) === $attempts, "Attempt policy for $status");
    if ($attempts === 2) {
        $assert((string)$history[0]['request']->getBody() === (string)$history[1]['request']->getBody(), 'Retry payload identical');
    }
}
$queue->reset(); $history = [];
$queue->append(new Response(503, ['Retry-After' => '60']));
NextRevalidator::send(['craft:news']);
$assert(count($history) === 1, 'Retry-After beyond budget is not ignored');
$queue->reset(); $history = [];
$queue->append(new ConnectException('Private diagnostic', new Request('POST', 'http://127.0.0.1'), null, ['errno' => 7]), new Response(200));
NextRevalidator::send(['craft:news']);
$assert(count($history) === 2, 'Connection failure retries');
$queue->reset(); $history = [];
$queue->append(new ConnectException('TLS failure', new Request('POST', 'http://127.0.0.1'), null, ['errno' => 60]));
NextRevalidator::send(['craft:news']);
$assert(count($history) === 1, 'TLS failure does not retry');
$queue->reset(); $history = [];
$queue->append(new Response(503), new Response(503));
NextRevalidator::send(['craft:news']);
$assert(count($history) === 2, 'Retries stop after two failures');
$assert($history[0]['options']['timeout'] <= 1.2 && $history[1]['options']['timeout'] < 2, 'Timeouts are bounded');
$history = [];
NextRevalidator::send([]);
$assert(!$history, 'Empty tags do not send');
putenv('REVALIDATE_SECRET');
NextRevalidator::send(['craft']);
$assert(!$history, 'Missing secret does not send');
putenv('REVALIDATE_SECRET=disposable-cache-test');
$assert(Tags::normalize(array_map(fn($i) => "craft:entry:$i", range(1, 129))) === ['craft'], 'Overflow uses full fallback');
$assert(Tags::normalize(['CRAFT:entry-uri:Foo/Bar', 'craft:entry-uri:foo/bar']) === ['craft:entry-uri:foo-bar'], 'Stable normalization and deduplication');
$assert(Tags::forElement(new Asset()) === ['craft:assets'], 'Assets invalidate asset consumers');
$assert(Tags::forElement(new GlobalSet()) === ['craft:globals'], 'Globals invalidate combined globals');
$assert(Tags::forElement(new User()) === [], 'Unrelated element ignored');

// Enable real lifecycle hooks, with a controlled HTTP transport only.
$module = new HeadlessModule('cache-test');
$queue->reset(); $history = [];
$queue->append(...array_fill(0, 100, new Response(200)));
$transaction = $app->getDb()->beginTransaction();
try {
    $page = $load($fixture['page']);
    $section = $page->getSection();
    $sites = $section->getSiteSettings();
    $sites[1]->hasUrls = true;
    $sites[1]->uriFormat = '{slug}';
    $sites[1]->template = 'index';
    $section->setSiteSettings($sites);
    $assert($app->getEntries()->saveSection($section), 'Fixture routes enabled');
    $page->slug = 'cache-page-a';
    $assert($app->getElements()->saveElement($page), 'Seed page URI');
    $page = $load($page->id);
    $before = Tags::before($page);
    $page->setFieldValue('sections', $page->getFieldValue('sections'));
    $assert(Tags::forChange($page, $before) === ['craft:entry-uri:cache-page-a'], 'Body edit stays URI scoped');
    $page->uri = 'cache-page-b';
    $tags = Tags::forChange($page, $before);
    $assert(in_array('craft:entry-uri:cache-page-a', $tags) && in_array('craft:entry-uri:cache-page-b', $tags), 'Old and new URIs retained');
    $assert(in_array('craft:entry-links', $tags), 'URI change refreshes linked metadata');
    $page = $load($fixture['page']);
    $page->title = 'Linked title changes';
    $assert(in_array('craft:entry-links', Tags::forChange($page, $before)), 'Title change invalidates links');
    $assert(in_array('craft:entry-links', Tags::forChange($page, $before, true)), 'Deletion/restoration invalidates links');
    $assert(Tags::forChange($page, null) === ['craft'], 'Unknown before state falls back');
    $block = $load($fixture['blocks'][0]);
    $assert(Tags::forElement($block) === ['craft:entry-uri:cache-page-a'], 'Nested block follows containing page');
    $block->setFieldValue('text', 'Nested changed text');
    $assert($app->getElements()->saveElement($block), 'Actual nested content save');
    $assert(!$history, 'No HTTP request while outer transaction is open');
    foreach (['news' => 'craft:news', 'navigations' => 'craft:navigation', 'reusableSections' => 'craft:section:reusablesections'] as $handle => $expected) {
        $family = new \craft\models\Section(['name' => $handle, 'handle' => $handle, 'type' => 'channel']);
        $family->setEntryTypes([$page->getType()]);
        $family->setSiteSettings([1 => new \craft\models\Section_SiteSettings(['siteId' => 1, 'hasUrls' => false])]);
        $assert($app->getEntries()->saveSection($family), "Create $handle fixture");
        $entry = new Entry(['sectionId' => $family->id, 'typeId' => $page->typeId]);
        $assert(Tags::forElement($entry) === [$expected], "$handle dependency family");
    }
    $global = new GlobalSet(['name' => 'Cache global', 'handle' => 'cacheGlobal']);
    $layout = clone $page->getFieldLayout();
    $layout->id = null;
    $layout->uid = \craft\helpers\StringHelper::UUID();
    $layout->type = GlobalSet::class;
    $global->setFieldLayout($layout);
    $assert($app->getGlobals()->saveSet($global), 'Create global Matrix owner');
    $nested = new Entry(['fieldId' => $fixture['matrix'], 'typeId' => $fixture['blockType']]);
    $nested->setOwner($global);
    $nested->setPrimaryOwner($global);
    $assert(Tags::forElement($nested) === ['craft:globals'], 'Nested global content refreshes globals');
} finally {
    $transaction->rollBack();
}
$assert(!$history, 'Rolled-back changes never dispatch');
$transaction = $app->getDb()->beginTransaction();
$page = $load($fixture['page']);
$page->slug = 'cache-commit-test';
$assert($app->getElements()->saveElement($page), 'Canonical save inside outer transaction');
$assert(!$history, 'Callback deferred until commit');
$transaction->commit();
$assert(count($history) === 1, 'Committed transaction dispatches once');
$history = [];
$transaction = $app->getDb()->beginTransaction();
try {
    $draft = $app->getDrafts()->createDraft($load($fixture['page']), null, 'Cache test draft');
    $draft->title = 'Draft only';
    $assert($app->getElements()->saveElement($draft), 'Draft saved');
    $assert(Tags::forElement($draft) === [], 'Draft has no published invalidation');
    $assert(!$history, 'No draft callback');
} finally {
    $transaction->rollBack();
}
echo "$checks cache assertions passed.\n";
