<?php

$app = require __DIR__ . '/bootstrap.php';
$plugin = $app->getPlugins()->getPlugin('ubiq-editorial-permissions');
if (($argv[1] ?? '') === 'reset') {
    $settings = $plugin->getSettings()->toArray();
    $settings['matrixExceptions'] = [];
    if (!$app->getPlugins()->savePluginSettings($plugin, $settings)) throw new RuntimeException('Could not reset exceptions.');
} else {
    $group = $app->getUserGroups()->getGroupByHandle('exceptionDesigners')
        ?? new \craft\models\UserGroup(['name' => 'Exception designers', 'handle' => 'exceptionDesigners']);
    if (!$app->getUserGroups()->saveGroup($group)) throw new RuntimeException('Could not save fixture group.');
    $user = \craft\elements\User::find()->username('designer')->one();
    $app->getUsers()->assignUserToGroups($user->id, [$group->id]);
    $fixture = json_decode(file_get_contents(CRAFT_BASE_PATH . '/fixture.json'), true);
    $page = \craft\elements\Entry::find()->id($fixture['page'])->status(null)->one();
    echo json_encode(['groupUid' => $group->uid, 'target' => "entry:$page->uid"]);
}
$app->getProjectConfig()->flush();
