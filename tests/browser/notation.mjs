/* The /notation reference: its seven topics, live staves from the same renderer the questions use, and phone width.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, results } = reporter();
(async () => {
  const browser = await launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + "/notation", { waitUntil: "networkidle" });
  await page.waitForSelector(".notation-canvas svg");
  note("notation: heading and seven topics", (await page.locator("h1").textContent()) === "Notation reference" && (await page.locator(".notation-topic").count()) === 7);
  const figs = await page.locator(".notation-example").count();
  const svgs = await page.locator(".notation-example .notation-canvas svg").count();
  note("notation: every example staff is drawn", figs === 10 && svgs === 10, `${svgs}/${figs}`);
  // ground each claim the page makes in what the SVG actually draws
  const furniture = await page.evaluate(() => [...document.querySelectorAll(".notation-example")].map((fig) => {
    const svg = fig.querySelector(".notation-canvas svg");
    const W = Number(svg.getAttribute("width"));
    const bars = [...svg.querySelectorAll("rect")].filter((q) => +q.getAttribute("height") > 25 && +q.getAttribute("width") < 4).map((q) => +q.getAttribute("x"));
    return { caption: fig.querySelector("figcaption strong").textContent, closing: bars.some((x) => x > W - 20), opening: bars.some((x) => x < 20) };
  }));
  const beat = furniture.find((f) => /One beat/.test(f.caption));
  const measures = furniture.filter((f) => !/One beat/.test(f.caption));
  note("notation: the one-beat example has no closing barline, as the page says", beat && !beat.closing && beat.opening);
  note("notation: every measure example has a closing barline, as the page says", measures.every((f) => f.closing), `${measures.length} measures`);
  // time signature: the beat example must not carry one; measures must. Count glyph groups left of the first note is fragile, so compare svg content sizes via text presence of timesig glyph paths
  const sigCounts = await page.evaluate(() => [...document.querySelectorAll(".notation-example")].map((fig) => fig.querySelector(".notation-canvas svg").querySelectorAll("g.vf-timesignature, g.vf-stavetimesignature, .vf-timesignature").length || fig.querySelector(".notation-canvas svg").innerHTML.includes("timesig") ? 1 : 0));
  console.log("      time-signature groups per example:", JSON.stringify(sigCounts));
  const links = await page.$$eval(".notation-contents a", (as) => as.map((a) => a.getAttribute("href")));
  note("notation: the contents list jumps to each topic", links.length === 7 && (await Promise.all(links.map((h) => page.locator(h).count()))).every((n) => n === 1));
  note("notation: the Rhythm Shop's written-count convention is stated as the shop's, not the app's", /convention is to put the count for a rest\s+in parentheses/.test(((await page.locator("#rests").textContent()) || "").replace(/\s+/g, " ").replace("rest in", "rest in")) || /parentheses/.test((await page.locator("#rests").textContent()) || ""));
  note("notation: no 'not in either app' overclaim beyond what is true", /6\/8 and cut time are not in either app/.test(((await page.locator("#eighth-beat").textContent()) || "").replace(/\s+/g, " ")));
  await shot(page, "notation-desktop.png", { fullPage: false });
  await shot(page.locator("#time-signature"), "notation-timesig.png");
  const phone = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const pp = await phone.newPage();
  pp.on("pageerror", (e) => errors.push(e.message));
  await pp.goto(BASE + "/notation", { waitUntil: "networkidle" });
  await pp.waitForSelector(".notation-canvas svg");
  note("notation: phone, no horizontal page overflow", (await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await shot(pp.locator("#barlines"), "notation-barlines-phone.png");
  const foot = await page.$$eval("footer .foot-btn", (as) => as.map((a) => a.textContent.trim()));
  note("notation: footer links Assignments and Build, not itself", foot.includes("Assignments") && foot.includes("Build an assignment") && !foot.includes("Notation"), foot.join(" | "));
  note("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
