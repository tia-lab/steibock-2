<?php

namespace ubiq\editorialpermissions\models;

use Craft;
use craft\base\Model;
use craft\fields\Matrix;

final class Settings extends Model
{
    // Untyped until validation: malformed POST data must produce errors, not TypeErrors.
    public $managedMatrixFieldUids = [];
    public $managedEntryTypesBySectionUid = [];
    public $matrixExceptions = [];

    protected function defineRules(): array
    {
        return [
            [['managedMatrixFieldUids', 'managedEntryTypesBySectionUid'], 'validateScopes', 'skipOnEmpty' => false],
            ['matrixExceptions', 'validateExceptions', 'skipOnEmpty' => false],
        ];
    }

    public function validateExceptions(string $attribute): void
    {
        if ($this->$attribute === '') $this->$attribute = [];
        if (!is_array($this->$attribute)) {
            $this->addError($attribute, 'Select valid Matrix exceptions.');
            return;
        }
        $fields = array_column(array_filter(Craft::$app->getFields()->getAllFields(), fn($field) => $field instanceof Matrix), 'uid');
        $groups = array_column(Craft::$app->getUserGroups()->getAllGroups(), 'uid');
        $types = [];
        foreach (Craft::$app->getEntries()->getAllSections() as $section) {
            foreach ($section->getEntryTypes() as $type) $types[] = "type:$section->uid:$type->uid";
        }
        $normalized = [];
        foreach ($this->$attribute as $index => $rule) {
            if (!is_array($rule) || !in_array($rule['fieldUid'] ?? null, $fields, true)
                || !in_array($rule['groupUid'] ?? null, $groups, true) || !is_string($rule['target'] ?? null)) {
                $this->addError($attribute, 'Each exception needs an existing Matrix field, user group, and target.');
                continue;
            }
            $target = $rule['target'];
            $validTarget = in_array($target, $types, true);
            if (str_starts_with($target, 'entry:')) {
                $entry = \craft\elements\Entry::find()->uid(substr($target, 6))->site('*')->status(null)->one();
                $validTarget = $entry && $entry->sectionId && !$entry->fieldId;
            }
            if (!$validTarget) {
                $this->addError($attribute, 'An exception target no longer exists. Select a page or a section/entry-type pair.');
                continue;
            }
            $row = array_intersect_key($rule, array_flip(['fieldUid', 'groupUid', 'target']));
            foreach (\ubiq\editorialpermissions\services\Permissions::ACTIONS as $action => $label) {
                if (!in_array($rule[$action] ?? false, [true, false, 0, 1, '0', '1', ''], true)) {
                    $this->addError($attribute, 'Select valid exception actions.');
                    continue 2;
                }
                $row[$action] = (bool)($rule[$action] ?? false);
            }
            $normalized[] = $row;
        }
        if (!$this->hasErrors($attribute)) $this->$attribute = $normalized;
    }

    public function validateScopes(string $attribute): void
    {
        $value = $this->$attribute;
        // Native checkbox groups submit an empty string when nothing is selected.
        if ($value === '') {
            $this->$attribute = [];
            return;
        }
        if (!is_array($value)) {
            $this->addError($attribute, 'Select valid scopes.');
            return;
        }
        if ($attribute === 'managedMatrixFieldUids') {
            $valid = [];
            foreach (Craft::$app->getFields()->getAllFields() as $field) {
                if ($field instanceof Matrix) {
                    $valid[] = $field->uid;
                }
            }
            foreach ($value as $uid) {
                if (!is_string($uid) || !in_array($uid, $valid, true)) {
                    $this->addError($attribute, 'A selected Matrix field no longer exists.');
                    return;
                }
            }
            $this->$attribute = array_values(array_unique($value));
            return;
        }
        $sections = [];
        foreach (Craft::$app->getEntries()->getAllSections() as $section) {
            $sections[$section->uid] = array_column($section->getEntryTypes(), 'uid');
        }
        $normalized = [];
        foreach ($value as $sectionUid => $types) {
            if ($types === '' || $types === []) {
                continue;
            }
            if (!isset($sections[$sectionUid]) || !is_array($types)) {
                $this->addError($attribute, 'Select entry types belonging to an existing section.');
                return;
            }
            foreach ($types as $uid) {
                if (!is_string($uid) || !in_array($uid, $sections[$sectionUid], true)) {
                    $this->addError($attribute, 'A selected entry type no longer belongs to its section.');
                    return;
                }
            }
            $normalized[$sectionUid] = array_values(array_unique($types));
        }
        $this->$attribute = $normalized;
    }
}
