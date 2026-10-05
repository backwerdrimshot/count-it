/* The practice screen: free play in each meter, an assigned link, a refused link, keyboard answering, and phone width.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, results } = reporter();

async function playRound(page, { keyboard = false } = {}) {
  let answered = 0;
  for (let i = 0; i < 25; i++) {
    if (await page.locator(".result-card").count()) break;
    const choices = page.locator(".answer-grid button");
    if (await choices.count()) {
      const enabled = await choices.first().isEnabled().catch(() => false);
      if (enabled) {
        if (keyboard) await page.keyboard.press("1"); else await choices.first().click();
        answered++;
        await page.waitForTimeout(150);
      }
    }
    const next = page.getByRole("button", { name: /next question|see (your )?result|finish/i }).first();
    if (await next.count()) await next.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  return answered;
}

(async () => {
  const browser = await launch();
  const errors = [];
  const watch = (page, tag) => {
    page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/ERR_CERT|net::ERR/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  };

  // 1. Free play, 2/4 · Level 1 · one measure — the round the generator used to throw on.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "free-2/4");
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    await page.locator("select").filter({ has: page.locator('option[value="7-4"]') }).selectOption("2-4");
    await page.locator("select").filter({ has: page.locator('option[value="level-1"]') }).selectOption("level-1");
    await page.getByRole("radio", { name: /one measure/i }).check({ force: true });
    await page.locator(".focus-toggle").click();
    await page.getByText("Choose the Count").first().click();
    await page.waitForTimeout(400);
    const progress = await page.locator("text=/Question 1 of \\d+/").first().textContent().catch(() => "");
    note("2/4 · Level 1 · measure Challenge builds, and is clamped to 4 questions", /of 4/.test(progress), progress);
    const answered = await playRound(page, { keyboard: true });
    const done = await page.locator(".result-card").count();
    note("…and finishes to a result card (answered with keyboard shortcut 1)", done === 1, `answered ${answered}`);
    const cond = (await page.locator(".result-footnote").first().textContent().catch(() => "")) || "";
    note("…the card's conditions line states 2/4", /2\/4/.test(cond), cond);
    const score = (await page.locator(".result-card").first().textContent()) || "";
    note("…the card reports a score out of 4", /\b\d\s*(\/|of)\s*4\b/.test(score) || /of 4/.test(score), score.replace(/\s+/g, " ").slice(0, 90));
    await shot(page, "e2e-free-2-4-result.png");
    await page.close();
  }

  // 2. Assigned 7/4 link, full round.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "assigned-7/4");
    await page.goto(BASE + "/?a=Odd%20meters&scope=measure&meter=7-4&level=2&n=5&pass=4&seed=e2e1&guide=on", { waitUntil: "networkidle" });
    const banner = (await page.locator(".focus-toggle").textContent()) || "";
    note("assigned 7/4 link shows the conditions, meter included", /7\/4/.test(banner), banner.replace(/\s+/g, " ").trim());
    const answered = await playRound(page);
    const cond = (await page.locator(".result-footnote").first().textContent().catch(() => "")) || "";
    note("assigned 7/4 round completes (5 answered)", (await page.locator(".result-card").count()) === 1 && answered === 5, `answered ${answered}`);
    note("…card conditions state 7/4 and the pass mark", /7\/4/.test(cond) && /pass at 4/.test(cond), cond);
    await shot(page, "e2e-assigned-7-4-result.png");
    await page.close();
  }

  // 3. A link naming a rhythm the bar cannot hold is refused, and the app still works.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "refused");
    await page.goto(BASE + "/?scope=measure&meter=3-4&cells=whole,quarter,eighths,eighth-rest&n=5&seed=a", { waitUntil: "networkidle" });
    const body = (await page.locator("body").innerText()) || "";
    note("whole note in 3/4 link is refused with a plain message", /longer than a 3\/4 measure/.test(body) && /updated link/i.test(body));
    const usable = await page.locator(".trainer-card").count();
    note("…and the app still renders underneath", usable > 0);
    await shot(page, "e2e-refused.png");
    await page.close();
  }

  // 4. Old links: no meter named, and 3/4, still behave.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "legacy");
    await page.goto(BASE + "/?scope=measure&level=1&n=8&pass=7&seed=cr2", { waitUntil: "networkidle" });
    const banner = (await page.locator(".focus-toggle").textContent()) || "";
    note("a legacy link (no meter) means 4/4, and the banner says so", /4\/4/.test(banner), banner.replace(/\s+/g, " ").trim());
    const answered = await playRound(page);
    const cond = (await page.locator(".result-footnote").first().textContent().catch(() => "")) || "";
    note("legacy 8-question round completes, card states no meter", (await page.locator(".result-card").count()) === 1 && answered === 8 && !/\d\/4/.test(cond), `answered ${answered}; ${cond}`);
    await page.close();
  }

  // 5. Phone width, 5/4, practice + challenge: no page overflow, no errors.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    watch(page, "phone-5/4");
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    await page.locator("select").filter({ has: page.locator('option[value="7-4"]') }).selectOption("5-4");
    await page.getByRole("radio", { name: /one measure/i }).check({ force: true });
    await page.locator(".focus-toggle").click();
    await page.getByRole("button", { name: /reveal the count/i }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    note("phone · 5/4 practice has no page-level horizontal overflow", overflow <= 0, `${overflow}px`);
    await page.getByText("Choose the Count").first().click();
    await playRound(page);
    note("phone · 5/4 challenge completes", (await page.locator(".result-card").count()) === 1);
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    note("phone · result card has no page-level horizontal overflow", overflow2 <= 0, `${overflow2}px`);
    await shot(page, "e2e-phone-5-4-result.png");
    await page.close();
  }

  note("no uncaught page errors or app console errors across all flows", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
