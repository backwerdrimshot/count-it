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
 *   beatsPerMeasure   how many beats a bar holds   2/4 → 2 … 7/4 → 7
 *
 * Every meter here is a QUARTER-NOTE-BEAT meter: simple time, the beat divides
 * into four sixteenth partials, and a bar is a whole number of those beats.
 * That is the whole admission rule. A meter whose beat is an eighth (3/8), a
 * half (2/2), or a dotted quarter (6/8) is a different counting problem — its
 * own vocabulary, its own beaming, its own syllables — and does not belong
 * here. 3/8 left for Eight Time on 2026-08-29 for exactly that reason.
 *
 * 5/4 and 7/4 are admitted on the same terms as 3/4: the count is 1–5 or 1–7
 * and nothing else changes. Beaming stays inside each beat, so the 3+2 / 2+3
 * grouping an odd meter is sometimes written with is not drawn or asked.
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
  readonly beatsPerMeasure: 2 | 3 | 4 | 5 | 7;
  /** Counted positions inside one beat. Every beat here is a quarter note, so
   *  every beat holds four — the beat, e, &, and a. Kept on the meter rather
   *  than as a loose constant so the consumers that count, grid, and distract
   *  per position all read the same source. */
  readonly partialsPerBeat: 4;
  /** VexFlow voice timing. `beatValue` is the time signature's denominator. */
  readonly vexBeatValue: 4;
}

function meter(id: MeterId, beatsPerMeasure: Meter["beatsPerMeasure"]): Meter {
  return Object.freeze({
    id,
    label: id.replace("-", "/"),
    beatsPerMeasure,
    partialsPerBeat: 4 as const,
    vexBeatValue: 4 as const,
  });
}

/* Listed in order of bar length, which is the order the setup panel offers
   them in. Nothing keys off the position: seeds mix in the meter's id, not its
   index, so reordering this list cannot move a round. */
export const METERS: Readonly<Record<MeterId, Meter>> = Object.freeze({
  "2-4": meter("2-4", 2),
  "3-4": meter("3-4", 3),
  "4-4": meter("4-4", 4),
  "5-4": meter("5-4", 5),
  "7-4": meter("7-4", 7),
});

export const DEFAULT_METER: MeterId = "4-4";

/** The longest bar any meter holds. A beat number above this cannot exist. */
export const MAX_BEATS_PER_MEASURE: number = Math.max(
  ...Object.values(METERS).map((entry) => entry.beatsPerMeasure),
);

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
