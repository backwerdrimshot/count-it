/* The meters Count It reads, and what each one changes.
 *
 * This file exists because "4/4" was not a setting — it was an assumption
 * spread across eight files as a literal 4. The measure prompt was a fixed
 * four-tuple, the round-length ceiling was `k ** 4`, the stave asked VexFlow
 * for "4/4" by name, and `BEATS_PER_MEASURE` was exported from types.ts and
 * imported by nothing. A meter is a small object instead, so a second one
 * cannot be half-added.
 *
 * WHAT A METER ACTUALLY VARIES, today: one thing.
 *
 *   beatsPerMeasure   how many beats a bar holds        4/4 → 4, 3/4 → 3
 *
 * The beat itself is a quarter note in every meter this app reads, and it
 * divides into four sixteenth partials. That used to be a second axis: 3/8
 * counted an eighth-note beat with its own four-cell vocabulary, a whole-bar
 * beaming exception, and a whole-bars-only rule. It was removed 2026-08-29 —
 * the formatting and rule load it carried earned it an app of its own — and
 * the beat-unit axis went with it. Git history holds the full shape of what
 * left, should the two ever be recombined.
 *
 * TICKS. A sixteenth is one tick, everywhere, so a quarter beat is four ticks.
 * Keeping the tick a fixed musical value rather than a fraction of the beat is
 * what lets one validator check every cell the same way.
 */
import type { MeterId } from "./types";

export interface Meter {
  readonly id: MeterId;
  /** How the meter is written and spoken. Also the VexFlow time signature. */
  readonly label: string;
  readonly beatsPerMeasure: 3 | 4;
  /** Counted positions inside one beat. Every beat here is a quarter note, so
   *  every beat holds four — the beat, e, &, and a. Kept on the meter rather
   *  than as a loose constant so the consumers that count, grid, and distract
   *  per position all read the same source. */
  readonly partialsPerBeat: 4;
  /** VexFlow voice timing. `beatValue` is the time signature's denominator. */
  readonly vexBeatValue: 4;
}

function meter(id: MeterId, beatsPerMeasure: 3 | 4): Meter {
  return Object.freeze({
    id,
    label: id.replace("-", "/"),
    beatsPerMeasure,
    partialsPerBeat: 4 as const,
    vexBeatValue: 4 as const,
  });
}

export const METERS: Readonly<Record<MeterId, Meter>> = Object.freeze({
  "4-4": meter("4-4", 4),
  "3-4": meter("3-4", 3),
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
