import { describe, expect, it } from "vitest";
import {
  ALL_RHYTHM_CELLS,
  EIGHTH_BEAT_CELLS,
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_STANDARD_VERSION,
  MEASURE_BEAM_POLICY,
  METER_IDS,
  RHYTHM_CELLS,
  createBeatPrompt,
  createMeasurePrompt,
  getDottedTokenIndexes,
  measureBeamRuns,
  getRhythmCell,
  validateEngravingCatalog,
  validateEngravingExpectationsAreUsed,
  type RhythmCell,
} from "../src/rhythm";

const EXPECTED_BEAMS: Readonly<Record<string, readonly (readonly number[])[]>> = {
  quarter: [],
  eighths: [[0, 1]],
  "eighth-rest": [],
  "rest-eighth": [],
  "three-rest-note": [],
  "rest-sixteenth-rest": [],
  "alternating-rests": [],
  "rest-two-rest": [[1, 2]],
  "dotted-eighth-sixteenth": [[0, 1]],
  "eighth-two": [[0, 1, 2]],
  "two-eighth": [[0, 1, 2]],
  "sixteenth-eighth-sixteenth": [[0, 1, 2]],
  sixteenths: [[0, 1, 2, 3]],
  "rest-three": [[1, 2, 3]],
  "two-rest": [[0, 1]],
  "rest-two": [[1, 2]],

  /* The eighth-beat family, authored here independently of the production
     table. An eighth beat divides into two sixteenths, so the only thing there
     is to beam is that pair; a lone eighth IS the beat and beams to nothing,
     and neither half-beat rest cell beams, because a beam never crosses a rest
     in this house style. The whole-bar beam that 3/8 draws belongs to the
     measure renderer, not to any of these cells — see MEASURE_BEAM_POLICY. */
  "eighth-beat": [],
  "two-sixteenths": [[0, 1]],
  "sixteenth-rest": [],
  "rest-sixteenth": [],
};

const EXPECTED_DOTS: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  ALL_RHYTHM_CELLS.map((cell) => [cell.id, cell.id === "dotted-eighth-sixteenth" ? [0] : []]),
);

const EXPECTED_PARTIALS = {
  "dotted-eighth-sixteenth": { 1: "left" },
  "sixteenth-eighth-sixteenth": { 0: "right", 2: "left" },
} as const;

describe("reviewed engraving contract", () => {
  it("locks an independent beam and dot expectation for every cell", () => {
    /* The version names what has been reviewed. It changed with the meter
       work rather than quietly covering more than it did: the sixteen
       quarter-beat rows are the 2026-07-20 baseline untouched, and the four
       eighth-beat rows are new. */
    expect(ENGRAVING_STANDARD_VERSION).toBe("count-it-simple-meters-beginner-v2");
    expect(Object.keys(ENGRAVING_EXPECTATIONS).sort()).toEqual(
      ALL_RHYTHM_CELLS.map((cell) => cell.id).sort(),
    );
    expect(
      Object.fromEntries(
        Object.entries(ENGRAVING_EXPECTATIONS).map(([id, value]) => [id, value.beamGroups]),
      ),
    ).toEqual(EXPECTED_BEAMS);
    expect(
      Object.fromEntries(
        Object.entries(ENGRAVING_EXPECTATIONS).map(([id, value]) => [id, value.dottedTokenIndexes]),
      ),
    ).toEqual(EXPECTED_DOTS);
  });

  it("validates the live catalog against the reviewed engraving baseline", () => {
    expect(() => validateEngravingCatalog(ALL_RHYTHM_CELLS)).not.toThrow();
    expect(() => validateEngravingExpectationsAreUsed(ALL_RHYTHM_CELLS)).not.toThrow();
    /* A subset must still validate. This is the direction that used to fail:
       one strict equality said "no cell without a review" and "no review
       without a cell" at once, so validating a level's vocabulary — or either
       beat family on its own — threw on a catalog that was entirely correct. */
    expect(() => validateEngravingCatalog(RHYTHM_CELLS)).not.toThrow();
    expect(() => validateEngravingCatalog(EIGHTH_BEAT_CELLS)).not.toThrow();
    /* And an orphan review is still caught. */
    expect(() => validateEngravingExpectationsAreUsed(RHYTHM_CELLS)).toThrow(
      /describe cells that do not exist/,
    );
    for (const cell of RHYTHM_CELLS) {
      expect(cell.notation.beamGroups).toEqual(EXPECTED_BEAMS[cell.id]);
      expect(getDottedTokenIndexes(cell)).toEqual(EXPECTED_DOTS[cell.id]);
    }
    expect(getRhythmCell("dotted-eighth-sixteenth").notation.partialBeamDirections).toEqual(
      EXPECTED_PARTIALS["dotted-eighth-sixteenth"],
    );
    expect(getRhythmCell("sixteenth-eighth-sixteenth").notation.partialBeamDirections).toEqual(
      EXPECTED_PARTIALS["sixteenth-eighth-sixteenth"],
    );
  });

  it("keeps beam groups inside one beat and never beams across a rest", () => {
    for (const cell of RHYTHM_CELLS) {
      for (const group of cell.notation.beamGroups) {
        expect(group).toEqual(
          Array.from({ length: group.length }, (_, offset) => group[0] + offset),
        );
        expect(group.every((index) => !cell.notation.tokens[index].rest)).toBe(true);
        expect(group.every((index) => cell.notation.tokens[index].duration !== "4")).toBe(true);
      }
    }

    const measure = createMeasurePrompt([
      "eighths",
      "dotted-eighth-sixteenth",
      "sixteenth-eighth-sixteenth",
      "sixteenths",
    ]);
    expect(measure.cells.map((cell) => cell.notation.beamGroups)).toEqual([
      [[0, 1]],
      [[0, 1]],
      [[0, 1, 2]],
      [[0, 1, 2, 3]],
    ]);
  });

  it("encodes a real dotted eighth and explicit partial-beam directions", () => {
    const dotted = getRhythmCell("dotted-eighth-sixteenth");
    expect(dotted.notation.tokens[0]).toMatchObject({
      duration: "8",
      ticks: 3,
      dots: 1,
      partial: 0,
    });
    expect(dotted.notation.partialBeamDirections).toEqual({ 1: "left" });

    const syncopated = getRhythmCell("sixteenth-eighth-sixteenth");
    expect(syncopated.notation.partialBeamDirections).toEqual({ 0: "right", 2: "left" });
  });

  it("fails when a rhythm recipe drifts from the engraving baseline", () => {
    const original = getRhythmCell("eighths");
    const drifted = {
      ...original,
      notation: {
        ...original.notation,
        beamGroups: [],
      },
    } as RhythmCell;
    const catalog = RHYTHM_CELLS.map((cell) => (cell.id === drifted.id ? drifted : cell));
    expect(() => validateEngravingCatalog(catalog)).toThrow(/reviewed engraving baseline/);
  });
});

describe("the 3/8 whole-measure beam", () => {
  /* The one place this app decides engraving at render time rather than reading
     a reviewed per-cell expectation, and therefore the one place worth testing
     hardest. The rule is not this app's invention: the Rhythms in Three lesson
     teaches it and the Theory Reference poster prints it. */
  it("beams the whole bar in 3/8 and only in 3/8", () => {
    expect(MEASURE_BEAM_POLICY["3-8"]).toBe("whole-measure");
    /* Exactly one meter takes the exception. If a second ever does, this fails
       and somebody has to decide it deliberately rather than inherit it. */
    expect(
      METER_IDS.filter((id) => MEASURE_BEAM_POLICY[id] === "whole-measure"),
    ).toEqual(["3-8"]);

    const bar = createMeasurePrompt(
      ["two-sixteenths", "two-sixteenths", "two-sixteenths"],
      "3-8",
    );
    /* Six sixteenths, one beam across the bar — not three beams of two. This is
       the assertion that would fail if the renderer fell back to per-beat. */
    expect(measureBeamRuns(bar)).toEqual([
      [
        { cellIndex: 0, tokenIndex: 0 },
        { cellIndex: 0, tokenIndex: 1 },
        { cellIndex: 1, tokenIndex: 0 },
        { cellIndex: 1, tokenIndex: 1 },
        { cellIndex: 2, tokenIndex: 0 },
        { cellIndex: 2, tokenIndex: 1 },
      ],
    ]);
  });

  it("still refuses to beam across a rest", () => {
    /* The whole-bar rule widens WHERE a beam may reach, not WHAT it may cross.
       A rest in the middle leaves two runs, and the single sixteenth stranded
       before it keeps its flags rather than becoming a one-note beam. */
    const bar = createMeasurePrompt(
      ["two-sixteenths", "rest-sixteenth", "two-sixteenths"],
      "3-8",
    );
    expect(measureBeamRuns(bar)).toEqual([
      [
        { cellIndex: 0, tokenIndex: 0 },
        { cellIndex: 0, tokenIndex: 1 },
      ],
      [
        { cellIndex: 1, tokenIndex: 1 },
        { cellIndex: 2, tokenIndex: 0 },
        { cellIndex: 2, tokenIndex: 1 },
      ],
    ]);

    const lonely = createMeasurePrompt(
      ["sixteenth-rest", "sixteenth-rest", "sixteenth-rest"],
      "3-8",
    );
    /* Every sounding sixteenth is followed by a rest, so nothing beams at all. */
    expect(measureBeamRuns(lonely)).toEqual([]);
  });

  it("leaves every other meter beaming inside its own beat", () => {
    /* 4/4 and 3/4 return the cells' reviewed beam groups untouched — the same
       groups the expectation table above locks — so widening the model did not
       quietly re-engrave sixteen already-reviewed rhythms. */
    for (const meter of ["4-4", "3-4"] as const) {
      const beats = meter === "4-4" ? 4 : 3;
      const bar = createMeasurePrompt(Array.from({ length: beats }, () => "sixteenths"), meter);
      expect(measureBeamRuns(bar)).toEqual(
        Array.from({ length: beats }, (_, cellIndex) =>
          [0, 1, 2, 3].map((tokenIndex) => ({ cellIndex, tokenIndex })),
        ),
      );
    }
    /* And a single beat never takes the exception, in any meter: there is no
       bar to beam across. */
    expect(measureBeamRuns(createBeatPrompt("two-sixteenths", "3-8"))).toEqual([[
      { cellIndex: 0, tokenIndex: 0 },
      { cellIndex: 0, tokenIndex: 1 },
    ]]);
  });
});
