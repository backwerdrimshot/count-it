/* How many times this browser has finished a given assignment.
 *
 * Attempt numbers used to live in React state alone, so a reload restarted the
 * count at one and the number on the card could be quietly reset by pressing
 * F5 — which is the same gesture that replays the round. Keyed by the
 * assignment's own canonical link (`serializeAssignment`), so it names a round
 * rather than a person, and it never leaves the device.
 *
 * It lives here, not inside the trainer, so the assignments page can show the
 * same tally the trainer writes without a second copy of the key or the format
 * to keep in step. Every function takes the storage as a parameter (defaulting
 * to the browser's) so the format is testable and a denied storage is a plain
 * "nothing recorded", never a thrown error. */

export const ATTEMPTS_KEY = "count-it-attempts-v1";

type TallyStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): TallyStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Some browsers throw on merely touching localStorage (storage denied).
    return null;
  }
}

/** Every recorded tally, keyed by assignment. Anything unreadable is dropped
 *  rather than trusted: a hand-edited or damaged value must not become a
 *  number on a card. */
export function readAllAttempts(storage: TallyStorage | null = defaultStorage()): Record<string, number> {
  if (!storage) return {};
  try {
    const saved = storage.getItem(ATTEMPTS_KEY);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const clean: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isInteger(value) && value > 0) clean[key] = value;
    }
    return clean;
  } catch {
    return {};
  }
}

export function readAttempts(fingerprint: string, storage: TallyStorage | null = defaultStorage()): number {
  return readAllAttempts(storage)[fingerprint] ?? 0;
}

export function writeAttempts(
  fingerprint: string,
  attempt: number,
  storage: TallyStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    const all = readAllAttempts(storage);
    if ((all[fingerprint] ?? 0) >= attempt) return;
    all[fingerprint] = attempt;
    storage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {
    // Storage denied. The attempt still shows for this sitting; it just will
    // not survive a reload, which is the old behaviour rather than a new fault.
  }
}
