import { formatCounts } from "./counting";
import type {
  BeatUnit,
  CountingSystemId,
  PartialCount,
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
  beatUnit: BeatUnit = "4",
): RhythmCell {
  const minLevel = `level-${difficulty}` as LevelId;
  const partials: PartialCount = beatUnit === "4" ? 4 : 2;
  /* Bounded by the beat, not by the number four. An eighth beat has two
     counted positions, so its silent positions can only be 0 and 1 — listing
     2 and 3 as rests would describe time the beat does not contain. */
  const restPositions = Array.from({ length: partials }, (_, position) => position).filter(
    (position) => !activePositions.includes(position as PartialPosition),
  ) as PartialPosition[];
  const verifiedAnswers: Record<CountingSystemId, string> = {
    standard: verifiedStandardAnswer,
    eastman: formatCounts(activePositions, 1, "eastman", partials),
    takadimi: formatCounts(activePositions, 1, "takadimi", partials),
  };

  return Object.freeze({
    id,
    label,
    shortLabel,
    beatUnit,
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

/* The eighth-beat catalog, for 3/8.
 *
 * A separate list rather than more rows above, because these cells are not
 * harder versions of the ones above — they are the same beat written smaller.
 * The lesson makes the equivalence explicit: "in 3/8 the beat is an eighth, so
 * half a beat is a sixteenth. Same count, same sticking, same sound at the
 * same beat speed." So `eighth-beat` here is `quarter` up there, and
 * `two-sixteenths` is `eighths`, note for note and count for count.
 *
 * Four cells, not sixteen. An eighth beat divides in two, so there are only
 * four things a beat can be: sound it, split it, sound the first half, sound
 * the second half. That is the entire vocabulary — the list is short because
 * the meter is, not because it is unfinished.
 *
 * Difficulty 1 throughout, and deliberately: a student meeting 3/8 is not
 * meeting a harder subdivision, they are meeting a smaller note value for a
 * beat they can already count. Grading these 2 or 3 would hide them behind a
 * level gate that has nothing to do with what makes them unfamiliar. */
export const EIGHTH_BEAT_CELLS: readonly RhythmCell[] = Object.freeze([
  buildCell("eighth-beat", "Eighth note", "Eighth", 1, 1, [0], "1", [token("8", 0)], [], "The eighth note IS the beat in 3/8, so say the beat number.", {}, "8"),
  buildCell("two-sixteenths", "Two sixteenth notes", "Two sixteenths", 2, 1, [0, 1], "1 &", [token("16", 0), token("16", 1)], [[0, 1]], "The beat splits in two: the beat itself and the & halfway through it.", {}, "8"),
  buildCell("sixteenth-rest", "Sixteenth note, then rest", "Beat, then rest", 2, 1, [0], "1", [token("16", 0), token("16", 1, true)], [], "Only the first half sounds. Say the beat number and keep the & silent.", {}, "8"),
  buildCell("rest-sixteenth", "Sixteenth rest, then note", "Rest, then &", 2, 1, [1], "&", [token("16", 0, true), token("16", 1)], [], "The beat is silent; the note enters on the & halfway through it.", {}, "8"),
]);

/* Every cell this app knows, both beat families. Order matters: `getCellsByIds`
   returns catalog order so two links naming the same cells in either order are
   the same round, and the quarter-beat family keeps the positions it has held
   since the first release. */
export const ALL_RHYTHM_CELLS: readonly RhythmCell[] = Object.freeze([
  ...RHYTHM_CELLS,
  ...EIGHTH_BEAT_CELLS,
]);

const CELL_BY_ID = new Map(ALL_RHYTHM_CELLS.map((cell) => [cell.id, cell]));

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

/* A level names a vocabulary WITHIN one beat family. Levels describe how a
   quarter beat subdivides, which is a question an eighth beat does not ask —
   so a 3/8 round takes the whole eighth-beat catalog at every level rather
   than pretending the three-level ladder means something there. */
export function getCellsForLevel(
  levelId: LevelId,
  beatUnit: BeatUnit = "4",
): readonly RhythmCell[] {
  if (beatUnit === "8") return EIGHTH_BEAT_CELLS;
  const level = getLevel(levelId);
  return Object.freeze(RHYTHM_CELLS.filter((cell) => cell.difficulty <= level.order));
}

/* An EXPLICIT cell vocabulary, named by id.
 *
 * Levels are cumulative — level 2 contains level 1 — so a step that teaches
 * only the rest-entry cells ("beat then rest", "rest then &") cannot be
 * expressed as a level. This is how an assignment names its own vocabulary,
 * and it is the Count It counterpart of Mallet Map's note pool.
 *
 * Order follows the catalog rather than the caller, so two links naming the
 * same cells in different orders are the same round. An unknown id throws:
 * the assignment layer validates and reports before this is ever reached, and
 * a silent drop here would teach a different step than the one assigned. */
export function getCellsByIds(ids: readonly string[]): readonly RhythmCell[] {
  const wanted = new Set(ids);
  for (const id of wanted) {
    if (!CELL_BY_ID.has(id)) throw new RangeError(`Unsupported rhythm cell: ${id}`);
  }
  return Object.freeze(ALL_RHYTHM_CELLS.filter((cell) => wanted.has(cell.id)));
}
