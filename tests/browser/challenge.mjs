/* Challenge checks: guide visibility, the one-beat cue, and keyboard focus.
   Run with `pnpm test:browser challenge` (see README.md in this folder). */
import { launch, BASE, reporter } from "./harness.mjs";

const { note, finish } = reporter();
const ASSIGNED = (guide) => `/?a=Guide%20check&level=1&scope=beat&n=5&pass=4&seed=gc1&guide=${guide}`;

// What is on the page now: the count row (only drawn with the guide), the beat cue,
// answer choices, and any choice still marked as a toggle.
const state = (page) => page.evaluate(() => ({
  row: document.querySelectorAll("[data-guide-at]").length,
  cue: document.querySelectorAll("[data-beat-cue]").length,
  choices: document.querySelectorAll(".answer-choice").length,
  toggles: document.querySelectorAll(".answer-grid [aria-pressed]").length,
}));
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return { text: (el?.textContent || "").trim(), id: el?.id || "" };
});

// A free round, with question size and guide set in Settings before any answer.
async function freeRound(page, { oneBeat, guideOn }) {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /choose the count/i }).click();
  await page.getByRole("button", { name: /settings/i }).first().click();
  if (oneBeat) await page.locator("label").filter({ hasText: /^One beat/ }).first().click();
  const guide = page.getByLabel(/Subdivision guide/);
  if ((await guide.isChecked()) !== guideOn) await guide.click();
  await page.keyboard.press("Escape");
  await page.waitForSelector(".answer-choice");
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await launch();
  const errors = [];
  const open = async (path) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    if (path) await page.goto(BASE + path, { waitUntil: "networkidle" });
    return { ctx, page };
  };

  // 1. Guide visibility in a free one-beat round: the count row follows the guide setting,
  //    and the beat cue is there whichever way the guide is set.
  {
    const { ctx, page } = await open(null);
    await freeRound(page, { oneBeat: true, guideOn: false });
    const before = await state(page);
    note("one beat, guide off: no count row before answering", before.row === 0, `row=${before.row}`);
    note("one beat, guide off: 'Starts on beat 1' cue shown", before.cue === 1, `cue=${before.cue}`);
    await page.locator(".answer-choice").first().click();
    await page.waitForTimeout(200);
    const after = await state(page);
    note("one beat, guide off: still no count row after answering", after.row === 0, `row=${after.row}`);
    note("one beat, guide off: the cue is still there after answering", after.cue === 1, `cue=${after.cue}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(null);
    await freeRound(page, { oneBeat: true, guideOn: true });
    const before = await state(page);
    note("one beat, guide on: no count row before answering", before.row === 0, `row=${before.row}`);
    note("one beat, guide on: 'Starts on beat 1' cue shown", before.cue === 1, `cue=${before.cue}`);
    await page.locator(".answer-choice").first().click();
    await page.waitForTimeout(200);
    const after = await state(page);
    note("one beat, guide on: count row appears after answering", after.row > 0, `row=${after.row}`);
    await ctx.close();
  }

  // 2. An assigned round keeps the teacher's guide policy, whatever the student does with Settings.
  {
    const { ctx, page } = await open(ASSIGNED("on"));
    await page.waitForSelector(".answer-choice");
    const s = await state(page);
    note("assignment guide=on: count row shown before answering", s.row > 0, `row=${s.row}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(ASSIGNED("off"));
    await page.waitForSelector(".answer-choice");
    const s = await state(page);
    note("assignment guide=off: no count row before answering", s.row === 0, `row=${s.row}`);
    note("assignment guide=off: the cue is still shown", s.cue === 1, `cue=${s.cue}`);
    await ctx.close();
  }

  // 3. Keyboard: answering with Enter keeps focus in the round, on the button that continues it.
  {
    const { ctx, page } = await open(null);
    await freeRound(page, { oneBeat: false, guideOn: true });
    await page.locator(".answer-choice").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const f = await focused(page);
    note("Enter answers, and focus moves to the Next button", /^(Next question|See results)/.test(f.text), `focus="${f.text.slice(0, 30)}"`);
    const s = await state(page);
    note("answer choices are not marked as toggles", s.toggles === 0, `aria-pressed=${s.toggles}`);
    // 4. Enter on Next moves focus to the new question's heading, so the next question is read.
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const next = await focused(page);
    note("Next moves focus to the new question heading", next.id === "challenge-title", `focus id="${next.id}"`);
    await ctx.close();
  }

  // 5. Keyboard: keys 1 to 4 answer the question, and a key after the answer does nothing more.
  {
    const { ctx, page } = await open(null);
    await freeRound(page, { oneBeat: false, guideOn: true });
    await page.locator("body").click({ position: { x: 4, y: 4 } });
    await page.keyboard.press("2");
    await page.waitForTimeout(200);
    const once = await state(page);
    const chosen = await page.locator(".choice-result").allTextContents();
    note("key 2 answers the question", chosen.length >= 1, `result labels=${JSON.stringify(chosen)}`);
    await page.keyboard.press("3");
    await page.waitForTimeout(150);
    const twice = await page.locator(".choice-result").allTextContents();
    note("a second key after answering changes nothing", JSON.stringify(twice) === JSON.stringify(chosen) && once.choices > 0, `labels=${JSON.stringify(twice)}`);
    await ctx.close();
  }

  note("no page errors while running the challenge checks", errors.length === 0, errors.slice(0, 2).join(" | "));
  finish();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
