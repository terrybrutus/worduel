const { chromium } = require(process.env.WORDUEL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.WORDUEL_TEST_ORIGIN || 'http://127.0.0.1:43992';
const output = path.resolve(__dirname, '../.worduel-native/qa');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext();
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('**/src/lib/localBackend.ts*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/(export async function localCall\([^)]*\)\s*\{)/,
        '$1\n if (method === "wordMeaning") return {definition:"A test meaning.",example:"A test example.",source:"Test dictionary",sourceUrl:""}; if (method === "wordQuiz") return {status:"not-configured"};');
      assert(body.includes('Test dictionary'));
      await route.fulfill({ response, body, contentType: 'application/javascript' });
    });
    const page = await context.newPage();
    const ready = async () => {
      await page.locator('[data-ocid="lobby.page"]').waitFor({ timeout: 45000 });
      await page.locator('[aria-label="Loading Worduel"]').waitFor({ state: 'hidden' });
    };
    await page.goto(origin + '/lobby');
    await ready();
    const guest = await page.evaluate(() => JSON.parse(localStorage.getItem('__worduel_native_guest__')));
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await ready();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('__worduel_native_guest__'))), guest);
    }
    console.log('PASS: ordinary refreshes reuse the same native guest and token.');
    const sizes = [
      ['iphone', 390, 844, 59, 0, 34, 0],
      ['small-phone', 320, 568, 20, 0, 0, 0],
      ['android', 412, 915, 24, 0, 24, 0],
      ['tablet', 820, 1180, 24, 0, 20, 0],
      ['landscape', 844, 390, 0, 59, 21, 59],
      ['desktop', 1440, 900, 0, 0, 0, 0],
    ];
    for (const [name, width, height, top, right, bottom, left] of sizes) {
      await page.setViewportSize({ width, height });
      for (const route of ['/lobby', '/practice', '/word-bank', '/challenges', '/stats']) {
        await page.goto(origin + route);
        await page.locator('[data-ocid="app.shell"]').waitFor();
        await page.locator('[aria-label="Loading Worduel"]').waitFor({ state: 'hidden' });
        // Browser automation has no physical notch. Inject measured device insets
        // into the same variables populated by env(safe-area-inset-*) on phones.
        await page.evaluate(({ top, right, bottom, left }) => {
          for (const [side, value] of Object.entries({ top, right, bottom, left }))
            document.documentElement.style.setProperty('--safe-' + side, value + 'px');
        }, { top, right, bottom, left });
        const geometry = await page.evaluate(() => {
          const shell = document.querySelector('.app-shell');
          const child = [...shell.children].find(el => el.tagName === 'MAIN' || el.hasAttribute('data-ocid'));
          return { padding: getComputedStyle(shell).paddingTop, x: child?.getBoundingClientRect().left,
            y: child?.getBoundingClientRect().top, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        assert.equal(parseFloat(geometry.padding), top, name + route);
        if (geometry.y !== undefined) assert(geometry.y >= top - 1, name + route + ' top');
        if (geometry.x !== undefined) assert(geometry.x >= left - 1, name + route + ' left');
        assert(!geometry.overflow, name + route + ' horizontal overflow');
        if (route === '/lobby') {
          await page.getByText('Created by Terry Brutus', { exact: true }).waitFor();
          assert.equal(await page.getByText('Built with love using caffeine.ai').count(), 0);
          await page.screenshot({ path: output + '/lobby-safe-' + name + '.png' });
          if (await page.locator('[data-ocid="lobby.profile_button"]').getAttribute('aria-label') === 'Sign in') continue;
          await page.locator('[data-ocid="lobby.profile_button"]').click();
          await page.locator('[data-ocid="lobby.profile.sheet"]').evaluate(async panel => {
            await Promise.all(panel.getAnimations().map(animation => animation.finished.catch(() => {})));
          });
          const panel = await page.locator('[data-ocid="lobby.profile.sheet"]').boundingBox();
          assert(panel.y >= top - 1 && panel.y + panel.height <= height - bottom + 1, name + ' profile ' + JSON.stringify(panel));
          await page.locator('[data-ocid="lobby.profile.close_button"]').click();
        }
      }
    }
    const friendContext = await browser.newContext();
    const friend = await friendContext.newPage();
    await friend.goto(origin + '/lobby');
    await friend.locator('[data-ocid="lobby.page"]').waitFor({ timeout: 45000 });
    const call = (target, method, args = []) => target.evaluate(async ({ method, args }) => {
      const { localCall } = await import('/src/lib/localBackend.ts');
      return localCall(method, args);
    }, { method, args });
    const friendGuest = await friend.evaluate(() => JSON.parse(localStorage.getItem('__worduel_native_guest__')));
    for (const length of [5, 6, 7]) {
      const game = (await call(page, 'createPrivateGame', [guest.token, 'versus', length])).ok;
      await call(friend, 'joinByToken', [friendGuest.token, game.joinToken, game.gameId]);
      for (const [name, width, height, top, right, bottom, left] of sizes) {
        await page.setViewportSize({ width, height });
        await page.goto(origin + '/game/' + game.gameId);
        await page.locator('.game-live [data-ocid="game.keyboard"]').waitFor();
        await page.locator('[aria-label="Loading Worduel"]').waitFor({ state: 'hidden' });
        await page.evaluate(({ top, right, bottom, left }) => {
          for (const [side, value] of Object.entries({ top, right, bottom, left }))
            document.documentElement.style.setProperty('--safe-' + side, value + 'px');
        }, { top, right, bottom, left });
        const header = await page.locator('.game-header').boundingBox();
        const keyboard = await page.locator('[data-ocid="game.keyboard"]').boundingBox();
        const board = await page.locator('[data-ocid="game.tile_grid"]').first().boundingBox();
        assert(header.y >= top - 1, name + ' game header');
        assert(keyboard.y + keyboard.height <= height - bottom + 1, name + ' keyboard');
        assert(board.width > 20 && board.height > 20 && board.x >= left - 1, name + ' playable board');
        assert(board.y + board.height <= keyboard.y + 1, name + ' board does not overlap keyboard');
        assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), name + ' no match scrolling');
        if (length === 7) await page.screenshot({ path: output + '/match-safe-' + name + '.png' });
      }
    }
    await friendContext.close();
    console.log('PASS: active 5/6/7-letter matches keep header, board and keyboard inside safe bounds.');
    const manifest = await (await context.request.get(origin + '/manifest.json')).json();
    for (const icon of manifest.icons) {
      const response = await context.request.get(origin + icon.src);
      assert(response.ok());
      assert.equal((await response.body()).subarray(1, 4).toString(), 'PNG');
    }
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    assert((await context.request.get(origin + apple)).ok());
    assert.deepEqual(errors, []);
    console.log('PASS: safe-area layouts on phone, landscape, tablet and desktop routes; profile panels fit; PNG install icons resolve. No paid AI calls.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
