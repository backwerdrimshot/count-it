import { describe, expect, it } from "vitest";
import {
  ALL_RHYTHM_CELLS,
  COUNTING_SYSTEMS,
  SPANNING_CELLS,
  LEVELS,
  RHYTHM_CELLS,
  createBeatPrompt,
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
    expect(() => validateCatalog(ALL_RHYTHM_CELLS)).not.toThrow();
    expect(new Set(ALL_RHYTHM_CELLS.map((cell) => cell.id)).size).toBe(ALL_RHYTHM_CELLS.length);
    expect(RHYTHM_CELLS.length).toBe(16);
    expect(SPANNING_CELLS.length).toBe(3);
    /* The 3/8 eighth-beat family was removed 2026-08-29 toward an app of its
       own. Its ids must stay retired: a link written against them is refused,
       and a new cell reusing one would quietly change what an old link means. */
    for (const retired of ["eighth-beat", "two-sixteenths", "sixteenth-rest", "rest-sixteenth"]) {
      expect(ALL_RHYTHM_CELLS.some((cell) => cell.id === retired)).toBe(false);
    }
  });

  it("fills exactly the beats it spans, in ticks", () => {
    /* A sixteenth is one tick, so a quarter beat is four of them. */
    const ticks = (cell: RhythmCell) =>
      cell.notation.tokens.reduce((total, token) => total + token.ticks, 0);
    expect(RHYTHM_CELLS.map(ticks)).toEqual(RHYTHM_CELLS.map(() => 4));
    /* Times the SPAN. A half note is two quarter beats, so eight ticks. */
    expect(SPANNING_CELLS.map(ticks)).toEqual(SPANNING_CELLS.map((c) => 4 * c.beats));
    expect(SPANNING_CELLS.map((c) => c.beats)).toEqual([2, 2, 4]);
    expect(RHYTHM_CELLS.every((c) => c.beats === 1)).toBe(true);

    const smuggled = {
      ...RHYTHM_CELLS[1],
      id: "smuggled",
      notation: SPANNING_CELLS[0].notation,
    } as unknown as RhythmCell;
    expect(() => validateRhythmCell(smuggled)).toThrow(/must fill exactly 1 quarter-note beat/);
  });

  it("counts a 3/4 bar as three quarter beats", () => {
    /* 3/4 keeps the quarter beat and loses only the fourth of them. */
    expect(getCompleteReference("measure", "standard", "3-4")).toBe(
      "1 e & a | 2 e & a | 3 e & a",
    );
    expect(getCompleteReference("measure")).toBe("1 e & a | 2 e & a | 3 e & a | 4 e & a");
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
    /* The bar is filled by SPAN now, not by counting cells — three quarters is
       three beats and a 4/4 bar holds four, so the message names beats. */
    expect(() => createMeasurePrompt(["quarter", "quarter", "quarter"] as never)).toThrow(
      /4\/4 measure holds 4 beats; these rhythms fill 3/,
    );
    /* A 3/4 bar takes three of the same cells, and a fourth is now the error. */
    expect(() =>
      createMeasurePrompt(["quarter", "quarter", "quarter"], "3-4"),
    ).not.toThrow();
    expect(() =>
      createMeasurePrompt(["quarter", "quarter", "quarter", "quarter"], "3-4"),
    ).toThrow(/3\/4 measure holds 3 beats; these rhythms fill 4/);
    /* The retired 3/8 vocabulary stays retired: its ids resolve to nothing. */
    expect(() => getRhythmCell("eighth-beat")).toThrow(/Unsupported rhythm cell/);
  });
});

describe("notes that last longer than a beat", () => {
  it("counts only where the note starts, and numbers what follows by span", () => {
    /* The reading skill: a half note on beat one answers "1" and beat two
       contributes nothing, because it is held rather than struck. Then the
       quarter after it is beat THREE — numbering it two would teach the bar
       wrong, which is the whole reason cells carry a span. */
    const bar = createMeasurePrompt(["half", "quarter", "quarter"]);
    expect(getPromptAnswer(bar)).toBe("1 | 3 | 4");
    expect(getPromptAnswer(createMeasurePrompt(["whole"]))).toBe("1");
    expect(getPromptAnswer(createMeasurePrompt(["quarter", "quarter", "half"]))).toBe("1 | 2 | 3");
    /* A rest contributes nothing and still consumes its beats. */
    expect(getPromptAnswer(createMeasurePrompt(["half-rest", "quarter", "quarter"]))).toBe("3 | 4");
    expect(getPromptAnswer(createMeasurePrompt(["quarter", "eighths", "half-rest"]))).toBe("1 | 2 &");
    /* Half notes work in 3/4, where two of them would overfill the bar. */
    expect(getPromptAnswer(createMeasurePrompt(["half", "quarter"], "3-4"))).toBe("1 | 3");
  });

  it("refuses a bar that does not add up, and a beat that cannot hold one", () => {
    expect(() => createMeasurePrompt(["half", "half", "quarter"])).toThrow(
      /4\/4 measure holds 4 beats; these rhythms fill 5/,
    );
    expect(() => createMeasurePrompt(["whole"], "3-4")).toThrow(
      /3\/4 measure holds 3 beats; these rhythms fill 4/,
    );
    /* "How long does this last?" is not a question one beat can pose. */
    expect(() => createBeatPrompt("half")).toThrow(/spans 2 beats/);
    expect(() => createBeatPrompt("whole")).toThrow(/spans 4 beats/);
    /* And a bar of nothing but rests has no count to ask for. */
    expect(() => createMeasurePrompt(["half-rest", "half-rest"])).toThrow(
      /must sound at least one note/,
    );
  });

  it("keeps every level's vocabulary exactly what it was", () => {
    /* THE promise this whole change had to keep. A spanning cell in a level
       would re-roll every full-measure round that level has ever generated —
       every assignment link already posted in a classroom would silently
       become a different round, which is the one thing a seed exists to
       prevent. They are opt-in by `cells=` only. */
    for (const level of LEVELS) {
      const ids = getCellsForLevel(level.id).map((cell) => cell.id);
      expect(ids.filter((id) => SPANNING_CELLS.some((cell) => cell.id === id))).toEqual([]);
    }
    expect(getCellsForLevel("level-3").length).toBe(16);
  });
});
