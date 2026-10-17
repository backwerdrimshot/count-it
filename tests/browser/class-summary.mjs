/* /class-summary: two real hand-ins pasted in, their codes checked, an edited one caught, both CSVs downloaded, phone width.
   Run with `pnpm test:browser` (see README.md in this folder). */
import { readFile } from "node:fs/promises";
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, results } = reporter();

/* Plays an assigned round to its card and returns the summary the hand-in button copies. */
async function handIn(browser, student) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/?a=Class%20check&n=2&seed=class-sum&scope=beat&pass=1&time=5", { waitUntil: "networkidle" });
  for (let i = 0; i < 2; i++) {
    await page.locator(".answer-choice").first().click();
    await page.getByRole("button", { name: /Next question|See results/ }).click();
  }
  await page.waitForFunction(() => /^BRS-CI-(?!700101)/.test(document.querySelector(".result-code code")?.textContent ?? ""));
  await page.getByLabel("Your name or class ID (optional)").fill(student);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } }));
  await page.getByRole("button", { name: /^(Copy summary|Turn this in)$/ }).click();
  const text = await page.evaluate(() => window.__copied);
  await ctx.close();
  return text;
}

(async () => {
  const browser = await launch();
  const errors = [];
  const first = await handIn(browser, "4B-07");
  const second = await handIn(browser, "4B-12");
  note("a hand-in carries the Stamp line the check needs", /\nStamp: \d{4}-\d\d-\d\dT[\d:.]+Z\nCode: BRS-CI-/.test(first), first.split("\n").slice(-2).join(" | "));

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(BASE + "/class-summary", { waitUntil: "networkidle" });
  const edited = second.replace(/Score: (\d)\//, (_, n) => `Score: ${n === "2" ? 1 : 2}/`).replace("4B-12", "4B-13");
  await page.getByLabel("Students’ summaries").fill(`${first}\n\n${second}\n\n${edited}`);
  const rows = await page.locator(".class-summary-table tbody tr").allInnerTexts();
  note("three pasted summaries make three rows", rows.length === 3, String(rows.length));
  note("real hand-ins check", /Code checks/.test(rows[0]) && /Code checks/.test(rows[1]), rows.slice(0, 2).join(" // ").replace(/\s+/g, " "));
  note("an edited hand-in is caught", /Code does not match/.test(rows[2] ?? ""), (rows[2] ?? "").replace(/\s+/g, " "));
  note("the table shows student ID, goal and time", /4B-07/.test(rows[0]) && /(Yes|Not yet)/.test(rows[0]) && /limit 5:00/.test(rows[0]));
  await shot(page, "class-summary-desktop.png", { fullPage: true });

  const tableDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download table (CSV)" }).click();
  const table = await readFile(await (await tableDownload).path(), "utf8");
  note("table CSV has a row per summary and the Time column", table.trim().split("\r\n").length === 4 && /Threshold met,Time,/.test(table), table.split("\r\n")[0]);

  const canvasDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Canvas gradebook CSV" }).click();
  const canvas = await readFile(await (await canvasDownload).path(), "utf8");
  const lines = canvas.trim().split("\r\n");
  note("Canvas CSV uses the gradebook columns and the assignment name", lines[0] === "Student,ID,SIS User ID,SIS Login ID,Section,Class check", lines[0]);
  note("Canvas CSV holds only the checked students, with blank Canvas IDs", lines.length === 3 && lines.slice(1).every((l) => /^4B-(07|12),,,,,\d$/.test(l)), lines.slice(1).join(" | "));
  note("questions correct stay bare counts (Canvas reads them as points)", !canvas.includes("%"));

  await page.getByLabel("Score in the column").selectOption("percent");
  const percentDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Canvas gradebook CSV" }).click();
  const percents = (await readFile(await (await percentDownload).path(), "utf8")).trim().split("\r\n");
  note("percent mode writes the percent with its sign, so Canvas scales it", percents.length === 3 && percents.slice(1).every((l) => /^4B-(07|12),,,,,\d{1,3}%$/.test(l)), percents.slice(1).join(" | "));
  note("the page says any point value works with percents", /any point value works/.test(await page.locator(".class-summary-downloads").innerText()));
  note("the page says the teacher matches names in Canvas", /You match the names in Canvas/.test(await page.locator(".class-summary-note").innerText()));
  note("the download is announced", /Canvas file downloaded with 2 students\. Left out: 1 without a checked code/.test(await page.locator(".class-summary-downloads [role=status]").innerText()));

  await page.setViewportSize({ width: 375, height: 800 });
  note("phone width: no page-level sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await shot(page, "class-summary-phone.png", { fullPage: true });
  note("no uncaught page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
