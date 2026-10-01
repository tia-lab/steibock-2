<?php

namespace ubiq\editorialpermissions\guards;

use Craft;
use craft\base\ElementInterface;
use craft\elements\Entry;
use craft\elements\db\EntryQuery;
use craft\fields\Matrix;
use ubiq\editorialpermissions\services\Permissions;
use ubiq\editorialpermissions\services\Structure;
use yii\web\ForbiddenHttpException;

final class StructureGuard
{
    /** @var \WeakMap<ElementInterface, bool> */
    private \WeakMap $checking;

    public function __construct(private Permissions $permissions)
    {
        $this->checking = new \WeakMap();
    }

    public function restricted(): bool
    {
        $user = $this->permissions->actor();
        return $this->permissions->enabled() && $user !== null && !$user->admin;
    }

    public function persisted(int $id, ?int $siteId): ?Entry
    {
        return Entry::find()->id($id)->siteId($siteId)->status(null)
            ->drafts(null)->provisionalDrafts(null)->revisions(null)->one();
    }

    public function check(ElementInterface $element, ?ElementInterface $baseline = null): void
    {
        if (!$this->restricted() || isset($this->checking[$element])) {
            return;
        }
        $this->checking[$element] = true;
        try {
            if ($baseline === null && $element instanceof Entry && $element->applyingDraft && $element->canonicalId) {
                $baseline = $this->persisted($element->canonicalId, $element->siteId);
            }
            if ($baseline === null && $element instanceof Entry) {
                $baseline = $element->id ? $this->persisted($element->id, $element->siteId) : null;
                if (!$baseline && $element->canonicalId) {
                    $baseline = $this->persisted($element->canonicalId, $element->siteId);
                }
            }
            if ($baseline === null && !$element instanceof Entry && $element->id) {
                $baseline = $element::find()->id($element->id)->siteId($element->siteId)
                    ->status(null)->drafts(null)->provisionalDrafts(null)->revisions(null)->one();
            }
            if ($element instanceof Entry) {
                $this->checkEntry($element, $baseline instanceof Entry ? $baseline : null);
            }

            // Read persisted baselines before normalizing posted Matrix values (which
            // can create nested derivatives). Never mistake a delta omission for [].
            $fields = $element->getFieldLayout()?->getCustomFields() ?? [];
            foreach ($fields as $field) {
                if (!$field instanceof Matrix) {
                    continue;
                }
                $before = $baseline ? $this->entries($baseline, $field, true) : [];
                $after = $this->entries($element, $field, false);
                if ($this->permissions->managed($field)) {
                    foreach (Structure::changes($this->rows($before), $this->rows($after)) as $action) {
                        $this->requireMatrix($field, $action, $element);
                    }
                }
                $byIdentity = [];
                foreach ($before as $entry) {
                    $byIdentity[$this->identity($entry)] = $entry;
                }
                foreach ($after as $entry) {
                    $this->check($entry, $byIdentity[$this->identity($entry)] ?? null);
                }
            }
        } finally {
            unset($this->checking[$element]);
        }
    }

    private function checkEntry(Entry $entry, ?Entry $before): void
    {
        if ($entry->fieldId) {
            $field = $entry->getField();
            if (!$field instanceof Matrix) {
                return;
            }
            // A derivative is only equivalent when it belongs to the same logical
            // owner and field. Canonical IDs cannot authorize cross-field insertion.
            $sameOwner = $before && $before->fieldId === $entry->fieldId
                && $before->getOwner()?->getCanonicalId() === $entry->getOwner()?->getCanonicalId();
            if (!$sameOwner) {
                $this->requireMatrix($field, 'add', $entry->getOwner());
                if ($before && $before->getField() instanceof Matrix) {
                    $this->requireMatrix($before->getField(), 'delete', $before->getOwner());
                }
            } else {
                foreach (Structure::changes($this->rows([$before]), $this->rows([$entry])) as $action) {
                    $this->requireMatrix($field, $action, $entry->getOwner());
                }
            }
            if (!$before && $entry->duplicateOf && !$entry->canonicalId) {
                $this->requireMatrix($field, 'duplicate-paste', $entry->getOwner());
            }
            return;
        }
        if (!$entry->sectionId) {
            return;
        }
        $new = !$before || $before->sectionId !== $entry->sectionId || $entry->getIsUnpublishedDraft();
        if ($new) {
            $user = $this->permissions->actor();
            if (!$user->can('createEntries:' . $entry->getSection()->uid)
                || !$this->permissions->entryType($entry, 'create', $user)) {
                $this->deny('You do not have permission to create this entry type.');
            }
        } elseif ($before->typeId !== $entry->typeId && !$this->permissions->entryType($entry, 'switch-to')) {
            $this->deny('You do not have permission to change to this entry type.');
        }
    }

    public function checkDuplicate(ElementInterface $element): void
    {
        if (!$this->restricted() || !$element instanceof Entry) {
            return;
        }
        if ($element->fieldId && $element->getField() instanceof Matrix) {
            $this->requireMatrix($element->getField(), 'duplicate-paste', $element->getOwner());
        } elseif ($element->sectionId) {
            $user = $this->permissions->actor();
            if (!$user->can('createEntries:' . $element->getSection()->uid)
                || !$this->permissions->entryType($element, 'create', $user)) {
                $this->deny('You do not have permission to create this entry type.');
            }
        }
    }

    public function checkDelete(ElementInterface $element): void
    {
        if ($this->restricted() && $element instanceof Entry && $element->fieldId
            && $element->getField() instanceof Matrix) {
            $this->requireMatrix($element->getField(), 'delete', $element->getOwner());
        }
    }

    public function requireMatrix(Matrix $field, string $action, ?ElementInterface $owner = null): void
    {
        if (!$this->permissions->matrix($field, $action, owner: $owner)) {
            $this->deny(sprintf('You do not have permission to %s in “%s”.', strtolower(Permissions::ACTIONS[$action]), $field->name));
        }
    }

    /** @return Entry[] */
    private function entries(ElementInterface $owner, Matrix $field, bool $persisted): array
    {
        if ($persisted) {
            if (!$owner->id) {
                return [];
            }
            return Entry::find()->fieldId($field->id)->owner($owner)->status(null)
                ->drafts(null)->provisionalDrafts(null)->revisions(null)->limit(null)->all();
        }
        $value = $owner->getFieldValue($field->handle);
        if ($value instanceof EntryQuery) {
            return $value->getCachedResult() ?? (clone $value)->status(null)
                ->drafts(null)->provisionalDrafts(null)->limit(null)->all();
        }
        if ($value instanceof \craft\elements\ElementCollection) {
            return $value->all();
        }
        return is_array($value) ? $value : [];
    }

    private function identity(Entry $entry): string
    {
        return $entry->canonicalId || $entry->id
            ? 'entry:' . ($entry->canonicalId ?: $entry->id)
            : 'new:' . ($entry->uid ?: spl_object_id($entry));
    }

    private function rows(array $entries): array
    {
        $rows = [];
        foreach ($entries as $entry) {
            $id = $this->identity($entry);
            if (isset($rows[$id])) {
                $this->deny('The submitted structure contains duplicate entry identities. Reload the editor.');
            }
            $rows[$id] = [
                'type' => (int)$entry->typeId,
                'enabled' => (bool)$entry->enabled,
                'enabledForSite' => (bool)$entry->getEnabledForSite(),
            ];
        }
        return $rows;
    }

    private function deny(string $message): never
    {
        throw new ForbiddenHttpException($message);
    }
}
