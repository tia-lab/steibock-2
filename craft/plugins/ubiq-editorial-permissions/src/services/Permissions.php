<?php

namespace ubiq\editorialpermissions\services;

use Craft;
use craft\base\ElementInterface;
use craft\elements\Entry;
use craft\elements\User;
use craft\fields\Matrix;
use ubiq\editorialpermissions\models\Settings;

final class Permissions
{
    public const PREFIX = 'ubiq-editorial-permissions';
    public const ACTIONS = [
        'add' => 'Add entries',
        'delete' => 'Delete entries',
        'reorder' => 'Reorder entries',
        'duplicate-paste' => 'Duplicate / paste entries (also requires Add entries)',
        'toggle-enabled' => 'Enable / disable entries',
    ];

    public function __construct(private Settings $settings)
    {
    }

    public function actor(): ?User
    {
        return Craft::$app->getRequest()->getIsConsoleRequest()
            ? null
            : Craft::$app->getUser()->getIdentity();
    }

    public function enabled(): bool
    {
        return !empty($this->settings->managedMatrixFieldUids) || !empty($this->settings->managedEntryTypesBySectionUid);
    }

    public function managed(Matrix $field): bool
    {
        return in_array($field->uid, (array)$this->settings->managedMatrixFieldUids, true);
    }

    public function matrix(Matrix $field, string $action, ?User $user = null, ?ElementInterface $owner = null): bool
    {
        $user ??= $this->actor();
        if (!$user || $user->admin || !$this->managed($field)) {
            return true; // Defer to native authorization; this is not an access grant.
        }
        if ($action === 'duplicate-paste' && !$this->matrix($field, 'add', $user, $owner)) {
            return false;
        }
        if ($user->can(self::PREFIX . ":matrix:$field->uid:$action")) return true;
        if (empty($this->settings->matrixExceptions)) return false;
        $page = $this->pageContext($owner);
        if (!$page) return false;
        $groups = Craft::$app->edition === \craft\enums\CmsEdition::Team
            ? [Craft::$app->getUserGroups()->getTeamGroup()->uid]
            : array_column($user->getGroups(), 'uid');
        foreach ((array)$this->settings->matrixExceptions as $rule) {
            if (($rule['fieldUid'] ?? null) !== $field->uid || empty($rule[$action])
                || !in_array($rule['groupUid'] ?? null, $groups, true)) continue;
            if (($rule['target'] ?? null) === "entry:$page->uid"
                || ($rule['target'] ?? null) === 'type:' . $page->getSection()->uid . ':' . $page->getType()->uid) return true;
        }
        return false;
    }

    /** Resolve the containing page from stored ownership and canonical identity. */
    private function pageContext(?ElementInterface $owner): ?Entry
    {
        $seen = [];
        while ($owner instanceof Entry) {
            $key = $owner->id ?: spl_object_id($owner);
            if (isset($seen[$key])) return null;
            $seen[$key] = true;
            if ($owner->id) {
                $stored = Entry::find()->id($owner->canonicalId ?: $owner->id)->siteId($owner->siteId)
                    ->status(null)->drafts(null)->provisionalDrafts(null)->revisions(null)->one();
                if (!$stored) return null;
                $owner = $stored;
            }
            if (!$owner->fieldId) return $owner->sectionId ? $owner : null;
            $owner = $owner->getOwner();
        }
        return null;
    }

    public function matrixActions(Matrix $field, ?ElementInterface $owner): array
    {
        $actions = [];
        foreach (self::ACTIONS as $action => $label) $actions[$action] = $this->matrix($field, $action, owner: $owner);
        return $actions;
    }

    public function entryType(Entry $entry, string $action, ?User $user = null): bool
    {
        $user ??= $this->actor();
        if (!$user || $user->admin || !$entry->sectionId) {
            return true;
        }
        return $this->type($entry->getSection()->uid, $entry->getType()->uid, $action, $user);
    }

    public function type(string $sectionUid, string $typeUid, string $action, User $user): bool
    {
        if ($user->admin || !in_array($typeUid, (array)($this->settings->managedEntryTypesBySectionUid[$sectionUid] ?? []), true)) {
            return true;
        }
        return $user->can(self::PREFIX . ":entry-type:$sectionUid:$typeUid:$action");
    }

    public function registered(): array
    {
        $groups = [];
        foreach (Craft::$app->getFields()->getAllFields() as $field) {
            if (!$field instanceof Matrix || !$this->managed($field)) {
                continue;
            }
            $permissions = [];
            foreach (self::ACTIONS as $action => $label) {
                $permissions[self::PREFIX . ":matrix:$field->uid:$action"] = ['label' => $label];
            }
            $groups[] = ['heading' => "UBIQ Editorial Permissions — $field->name [$field->handle]", 'permissions' => $permissions];
        }
        foreach (Craft::$app->getEntries()->getAllSections() as $section) {
            foreach ($section->getEntryTypes() as $type) {
                if (!in_array($type->uid, (array)($this->settings->managedEntryTypesBySectionUid[$section->uid] ?? []), true)) {
                    continue;
                }
                $prefix = self::PREFIX . ":entry-type:$section->uid:$type->uid";
                $groups[] = [
                    'heading' => "UBIQ Editorial Permissions — $section->name → $type->name",
                    'permissions' => [
                        "$prefix:create" => ['label' => 'Create entries of this type'],
                        "$prefix:switch-to" => ['label' => 'Change existing entries to this type'],
                    ],
                ];
            }
        }
        return $groups;
    }

    public function editorConfig(User $user): array
    {
        $fields = [];
        foreach (Craft::$app->getFields()->getAllFields() as $field) {
            if ($field instanceof Matrix && $this->managed($field)) {
                $actions = [];
                foreach (self::ACTIONS as $action => $label) {
                    $actions[$action] = $this->matrix($field, $action, $user);
                }
                $fields[$field->id] = ['handle' => $field->handle, 'actions' => $actions];
            }
        }
        $sections = [];
        foreach (Craft::$app->getEntries()->getAllSections() as $section) {
            $types = [];
            foreach ($section->getEntryTypes() as $type) {
                $types[$type->id] = [
                    'handle' => $type->handle,
                    'create' => $user->can("createEntries:$section->uid") && $this->type($section->uid, $type->uid, 'create', $user),
                    'switch' => $this->type($section->uid, $type->uid, 'switch-to', $user),
                ];
            }
            $sections[$section->id] = $types;
        }
        return ['fields' => $fields, 'sections' => $sections];
    }
}
