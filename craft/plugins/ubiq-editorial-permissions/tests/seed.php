<?php

use craft\elements\Entry;
use craft\elements\User;
use craft\enums\CmsEdition;
use craft\fieldlayoutelements\CustomField;
use craft\fields\Matrix;
use craft\fields\PlainText;
use craft\models\EntryType;
use craft\models\FieldLayout;
use craft\models\FieldLayoutTab;
use craft\models\Section;
use craft\models\Section_SiteSettings;

$app = require __DIR__ . '/bootstrap.php';
if (is_file(CRAFT_BASE_PATH . '/fixture.json')) {
    throw new RuntimeException('Fixture already seeded. Reuse it or create a fresh disposable app.');
}
// Edition change is confined to the marked disposable fixture, never the project.
$app->setEdition(CmsEdition::Pro);
$save = function($service, string $method, $model): void {
    if (!$service->$method($model)) {
        throw new RuntimeException($method . ': ' . json_encode($model->getErrors()));
    }
};
$layout = function(array $fields): FieldLayout {
    $layout = new FieldLayout(['type' => Entry::class]);
    $tab = new FieldLayoutTab(['name' => 'Content']);
    $tab->setLayout($layout);
    $tab->setElements(array_map(fn($field) => new CustomField($field), $fields));
    $layout->setTabs([$tab]);
    return $layout;
};
$text = $app->getFields()->getFieldByHandle('text') ?? new PlainText(['name' => 'Text', 'handle' => 'text']);
$save($app->getFields(), 'saveField', $text);
$block = new EntryType(['name' => 'Content', 'handle' => 'content', 'hasTitleField' => true]);
$block->setFieldLayout($layout([$text]));
$save($app->getEntries(), 'saveEntryType', $block);
$matrix = new Matrix(['name' => 'Sections', 'handle' => 'sections', 'viewMode' => Matrix::VIEW_MODE_BLOCKS]);
$matrix->setEntryTypes([$block]);
$save($app->getFields(), 'saveField', $matrix);
$types = [];
foreach (['page', 'landing'] as $handle) {
    $type = new EntryType(['name' => ucfirst($handle), 'handle' => $handle, 'hasTitleField' => true]);
    $type->setFieldLayout($layout([$matrix]));
    $save($app->getEntries(), 'saveEntryType', $type);
    $types[] = $type;
}
$section = new Section(['name' => 'Pages', 'handle' => 'pages', 'type' => Section::TYPE_CHANNEL]);
$section->setEntryTypes($types);
$section->setSiteSettings([1 => new Section_SiteSettings([
    'siteId' => 1, 'hasUrls' => false, 'enabledByDefault' => true,
])]);
$save($app->getEntries(), 'saveSection', $section);
$users = [];
foreach (['editor', 'designer'] as $name) {
    $user = new User(['username' => $name, 'email' => "$name@example.test", 'newPassword' => 'EditorialFixture123!']);
    $save($app->getElements(), 'saveElement', $user);
    $app->getUsers()->activateUser($user);
    $app->getUserPermissions()->saveUserPermissions($user->id, [
        'accessCp', 'editSite:' . $app->getSites()->getPrimarySite()->uid,
        "viewEntries:$section->uid", "viewPeerEntries:$section->uid",
        "saveEntries:$section->uid", "savePeerEntries:$section->uid",
        "savePeerEntryDrafts:$section->uid", "viewPeerEntryDrafts:$section->uid",
    ]);
    $users[$name] = $user->id;
}
$page = new Entry(['sectionId' => $section->id, 'typeId' => $types[0]->id, 'title' => 'Fixture page']);
$save($app->getElements(), 'saveElement', $page);
$blocks = [];
foreach (['One', 'Two'] as $title) {
    $entry = new Entry(['fieldId' => $matrix->id, 'typeId' => $block->id, 'title' => $title]);
    $entry->setOwner($page);
    $entry->setPrimaryOwner($page);
    $entry->setFieldValue('text', 'Original ' . $title);
    $save($app->getElements(), 'saveElement', $entry);
    $blocks[] = $entry->id;
}
$plugin = $app->getPlugins()->getPlugin('ubiq-editorial-permissions');
if (!$app->getPlugins()->savePluginSettings($plugin, [
    'managedMatrixFieldUids' => [$matrix->uid],
    'managedEntryTypesBySectionUid' => [$section->uid => array_column($types, 'uid')],
])) {
    throw new RuntimeException(json_encode($plugin->getSettings()->getErrors()));
}
file_put_contents(CRAFT_BASE_PATH . '/fixture.json', json_encode([
    'users' => $users, 'page' => $page->id, 'blocks' => $blocks,
    'matrix' => $matrix->id, 'matrixUid' => $matrix->uid,
    'section' => $section->id, 'sectionUid' => $section->uid,
    'types' => array_column($types, 'id'), 'typeUids' => array_column($types, 'uid'),
    'blockType' => $block->id,
], JSON_PRETTY_PRINT));
$app->getProjectConfig()->flush();
echo "Disposable Pro fixture seeded.\n";
