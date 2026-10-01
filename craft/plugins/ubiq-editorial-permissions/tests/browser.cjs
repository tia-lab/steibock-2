const {chromium} = require('playwright-core');
const {execFileSync} = require('node:child_process');
const {readFileSync, existsSync, mkdirSync} = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = process.env.UBIQ_EDITORIAL_TEST_ROOT;
if (!root || !existsSync(path.join(root, '.editorial-test-fixture'))) {
  throw new Error('Set UBIQ_EDITORIAL_TEST_ROOT to the marked disposable Craft fixture.');
}
const base = process.env.UBIQ_EDITORIAL_TEST_URL || 'http://127.0.0.1:8098';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('Browser tests require a loopback URL.');
}
const fixture = JSON.parse(readFileSync(path.join(root, 'fixture.json'), 'utf8'));
const evidence = path.join(root, 'evidence');
mkdirSync(evidence, {recursive: true});
const mode = value => execFileSync('php', [path.join(__dirname, 'mode.php'), value], {env: process.env});
const exceptionFixture = (...args) => execFileSync('php', [path.join(__dirname, 'exception-fixture.php'), ...args], {env: process.env}).toString();

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const results = [];
  const login = async username => {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, locale: 'en-US'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/admin/login`);
    await page.locator('input[name=username]:visible').fill(username);
    await page.locator('input[name=password]:visible').fill('EditorialFixture123!');
    await Promise.all([
      page.waitForURL(url => !url.pathname.endsWith('/login')),
      page.locator('button[type=submit]:visible').click(),
    ]);
    return {page, context, errors};
  };
  try {
    const editor = await login('editor');
    for (const view of ['blocks', 'cards', 'cards-grid', 'index']) {
      mode(view);
      await editor.page.goto(`${base}/admin/entries/pages/${fixture.page}`);
      await editor.page.waitForFunction(() => !!window.ubiqEditorialPermissions);
      await editor.page.waitForTimeout(500); // Native nested manager's deferred initialization.
      const state = await editor.page.evaluate(() => {
        const blocks = jQuery('#fields-sections').data('matrix');
        const manager = Array.from(document.querySelectorAll('*'))
          .map(element => jQuery(element).data('nestedElementManager')).find(Boolean);
        return {
          blocks: blocks ? {sort: !!blocks.entrySort, add: blocks.$addEntryBtnContainer.is(':visible'), canAdd: blocks.canAddMoreEntries()} : null,
          manager: manager ? {sort: manager.settings.sortable, create: manager.settings.canCreate, paste: manager.settings.canPaste, index: !!manager.elementIndex} : null,
        };
      });
      if (view === 'blocks') {
        assert.deepEqual(state.blocks, {sort: false, add: false, canAdd: false});
        await editor.page.locator('.matrixblock > .actions > .action-btn').first().click();
        const selectors = ['delete', 'duplicate', 'moveUp', 'moveDown', 'enable', 'disable']
          .map(action => `button[data-action="${action}"]:visible`).join(',');
        assert.equal(await editor.page.locator(selectors).count(), 0, 'Forbidden block menu actions visible');
      } else {
        assert.ok(state.manager, `No native manager in ${view}`);
        assert.equal(state.manager.sort, false);
        assert.equal(state.manager.create, false);
        assert.equal(state.manager.paste, false);
      }
      const denial = await editor.page.evaluate(async fixture => {
        try {
          await Craft.sendActionRequest('POST', 'nested-elements/reorder', {data: {
            ownerElementType: 'craft\\elements\\Entry', ownerId: fixture.page,
            ownerSiteId: 1, attribute: 'field:sections', elementIds: [fixture.blocks[1]], offset: 0,
          }});
          return 200;
        } catch (error) {
          return error.response?.status;
        }
      }, fixture);
      assert.equal(denial, 403, `Direct reorder allowed in ${view}`);
      await editor.page.screenshot({path: path.join(evidence, `${view}.png`), fullPage: true});
      results.push({mode: view, ...state, directReorder: denial});
    }
    const creationDenied = await editor.page.goto(`${base}/admin/entries/pages/new`);
    assert.equal(creationDenied.status(), 403, 'Direct page creation route must reject the editor');
    const settingsDenied = await editor.page.goto(`${base}/admin/settings/plugins/ubiq-editorial-permissions`);
    assert.equal(settingsDenied.status(), 403);
    const admin = await login('admin');
    const response = await admin.page.goto(`${base}/admin/settings/plugins/ubiq-editorial-permissions`);
    assert.equal(response.status(), 200);
    assert.ok((await admin.page.locator('body').innerText()).includes('Matrix fields'));
    await admin.page.screenshot({path: path.join(evidence, 'settings.png'), fullPage: true});
    mode('blocks');
    await admin.page.goto(`${base}/admin/entries/pages/${fixture.page}`);
    assert.equal(await admin.page.evaluate(() => jQuery('#fields-sections').data('matrix').$addEntryBtnContainer.is(':visible')), true);
    assert.equal(await admin.page.evaluate(() => !!jQuery('#fields-sections').data('matrix').entrySort), true);
    const exception = JSON.parse(exceptionFixture());
    await admin.page.goto(`${base}/admin/settings/plugins/ubiq-editorial-permissions`);
    await admin.page.getByText('Add exception', {exact: true}).click();
    const row = admin.page.locator('table[id$="matrix-exceptions"] tbody tr').last();
    await row.locator('select[name$="[fieldUid]"]').selectOption(fixture.matrixUid);
    await row.locator('select[name$="[groupUid]"]').selectOption(exception.groupUid);
    await row.locator('select[name$="[target]"]').selectOption(exception.target);
    await row.locator('td').filter({has: admin.page.locator('input[type=checkbox][name$="[add]"]')}).locator('label').click();
    await row.locator('td').filter({has: admin.page.locator('input[type=checkbox][name$="[reorder]"]')}).locator('label').click();
    await Promise.all([
      admin.page.waitForNavigation(),
      admin.page.locator('#main-form button[type=submit]').first().click(),
    ]);
    await admin.page.goto(`${base}/admin/settings/plugins/ubiq-editorial-permissions`);
    assert.equal(await admin.page.locator('select[name$="[target]"]').inputValue(), exception.target, 'Exception persisted through native settings save');
    await admin.page.screenshot({path: path.join(evidence, 'exceptions-settings.png'), fullPage: true});
    const designer = await login('designer');
    for (const view of ['blocks', 'cards', 'cards-grid', 'index']) {
      mode(view);
      await designer.page.goto(`${base}/admin/entries/pages/${fixture.page}`);
      await designer.page.waitForFunction(() => !!window.ubiqEditorialPermissions);
      await designer.page.waitForTimeout(500);
      const state = await designer.page.evaluate(() => {
        const matrix = jQuery('#fields-sections').data('matrix');
        const manager = Array.from(document.querySelectorAll('*')).map(el => jQuery(el).data('nestedElementManager')).find(Boolean);
        return matrix ? {add: matrix.$addEntryBtnContainer.is(':visible'), sort: !!matrix.entrySort, paste: matrix.canPaste()}
          : {add: manager.settings.canCreate, sort: manager.settings.sortable, paste: manager.settings.canPaste};
      });
      assert.equal(state.add, true, `Exception Add control in ${view}`);
      assert.equal(state.sort, true, `Exception Reorder control in ${view}`);
      assert.equal(state.paste, false, `Unselected Paste remains restricted in ${view}`);
      const status = await designer.page.evaluate(async fixture => {
        try {
          const response = await Craft.sendActionRequest('POST', 'nested-elements/reorder', {data: {
            ownerElementType: 'craft\\elements\\Entry', ownerId: fixture.page, ownerSiteId: 1,
            attribute: 'field:sections', elementIds: fixture.blocks, offset: 0,
          }});
          return response.status;
        } catch (error) { return error.response?.status; }
      }, fixture);
      // Blocks save ordering through the owner form. Only the nested manager
      // views register native session authorization for this endpoint.
      assert.equal(status, view === 'blocks' ? 403 : 200, `Exception direct reorder in ${view}`);
      await designer.page.screenshot({path: path.join(evidence, `exception-${view}.png`), fullPage: true});
    }
    // Revoke while the user is still signed in; the next mutation must recheck.
    exceptionFixture('reset');
    const revoked = await designer.page.evaluate(async fixture => {
      try {
        await Craft.sendActionRequest('POST', 'nested-elements/reorder', {data: {
          ownerElementType: 'craft\\elements\\Entry', ownerId: fixture.page, ownerSiteId: 1,
          attribute: 'field:sections', elementIds: fixture.blocks, offset: 0,
        }});
        return 200;
      } catch (error) { return error.response?.status; }
    }, fixture);
    assert.equal(revoked, 403);
    assert.deepEqual(designer.errors, []);
    assert.deepEqual(editor.errors, []);
    assert.deepEqual(admin.errors, []);
    console.log(JSON.stringify({results, settings: {editor: 403, admin: 200}, adminStructure: true, exceptionModes: 4, revoked: 403}));
  } finally {
    mode('blocks');
    exceptionFixture('reset');
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
