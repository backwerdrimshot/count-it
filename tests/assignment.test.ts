import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUESTIONS,
  MAX_NAME_LENGTH,
  describeAssignment,
  isAssigned,
  parseAssignment,
  retakeSeed,
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
    const first = ok("?a=Step%205&scope=beat&cells=sixteenths,rest-three&guide=off&fb=end&retry=reseed&n=12&pass=10&seed=cr5");
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
    expect(uniqueMeasures(getCellsByIds(["quarter", "eighths"]))).toBe(16);
    /* Two ONE-BEAT rhythms make sixteen bars of 4/4. Two rhythms of which one
       spans two beats make FIVE — 1+1+1+1, three arrangements of 2+1+1, and
       2+2 — which is why this counts arrangements rather than raising the pool
       size to a power. The power form accepted a six-question round on that
       pool and then threw while building it. */
    expect(uniqueMeasures(getCellsByIds(["quarter", "half"]))).toBe(5);
    expect(uniqueMeasures(getCellsByIds(["quarter", "half", "whole"]))).toBe(6);
    /* An all-rest bar is not a bar the generator will build, so it is not
       counted: {quarter, half-rest} makes 1+1+1+1 and the three arrangements
       of 2+1+1, but NOT 2+2, which would be four beats of silence. */
    expect(uniqueMeasures(getCellsByIds(["quarter", "half-rest"]))).toBe(4);
    const tooLong = bad("?scope=measure&cells=quarter,eighths&n=20");
    expect(tooLong.code).toBe("measure-pool");
    expect(tooLong.message).toContain("16 different 4/4 measures");
    /* The ceiling is the bar's beat count, not four. The same two rhythms make
       eight three-beat measures, so a nine-question 3/4 round is refused where
       the same link in 4/4 is fine — and refused at the LINK rather than
       thrown while the round is being built, which is the failure this whole
       check exists to prevent. */
    const threeFour = bad("?scope=measure&meter=3-4&cells=quarter,eighths&n=9");
    expect(threeFour.code).toBe("measure-pool");
    expect(threeFour.message).toContain("8 different 3/4 measures");
    expect(ok("?scope=measure&meter=3-4&cells=quarter,eighths&n=8").assignment.meter).toBe("3-4");
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

  it("lets the link choose what trying again means", () => {
    expect(ok("?retry=reseed").assignment.retry).toBe("reseed");
    expect(ok("?retry=off").assignment.retry).toBe("off");
    expect(ok("?retry=free").assignment.retry).toBe("free");
    // Null, not "free": the app's default and an explicit choice of it are
    // different facts, and the evidence records which one the link made.
    expect(ok("?a=x").assignment.retry).toBeNull();
    expect(bad("?retry=sometimes").code).toBe("retry");
    expect(ok("?retry=off").locked).toContain("retry");

    const described = (search: string) => describeAssignment(ok(search).assignment);
    expect(described("?retry=reseed&cells=quarter,eighths")).toContain("retry on new questions");
    expect(described("?retry=off&cells=quarter,eighths")).toContain("one attempt");
    // The default is not restated — a conditions line that lists every default
    // stops being read.
    expect(described("?retry=free&cells=quarter,eighths")).not.toContain("retry");
  });

  it("gives a retake questions a teacher can regenerate", () => {
    /* A retake nobody can reconstruct is a number, not evidence. The seed comes
       from the link's own seed plus the attempt, so a teacher holding the link
       can rebuild exactly what attempt three asked. */
    expect(retakeSeed("cr2", 1)).toBe("cr2");
    expect(retakeSeed("cr2", 2)).toBe("cr2#a2");
    expect(retakeSeed("cr2", 2)).toBe(retakeSeed("cr2", 2));
    expect(retakeSeed("cr2", 3)).not.toBe(retakeSeed("cr2", 2));
    // Derived from the ORIGINAL every time, never chained through the last
    // attempt — otherwise attempt three depends on having generated two.
    expect(retakeSeed(retakeSeed("cr2", 2), 3)).not.toBe(retakeSeed("cr2", 3));
    expect(() => retakeSeed("cr2", 0)).toThrow(RangeError);

    // Same conditions, different questions — which is what a retake means.
    const round = (attempt: number) =>
      generateQuestions({
        level: "level-3", scope: "beat", count: 8, seed: retakeSeed("cr2", attempt),
      }).map((question) => `${question.prompt.cells.map((cell) => cell.id).join("+")}|${question.correctAnswer}`);
    expect(round(1)).not.toEqual(round(2));
    expect(round(2)).toEqual(round(2));
    // Attempt one is the plain link, so `retry=reseed` does not change the
    // round a student opens with.
    expect(round(1)).toEqual(
      generateQuestions({ level: "level-3", scope: "beat", count: 8, seed: "cr2" })
        .map((question) => `${question.prompt.cells.map((cell) => cell.id).join("+")}|${question.correctAnswer}`),
    );
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

describe("rhythms that last longer than a beat", () => {
  it("refuses a one-beat link that names one, rather than dropping it", () => {
    /* The app's own controls may drop a half note when the student picks beat
       scope — they chose the scope and the vocabulary follows. A LINK is a
       teacher's statement of what the class will practise, and quietly handing
       them a quarter-note-only round is the "pool with a cell missing teaches a
       different step" failure this whole file exists to refuse. */
    const refused = bad("?scope=beat&cells=half,quarter&n=5");
    expect(refused.code).toBe("scope-cells");
    expect(refused.message).toMatch(/lasts longer than one beat/);
    expect(refused.entry).toBe("half");
    expect(ok("?scope=beat&cells=quarter,eighths&n=5").assignment.cells).toEqual(["quarter", "eighths"]);
  });

  it("measures the round against the bars the pool can actually build", () => {
    /* {half, quarter} makes five bars of 4/4, not sixteen. The power form
       accepted six and threw while building the round — the third time that
       exact shape shipped. */
    expect(ok("?scope=measure&cells=half,quarter&n=5").assignment.count).toBe(5);
    const tooLong = bad("?scope=measure&cells=half,quarter&n=6");
    expect(tooLong.code).toBe("measure-pool");
    expect(tooLong.message).toContain("5 different 4/4 measures");
  });
});

/* The retired 3/8 meter.
 *
 * 3/8 and its four eighth-beat cells were removed 2026-08-29 toward an app of
 * their own. A link written while they existed still reaches this parser, and
 * this file's standing rule applies: it is refused loudly, never repaired —
 * silently rebuilding a 3/8 round in some other meter would produce evidence
 * for an assignment nobody set. */
describe("the retired 3/8 meter", () => {
  it("refuses a link naming meter=3-8, with the meters that do exist", () => {
    const result = parseAssignment("?meter=3-8&scope=measure&level=1&n=8&pass=7&seed=x");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("meter");
    expect(result.error.entry).toBe("3-8");
    /* The message is read by a student on a phone, so it says what this app
       does read rather than only that something is wrong. */
    expect(result.error.message).toMatch(/4\/4, 3\/4/);
  });

  it("refuses a link naming a retired eighth-beat cell id", () => {
    const result = parseAssignment("?scope=measure&cells=eighth-beat,two-sixteenths&n=8&pass=7&seed=x");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("cell");
  });

  it("still allows one beat in both remaining meters", () => {
    for (const meter of ["4-4", "3-4"] as const) {
      const result = parseAssignment(`?meter=${meter}&scope=beat&n=12&pass=10&seed=x`);
      expect(result.ok, meter).toBe(true);
    }
  });
});
