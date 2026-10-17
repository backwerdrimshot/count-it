import { describe, expect, it } from "vitest";
import { verificationCode } from "../src/assignment";
import { canvasCsv, csvCell, parseSummaries, stampLine, summaryCsv } from "../src/class-summary";
import { timeTicketLine } from "../src/time-limit";

/* A summary laid out the way the result card writes it, with its real code. */
function summary(options: {
  assignment?: string; student?: string; correct: number; total: number; attempt?: number;
  at?: string; pass?: boolean; timing?: { elapsedSeconds: number; limitMinutes: number };
}): string {
  const at = new Date(options.at ?? "2026-10-17T15:04:05.123Z");
  const code = verificationCode({
    assignment: options.assignment ?? "", studentId: options.student ?? "", correct: options.correct,
    total: options.total, finishedAt: at, attempt: options.attempt ?? 1,
    ...(options.timing ? { timing: options.timing } : {}),
  });
  return [
    "Count It — Choose the Count",
    options.assignment ? `Assignment: ${options.assignment}` : "Practice session",
    options.student ? `Student: ${options.student}` : null,
    `Score: ${options.correct}/${options.total} (${Math.round((options.correct / options.total) * 100)}%)`,
    (options.attempt ?? 1) > 1 ? `Attempt: ${options.attempt}` : null,
    "Conditions: Level 1 · one beat · 5 questions",
    options.timing ? timeTicketLine(options.timing.elapsedSeconds, options.timing.limitMinutes) : null,
    options.pass === undefined ? null : `Result: ${options.pass ? "met the goal" : "not yet at the goal"}`,
    "Missed: quarter, eighths",
    `Finished: ${at.toLocaleString()}`,
    stampLine(at),
    `Code: ${code}`,
  ].filter(Boolean).join("\n");
}

describe("reading pasted summaries", () => {
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
});

describe("the CSV files", () => {
  const rows = parseSummaries([
    summary({ assignment: "Step 2", student: "4B-07", correct: 9, total: 12, pass: false }),
    summary({ assignment: "Step 2", student: "4b-07", correct: 11, total: 12, attempt: 2, pass: true }),
    summary({ assignment: "Step 2", student: "=HYPERLINK(\"x\")", correct: 10, total: 12 }),
    summary({ assignment: "Step 2", correct: 12, total: 12 }),
    summary({ assignment: "Step 2", student: "Ana", correct: 5, total: 12 }).replace("Score: 5/12 (42%)", "Score: 12/12 (100%)"),
  ].join("\n"));

  it("writes Canvas's import layout with the student's own ID and blank Canvas IDs", () => {
    const result = canvasCsv(rows, { column: "Step 2", score: "correct", onlyChecked: true });
    const lines = result.csv.trim().split("\r\n");
    expect(lines[0]).toBe("Student,ID,SIS User ID,Section,Step 2");
    expect(lines).toContain("4b-07,,,,11");
    expect(lines).toContain(`"'=HYPERLINK(""x"")",,,,10`);
    expect(result).toMatchObject({ included: 2, skipped: { noStudent: 1, codeFailed: 1, duplicates: 1 } });
  });

  it("can hold percents, and can include unchecked rows when asked", () => {
    const result = canvasCsv(rows, { column: "", score: "percent", onlyChecked: false });
    expect(result.csv.split("\r\n")[0]).toBe("Student,ID,SIS User ID,Section,Assignment");
    expect(result.csv).toContain("Ana,,,,100");
    expect(result.csv).toContain("4b-07,,,,92");
  });

  it("writes the whole table, with Time only when a summary has one", () => {
    const table = summaryCsv(rows).split("\r\n");
    expect(table[0]).toBe("Student ID,Assignment,Score,Out of,Percent,Threshold met,Attempt,Finished,Code,Code check");
    expect(table[1]).toMatch(/^4B-07,Step 2,9,12,75,no,1,/);
    expect(table[1]).toMatch(/Code checks$/);
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
