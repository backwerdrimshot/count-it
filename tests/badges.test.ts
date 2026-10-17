import { describe, expect, it } from "vitest";
import {
  BADGES,
  bestStreak,
  currentStreak,
  emptyBadgeState,
  localDay,
  longestStreak,
  readBadges,
  recordRound,
  saveBadges,
  type BadgeRound,
  type BadgeState,
} from "../src/badges";

const round = (overrides: Partial<BadgeRound> = {}): BadgeRound => ({
  finishedAt: new Date(2026, 9, 17, 10), score: 3, total: 5, meter: "4-4", scope: "beat",
  guide: true, metGoal: null, fresh: true, ...overrides,
});

function play(rounds: Partial<BadgeRound>[], start: BadgeState = emptyBadgeState()) {
  let state = start;
  const earned: string[] = [];
  for (const r of rounds) {
    const next = recordRound(state, round(r));
    state = next.state;
    earned.push(...next.earned.map((badge) => badge.id));
  }
  return { state, earned };
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; }, clear: () => data.clear(), key: () => null,
    getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k),
  };
}

describe("badges", () => {
  it("keeps a small set with a plain-language rule for each", () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(6);
    expect(BADGES.length).toBeLessThanOrEqual(10);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const badge of BADGES) expect(badge.rule).toMatch(/\.$/);
  });

  it("gives only First Count for a weak finished round", () => {
    expect(play([{}]).earned).toEqual(["first-count"]);
  });

  it("never re-awards a badge", () => {
    const { state } = play([{ score: 5 }]);
    expect(recordRound(state, round({ score: 5 })).earned.map((b) => b.id)).not.toContain("clean-round");
  });

  it("does not count a replay of a set whose answers were shown", () => {
    const { earned, state } = play([{ score: 5, fresh: false, guide: false, scope: "measure" }]);
    expect(earned).toEqual(["first-count"]);
    expect(state.strongRounds).toBe(0);
  });

  it("needs at least five questions for a score badge", () => {
    expect(play([{ score: 3, total: 3 }]).earned).not.toContain("clean-round");
  });

  it("awards score badges from real results", () => {
    const { earned } = play([
      { score: 5, guide: false, scope: "measure", meter: "4-4" },
      { score: 4, meter: "3-4" },
      { score: 4, meter: "2-4" },
    ]);
    expect(earned).toEqual(expect.arrayContaining(["clean-round", "no-guide", "whole-measures", "steady-counter", "meter-explorer"]));
    expect(earned).not.toContain("goal-met");
  });

  it("awards Goal Met only when the teacher's goal was reached", () => {
    expect(play([{ metGoal: false }]).earned).not.toContain("goal-met");
    expect(play([{ metGoal: true }]).earned).toContain("goal-met");
    // Like the other score badges: five or more questions, answered fresh.
    expect(play([{ metGoal: true, total: 1, score: 1 }]).earned).not.toContain("goal-met");
    expect(play([{ metGoal: true, fresh: false }]).earned).not.toContain("goal-met");
  });

  it("awards Three Days Running for three days in a row, not three rounds in a day", () => {
    const day = (d: number) => ({ finishedAt: new Date(2026, 9, d, 9) });
    expect(play([day(1), day(1), day(1)]).earned).not.toContain("three-days");
    expect(play([day(1), day(3), day(4)]).earned).not.toContain("three-days");
    expect(play([day(30), day(31), { finishedAt: new Date(2026, 10, 1, 9) }]).earned).toContain("three-days");
  });

  it("counts the current streak from today or yesterday, and resets after a missed day", () => {
    const days = ["2026-10-17", "2026-10-16", "2026-10-15", "2026-10-12"];
    expect(currentStreak(days, new Date(2026, 9, 17, 20))).toBe(3);
    expect(currentStreak(days, new Date(2026, 9, 18, 8))).toBe(3);
    expect(currentStreak(days, new Date(2026, 9, 19, 8))).toBe(0);
    expect(longestStreak(days)).toBe(3);
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("saves and reads back, and survives missing or broken storage", () => {
    const storage = memoryStorage();
    const { state } = play([{ score: 5 }]);
    expect(saveBadges(state, storage)).toBe(true);
    expect(readBadges(storage)).toEqual(state);
    storage.setItem("count-it-badges-v1", "{not json");
    expect(readBadges(storage)).toEqual(emptyBadgeState());
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readBadges(broken)).toEqual(emptyBadgeState());
    expect(saveBadges(state, broken)).toBe(false);
  });

  it("keeps the current and longest streak past the stored-day window", () => {
    const days = Array.from({ length: 150 }, (_, i) => ({ finishedAt: new Date(2026, 0, 1 + i, 10) }));
    const { state } = play(days);
    const last = new Date(2026, 0, 150, 12);
    expect(currentStreak(state.days, last)).toBe(150);
    expect(bestStreak(state)).toBe(150);
    // A gap, then new days: the old record must not shrink as old days are trimmed.
    const later = Array.from({ length: 130 }, (_, i) => ({ finishedAt: new Date(2026, 6, 1 + i * 2, 10) }));
    const after = play(later, state).state;
    expect(after.days.length).toBeLessThanOrEqual(150);
    expect(bestStreak(after)).toBe(150);
    const storage = memoryStorage();
    saveBadges(after, storage);
    expect(bestStreak(readBadges(storage))).toBe(150);
  });
});
