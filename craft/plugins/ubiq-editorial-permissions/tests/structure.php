<?php

require dirname(__DIR__) . '/src/services/Structure.php';

use ubiq\editorialpermissions\services\Structure;

$row = ['type' => 1, 'enabled' => true];
$cases = [
    'unchanged content' => [['a' => $row, 'b' => $row], ['a' => $row, 'b' => $row], []],
    'empty field add' => [[], ['a' => $row], ['add']],
    'delete all including disabled' => [['a' => ['type' => 1, 'enabled' => false]], [], ['delete']],
    'insert without reordering survivors' => [['a' => $row, 'b' => $row], ['a' => $row, 'new' => $row, 'b' => $row], ['add']],
    'delete without reordering survivors' => [['a' => $row, 'b' => $row, 'c' => $row], ['a' => $row, 'c' => $row], ['delete']],
    'reorder survivors' => [['a' => $row, 'b' => $row], ['b' => $row, 'a' => $row], ['reorder']],
    'replace identity' => [['a' => $row], ['b' => $row], ['add', 'delete']],
    'replace type' => [['a' => $row], ['a' => ['type' => 2, 'enabled' => true]], ['delete', 'add']],
    'disable' => [['a' => $row], ['a' => ['type' => 1, 'enabled' => false]], ['toggle-enabled']],
    'mixed changes' => [['a' => $row, 'b' => $row, 'c' => $row], ['c' => $row, 'a' => ['type' => 2, 'enabled' => false], 'd' => $row], ['add', 'delete', 'reorder', 'toggle-enabled']],
];
foreach ($cases as $name => [$before, $after, $expected]) {
    $actual = Structure::changes($before, $after);
    sort($actual);
    sort($expected);
    if ($actual !== $expected) {
        throw new RuntimeException("Failed: $name — " . json_encode($actual));
    }
}
echo count($cases) . " structural policy cases passed.\n";
