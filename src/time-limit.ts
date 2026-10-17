/* The optional time limit — recorded, never enforced.
 *
 * A teacher can put `time=5` on a link. That is a statement of how long the
 * round is MEANT to take, not a gate: the countdown reaches zero, quietly turns
 * into overtime, and the student finishes the round they started. The card
 * then says how long it took and how that compares with the limit, and a human
 * decides what it means — the same posture this app takes toward a pass mark.
 *
 * Nothing here changes the score. The answers are still judged untimed; the
 * elapsed time is reported beside them, never folded into them.
 *
 * Everything in this file is pure, so the countdown, the screen-reader line and
 * the ticket line are tested without a clock.
 */

/** Whole minutes a link may set. A limit under a minute is not a round anyone
 *  could finish calmly, and one over an hour is not a limit on a twenty-question
 *  round. */
export const MIN_TIME_LIMIT = 1;
export const MAX_TIME_LIMIT = 60;

/** `m:ss`, the way a teacher writes a duration: 4:12, 10:00, 0:07. Negative and
 *  fractional input is floored at zero seconds rather than printed as nonsense. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Whole seconds between two instants, never negative. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Whether a finished round came in at or under the limit. Exactly on the limit
 *  is within it. */
export function withinLimit(elapsed: number, limitMinutes: number): boolean {
  return Math.floor(elapsed) <= limitMinutes * 60;
}

/** What the countdown shows while the round runs: the time left, then — once
 *  the limit has passed — how far over, e.g. `+0:42 over`. */
export function timerDisplay(elapsed: number, limitMinutes: number): { readonly over: boolean; readonly text: string } {
  const remaining = limitMinutes * 60 - Math.floor(elapsed);
  return remaining >= 0
    ? { over: false, text: formatClock(remaining) }
    : { over: true, text: `+${formatClock(-remaining)} over` };
}

function minutesWord(count: number): string {
  return `${count} minute${count === 1 ? "" : "s"}`;
}

/** The line a screen reader hears. It changes at most once a minute — never
 *  every second — so a polite live region holding it speaks rarely:
 *  "5 minutes left", …, "1 minute left", "Time limit reached. Keep going…",
 *  then "1 minute over", "2 minutes over". */
export function timerAnnouncement(elapsed: number, limitMinutes: number): string {
  const remaining = limitMinutes * 60 - Math.floor(elapsed);
  if (remaining > 0) return `${minutesWord(Math.ceil(remaining / 60))} left.`;
  const over = Math.floor(-remaining / 60);
  if (over === 0) return "Time limit reached. Keep going — you can still finish.";
  return `${minutesWord(over)} over the time limit. You can still finish.`;
}

/** The ticket line, in plain words for a teacher:
 *  `Time: 4:12 (limit 5:00, within limit)` or
 *  `Time: 6:30 (limit 5:00, over by 1:30)`. */
export function timeTicketLine(elapsed: number, limitMinutes: number): string {
  return `Time: ${timeResultText(elapsed, limitMinutes)}`;
}

/** The same fact without the label, for the result card's own Time row. */
export function timeResultText(elapsed: number, limitMinutes: number): string {
  const seconds = Math.max(0, Math.floor(elapsed));
  const limit = limitMinutes * 60;
  const verdict = withinLimit(seconds, limitMinutes) ? "within limit" : `over by ${formatClock(seconds - limit)}`;
  return `${formatClock(seconds)} (limit ${formatClock(limit)}, ${verdict})`;
}
