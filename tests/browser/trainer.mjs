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

const exactlyOneModeSelected = async (page) =>
  (await page.locator('[role="tab"][aria-selected="true"]').count()) === 1;

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
    const modeTabs = page.getByRole("tab");
    note("initial Practice state selects exactly one mode tab", await exactlyOneModeSelected(page));
    note("learning tabs are programmatically connected to their panel",
      await modeTabs.nth(0).getAttribute("aria-controls") === await page.locator("[role=tabpanel]").getAttribute("id")
      && await page.locator("[role=tabpanel]").getAttribute("aria-labelledby") === "practice-tab");
    await modeTabs.nth(0).press("ArrowRight");
    note("learning tabs: ArrowRight selects and focuses the next tab",
      await modeTabs.nth(1).getAttribute("aria-selected") === "true"
      && await modeTabs.nth(1).getAttribute("tabindex") === "0"
      && await modeTabs.nth(1).evaluate((element) => document.activeElement === element)
      && await page.locator("[role=tabpanel]").getAttribute("aria-labelledby") === "challenge-tab"
      && await exactlyOneModeSelected(page));
    await modeTabs.nth(1).press("ArrowLeft");
    note("learning tabs: ArrowLeft returns to Practice",
      await modeTabs.nth(0).getAttribute("aria-selected") === "true"
      && await modeTabs.nth(0).evaluate((element) => document.activeElement === element)
      && await exactlyOneModeSelected(page));
    await page.locator(".focus-toggle").click();
    await page.locator("select").filter({ has: page.locator('option[value="7-4"]') }).selectOption("2-4");
    await page.locator("select").filter({ has: page.locator('option[value="level-1"]') }).selectOption("level-1");
    await page.getByRole("radio", { name: /one measure/i }).check({ force: true });
    await page.locator(".focus-toggle").click();
    const challengeLabel = await page.getByRole("tab", { name: /Choose the Count/ }).locator("small").innerText();
    note("Challenge tab count matches the clamped Level 1 round", challengeLabel === "4-question challenge", challengeLabel);
    await page.getByText("Choose the Count").first().click();
    await page.waitForTimeout(400);
    note("clicking Challenge selects only the challenge mode",
      await modeTabs.nth(1).getAttribute("aria-selected") === "true"
        && await exactlyOneModeSelected(page));
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

  // 2. Free-play results can start a question-level review without changing the original result.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "focused-practice");
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.getByText("Choose the Count").first().click();
    let hasMissedQuestion = false;
    for (let round = 0; round < 3; round++) {
      await playRound(page);
      if (await page.locator(".focused-practice").count()) {
        hasMissedQuestion = true;
        break;
      }
      await page.getByRole("button", { name: /New randomized session/ }).click();
    }
    note("free-play results offer focused practice after a missed question", hasMissedQuestion);
    if (hasMissedQuestion) {
      const originalHeading = await page.locator(".result-card > h2").innerText();
      const start = page.getByRole("button", { name: /Practice \d+ missed questions?/ });
      const targetLabel = await start.innerText();
      note("focused practice states its question count", /Practice \d+ missed questions?/.test(targetLabel), targetLabel);
      await start.click();
      await shot(page, "e2e-focused-practice.png");
      await page.locator(".focused-practice").getByRole("button", { name: "Return to session results" }).click();
      note("active focused practice can exit and restore focus to session results",
        await page.locator(".focused-practice .answer-grid").count() === 0
          && await page.getByRole("heading", { name: "Practice the questions you missed" }).isVisible()
          && await page.evaluate(() => document.activeElement?.id) === "result-title");
      await start.click();
      for (let question = 0; question < 10; question++) {
        if (await page.getByText("Focused practice complete").count()) break;
        const answer = page.locator(".focused-practice .answer-grid button").first();
        if (await answer.isEnabled().catch(() => false)) await page.keyboard.press("1");
        const next = page.getByRole("button", { name: /Next question|Finish focused practice/ });
        if (await next.count()) await next.click();
      }
      const completed = await page.locator(".focused-practice").innerText();
      note("focused practice completes and leaves the original score unchanged",
        /Focused practice complete/i.test(completed)
          && /original session score and result are unchanged/i.test(completed)
          && (await page.locator(".result-card > h2").innerText()) === originalHeading,
        completed.replace(/\s+/g, " ").trim().slice(0, 120));
      await page.getByRole("button", { name: /Return to session results/ }).click();
      note("returning from focused practice restores focus to session results",
        await page.evaluate(() => document.activeElement?.id) === "result-title");
    }
    await page.close();
  }

  // 2b. Locked Eastman settings use neutral rhythm names while their count stays profile-specific.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "locked-eastman-profile");
    await page.addInitScript(() => {
      localStorage.setItem("count-it-counting-profile-v1", JSON.stringify({ version: 1, profile: "standard" }));
    });
    await page.goto(BASE + "/?a=QA%20Synthetic%20%E2%80%94%20Eastman%20Ti&scope=beat&meter=4-4&sys=eastman-ti-te-ta&cells=rest-two-rest,dotted-eighth-sixteenth,sixteenth-eighth-sixteenth,sixteenths&guide=off&fb=end&retry=off&n=4&pass=3&seed=qa1006", { waitUntil: "networkidle" });
    const banner = (await page.locator(".focus-toggle").textContent()) || "";
    note("locked profile: assignment keeps Eastman Ti", /Eastman \(ti-te-ta\)/.test(banner), banner.replace(/\s+/g, " ").trim());
    note("challenge tab reflects the configured question count", /4-question challenge/.test(await page.getByRole("tab", { name: /Choose the Count/ }).innerText()));
    await page.locator(".focus-toggle").click();
    note("locked profile: conflicting saved Standard default stays unchanged", await page.getByLabel("Counting profile").isDisabled()
      && /Saved on this device: Standard/.test((await page.locator(".system-note").innerText()) || ""));
    const rhythmLabels = await page.locator('[aria-label="Rhythms in this assignment"]').innerText();
    const neutralRhythmNames = ["Rest, two notes, rest", "Dotted eighth, sixteenth", "Sixteenth, eighth, sixteenth", "Four sixteenth notes"];
    note("locked Eastman Rhythms list uses neutral note-value names", neutralRhythmNames.every((label) => rhythmLabels.includes(label))
      && !["e and &", "Beat and a", "Beat, e and a"].some((label) => rhythmLabels.includes(label)), rhythmLabels.replace(/\s+/g, " ").trim());
    await page.locator(".focus-toggle").click();
    await playRound(page);
    const resultMessage = (await page.locator(".result-message").textContent()) || "";
    const reviewSummary = await page.locator(".result-review summary").innerText();
    note("one-attempt result directs students to review the answers without suggesting a retry",
      /Review the questions below and compare each answer with the correct count/i.test(resultMessage)
        && !/try again/i.test(resultMessage)
        && /Review all 4 questions/.test(reviewSummary), resultMessage);
    note("one-attempt assignment does not offer a retry control", await page.getByRole("button", { name: /Try again|Retry this set/ }).count() === 0);
    await page.goto(BASE + "/?a=QA%20Synthetic%20%E2%80%94%20Eastman%20Ta&scope=beat&meter=4-4&sys=eastman-ta-te-ta&cells=rest-two-rest,dotted-eighth-sixteenth,sixteenth-eighth-sixteenth,sixteenths&guide=off&fb=end&retry=off&n=4&pass=3&seed=qa1006", { waitUntil: "networkidle" });
    await page.locator(".focus-toggle").click();
    const eastmanTaRhythmLabels = await page.locator('[aria-label="Rhythms in this assignment"]').innerText();
    note("locked Eastman Ta Rhythms list also uses neutral note-value names",
      neutralRhythmNames.every((label) => eastmanTaRhythmLabels.includes(label))
        && !["e and &", "Beat and a", "Beat, e and a"].some((label) => eastmanTaRhythmLabels.includes(label)),
      eastmanTaRhythmLabels.replace(/\s+/g, " ").trim());
    await page.close();
  }

  // 3. Assigned 7/4 link, full round.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(page, "assigned-7/4");
    await page.goto(BASE + "/?a=Odd%20meters&scope=measure&meter=7-4&level=2&n=5&pass=4&seed=e2e1&guide=on", { waitUntil: "networkidle" });
    note("assigned round initializes with exactly one mode tab selected", await exactlyOneModeSelected(page));
    const banner = (await page.locator(".focus-toggle").textContent()) || "";
    note("assigned 7/4 link shows the conditions, meter included", /7\/4/.test(banner), banner.replace(/\s+/g, " ").trim());
    const answered = await playRound(page);
    const cond = (await page.locator(".result-footnote").first().textContent().catch(() => "")) || "";
    note("assigned 7/4 round completes (5 answered)", (await page.locator(".result-card").count()) === 1 && answered === 5, `answered ${answered}`);
    note("…card conditions state 7/4 and the pass mark", /7\/4/.test(cond) && /pass at 4/.test(cond), cond);
    const assignmentResult = (await page.locator(".result-card").innerText()) || "";
    note("assigned measure results do not attribute a miss to every cell",
      !/Worth another look|Missed: [^\n]+/.test(assignmentResult),
      assignmentResult.replace(/\s+/g, " ").trim().slice(0, 120));
    note("assigned retry controls remain governed by the link", await page.locator(".focused-practice").count() === 0
      && await page.getByRole("button", { name: /Retry this set/ }).count() === 1);
    await shot(page, "e2e-assigned-7-4-result.png");
    await page.close();
  }

  // 4. A link naming a rhythm the bar cannot hold is refused, and the app still works.
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

  // 5. Old links: no meter named, and 3/4, still behave.
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

  // 6. Phone width, 5/4, practice + challenge: no page overflow, no errors.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    watch(page, "phone-5/4");
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    note("phone practice includes the reading scaffold", await page.locator(".reading-scaffold").count() === 1);
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

  // A single held note fills the bar; at phone widths the sparse notation should fit without scrolling.
  for (const width of [390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 740 }, hasTouch: true, isMobile: true });
    watch(page, `phone-whole-note-${width}`);
    await page.goto(BASE + "/?scope=measure&meter=5-4&cells=whole,quarter&n=1&seed=whole-phone", { waitUntil: "networkidle" });
    const dimensions = await page.locator(".notation-scroll").evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    note(`phone ${width}px · whole-note measure fits the notation panel`, dimensions.scroll <= dimensions.client + 1, `${dimensions.scroll}px inside ${dimensions.client}px`);
    if (width === 390) await shot(page, "e2e-phone-whole-note.png");
    await page.close();
  }

  note("no uncaught page errors or app console errors across all flows", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
