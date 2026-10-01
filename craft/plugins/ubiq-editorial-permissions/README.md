# UBIQ Editorial Permissions

Private Craft plugin for controlling Matrix structure and page entry types while
preserving existing content editing. Tested against Craft 5.9.20; the package
requires PHP 8.2+ and restricts Craft to the 5.9 patch line from 5.9.20. Revalidate
the native editor adapter before widening that constraint.

## Installation and configuration

The repository's Composer path dependency mirrors this directory into `vendor/`.
The package travels with the Craft source during the existing manual deployment
workflow. No additional deployment command is introduced.

From `craft/`, with the intended local DDEV project running:

```sh
ddev composer install
ddev exec php craft plugin/install ubiq-editorial-permissions
```

Review Craft-generated project config after installation. Empty plugin settings
leave native behavior unchanged. The plugin is installed and enabled in this
checkout's local DDEV app, with its registration in generated project config.
Managed scopes and user permissions must still be selected in the control panel.

1. Open **Settings → Plugins → UBIQ Editorial Permissions** as an administrator.
2. Select the Matrix fields and section/entry-type pairs to manage, then save.
3. In Craft's native user or user-group permissions, grant the required actions
   under **UBIQ Editorial Permissions**. Managed scopes deny actions until granted.
4. To prohibit all new pages in a section, remove Craft's native **Create entries**
   permission for that section. Keep native view/edit permissions for existing
   pages. Plugin permissions cannot grant native access.

Administrators always bypass the plugin. Groups use Craft's additive grants:
membership in another group can grant an action. The Editors/Designers setup with
multiple groups requires a suitable Craft edition; the tests use a separate Pro
development fixture. This plugin does not change the real app's edition/license.

| Managed scope | Available grants |
| --- | --- |
| Each Matrix field | Add, delete, reorder, duplicate/paste, enable/disable |
| Each section/entry-type pair | Create that type; change an existing entry to that type |

Duplicate/paste additionally requires Add. Replacing a Matrix entry's type
requires Add and Delete. Deleting an item does not require Reorder when surviving
items retain their order. Content inside a block, including its relations, is
editable subject to native permissions. Nested Matrix fields have independent
rules; select each field whose structure should be protected.

Unavailable creation/type/structure controls are hidden. Existing pages of a
restricted type remain visible and editable, and their current type is retained
in the editor. Checks also run on authenticated element saves, native deletion
and duplication authorization, direct nested reorders, draft publishing, and
revision restoration. Draft IDs are compared by their canonical identity.
Native mutation requests are transactional so a rejected owner save also rolls
back nested normalization writes. Console jobs and requests without a signed-in
Craft user retain their existing authorization model.

Settings store UIDs, so renaming fields/types preserves their grants. Stale
selections are reported on the settings page and must be corrected before saving.
Unselecting a scope or disabling the plugin restores native behavior for that
scope. Native section-create restrictions remain in place. No content migration,
custom tables, GraphQL schema, or Next rendering changes are introduced.

## Page and entry-type exceptions

On the same admin settings page, use **Matrix exceptions → Add exception**.
Select a Matrix field, group, and either a specific page or a section/entry-type
pair. Check only the actions that group may perform, then save.

For example, keep Sections managed with no structural grants for editors, then
allow Add and Reorder on one landing page. Other pages remain locked. Exceptions
are additive: matching rows combine with the group's existing plugin permissions.
An unchecked action grants nothing; it does not revoke permissions from another
row/group. Duplicate/paste still requires Add, and native page edit/create access
is unchanged. Team's implicit group is supported alongside Pro's explicit groups.

Rules apply to the selected field anywhere inside the containing page, including
nested Matrix fields and drafts. Page targets use canonical UIDs and span the
entry's sites; native site permissions remain in force. Type rules use the stored
page type, so a type change must be saved before the new type's exceptions apply.
Global Matrix owners have no page/type exceptions. Removing a rule takes effect
on the next server mutation; reload open editors to refresh their controls.

Empty exception settings preserve the original field policy. Removed targets or
groups produce a settings validation error; correct or remove those rows before
saving. The admin target selector lists canonical pages across sites.

## Verification

From the repository root:

```sh
php craft/plugins/ubiq-editorial-permissions/tests/structure.php
rg --files craft/plugins/ubiq-editorial-permissions -g '*.php' | xargs -n 1 php -l
node --check craft/plugins/ubiq-editorial-permissions/src/assetbundles/resources/editor.js
node --check craft/plugins/ubiq-editorial-permissions/tests/browser.cjs
composer validate --strict --working-dir=craft/plugins/ubiq-editorial-permissions
bun run lint
git diff --check
```

Integration tests require an empty, disposable MySQL database named
`ubiq_editorial_test` on a loopback connection. Never point them at project data.
The setup script creates a separate app with its own config, content, users, and
development edition. Use a new/empty fixture directory and an installed Composer
mirror of the plugin:

```sh
export UBIQ_EDITORIAL_TEST_ROOT=/tmp/ubiq-editorial-test
export UBIQ_EDITORIAL_TEST_DSN='mysql:host=127.0.0.1;port=3306;dbname=ubiq_editorial_test'
export UBIQ_EDITORIAL_TEST_DB_USER=root
export UBIQ_EDITORIAL_TEST_DB_PASSWORD=root
php craft/plugins/ubiq-editorial-permissions/tests/setup.php
php craft/plugins/ubiq-editorial-permissions/tests/integration.php
php craft/plugins/ubiq-editorial-permissions/tests/exceptions.php
php "$UBIQ_EDITORIAL_TEST_ROOT/craft" plugin/list
php "$UBIQ_EDITORIAL_TEST_ROOT/craft" project-config/diff
```

For browser tests, serve only the disposable fixture:

```sh
php -S 127.0.0.1:8098 -t "$UBIQ_EDITORIAL_TEST_ROOT/web" "$UBIQ_EDITORIAL_TEST_ROOT/router.php"
```

In a second terminal with the same fixture environment, provide `playwright-core`
and Chrome. These are test tools, not application dependencies:

```sh
npm install --prefix /tmp/ubiq-editorial-browser --no-save playwright-core
NODE_PATH=/tmp/ubiq-editorial-browser/node_modules \
  node craft/plugins/ubiq-editorial-permissions/tests/browser.cjs
```

Set `CHROME_PATH` when Chrome is not at the default macOS application path.
`UBIQ_EDITORIAL_TEST_URL` can override the loopback URL. Screenshots are written
under the disposable fixture's `evidence/`; do not commit fixture/runtime files.
After source changes, refresh the mirrored package with
`composer reinstall ubiq/craft-editorial-permissions --no-scripts` from `craft/`
before browser testing. PHP integration tests load source directly.

## Recorded evidence and remaining acceptance

On 2026-09-10, a clean Craft 5.9.20 Pro fixture passed installation, 10 structural
policy cases, and 57 Craft integration assertions on PHP 8.2.28 and 8.4.7.
PHP/JavaScript syntax checks, package strict Composer validation, repository lint,
and `git diff --check` passed. These integration checks cover content saves,
delta omission, nested content drafts/publishing, structural draft/revision denial,
native/type creation gates, additive groups, individual grants, cross-owner
insertion, global Matrix owners, independently managed nested Matrix fields,
settings validation, and admin bypass.

Browser checks at 1440×1000 passed on `/admin/entries/pages/{id}` in blocks,
cards, cards-grid, and index modes: creation/sorting disabled and direct reorder
requests returned 403. Block action menus hid forbidden actions. On
`/admin/settings/plugins/ubiq-editorial-permissions`, editors received 403 and
admins received 200; admin block creation/sorting remained available. No browser
JavaScript exceptions occurred in these checks. Direct navigation to
`/admin/entries/pages/new` returned 403 for the restricted editor.

The full acceptance checklist remains open: multi-site propagation, concurrent
edits, permission revocation while an editor is open, every slideout/bulk/paste
interaction, and the real starter's image/link/reusable-section/preview workflows
still need end-to-end validation. The test fixture does not include Next preview.

The exception extension adds 24 integration assertions covering group isolation,
Team's implicit group, page/type scope, drafts, actual insertion/reordering,
deletion authorization, revocation, malformed settings, and protection against
obtaining grants through a submitted type change. Its browser checks save an
exception through Craft's settings form and compare restricted/exception users
across the four Matrix modes, including direct nested reorders and revocation.

Craft 5.9.20 rejects `project-config/apply --dry-run` with
`Unknown option: --dry-run`; use its supported read-only `project-config/diff`.
The root Craft Composer manifest's strict validation fails its existing missing
`name` and `description` publish metadata. Package strict validation passes;
`composer validate --no-check-publish` validates the application manifest with
existing warnings. No unrelated dependency upgrades are part of this change.
