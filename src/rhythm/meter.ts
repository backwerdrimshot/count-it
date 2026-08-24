/* The meters Count It reads, and what each one changes.
 *
 * This file exists because "4/4" was not a setting — it was an assumption
 * spread across eight files as a literal 4. The measure prompt was a fixed
 * four-tuple, the round-length ceiling was `k ** 4`, the stave asked VexFlow
 * for "4/4" by name, and `BEATS_PER_MEASURE` was exported from types.ts and
 * imported by nothing. A meter is a small object instead, so a second one
 * cannot be half-added.
 *
 * WHAT A METER ACTUALLY VARIES. Two things, and they are independent:
 *
 *   beatsPerMeasure   how many beats a bar holds        4/4 → 4, 3/4 → 3, 3/8 → 3
 *   beatUnit          which written note IS the beat    4/4 and 3/4 → quarter,
 *                                                       3/8 → eighth
 *
 * 3/4 varies only the first. The beat is still a quarter, it still divides
 * into four sixteenth partials, and every one of the sixteen catalog cells is
 * still a legal beat — which is why 3/4 costs a number and 3/8 costs a
 * vocabulary. The shop's own lesson makes the same point: "3/4 and 3/8 are two
 * spellings of the same thing... in 3/8 the beat is an eighth, so half a beat
 * is a sixteenth. Same count, same sticking, same sound at the same beat
 * speed."
 *
 * TICKS. A sixteenth is one tick, everywhere, in every meter. A quarter beat is
 * therefore four ticks and an eighth beat is two. Keeping the tick a fixed
 * musical value rather than a fraction of the beat is what lets one validator
 * check both families.
 *
 * FULL-MEASURE BEAMING IN 3/8 is a deliberate exception to this app's house
 * rule that a beam never crosses a beat, and it is not this app's invention:
 * the Rhythms in Three lesson already teaches it, and the Theory Reference
 * poster already prints it. "In 3/8 the whole bar beams as one group, because
 * at that level the measure itself is the unit — a fast 3/8 is often felt as
 * one pulse per bar rather than three." An app that beamed 3/8 beat-by-beat
 * would contradict the poster on the wall of the room using it.
 */
import type { BeatUnit, MeterId, PartialCount } from "./types";

export interface Meter {
  readonly id: MeterId;
  /** How the meter is written and spoken. Also the VexFlow time signature. */
  readonly label: string;
  readonly beatsPerMeasure: 3 | 4;
  readonly beatUnit: BeatUnit;
  /** Counted positions inside one beat: 4 for a quarter beat, 2 for an eighth. */
  readonly partialsPerBeat: PartialCount;
  /** Sixteenth-ticks one beat holds. Always partialsPerBeat, kept separate
   *  because they answer different questions — one is notation, one is counting. */
  readonly ticksPerBeat: PartialCount;
  /** True where a beam is drawn across the whole bar rather than per beat. */
  readonly beamsWholeMeasure: boolean;
  /** VexFlow voice timing. `beatValue` is the denominator, not the beat unit. */
  readonly vexBeatValue: 4 | 8;
  /** Whether a one-beat question can be ASKED in this meter.
   *
   *  False where a beat is too small a slice of the bar to draw as one: in
   *  3/8 the beat IS an eighth, so a one-beat prompt is a third of a measure
   *  and the stave shows a bar with two thirds missing. The app spent a day
   *  trying to make that read honestly — closing the barline claimed a
   *  complete bar the arithmetic denied, and leaving it open drew a 3/8
   *  signature trailing into empty space. Neither is a measure, because the
   *  prompt is not one.
   *
   *  A meter that beams across its whole bar is saying the bar is the unit;
   *  asking a third of it was always working against that. Stated as data so
   *  a fourth meter declares its own answer and the refusal has one source. */
  readonly allowsBeatScope: boolean;
}

function meter(
  id: MeterId,
  beatsPerMeasure: 3 | 4,
  beatUnit: BeatUnit,
  beamsWholeMeasure: boolean,
  allowsBeatScope: boolean,
): Meter {
  const partialsPerBeat: PartialCount = beatUnit === "4" ? 4 : 2;
  return Object.freeze({
    id,
    label: id.replace("-", "/"),
    beatsPerMeasure,
    beatUnit,
    partialsPerBeat,
    ticksPerBeat: partialsPerBeat,
    beamsWholeMeasure,
    vexBeatValue: beatUnit === "4" ? (4 as const) : (8 as const),
    allowsBeatScope,
  });
}

export const METERS: Readonly<Record<MeterId, Meter>> = Object.freeze({
  "4-4": meter("4-4", 4, "4", false, true),
  "3-4": meter("3-4", 3, "4", false, true),
  /* The one meter that beams across its beats, and the one that asks whole
     bars only. Both for the same reason: in 3/8 the bar is the unit. */
  "3-8": meter("3-8", 3, "8", true, false),
});

export const DEFAULT_METER: MeterId = "4-4";

export const METER_IDS: readonly MeterId[] = Object.freeze(
  Object.keys(METERS) as MeterId[],
);

export function isMeterId(value: unknown): value is MeterId {
  return typeof value === "string" && Object.hasOwn(METERS, value);
}

/* Where each cell of a measure prompt starts, as a beat number.
 *
 * This was `index + 1` in four different files, which is the same statement as
 * "every cell is one beat" written four times. A half note is two beats, so the
 * cell after it starts on beat three — and an answer that numbered it two would
 * be teaching the bar wrong, not merely rendering it wrong. */
export function beatStarts(cells: readonly { readonly beats: number }[]): readonly number[] {
  let beat = 1;
  return Object.freeze(
    cells.map((cell) => {
      const start = beat;
      beat += cell.beats;
      return start;
    }),
  );
}

/** Total beats a run of cells occupies. */
export function beatSpan(cells: readonly { readonly beats: number }[]): number {
  return cells.reduce((total, cell) => total + cell.beats, 0);
}

export function getMeter(id: MeterId): Meter {
  const found = METERS[id];
  if (!found) throw new RangeError(`Unsupported meter: ${String(id)}`);
  return found;
}
