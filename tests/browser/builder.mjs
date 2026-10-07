/* The assignment builder: the link it makes, Copy, the quiz setting, refusals in plain words, and routes to and from the app.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, results } = reporter();

(async () => {
  const browser = await launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_CERT|net::ERR/.test(m.text())) errors.push("console: " + m.text()); });

  const link = () => page.locator(".builder-linkbox input").inputValue();
  const problem = async () => (await page.locator(".builder-problem").count()) ? (await page.locator(".builder-problem").innerText()).replace(/\s+/g, " ") : null;
  const settle = () => page.waitForTimeout(250);

  await page.goto(BASE + "/build", { waitUntil: "networkidle" });
  await settle();

  // A. Defaults
  const first = await link();
  note("loads with a complete default assignment and a generated 6-character seed", /\?level=2&scope=beat&meter=4-4&sys=standard&guide=on&n=10&pass=8&seed=[a-z2-9]{6}$/.test(first), first.replace(BASE, ""));

  // B. A combination the app would refuse
  await page.getByLabel(/^Question size/).selectOption("measure");
  await page.getByLabel(/^Meter/).selectOption("2-4");
  await page.getByLabel(/^Level/).selectOption("1");
  await page.getByLabel(/^Questions/).fill("5");
  await page.getByLabel(/^Pass mark/).fill("4");
  await settle();
  const refused = await problem();
  note("2/4 · Level 1 · measures · 5 questions is refused in the app's own words", !!refused && /4 different 2\/4 measures/.test(refused), refused || "no problem shown");
  note("…and no link is offered while it is refused", (await page.locator(".builder-linkbox").count()) === 0);
  await page.getByLabel(/^Questions/).fill("4");
  await settle();
  note("…asking for 4 makes it a link again, with the note about only four bars", (await page.locator(".builder-linkbox").count()) === 1 && /only 4 different 2\/4 measures/.test(await page.locator(".builder-notes").innerText()));

  // C. Picking rhythms
  await page.getByRole("radio", { name: /Pick the rhythms/ }).check();
  await page.getByRole("button", { name: "Level 1", exact: true }).click();
  note("Pick the rhythms → Start from Level 1 ticks two rhythms", /2 rhythms chosen/.test(await page.locator(".builder-count").innerText()));
  const wholeBox = page.getByRole("checkbox", { name: /Whole note/ });
  note("held notes are available when the size is one measure", await wholeBox.isEnabled());
  await wholeBox.check();
  await page.getByLabel(/^Meter/).selectOption("3-4");
  await settle();
  const wholeIn34 = await problem();
  note("a whole note in 3/4 is refused with the app's message", !!wholeIn34 && /longer than a 3\/4 measure/.test(wholeIn34), wholeIn34 || "");
  await page.getByLabel(/^Meter/).selectOption("5-4");
  await settle();
  note("…and is fine in 5/4", (await problem()) === null && /cells=quarter,eighths,whole/.test(await link()));
  await page.getByLabel(/^Question size/).selectOption("beat");
  await settle();
  note("switching to one beat disables held notes and drops the ticked whole note", (await wholeBox.isDisabled()) && !/whole/.test(await link()), (await link()).replace(BASE, ""));

  // D. Copy
  await page.getByRole("button", { name: "Copy link" }).click();
  await settle();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  note("Copy link puts the link on the clipboard and says so", clip === (await link()) && /Copied/.test(await page.locator(".builder-copied").innerText()));

  // E. The round trip: build → open as a student → play → card matches the builder's summary
  await page.getByLabel(/^Question size/).selectOption("measure");
  await page.getByRole("radio", { name: /A level/ }).check();
  await page.getByLabel(/^Level/).selectOption("2");
  await page.getByLabel(/^Meter/).selectOption("5-4");
  await page.getByLabel(/^Questions/).fill("5");
  await page.getByLabel(/^Pass mark/).fill("4");
  await page.getByLabel(/^Seed/).fill("bt1");
  await page.locator(".builder-field input").fill("Builder test");
  await settle();
  const builtLink = await link();
  const summary = (await page.locator(".builder-summary").innerText()).trim();
  console.log("      built:", builtLink.replace(BASE, ""), "\n      summary:", summary);
  const student = await ctx.newPage();
  student.on("pageerror", (e) => errors.push("student pageerror: " + e.message));
  await student.goto(builtLink, { waitUntil: "networkidle" });
  const banner = ((await student.locator(".focus-toggle").textContent()) || "").replace(/\s+/g, " ");
  note("the student's link opens set up as built (name and meter on the banner)", /Builder test/.test(banner) && /5\/4/.test(banner), banner.trim());
  let answered = 0;
  for (let i = 0; i < 25; i++) {
    if (await student.locator(".result-card").count()) break;
    const choices = student.locator(".answer-grid button");
    if (await choices.count() && await choices.first().isEnabled().catch(() => false)) { await choices.first().click(); answered++; await student.waitForTimeout(120); }
    const next = student.getByRole("button", { name: /next question|see (your )?result|finish/i }).first();
    if (await next.count()) await next.click().catch(() => {});
    await student.waitForTimeout(120);
  }
  const cardConditions = ((await student.locator(".result-footnote").first().textContent().catch(() => "")) || "").trim();
  note("the student plays the 5 questions the builder set", answered === 5, `answered ${answered}`);
  note("the result card states exactly the conditions the builder's summary promised", cardConditions === summary, `card: "${cardConditions}"`);
  await student.close();

  // F. Phone width
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  pp.on("pageerror", (e) => errors.push("phone pageerror: " + e.message));
  await pp.goto(BASE + "/build", { waitUntil: "networkidle" });
  await pp.getByRole("radio", { name: /Pick the rhythms/ }).check();
  await pp.waitForTimeout(300);
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note("phone: no horizontal page overflow with the rhythm list open", overflow <= 0, `${overflow}px`);
  const small = await pp.evaluate(() => [...document.querySelectorAll("button, select, input[type=text], input[type=number], .builder-cell, .builder-choice")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).map(e => e.className || e.tagName).slice(0, 5));
  note("phone: every control is at least 40px tall", small.length === 0, small.join(", "));
  await shot(pp, "build-phone.png", { fullPage: false });
  await phone.close();

  // G. Reachable from the app, and the screenshot
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // let React attach the dialog handlers before clicking
  await page.getByRole("button", { name: "About" }).click();
  await page.getByRole("link", { name: "Build an assignment" }).click();
  await page.waitForURL((u) => u.pathname === "/build", { timeout: 10000 }).catch(() => {});
  note("the trainer's footer link opens the builder", new URL(page.url()).pathname === "/build", page.url());
  await shot(page, "build-desktop.png", { fullPage: false });

  // Every way between the two pages, clicked — a link that logs an error and goes nowhere passes a "does it exist" check.
  await page.getByRole("link", { name: "Back to Count It" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 10000 }).catch(() => {});
  note("builder footer 'Back to Count It' lands on the trainer", new URL(page.url()).pathname === "/" && (await page.locator(".focus-toggle").count()) === 1, page.url());
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // let React attach the dialog handlers before clicking
  await page.getByRole("button", { name: "About" }).click();
  await page.getByRole("link", { name: "Build an assignment" }).click();
  await page.waitForURL((u) => u.pathname === "/build", { timeout: 10000 }).catch(() => {});
  await page.getByRole("link", { name: "Count It home" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 10000 }).catch(() => {});
  note("builder header logo returns to the trainer", new URL(page.url()).pathname === "/" && (await page.locator(".focus-toggle").count()) === 1, page.url());
  await page.goto(BASE + "/build/", { waitUntil: "networkidle" });
  note("/build/ with a trailing slash still reaches the builder", new URL(page.url()).pathname === "/build" && (await page.locator(".builder-linkbox").count()) === 1, page.url());
  note("no uncaught page errors or app console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
