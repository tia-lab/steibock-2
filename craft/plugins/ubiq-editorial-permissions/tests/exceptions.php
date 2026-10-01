<?php

use craft\elements\Entry;
use craft\elements\User;
use ubiq\editorialpermissions\Plugin;
use ubiq\editorialpermissions\models\Settings;
use yii\web\ForbiddenHttpException;

$testAppType = 'web';
$app = require __DIR__ . '/bootstrap.php';
$fixture = json_decode(file_get_contents(CRAFT_BASE_PATH . '/fixture.json'), true);
$plugin = Plugin::getInstance();
$original = $plugin->getSettings()->toArray();
$edition = $app->edition;
$checks = 0;
$assert = function(bool $value, string $message) use (&$checks) {
    if (!$value) throw new RuntimeException($message);
    $checks++;
};
$transaction = $app->getDb()->beginTransaction();
try {
    $admin = User::find()->admin(true)->one();
    $app->getUser()->setIdentity($admin);
    $user = User::find()->username('editor')->one();
    $group = new \craft\models\UserGroup(['name' => 'Exception editors', 'handle' => 'exceptionEditors']);
    $assert($app->getUserGroups()->saveGroup($group), 'Group saved');
    $app->getUsers()->assignUserToGroups($user->id, [$group->id]);
    $user = User::find()->id($user->id)->one();
    $page = $plugin->guard->persisted($fixture['page'], 1);
    $other = new Entry(['sectionId' => $page->sectionId, 'typeId' => $page->typeId, 'title' => 'Other page']);
    $assert($app->getElements()->saveElement($other), 'Other page seeded');
    $field = $app->getFields()->getFieldById($fixture['matrix']);
    $rule = ['fieldUid' => $field->uid, 'groupUid' => $group->uid, 'target' => "entry:$page->uid", 'reorder' => true];
    $model = new Settings($original + ['matrixExceptions' => []]);
    $model->matrixExceptions = [$rule];
    $assert($model->validate(), 'Valid page exception accepted');
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $app->getUser()->setIdentity($user);
    $assert($plugin->permissions->matrix($field, 'reorder', owner: $page), 'Page exception allows chosen action');
    $assert(!$plugin->permissions->matrix($field, 'add', owner: $page), 'Other actions remain locked');
    $assert(!$plugin->permissions->matrix($field, 'reorder', owner: $other), 'Other pages remain locked');
    $assert(!$plugin->permissions->matrix($field, 'reorder', User::find()->username('designer')->one(), $page), 'Other groups remain locked');
    $page->setFieldValue('sections', ['sortOrder' => array_reverse($page->getFieldValue('sections')->ids())]);
    $assert($app->getElements()->saveElement($page), 'Exception authorizes actual owner reorder save');
    $draft = $app->getDrafts()->createDraft($page, $user->id, 'Exception draft');
    $assert($plugin->permissions->matrix($field, 'reorder', owner: $draft), 'Canonical page exception applies to draft');
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => []]));
    try {
        $plugin->guard->requireMatrix($field, 'reorder', $page);
        throw new RuntimeException('Revoked exception still allows reorder');
    } catch (ForbiddenHttpException) { $checks++; }
    $rule['target'] = 'type:' . $page->getSection()->uid . ':' . $page->getType()->uid;
    $rule['duplicate-paste'] = true;
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $assert($plugin->permissions->matrix($field, 'reorder', owner: $other), 'Type exception applies to other page of same type');
    $assert(!$plugin->permissions->matrix($field, 'duplicate-paste', owner: $page), 'Duplicate still requires Add');
    $rule['add'] = true;
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $assert($plugin->permissions->matrix($field, 'duplicate-paste', owner: $page), 'Add and duplicate exception combine');
    $child = new Entry(['fieldId' => $field->id, 'typeId' => $fixture['blockType'], 'title' => 'Allowed nested content']);
    $child->setOwner($page);
    $child->setPrimaryOwner($page);
    $assert($app->getElements()->saveElement($child), 'Exception permits actual nested insertion');
    $assert(!$app->getElements()->canDelete($child), 'Exception does not enable unrelated native delete action');
    $rule['delete'] = true;
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $assert($app->getElements()->canDelete($child), 'Delete exception reaches native authorization');
    $assert($plugin->permissions->matrix($field, 'add', owner: $child), 'Containing page context resolves through nested owner');
    $rule['target'] = 'type:' . $page->getSection()->uid . ':' . $fixture['typeUids'][1];
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $page->typeId = $fixture['types'][1];
    $assert(!$plugin->permissions->matrix($field, 'add', owner: $page), 'Forged type change cannot obtain exception');
    $rule['target'] = 'entry:missing';
    $model->matrixExceptions = [$rule];
    $assert(!$model->validate(), 'Stale target rejected');
    $model->matrixExceptions = '';
    $assert($model->validate() && $model->matrixExceptions === [], 'Empty table normalizes');
    $app->getUser()->setIdentity($admin);
    $assert($plugin->permissions->matrix($field, 'add', owner: $page), 'Admin remains exempt');
    $app->setEdition(\craft\enums\CmsEdition::Team);
    $team = $app->getUserGroups()->getTeamGroup();
    $rule = ['fieldUid' => $field->uid, 'groupUid' => $team->uid, 'target' => "entry:$page->uid", 'add' => true];
    $plugin->setSettings(array_replace($original, ['matrixExceptions' => [$rule]]));
    $app->getUser()->setIdentity($user);
    $assert($plugin->permissions->matrix($field, 'add', owner: $page), 'Team users inherit the implicit Team exception');
    $assert(!$plugin->permissions->matrix($field, 'delete', owner: $page), 'Team exception does not grant other actions');
    $assert(!$plugin->permissions->matrix($field, 'add', owner: $other), 'Team exception remains page scoped');
} finally {
    $transaction->rollBack();
    $app->setEdition($edition);
    $plugin->setSettings($original);
}
echo "$checks exception assertions passed.\n";
