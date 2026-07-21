import { describe, expect, it } from "vitest";
import {
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_STANDARD_VERSION,
  RHYTHM_CELLS,
  createMeasurePrompt,
  getDottedTokenIndexes,
  getRhythmCell,
  validateEngravingCatalog,
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
};

const EXPECTED_DOTS: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  RHYTHM_CELLS.map((cell) => [cell.id, cell.id === "dotted-eighth-sixteenth" ? [0] : []]),
);

const EXPECTED_PARTIALS = {
  "dotted-eighth-sixteenth": { 1: "left" },
  "sixteenth-eighth-sixteenth": { 0: "right", 2: "left" },
} as const;

describe("reviewed engraving contract", () => {
  it("locks an independent beam and dot expectation for every cell", () => {
    expect(ENGRAVING_STANDARD_VERSION).toBe("count-it-4-4-beginner-v1");
    expect(Object.keys(ENGRAVING_EXPECTATIONS).sort()).toEqual(
      RHYTHM_CELLS.map((cell) => cell.id).sort(),
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
    expect(() => validateEngravingCatalog(RHYTHM_CELLS)).not.toThrow();
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
