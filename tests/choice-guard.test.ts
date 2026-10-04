import { describe, expect, it } from "vitest";
import { parseAssignment, roundProblem, unavailableChoices, uniqueMeasures, type Assignment } from "../src/assignment";
import { evaluateBuilder, type BuilderState, type Vocabulary } from "../src/assignment/builder";
import { generateQuestions } from "../src/question";
import { METER_IDS, getCellsByIds, getCellsForLevel, getMeter, type MeterId } from "../src/rhythm";

/* A link that leaves the meter or the question size open is not a link that lets
 * the student choose anything. A whole note is never asked in 3/4; two rhythms
 * make four bars of 2/4, not twelve — and the student who switched a published
 * Counting Rhythms link to either got a round the teacher never set, with a pass
 * mark that could no longer be reached. The setup panel now asks the parser's own
 * rule which choices those are, and greys them out. */

function assignmentFrom(search: string): Assignment {
  const parsed = parseAssignment(search);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.assignment;
}

/* The published Step 10 link and Step 1 link, verbatim from the shop site
   (backwerd-rhythm-shop-site@06ca7b8): neither pins the meter. */
const STEP_10 =
  "?seq=counting-rhythms&step=10&a=Step%2010%3A%20Notes%20That%20Last&level=1&scope=measure&cells=whole,half,half-rest,quarter,eighths&guide=off&n=12&pass=10&seed=cr10-notes-that-last";
const STEP_1 =
  "?seq=counting-rhythms&step=1&a=Step%201%3A%20Quarters%20%26%20Pairs&scope=beat&cells=quarter,eighths&guide=on&n=12&pass=10&seed=cr1-quarters-pairs";

describe("roundProblem — the parser's rule, asked on its own", () => {
  it("is null for a round that can be built", () => {
    expect(roundProblem({ scope: "measure", meter: "4-4", cells: ["whole", "quarter", "eighths"], level: "level-1", count: 5 })).toBeNull();
    expect(roundProblem({ scope: "beat", meter: null, cells: null, level: "level-2", count: null })).toBeNull();
  });

  it("names the three ways a round cannot be built, with the same codes and words as a link", () => {
    const longInBeat = roundProblem({ scope: "beat", meter: "4-4", cells: ["half", "quarter"], level: "level-1", count: 5 });
    expect(longInBeat?.code).toBe("scope-cells");
    const wholeInThree = roundProblem({ scope: "measure", meter: "3-4", cells: ["whole", "quarter"], level: "level-1", count: 5 });
    expect(wholeInThree?.code).toBe("meter-cells");
    const tooFewBars = roundProblem({ scope: "measure", meter: "2-4", cells: null, level: "level-1", count: 5 });
    expect(tooFewBars?.code).toBe("measure-pool");

    /* The same sentence the parser gives for the equivalent link: there is one
       copy of the rule, so there is one copy of the words. */
    const refused = (search: string) => {
      const parsed = parseAssignment(search);
      return parsed.ok ? null : parsed.error;
    };
    expect(refused("?scope=beat&cells=half,quarter&n=5&seed=x")?.message).toBe(longInBeat?.message);
    expect(refused("?scope=measure&meter=3-4&cells=whole,quarter&n=5&seed=x")?.message).toBe(wholeInThree?.message);
    expect(refused("?scope=measure&meter=2-4&level=1&n=5&seed=x")?.message).toBe(tooFewBars?.message);
  });
});

describe("unavailableChoices on the published links", () => {
  it("greys out the meters Step 10 cannot be asked in, and only those", () => {
    const step10 = assignmentFrom(STEP_10);
    const { meters } = unavailableChoices(step10, { scope: "measure", meter: "4-4" });
    /* A whole note needs four beats, so 2/4 and 3/4 cannot hold the step. */
    expect(Object.keys(meters).sort()).toEqual(["2-4", "3-4"]);
    expect(meters["3-4"]).toMatch(/longer than a 3\/4 measure/);
  });

  it("leaves every meter open on a one-beat step, where the meter changes nothing about the rhythms", () => {
    const step1 = assignmentFrom(STEP_1);
    expect(unavailableChoices(step1, { scope: "beat", meter: "4-4" }).meters).toEqual({});
  });

  it("never offers the choice already made as a problem", () => {
    const step10 = assignmentFrom(STEP_10);
    const { meters, scopes } = unavailableChoices(step10, { scope: "measure", meter: "4-4" });
    expect(meters).not.toHaveProperty("4-4");
    expect(scopes).not.toHaveProperty("measure");
  });
});

describe("a link that leaves both size and meter open", () => {
  /* Level 1 (two rhythms), twelve questions, nothing else pinned. */
  const open = assignmentFrom("?level=1&n=12&pass=10&seed=open");

  it("lets the student pick full measures, then rules out the meters whose bars run out", () => {
    /* As written, the link is one-beat in 4/4. Measures at 4/4 make 16 bars. */
    const start = unavailableChoices(open, { scope: "beat", meter: "4-4" });
    expect(start.scopes).toEqual({});
    expect(start.meters).toEqual({});
    /* Having picked full measures, 2/4 (4 bars) and 3/4 (8 bars) cannot fill 12. */
    const measures = unavailableChoices(open, { scope: "measure", meter: "4-4" });
    expect(Object.keys(measures.meters).sort()).toEqual(["2-4", "3-4"]);
    expect(measures.meters["2-4"]).toMatch(/only make 4 different 2\/4 measures/);
  });

  it("rules out full measures when the meter already chosen cannot fill the round", () => {
    const inTwoFour = unavailableChoices(open, { scope: "beat", meter: "2-4" });
    expect(inTwoFour.scopes.measure).toMatch(/only make 4 different 2\/4 measures/);
  });
});

/* The two-sided promise. From every valid starting point, every choice the guard
 * ALLOWS builds the round at the length the teacher set, and every choice it
 * BLOCKS is a real problem — the generator throws, or a pinned rhythm can never
 * appear. Judged against the generator, not against the guard's own rules, so a
 * guard that blocked too much or too little would both fail here. */
describe("the guard against the generator", () => {
  const vocabularies: readonly Vocabulary[] = [
    { kind: "level", level: 1 },
    { kind: "level", level: 3 },
    { kind: "cells", cells: ["quarter", "eighths"] },
    { kind: "cells", cells: ["quarter", "eighths", "eighth-rest", "rest-eighth"] },
    { kind: "cells", cells: ["whole", "half", "half-rest", "quarter", "eighths"] },
    { kind: "cells", cells: ["half", "quarter", "eighths"] },
  ];
  const meters: readonly (MeterId | null)[] = [null, "2-4", "5-4"];
  const scopes = [null, "beat", "measure"] as const;
  const counts = [null, 12] as const;
  const SEEDS = ["g1", "g2", "g3", "g4", "g5"];

  function pinnedCells(assignment: Assignment): readonly string[] {
    return assignment.cells ?? [];
  }

  /** The ids of every rhythm the generator ever asks, over several seeds and a
   *  long round, or null when it cannot build the round at all. */
  function asked(assignment: Assignment, scope: "beat" | "measure", meter: MeterId): Set<string> | null {
    const seen = new Set<string>();
    /* A measure round never repeats a bar, so how long a probe can be is the
       pool's own ceiling in this meter — asking for more would throw for a
       reason that has nothing to do with the choice being tested. */
    const pool = assignment.cells ? getCellsByIds(assignment.cells) : getCellsForLevel(assignment.level);
    const ceiling = uniqueMeasures(pool, getMeter(meter).beatsPerMeasure);
    const probe = scope === "measure" ? Math.max(1, Math.min(8, ceiling)) : 20;
    try {
      for (const seed of SEEDS) {
        const questions = generateQuestions({
          level: assignment.level,
          scope,
          meter,
          ...(assignment.cells ? { cells: assignment.cells } : {}),
          count: probe,
          seed,
        });
        for (const question of questions) for (const cell of question.prompt.cells) seen.add(cell.id);
      }
    } catch {
      return null;
    }
    return seen;
  }

  it("allows only what builds the teacher's round, and blocks only what really cannot", () => {
    let allowed = 0;
    let blocked = 0;
    const wrongAllow: string[] = [];
    const wrongBlock: string[] = [];

    for (const vocabulary of vocabularies) {
      for (const meterPin of meters) {
        for (const scopePin of scopes) {
          for (const count of counts) {
            const state: BuilderState = {
              name: "", vocabulary, scope: scopePin, meter: meterPin, guide: null, feedback: null,
              retry: null, count, passing: null, seed: "guard",
            };
            const result = evaluateBuilder(state);
            if (!result.ok) continue;
            const assignment = result.assignment;
            const here = { scope: assignment.scope, meter: assignment.meter ?? ("4-4" as MeterId) };
            const verdict = unavailableChoices(assignment, here);
            const wanted = assignment.count ?? 5;

            const candidates: { scope: "beat" | "measure"; meter: MeterId; reason: string | undefined; label: string }[] = [];
            for (const scope of ["beat", "measure"] as const) {
              if (scope !== here.scope) candidates.push({ scope, meter: here.meter, reason: verdict.scopes[scope], label: `scope→${scope}` });
            }
            for (const meter of METER_IDS) {
              if (meter !== here.meter) candidates.push({ scope: here.scope, meter, reason: verdict.meters[meter], label: `meter→${meter}` });
            }

            for (const candidate of candidates) {
              const where = `${vocabulary.kind}:${JSON.stringify(vocabulary)} meterPin=${meterPin} scopePin=${scopePin} n=${count} ${candidate.label}`;
              if (candidate.reason === undefined) {
                allowed += 1;
                /* Allowed: it must build exactly the round the teacher set. */
                try {
                  const questions = generateQuestions({
                    level: assignment.level, scope: candidate.scope, meter: candidate.meter,
                    ...(assignment.cells ? { cells: assignment.cells } : {}),
                    count: wanted, seed: assignment.seed ?? "none",
                  });
                  if (questions.length !== wanted) wrongAllow.push(`${where}: built ${questions.length}, wanted ${wanted}`);
                } catch (error) {
                  wrongAllow.push(`${where}: threw — ${(error as Error).message}`);
                }
                /* And every rhythm the link names must still be askable. */
                const seen = asked(assignment, candidate.scope, candidate.meter);
                const missing = seen ? pinnedCells(assignment).filter((id) => !seen.has(id)) : ["(round cannot be built)"];
                if (missing.length > 0) wrongAllow.push(`${where}: pinned rhythm never asked: ${missing.join(",")}`);
              } else {
                blocked += 1;
                /* Blocked: it must really be a problem. Either the round of the
                   teacher's length cannot be built, or a pinned rhythm can never
                   be asked in it. */
                let cannotBuild = false;
                try {
                  generateQuestions({
                    level: assignment.level, scope: candidate.scope, meter: candidate.meter,
                    ...(assignment.cells ? { cells: assignment.cells } : {}),
                    count: wanted, seed: assignment.seed ?? "none",
                  });
                } catch {
                  cannotBuild = true;
                }
                const seen = asked(assignment, candidate.scope, candidate.meter);
                const neverAsked = seen ? pinnedCells(assignment).some((id) => !seen.has(id)) : true;
                if (!cannotBuild && !neverAsked) wrongBlock.push(`${where}: blocked, but the round builds and every rhythm is asked`);
              }
            }
          }
        }
      }
    }

    expect(wrongAllow).toEqual([]);
    expect(wrongBlock).toEqual([]);
    /* A loop that exercised only one side would pass. */
    expect(allowed).toBeGreaterThan(100);
    expect(blocked).toBeGreaterThan(20);
  }, 60_000);
});
