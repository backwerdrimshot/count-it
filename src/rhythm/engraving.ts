import { getMeter } from "./meter";
import type { PartialBeamDirection, RhythmCell, RhythmPrompt } from "./types";

/* Renamed from `count-it-4-4-beginner-v1` when the app stopped being 4/4 only.
   The version is part of the reviewed baseline's identity, so widening what it
   covers is a new version rather than the same name meaning more. The 4/4 and
   3/4 rows below are the 2026-07-20 baseline unchanged; the eighth-beat rows
   are new and carry their own review state — see the sign-off table in
   docs/notation-engraving-standard.md, where the eighth-beat family is
   recorded as awaiting human visual review. */
export const ENGRAVING_STANDARD_VERSION = "count-it-simple-meters-beginner-v2";
export const ENGRAVING_REVIEW_DATE = "2026-07-20";
export const EIGHTH_BEAT_REVIEW_DATE: string | null = null;

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

    /* The eighth-beat family, for 3/8. Within a beat these follow the same
       house rules as everything above: a beam joins adjacent sounding notes
       and never crosses a rest. What differs happens one level up, in the
       measure renderer, where 3/8 beams the whole bar as one group. That
       exception is recorded in MEASURE_BEAM_POLICY below rather than here,
       because it is a property of the meter and not of any cell. */
    "eighth-beat": expectation([], [], "A lone eighth fills the 3/8 beat and carries no beam of its own."),
    "two-sixteenths": expectation([[0, 1]], [], "The two sixteenths dividing the beat share one beam."),
    "sixteenth-rest": expectation([], [], "The sounding sixteenth keeps its flags; the following rest is not beamed."),
    "rest-sixteenth": expectation([], [], "The entering sixteenth keeps its flags; the preceding rest is not beamed."),
  });

/* Why a beam may cross a beat, in one meter only.
 *
 * The house rule everywhere else is that a beam stays inside its beat, and the
 * measure renderer has never made a cross-beat beam. 3/8 is the exception, and
 * this app did not decide it: the Rhythms in Three lesson teaches it and the
 * Theory Reference poster prints it — "in 3/8 the whole bar beams as one
 * group, because at that level the measure itself is the unit — a fast 3/8 is
 * often felt as one pulse per bar rather than three."
 *
 * The rule is stated as data so the renderer reads it instead of testing the
 * meter id inline, and so a test can assert the exception exists in exactly
 * one meter. Rests still break a beam: a bar with a rest in it beams the
 * sounding runs on either side, which is the same rule as everywhere else. */
export const MEASURE_BEAM_POLICY: Readonly<Record<string, "per-beat" | "whole-measure">> =
  Object.freeze({
    "4-4": "per-beat",
    "3-4": "per-beat",
    "3-8": "whole-measure",
  });

/** One note as it will be drawn, addressed by the cell and token it came from. */
export interface BeamMember {
  readonly cellIndex: number;
  readonly tokenIndex: number;
}

/* Which notes share a beam, for a whole prompt.
 *
 * This was inline in the React effect that drives VexFlow, which meant the one
 * piece of engraving this app decides at RENDER time — rather than reading off
 * a reviewed per-cell expectation — was the only piece no test could reach. It
 * is the 3/8 whole-bar beam, i.e. exactly the rule that breaks the house style,
 * so it was the last thing that should have been untestable.
 *
 * Per-beat meters return each cell's reviewed beam groups unchanged. 3/8
 * returns maximal runs of adjacent beamable sounding notes ACROSS the bar. A
 * rest ends a run in both cases — the house style has never beamed across one
 * and nothing about 3/8 changes that — and a run of one note keeps its flags. */
export function measureBeamRuns(prompt: RhythmPrompt): readonly (readonly BeamMember[])[] {
  const meter = getMeter(prompt.meter);
  const wholeMeasure =
    prompt.scope === "measure" && MEASURE_BEAM_POLICY[meter.id] === "whole-measure";

  if (!wholeMeasure) {
    return Object.freeze(
      prompt.cells.flatMap((cell, cellIndex) =>
        cell.notation.beamGroups.map((group) =>
          Object.freeze(group.map((tokenIndex) => Object.freeze({ cellIndex, tokenIndex }))),
        ),
      ),
    );
  }

  const runs: BeamMember[][] = [];
  let run: BeamMember[] = [];
  const flush = () => {
    if (run.length > 1) runs.push(run);
    run = [];
  };
  prompt.cells.forEach((cell, cellIndex) => {
    cell.notation.tokens.forEach((token, tokenIndex) => {
      if (token.rest || token.duration === "4") flush();
      else run.push({ cellIndex, tokenIndex });
    });
  });
  flush();
  return Object.freeze(
    runs.map((entries) => Object.freeze(entries.map((entry) => Object.freeze(entry)))),
  );
}

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

/* Two directions, deliberately split.
 *
 * This used to be one strict equality between the catalog's ids and the
 * expectation table's keys, which said both things at once — no cell without a
 * review, no review without a cell — and worked only while there was exactly
 * one catalog. `validateCatalog` is also called on SUBSETS (a level's
 * vocabulary, a link's explicit pool), where "every expectation has a cell" is
 * not a fact about the subset and failed on a correct catalog the moment a
 * second beat family existed.
 *
 * So: every cell handed here must have a reviewed expectation, checked on
 * whatever set is passed. And separately, no expectation may sit unused across
 * the whole catalog — an orphan is a review for notation nobody ships, which
 * is how a stale expectation would outlive the cell it described. */
export function validateEngravingExpectationsAreUsed(cells: readonly RhythmCell[]): void {
  const cellIds = new Set(cells.map((cell) => cell.id));
  const orphans = Object.keys(ENGRAVING_EXPECTATIONS).filter((id) => !cellIds.has(id));
  if (orphans.length > 0) {
    throw new TypeError(
      `Engraving expectations describe cells that do not exist: ${orphans.sort().join(", ")}.`,
    );
  }
}

export function validateEngravingCatalog(cells: readonly RhythmCell[]): void {
  const missing = cells
    .filter((cell) => !Object.hasOwn(ENGRAVING_EXPECTATIONS, cell.id))
    .map((cell) => cell.id);
  if (missing.length > 0) {
    throw new TypeError(
      `Every rhythm cell must have exactly one engraving expectation; missing: ${missing.sort().join(", ")}.`,
    );
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
