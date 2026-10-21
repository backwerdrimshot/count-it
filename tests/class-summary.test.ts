import { describe, expect, it } from "vitest";
import { verificationCode } from "../src/assignment";
import { STATUS_TEXT, canvasGroups, canvasPreview, csvCell, parseSummaries, stampLine, summaryCsv } from "../src/class-summary";
import { timeTicketLine } from "../src/time-limit";
import { hintsTicketLine } from "../src/hints";

/* A summary laid out the way the result card writes it, with its real code. */
function summary(options: {
  assignment?: string; student?: string; correct: number; total: number; attempt?: number;
  at?: string; pass?: boolean; timing?: { elapsedSeconds: number; limitMinutes: number }; hints?: number;
  round?: string; classCode?: string; repeats?: boolean;
}): string {
  const at = new Date(options.at ?? "2026-10-17T15:04:05.123Z");
  const code = verificationCode({
    assignment: options.assignment ?? "", studentId: options.student ?? "", correct: options.correct,
    total: options.total, finishedAt: at, attempt: options.attempt ?? 1,
    ...(options.timing ? { timing: options.timing } : {}),
    ...(options.hints !== undefined ? { hintsUsed: options.hints } : {}),
    ...(options.round ? { round: options.round } : {}),
    ...(options.classCode ? { classCode: options.classCode } : {}),
    ...(options.repeats ? { repeats: true } : {}),
  });
  return [
    "Count It — Choose the Count",
    options.assignment ? `Assignment: ${options.assignment}` : "Practice session",
    options.round ? `Round: ${options.round}` : null,
    options.student ? `Student: ${options.student}` : null,
    options.classCode ? `Class: ${options.classCode}` : null,
    `Score: ${options.correct}/${options.total} (${Math.round((options.correct / options.total) * 100)}%)`,
    (options.attempt ?? 1) > 1 ? `Attempt: ${options.attempt}` : null,
    "Conditions: Level 1 · one beat · 5 questions",
    options.repeats ? "Repeats: yes" : null,
    options.timing ? timeTicketLine(options.timing.elapsedSeconds, options.timing.limitMinutes) : null,
    options.hints !== undefined ? hintsTicketLine(options.hints) : null,
    options.pass === undefined ? null : `Result: ${options.pass ? "met the goal" : "not yet at the goal"}`,
    "Missed: quarter, eighths",
    `Finished: ${at.toLocaleString()}`,
    stampLine(at),
    `Code: ${code}`,
  ].filter(Boolean).join("\n");
}

const ROUND_A = "R1A2B3";
const ROUND_B = "R9Z8Y7";

describe("reading pasted summaries", () => {
  it("refuses a score that cannot happen, even when its checksum matches, and says so", () => {
    const [row] = parseSummaries(summary({ assignment: "Step 2", student: "Ana", correct: 99, total: 12 }));
    expect(row.status).toBe("impossible");
    expect(STATUS_TEXT[row.status]).toBe("Score is impossible");
    expect(STATUS_TEXT[row.status]).not.toBe(STATUS_TEXT.invalid);
  });

  it("still calls an impossible score impossible when its code is missing or wrong", () => {
    const text = summary({ assignment: "Step 2", student: "Ana", correct: 99, total: 12 });
    const noCode = text.split("\n").filter((line) => !/^Code:/.test(line)).join("\n");
    const wrongCode = text.replace(/Code: .*/, "Code: BRS-CI-261021-825-ZZZ9");
    for (const variant of [noCode, wrongCode]) {
      const [row] = parseSummaries(variant);
      expect(row.status).toBe("impossible");
      const preview = canvasPreview([row], { column: "Step 2", score: "correct", onlyChecked: false, group: canvasGroups([row])[0].key, policy: "best" });
      expect(preview.students).toHaveLength(0);
    }
  });
  it("keeps an impossible score out of the Canvas export even with unchecked rows included", () => {
    const rows = parseSummaries(summary({ assignment: "Step 2", student: "Ana", correct: 99, total: 12 }));
    const preview = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: false, group: canvasGroups(rows)[0].key, policy: "best" });
    expect(preview.students).toHaveLength(0);
    expect(preview.skipped.impossible).toBe(1);
    expect(preview.csv).toBe("Student,ID,SIS User ID,SIS Login ID,Section,Step 2\r\n");
  });
  it("checks the hints count on a summary from a hints-on assignment", () => {
    const text = summary({ assignment: "Step 2", student: "Ana", correct: 10, total: 12, hints: 2 });
    expect(parseSummaries(text)[0]).toMatchObject({ status: "valid", hintsUsed: 2 });
    expect(parseSummaries(text.replace("Hints used: 2", "Hints used: 0"))[0].status).toBe("invalid");
    expect(parseSummaries(text.replace("Hints used: 2\n", ""))[0].status).toBe("invalid");
  });

  it("splits several summaries and reads every column", () => {
    const text = [
      summary({ assignment: "Step 2", student: "4B-07", correct: 11, total: 12, pass: true }),
      "",
      summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12, attempt: 3, pass: false, timing: { elapsedSeconds: 390, limitMinutes: 5 } }),
    ].join("\n");
    const rows = parseSummaries(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ studentId: "4B-07", assignment: "Step 2", correct: 11, total: 12, percent: 92, metGoal: true, attempt: 1, time: null, status: "valid" });
    expect(rows[1]).toMatchObject({ studentId: "Ana", correct: 6, attempt: 3, metGoal: false, time: "6:30 (limit 5:00, over by 1:30)", status: "valid" });
  });

  it("checks practice summaries and summaries with no student ID", () => {
    expect(parseSummaries(summary({ correct: 3, total: 5 }))[0]).toMatchObject({ assignment: null, studentId: "", status: "valid", metGoal: null });
  });

  it("survives indentation and Windows line endings from an LMS", () => {
    const pasted = summary({ assignment: "Step 2", student: "4B-07", correct: 4, total: 5 }).split("\n").map((line) => `   ${line}`).join("\r\n");
    expect(parseSummaries(pasted)[0].status).toBe("valid");
  });

  it("catches any edited fact the code covers", () => {
    const original = summary({ assignment: "Step 2", student: "4B-07", correct: 4, total: 5, timing: { elapsedSeconds: 252, limitMinutes: 5 } });
    const edits: [string, string][] = [
      ["Score: 4/5 (80%)", "Score: 5/5 (100%)"],
      ["Student: 4B-07", "Student: 4B-08"],
      ["Assignment: Step 2", "Assignment: Step 3"],
      ["Time: 4:12", "Time: 3:12"],
      ["limit 5:00", "limit 10:00"],
      ["Stamp: 2026-10-17T15:04:05.123Z", "Stamp: 2026-10-17T15:04:05.124Z"],
      ["Missed: quarter", "Attempt: 2\nMissed: quarter"],
      ["Missed: quarter", "Attempt: two\nMissed: quarter"],
    ];
    expect(parseSummaries(original)[0].status).toBe("valid");
    for (const [from, to] of edits) {
      expect(parseSummaries(original.replace(from, to))[0].status, to).toBe("invalid");
    }
    // A code copied from someone else's summary does not transfer.
    const other = summary({ assignment: "Step 2", student: "Ana", correct: 4, total: 5 }).split("\n").at(-1)!;
    expect(parseSummaries(original.replace(/Code: .*/, other))[0].status).toBe("invalid");
  });

  it("accepts the student's own calendar date, but only a real one", () => {
    // 23:30 UTC is already the next day east of UTC; the code may print either date.
    const text = summary({ student: "x", correct: 1, total: 2, at: "2026-10-17T23:30:00.000Z" });
    const [, date] = /BRS-CI-(\d{6})/.exec(text)!;
    for (const shown of ["261017", "261018"]) {
      expect(parseSummaries(text.replace(`BRS-CI-${date}`, `BRS-CI-${shown}`))[0].status).toBe("valid");
    }
    expect(parseSummaries(text.replace(`BRS-CI-${date}`, "BRS-CI-261020"))[0].status).toBe("invalid");
  });

  it("says when a summary cannot be checked rather than calling it wrong", () => {
    const old = summary({ student: "x", correct: 1, total: 2 }).replace(/Stamp: .*\n/, "");
    expect(parseSummaries(old)[0].status).toBe("unchecked");
    expect(parseSummaries(old.replace(/\nCode: .*/, ""))[0].status).toBe("missing");
    const eight = old.replace("Count It — Choose", "Eight Time — Choose").replace("BRS-CI-", "BRS-ET-");
    expect(parseSummaries(eight)[0].status).toBe("other-app");
  });

  it("covers the round, the class code and the repeat note, so none of them can be edited unnoticed", () => {
    const text = summary({ assignment: "Step 2", student: "4B-07", correct: 9, total: 12, round: ROUND_A, classCode: "4B-SPRING", repeats: true });
    expect(parseSummaries(text)[0]).toMatchObject({ status: "valid", round: ROUND_A, classCode: "4B-SPRING", repeats: true });
    expect(parseSummaries(text.replace(`Round: ${ROUND_A}`, `Round: ${ROUND_B}`))[0].status).toBe("invalid");
    expect(parseSummaries(text.replace("Class: 4B-SPRING", "Class: 4C-SPRING"))[0].status).toBe("invalid");
    expect(parseSummaries(text.replace("Repeats: yes\n", ""))[0].status).toBe("invalid");
  });

  it("reads summaries from before rounds existed as they always were, with no round", () => {
    const [row] = parseSummaries(summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12 }));
    expect(row).toMatchObject({ status: "valid", round: null, classCode: null, repeats: false });
  });
});

describe("the CSV files", () => {
  const rows = parseSummaries([
    summary({ assignment: "Step 2", student: "4B-07", correct: 9, total: 12, pass: false }),
    summary({ assignment: "Step 2", student: "4b-07", correct: 11, total: 12, attempt: 2, pass: true }),
    summary({ assignment: "Step 2", student: "=HYPERLINK(\"x\")", correct: 10, total: 12 }),
    summary({ assignment: "Step 2", correct: 12, total: 12 }),
    summary({ assignment: "Step 2", student: "Ana", correct: 5, total: 12 }).replace("Score: 5/12 (42%)", "Score: 12/12 (100%)"),
  ].join("\n"));
  const group = canvasGroups(rows)[0].key;

  it("writes Canvas's import layout with the student's own ID and blank Canvas IDs", () => {
    const preview = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group, policy: "best" });
    const lines = preview.csv!.trim().split("\r\n");
    expect(lines[0]).toBe("Student,ID,SIS User ID,SIS Login ID,Section,Step 2");
    expect(lines).toContain("4b-07,,,,,11");
    expect(preview.csv).not.toContain("%");
    expect(lines).toContain(`"'=HYPERLINK(""x"")",,,,,10`);
    expect(preview).toMatchObject({ students: expect.any(Array), skipped: { noStudent: 1, codeFailed: 1, otherGroup: 0, notChosen: 1 } });
    expect(preview.students).toHaveLength(2);
  });

  it("exports only the chosen assignment's results", () => {
    const mixed = parseSummaries([
      summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12 }),
      summary({ assignment: "Step 3", student: "Ana", correct: 12, total: 12 }),
      summary({ assignment: "Step 3", student: "Ben", correct: 10, total: 12 }),
    ].join("\n"));
    const step2 = canvasGroups(mixed).find((entry) => entry.assignment === "Step 2")!.key;
    const preview = canvasPreview(mixed, { column: "Step 2", score: "correct", onlyChecked: true, group: step2, policy: "best" });
    const lines = preview.csv!.trim().split("\r\n");
    expect(lines).toEqual(["Student,ID,SIS User ID,SIS Login ID,Section,Step 2", "Ana,,,,,6"]);
    expect(preview.skipped.otherGroup).toBe(2);
  });

  it("takes the percent from the checked score, not the text beside it", () => {
    const edited = parseSummaries(
      summary({ assignment: "Step 2", student: "Ana", correct: 9, total: 12 }).replace("(75%)", "(100%)"),
    );
    expect(edited[0]).toMatchObject({ status: "valid", percent: 75 });
    const preview = canvasPreview(edited, { column: "Step 2", score: "percent", onlyChecked: true, group: canvasGroups(edited)[0].key, policy: "best" });
    expect(preview.csv).toContain("Ana,,,,,75%");
  });

  it("writes percents with the sign, and can include unchecked rows when asked", () => {
    const preview = canvasPreview(rows, { column: "", score: "percent", onlyChecked: false, group, policy: "best" });
    expect(preview.csv!.split("\r\n")[0]).toBe("Student,ID,SIS User ID,SIS Login ID,Section,Assignment");
    expect(preview.csv).toContain("Ana,,,,,100%");
    expect(preview.csv).toContain("4b-07,,,,,92%");
    expect(preview.csv).not.toMatch(/,,,,,\d+\r\n/);
  });

  it("writes the whole table, with Time only when a summary has one", () => {
    const table = summaryCsv(rows).split("\r\n");
    expect(table[0]).toBe("Student ID,Assignment,Score,Out of,Percent,Threshold met,Attempt,Finished,Code,Code check");
    expect(table[1]).toMatch(/^4B-07,Step 2,9,12,75,no,1,/);
    expect(table[1]).toMatch(/Checksum matches$/);
    expect(table[5]).toMatch(/Code does not match$/);
    expect(summaryCsv(parseSummaries(summary({ correct: 1, total: 2, timing: { elapsedSeconds: 60, limitMinutes: 5 } })))).toMatch(/Threshold met,Time,/);
  });

  it("quotes cells that need it and defuses formulas", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
  });
});

describe("Canvas: rounds, attempts and what is left out", () => {
  it("never merges two rounds that share an assignment name", () => {
    const rows = parseSummaries([
      summary({ assignment: "Step 2", round: ROUND_A, student: "Ana", correct: 6, total: 12 }),
      summary({ assignment: "Step 2", round: ROUND_B, student: "Ana", correct: 12, total: 12 }),
    ].join("\n"));
    const groups = canvasGroups(rows);
    expect(groups).toHaveLength(2);
    const first = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group: groups[0].key, policy: "best" });
    expect(first.students).toHaveLength(1);
    expect(first.csv).toContain("Ana,,,,,");
    expect(first.skipped.otherGroup).toBe(1);
  });

  it("asks for the attempt rule when the summaries cannot say what order they were made in", () => {
    const unstamped = summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12 }).replace(/Stamp: .*\n/, "");
    const rows = parseSummaries(unstamped);
    const group = canvasGroups(rows)[0].key;
    const asked = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: false, group, policy: null });
    expect(asked.ordered).toBe(false);
    expect(asked.csv).toBeNull();
    const chosen = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: false, group, policy: "best" });
    expect(chosen.csv).toContain("Ana,,,,,6");
  });

  it("uses the most recent result when asked, and says which result was left out", () => {
    const rows = parseSummaries([
      summary({ assignment: "Step 2", student: "Ana", correct: 12, total: 12, at: "2026-10-17T15:00:00.000Z" }),
      summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12, attempt: 2, at: "2026-10-18T15:00:00.000Z" }),
    ].join("\n"));
    const group = canvasGroups(rows)[0].key;
    const latest = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group, policy: "latest" });
    expect(latest.ordered).toBe(true);
    expect(latest.csv).toContain("Ana,,,,,6");
    expect(latest.students[0].left.map((row) => row.correct)).toEqual([12]);
    const best = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group, policy: "best" });
    expect(best.csv).toContain("Ana,,,,,12");
    expect(best.students[0].left.map((row) => row.attempt)).toEqual([2]);
  });

  it("writes the name the kept result was typed with", () => {
    const rows = parseSummaries([
      summary({ assignment: "Step 2", student: "4B-07", correct: 9, total: 12, at: "2026-10-17T15:00:00.000Z" }),
      summary({ assignment: "Step 2", student: "4b-07", correct: 11, total: 12, attempt: 2, at: "2026-10-18T15:00:00.000Z" }),
    ].join("\n"));
    const preview = canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group: canvasGroups(rows)[0].key, policy: "latest" });
    expect(preview.csv).toContain("4b-07,,,,,11");
  });

  it("keeps the pasted results exactly as they were, whatever the export chooses", () => {
    const text = [
      summary({ assignment: "Step 2", student: "Ana", correct: 12, total: 12 }),
      summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12, attempt: 2 }),
    ].join("\n");
    const rows = parseSummaries(text);
    const before = JSON.stringify(rows);
    canvasPreview(rows, { column: "Step 2", score: "correct", onlyChecked: true, group: canvasGroups(rows)[0].key, policy: "best" });
    expect(JSON.stringify(rows)).toBe(before);
    expect(rows).toHaveLength(2);
  });

  it("lists older summaries as their own group, after the rounds the app can check", () => {
    const rows = parseSummaries([
      summary({ assignment: "Step 2", student: "Ana", correct: 6, total: 12 }),
      summary({ assignment: "Step 2", round: ROUND_A, student: "Ben", correct: 7, total: 12 }),
    ].join("\n"));
    const groups = canvasGroups(rows);
    expect(groups[0]).toMatchObject({ round: ROUND_A, results: 1 });
    expect(groups[1]).toMatchObject({ round: null, results: 1 });
  });
});
