import { describe, expect, it } from "vitest";
import {
  describeAssignment,
  isAssigned,
  parseAssignment,
  serializeAssignment,
  verificationCode,
} from "../src/assignment";
import { evaluateBuilder, buildQuery, defaultBuilderState, type BuilderState } from "../src/assignment/builder";
import { CATALOG_ENTRIES } from "../src/assignment/catalog";
import { createPraxisEvidenceResult } from "../src/result";
import { advanceSession, answerSession, createSession, generateQuestions } from "../src/question";
import {
  MAX_TIME_LIMIT,
  MIN_TIME_LIMIT,
  elapsedSeconds,
  formatClock,
  timeResultText,
  timeTicketLine,
  timerAnnouncement,
  timerDisplay,
  withinLimit,
} from "../src/time-limit";

/* The time limit is recorded, never enforced. These tests hold the three
 * places it surfaces — the link, the countdown, the ticket line — to that. */

function ok(search: string) {
  const result = parseAssignment(search);
  if (!result.ok) throw new Error(`expected a valid link, got: ${result.error.message}`);
  return result;
}

function bad(search: string) {
  const result = parseAssignment(search);
  if (result.ok) throw new Error("expected an invalid link");
  return result.error;
}

describe("the time parameter", () => {
  it("is absent from every link that does not name it", () => {
    const old = ok("?a=Step%202&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2");
    expect(old.assignment.timeLimit).toBeNull();
    expect(old.locked).not.toContain("time");
    // An old link serializes exactly as it did, so its attempt tally is not orphaned.
    expect(serializeAssignment(old.assignment)).not.toContain("time=");
    expect(describeAssignment(old.assignment)).not.toMatch(/time limit/);
  });

  it("reads whole minutes in range", () => {
    expect(ok("?time=5").assignment.timeLimit).toBe(5);
    expect(ok(`?time=${MIN_TIME_LIMIT}`).assignment.timeLimit).toBe(1);
    expect(ok(`?time=${MAX_TIME_LIMIT}`).assignment.timeLimit).toBe(60);
    expect(ok("?time=5").locked).toContain("time");
    // A time limit alone is a teacher's setting, so the app is in assignment mode.
    expect(isAssigned(parseAssignment("?time=5"))).toBe(true);
  });

  it("rejects anything else the way other numbers are rejected", () => {
    for (const raw of ["0", "61", "90", "2.5", "-3", "five", "", "1000"]) {
      const error = bad(`?scope=beat&time=${encodeURIComponent(raw)}`);
      expect(error.code).toBe("time");
      expect(error.entry).toBe(raw);
      expect(error.message).toMatch(/whole number of minutes, 1–60/);
    }
  });

  it("round-trips through the canonical link, after the pass mark", () => {
    const link = "?a=Quiz&level=2&scope=beat&n=10&pass=8&time=5&seed=abc";
    const parsed = ok(link).assignment;
    expect(serializeAssignment(parsed)).toBe(link);
    expect(ok(serializeAssignment(parsed)).assignment).toEqual(parsed);
  });

  it("is stated in the conditions line", () => {
    expect(describeAssignment(ok("?level=2&scope=beat&n=10&pass=8&time=5").assignment))
      .toBe("Eighth placement · one beat · 10 questions · pass at 8 · 5-minute time limit");
  });
});

describe("the clock", () => {
  it("formats as m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(7)).toBe("0:07");
    expect(formatClock(252)).toBe("4:12");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(3600)).toBe("60:00");
    expect(formatClock(59.9)).toBe("0:59");
    expect(formatClock(-4)).toBe("0:00");
  });

  it("counts whole elapsed seconds, never negative", () => {
    expect(elapsedSeconds(1_000, 1_999)).toBe(0);
    expect(elapsedSeconds(1_000, 253_000)).toBe(252);
    expect(elapsedSeconds(5_000, 1_000)).toBe(0);
  });

  it("counts down, then on into overtime instead of stopping", () => {
    expect(timerDisplay(0, 5)).toEqual({ over: false, text: "5:00" });
    expect(timerDisplay(48, 5)).toEqual({ over: false, text: "4:12" });
    expect(timerDisplay(300, 5)).toEqual({ over: false, text: "0:00" });
    expect(timerDisplay(342, 5)).toEqual({ over: true, text: "+0:42 over" });
    expect(timerDisplay(390, 5)).toEqual({ over: true, text: "+1:30 over" });
  });

  it("gives screen readers a line that changes at most once a minute", () => {
    // Sample every second of an eight-minute run against a five-minute limit.
    const lines: string[] = [];
    for (let second = 0; second <= 480; second += 1) {
      const line = timerAnnouncement(second, 5);
      if (lines.at(-1) !== line) lines.push(line);
    }
    expect(lines).toEqual([
      "5 minutes left.",
      "4 minutes left.",
      "3 minutes left.",
      "2 minutes left.",
      "1 minute left.",
      "Time limit reached. Keep going — you can still finish.",
      "1 minute over the time limit. You can still finish.",
      "2 minutes over the time limit. You can still finish.",
      "3 minutes over the time limit. You can still finish.",
    ]);
    // Never more changes than minutes elapsed, plus the opening line.
    expect(lines.length).toBeLessThanOrEqual(480 / 60 + 1);
  });
});

describe("the ticket line", () => {
  it("says the time, the limit and the verdict in plain words", () => {
    expect(timeTicketLine(252, 5)).toBe("Time: 4:12 (limit 5:00, within limit)");
    expect(timeTicketLine(390, 5)).toBe("Time: 6:30 (limit 5:00, over by 1:30)");
    expect(timeResultText(390, 5)).toBe("6:30 (limit 5:00, over by 1:30)");
  });

  it("counts finishing exactly on the limit as within it", () => {
    expect(withinLimit(300, 5)).toBe(true);
    expect(withinLimit(301, 5)).toBe(false);
    expect(timeTicketLine(300, 5)).toBe("Time: 5:00 (limit 5:00, within limit)");
    expect(timeTicketLine(301, 5)).toBe("Time: 5:01 (limit 5:00, over by 0:01)");
  });

  it("is covered by the verification code, with the limit, only when a limit was set", () => {
    const base = {
      assignment: "Quiz",
      studentId: "ab12",
      correct: 8,
      total: 10,
      finishedAt: new Date("2026-10-17T15:04:05.000Z"),
    };
    const timed = verificationCode({ ...base, timing: { elapsedSeconds: 252, limitMinutes: 5 } });
    expect(timed).toMatch(/^BRS-CI-\d{6}-80-[0-9A-Z]{4}$/);
    expect(verificationCode({ ...base, timing: { elapsedSeconds: 252, limitMinutes: 5 } })).toBe(timed);
    expect(verificationCode({ ...base, timing: { elapsedSeconds: 390, limitMinutes: 5 } })).not.toBe(timed);
    expect(verificationCode({ ...base, timing: { elapsedSeconds: 252, limitMinutes: 10 } })).not.toBe(timed);
    // A card without a limit gets exactly the code it always did.
    expect(verificationCode(base)).not.toBe(timed);
    expect(verificationCode({ ...base, timing: undefined })).toBe(verificationCode(base));
  });

  it("travels in the result's settings without changing the score", () => {
    const { assignment } = ok("?scope=beat&cells=quarter,eighths&n=3&time=5&seed=cr1");
    let session = createSession(generateQuestions({ level: "level-1", scope: "beat", seed: "cr1", count: 3, cells: assignment.cells! }));
    for (let index = 0; index < 3; index += 1) {
      const question = session.questions[session.currentIndex];
      session = answerSession(session, question.choices.find((choice) => choice.isCorrect)!.id);
      session = advanceSession(session);
    }
    const result = createPraxisEvidenceResult({
      session, assignment, sequenceStep: null, level: "level-1", scope: "beat", finishedAt: new Date("2026-10-17T00:00:00Z"),
    });
    expect(result.settings.time).toBe("5");
    expect(result.conditions.stated).toContain("5-minute time limit");
    expect(result.notMeasured).toContain("speed");
  });
});

describe("the builder and the catalog", () => {
  const base: BuilderState = { ...defaultBuilderState("abc123") };

  it("writes time= only when a limit is set, after pass", () => {
    expect(buildQuery(base)).not.toContain("time=");
    expect(buildQuery({ ...base, timeLimit: null })).not.toContain("time=");
    expect(buildQuery({ ...base, timeLimit: 5 })).toMatch(/&pass=8&time=5&seed=abc123$/);
  });

  it("shows the limit in the summary and explains it in a note", () => {
    const result = evaluateBuilder({ ...base, timeLimit: 5 });
    if (!result.ok) throw new Error(result.problem);
    expect(result.summary).toContain("5-minute time limit");
    expect(result.assignment.timeLimit).toBe(5);
    expect(result.notes.join(" ")).toMatch(/keeps counting as overtime and they can still finish/);
  });

  it("refuses a fractional or out-of-range limit in words", () => {
    const fraction = evaluateBuilder({ ...base, timeLimit: 2.5 });
    expect(fraction.ok).toBe(false);
    if (!fraction.ok) expect(fraction.problem).toMatch(/whole number of minutes/);
    const tooLong = evaluateBuilder({ ...base, timeLimit: 90 });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.problem).toMatch(/1–60/);
  });

  it("leaves the published catalog untouched — no step sets a limit", () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(entry.query).not.toContain("time=");
      expect(entry.summary).not.toMatch(/time limit/);
    }
  });
});
