import { describe, expect, it } from "vitest";
import { parseAssignment } from "../src/assignment";
import {
  BUILDER_CELLS,
  BUILDER_LEVELS,
  BUILDER_METERS,
  PRODUCTION_ORIGIN,
  SEED_PATTERN,
  buildQuery,
  cellsForLevel,
  defaultBuilderState,
  evaluateBuilder,
  makeSeed,
  type BuilderState,
  type Vocabulary,
} from "../src/assignment/builder";
import { generateQuestions } from "../src/question";
import { ALL_RHYTHM_CELLS, METER_IDS, type MeterId } from "../src/rhythm";

/* The builder writes the link a teacher posts, and every rule that says whether
 * that link is good lives in the parser the student's browser runs. These tests
 * hold the one promise that makes the form worth having: a link the builder
 * calls valid is a link the app can play, and a link it refuses is refused in
 * the app's own words. */

const blank: BuilderState = {
  name: "",
  vocabulary: { kind: "student" },
  scope: null,
  meter: null,
  guide: null,
  feedback: null,
  retry: null,
  count: null,
  passing: null,
  seed: "",
};

function ok(state: BuilderState) {
  const result = evaluateBuilder(state);
  if (!result.ok) throw new Error(`expected a valid link, got: ${result.problem}`);
  return result;
}

describe("what the builder writes", () => {
  it("writes nothing for a form where nothing is pinned", () => {
    expect(buildQuery(blank)).toBe("");
    const result = ok(blank);
    expect(result.link).toBe(`${PRODUCTION_ORIGIN}/`);
    expect(result.summary).toMatch(/nothing pinned/i);
  });

  it("writes only what was pinned, so an unpinned control stays the student's", () => {
    expect(buildQuery({ ...blank, meter: "5-4" })).toBe("?meter=5-4");
    /* Only the meter is locked. The app's canonical form always writes `scope=`,
       which would quietly pin a control the teacher left open — so the builder
       does not use it. */
    expect(parsedLocks("?meter=5-4")).toEqual(["meter"]);
    expect(ok({ ...blank, meter: "5-4" }).assignment.meter).toBe("5-4");
  });

  it("writes the full default assignment in the app's own parameter order", () => {
    const state = { ...defaultBuilderState("k7m2xq"), name: "Warm-up" };
    expect(buildQuery(state)).toBe(
      "?a=Warm-up&level=2&scope=beat&meter=4-4&guide=on&n=10&pass=8&seed=k7m2xq",
    );
    const result = ok(state);
    expect(result.link).toBe(`${PRODUCTION_ORIGIN}/${buildQuery(state)}`);
    expect(result.assignment.count).toBe(10);
    expect(result.assignment.passing).toBe(8);
    expect(result.assignment.seed).toBe("k7m2xq");
  });

  it("puts the rhythms in catalog order however they were ticked", () => {
    const forward = buildQuery({ ...blank, vocabulary: { kind: "cells", cells: ["quarter", "eighths", "half"] } });
    const backward = buildQuery({ ...blank, vocabulary: { kind: "cells", cells: ["half", "eighths", "quarter"] } });
    expect(forward).toBe(backward);
    expect(forward).toBe("?cells=quarter,eighths,half");
  });

  it("encodes a name so it survives the URL and reads back the same", () => {
    const name = "Step 2: Where's the &? 100% — 3/4";
    const result = ok({ ...blank, name });
    expect(result.query).not.toContain("&?");
    expect(result.assignment.name).toBe(name);
    expect(parseAssignment(result.query).ok).toBe(true);
  });

  it("uses a link origin that is passed in, so it works wherever the page is served", () => {
    const result = evaluateBuilder({ ...blank, meter: "2-4" }, "http://localhost:3000/");
    expect(result.ok && result.link).toBe("http://localhost:3000/?meter=2-4");
  });
});

/* The locks the parser reports for a query. */
function parsedLocks(query: string): readonly string[] {
  const parsed = parseAssignment(query);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.locked;
}

describe("what the builder refuses, in the app's own words", () => {
  it("refuses a rhythm the bar cannot hold, as the student's link would", () => {
    const result = evaluateBuilder({
      ...blank,
      scope: "measure",
      meter: "3-4",
      vocabulary: { kind: "cells", cells: ["whole", "quarter", "eighths"] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toMatch(/longer than a 3\/4 measure/);
  });

  it("refuses a long note in a one-beat round", () => {
    const result = evaluateBuilder({
      ...blank,
      scope: "beat",
      vocabulary: { kind: "cells", cells: ["half", "quarter"] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toMatch(/longer than one beat/);
  });

  it("refuses a vocabulary of fewer than two rhythms", () => {
    for (const cells of [[], ["quarter"]]) {
      const result = evaluateBuilder({ ...blank, vocabulary: { kind: "cells", cells } });
      expect(result.ok, cells.join()).toBe(false);
      if (!result.ok) expect(result.problem).toMatch(/at least 2 different rhythms/);
    }
  });

  it("refuses a round longer than the measures the vocabulary can make", () => {
    const result = evaluateBuilder({
      ...blank, scope: "measure", meter: "2-4", vocabulary: { kind: "level", level: 1 }, count: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toContain("4 different 2/4 measures");
  });

  it("refuses a pass mark the round cannot reach", () => {
    expect(evaluateBuilder({ ...blank, count: 8, passing: 9 }).ok).toBe(false);
    expect(evaluateBuilder({ ...blank, passing: 6 }).ok).toBe(false); // default round is five
    expect(evaluateBuilder({ ...blank, count: 8, passing: 8 }).ok).toBe(true);
  });

  it("refuses a question count outside 1–20", () => {
    expect(evaluateBuilder({ ...blank, count: 0 }).ok).toBe(false);
    expect(evaluateBuilder({ ...blank, count: 21 }).ok).toBe(false);
    expect(evaluateBuilder({ ...blank, count: 1 }).ok).toBe(true);
    expect(evaluateBuilder({ ...blank, count: 20 }).ok).toBe(true);
  });

  it("says plainly when a count is not a whole number", () => {
    const result = evaluateBuilder({ ...blank, count: 2.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toMatch(/whole number/);
  });
});

describe("the seed, which the parser would silently drop", () => {
  it("agrees with the parser about what a valid seed is", () => {
    /* The pattern is copied into the builder on purpose, and this is the guard:
       for every candidate, the builder accepts it exactly when the parser keeps
       it. If they ever disagreed the parser would discard a seed the form had
       written, in silence. */
    const candidates = [
      "a", "k7m2xq", "with-hyphen", "under_score", "UPPER", "1234567890",
      "x".repeat(32), "x".repeat(33), "has space", "semi;colon", "ünï", "a/b", "a&b", "a=b", "",
    ];
    for (const seed of candidates) {
      const kept = parseAssignment(`?seed=${encodeURIComponent(seed)}`);
      const parserKeeps = kept.ok && kept.assignment.seed === seed && seed !== "";
      expect(SEED_PATTERN.test(seed), JSON.stringify(seed)).toBe(parserKeeps);
    }
  });

  it("refuses a seed the parser would drop, instead of writing a link that loses it", () => {
    for (const seed of ["has space", "x".repeat(33), "a/b", "ünï"]) {
      const result = evaluateBuilder({ ...blank, seed });
      expect(result.ok, seed).toBe(false);
      if (!result.ok) expect(result.problem).toMatch(/same questions/);
    }
  });

  it("lets a round go out without a seed, with a note rather than an error", () => {
    const result = ok({ ...blank, count: 5 });
    expect(result.notes.join(" ")).toMatch(/No seed/);
  });

  it("makes seeds that are always valid", () => {
    let next = 0;
    const sequence = [0, 0.999999, 0.5, 0.123, 0.77, 0.31];
    const seed = makeSeed(() => sequence[next++ % sequence.length]);
    expect(seed).toMatch(SEED_PATTERN);
    expect(seed).toHaveLength(6);
    for (let trial = 0; trial < 500; trial += 1) {
      expect(makeSeed(Math.random)).toMatch(SEED_PATTERN);
    }
  });
});

describe("notes that never block a link", () => {
  it("says what a missing pass mark and a missing count mean", () => {
    const notes = ok({ ...blank, seed: "abc" }).notes.join(" | ");
    expect(notes).toMatch(/No pass mark/);
    expect(notes).toMatch(/No question count: the round will be 5/);
  });

  it("reports how many measures a full-measure vocabulary can make", () => {
    const result = ok({
      ...blank, scope: "measure", meter: "2-4", vocabulary: { kind: "level", level: 1 }, count: 4, seed: "s",
    });
    expect(result.measureCeiling).toBe(4);
    expect(result.notes.join(" ")).toMatch(/only 4 different 2\/4 measures/);
    expect(ok({ ...blank, scope: "beat" }).measureCeiling).toBeNull();
  });
});

describe("a question size left to the student", () => {
  it("warns when choosing full measures would shorten the teacher's round", () => {
    /* Judged as one beat the link is fine; a student who picks full measures in
       2/4 at Level 1 has four bars to work with, not eight. */
    const open = ok({
      ...blank, vocabulary: { kind: "level", level: 1 }, meter: "2-4", count: 8, passing: 6, seed: "s",
    });
    expect(open.notes.join(" ")).toMatch(/left to the student.*only 4 different 2\/4 measures.*shorter than the 8/);
  });

  it("says nothing when the size is pinned, or the pool can fill the round either way", () => {
    const pinned = ok({
      ...blank, vocabulary: { kind: "level", level: 1 }, meter: "2-4", scope: "beat", count: 8, passing: 6, seed: "s",
    });
    expect(pinned.notes.join(" ")).not.toMatch(/left to the student/);
    const roomy = ok({
      ...blank, vocabulary: { kind: "level", level: 3 }, meter: "4-4", count: 8, passing: 6, seed: "s",
    });
    expect(roomy.notes.join(" ")).not.toMatch(/left to the student/);
  });
});

describe("the form's own lists", () => {
  it("lists every rhythm the catalog has, once, in catalog order", () => {
    expect(BUILDER_CELLS.map((cell) => cell.id)).toEqual(ALL_RHYTHM_CELLS.map((cell) => cell.id));
  });

  it("separates the rhythms that last longer than a beat", () => {
    const spanning = BUILDER_CELLS.filter((cell) => cell.level === 0).map((cell) => cell.id);
    expect(spanning).toEqual(["half", "half-rest", "whole"]);
    expect(BUILDER_CELLS.find((cell) => cell.id === "half-rest")?.count).toBe("silent");
    expect(BUILDER_CELLS.find((cell) => cell.id === "eighths")?.count).toBe("1 &");
  });

  it("offers every meter in bar order and all three levels", () => {
    expect(BUILDER_METERS.map((meter) => meter.id)).toEqual([...METER_IDS]);
    expect(BUILDER_LEVELS.map((level) => level.id)).toEqual([1, 2, 3]);
  });

  it("starts a rhythm pick from a level's own vocabulary", () => {
    expect(cellsForLevel(1)).toEqual(["quarter", "eighths"]);
    expect(cellsForLevel(3)).toHaveLength(16);
    for (const level of [1, 2, 3] as const) {
      expect(ok({ ...blank, vocabulary: { kind: "cells", cells: cellsForLevel(level) } }).assignment.cells)
        .toEqual(cellsForLevel(level));
    }
  });
});

/* The promise. Every combination of the choices a teacher can make is either
 * refused with a message, or yields a link the app can actually play: the round
 * it describes builds, at the length it names, without throwing. This is the
 * same shape of test as tests/reachable-states.test.ts — it enumerates the
 * controls rather than the cases, because the failures in this app have always
 * lived in the combinations nobody wrote down. */
describe("every combination of choices", () => {
  const vocabularies: readonly Vocabulary[] = [
    { kind: "student" },
    { kind: "level", level: 1 },
    { kind: "level", level: 2 },
    { kind: "level", level: 3 },
    { kind: "cells", cells: ["quarter", "eighths"] },
    { kind: "cells", cells: ["eighth-rest", "rest-eighth"] },
    { kind: "cells", cells: cellsForLevel(3) },
    { kind: "cells", cells: ["half", "quarter", "eighths"] },
    { kind: "cells", cells: ["whole", "half", "half-rest", "quarter"] },
    { kind: "cells", cells: ["half-rest", "quarter"] },
    { kind: "cells", cells: ["quarter"] },
  ];
  const meters: readonly (MeterId | null)[] = [null, ...METER_IDS];
  const scopes = [null, "beat", "measure"] as const;
  const counts = [null, 1, 5, 20] as const;
  const passes = [null, 1, 5] as const;

  it("is either refused with a message or playable end to end", () => {
    let accepted = 0;
    let refused = 0;
    const unplayable: string[] = [];
    const silent: string[] = [];

    for (const vocabulary of vocabularies) {
      for (const meter of meters) {
        for (const scope of scopes) {
          for (const count of counts) {
            for (const passing of passes) {
              const state: BuilderState = { ...blank, vocabulary, meter, scope, count, passing, seed: "enum" };
              const where = JSON.stringify({ vocabulary, meter, scope, count, passing });
              const result = evaluateBuilder(state);
              if (!result.ok) {
                refused += 1;
                if (!result.problem.trim()) silent.push(where);
                continue;
              }
              accepted += 1;
              try {
                const { assignment } = result;
                const questions = generateQuestions({
                  level: assignment.level,
                  scope: assignment.scope,
                  ...(assignment.meter ? { meter: assignment.meter } : {}),
                  ...(assignment.cells ? { cells: assignment.cells } : {}),
                  count: assignment.count ?? 5,
                  seed: assignment.seed ?? "none",
                });
                if (questions.length !== (assignment.count ?? 5)) unplayable.push(`${where}: built ${questions.length}`);
              } catch (error) {
                unplayable.push(`${where}: ${(error as Error).message}`);
              }
            }
          }
        }
      }
    }

    expect(unplayable).toEqual([]);
    expect(silent).toEqual([]);
    /* A loop that covered nothing would pass: both outcomes must be reached. */
    expect(accepted).toBeGreaterThan(300);
    expect(refused).toBeGreaterThan(300);
  });

  it("writes a link the parser reads back as the same assignment", () => {
    for (const vocabulary of vocabularies) {
      for (const meter of meters) {
        const state: BuilderState = { ...blank, vocabulary, meter, scope: "measure", count: 3, seed: "rt", name: "Round trip" };
        const result = evaluateBuilder(state);
        if (!result.ok) continue;
        const again = parseAssignment(result.query);
        expect(again.ok).toBe(true);
        if (again.ok) expect(again.assignment).toEqual(result.assignment);
      }
    }
  });
});
