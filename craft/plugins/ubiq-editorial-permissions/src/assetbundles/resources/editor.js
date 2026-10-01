/* global Craft, Garnish, jQuery */
(() => {
  'use strict';
  if (window.ubiqEditorialAdapterInstalled) return;
  window.ubiqEditorialAdapterInstalled = true;
  const $ = jQuery;
  const config = () => window.ubiqEditorialPermissions || {fields: {}, sections: {}};
  const policyFor = (container, fieldId) => {
    const element = typeof container === 'string'
      ? document.getElementById(container) || $(container)[0]
      : $(container)[0];
    const policy = element?.closest('.ubiq-matrix-policy');
    return policy ? JSON.parse(policy.dataset.actions) : config().fields[fieldId]?.actions;
  };
  const actions = (instance) => policyFor(instance.$container, instance.settings?.fieldId);
  const allowed = (instance, action) => actions(instance)?.[action] !== false;
  const wrap = (prototype, method, wrapper) => {
    const original = prototype?.[method];
    if (typeof original === 'function') {
      prototype[method] = function (...args) {
        return wrapper.call(this, original.bind(this), ...args);
      };
    }
  };
  const gate = (prototype, method, action, owner = (instance) => instance) => {
    wrap(prototype, method, function (original, ...args) {
      if (!allowed(owner(this), action)) return false;
      return original(...args);
    });
  };

  const blockActions = {
    add: 'add', delete: 'delete', duplicate: 'duplicate-paste',
    moveUp: 'reorder', moveDown: 'reorder',
    enable: 'toggle-enabled', disable: 'toggle-enabled',
  };
  const refreshBlock = (entry) => {
    if (!entry || !actions(entry.matrix)) return;
    for (const [name, action] of Object.entries(blockActions)) {
      if (!allowed(entry.matrix, action)) {
        entry.$actionMenu?.find(`[data-action="${name}"]`).each((_, button) => {
          entry.actionDisclosure?.hideItem(button);
          button.disabled = true;
        });
      }
    }
    if (!allowed(entry.matrix, 'reorder')) {
      entry.$container.children('.actions').find('.move-btn').hide();
    }
  };
  wrap(Craft.MatrixInput.prototype, 'init', function (original, ...args) {
    original(...args);
    if (!actions(this)) return;
    if (!allowed(this, 'reorder')) {
      this.entrySort?.destroy();
      this.entrySort = null;
      this.$entriesContainer.children('.matrixblock').children('.actions').find('.move-btn').hide();
    }
    if (!allowed(this, 'add')) this.$addEntryBtnContainer.hide();
    this.$entriesContainer.children('.matrixblock').each((_, el) => refreshBlock($(el).data('entry')));
  });
  gate(Craft.MatrixInput.prototype, 'canAddMoreEntries', 'add');
  gate(Craft.MatrixInput.prototype, 'addEntry', 'add');
  gate(Craft.MatrixInput.prototype, 'canPaste', 'duplicate-paste');
  gate(Craft.MatrixInput.prototype, 'pasteEntries', 'duplicate-paste');
  for (const [method, action] of Object.entries({
    delete: 'delete', duplicate: 'duplicate-paste', moveUp: 'reorder',
    moveDown: 'reorder', enable: 'toggle-enabled', disable: 'toggle-enabled',
  })) {
    gate(Craft.MatrixInput.Entry.prototype, method, action, (entry) => entry.matrix);
  }
  wrap(Craft.MatrixInput.Entry.prototype, 'init', function (original, ...args) {
    original(...args);
    if (!actions(this.matrix)) return;
    this.actionDisclosure?.on('show', () => refreshBlock(this));
    refreshBlock(this);
  });

  // Cards/grid/index share the native nested manager. Adjust its existing options
  // before it initializes sorting, creation controls and embedded indexes.
  wrap(Craft.NestedElementManager.prototype, 'init', function (original, container, type, settings) {
    const policy = policyFor(container, settings?.fieldId);
    if (policy) {
      settings = {...settings};
      if (!policy.reorder) settings.sortable = false;
      if (!policy.add) settings.canCreate = false;
      if (!policy['duplicate-paste']) settings.canPaste = false;
    }
    return original(container, type, settings);
  });
  for (const [method, action] of Object.entries({
    canCreate: 'add', createElement: 'add', canDelete: 'delete', deleteElement: 'delete',
    deleteElements: 'delete', duplicateElements: 'duplicate-paste',
    duplicateElement: 'duplicate-paste', pasteElements: 'duplicate-paste', onSortChange: 'reorder',
  })) {
    gate(Craft.NestedElementManager.prototype, method, action);
  }
  wrap(Craft.NestedElementManager.prototype, 'initElementIndex', function (original, ...args) {
    const result = original(...args);
    if (this.elementIndex && actions(this)) {
      const existing = this.elementIndex.settings.canDuplicateElements;
      this.elementIndex.settings.canDuplicateElements = (...selected) =>
        allowed(this, 'duplicate-paste') && existing(...selected);
    }
    return result;
  });

  // Native entry index builds creation controls from publishableSections. Keep
  // entry sources intact, filtering only sections with no permitted new type.
  wrap(Craft.EntryIndex.prototype, 'updateButton', function (original, ...args) {
    const previous = this.publishableSections;
    this.publishableSections = previous?.filter((section) => {
      const types = config().sections[section.id];
      return !types || Object.values(types).some((type) => type.create);
    });
    if (!this.publishableSections?.length) {
      this.$newEntryBtnGroup?.remove();
      this.$newEntryBtnGroup = null;
    }
    try {
      return original(...args);
    } finally {
      this.publishableSections = previous;
    }
  });
  wrap(Craft.EntryIndex.prototype, '_createEntry', function (original, sectionId, typeHandle) {
    const types = config().sections[sectionId];
    if (types) {
      const requested = Object.values(types).find((type) => type.handle === typeHandle);
      if (requested && !requested.create) return false;
      typeHandle ||= Object.values(types).find((type) => type.create)?.handle;
      if (!typeHandle) return false;
    }
    return original(sectionId, typeHandle);
  });

  const hideLockedStatus = () => {
    document.querySelectorAll('[data-ubiq-lock-enabled]').forEach((sidebar) => {
      sidebar.querySelectorAll('input[name="enabled"],input[name$="[enabled]"],input[name="enabledForSite"],input[name$="[enabledForSite]"]').forEach((input) => {
        const field = input.closest('.field');
        if (field) field.hidden = true;
      });
    });
  };
  $(hideLockedStatus);
  new MutationObserver(hideLockedStatus).observe(document.documentElement, {childList: true, subtree: true});
})();
