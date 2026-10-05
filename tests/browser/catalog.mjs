/* The /assignments page: sixteen steps, the links they publish, copy, and a step played from the catalog to its result.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, results } = reporter();

async function playRound(page) {
  let answered = 0;
  for (let i = 0; i < 40; i++) {
    if (await page.locator(".result-card").count()) break;
    const choices = page.locator(".answer-grid button");
    if (await choices.count()) {
      if (await choices.first().isEnabled().catch(() => false)) { await choices.first().click(); answered++; await page.waitForTimeout(120); }
    }
    const next = page.getByRole("button", { name: /next question|see (your )?result|finish/i }).first();
    if (await next.count()) await next.click().catch(() => {});
    await page.waitForTimeout(120);
  }
  return answered;
}

(async () => {
  const browser = await launch();
  const errors = [];
  const newCtx = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, ...opts });
    return ctx;
  };
  const watch = (page) => {
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|ERR_|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  };

  // ---------- the catalog page ----------
  const ctx = await newCtx({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE + "/assignments", { waitUntil: "networkidle" });
  note("catalog: heading and two sequences", (await page.locator("h1").textContent()) === "Assignments" && (await page.locator(".catalog-sequence").count()) === 2);
  note("catalog: sixteen steps listed", (await page.locator(".catalog-card").count()) === 16);
  note("catalog: thirteen can be customized in the builder, three open in Eight Time",
    (await page.locator("a:has-text('Customize in builder')").count()) === 13 && (await page.locator(".catalog-badge").count()) === 3);
  note("catalog: no step shows a finished count before any round is played",
    (await page.locator(".catalog-status", { hasText: /^Not finished/ }).count()) === 13 && (await page.locator(".catalog-status", { hasText: /^Finished/ }).count()) === 0);
  const et4 = await page.locator("#rhythms-in-three-4 a:has-text('Try it')").getAttribute("href");
  note("catalog: an Eight Time step links to Eight Time, with its own seed",
    et4.startsWith("https://eight-time.backwerdrhythmshop.com/?seq=rhythms-in-three&step=4") && et4.includes("seed=r3-4-eighth-beat"), et4.slice(0, 90));
  note("catalog: an Eight Time step has no builder link and no tally", (await page.locator("#rhythms-in-three-4 a:has-text('Customize')").count()) === 0 && (await page.locator("#rhythms-in-three-4 .catalog-status").count()) === 0);
  const hrefs = await page.$$eval(".catalog-actions a:first-child", (as) => as.map((a) => a.getAttribute("href")));
  note("catalog: Try it opens the published link, relative for Count It's own steps", hrefs[0].startsWith("/?seq=counting-rhythms&step=1&") && hrefs[12].startsWith("/?seq=rhythms-in-three&step=3&"), hrefs[0].slice(0, 70));

  // copy
  await page.locator("#counting-rhythms-2 button:has-text('Copy link')").click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  note("catalog: Copy link puts the absolute published link on the clipboard", clip.startsWith("https://count-it.backwerdrhythmshop.com/?seq=counting-rhythms&step=2&") && clip.includes("seed=cr2-wheres-the-and"), clip.slice(0, 80));
  note("catalog: …and says so", /Copied/.test((await page.locator("#counting-rhythms-2 .builder-copied").textContent()) || ""));

  // play step 1 from the catalog and come back
  await page.locator("#counting-rhythms-1 a:has-text('Try it')").click();
  await page.waitForURL(/seq=counting-rhythms&step=1/);
  const answered = await playRound(page);
  note("catalog: a step opened from the catalog plays to a result card (12 questions)", (await page.locator(".result-card").count()) === 1 && answered === 12, `answered ${answered}`);
  const cond = (await page.locator(".result-card").first().textContent()) || "";
  note("catalog: the card names the step it was", /counting-rhythms/.test(cond) && /step 1/.test(cond), (await page.locator(".result-step").first().textContent().catch(() => "")) || "");
  await page.goto(BASE + "/assignments", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  note("catalog: that step now says it was finished once on this device", /Finished 1 time on this device/.test((await page.locator("#counting-rhythms-1 .catalog-status").textContent()) || ""));
  note("catalog: other steps are untouched", (await page.locator(".catalog-status", { hasText: /^Finished/ }).count()) === 1 && (await page.locator(".catalog-status", { hasText: /^Not finished/ }).count()) === 12);

  // keyboard / skip link / phone
  note("catalog: a skip link is the first thing in the tab order", await (async () => { await page.goto(BASE + "/assignments", { waitUntil: "networkidle" }); await page.keyboard.press("Tab"); return (await page.evaluate(() => document.activeElement?.textContent || "")).includes("Skip to the assignments"); })());
  const phone = await newCtx({ viewport: { width: 375, height: 800 } });
  const pp = await phone.newPage(); watch(pp);
  await pp.goto(BASE + "/assignments", { waitUntil: "networkidle" });
  note("catalog: phone, no horizontal overflow", (await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  const small = await pp.$$eval(".catalog-actions a, .catalog-actions button", (els) => els.filter((e) => e.getBoundingClientRect().height < 40).length);
  note("catalog: phone, every action is at least 40px tall", small === 0, `${small} too small`);
  await shot(pp, "catalog-phone.png", { fullPage: false });
  await page.goto(BASE + "/assignments", { waitUntil: "networkidle" });
  await shot(page, "catalog-desktop.png", { fullPage: false });

  // copy fallback: a context with no clipboard permission
  const noclip = await newCtx({});
  const nc = await noclip.newPage(); watch(nc);
  await nc.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } }); });
  await nc.goto(BASE + "/assignments", { waitUntil: "networkidle" });
  await nc.locator("#counting-rhythms-3 button:has-text('Copy link')").click();
  await nc.waitForTimeout(300);
  const fieldVisible = await nc.locator("#counting-rhythms-3 .catalog-linkbox input").isVisible();
  const focused = await nc.evaluate(() => document.activeElement?.tagName === "INPUT" && document.activeElement.value.includes("step=3"));
  note("catalog: when copying is refused, the link is shown, selected, in a visible field", fieldVisible && focused);

  // ---------- the builder: start from a step, and the quiz ----------
  const b = await ctx.newPage(); watch(b);
  await b.goto(BASE + "/build?from=rhythms-in-three-2", { waitUntil: "networkidle" });
  await b.waitForTimeout(300);
  note("builder: ?from= starts the form from that step", (await b.locator("select").first().inputValue()) === "rhythms-in-three-2" && (await b.locator("input[type=text]").first().inputValue()).includes("Sixteenths in Three"));
  const bodyText = (await b.locator(".builder-preset-note").textContent()) || "";
  note("builder: a Rhythms in Three step says its meter is 3/4 as published", /The meter is 3\/4, as the step publishes it/.test(bodyText), bodyText.slice(-80));
  const link = await b.locator(".builder-linkbox input").inputValue();
  note("builder: its link carries 3/4 and the step's own seed", link.includes("meter=3-4") && link.includes("seed=r3-2-sixteenths"), link.slice(0, 100));
  await b.goto(BASE + "/build?from=counting-rhythms-3", { waitUntil: "networkidle" });
  await b.waitForTimeout(300);
  note("builder: a Counting Rhythms step says its meter is pinned to 4/4", /pinned to 4\/4/.test((await b.locator(".builder-preset-note").textContent()) || ""));
  await b.goto(BASE + "/build?from=nonsense", { waitUntil: "networkidle" });
  await b.waitForTimeout(300);
  note("builder: an unknown ?from= is ignored and the form opens normally with a fresh seed", (await b.locator("select").first().inputValue()) === "" && /seed=[a-z0-9]{6}/.test(await b.locator(".builder-linkbox input").inputValue()));
  const groups = await b.$$eval("select optgroup", (g) => g.map((x) => x.label + ":" + x.querySelectorAll("option").length));
  note("builder: the step menu groups both sequences", groups.join("|") === "Counting Rhythms — 4/4:10|Rhythms in Three — 3/4:3", groups.join("|"));

  // quiz
  await b.goto(BASE + "/build", { waitUntil: "networkidle" });
  await b.getByLabel("Pick the rhythms").check();
  await b.getByRole("button", { name: "Level 2" }).click();
  await b.getByLabel("One beat", { exact: true }).first().check().catch(async () => { await b.locator("select").nth(1).selectOption("beat"); });
  const ticked = await b.locator(".builder-cells input[type=checkbox]:checked").count();
  await b.getByRole("button", { name: "Make this a quiz" }).click();
  await b.waitForTimeout(200);
  const quizLink = await b.locator(".builder-linkbox input").inputValue();
  note("quiz: the link hides the guide, holds answers and allows one attempt", /guide=off/.test(quizLink) && /fb=end/.test(quizLink) && /retry=off/.test(quizLink), quizLink.slice(0, 140));
  note("quiz: one question per ticked rhythm, pass at four in five", quizLink.includes(`n=${ticked}`) && quizLink.includes(`pass=${Math.ceil(ticked * 0.8)}`), `ticked ${ticked}`);
  const msg = (await b.locator(".builder-quiz-status").textContent()) || "";
  note("quiz: says what it did", /Quiz settings applied/.test(msg) && msg.includes(`${ticked} questions`), msg.slice(0, 110));
  await b.getByLabel("Subdivision guide").selectOption("on");
  await b.waitForTimeout(150);
  note("quiz: the message goes away as soon as the form no longer matches it", ((await b.locator(".builder-quiz-status").textContent()) || "") === "");

  // ---------- footers ----------
  const foot = async (path) => { await b.goto(BASE + path, { waitUntil: "networkidle" }); return (await b.$$eval("footer .foot-btn", (as) => as.map((a) => a.textContent.trim()))); };
  const tf = await foot("/");
  note("footer: the trainer links Assignments and Build an assignment", tf.includes("Assignments") && tf.includes("Build an assignment"), tf.join(" | "));
  const bf = await foot("/build");
  note("footer: the builder links Assignments, not itself", bf.includes("Assignments") && !bf.includes("Build an assignment"), bf.join(" | "));
  const cf = await foot("/assignments");
  note("footer: the catalog links Build an assignment, not itself", cf.includes("Build an assignment") && !cf.includes("Assignments"), cf.join(" | "));

  note("no page errors or app console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
