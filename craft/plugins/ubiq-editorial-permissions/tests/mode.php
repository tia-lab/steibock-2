<?php

$app = require __DIR__ . '/bootstrap.php';
$mode = $argv[1] ?? '';
if (!in_array($mode, ['blocks', 'cards', 'cards-grid', 'index'], true)) {
    throw new RuntimeException('Specify blocks, cards, cards-grid, or index.');
}
$fixture = json_decode(file_get_contents(CRAFT_BASE_PATH . '/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
$field = $app->getFields()->getFieldById($fixture['matrix']);
$field->viewMode = $mode;
if (!$app->getFields()->saveField($field)) {
    throw new RuntimeException(json_encode($field->getErrors()));
}
$app->getProjectConfig()->flush();
