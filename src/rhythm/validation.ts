import { formatCounts } from "./counting";
import { validateEngravingCatalog } from "./engraving";
import type { CountingSystemId, RhythmCell } from "./types";

const systems: readonly CountingSystemId[] = ["standard", "eastman", "takadimi"];

export function validateRhythmCell(cell: RhythmCell): void {
  if (!cell || typeof cell !== "object") throw new TypeError("Rhythm cell data is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cell.id)) {
    throw new TypeError("Rhythm cell IDs must be stable kebab-case strings.");
  }
  if (!Array.isArray(cell.activePositions) || cell.activePositions.length === 0) {
    throw new TypeError(`${cell.id} must contain at least one sounding position.`);
  }
  if (
    cell.activePositions.some((position) => !Number.isInteger(position) || position < 0 || position > 3) ||
    new Set(cell.activePositions).size !== cell.activePositions.length
  ) {
    throw new TypeError(`${cell.id} has malformed sounding positions.`);
  }
  const sorted = [...cell.activePositions].sort((left, right) => left - right);
  if (sorted.some((position, index) => position !== cell.activePositions[index])) {
    throw new TypeError(`${cell.id} sounding positions must be ordered.`);
  }
  if (cell.resolution === 1 && cell.activePositions.some((position) => position !== 0)) {
    throw new TypeError(`${cell.id} uses positions outside its quarter-note resolution.`);
  }
  if (cell.resolution === 2 && cell.activePositions.some((position) => position % 2 !== 0)) {
    throw new TypeError(`${cell.id} uses positions outside its eighth-note resolution.`);
  }
  const ticks = cell.notation.tokens.reduce((total, notationToken) => total + notationToken.ticks, 0);
  if (ticks !== 4) throw new TypeError(`${cell.id} notation must fill exactly one beat.`);
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
