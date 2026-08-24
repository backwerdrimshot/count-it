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
}

function meter(
  id: MeterId,
  beatsPerMeasure: 3 | 4,
  beatUnit: BeatUnit,
  beamsWholeMeasure: boolean,
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
  });
}

export const METERS: Readonly<Record<MeterId, Meter>> = Object.freeze({
  "4-4": meter("4-4", 4, "4", false),
  "3-4": meter("3-4", 3, "4", false),
  /* The one meter that beams across its beats. See the header. */
  "3-8": meter("3-8", 3, "8", true),
});

export const DEFAULT_METER: MeterId = "4-4";

export const METER_IDS: readonly MeterId[] = Object.freeze(
  Object.keys(METERS) as MeterId[],
);

export function isMeterId(value: unknown): value is MeterId {
  return typeof value === "string" && Object.hasOwn(METERS, value);
}

export function getMeter(id: MeterId): Meter {
  const found = METERS[id];
  if (!found) throw new RangeError(`Unsupported meter: ${String(id)}`);
  return found;
}
