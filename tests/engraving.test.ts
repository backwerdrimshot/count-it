import { describe, expect, it } from "vitest";
import {
  ALL_RHYTHM_CELLS,
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_STANDARD_VERSION,
  METERS,
  RHYTHM_CELLS,
  SPANNING_CELLS,
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

  /* Notes that last longer than a beat, authored here independently. A beam
     joins separate notes; a half note IS one note held across two beats, so
     there is nothing to join and nothing to dot. Both rests included: the half
     rest is a cell that sounds nothing, which is new, and it still has an
     engraving expectation like everything else. */
  half: [],
  "half-rest": [],
  whole: [],
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
    /* The version names what has been reviewed. v3 is the 3/8 removal: the
       nineteen remaining rows are the 2026-07-20 baseline untouched, and the
       four eighth-beat rows left with their meter. */
    expect(ENGRAVING_STANDARD_VERSION).toBe("count-it-quarter-meters-beginner-v3");
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
       without a cell" at once, so validating a level's vocabulary — or any
       other subset — threw on a catalog that was entirely correct. */
    expect(() => validateEngravingCatalog(RHYTHM_CELLS)).not.toThrow();
    expect(() => validateEngravingCatalog(SPANNING_CELLS)).not.toThrow();
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

describe("measure beam runs", () => {
  it("returns each cell's reviewed beam groups, per beat", () => {
    /* Every meter beams inside its own beat, so a bar's runs are exactly the
       cells' reviewed groups — the renderer never invents a beam. (The one
       meter that beamed across its bar, 3/8, was removed 2026-08-29.) */
    for (const meter of ["4-4", "3-4"] as const) {
      const beats = meter === "4-4" ? 4 : 3;
      const bar = createMeasurePrompt(Array.from({ length: beats }, () => "sixteenths"), meter);
      expect(measureBeamRuns(bar)).toEqual(
        Array.from({ length: beats }, (_, cellIndex) =>
          [0, 1, 2, 3].map((tokenIndex) => ({ cellIndex, tokenIndex })),
        ),
      );
    }
  });
});

/* The audit sheet's own scope line.
 *
 * The card read `beatUnit === "4" ? "Quarter-note beat · 4/4 and 3/4" : ...`,
 * which was true for the sixteen one-beat cells and false the moment a cell
 * could SPAN beats. A whole note is four of them and cannot appear in 3/4 at
 * all — the app refuses such a link — so the whole-note card was telling a
 * reviewer they were signing off on engraving that is never generated. An
 * audit sheet is the one document where overstating scope costs the most,
 * because a sign-off is taken at its word.
 *
 * The rule is a cell's span against the bar, not its beat unit alone. */
describe("audit scope", () => {
  const fitsIn = (cell: { beats: number }) =>
    Object.values(METERS)
      .filter((meter) => cell.beats <= meter.beatsPerMeasure)
      .map((meter) => meter.label);

  it("keeps a whole note out of the meters it cannot fill", () => {
    expect(fitsIn(getRhythmCell("whole"))).toEqual(["4/4"]);
  });

  it("still offers both meters to everything that fits a 3-beat bar", () => {
    /* A half note IS legitimate in 3/4 — two of its three beats — so this must
       not over-correct into "spanning cells are 4/4 only". */
    expect(fitsIn(getRhythmCell("half"))).toEqual(["4/4", "3/4"]);
    expect(fitsIn(getRhythmCell("half-rest"))).toEqual(["4/4", "3/4"]);
    expect(fitsIn(getRhythmCell("quarter"))).toEqual(["4/4", "3/4"]);
  });
});
