<?php

use craft\elements\Entry;
use craft\elements\User;
use ubiq\editorialpermissions\Plugin;
use yii\web\ForbiddenHttpException;

$testAppType = 'web';
$app = require __DIR__ . '/bootstrap.php';
$fixture = json_decode(file_get_contents(CRAFT_BASE_PATH . '/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
$plugin = Plugin::getInstance();
$checks = 0;
$assert = function(bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
};
$load = fn(int $id) => $plugin->guard->persisted($id, 1);
$user = User::find()->id($fixture['users']['editor'])->one();
$app->getUser()->setIdentity($user);
$denied = function(callable $operation, string $label) use ($assert): void {
    $transaction = Craft::$app->getDb()->beginTransaction();
    try {
        try {
            $operation();
        } catch (ForbiddenHttpException) {
            $assert(true, $label);
            return;
        }
        throw new RuntimeException("Expected denial: $label");
    } finally {
        if ($transaction->getIsActive()) $transaction->rollBack();
    }
};
$saved = function(callable $operation, string $label) use ($assert): void {
    $transaction = Craft::$app->getDb()->beginTransaction();
    try {
        $assert($operation() === true, $label);
    } finally {
        if ($transaction->getIsActive()) $transaction->rollBack();
    }
};

$matrix = $app->getFields()->getFieldById($fixture['matrix']);
$assert($plugin->permissions->enabled(), 'Managed scopes loaded');
foreach (array_keys(\ubiq\editorialpermissions\services\Permissions::ACTIONS) as $action) {
    $assert(!$plugin->permissions->matrix($matrix, $action), "Editor denied $action");
}
$saved(function() use ($load, $fixture, $app) {
    $block = $load($fixture['blocks'][0]);
    $block->setFieldValue('text', 'Changed content');
    return $app->getElements()->saveElement($block);
}, 'Direct existing nested content save');
$saved(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $page->title = 'Edited page';
    return $app->getElements()->saveElement($page);
}, 'Page save with Matrix omitted');
$denied(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $entries = $page->getFieldValue('sections')->all();
    $page->setFieldValue('sections', ['sortOrder' => array_reverse(array_column($entries, 'id'))]);
    $app->getElements()->saveElement($page);
}, 'Forged reorder through owner save');
$denied(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $page->setFieldValue('sections', []);
    $app->getElements()->saveElement($page);
}, 'Forged removal through owner save');
$denied(function() use ($load, $fixture, $app) {
    $block = $load($fixture['blocks'][0]);
    $block->enabled = false;
    $app->getElements()->saveElement($block);
}, 'Direct enabled toggle');
$denied(function() use ($load, $fixture, $app) {
    $block = $load($fixture['blocks'][0]);
    $block->setEnabledForSite(false);
    $app->getElements()->saveElement($block);
}, 'Direct site enabled toggle');
$denied(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $block = new Entry(['fieldId' => $fixture['matrix'], 'typeId' => $fixture['blockType'], 'title' => 'New']);
    $block->setOwner($page);
    $block->setPrimaryOwner($page);
    $app->getElements()->saveElement($block);
}, 'Direct nested creation');
$denied(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $page->typeId = $fixture['types'][1];
    $app->getElements()->saveElement($page);
}, 'Direct page type switch');
$assert(!$app->getElements()->canDelete($load($fixture['blocks'][0])), 'Native authorization denies nested deletion');
$assert(!$app->getElements()->canDuplicate($load($fixture['blocks'][0])), 'Native authorization denies nested duplication');
$assert(!$app->getElements()->canDuplicateAsDraft($load($fixture['page'])), 'Native page creation denies Save as new');
$assert(array_column($load($fixture['page'])->getAvailableEntryTypes(), 'id') === [$fixture['types'][0]], 'Existing type retained; forbidden switch choices hidden');
$denied(function() use ($fixture, $app) {
    $app->getElements()->saveElement(new Entry(['sectionId' => $fixture['section'], 'typeId' => $fixture['types'][0], 'title' => 'Forbidden page']));
}, 'Direct page creation without native create permission');
$transaction = $app->getDb()->beginTransaction();
try {
    $service = $app->getUserPermissions();
    $existing = $service->getPermissionsByUserId($user->id);
    $create = 'createEntries:' . $fixture['sectionUid'];
    $service->saveUserPermissions($user->id, [...$existing, $create]);
    $denied(function() use ($fixture, $app) {
        $app->getElements()->saveElement(new Entry(['sectionId' => $fixture['section'], 'typeId' => $fixture['types'][0], 'title' => 'Forbidden type']));
    }, 'Native create grant does not bypass managed type');
    $prefix = 'ubiq-editorial-permissions:entry-type:' . $fixture['sectionUid'] . ':' . $fixture['typeUids'][0];
    $service->saveUserPermissions($user->id, [...$existing, $create, "$prefix:create"]);
    $saved(fn() => $app->getElements()->saveElement(new Entry(['sectionId' => $fixture['section'], 'typeId' => $fixture['types'][0], 'title' => 'Allowed page'])), 'Native and type create grants permit new page');
    $assert(!$plugin->permissions->entryType($load($fixture['page']), 'switch-to'), 'Create grant does not grant switching');
} finally {
    $transaction->rollBack();
    $app->set('userPermissions', new \craft\services\UserPermissions());
}
$saved(function() use ($load, $fixture, $app, $user) {
    $draft = $app->getDrafts()->createDraft($load($fixture['page']), $user->id, 'Content draft');
    $draft->title = 'Draft content edit';
    return $app->getElements()->saveElement($draft);
}, 'Normal draft creation and content save');
$saved(function() use ($load, $fixture, $app, $user) {
    $draft = $app->getDrafts()->createDraft($load($fixture['page']), $user->id, 'Nested content draft');
    $draft->setFieldValue('sections', ['entries' => [
        $fixture['blocks'][0] => ['fields' => ['text' => 'Nested draft edit']],
    ]]);
    if (!$app->getElements()->saveElement($draft)) {
        throw new RuntimeException(json_encode($draft->getErrors()));
    }
    $published = $app->getDrafts()->applyDraft($draft);
    return $published->getFieldValue('sections')->one()->getFieldValue('text') === 'Nested draft edit';
}, 'Nested content draft save and apply');
$denied(fn() => $plugin->getSettingsResponse(), 'Non-admin settings access');

$originalSettings = $plugin->getSettings()->toArray();
$plugin->setSettings(['managedMatrixFieldUids' => [], 'managedEntryTypesBySectionUid' => []]);
$assert(!$plugin->guard->restricted(), 'Unmanaged configuration is inert');
$plugin->setSettings($originalSettings);

// Exercise native grants rather than stubbing User::can(). Roll back grants and
// replace the permission service afterwards to discard its request-local cache.
$grantTest = function(array $actions, callable $operation) use ($app, $user, $fixture): void {
    $transaction = $app->getDb()->beginTransaction();
    $service = $app->getUserPermissions();
    $existing = $service->getPermissionsByUserId($user->id);
    try {
        $service->saveUserPermissions($user->id, array_merge($existing, array_map(
            fn($action) => 'ubiq-editorial-permissions:matrix:' . $fixture['matrixUid'] . ':' . $action,
            $actions,
        )));
        $operation();
    } finally {
        $transaction->rollBack();
        $app->set('userPermissions', new \craft\services\UserPermissions());
    }
};
$grantTest(['duplicate-paste'], function() use ($plugin, $matrix, $assert) {
    $assert(!$plugin->permissions->matrix($matrix, 'duplicate-paste'), 'Duplicate grant also requires add');
});
$grantTest(['add', 'duplicate-paste'], function() use ($plugin, $matrix, $assert) {
    $assert($plugin->permissions->matrix($matrix, 'duplicate-paste'), 'Both duplicate grants permit action');
    $assert(!$plugin->permissions->matrix($matrix, 'delete'), 'Duplicate grant does not grant delete');
});
$grantTest(['reorder'], function() use ($saved, $load, $fixture, $app) {
    $saved(function() use ($load, $fixture, $app) {
        $page = $load($fixture['page']);
        $page->setFieldValue('sections', ['sortOrder' => array_reverse($page->getFieldValue('sections')->ids())]);
        return $app->getElements()->saveElement($page);
    }, 'Independent reorder grant');
});
$grantTest(['delete'], function() use ($saved, $load, $fixture, $app) {
    $saved(function() use ($load, $fixture, $app) {
        $page = $load($fixture['page']);
        $page->setFieldValue('sections', ['sortOrder' => [$fixture['blocks'][1]]]);
        return $app->getElements()->saveElement($page);
    }, 'Deletion without reorder permission');
});

$admin = User::find()->admin(true)->one();
$denied(function() use ($load, $fixture, $app, $user, $admin) {
    $app->getUser()->setIdentity($admin);
    $draft = $app->getDrafts()->createDraft($load($fixture['page']), $admin->id, 'Designer structure');
    $draft->setFieldValue('sections', ['sortOrder' => array_reverse($draft->getFieldValue('sections')->ids())]);
    $app->getElements()->saveElement($draft);
    $app->getUser()->setIdentity($user);
    $app->getDrafts()->applyDraft($draft);
}, 'Editor cannot publish an admin structural draft');
$denied(function() use ($load, $fixture, $app, $user, $admin) {
    $app->getUser()->setIdentity($admin);
    $page = $load($fixture['page']);
    $revisionId = $app->getRevisions()->createRevision($page, $admin->id, force: true);
    $page->setFieldValue('sections', ['sortOrder' => array_reverse($page->getFieldValue('sections')->ids())]);
    $app->getElements()->saveElement($page);
    $revision = $load($revisionId);
    $app->getUser()->setIdentity($user);
    $app->getRevisions()->revertToRevision($revision, $user->id);
}, 'Editor cannot restore a revision with different structure');
$denied(function() use ($load, $fixture, $app, $user, $admin) {
    $app->getUser()->setIdentity($admin);
    $destination = new Entry(['sectionId' => $fixture['section'], 'typeId' => $fixture['types'][0], 'title' => 'Destination']);
    $app->getElements()->saveElement($destination);
    $block = $load($fixture['blocks'][0]);
    $block->setOwner($destination);
    $block->setPrimaryOwner($destination);
    $app->getUser()->setIdentity($user);
    $app->getElements()->saveElement($block);
}, 'Existing identity cannot bypass cross-owner insertion checks');
$app->getUser()->setIdentity($admin);
foreach (array_keys(\ubiq\editorialpermissions\services\Permissions::ACTIONS) as $action) {
    $assert($plugin->permissions->matrix($matrix, $action), "Admin bypass $action");
}
$saved(function() use ($load, $fixture, $app) {
    $page = $load($fixture['page']);
    $page->setFieldValue('sections', ['sortOrder' => array_reverse($page->getFieldValue('sections')->ids())]);
    return $app->getElements()->saveElement($page);
}, 'Admin structural edit');

$transaction = $app->getDb()->beginTransaction();
try {
    // A Matrix field can also belong to a GlobalSet, not only an Entry.
    $global = new \craft\elements\GlobalSet(['name' => 'Editorial test global', 'handle' => 'editorialTestGlobal']);
    $layout = clone $load($fixture['page'])->getFieldLayout();
    $layout->id = null;
    $layout->uid = \craft\helpers\StringHelper::UUID();
    $layout->type = \craft\elements\GlobalSet::class;
    $global->setFieldLayout($layout);
    $assert($app->getGlobals()->saveSet($global), 'Create disposable global Matrix owner');
    $child = new Entry(['fieldId' => $fixture['matrix'], 'typeId' => $fixture['blockType'], 'title' => 'Global content']);
    $child->setOwner($global);
    $child->setPrimaryOwner($global);
    $assert($app->getElements()->saveElement($child), 'Seed global nested entry');
    $app->getUser()->setIdentity($user);
    $assert($app->getElements()->saveElement($global), 'Existing global Matrix content is not treated as new structure');
    $denied(function() use ($global, $app) {
        $global->setFieldValue('sections', []);
        $app->getElements()->saveElement($global);
    }, 'Global Matrix removal denied');
} finally {
    $transaction->rollBack();
    $app->getUser()->setIdentity($admin);
}

$transaction = $app->getDb()->beginTransaction();
try {
    $group = new \craft\models\UserGroup(['name' => 'Editorial add', 'handle' => 'editorialAdd']);
    $assert($app->getUserGroups()->saveGroup($group), 'Create native test group');
    $group2 = new \craft\models\UserGroup(['name' => 'Editorial reorder', 'handle' => 'editorialReorder']);
    $assert($app->getUserGroups()->saveGroup($group2), 'Create second native test group');
    $prefix = 'ubiq-editorial-permissions:matrix:' . $fixture['matrixUid'] . ':';
    $app->getUserPermissions()->saveGroupPermissions($group->id, [$prefix . 'add']);
    $app->getUserPermissions()->saveGroupPermissions($group2->id, [$prefix . 'reorder']);
    $app->getUsers()->assignUserToGroups($user->id, [$group->id, $group2->id]);
    $app->set('userPermissions', new \craft\services\UserPermissions());
    $app->getUser()->setIdentity($user);
    $assert($plugin->permissions->matrix($matrix, 'add'), 'First group grant inherited');
    $assert($plugin->permissions->matrix($matrix, 'reorder'), 'Second group grant adds permissions');
    $assert(!$plugin->permissions->matrix($matrix, 'delete'), 'Groups do not grant unrelated actions');
} finally {
    $transaction->rollBack();
    $app->set('userPermissions', new \craft\services\UserPermissions());
    $app->getUser()->setIdentity($admin);
}

$invalid = new \ubiq\editorialpermissions\models\Settings(['managedMatrixFieldUids' => ['not-a-field']]);
$assert(!$invalid->validate(), 'Invalid field UID rejected');
$invalid = new \ubiq\editorialpermissions\models\Settings(['managedEntryTypesBySectionUid' => [$fixture['sectionUid'] => ['not-a-type']]]);
$assert(!$invalid->validate(), 'Invalid section/type association rejected');
$empty = new \ubiq\editorialpermissions\models\Settings(['managedMatrixFieldUids' => '', 'managedEntryTypesBySectionUid' => '']);
$assert($empty->validate() && $empty->managedMatrixFieldUids === [] && $empty->managedEntryTypesBySectionUid === [], 'Empty checkboxes normalize to arrays');

$transaction = $app->getDb()->beginTransaction();
try {
    $type = $app->getEntries()->getEntryTypeById($fixture['blockType']);
    $inner = new \craft\fields\Matrix(['name' => 'Inner items', 'handle' => 'innerItems', 'viewMode' => 'blocks']);
    $inner->setEntryTypes([$type]);
    $assert($app->getFields()->saveField($inner), 'Create independently managed nested Matrix fixture');
    $layout = $type->getFieldLayout();
    $tab = new \craft\models\FieldLayoutTab(['name' => 'Items']);
    $tab->setLayout($layout);
    $tab->setElements([new \craft\fieldlayoutelements\CustomField($inner)]);
    $layout->setTabs([...$layout->getTabs(), $tab]);
    $assert($app->getEntries()->saveEntryType($type), 'Attach nested Matrix');
    $parent = $load($fixture['blocks'][0]);
    $app->getUser()->setIdentity($user);
    $child = new Entry(['fieldId' => $inner->id, 'typeId' => $type->id, 'title' => 'Nested item']);
    $child->setOwner($parent);
    $child->setPrimaryOwner($parent);
    $assert($app->getElements()->saveElement($child), 'Unmanaged inner Matrix permits additions despite locked outer field');
    $plugin->setSettings(['managedMatrixFieldUids' => [$fixture['matrixUid'], $inner->uid]]);
    $denied(function() use ($parent, $inner, $type, $app) {
        $child = new Entry(['fieldId' => $inner->id, 'typeId' => $type->id, 'title' => 'Forbidden nested item']);
        $child->setOwner($parent);
        $child->setPrimaryOwner($parent);
        $app->getElements()->saveElement($child);
    }, 'Managed inner Matrix enforces its own policy');
    $parent = $load($fixture['blocks'][0]);
    $parent->setFieldValue('text', 'Content with nested structure');
    $assert($app->getElements()->saveElement($parent), 'Outer content save preserves independently locked inner structure');
} finally {
    $transaction->rollBack();
    $plugin->setSettings($originalSettings);
    $app->getUser()->setIdentity($admin);
}
echo "$checks Craft integration assertions passed.\n";
