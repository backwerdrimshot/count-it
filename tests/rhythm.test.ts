import { describe, expect, it } from "vitest";
import {
  COUNTING_SYSTEMS,
  LEVELS,
  RHYTHM_CELLS,
  createMeasurePrompt,
  formatCounts,
  getCellsForLevel,
  getCompleteReference,
  getPromptAnswer,
  getRhythmCell,
  validateCatalog,
  validateRhythmCell,
  type RhythmCell,
} from "../src/rhythm";

describe("verified rhythm catalog", () => {
  it("has stable unique IDs and validates every complete beat recipe", () => {
    expect(() => validateCatalog(RHYTHM_CELLS)).not.toThrow();
    expect(new Set(RHYTHM_CELLS.map((cell) => cell.id)).size).toBe(RHYTHM_CELLS.length);
    expect(RHYTHM_CELLS.length).toBe(16);
  });

  it("keeps each verified counting answer tied to sounding positions", () => {
    for (const cell of RHYTHM_CELLS) {
      for (const system of Object.keys(COUNTING_SYSTEMS) as (keyof typeof COUNTING_SYSTEMS)[]) {
        expect(cell.verifiedAnswers[system]).toBe(formatCounts(cell.activePositions, 1, system));
      }
      expect(cell.activePositions.length).toBeGreaterThan(0);
    }
  });

  it("filters the cumulative vocabulary by selected level", () => {
    expect(LEVELS.map((level) => getCellsForLevel(level.id).length)).toEqual([2, 4, 16]);
    for (const level of LEVELS) {
      expect(getCellsForLevel(level.id).every((cell) => cell.difficulty <= level.order)).toBe(true);
    }
  });

  it("numbers all four beats correctly in a measure answer and reference", () => {
    const prompt = createMeasurePrompt([
      "quarter",
      "rest-eighth",
      "dotted-eighth-sixteenth",
      "sixteenths",
    ]);
    expect(getPromptAnswer(prompt)).toBe("1 | & | 3 a | 4 e & a");
    expect(getCompleteReference("measure")).toBe(
      "1 e & a | 2 e & a | 3 e & a | 4 e & a",
    );
  });

  it("fails safely for unsupported cells and malformed data", () => {
    expect(() => getRhythmCell("triplets-not-supported")).toThrow(/Unsupported rhythm cell/);
    const malformed = {
      ...RHYTHM_CELLS[0],
      id: "bad cell id",
      activePositions: [0, 0],
    } as unknown as RhythmCell;
    expect(() => validateRhythmCell(malformed)).toThrow();
    expect(() => formatCounts([4])).toThrow(/0 through 3/);
    expect(() => createMeasurePrompt(["quarter", "quarter", "quarter"] as never)).toThrow(
      /exactly four/,
    );
  });
});
