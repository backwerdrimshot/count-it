import { describe, expect, it } from "vitest";
import { generateQuestions } from "../src/question";
import {
  COUNTING_PROFILES,
  COUNTING_PROFILE_REGISTRY_VERSION,
  countLabelsForBeat,
  formatCounts,
  getPromptAnswer,
  getRhythmCell,
  createBeatPrompt,
} from "../src/rhythm";

describe("versioned counting profiles", () => {
  it("publishes exact, stable mappings and previews", () => {
    expect(COUNTING_PROFILE_REGISTRY_VERSION).toBe(1);
    expect(COUNTING_PROFILES.standard.preview).toBe("1 e & a");
    expect(COUNTING_PROFILES["eastman-ti-te-ta"].preview).toBe("1 ti te ta");
    expect(COUNTING_PROFILES["eastman-ta-te-ta"].preview).toBe("1 ta te ta");
    expect(countLabelsForBeat(4, "eastman-ti-te-ta")).toEqual(["4", "ti", "te", "ta"]);
    expect(countLabelsForBeat(1, "eastman-ta-te-ta")).toEqual(["1", "ta", "te", "ta"]);
  });

  it("keeps the legacy Eastman alias pointed at ti-te-ta", () => {
    expect(countLabelsForBeat(1, "eastman")).toEqual(
      countLabelsForBeat(1, "eastman-ti-te-ta"),
    );
  });

  it("uses sounding positions without shifting syllables over rests", () => {
    const onlyFirstSixteenth = createBeatPrompt(getRhythmCell("rest-sixteenth-rest"));
    const onlyLastSixteenth = createBeatPrompt(getRhythmCell("three-rest-note"));
    expect(getPromptAnswer(onlyFirstSixteenth, "eastman-ti-te-ta")).toBe("ti");
    expect(getPromptAnswer(onlyFirstSixteenth, "eastman-ta-te-ta")).toBe("ta");
    expect(getPromptAnswer(onlyLastSixteenth, "eastman-ti-te-ta")).toBe("ta");
    expect(getPromptAnswer(onlyLastSixteenth, "eastman-ta-te-ta")).toBe("ta");
    expect(formatCounts([2], 1, "eastman-ti-te-ta")).toBe("te");
    expect(formatCounts([2], 1, "eastman-ta-te-ta")).toBe("te");
  });

  it("generates unique, correctly keyed answers for both Eastman maps", () => {
    for (const system of ["eastman-ti-te-ta", "eastman-ta-te-ta"] as const) {
      for (let seed = 0; seed < 32; seed += 1) {
        const questions = generateQuestions({
          level: "level-3",
          scope: "beat",
          system,
          count: 12,
          seed: `profiles-${system}-${seed}`,
        });
        for (const question of questions) {
          expect(question.correctAnswer).toBe(getPromptAnswer(question.prompt, system));
          expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(4);
          expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
        }
      }
      for (let seed = 0; seed < 8; seed += 1) {
        const questions = generateQuestions({
          level: "level-3",
          scope: "measure",
          system,
          count: 8,
          seed: `measure-profiles-${system}-${seed}`,
        });
        for (const question of questions) {
          expect(question.correctAnswer).toBe(getPromptAnswer(question.prompt, system));
          expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(4);
        }
      }
    }
  });
});
