/* Fixed paper cards must keep readable ink when the OS theme changes.
   Uses computed colours against the actual ancestor surface, not token names. */
import { launch, BASE, reporter, shot, collectErrors } from './harness.mjs';
const { note, finish } = reporter();
const browser = await launch();
const errors = [];

async function contrast(page, selector, name) {
  const values = await page.locator(selector).evaluateAll(elements => {
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = value => rgb(value).map(c => {
      c /= 255;
      return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    return elements.filter(el => el.getClientRects().length).map(el => {
      let surface = el;
      while (surface.parentElement && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
      const foreground = getComputedStyle(el).color;
      const background = getComputedStyle(surface).backgroundColor;
      const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return { text: el.textContent.trim().slice(0, 35), foreground, background, ratio: (a + .05) / (b + .05) };
    });
  });
  note(name, values.length > 0 && values.every(value => value.ratio >= 4.5), JSON.stringify(values));
}

async function player(page, name) {
  await page.waitForSelector('.notation-canvas svg');
  await contrast(page, '.rhythm-player label', name + ': playback labels ≥4.5:1');
  await contrast(page, '.notation-canvas', name + ': notation ink ≥4.5:1');
  await contrast(page, '.rhythm-player button, .rhythm-player input[type=number]', name + ': button and tempo value ≥4.5:1');
  note(name + ': labels stay inside the card', await page.locator('.rhythm-player').evaluateAll(players => players.every(player => {
    const card = player.closest('.notation-panel, .workshop-exercise').getBoundingClientRect();
    return [...player.querySelectorAll('label, button')].every(control => {
      const bounds = control.getBoundingClientRect();
      return bounds.left >= card.left && bounds.right <= card.right;
    });
  })));
  note(name + ': no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
}

try {
  for (const colorScheme of ['light', 'dark']) for (const width of [320, 768, 1280]) {
    const context = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
    const page = await context.newPage();
    collectErrors(errors)(page);
    const tag = `${colorScheme}-${width}`;
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await player(page, tag + ' practice');
    await page.getByRole('tab', { name: /Choose the Count/ }).click();
    await player(page, tag + ' challenge');
    await shot(page.locator('.trainer-card'), `${tag}-challenge.png`);
    const tempo = page.getByRole('spinbutton', { name: 'Tempo BPM' });
    await tempo.fill('120');
    await page.getByRole('checkbox', { name: 'Count in', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Beat pulse', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Listen to rhythm', exact: true }).click();
    await page.getByRole('button', { name: 'Stop playback', exact: true }).waitFor();
    note(tag + ': playback locks settings', await tempo.isDisabled());
    await contrast(page, '.rhythm-player label', tag + ': playing labels ≥4.5:1');
    await page.getByRole('button', { name: 'Stop playback', exact: true }).click();
    note(tag + ': stop restores settings and values', await tempo.isEnabled() && await tempo.inputValue() === '120'
      && !await page.getByRole('checkbox', { name: 'Count in', exact: true }).isChecked()
      && !await page.getByRole('checkbox', { name: 'Beat pulse', exact: true }).isChecked());
    // Finish an actual round and exercise its focused-practice paper card.
    for (let i = 0; i < 30 && !await page.locator('.result-card').count(); i++) {
      const answer = page.locator('.answer-grid button').first();
      if (await answer.isEnabled().catch(() => false)) await answer.click();
      const next = page.getByRole('button', { name: /Next question|See (your )?results?|Finish/i }).first();
      if (await next.count()) await next.click();
    }
    note(tag + ': challenge still reaches results', await page.locator('.result-card').count() === 1);
    const review = page.getByRole('button', { name: /Practice \d+ missed questions?/ });
    if (await review.count()) {
      await review.click();
      await player(page, tag + ' focused practice');
    } else note(tag + ': focused practice available', false, 'Round unexpectedly had no missed questions');
    await page.goto(BASE + '/history', { waitUntil: 'networkidle' });
    await page.waitForSelector('.history-list li');
    await contrast(page, '.history-list li h2, .history-list li p', tag + ': history paper card ≥4.5:1');
    await page.goto(BASE + '/workshop', { waitUntil: 'networkidle' });
    await player(page, tag + ' workshop');
    await contrast(page, '.workshop-exercise h2, .workshop-setup summary', tag + ': workshop paper text ≥4.5:1');
    await contrast(page, '.workshop-exercise .reveal-panel > span, .workshop-exercise .reveal-panel > strong, .workshop-exercise .reading-scaffold summary', tag + ': nested themed workshop panels ≥4.5:1');
    await page.getByRole('button', { name: 'Reveal count', exact: true }).click();
    await contrast(page, '.workshop-exercise .reveal-panel > span, .workshop-exercise .reveal-panel > strong', tag + ': revealed workshop count ≥4.5:1');
    await page.locator('.workshop-exercise .reading-scaffold summary').click();
    await contrast(page, '.workshop-exercise .reading-scaffold summary, .workshop-exercise .reading-scaffold p', tag + ': expanded workshop reading help ≥4.5:1');
    await page.locator('.workshop-setup summary').click();
    await contrast(page, '.workshop-controls label, .workshop-controls select', tag + ': expanded workshop setup ≥4.5:1');
    await shot(page, `${tag}-workshop.png`, { fullPage: true });
    await page.goto(BASE + '/?a=Contrast%20QA&scope=measure&meter=4-4&level=1&n=4&seed=paper', { waitUntil: 'networkidle' });
    await page.waitForSelector('.notation-canvas svg');
    note(tag + ': assigned challenge still omits playback', await page.locator('.rhythm-player').count() === 0);
    await contrast(page, '.notation-canvas', tag + ': assigned notation ink ≥4.5:1');
    // Exercise the real component's same-origin internal-navigation path,
    // with an already verified parent remembered in this isolated session.
    await context.route(BASE + '/contrast-qa', route => route.fulfill({
      contentType: 'text/html', body: `<script>sessionStorage.setItem('count-it-program-frame-v1','https://praxis.backwerdrimshot.com')</script><iframe style="width:100%;height:800px;border:0" src="${BASE}/"></iframe>`,
    }));
    await page.goto(BASE + '/contrast-qa');
    const frame = await (await page.waitForSelector('iframe')).contentFrame();
    await frame.waitForSelector('.program-frame-bar');
    await contrast(frame, '.program-frame-bar span', tag + ': program paper bar ≥4.5:1');
    await context.close();
  }
  note('no app errors', errors.length === 0, errors.join(' | '));
} finally { await browser.close(); }
finish();
