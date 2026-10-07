/* Meter guard: a choice that cannot make a round is greyed out with the reason, never offered.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot, publishedLinks } from "./harness.mjs";
const PUBLISHED = publishedLinks("counting-rhythms");
const { note, results } = reporter();

const meterSelect = (page) => page.locator("select").filter({ has: page.locator('option[value="7-4"]') });
async function meterState(page) {
  return page.evaluate(() => {
    const sel = [...document.querySelectorAll("select")].find((s) => s.querySelector('option[value="7-4"]'));
    return Object.fromEntries([...sel.options].map((o) => [o.value, o.disabled ? "off" : "on"]));
  });
}
const off = (state) => Object.keys(state).filter((k) => state[k] === "off").sort().join(",");

(async () => {
  const browser = await launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const watch = (p, tag) => { p.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`)); };

  // 1. The published Step 10 link — the one the problem was found on.
  {
    const page = await ctx.newPage(); watch(page, "step10");
    await page.goto(BASE + "/?" + PUBLISHED[9], { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const st = await meterState(page);
    note("published Step 10: 2/4 and 3/4 are greyed out, 4/4 5/4 7/4 stay available", off(st) === "2-4,3-4", JSON.stringify(st));
    const hint = (await page.locator(".level-control", { has: meterSelect(page) }).innerText()).replace(/\s+/g, " ");
    note("…with a plain line saying why", /Greyed-out meters can’t run this assignment as your teacher wrote it/.test(hint));
    await shot(page, "guard-step10.png");
    await meterSelect(page).selectOption("5-4");
    await page.locator(".focus-toggle").click();
    await page.waitForTimeout(400);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const q = /Question 1 of (\d+)/.exec(body);
    note("…a meter that is allowed still runs the teacher's full round (5/4: 12 questions)", !!q && q[1] === "12", q ? "Question 1 of " + q[1] : "no question");
    /* The way a person would try: reopen the panel, focus the select and walk
       up the list with the arrow keys. Browsers skip disabled options, so from
       5/4 the walk must stop at 4/4 and never land on 3/4 or 2/4. */
    await page.locator(".focus-toggle").click();
    await meterSelect(page).focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    const landed = await meterSelect(page).inputValue();
    note("…and arrowing up the list from 5/4 stops at 4/4: 3/4 and 2/4 cannot be reached", landed === "4-4", `expected 4-4; actual ${landed}`);
    await page.close();
  }

  // 2. Step 1 — one beat, nothing to protect.
  {
    const page = await ctx.newPage(); watch(page, "step1");
    await page.goto(BASE + "/?" + PUBLISHED[0], { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const st = await meterState(page);
    const hint = (await page.locator(".level-control", { has: meterSelect(page) }).innerText()).replace(/\s+/g, " ");
    note("published Step 1 (one beat): no meter is greyed out and no note is shown", off(st) === "" && !/Greyed-out/.test(hint), JSON.stringify(st));
    await page.close();
  }

  // 3. A link that leaves both open.
  {
    const page = await ctx.newPage(); watch(page, "open");
    await page.goto(BASE + "/?level=1&n=12&pass=10&seed=open", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const measureRadio = page.getByRole("radio", { name: /one measure/i });
    note("open link: full measures are available while the meter is 4/4", await measureRadio.isEnabled());
    await measureRadio.check({ force: true });
    await page.waitForTimeout(300);
    const st = await meterState(page);
    note("…after choosing full measures, 2/4 and 3/4 (4 and 8 bars) are greyed out", off(st) === "2-4,3-4", JSON.stringify(st));
    await page.close();

    const p2 = await ctx.newPage(); watch(p2, "open2");
    await p2.goto(BASE + "/?level=1&n=12&pass=10&seed=open", { waitUntil: "networkidle" });
    await p2.locator(".focus-toggle").click();
    await meterSelect(p2).selectOption("2-4");
    await p2.waitForTimeout(300);
    const measureOff = await p2.getByRole("radio", { name: /one measure/i }).isDisabled();
    const scopeNote = await p2.locator(".scope-note").count();
    note("…and with the meter at 2/4 first, full measures are greyed out with a note", measureOff && scopeNote === 1);
    await p2.close();
  }

  // 3b. A link that pins size, meter, length and pass mark but NOT the level: the gap found after the first guard.
  {
    const page = await ctx.newPage(); watch(page, "level-open");
    await page.goto(BASE + "/?scope=measure&meter=2-4&n=12&pass=10&seed=lvl", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const levelSelect = page.locator("select").filter({ has: page.locator('option[value="level-1"]') });
    const levels = await levelSelect.evaluate((s) => Object.fromEntries([...s.options].map((o) => [o.value, o.disabled ? "off" : "on"])));
    note("level-open link: Level 1 is greyed out (two rhythms make 4 bars of 2/4, not 12)", levels["level-1"] === "off" && levels["level-2"] === "on" && levels["level-3"] === "on", JSON.stringify(levels));
    const hint = (await page.locator(".level-control", { has: levelSelect }).innerText()).replace(/\s+/g, " ");
    note("…with the plain line saying why", /Greyed-out levels can’t run this assignment/.test(hint));
    await levelSelect.selectOption("level-3");
    await page.locator(".focus-toggle").click();
    await page.waitForTimeout(400);
    const q = /Question 1 of (\d+)/.exec((await page.locator("body").innerText()).replace(/\s+/g, " "));
    note("…an allowed level still runs the teacher's full 12 questions", !!q && q[1] === "12", q ? "Question 1 of " + q[1] : "no question");
    await page.locator(".focus-toggle").click();
    await levelSelect.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(250);
    const landed = await levelSelect.inputValue();
    note("…and arrowing up from Level 3 stops at Level 2: Level 1 cannot be reached", landed === "level-2", `expected level-2; actual ${landed}`);
    await page.close();
  }

  // 4. Free play is untouched.
  {
    const page = await ctx.newPage(); watch(page, "free");
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const st = await meterState(page);
    const radios = await page.locator('input[name="question-scope"]').evaluateAll((els) => els.map((e) => e.disabled));
    note("free play: every meter and both sizes stay available", off(st) === "" && radios.every((d) => !d), JSON.stringify(st));
    await page.close();
  }

  // 5. Phone.
  {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const pp = await phone.newPage(); watch(pp, "phone");
    await pp.goto(BASE + "/?" + PUBLISHED[9], { waitUntil: "networkidle" });
    await pp.locator(".focus-toggle").click();
    await pp.waitForTimeout(300);
    const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    note("phone: the setup panel with greyed-out meters has no horizontal overflow", overflow <= 0, `${overflow}px`);
    await shot(pp, "guard-phone.png");
    await phone.close();
  }

  note("no uncaught page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
