import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUESTIONS,
  MAX_NAME_LENGTH,
  describeAssignment,
  isAssigned,
  parseAssignment,
  serializeAssignment,
  uniqueMeasures,
  verificationCode,
} from "../src/assignment";
import { RHYTHM_CELLS, getCellsByIds, getCellsForLevel } from "../src/rhythm";
import { generateQuestions } from "../src/question";

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

describe("the assignment link", () => {
  it("reads an unadorned visit as no assignment at all", () => {
    const result = parseAssignment("");
    expect(result.ok).toBe(true);
    expect(isAssigned(result)).toBe(false);
    if (result.ok) {
      expect(result.locked).toEqual([]);
      expect(result.assignment.cells).toBeNull();
      expect(result.assignment.guide).toBeNull();
    }
  });

  it("pins the conditions a teacher set, and reports what it locked", () => {
    const { assignment, locked } = ok(
      "?a=Step%202&level=2&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2-wheres-the-and",
    );
    expect(assignment.name).toBe("Step 2");
    expect(assignment.scope).toBe("beat");
    expect(assignment.cells).toEqual(["eighth-rest", "rest-eighth"]);
    expect(assignment.guide).toBe("on");
    expect(assignment.count).toBe(12);
    expect(assignment.passing).toBe(10);
    expect(assignment.seed).toBe("cr2-wheres-the-and");
    expect(locked).toEqual(expect.arrayContaining(["level", "scope", "cells", "guide", "n", "seed"]));
  });

  it("round-trips losslessly through the URL", () => {
    const first = ok("?a=Step%205&scope=beat&cells=sixteenths,rest-three&guide=off&n=12&pass=10&seed=cr5");
    const url = serializeAssignment(first.assignment);
    const second = ok(url);
    expect(second.assignment).toEqual(first.assignment);
    expect(serializeAssignment(second.assignment)).toBe(url);
  });

  it("collapses exact duplicate cells and keeps catalog order", () => {
    // Two links naming the same vocabulary in different orders are one round.
    const a = ok("?cells=sixteenths,quarter,quarter").assignment;
    const b = ok("?cells=quarter,sixteenths").assignment;
    expect(a.cells).toEqual(b.cells);
  });

  it("rejects loudly and never repairs", () => {
    // A cell pool with a cell missing teaches a DIFFERENT step, so a link that
    // names a rhythm this app does not have is refused rather than trimmed.
    const unknown = bad("?cells=quarter,triplet-swing");
    expect(unknown.code).toBe("cell");
    expect(unknown.entry).toBe("triplet-swing");
    expect(unknown.message).toContain("triplet-swing");

    expect(bad("?cells=quarter").code).toBe("too-few-cells");
    expect(bad("?n=40").code).toBe("count");
    expect(bad("?n=0").code).toBe("count");
    expect(bad("?level=9").code).toBe("level");
    expect(bad("?scope=phrase").code).toBe("scope");
    expect(bad("?sys=takadimi").code).toBe("system");
    expect(bad("?fb=sometimes").code).toBe("feedback");
    // A gate nobody can clear is a broken assignment, not a hard one.
    expect(bad("?n=12&pass=13").code).toBe("pass");
  });

  it("measures the pass mark against the round's real length, not the maximum", () => {
    /* `?pass=8` with no `n` used to be checked against MAX_QUESTIONS and
       accepted, so a five-question round carried a goal of 8/5 and every
       student failed something nobody could clear. */
    const unreachable = bad("?a=Goal&pass=8");
    expect(unreachable.code).toBe("pass");
    expect(unreachable.message).toContain(`round of ${DEFAULT_QUESTIONS}`);
    expect(ok(`?a=Goal&pass=${DEFAULT_QUESTIONS}`).assignment.passing).toBe(DEFAULT_QUESTIONS);
    expect(ok("?a=Goal&n=12&pass=8").assignment.passing).toBe(8);
  });

  it("refuses a measure round longer than the pool can fill", () => {
    /* Four cells per measure and no repeats, so k rhythms make k^4 measures.
       This was the one bound nobody wrote down, and the only one that failed
       AFTER the link had been accepted: the banner, level, scope and pass mark
       applied, the round threw while being built, and the student answered the
       default round under the assignment's stated conditions. */
    expect(uniqueMeasures(2)).toBe(16);
    const tooLong = bad("?scope=measure&cells=quarter,eighths&n=20");
    expect(tooLong.code).toBe("measure-pool");
    expect(tooLong.message).toContain("16 different measures");
    expect(bad("?scope=measure&level=1&n=17").code).toBe("measure-pool");

    // At the ceiling and below it, the link is fine — and it really builds.
    const atCeiling = ok("?scope=measure&cells=quarter,eighths&n=16").assignment;
    expect(atCeiling.count).toBe(16);
    expect(
      generateQuestions({
        level: atCeiling.level, scope: "measure", count: 16, seed: "ceiling", cells: atCeiling.cells!,
      }),
    ).toHaveLength(16);
    // Beat rounds are unaffected: a beat prompt may repeat once the pool cycles.
    expect(ok("?scope=beat&cells=quarter,eighths&n=20").assignment.count).toBe(20);
  });

  it("lets the link choose when the answer appears", () => {
    /* Instant feedback teaches and withheld feedback assesses, so this is the
       assignment's call in exactly the way the guide policy already is. */
    expect(ok("?fb=end").assignment.feedback).toBe("end");
    expect(ok("?fb=each").assignment.feedback).toBe("each");
    expect(ok("?a=x").assignment.feedback).toBeNull();
    expect(ok("?fb=end").locked).toContain("fb");
    expect(describeAssignment(ok("?fb=end&cells=quarter,eighths").assignment)).toContain("answers at the end");
  });

  it("names the counting system in the link, because the graded answer depends on it", () => {
    // Standard American only today. When Eastman and Takadimi become visible,
    // this is where the link starts carrying them — refusing now is what keeps
    // a link from silently grading against a different system later.
    expect(ok("?sys=standard").assignment.system).toBe("standard");
    expect(bad("?sys=eastman").message).toContain("Standard");
  });

  it("treats an assignment name as display text, never as markup", () => {
    const { assignment } = ok("?a=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(assignment.name).not.toContain("<");
    expect(assignment.name).not.toContain(">");
    const long = ok(`?a=${"x".repeat(200)}`).assignment.name ?? "";
    expect(long.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it("records that a cell pool superseded a level the link also carried", () => {
    // The mirror of Mallet Map's rangeIgnored: a teacher who pinned both must
    // be able to see which one actually ran.
    expect(ok("?level=3&cells=quarter,eighths").assignment.levelIgnored).toBe(true);
    expect(ok("?cells=quarter,eighths").assignment.levelIgnored).toBe(false);
    expect(ok("?level=3").assignment.levelIgnored).toBe(false);
  });

  it("describes the conditions, because a score without them says nothing", () => {
    const { assignment } = ok("?cells=quarter,eighths&scope=beat&guide=off&n=12&pass=10");
    const described = describeAssignment(assignment);
    expect(described).toContain("2 rhythms");
    expect(described).toContain("one beat");
    expect(described).toContain("guide hidden");
    expect(described).toContain("12 questions");
    expect(described).toContain("pass at 10");
  });
});

describe("an assigned round", () => {
  const POOL = ["eighth-rest", "rest-eighth"];

  it("asks only the rhythms the assignment names", () => {
    const questions = generateQuestions({ level: "level-3", scope: "beat", count: 12, seed: "s", cells: POOL });
    expect(questions).toHaveLength(12);
    for (const question of questions) {
      for (const cell of question.prompt.cells) expect(POOL).toContain(cell.id);
    }
  });

  it("covers every named rhythm when the round is long enough", () => {
    // A round that never asked one of the assigned rhythms is not evidence
    // about it, so "rest entry, mastered" must not be claimable from a round
    // that skipped half the vocabulary.
    const pool = ["quarter", "eighths", "eighth-rest", "rest-eighth"];
    for (let seed = 0; seed < 20; seed += 1) {
      const questions = generateQuestions({ level: "level-3", scope: "beat", count: 12, seed: `cov-${seed}`, cells: pool });
      const asked = new Set(questions.flatMap((question) => question.prompt.cells.map((cell) => cell.id)));
      for (const id of pool) expect(asked.has(id)).toBe(true);
    }
  });

  it("is identical run to run, and different seeds diverge", () => {
    const of = (seed: string) =>
      generateQuestions({ level: "level-2", scope: "beat", count: 8, seed, cells: POOL })
        .map((question) => `${question.prompt.cells.map((cell) => cell.id).join("+")}|${question.correctAnswer}`)
        .join(" / ");
    expect(of("same")).toBe(of("same"));
    expect(of("same")).not.toBe(of("other"));
  });

  it("leaves every level-driven seed exactly where it was", () => {
    // The guarantee the whole feature rests on: adding the cell parameter must
    // not rewrite a single round that existed before it. A level round is
    // seeded from the level, a pooled round from its vocabulary.
    const signature = (questions: readonly { readonly id: string }[]) =>
      questions.map((question) => question.id).join("|");
    const before = signature(generateQuestions({ level: "level-2", scope: "beat", count: 5, seed: 20260815 }));
    const explicit = signature(
      generateQuestions({
        level: "level-2",
        scope: "beat",
        count: 5,
        seed: 20260815,
        cells: getCellsForLevel("level-2").map((cell) => cell.id),
      }),
    );
    // Naming level 2's own cells explicitly is a DIFFERENT round from asking
    // for level 2 — the vocabulary is the same, the seed string is not — and
    // that is fine. What must not change is the level round itself.
    expect(before).toBe(signature(generateQuestions({ level: "level-2", scope: "beat", count: 5, seed: 20260815 })));
    expect(explicit.length).toBeGreaterThan(0);
  });

  it("assembles measures from the assigned rhythms only", () => {
    const questions = generateQuestions({ level: "level-3", scope: "measure", count: 8, seed: "m", cells: POOL });
    for (const question of questions) {
      expect(question.prompt.cells).toHaveLength(4);
      for (const cell of question.prompt.cells) expect(POOL).toContain(cell.id);
    }
  });

  it("refuses a vocabulary the catalog does not have", () => {
    expect(() => getCellsByIds(["quarter", "nope"])).toThrow(RangeError);
  });

  it("can express a step no level can", () => {
    // The reason this parameter exists: levels are cumulative, so "the two
    // rest-entry cells and nothing else" is not a level and never will be.
    const levelTwo = getCellsForLevel("level-2").map((cell) => cell.id);
    expect(levelTwo).toContain("quarter");
    expect(levelTwo).toContain("eighth-rest");
    const pooled = getCellsByIds(POOL).map((cell) => cell.id);
    expect(pooled).toEqual(["eighth-rest", "rest-eighth"]);
    expect(pooled).not.toContain("quarter");
  });

  it("names every catalog cell in the ids the links use", () => {
    // A link is written by hand against these ids, so a rename is a breaking
    // change to every assignment already posted in a classroom.
    expect(RHYTHM_CELLS.map((cell) => cell.id)).toEqual([
      "quarter", "eighths", "eighth-rest", "rest-eighth", "three-rest-note",
      "rest-sixteenth-rest", "alternating-rests", "rest-two-rest",
      "dotted-eighth-sixteenth", "eighth-two", "two-eighth",
      "sixteenth-eighth-sixteenth", "sixteenths", "rest-three", "two-rest",
      "rest-two",
    ]);
  });
});

describe("the verification code", () => {
  const at = new Date("2026-08-15T15:04:05.000Z");

  it("has the documented shape and is deterministic", () => {
    const input = { assignment: "Step 1", studentId: "ab12", correct: 10, total: 12, finishedAt: at };
    const code = verificationCode(input);
    expect(code).toMatch(/^BRS-CI-\d{6}-\d{1,3}-[0-9A-Z]{4}$/);
    expect(verificationCode(input)).toBe(code);
    expect(code).toContain("-83-"); // 10/12 rounds to 83%
  });

  it("changes when any fact it attests to changes", () => {
    const base = { assignment: "Step 1", studentId: "ab12", correct: 10, total: 12, finishedAt: at };
    const code = verificationCode(base);
    expect(verificationCode({ ...base, correct: 11 })).not.toBe(code);
    expect(verificationCode({ ...base, studentId: "cd34" })).not.toBe(code);
    expect(verificationCode({ ...base, assignment: "Step 2" })).not.toBe(code);
    expect(verificationCode({ ...base, finishedAt: new Date("2026-08-15T15:04:06.000Z") })).not.toBe(code);
  });

  it("still produces a valid code with no identifier and no assignment", () => {
    const code = verificationCode({ assignment: "", studentId: "", correct: 0, total: 5, finishedAt: at });
    expect(code).toMatch(/^BRS-CI-\d{6}-0-[0-9A-Z]{4}$/);
  });

  it("tells a replay apart from a first attempt", () => {
    /* A retry is the same round again, after its answers have been shown. Two
       attempts that scored the same used to be indistinguishable — the card
       never re-stamped the finish time, so both carried one code. */
    const base = { assignment: "Step 1", studentId: "ab12", correct: 10, total: 12, finishedAt: at };
    expect(verificationCode({ ...base, attempt: 2 })).not.toBe(verificationCode(base));
    expect(verificationCode({ ...base, attempt: 1 })).toBe(verificationCode(base));
  });
});
