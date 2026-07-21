import { formatCounts } from "./counting";
import type {
  CountingSystemId,
  DistractorCategory,
  LevelDefinition,
  LevelId,
  NotationToken,
  PartialPosition,
  RhythmCell,
} from "./types";

export const LEVELS: readonly LevelDefinition[] = Object.freeze([
  Object.freeze({
    id: "level-1" as const,
    order: 1 as const,
    name: "Level 1 - Pulse & pairs",
    shortName: "Pulse & pairs",
    description: "Quarter notes and paired eighth notes on the beat.",
  }),
  Object.freeze({
    id: "level-2" as const,
    order: 2 as const,
    name: "Level 2 - Eighth-note placement",
    shortName: "Eighth placement",
    description: "Adds the beat and the & as independent sounding positions.",
  }),
  Object.freeze({
    id: "level-3" as const,
    order: 3 as const,
    name: "Level 3 - Sixteenth-note cells",
    shortName: "Sixteenth cells",
    description: "Adds verified e and a placements and common mixed cells.",
  }),
]);

const allDistractors: readonly DistractorCategory[] = Object.freeze([
  "omitted_sound",
  "added_sound",
  "shifted_subdivision",
  "eighth_sixteenth_confusion",
  "wrong_beat_number",
]);

function token(
  duration: NotationToken["duration"],
  partial: PartialPosition,
  rest = false,
): NotationToken {
  return Object.freeze({
    duration,
    partial,
    ticks: duration === "4" ? 4 : duration === "8" ? 2 : 1,
    ...(rest ? { rest: true as const } : {}),
  });
}

function dottedEighth(partial: PartialPosition): NotationToken {
  return Object.freeze({ duration: "8" as const, partial, ticks: 3 as const, dots: 1 as const });
}

function buildCell(
  id: string,
  label: string,
  shortLabel: string,
  resolution: 1 | 2 | 4,
  difficulty: 1 | 2 | 3,
  activePositions: readonly PartialPosition[],
  verifiedStandardAnswer: string,
  tokens: readonly NotationToken[],
  beamGroups: readonly (readonly number[])[],
  explanation: string,
  partialBeamDirections: RhythmCell["notation"]["partialBeamDirections"] = {},
): RhythmCell {
  const minLevel = `level-${difficulty}` as LevelId;
  const restPositions = [0, 1, 2, 3].filter(
    (position) => !activePositions.includes(position as PartialPosition),
  ) as PartialPosition[];
  const verifiedAnswers: Record<CountingSystemId, string> = {
    standard: verifiedStandardAnswer,
    eastman: formatCounts(activePositions, 1, "eastman"),
    takadimi: formatCounts(activePositions, 1, "takadimi"),
  };

  return Object.freeze({
    id,
    label,
    shortLabel,
    resolution,
    activePositions: Object.freeze([...activePositions]),
    restPositions: Object.freeze(restPositions),
    difficulty,
    minLevel,
    verifiedAnswers: Object.freeze(verifiedAnswers),
    notation: Object.freeze({
      tokens: Object.freeze([...tokens]),
      beamGroups: Object.freeze(beamGroups.map((group) => Object.freeze([...group]))),
      partialBeamDirections: Object.freeze({ ...partialBeamDirections }),
    }),
    explanation,
    permittedDistractors: allDistractors,
  });
}

// These recipes are adapted from Rhythm Repper's verified straight-grid cells.
// Each recipe fills exactly one quarter-note beat and never infers timing from SVG.
export const RHYTHM_CELLS: readonly RhythmCell[] = Object.freeze([
  buildCell("quarter", "Quarter note", "Quarter", 1, 1, [0], "1", [token("4", 0)], [], "The note begins on the beat, so say the beat number."),
  buildCell("eighths", "Two eighth notes", "Two eighths", 2, 1, [0, 2], "1 &", [token("8", 0), token("8", 2)], [[0, 1]], "The notes sound on the beat and on the & halfway through it."),
  buildCell("eighth-rest", "Eighth note, then rest", "Beat, then rest", 2, 2, [0], "1", [token("8", 0), token("8", 2, true)], [], "Only the first eighth sounds. Say the beat number and keep the & silent."),
  buildCell("rest-eighth", "Eighth rest, then note", "Rest, then &", 2, 2, [2], "&", [token("8", 0, true), token("8", 2)], [], "The beat is silent; the note enters on the &."),
  buildCell("three-rest-note", "Eighth rest, sixteenth rest, note", "Only a", 4, 3, [3], "a", [token("8", 0, true), token("16", 2, true), token("16", 3)], [], "The only sounding sixteenth is the final a of the beat."),
  buildCell("rest-sixteenth-rest", "Sixteenth rest, note, eighth rest", "Only e", 4, 3, [1], "e", [token("16", 0, true), token("16", 1), token("8", 2, true)], [], "The only sounding sixteenth is e, just after the beat."),
  buildCell("alternating-rests", "Rest, note, rest, note", "e and a", 4, 3, [1, 3], "e a", [token("16", 0, true), token("16", 1), token("16", 2, true), token("16", 3)], [], "The notes sound on e and a; the beat and & remain silent."),
  buildCell("rest-two-rest", "Rest, two notes, rest", "e and &", 4, 3, [1, 2], "e &", [token("16", 0, true), token("16", 1), token("16", 2), token("16", 3, true)], [[1, 2]], "The notes sound on e and &, between silent outer sixteenths."),
  buildCell("dotted-eighth-sixteenth", "Dotted eighth, sixteenth", "Beat and a", 4, 3, [0, 3], "1 a", [dottedEighth(0), token("16", 3)], [[0, 1]], "The dotted eighth starts on the beat and the final note lands on a.", { 1: "left" }),
  buildCell("eighth-two", "Eighth, two sixteenths", "Beat, & and a", 4, 3, [0, 2, 3], "1 & a", [token("8", 0), token("16", 2), token("16", 3)], [[0, 1, 2]], "The eighth begins on the beat, followed by notes on & and a."),
  buildCell("two-eighth", "Two sixteenths, eighth", "Beat, e and &", 4, 3, [0, 1, 2], "1 e &", [token("16", 0), token("16", 1), token("8", 2)], [[0, 1, 2]], "The first three subdivision positions sound: the beat, e, and &."),
  buildCell("sixteenth-eighth-sixteenth", "Sixteenth, eighth, sixteenth", "Beat, e and a", 4, 3, [0, 1, 3], "1 e a", [token("16", 0), token("8", 1), token("16", 3)], [[0, 1, 2]], "The rhythm sounds on the beat, e, and a; the & is held through.", { 0: "right", 2: "left" }),
  buildCell("sixteenths", "Four sixteenth notes", "All four", 4, 3, [0, 1, 2, 3], "1 e & a", [token("16", 0), token("16", 1), token("16", 2), token("16", 3)], [[0, 1, 2, 3]], "Every sixteenth subdivision sounds: the beat, e, &, and a."),
  buildCell("rest-three", "Rest, then three sixteenths", "e, & and a", 4, 3, [1, 2, 3], "e & a", [token("16", 0, true), token("16", 1), token("16", 2), token("16", 3)], [[1, 2, 3]], "The beat is silent, then e, &, and a sound in order."),
  buildCell("two-rest", "Two sixteenths, eighth rest", "Beat and e", 4, 3, [0, 1], "1 e", [token("16", 0), token("16", 1), token("8", 2, true)], [[0, 1]], "The notes sound on the beat and e; the second half is silent."),
  buildCell("rest-two", "Eighth rest, two sixteenths", "& and a", 4, 3, [2, 3], "& a", [token("8", 0, true), token("16", 2), token("16", 3)], [[1, 2]], "The first half is silent, then the notes sound on & and a."),
]);

const CELL_BY_ID = new Map(RHYTHM_CELLS.map((cell) => [cell.id, cell]));

export function getRhythmCell(id: string): RhythmCell {
  const cell = CELL_BY_ID.get(id);
  if (!cell) throw new RangeError(`Unsupported rhythm cell: ${id}`);
  return cell;
}

export function getLevel(levelId: LevelId): LevelDefinition {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  if (!level) throw new RangeError(`Unsupported level: ${String(levelId)}`);
  return level;
}

export function getCellsForLevel(levelId: LevelId): readonly RhythmCell[] {
  const level = getLevel(levelId);
  return Object.freeze(RHYTHM_CELLS.filter((cell) => cell.difficulty <= level.order));
}
