import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { publishedLinks } from './harness.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:4317';
const eight = false;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const errors = [];
const context = await browser.newContext();
await context.route(/cloudflareinsights/, route => route.abort());
context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
const page = await context.newPage();
const toggle = () => page.locator(eight ? '#settings-toggle' : '.focus-toggle');
async function open() { if (await toggle().getAttribute('aria-expanded') !== 'true') await toggle().click(); }
async function go(search = '') {
  await page.goto(base + '/' + search, { waitUntil: 'networkidle' });
  await toggle().waitFor();
  if (search) await page.locator('.challenge-progress').waitFor();
}
const meter = () => page.getByLabel(/^Meter/);
const question = () => page.locator('.answer-grid').innerText();
const progress = () => page.locator('.challenge-progress').innerText();
try {
  await go();
  await open();
  await page.getByLabel('Counting profile', { exact: true }).selectOption('eastman-ta-te-ta');
  const startingPoints = page.locator('details').filter({ has: page.getByText('Practice starting points', { exact: true }) });
  await startingPoints.locator('summary').click();
  const advertised = publishedLinks('counting-rhythms').slice(0, 3).map(link => new URLSearchParams(link));
  assert.equal(await startingPoints.getByRole('button').count(), advertised.length);
  const selectedPool = () => page.locator('.rhythm-picker input:checked').evaluateAll(nodes => nodes.map(node => node.value).sort());
  for (const index of [0, 1, 2, 0]) {
    const preset = advertised[index];
    const button = startingPoints.getByRole('button').nth(index);
    assert.ok((await button.innerText()).includes(preset.get('a').replace(/^Step \d+: /, '')));
    await button.click();
    assert.equal(await page.getByLabel('Subdivision guide').isChecked(), preset.get('guide') === 'on');
    await page.waitForFunction(shown => (document.querySelectorAll('.practice-card [data-guide-at]').length > 0) === shown, preset.get('guide') === 'on');
    assert.equal(await page.getByRole('radio', { name: /One beat/i }).isChecked(), preset.get('scope') === 'beat');
    assert.equal(await meter().inputValue(), '4-4');
    assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'eastman-ta-te-ta');
    assert.deepEqual(await selectedPool(), preset.get('cells').split(',').sort());
  }
  await page.locator('#challenge-tab').click();
  await page.locator('.answer-choice').first().click();
  const presetQuestions = await question(); const presetPosition = await progress();
  await open();
  await startingPoints.getByRole('button').nth(2).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await question(), presetQuestions); assert.equal(await progress(), presetPosition);
  assert.equal(await page.getByLabel('Subdivision guide').isChecked(), true);
  assert.equal(await page.getByRole('radio', { name: /One beat/i }).isChecked(), true);
  assert.equal(await meter().inputValue(), '4-4');
  assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'eastman-ta-te-ta');
  assert.deepEqual(await selectedPool(), advertised[0].get('cells').split(',').sort());
  console.log('PASS every advertised starting point pool/scope/meter/guide, retained profile, and cancellation preserves round/settings');
  await go();
  await page.locator('#practice-tab').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#challenge-tab').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('#challenge-tab').getAttribute('tabindex'), '0');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#practice-tab').evaluate(e => e === document.activeElement), true);
  await open();
  await meter().focus();
  await meter().selectOption(eight ? '7-8' : '3-4');
  assert.equal(await page.getByRole('dialog', { name: 'Start a new set?' }).count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await toggle().evaluate(e => e === document.activeElement), true);
  await page.locator('#challenge-tab').click();
  await page.locator('.answer-choice').first().click();
  const before = await question(); const position = await progress();
  await open();
  await meter().focus();
  await meter().selectOption(eight ? '6-8' : '2-4');
  await page.getByRole('dialog', { name: 'Start a new set?' }).waitFor();
  assert.equal(await meter().inputValue(), eight ? '7-8' : '3-4');
  await page.keyboard.press('Escape');
  assert.equal(await question(), before); assert.equal(await progress(), position);
  assert.equal(await meter().evaluate(e => e === document.activeElement), true);
  await meter().focus();
  await meter().selectOption(eight ? '6-8' : '2-4');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await question(), before); assert.equal(await progress(), position);
  // Selecting the current option and changing help do not ask or discard answers.
  await meter().focus();
  await meter().selectOption(eight ? '7-8' : '3-4');
  await page.getByLabel('Subdivision guide').uncheck();
  assert.equal(await page.getByRole('dialog', { name: 'Start a new set?' }).count(), 0);
  assert.equal(await question(), before); assert.equal(await progress(), position);
  await meter().focus();
  await meter().selectOption(eight ? '6-8' : '2-4');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await meter().inputValue(), eight ? '6-8' : '2-4');
  assert.equal(await page.locator('.answer-choice:disabled').count(), 0);
  console.log('PASS tabs, focus/Escape, untouched instant change, cancel preserves round, unchanged/help preserves round, Continue resets');
  await open();
  await page.getByLabel('Save my practice setup').check();
  await page.getByLabel('Counting profile', { exact: true }).selectOption('eastman-ta-te-ta');
  await page.getByLabel('Save this profile on this device').check();
  const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /preferences|practice-defaults|counting-profile/.test(key))));
  await go(); await open();
  assert.equal(await meter().inputValue(), eight ? '6-8' : '2-4');
  assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'eastman-ta-te-ta');
  assert.equal(await page.getByLabel('Subdivision guide').isChecked(), false);
  await go('?a=Override&n=2&seed=override-ui&meter=' + (eight ? '3-8' : '4-4') + '&scope=measure&guide=on&sys=standard');
  await open();
  assert.equal(await meter().inputValue(), eight ? '3-8' : '4-4');
  assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'standard');
  assert.equal(await page.getByLabel('Subdivision guide').isChecked(), true);
  assert.match(await page.locator('#challenge-tab').innerText(), /2-question challenge/);
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /preferences|practice-defaults|counting-profile/.test(key)))), saved); // device/attempt fields may be initialized separately below
  // Omitted guide/profile still means the assignment defaults, not saved free practice.
  await go('?a=LegacyDefaults&n=2&seed=override-ui&meter=' + (eight ? '3-8' : '4-4') + '&scope=measure');
  await open();
  assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'standard');
  assert.equal(await page.getByLabel('Subdivision guide').isChecked(), true);
  console.log('PASS explicit save/reload and assignment overrides saved setup/profile, including omitted defaults');
  await page.keyboard.press('Escape');
  for (let i = 0; i < 2; i++) {
    await page.locator('.answer-choice').first().click();
    await page.getByRole('button', { name: /Next question|See results/ }).click();
  }
  // Clipboard missing must produce selectable text and a live outcome.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.getByRole('button', { name: 'Turn this in', exact: true }).click();
  assert.match(await page.locator('[role=status]').allTextContents().then(x => x.join(' ')), /Copy unavailable/);
  assert.match(await page.locator('textarea[readonly]').inputValue(), /Score:/);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text; } }, configurable: true }));
  await page.getByRole('button', { name: 'Turn this in', exact: true }).click();
  assert.match(await page.locator('[role=status]').allTextContents().then(x => x.join(' ')), /Copied\. Now paste it wherever your teacher asked/);
  assert.match(await page.evaluate(() => window.__copied), /Score:/);
  console.log('PASS clipboard absence selectable fallback and successful live feedback');
  if (eight) {
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/legacy-standard.json', import.meta.url), 'utf8')).published[0];
    await go(fixture.fingerprint);
    for (const q of fixture.rounds[0]) {
      const wrong = q.choices.find(c => !c.isCorrect);
      await page.getByRole('button', { name: wrong.label, exact: true }).click();
      await page.getByRole('button', { name: /Next question|See results/ }).click();
    }
    await page.waitForFunction(() => !/-(691231|700101)-/.test(document.querySelector('.result-code code')?.textContent ?? '-700101-'));
    const originalStats = await page.locator('.result-stats').innerText();
    const originalCode = await page.locator('.result-code code').innerText();
    await page.getByRole('button', { name: 'Review missed questions' }).click();
    assert.equal(await page.locator('.answer-grid').count(), 0);
    await page.getByRole('button', { name: /^Practice \d+ missed/ }).click();
    await page.locator('.answer-choice').first().click();
    assert.equal(await page.locator('.answer-choice.is-correct').count(), 1);
    await page.getByRole('button', { name: 'Return to session results' }).click();
    assert.equal(await page.locator('.result-stats').innerText(), originalStats);
    assert.equal(await page.locator('.result-code code').innerText(), originalCode);
    console.log('PASS optional missed review gives feedback and original score/verification unchanged');
  }
  await go(); await open();
  await page.getByLabel('Save my practice setup').uncheck();
  await page.getByLabel('Save this profile on this device').uncheck();
  await go(); await open();
  assert.equal(await meter().inputValue(), eight ? '3-8' : '4-4');
  assert.equal(await page.getByLabel('Counting profile', { exact: true }).inputValue(), 'standard');
  // Phone layout, including the expanded focus panel.
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.getByLabel('Save my practice setup').isVisible(), true);
  await page.screenshot({ path: process.env.SHOTS_DIR ? process.env.SHOTS_DIR + '/settings-phone.png' : '/tmp/' + (eight ? 'eight' : 'count') + '-settings-phone.png' });
  // Explicit setup save failure keeps the checkbox off and explains the outcome.
  await page.evaluate(() => Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw Error('blocked'); }, configurable: true }));
  await page.getByLabel('Save my practice setup').click();
  assert.equal(await page.getByLabel('Save my practice setup').isChecked(), false);
  assert.match(await page.locator('[role=status]').allTextContents().then(x => x.join(' ')), /could not/);
  assert.deepEqual(errors, []);
  console.log('PASS clear saved defaults, phone popover and no page errors');
} finally { await browser.close(); }
