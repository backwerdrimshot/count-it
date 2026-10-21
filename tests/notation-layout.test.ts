import { describe, expect, it } from "vitest";
import { scoreLayout, type RhythmScore } from "../src/score";

// Only the fields the layout reads: the bar's beats and each note's length.
function bar(beats: number, lengths: number[]): RhythmScore {
  return { beats, fragment: false, notes: lengths.map((length) => ({ length })) } as unknown as RhythmScore;
}

describe("room per beat", () => {
  it("gives a sparse bar only the room its notes need when no count row is drawn", () => {
    expect(scoreLayout(bar(5, [5]), 256).width).toBe(256);
  });

  it("gives a sparse bar the room a count row needs, as an eighth-note bar gets", () => {
    expect(scoreLayout(bar(5, [5]), 256, { countRow: true }).width).toBe(124 + 5 * 68);
  });

  it("keeps the room that eighth-note and sixteenth-note bars always had", () => {
    expect(scoreLayout(bar(4, Array(8).fill(0.5)), 256).width).toBe(124 + 4 * 68);
    expect(scoreLayout(bar(4, Array(16).fill(0.25)), 256).width).toBe(124 + 4 * 112);
  });
});
