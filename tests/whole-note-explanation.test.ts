import { describe, expect, it } from "vitest";
import {
  createMeasurePrompt,
  explainPrompt,
  getPromptAnswer,
  type MeterId,
} from "../src/rhythm";

describe("whole-note duration in measure feedback", () => {
  const examples: readonly {
    meter: MeterId;
    cells: readonly string[];
    span: string;
    answer: string;
  }[] = [
    { meter: "4-4", cells: ["whole"], span: "Beats 1–4", answer: "1" },
    { meter: "5-4", cells: ["whole", "quarter"], span: "Beats 1–4", answer: "1 | 5" },
    { meter: "7-4", cells: ["whole", "half", "quarter"], span: "Beats 1–4", answer: "1 | 5 | 7" },
    { meter: "7-4", cells: ["quarter", "whole", "half"], span: "Beats 2–5", answer: "1 | 2 | 6" },
  ];

  it.each(examples)("explains $cells in $meter by duration and starting beat", ({ meter, cells, span, answer }) => {
    const prompt = createMeasurePrompt(cells, meter);
    const explanation = explainPrompt(prompt);

    // A whole note occupies four quarter beats, including when the bar has
    // more beats or the note begins after beat one. Feedback must not extend
    // the note to the end of that bar or turn its covered beats into attacks.
    expect(explanation).toContain(span + ":");
    expect(explanation).toMatch(/holds for (?:four|4) quarter-note beats/);
    expect(explanation).not.toMatch(/whole bar|entire (?:bar|measure)/);
    expect(getPromptAnswer(prompt)).toBe(answer);
  });
});
