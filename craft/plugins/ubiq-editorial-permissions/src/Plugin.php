<?php

namespace ubiq\editorialpermissions;

use Craft;
use craft\base\Model;
use craft\elements\Entry;
use craft\events\AuthorizationCheckEvent;
use craft\events\DefineEntryTypesEvent;
use craft\events\ElementEvent;
use craft\events\RegisterUserPermissionsEvent;
use craft\fields\Matrix;
use craft\helpers\Json;
use craft\services\Drafts;
use craft\services\Elements;
use craft\services\Revisions;
use craft\services\UserPermissions;
use craft\web\View;
use ubiq\editorialpermissions\assetbundles\EditorAsset;
use ubiq\editorialpermissions\guards\StructureGuard;
use ubiq\editorialpermissions\models\Settings;
use ubiq\editorialpermissions\services\Permissions;
use yii\base\ActionEvent;
use yii\base\Event;
use yii\web\ForbiddenHttpException;
use yii\web\Response;

final class Plugin extends \craft\base\Plugin
{
    public bool $hasCpSettings = true;
    public string $schemaVersion = '1.0.0';
    public Permissions $permissions;
    public StructureGuard $guard;
    private ?\yii\db\Transaction $requestTransaction = null;
    private bool $editorAssetsRegistered = false;

    public function init(): void
    {
        parent::init();
        $this->permissions = new Permissions($this->getSettings());
        $this->guard = new StructureGuard($this->permissions);

        Event::on(UserPermissions::class, UserPermissions::EVENT_REGISTER_PERMISSIONS, function(RegisterUserPermissionsEvent $event) {
            array_push($event->permissions, ...$this->permissions->registered());
        });
        Event::on(Elements::class, Elements::EVENT_BEFORE_SAVE_ELEMENT, function(ElementEvent $event) {
            $this->guard->check($event->element);
        });
        foreach ([Elements::EVENT_AUTHORIZE_SAVE => 'check', Elements::EVENT_AUTHORIZE_DELETE => 'checkDelete',
            Elements::EVENT_AUTHORIZE_DUPLICATE => 'checkDuplicate', Elements::EVENT_AUTHORIZE_DUPLICATE_AS_DRAFT => 'checkDuplicate'] as $name => $method) {
            Event::on(Elements::class, $name, function(AuthorizationCheckEvent $event) use ($method) {
                // Only deny. A true override would bypass native Craft permissions.
                if ($event->user->admin || !$event->element || $event->user->id !== $this->permissions->actor()?->id) {
                    return;
                }
                try {
                    $this->guard->$method($event->element);
                } catch (ForbiddenHttpException) {
                    $event->authorized = false;
                }
            });
        }
        Event::on(Drafts::class, Drafts::EVENT_BEFORE_APPLY_DRAFT, function($event) {
            $this->guard->check($event->draft, $event->draft->getCanonical());
        });
        Event::on(Revisions::class, Revisions::EVENT_BEFORE_REVERT_TO_REVISION, function($event) {
            $this->guard->check($event->revision, $event->revision->getCanonical());
        });
        Event::on(Entry::class, Entry::EVENT_DEFINE_ENTRY_TYPES, function(DefineEntryTypesEvent $event) {
            $entry = $event->sender;
            $user = $this->permissions->actor();
            if (!$this->permissions->enabled() || !$user || $user->admin || !Craft::$app->getRequest()->getIsCpRequest()) {
                return;
            }
            $before = $entry->id ? $this->guard->persisted($entry->id, $entry->siteId) : null;
            if ($entry->fieldId && $entry->getField() instanceof Matrix) {
                $field = $entry->getField();
                if ($before && (!$this->permissions->matrix($field, 'add', owner: $entry->getOwner()) || !$this->permissions->matrix($field, 'delete', owner: $entry->getOwner()))) {
                    $event->entryTypes = array_values(array_filter($event->entryTypes, fn($type) => $type->id === $before->typeId));
                }
                return;
            }
            if (!$entry->sectionId) {
                return;
            }
            $sectionUid = $entry->getSection()->uid;
            $action = !$before || $entry->getIsUnpublishedDraft() ? 'create' : 'switch-to';
            $event->entryTypes = array_values(array_filter($event->entryTypes, fn($type) =>
                ($before && $type->id === $before->typeId)
                || $this->permissions->type($sectionUid, $type->uid, $action, $user)
            ));
        });
        Event::on(Entry::class, Entry::EVENT_DEFINE_SIDEBAR_HTML, function($event) {
            $entry = $event->sender;
            if (!$this->guard->restricted() || !$entry->fieldId || !$entry->getField() instanceof Matrix) {
                return;
            }
            if (!$this->permissions->matrix($entry->getField(), 'toggle-enabled', owner: $entry->getOwner())) {
                // Mark this sidebar only. JS removes its native enabled controls,
                // preserving posted values and all content fields.
                $event->html = '<div data-ubiq-lock-enabled>' . $event->html . '</div>';
            }
        });
        Event::on(Entry::class, Entry::EVENT_REGISTER_ACTIONS, function($event) {
            $controller = Craft::$app->controller;
            if (!$this->guard->restricted() || !$controller instanceof \craft\controllers\ElementIndexesController) {
                return;
            }
            $fieldId = $controller->getElementQuery()->fieldId;
            if (!is_numeric($fieldId)) {
                return;
            }
            $field = Craft::$app->getFields()->getFieldById((int)$fieldId);
            if (!$field instanceof Matrix || !$this->permissions->managed($field)) {
                return;
            }
            $rules = [
                \craft\elements\actions\SetStatus::class => 'toggle-enabled',
                \craft\elements\actions\Delete::class => 'delete',
                \craft\elements\actions\Duplicate::class => 'duplicate-paste',
            ];
            $ownerId = $controller->getElementQuery()->ownerId;
            $owner = is_numeric($ownerId) ? Craft::$app->getElements()->getElementById((int)$ownerId) : null;
            $event->actions = array_values(array_filter($event->actions, function($action) use ($rules, $field, $owner) {
                $class = is_string($action) ? $action : (is_array($action) ? ($action['class'] ?? '') : $action::class);
                return !isset($rules[$class]) || $this->permissions->matrix($field, $rules[$class], owner: $owner);
            }));
        });
        Event::on(Matrix::class, Matrix::EVENT_DEFINE_INPUT_HTML, function($event) {
            if (!$this->guard->restricted() || !$this->permissions->managed($event->sender)) return;
            $event->html = \craft\helpers\Html::tag('div', $event->html, [
                'class' => 'ubiq-matrix-policy',
                'data-actions' => $this->permissions->matrixActions($event->sender, $event->element),
            ]);
        });
        Event::on(Matrix::class, Matrix::EVENT_DEFINE_ACTION_MENU_ITEMS, function($event) {
            if (!$this->guard->restricted()) {
                return;
            }
            $field = $event->sender;
            $rules = ['clone' => 'duplicate-paste', 'trash' => 'delete'];
            $view = Craft::$app->getView();
            foreach ($event->items as $item) {
                $action = $rules[$item['icon'] ?? ''] ?? null;
                if (!$action || empty($item['id'])) continue;
                $view->registerJsWithVars(fn($id, $inputId, $action) => <<<JS
setTimeout(() => {
  const button = document.getElementById($id);
  const policy = document.getElementById($inputId)?.closest('.ubiq-matrix-policy');
  if (!button || !policy || JSON.parse(policy.dataset.actions)[$action] !== false) return;
  jQuery(button).closest('.menu').data('disclosureMenu')?.hideItem(button);
  button.hidden = true;
  button.disabled = true;
}, 0);
JS, [$item['id'], $view->namespaceInputId($field->handle), $action]);
            }
        });
        if (!Craft::$app->getRequest()->getIsConsoleRequest()) {
            Event::on(\yii\base\Controller::class, \yii\base\Controller::EVENT_BEFORE_ACTION, function(ActionEvent $event) {
                $this->guardAction($event);
            });
            Event::on(View::class, View::EVENT_BEFORE_RENDER_TEMPLATE, function() {
                $user = $this->permissions->actor();
                if ($this->editorAssetsRegistered || !$this->permissions->enabled() || !$user || $user->admin || !Craft::$app->getRequest()->getIsCpRequest()) {
                    return;
                }
                $this->editorAssetsRegistered = true;
                $view = Craft::$app->getView();
                $view->registerAssetBundle(EditorAsset::class);
                $view->registerJs('window.ubiqEditorialPermissions = ' . Json::encode($this->permissions->editorConfig($user)) . ';', View::POS_HEAD, 'ubiq-editorial-permissions');
            });
        }
    }

    private function guardAction(ActionEvent $event): void
    {
        if (!$this->guard->restricted()) {
            return;
        }
        $route = $event->action->getUniqueId();
        $request = Craft::$app->getRequest();
        $mutations = [
            'elements/create', 'elements/save', 'elements/save-draft', 'elements/apply-draft',
            'elements/ensure-draft', 'elements/save-nested-element-for-derivative',
            'elements/duplicate', 'elements/bulk-duplicate', 'elements/delete',
            'elements/delete-draft', 'elements/delete-for-site', 'elements/revert',
            'elements/copy-values-from-site', 'entries/create', 'entries/save-entry',
            'entries/move-to-section', 'nested-elements/reorder', 'nested-elements/delete',
            'element-indexes/perform-action', 'element-indexes/save-elements',
        ];
        if (in_array($route, $mutations, true) && $this->requestTransaction === null) {
            // Matrix normalization can save derivatives before the owner save.
            // Keep those changes atomic with the eventual authorization result.
            $this->requestTransaction = Craft::$app->getDb()->beginTransaction();
            Craft::$app->getResponse()->on(Response::EVENT_BEFORE_SEND, function() {
                $response = Craft::$app->getResponse();
                $failed = $response->getStatusCode() >= 400
                    || (is_array($response->data) && ($response->data['success'] ?? null) === false);
                if ($this->requestTransaction?->getIsActive()) {
                    $failed ? $this->requestTransaction->rollBack() : $this->requestTransaction->commit();
                }
            });
            register_shutdown_function(function() {
                if ($this->requestTransaction?->getIsActive()) {
                    $this->requestTransaction->rollBack();
                }
            });
        }
        if ($route === 'nested-elements/reorder') {
            $owner = Craft::$app->getElements()->getElementById((int)$request->getBodyParam('ownerId'), null, $request->getBodyParam('ownerSiteId'));
            $attribute = (string)$request->getBodyParam('attribute');
            $handle = str_starts_with($attribute, 'field:') ? substr($attribute, 6) : $attribute;
            $field = $owner?->getFieldLayout()?->getFieldByHandle($handle);
            if ($field instanceof Matrix) {
                $this->guard->requireMatrix($field, 'reorder', $owner);
            }
        }
        if ($route === 'entries/move-to-section') {
            $section = Craft::$app->getEntries()->getSectionById((int)$request->getParam('sectionId'));
            if ($section && !$this->permissions->actor()->can("createEntries:$section->uid")) {
                throw new ForbiddenHttpException('You do not have permission to create entries in the destination section.');
            }
        }
        if ($route === 'entries/create') {
            $handle = $request->getParam('section') ?? (Craft::$app->getUrlManager()->getRouteParams()['section'] ?? null);
            $section = $handle ? Craft::$app->getEntries()->getSectionByHandle($handle) : null;
            if ($section) {
                $user = $this->permissions->actor();
                $types = array_filter($section->getEntryTypes(), fn($type) => $this->permissions->type($section->uid, $type->uid, 'create', $user));
                if (!$user->can("createEntries:$section->uid") || !$types) {
                    throw new ForbiddenHttpException('You do not have permission to create entries in this section.');
                }
            }
        }
    }

    protected function createSettingsModel(): ?Model
    {
        return new Settings();
    }

    public function getSettingsResponse(): mixed
    {
        if (!Craft::$app->getUser()->getIsAdmin()) {
            throw new ForbiddenHttpException('Only administrators can manage editorial permission settings.');
        }
        return parent::getSettingsResponse();
    }

    protected function settingsHtml(): ?string
    {
        $fields = array_values(array_filter(Craft::$app->getFields()->getAllFields(), fn($field) => $field instanceof Matrix));
        $settings = $this->getSettings();
        // Validate a copy so stale selections can be reported without mutating config.
        $validated = clone $settings;
        $validated->validate();
        return Craft::$app->getView()->renderTemplate('ubiq-editorial-permissions/settings', [
            'settings' => $settings,
            'fields' => $fields,
            'sections' => Craft::$app->getEntries()->getAllSections(),
            'groups' => Craft::$app->getUserGroups()->getAllGroups(),
            'pages' => Entry::find()->section('*')->status(null)->site('*')->unique()->all(),
            'staleErrors' => $validated->getErrorSummary(true),
        ]);
    }
}
