<?php

namespace ubiq\editorialpermissions\services;

/** Compares logical identities, not draft IDs or absolute sort positions. */
final class Structure
{
    /**
     * @param array<string, array{type: int, enabled: bool, enabledForSite?: bool}> $before
     * @param array<string, array{type: int, enabled: bool, enabledForSite?: bool}> $after
     * @return string[]
     */
    public static function changes(array $before, array $after): array
    {
        $actions = [];
        if (array_diff_key($after, $before)) {
            $actions[] = 'add';
        }
        if (array_diff_key($before, $after)) {
            $actions[] = 'delete';
        }
        if (array_keys(array_intersect_key($before, $after)) !== array_keys(array_intersect_key($after, $before))) {
            $actions[] = 'reorder';
        }
        foreach (array_intersect_key($after, $before) as $id => $row) {
            if ($row['type'] !== $before[$id]['type']) {
                $actions[] = 'delete';
                $actions[] = 'add';
            }
            if ($row['enabled'] !== $before[$id]['enabled']
                || ($row['enabledForSite'] ?? true) !== ($before[$id]['enabledForSite'] ?? true)) {
                $actions[] = 'toggle-enabled';
            }
        }
        return array_values(array_unique($actions));
    }
}
