import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const base = process.env.BASE_URL || 'http://127.0.0.1:4319';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ acceptDownloads: true });
await context.route(/cloudflareinsights/, route => route.abort());
const page = await context.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
const notice = () => page.locator('[role=status]').allTextContents().then(x => x.join(' '));
try {
  await page.goto(base + '/?a=Image%20test&n=2&seed=image-qa&scope=measure&meter=4-4', { waitUntil: 'networkidle' });
  for (let i = 0; i < 2; i++) {
    await page.locator('.answer-choice').first().click();
    await page.getByRole('button', { name: /Next question|See results/ }).click();
  }
  await page.locator('.result-code code').waitFor();
  // Completion stamps asynchronously; the initial epoch code is not ready.
  await page.waitForFunction(() => {
    const epoch = new Date(0);
    const stamp = [epoch.getFullYear() % 100, epoch.getMonth() + 1, epoch.getDate()]
      .map(value => String(value).padStart(2, '0')).join('');
    const code = document.querySelector('.result-code code')?.textContent ?? '';
    return /^BRS-/.test(code) && code.split('-')[2] !== stamp;
  });
  // An assigned round shows one primary hand-in button; the image buttons are folded beneath it.
  const actions = await page.locator('.result-card > .result-actions').first().locator('button, a').allInnerTexts();
  assert.equal(actions[0], 'Turn this in');
  assert.equal(await page.getByRole('button', { name: 'Copy result image', exact: true }).isVisible(), false);
  await page.locator('.result-more > summary').click();
  const resultBefore = await page.locator('.result-stats').innerText();
  const codeBefore = await page.locator('.result-code code').innerText();
  assert.match(await page.locator('.result-code').innerText(), /not proof of authentic work/);
  await page.evaluate(() => {
    window.__imageCalls = 0;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async items => {
      window.__imageCalls++;
      const blob = await items[0].getType('image/png');
      window.__png = [...new Uint8Array(await blob.arrayBuffer())];
    } } });
  });
  assert.equal(await page.evaluate(() => window.__imageCalls), 0);
  await page.getByRole('button', { name: 'Copy result image', exact: true }).click();
  await page.waitForFunction(() => window.__png?.length > 8);
  assert.match(await notice(), /Result image copied/);
  const png = Buffer.from(await page.evaluate(() => window.__png));
  assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16), 960); assert.ok(png.readUInt32BE(20) > 150);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Copy result image', exact: true }).click();
  assert.match(await notice(), /Image copy unavailable.*Download PNG/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^(count-it|eight-time)-result\.png$/);
  const downloaded = await readFile(await download.path());
  assert.deepEqual(downloaded, png); // same summary, renderer, and visible result
  if (process.env.PNG_OUTPUT) await download.saveAs(process.env.PNG_OUTPUT);
  assert.match(await notice(), /PNG download started/);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async () => { throw new DOMException('denied', 'NotAllowedError'); } } }));
  await page.getByRole('button', { name: 'Copy result image', exact: true }).click();
  assert.match(await notice(), /Image copy unavailable.*Download PNG/);
  await page.evaluate(() => Object.defineProperty(window, 'ClipboardItem', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Copy result image', exact: true }).click();
  assert.match(await notice(), /Image copy unavailable.*Download PNG/);
  assert.equal(await page.locator('.result-stats').innerText(), resultBefore);
  assert.equal(await page.locator('.result-code code').innerText(), codeBefore);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Copy result image', exact: true }).scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.SHOT_OUTPUT) await page.screenshot({ path: process.env.SHOT_OUTPUT });
  assert.deepEqual(errors, []);
  console.log('PASS explicit image-copy gesture, genuine PNG bytes/dimensions, same download bytes, absent/denied/ClipboardItem fallback, live feedback, unchanged score/code and phone layout');
} finally { await browser.close(); }
