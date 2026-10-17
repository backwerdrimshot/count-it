/* Badges and a practice streak, earned only from finished rounds.

   Kept on this device like the practice history: no names, no class IDs, and
   nothing here is sent anywhere or changes a score, a goal or a summary. If
   storage is unavailable the app simply has no badges — every function below
   fails quietly and the round still finishes the same way.

   A round only counts toward a score badge when it was answered fresh: the
   first attempt at a set, or a retry with new questions. Replaying the same
   set after its answers were shown is good practice, but it is not evidence. */

export interface BadgeRound {
  /** When the round was stamped finished. */
  finishedAt: Date;
  score: number;
  total: number;
  meter: string;
  scope: string;
  /** Whether the counting guide was on screen. */
  guide: boolean;
  /** The assignment's goal, when it set one; null otherwise. */
  metGoal: boolean | null;
  /** False for a replay of a set whose answers were already shown. */
  fresh: boolean;
}

export interface BadgeState {
  version: 1;
  /** Badge id → the local date (YYYY-MM-DD) it was earned. */
  earned: Record<string, string>;
  /** Local dates with at least one finished round, newest first. The current
   *  run of days is always kept whole; older days are trimmed past MAX_DAYS. */
  days: string[];
  /** The longest run of days ever recorded, kept separately so trimming old
   *  days can never shrink it. */
  longest: number;
  /** Fresh rounds of 5+ questions at 80% or better. */
  strongRounds: number;
  /** Meters with a fresh round at 80% or better. */
  strongMeters: string[];
}

interface BadgeDefinition {
  id: string;
  name: string;
  /** Plain-language rule, shown on the shelf. */
  rule: string;
  met: (state: BadgeState, round: BadgeRound, strong: boolean) => boolean;
}

/** A round must be this long for a score badge, so one lucky answer is not a badge. */
const MIN_QUESTIONS = 5;
const STRONG = 0.8;
const KEY = 'count-it-badges-v1';
const MAX_DAYS = 120;

export const BADGES: readonly BadgeDefinition[] = [
  { id: 'first-count', name: 'First Count', rule: 'Finish a whole challenge round.', met: () => true },
  { id: 'clean-round', name: 'Clean Round', rule: 'Get every question right in a round of 5 or more, first time through.',
    met: (_, round) => round.fresh && round.total >= MIN_QUESTIONS && round.score === round.total },
  { id: 'steady-counter', name: 'Steady Counter', rule: 'Score 80% or better in 3 rounds.',
    met: state => state.strongRounds >= 3 },
  { id: 'no-guide', name: 'No Guide Needed', rule: 'Score 80% or better with the counting guide hidden.',
    met: (_, round, strong) => strong && !round.guide },
  { id: 'whole-measures', name: 'Whole Measures', rule: 'Score 80% or better on whole-measure questions.',
    met: (_, round, strong) => strong && round.scope === 'measure' },
  { id: 'meter-explorer', name: 'Meter Explorer', rule: 'Score 80% or better in 3 different meters.',
    met: state => state.strongMeters.length >= 3 },
  { id: 'goal-met', name: 'Goal Met', rule: "Reach the goal your teacher set on an assignment of 5 or more questions, first time through.",
    met: (_, round) => round.metGoal === true && round.fresh && round.total >= MIN_QUESTIONS },
  { id: 'three-days', name: 'Three Days Running', rule: 'Finish a round on 3 days in a row.',
    met: state => bestStreak(state) >= 3 },
];

export function emptyBadgeState(): BadgeState {
  return { version: 1, earned: {}, days: [], longest: 0, strongRounds: 0, strongMeters: [] };
}

/** The local calendar date, so a streak follows the student's own days. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readBadges(storage: Pick<Storage, 'getItem'>): BadgeState {
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? 'null');
    if (!value || value.version !== 1 || typeof value.earned !== 'object' || !Array.isArray(value.days)) return emptyBadgeState();
    const earned: Record<string, string> = {};
    for (const badge of BADGES) if (typeof value.earned[badge.id] === 'string' && DAY.test(value.earned[badge.id])) earned[badge.id] = value.earned[badge.id];
    return {
      version: 1, earned,
      days: trimDays(value.days.filter((d: unknown): d is string => typeof d === 'string' && DAY.test(d))),
      longest: Number.isInteger(value.longest) && value.longest > 0 ? value.longest : 0,
      strongRounds: Number.isInteger(value.strongRounds) && value.strongRounds > 0 ? value.strongRounds : 0,
      strongMeters: Array.isArray(value.strongMeters) ? value.strongMeters.filter((m: unknown) => typeof m === 'string') : [],
    };
  } catch { return emptyBadgeState(); }
}

export function saveBadges(state: BadgeState, storage: Pick<Storage, 'setItem'>): boolean {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

/** Fold one finished round in, and name the badges it newly earned. */
export function recordRound(current: BadgeState, round: BadgeRound): { state: BadgeState; earned: BadgeDefinition[] } {
  const today = localDay(round.finishedAt);
  const strong = round.fresh && round.total >= MIN_QUESTIONS && round.score / round.total >= STRONG;
  const allDays = [...new Set([today, ...current.days])].sort().reverse();
  const state: BadgeState = {
    version: 1,
    earned: { ...current.earned },
    days: trimDays(allDays),
    longest: Math.max(current.longest, longestStreak(allDays)),
    strongRounds: current.strongRounds + (strong ? 1 : 0),
    strongMeters: strong && !current.strongMeters.includes(round.meter) ? [...current.strongMeters, round.meter] : current.strongMeters,
  };
  const earned = BADGES.filter(badge => !state.earned[badge.id] && badge.met(state, round, strong));
  for (const badge of earned) state.earned[badge.id] = today;
  return { state, earned };
}

/** Newest first, at most MAX_DAYS, except that the newest unbroken run of days
 *  is never cut, so the current streak keeps counting past the window. */
function trimDays(days: readonly string[]): string[] {
  const sorted = [...new Set(days)].sort().reverse();
  let run = sorted.length ? 1 : 0;
  while (run < sorted.length && sorted[run] === previousDay(sorted[run - 1])) run += 1;
  return sorted.slice(0, Math.max(MAX_DAYS, run));
}

/** The longest streak this device has seen, including days since trimmed. */
export function bestStreak(state: Pick<BadgeState, 'days' | 'longest'>): number {
  return Math.max(state.longest, longestStreak(state.days));
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

/** Days in a row with a finished round, ending today or yesterday; 0 once a day is missed. */
export function currentStreak(days: readonly string[], today: Date = new Date()): number {
  const set = new Set(days);
  let day = localDay(today);
  if (!set.has(day)) day = previousDay(day);
  let count = 0;
  while (set.has(day)) { count += 1; day = previousDay(day); }
  return count;
}

export function longestStreak(days: readonly string[]): number {
  const set = new Set(days);
  let best = 0;
  for (const day of set) {
    let count = 0;
    let cursor = day;
    while (set.has(cursor)) { count += 1; cursor = previousDay(cursor); }
    best = Math.max(best, count);
  }
  return best;
}

export function streakText(streak: number): string {
  return streak === 0 ? 'No current streak. Finish a round today to start one.'
    : streak === 1 ? 'Practice streak: 1 day.' : `Practice streak: ${streak} days in a row.`;
}
