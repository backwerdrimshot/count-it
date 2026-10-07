import { COUNTING_PROFILES } from "./rhythm/counting";
import type { CountingProfileId } from "./rhythm/types";

export const COUNTING_PREFERENCE_KEY = "count-it-counting-profile-v1";
export const COUNTING_PREFERENCE_VERSION = 1 as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageProvider = () => StorageLike | null;

/** Assignment links are authoritative; a saved profile is only the free-practice default. */
export function resolveCountingProfile(
  assignmentProfile: CountingProfileId | null,
  savedProfile: CountingProfileId | null,
): CountingProfileId {
  return assignmentProfile ?? savedProfile ?? "standard";
}

function isCountingProfileId(value: unknown): value is CountingProfileId {
  return typeof value === "string" && Object.hasOwn(COUNTING_PROFILES, value);
}

/** A corrupt, unavailable, or blocked preference is treated as no preference. */
export function readCountingPreference(provider: StorageProvider): CountingProfileId | null {
  try {
    const raw = provider()?.getItem(COUNTING_PREFERENCE_KEY);
    if (!raw) return null;
    const record: unknown = JSON.parse(raw);
    if (
      !record ||
      typeof record !== "object" ||
      !("version" in record) ||
      record.version !== COUNTING_PREFERENCE_VERSION ||
      !("profile" in record) ||
      !isCountingProfileId(record.profile)
    ) return null;
    return record.profile;
  } catch {
    return null;
  }
}

export function writeCountingPreference(
  profile: CountingProfileId,
  provider: StorageProvider,
): boolean {
  try {
    const storage = provider();
    if (!storage) return false;
    storage.setItem(
      COUNTING_PREFERENCE_KEY,
      JSON.stringify({ version: COUNTING_PREFERENCE_VERSION, profile }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearCountingPreference(provider: StorageProvider): boolean {
  try {
    const storage = provider();
    if (!storage) return false;
    storage.removeItem(COUNTING_PREFERENCE_KEY);
    return true;
  } catch {
    return false;
  }
}
