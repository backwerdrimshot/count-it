import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CountReference from "../app/CountReference";
import { parseAssignment, roundLengthFor, uniqueMeasures } from "../src/assignment";
import { generateQuestions } from "../src/question";
import {
  METER_IDS,
  countLabelsForBeat,
  createBeatPrompt,
  createMeasurePrompt,
  getCellsForLevel,
  getCompleteReference,
  getMeter,
  getPromptAnswer,
  isMeterId,
  type MeterId,
} from "../src/rhythm";

/* 2/4, 5/4 and 7/4 joined 3/4 and 4/4 as quarter-note-beat meters.
 *
 * The rule that admits a meter is narrow and these tests hold it: the beat is a
 * quarter note, it divides into four sixteenth partials, and a bar is a whole
 * number of those beats. Everything else — an eighth beat, a half-note beat, a
 * dotted-quarter beat — is a different counting problem, and 3/8 already left
 * this app for Eight Time because of exactly that. */

const NEW_METERS: readonly MeterId[] = ["2-4", "5-4", "7-4"];

describe("which meters Count It reads", () => {
  it("reads the simple meters whose beat is a quarter note, in bar order", () => {
    expect(METER_IDS).toEqual(["2-4", "3-4", "4-4", "5-4", "7-4"]);
    for (const id of METER_IDS) {
      const meter = getMeter(id);
      expect(meter.label).toBe(`${meter.beatsPerMeasure}/4`);
      expect(meter.partialsPerBeat).toBe(4);
      expect(meter.vexBeatValue).toBe(4);
    }
  });

  it("still refuses every meter whose beat is not a quarter note", () => {
    /* Eighth-beat (3/8, 5/8), half-note-beat (2/2) and compound (6/8, 9/8,
       12/8) meters each need their own vocabulary, beaming and syllables. They
       are refused rather than approximated by the nearest quarter-beat meter. */
    for (const id of ["3-8", "5-8", "6-8", "9-8", "12-8", "2-2"]) {
      expect(isMeterId(id), id).toBe(false);
    }
  });

  it("keeps 4/4 the default for a link that names no meter", () => {
    const result = parseAssignment("?scope=measure&level=1&n=5&seed=x");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.assignment.meter).toBeNull();
  });
});

describe("counting to the end of a longer bar", () => {
  it("numbers beats up to seven and no further", () => {
    expect(countLabelsForBeat(7)).toEqual(["7", "e", "&", "a"]);
    expect(() => countLabelsForBeat(8)).toThrow(/between 1 and 7/);
    expect(() => countLabelsForBeat(0)).toThrow(RangeError);
  });

  it("writes the complete reference with one block per beat of the bar", () => {
    expect(getCompleteReference("measure", "standard", "2-4")).toBe("1 e & a | 2 e & a");
    expect(getCompleteReference("measure", "standard", "5-4").split(" | ")).toHaveLength(5);
    expect(getCompleteReference("measure", "standard", "7-4")).toBe(
      "1 e & a | 2 e & a | 3 e & a | 4 e & a | 5 e & a | 6 e & a | 7 e & a",
    );
  });

  it("numbers each cell by where it STARTS in a five-beat bar", () => {
    const bar = createMeasurePrompt(["quarter", "eighths", "half", "quarter"], "5-4");
    expect(getPromptAnswer(bar)).toBe("1 | 2 & | 3 | 5");
  });

  it("numbers a seven-beat bar with a whole note in it", () => {
    const bar = createMeasurePrompt(["whole", "half", "quarter"], "7-4");
    expect(getPromptAnswer(bar)).toBe("1 | 5 | 7");
  });
});

describe("filling a bar by span in the new meters", () => {
  it("lets a half note be the whole of a 2/4 bar", () => {
    const bar = createMeasurePrompt(["half"], "2-4");
    expect(getPromptAnswer(bar)).toBe("1");
    expect(createMeasurePrompt(["quarter", "eighths"], "2-4").cells).toHaveLength(2);
  });

  it("refuses a silent 2/4 bar and a note too long for it", () => {
    expect(() => createMeasurePrompt(["half-rest"], "2-4")).toThrow(/sound at least one note/);
    expect(() => createMeasurePrompt(["whole"], "2-4")).toThrow(/holds 2 beats; these rhythms fill 4/);
    expect(() => createMeasurePrompt(["quarter", "quarter", "quarter"], "2-4")).toThrow(/holds 2 beats/);
  });

  it("fits a whole note and one more beat into 5/4", () => {
    expect(getPromptAnswer(createMeasurePrompt(["whole", "quarter"], "5-4"))).toBe("1 | 5");
    expect(() => createMeasurePrompt(["whole"], "5-4")).toThrow(/holds 5 beats; these rhythms fill 4/);
  });

  it("still asks one-beat questions in every meter", () => {
    for (const id of METER_IDS) {
      expect(createBeatPrompt("eighths", id).meter).toBe(id);
    }
  });
});

describe("rounds generated in the new meters", () => {
  it("builds valid four-choice questions at every level and size", () => {
    for (const meter of NEW_METERS) {
      for (const level of ["level-1", "level-2", "level-3"] as const) {
        for (const scope of ["beat", "measure"] as const) {
          const wanted = roundLengthFor({ level, scope, meter, wanted: 8 });
          const questions = generateQuestions({
            level, scope, meter, count: wanted, seed: `new-${meter}-${level}-${scope}`,
          });
          expect(questions, `${meter} ${level} ${scope}`).toHaveLength(wanted);
          for (const question of questions) {
            expect(question.choices).toHaveLength(4);
            expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
            expect(question.prompt.meter).toBe(meter);
          }
        }
      }
    }
  });

  it("never offers a beat number the bar does not have", () => {
    /* The wrong-beat-number distractor wraps at the bar. In 2/4 there is no
       beat 3, and a distractor naming one is a wrong answer a student can
       eliminate without reading the rhythm. */
    for (const meter of NEW_METERS) {
      const { beatsPerMeasure } = getMeter(meter);
      const questions = generateQuestions({
        level: "level-3", scope: "measure", meter, count: 12, seed: `beats-${meter}`,
      });
      for (const question of questions) {
        for (const choice of question.choices) {
          for (const digit of choice.label.match(/\d/g) ?? []) {
            expect(Number(digit), `${meter}: "${choice.label}"`).toBeLessThanOrEqual(beatsPerMeasure);
            expect(Number(digit)).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it("is repeatable from a seed, and a different bar is a different round", () => {
    const again = () =>
      generateQuestions({ level: "level-2", scope: "measure", meter: "5-4", count: 6, seed: "same" });
    expect(JSON.stringify(again())).toBe(JSON.stringify(again()));
    const four = generateQuestions({ level: "level-2", scope: "measure", meter: "4-4", count: 6, seed: "same" });
    expect(JSON.stringify(again())).not.toBe(JSON.stringify(four));
  });

  it("never repeats a bar, and reaches the ceiling where the ceiling is reachable", () => {
    /* Only 2/4 has a ceiling under the 20-question cap (four bars from two
       rhythms); 5/4 and 7/4 make 32 and 128, so those rounds stop at 20. */
    for (const meter of NEW_METERS) {
      const ceiling = uniqueMeasures(
        getCellsForLevel("level-1"),
        getMeter(meter).beatsPerMeasure,
      );
      const count = Math.min(ceiling, 20);
      const questions = generateQuestions({
        level: "level-1", scope: "measure", meter, count, seed: `ceiling-${meter}`,
        cells: ["quarter", "eighths"],
      });
      expect(questions).toHaveLength(count);
      expect(new Set(questions.map((q) => q.id.replace(/^question-\d+-/, ""))).size).toBe(count);
    }
    expect(uniqueMeasures(getCellsForLevel("level-1"), 2)).toBe(4);
  });
});

describe("the student's own round length", () => {
  it("shortens a round the pool cannot fill, instead of throwing", () => {
    /* Two rhythms make four bars of 2/4 — one fewer than the five-question
       default. This is the only place in the setup panel a shorter round
       appears. */
    expect(roundLengthFor({ level: "level-1", scope: "measure", meter: "2-4", wanted: 5 })).toBe(4);
    expect(roundLengthFor({ level: "level-1", scope: "measure", meter: "3-4", wanted: 5 })).toBe(5);
    expect(roundLengthFor({ level: "level-1", scope: "measure", wanted: 5 })).toBe(5);
    expect(roundLengthFor({ level: "level-2", scope: "measure", meter: "2-4", wanted: 5 })).toBe(5);
  });

  it("never touches a one-beat round, or a pinned pool that can fill the length", () => {
    expect(roundLengthFor({ level: "level-1", scope: "beat", meter: "2-4", wanted: 5 })).toBe(5);
    expect(
      roundLengthFor({
        level: "level-1", scope: "measure", meter: "2-4", wanted: 5,
        cells: ["quarter", "eighths", "eighth-rest"],
      }),
    ).toBe(5);
  });

  it("is the identity for any link the parser accepted", () => {
    /* parseAssignment refuses a link whose pool cannot fill the length it asked
       for, so the clamp cannot silently shorten a teacher's round. */
    const links = [
      "?scope=measure&meter=2-4&cells=quarter,eighths&n=4&seed=a",
      "?scope=measure&meter=3-4&cells=quarter,eighths&n=8&seed=a",
      "?scope=measure&meter=5-4&cells=quarter,eighths&n=20&seed=a",
      "?scope=measure&meter=7-4&level=1&n=20&seed=a",
      "?scope=measure&meter=2-4&level=2&n=16&seed=a",
    ];
    for (const link of links) {
      const result = parseAssignment(link);
      expect(result.ok, link).toBe(true);
      if (!result.ok) continue;
      const { assignment } = result;
      expect(
        roundLengthFor({
          level: assignment.level,
          scope: assignment.scope,
          ...(assignment.meter ? { meter: assignment.meter } : {}),
          ...(assignment.cells ? { cells: assignment.cells } : {}),
          wanted: assignment.count ?? 5,
        }),
        link,
      ).toBe(assignment.count ?? 5);
    }
  });
});

describe("assignment links in the new meters", () => {
  it("accepts and locks each new meter", () => {
    for (const meter of NEW_METERS) {
      const result = parseAssignment(`?scope=measure&meter=${meter}&level=2&n=5&seed=a`);
      expect(result.ok, meter).toBe(true);
      if (!result.ok) continue;
      expect(result.assignment.meter).toBe(meter);
      expect(result.locked).toContain("meter");
    }
  });

  it("counts the real ceiling for the bar, which is lowest in 2/4", () => {
    const refused = parseAssignment("?scope=measure&meter=2-4&cells=quarter,eighths&n=5&seed=a");
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error.code).toBe("measure-pool");
      expect(refused.error.message).toContain("4 different 2/4 measures");
    }
    /* And a longer bar makes more of the same two rhythms: 2^5 and 2^7. */
    expect(uniqueMeasures(getCellsForLevel("level-1"), 5)).toBe(32);
    expect(uniqueMeasures(getCellsForLevel("level-1"), 7)).toBe(128);
  });

  it("refuses a rhythm the bar cannot hold rather than dropping it from the round", () => {
    /* `whole` needs four beats. In 3/4 the generator would discard every draw
       containing it, so the link would name a whole note and the round would
       never ask one — the failure this parser exists to refuse. */
    for (const meter of ["2-4", "3-4"]) {
      const result = parseAssignment(
        `?scope=measure&meter=${meter}&cells=whole,quarter,eighths,eighth-rest&n=5&seed=a`,
      );
      expect(result.ok, meter).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("meter-cells");
      expect(result.error.entry).toBe("whole");
      expect(result.error.message).toContain(`${meter.replace("-", "/")} measure`);
    }
    /* The same pool is fine wherever a whole note fits. */
    for (const meter of ["4-4", "5-4", "7-4"]) {
      const result = parseAssignment(
        `?scope=measure&meter=${meter}&cells=whole,quarter,eighths,eighth-rest&n=5&seed=a`,
      );
      expect(result.ok, meter).toBe(true);
    }
    /* A half note is a legitimate two-beat bar. */
    expect(
      parseAssignment("?scope=measure&meter=2-4&cells=half,quarter,eighths&n=5&seed=a").ok,
    ).toBe(true);
  });
});

/* The reference grid.
 *
 * It drew one block per CELL and numbered it by position in the list. That is
 * the same as one block per beat only while every cell is one beat: a bar of
 * [half, quarter, quarter] drew three blocks, 1-2-3, and lit the "2" for a
 * quarter that sounds on beat three. */
function referenceBlocks(markup: string): { beat: string; sounding: string[] }[] {
  return markup
    .split('class="reference-beat"')
    .slice(1)
    .map((block) => ({
      beat: /Beat (\d+)/.exec(block)?.[1] ?? "",
      sounding: [...block.matchAll(/<span class="sounds">([^<]+)<\/span>/g)].map((m) =>
        m[1].replace(/&amp;/g, "&"),
      ),
    }));
}

describe("the subdivision guide for a whole bar", () => {
  const render = (cells: string[], meter: MeterId, scope: "beat" | "measure" = "measure") =>
    referenceBlocks(
      renderToStaticMarkup(
        createElement(CountReference, {
          prompt: scope === "beat"
            ? createBeatPrompt(cells[0], meter)
            : createMeasurePrompt(cells, meter),
          revealSounding: true,
        }),
      ),
    );

  it("draws a block for every beat, including the one a held note covers", () => {
    const blocks = render(["half", "quarter", "quarter"], "4-4");
    expect(blocks.map((block) => block.beat)).toEqual(["1", "2", "3", "4"]);
    expect(blocks.map((block) => block.sounding)).toEqual([["1"], [], ["3"], ["4"]]);
  });

  it("follows the meter's beat count", () => {
    expect(render(["half"], "2-4").map((block) => block.beat)).toEqual(["1", "2"]);
    expect(render(["whole", "quarter"], "5-4").map((block) => block.sounding)).toEqual([
      ["1"], [], [], [], ["5"],
    ]);
    expect(
      render(["quarter", "quarter", "quarter", "quarter", "quarter", "quarter", "quarter"], "7-4")
        .map((block) => block.beat),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("is unchanged for a bar of one-beat cells and for a single beat", () => {
    expect(render(["eighths", "quarter", "sixteenths"], "3-4").map((b) => b.sounding)).toEqual([
      ["1", "&"], ["2"], ["3", "e", "&", "a"],
    ]);
    expect(render(["eighths"], "4-4", "beat")).toEqual([{ beat: "1", sounding: ["1", "&"] }]);
  });

  it("marks nothing before the answer is revealed", () => {
    const markup = renderToStaticMarkup(
      createElement(CountReference, {
        prompt: createMeasurePrompt(["half", "quarter", "quarter"], "4-4"),
        revealSounding: false,
      }),
    );
    expect(markup).not.toContain('class="sounds"');
    expect(markup).not.toContain('class="silent"');
  });
});
