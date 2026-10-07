import { describe, expect, it } from "vitest";
import {
  clearCountingPreference,
  COUNTING_PREFERENCE_KEY,
  readCountingPreference,
  resolveCountingProfile,
  writeCountingPreference,
  type StorageLike,
} from "../src/counting-preference";

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("the optional local counting preference", () => {
  it("writes and reads a versioned profile without touching other keys", () => {
    const storage = memoryStorage();
    storage.setItem("other", "keep");
    expect(writeCountingPreference("eastman-ta-te-ta", () => storage)).toBe(true);
    expect(JSON.parse(storage.getItem(COUNTING_PREFERENCE_KEY)!)).toEqual({ version: 1, profile: "eastman-ta-te-ta" });
    expect(readCountingPreference(() => storage)).toBe("eastman-ta-te-ta");
    expect(storage.getItem("other")).toBe("keep");
  });

  it("rejects unknown profile IDs and unknown preference versions", () => {
    const storage = memoryStorage();
    storage.setItem(COUNTING_PREFERENCE_KEY, JSON.stringify({ version: 1, profile: "takadimi" }));
    expect(readCountingPreference(() => storage)).toBeNull();
    storage.setItem(COUNTING_PREFERENCE_KEY, JSON.stringify({ version: 2, profile: "standard" }));
    expect(readCountingPreference(() => storage)).toBeNull();
  });

  it("falls back safely when storage is missing, blocked, or malformed", () => {
    expect(readCountingPreference(() => null)).toBeNull();
    expect(readCountingPreference(() => { throw new Error("blocked"); })).toBeNull();
    expect(writeCountingPreference("standard", () => null)).toBe(false);
    expect(writeCountingPreference("standard", () => { throw new Error("blocked"); })).toBe(false);
    expect(clearCountingPreference(() => { throw new Error("blocked"); })).toBe(false);
    const storage = memoryStorage();
    storage.setItem(COUNTING_PREFERENCE_KEY, "{");
    expect(readCountingPreference(() => storage)).toBeNull();
  });

  it("removes only the profile preference when unchecked", () => {
    const storage = memoryStorage();
    storage.setItem("other", "keep");
    writeCountingPreference("standard", () => storage);
    expect(clearCountingPreference(() => storage)).toBe(true);
    expect(readCountingPreference(() => storage)).toBeNull();
    expect(storage.getItem("other")).toBe("keep");
  });

  it("lets an assignment profile override a saved default without changing storage", () => {
    const storage = memoryStorage();
    writeCountingPreference("eastman-ta-te-ta", () => storage);
    expect(resolveCountingProfile("eastman-ti-te-ta", readCountingPreference(() => storage)))
      .toBe("eastman-ti-te-ta");
    expect(resolveCountingProfile("standard", readCountingPreference(() => storage))).toBe("standard");
    expect(readCountingPreference(() => storage)).toBe("eastman-ta-te-ta");
  });
});
