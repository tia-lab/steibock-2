<?php

namespace modules\headless;

use Craft;
use craft\events\ElementEvent;
use craft\helpers\ElementHelper;
use craft\services\Elements;
use modules\headless\cache_revalidation\CacheTagBuilder;
use modules\headless\cache_revalidation\NextRevalidator;
use yii\base\Module;
use yii\db\Connection;

class HeadlessModule extends Module
{
    private \WeakMap $before;
    private array $pendingTags = [];

    public function init(): void
    {
        Craft::setAlias('@modules/headless', __DIR__);
        parent::init();
        $this->before = new \WeakMap();
        $elements = Craft::$app->getElements();
        foreach ([Elements::EVENT_BEFORE_SAVE_ELEMENT, Elements::EVENT_BEFORE_DELETE_ELEMENT,
            Elements::EVENT_BEFORE_RESTORE_ELEMENT] as $event) {
            $elements->on($event, function(ElementEvent $event) {
                if (!ElementHelper::isDraftOrRevision($event->element)) {
                    $this->before[$event->element] = CacheTagBuilder::before($event->element);
                }
            });
        }
        foreach ([Elements::EVENT_AFTER_SAVE_ELEMENT, Elements::EVENT_AFTER_DELETE_ELEMENT,
            Elements::EVENT_AFTER_RESTORE_ELEMENT] as $event) {
            $elements->on($event, fn(ElementEvent $event) => $this->handleElementEvent($event));
        }
        $db = Craft::$app->getDb();
        $db->on(Connection::EVENT_COMMIT_TRANSACTION, function() {
            $tags = $this->pendingTags;
            $this->pendingTags = [];
            if ($tags) NextRevalidator::send($tags);
        });
        $db->on(Connection::EVENT_ROLLBACK_TRANSACTION, function() {
            $this->pendingTags = [];
            $this->before = new \WeakMap();
        });
    }

    private function handleElementEvent(ElementEvent $event): void
    {
        $element = $event->element;
        if (ElementHelper::isDraftOrRevision($element)) return;
        $tags = CacheTagBuilder::forChange(
            $element,
            $this->before[$element] ?? null,
            $event->name !== Elements::EVENT_AFTER_SAVE_ELEMENT || $event->isNew,
        );
        unset($this->before[$element]);
        if (!$tags) return;
        if (Craft::$app->getDb()->getTransaction()?->getIsActive()) {
            $this->pendingTags = CacheTagBuilder::normalize([...$this->pendingTags, ...$tags]);
        } else {
            NextRevalidator::send($tags);
        }
    }
}
