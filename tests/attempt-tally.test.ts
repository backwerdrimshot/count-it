import { describe, expect, it } from "vitest";
import { ATTEMPTS_KEY, readAllAttempts, readAttempts, writeAttempts } from "../src/attempt-tally";

/* The tally is read from browser storage, which is the one input here that a
 * person (or a damaged browser) can put anything into. It must never become a
 * number on a card unless it is a plain positive count, and a storage that is
 * denied or throws must mean "nothing recorded", never an error on the page. */

function fakeStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(ATTEMPTS_KEY, initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    raw: () => data.get(ATTEMPTS_KEY),
  };
}

describe("the attempt tally", () => {
  it("is empty when nothing was ever recorded", () => {
    expect(readAllAttempts(fakeStorage())).toEqual({});
    expect(readAttempts("?scope=beat", fakeStorage())).toBe(0);
  });

  it("records an attempt and reads it back under the assignment's own key", () => {
    const storage = fakeStorage();
    writeAttempts("?scope=beat&n=12", 1, storage);
    writeAttempts("?scope=measure&n=12", 3, storage);
    expect(readAttempts("?scope=beat&n=12", storage)).toBe(1);
    expect(readAttempts("?scope=measure&n=12", storage)).toBe(3);
    expect(readAllAttempts(storage)).toEqual({ "?scope=beat&n=12": 1, "?scope=measure&n=12": 3 });
  });

  it("only ever counts upward, so a stale tab cannot lower the number", () => {
    const storage = fakeStorage();
    writeAttempts("k", 4, storage);
    writeAttempts("k", 2, storage);
    writeAttempts("k", 4, storage);
    expect(readAttempts("k", storage)).toBe(4);
    writeAttempts("k", 5, storage);
    expect(readAttempts("k", storage)).toBe(5);
  });

  it("drops anything that is not a plain positive count rather than trusting it", () => {
    const storage = fakeStorage(
      JSON.stringify({ good: 2, zero: 0, negative: -3, fraction: 1.5, text: "7", nothing: null, nested: { a: 1 }, huge: 1e9 }),
    );
    expect(readAllAttempts(storage)).toEqual({ good: 2, huge: 1e9 });
    expect(readAttempts("text", storage)).toBe(0);
    expect(readAttempts("fraction", storage)).toBe(0);
  });

  it("treats damaged or oddly shaped storage as empty", () => {
    for (const raw of ["not json", "[1,2,3]", "null", "42", '"a string"', "{"]) {
      expect(readAllAttempts(fakeStorage(raw)), raw).toEqual({});
    }
  });

  it("cleans a damaged value away the next time it writes, keeping what was valid", () => {
    const storage = fakeStorage(JSON.stringify({ keep: 2, drop: "x" }));
    writeAttempts("new", 1, storage);
    expect(JSON.parse(storage.raw() ?? "{}")).toEqual({ keep: 2, new: 1 });
  });

  it("is quiet when storage is missing or refuses", () => {
    expect(readAllAttempts(null)).toEqual({});
    expect(readAttempts("k", null)).toBe(0);
    expect(() => writeAttempts("k", 1, null)).not.toThrow();
    const hostile = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    };
    expect(readAllAttempts(hostile)).toEqual({});
    expect(() => writeAttempts("k", 1, hostile)).not.toThrow();
  });
});
