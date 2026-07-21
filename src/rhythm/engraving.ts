import type { PartialBeamDirection, RhythmCell } from "./types";

export const ENGRAVING_STANDARD_VERSION = "count-it-4-4-beginner-v1";
export const ENGRAVING_REVIEW_DATE = "2026-07-20";

export interface EngravingExpectation {
  readonly beamGroups: readonly (readonly number[])[];
  readonly dottedTokenIndexes: readonly number[];
  readonly partialBeamDirections: Readonly<Partial<Record<number, PartialBeamDirection>>>;
  readonly rationale: string;
}

function expectation(
  beamGroups: readonly (readonly number[])[],
  dottedTokenIndexes: readonly number[],
  rationale: string,
  partialBeamDirections: EngravingExpectation["partialBeamDirections"] = {},
): EngravingExpectation {
  return Object.freeze({
    beamGroups: Object.freeze(beamGroups.map((group) => Object.freeze([...group]))),
    dottedTokenIndexes: Object.freeze([...dottedTokenIndexes]),
    partialBeamDirections: Object.freeze({ ...partialBeamDirections }),
    rationale,
  });
}

// This is a hand-reviewed engraving baseline, intentionally separate from the
// rhythm recipes. Updating a recipe and its expectation requires two explicit
// changes so an accidental rendering change cannot silently validate itself.
export const ENGRAVING_EXPECTATIONS: Readonly<Record<string, EngravingExpectation>> =
  Object.freeze({
    quarter: expectation([], [], "A quarter note fills the beat and carries no beam."),
    eighths: expectation([[0, 1]], [], "Paired eighth notes share one primary beam."),
    "eighth-rest": expectation([], [], "The sounding eighth keeps its flag; the following rest is not beamed."),
    "rest-eighth": expectation([], [], "The entering eighth keeps its flag; the preceding rest is not beamed."),
    "three-rest-note": expectation([], [], "The final isolated sixteenth keeps its flags after two rests."),
    "rest-sixteenth-rest": expectation([], [], "The isolated e-position sixteenth is not beamed across rests."),
    "alternating-rests": expectation([], [], "Separated e and a attacks are not beamed across rests."),
    "rest-two-rest": expectation([[1, 2]], [], "The adjacent e and & sixteenths form one two-level beam group."),
    "dotted-eighth-sixteenth": expectation(
      [[0, 1]],
      [0],
      "The dotted eighth and final sixteenth share the beat beam; the sixteenth hook points back toward the dotted note.",
      { 1: "left" },
    ),
    "eighth-two": expectation([[0, 1, 2]], [], "The eighth and two sixteenths share a primary beam; the final pair share the secondary beam."),
    "two-eighth": expectation([[0, 1, 2]], [], "The opening sixteenths share the secondary beam and continue by primary beam to the eighth."),
    "sixteenth-eighth-sixteenth": expectation(
      [[0, 1, 2]],
      [],
      "The full group shares a primary beam; outward partial beams show the sixteenth attacks around the middle eighth.",
      { 0: "right", 2: "left" },
    ),
    sixteenths: expectation([[0, 1, 2, 3]], [], "All four sixteenths share primary and secondary beams within the beat."),
    "rest-three": expectation([[1, 2, 3]], [], "The three consecutive sixteenths after the rest are beamed together."),
    "two-rest": expectation([[0, 1]], [], "The opening sixteenth pair is beamed before the eighth rest."),
    "rest-two": expectation([[1, 2]], [], "The closing sixteenth pair is beamed after the eighth rest."),
  });

function normalizeDirections(
  value: Readonly<Partial<Record<number, PartialBeamDirection>>>,
): Record<string, PartialBeamDirection> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => Number(left) - Number(right)),
  );
}

export function getDottedTokenIndexes(cell: RhythmCell): readonly number[] {
  return Object.freeze(
    cell.notation.tokens.flatMap((token, index) => (token.dots ? [index] : [])),
  );
}

export function validateEngravingCatalog(cells: readonly RhythmCell[]): void {
  const cellIds = cells.map((cell) => cell.id).sort();
  const expectationIds = Object.keys(ENGRAVING_EXPECTATIONS).sort();
  if (JSON.stringify(cellIds) !== JSON.stringify(expectationIds)) {
    throw new TypeError("Every rhythm cell must have exactly one engraving expectation.");
  }

  for (const cell of cells) {
    const expected = ENGRAVING_EXPECTATIONS[cell.id];
    if (JSON.stringify(cell.notation.beamGroups) !== JSON.stringify(expected.beamGroups)) {
      throw new TypeError(`${cell.id} beam groups differ from the reviewed engraving baseline.`);
    }
    if (JSON.stringify(getDottedTokenIndexes(cell)) !== JSON.stringify(expected.dottedTokenIndexes)) {
      throw new TypeError(`${cell.id} dots differ from the reviewed engraving baseline.`);
    }
    if (
      JSON.stringify(normalizeDirections(cell.notation.partialBeamDirections)) !==
      JSON.stringify(normalizeDirections(expected.partialBeamDirections))
    ) {
      throw new TypeError(`${cell.id} partial beams differ from the reviewed engraving baseline.`);
    }

    const usedTokenIndexes = new Set<number>();
    for (const group of cell.notation.beamGroups) {
      for (const tokenIndex of group) {
        if (usedTokenIndexes.has(tokenIndex)) {
          throw new TypeError(`${cell.id} places a note in more than one beam group.`);
        }
        usedTokenIndexes.add(tokenIndex);
        const token = cell.notation.tokens[tokenIndex];
        if (token.duration === "4") {
          throw new TypeError(`${cell.id} attempts to beam a quarter note.`);
        }
      }
    }

    for (const [tokenIndexText, direction] of Object.entries(cell.notation.partialBeamDirections)) {
      const tokenIndex = Number(tokenIndexText);
      const token = cell.notation.tokens[tokenIndex];
      if (!token || token.duration !== "16" || token.rest || !usedTokenIndexes.has(tokenIndex)) {
        throw new TypeError(`${cell.id} contains an invalid partial-beam direction.`);
      }
      if (direction !== "left" && direction !== "right") {
        throw new TypeError(`${cell.id} contains an unsupported partial-beam direction.`);
      }
    }

    for (const dottedIndex of expected.dottedTokenIndexes) {
      const token = cell.notation.tokens[dottedIndex];
      if (!token || token.duration !== "8" || token.ticks !== 3 || token.dots !== 1 || token.rest) {
        throw new TypeError(`${cell.id} contains an invalid dotted-eighth recipe.`);
      }
    }
  }
}
