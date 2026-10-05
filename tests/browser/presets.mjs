/* The builder's step menu: each preset must open the same round as the link the shop site publishes for it.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot, publishedLinks } from "./harness.mjs";
const PUBLISHED = publishedLinks("counting-rhythms");
const { note, results } = reporter();

async function firstQuestion(page) {
  await page.waitForSelector(".answer-grid button", { timeout: 15000 });
  const progress = (await page.locator("text=/Question 1 of \\d+/").first().textContent()).trim();
  const choices = await page.locator(".answer-grid button").allInnerTexts();
  return { progress, choices: choices.map((c) => c.replace(/\s+/g, " ").trim()) };
}

(async () => {
  const browser = await launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const builder = await ctx.newPage();
  for (const p of [builder]) {
    p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/ERR_CERT|net::ERR/.test(m.text())) errors.push("console: " + m.text()); });
  }
  await builder.goto(BASE + "/build", { waitUntil: "networkidle" });
  await builder.waitForTimeout(300);
  const presetSelect = builder.locator(".builder-form select").first();
  const options = await presetSelect.locator("option").allTextContents();
  note("the selector offers 'My own choices', ten Counting Rhythms steps and three Rhythms in Three steps", options.length === 14 && /^Step 1:/.test(options[1]) && /^Step 10:/.test(options[10]) && /^Step 1:/.test(options[11]) && /^Step 3:/.test(options[13]), options.slice(0, 3).join(" | ") + " …");

  const student = await ctx.newPage();
  student.on("pageerror", (e) => errors.push("student pageerror: " + e.message));
  const site = await ctx.newPage();
  site.on("pageerror", (e) => errors.push("site pageerror: " + e.message));

  for (let step = 1; step <= 10; step++) {
    await presetSelect.selectOption({ index: step });
    await builder.waitForTimeout(200);
    const link = await builder.locator(".builder-linkbox input").inputValue();
    const problem = await builder.locator(".builder-problem").count();
    const summary = (await builder.locator(".builder-summary").innerText()).trim();
    await student.goto(link, { waitUntil: "networkidle" });
    const mine = await firstQuestion(student);
    await site.goto(BASE + "/?" + PUBLISHED[step - 1], { waitUntil: "networkidle" });
    const theirs = await firstQuestion(site);
    const same = JSON.stringify(mine) === JSON.stringify(theirs);
    note(`Step ${step}: builder link and the published link show the same first question`, problem === 0 && same, same ? `${mine.progress}; ${summary}` : `builder=${JSON.stringify(mine)} site=${JSON.stringify(theirs)}`);
    if (step === 10) {
      // The meter: pinned in the builder's link, open in the published one.
      await student.locator(".focus-toggle").click();
      const meterLocked = await student.locator("select").filter({ has: student.locator('option[value="7-4"]') }).isDisabled();
      await site.locator(".focus-toggle").click();
      const publishedMeterOpen = await site.locator("select").filter({ has: site.locator('option[value="7-4"]') }).isEnabled();
      note("Step 10: the builder's link pins the meter; the published link leaves it switchable", meterLocked && publishedMeterOpen, `builder locked=${meterLocked}, published switchable=${publishedMeterOpen}`);
    }
  }

  // The form after a preset: values are filled and editable.
  await presetSelect.selectOption({ index: 6 });
  await builder.waitForTimeout(200);
  const guide6 = await builder.getByLabel(/^Subdivision guide/).inputValue();
  note("Step 6 fills the guide as Visible (what the published link pins)", guide6 === "on", `guide=${guide6}`);
  await presetSelect.selectOption({ index: 10 });
  await builder.waitForTimeout(200);
  const cellsCount = (await builder.locator(".builder-count").innerText()).trim();
  const scopeVal = await builder.getByLabel(/^Question size/).inputValue();
  note("Step 10 fills five held-and-short rhythms, full measures, and keeps them editable", /5 rhythms chosen/.test(cellsCount) && scopeVal === "measure", `${cellsCount}; scope=${scopeVal}`);
  await builder.getByLabel(/^Pass mark/).fill("9");
  await builder.waitForTimeout(200);
  note("editing a field after a preset updates the link", /pass=9&/.test(await builder.locator(".builder-linkbox input").inputValue()));
  note("the preset's note says the seed and meter are kept", /same questions as the published/.test(await builder.locator(".builder-preset-note").innerText()));
  const cellLink = await builder.getByRole("link", { name: "About the sequence" }).getAttribute("href");
  note("the 'About the sequence' link points at the sequence page", /apps\.backwerdrhythmshop\.com\/sequences\/counting-rhythms\/$/.test(cellLink), cellLink);

  // Phone
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  pp.on("pageerror", (e) => errors.push("phone pageerror: " + e.message));
  await pp.goto(BASE + "/build", { waitUntil: "networkidle" });
  await pp.locator(".builder-form select").first().selectOption({ index: 5 });
  await pp.waitForTimeout(300);
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note("phone: no horizontal overflow with a step chosen", overflow <= 0, `${overflow}px`);
  await shot(pp, "presets-phone.png");
  await shot(builder, "presets-desktop.png");
  await phone.close();

  note("no uncaught page errors or app console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
