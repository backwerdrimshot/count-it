import { formatCounts } from "./counting";
import { validateEngravingCatalog } from "./engraving";
import type { CountingSystemId, RhythmCell } from "./types";

const systems: readonly CountingSystemId[] = ["standard", "eastman", "takadimi"];

export function validateRhythmCell(cell: RhythmCell): void {
  if (!cell || typeof cell !== "object") throw new TypeError("Rhythm cell data is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cell.id)) {
    throw new TypeError("Rhythm cell IDs must be stable kebab-case strings.");
  }
  if (!Array.isArray(cell.activePositions)) {
    throw new TypeError(`${cell.id} must declare its sounding positions.`);
  }
  /* A cell may now be entirely silent — a half rest is two beats of nothing —
     but only a REST may be. The rule this replaces said every cell must sound,
     which was the right rule while every cell was one beat and a silent one
     would have been a beat with no notation at all. The invariant that
     actually matters moved up a level: a PROMPT must have something to count,
     and createMeasurePrompt refuses a bar that is silent throughout. */
  if (cell.activePositions.length === 0 && cell.notation.tokens.some((t) => !t.rest)) {
    throw new TypeError(`${cell.id} sounds nothing but is not written as a rest.`);
  }
  if (!Number.isInteger(cell.beats) || cell.beats < 1) {
    throw new TypeError(`${cell.id} must span a whole number of beats.`);
  }
  const partials = 4;
  if (
    cell.activePositions.some(
      (position) => !Number.isInteger(position) || position < 0 || position >= partials,
    ) ||
    new Set(cell.activePositions).size !== cell.activePositions.length
  ) {
    throw new TypeError(`${cell.id} has malformed sounding positions.`);
  }
  const sorted = [...cell.activePositions].sort((left, right) => left - right);
  if (sorted.some((position, index) => position !== cell.activePositions[index])) {
    throw new TypeError(`${cell.id} sounding positions must be ordered.`);
  }
  /* Resolution is how many EQUAL parts of its beat a cell uses, so the legal
     positions are the multiples of partials/resolution. */
  if (cell.resolution > partials) {
    throw new TypeError(`${cell.id} claims a finer resolution than its beat divides into.`);
  }
  const step = partials / cell.resolution;
  if (cell.activePositions.some((position) => position % step !== 0)) {
    throw new TypeError(`${cell.id} uses positions outside its stated resolution.`);
  }
  const ticks = cell.notation.tokens.reduce((total, notationToken) => total + notationToken.ticks, 0);
  /* A sixteenth is one tick, so a quarter beat is four ticks — times however
     many beats the cell spans. This is the check that catches a half note that
     claims to span three beats. */
  const expected = partials * cell.beats;
  if (ticks !== expected) {
    throw new TypeError(
      `${cell.id} notation must fill exactly ${cell.beats} quarter-note beat${cell.beats === 1 ? "" : "s"}.`,
    );
  }
  const tokenAttacks = cell.notation.tokens
    .filter((notationToken) => !notationToken.rest)
    .map((notationToken) => notationToken.partial);
  if (JSON.stringify(tokenAttacks) !== JSON.stringify(cell.activePositions)) {
    throw new TypeError(`${cell.id} notation attacks do not match its timing model.`);
  }
  for (const beamGroup of cell.notation.beamGroups) {
    if (
      beamGroup.length < 2 ||
      beamGroup.some(
        (index) =>
          !Number.isInteger(index) ||
          index < 0 ||
          index >= cell.notation.tokens.length ||
          cell.notation.tokens[index].rest,
      )
    ) {
      throw new TypeError(`${cell.id} contains an invalid beam recipe.`);
    }
  }
  for (const system of systems) {
    const expected = formatCounts(cell.activePositions, 1, system);
    if (cell.verifiedAnswers[system] !== expected) {
      throw new TypeError(`${cell.id} has an unverified ${system} counting answer.`);
    }
  }
}

export function validateCatalog(cells: readonly RhythmCell[]): void {
  if (!Array.isArray(cells) || cells.length === 0) throw new TypeError("A rhythm catalog is required.");
  const ids = new Set<string>();
  for (const cell of cells) {
    validateRhythmCell(cell);
    if (ids.has(cell.id)) throw new TypeError(`Duplicate rhythm cell ID: ${cell.id}`);
    ids.add(cell.id);
  }
  validateEngravingCatalog(cells);
}
