import { describe, expect, it } from "vitest";
import { parseAssignment, type Assignment } from "../src/assignment";
import { evaluateBuilder } from "../src/assignment/builder";
import {
  ALL_PRESETS,
  COUNTING_RHYTHMS_STEPS,
  RHYTHMS_IN_THREE_STEPS,
  getPreset,
} from "../src/assignment/presets";
import { generateQuestions } from "../src/question";
import {
  PUBLISHED_COUNTING_RHYTHMS as PUBLISHED,
  PUBLISHED_RHYTHMS_IN_THREE as PUBLISHED_THREE,
} from "./fixtures/published-links";


function published(index: number): Assignment {
  const parsed = parseAssignment(`?${PUBLISHED[index]}`);
  if (!parsed.ok) throw new Error(`published step ${index + 1} no longer parses: ${parsed.error.message}`);
  return parsed.assignment;
}

/* The round an assignment runs, as a string: every question, every choice, in
   order. Two assignments with the same fingerprint put the same questions in
   front of a student. A `variant` is included because that is how the app
   orders choices per student, and it must not matter which link was opened. */
function roundOf(assignment: Assignment): string {
  const questions = generateQuestions({
    level: assignment.level,
    scope: assignment.scope,
    ...(assignment.meter ? { meter: assignment.meter } : {}),
    ...(assignment.cells ? { cells: assignment.cells } : {}),
    count: assignment.count ?? 5,
    seed: assignment.seed ?? "none",
    variant: "a-student",
  });
  return JSON.stringify(
    questions.map((question) => [
      question.id,
      question.correctChoiceId,
      question.choices.map((choice) => [choice.id, choice.label, choice.category]),
      question.explanation,
    ]),
  );
}

describe("the Counting Rhythms presets", () => {
  it("are the ten steps, in order, named as the sequence names them", () => {
    expect(COUNTING_RHYTHMS_STEPS).toHaveLength(10);
    expect(COUNTING_RHYTHMS_STEPS.map((preset) => preset.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(COUNTING_RHYTHMS_STEPS.map((preset) => preset.id)).size).toBe(10);
    for (const preset of COUNTING_RHYTHMS_STEPS) {
      expect(preset.state.name).toBe(`Step ${preset.step}: ${preset.title}`);
      expect(preset.focus.length).toBeGreaterThan(10);
    }
  });

  it("are all valid assignments, by the parser's own judgement", () => {
    for (const preset of COUNTING_RHYTHMS_STEPS) {
      const result = evaluateBuilder(preset.state);
      expect(result.ok, preset.id).toBe(true);
    }
  });

  it("each run the byte-identical round the published link runs", () => {
    /* The promise that makes them worth having: Step 3 here is Step 3 there.
       Same questions, same choices, same order, same explanations. */
    for (let index = 0; index < COUNTING_RHYTHMS_STEPS.length; index += 1) {
      const preset = COUNTING_RHYTHMS_STEPS[index];
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      const site = published(index);
      expect(roundOf(built.assignment), preset.id).toBe(roundOf(site));
    }
  });

  it("agree with the published link on everything that defines the round", () => {
    for (let index = 0; index < COUNTING_RHYTHMS_STEPS.length; index += 1) {
      const preset = COUNTING_RHYTHMS_STEPS[index];
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      const a = built.assignment;
      const site = published(index);
      expect({ name: a.name, scope: a.scope, cells: a.cells, guide: a.guide, count: a.count, passing: a.passing, seed: a.seed, feedback: a.feedback, retry: a.retry }, preset.id)
        .toEqual({ name: site.name, scope: site.scope, cells: site.cells, guide: site.guide, count: site.count, passing: site.passing, seed: site.seed, feedback: site.feedback, retry: site.retry });
      /* The level only matters when no rhythms are named. */
      if (!site.cells) expect(a.level, preset.id).toBe(site.level);
    }
  });

  it("keep the sequence's gates", () => {
    const gates = COUNTING_RHYTHMS_STEPS.map((preset) => `${preset.state.passing}/${preset.state.count}`);
    expect(gates).toEqual(["10/12", "10/12", "10/12", "10/12", "10/12", "10/12", "10/12", "11/12", "14/16", "10/12"]);
  });

  it("differ from the published links in exactly the two stated ways", () => {
    for (let index = 0; index < COUNTING_RHYTHMS_STEPS.length; index += 1) {
      const preset = COUNTING_RHYTHMS_STEPS[index];
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      /* 1. The meter is pinned to 4/4 — the published links leave it open. */
      expect(built.assignment.meter, preset.id).toBe("4-4");
      expect(published(index).meter, preset.id).toBeNull();
      /* 2. No sequence label: once a teacher changes anything it stops being
            true that this is step N of the sequence. */
      expect(built.query).not.toMatch(/seq=|step=/);
    }
  });

  it("are found by id, and an unknown id finds nothing", () => {
    expect(getPreset("counting-rhythms-3")?.title).toBe("Pulse & Pairs, No Help");
    expect(getPreset("rhythms-in-three-2")?.title).toBe("Sixteenths in Three");
    expect(getPreset("counting-rhythms-11")).toBeUndefined();
    /* Steps 4–6 of Rhythms in Three are 3/8 and live in Eight Time. */
    expect(getPreset("rhythms-in-three-4")).toBeUndefined();
    expect(getPreset("")).toBeUndefined();
  });

  it("have unique ids and unique seeds across both sequences", () => {
    /* A shared seed would make two named assignments the same round. */
    expect(new Set(ALL_PRESETS.map((preset) => preset.id)).size).toBe(ALL_PRESETS.length);
    expect(new Set(ALL_PRESETS.map((preset) => preset.state.seed)).size).toBe(ALL_PRESETS.length);
  });
});


function publishedThree(index: number): Assignment {
  const parsed = parseAssignment(`?${PUBLISHED_THREE[index]}`);
  if (!parsed.ok) throw new Error(`published Rhythms in Three step ${index + 1} no longer parses: ${parsed.error.message}`);
  return parsed.assignment;
}

describe("the Rhythms in Three presets", () => {
  it("are steps 1–3, named as the sequence names them", () => {
    expect(RHYTHMS_IN_THREE_STEPS.map((preset) => preset.step)).toEqual([1, 2, 3]);
    for (const preset of RHYTHMS_IN_THREE_STEPS) {
      expect(preset.sequence).toBe("rhythms-in-three");
      expect(preset.state.name).toBe(`Step ${preset.step}: ${preset.title}`);
      expect(preset.focus.length).toBeGreaterThan(10);
    }
  });

  it("each run the byte-identical round the published link runs", () => {
    for (let index = 0; index < RHYTHMS_IN_THREE_STEPS.length; index += 1) {
      const preset = RHYTHMS_IN_THREE_STEPS[index];
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      expect(roundOf(built.assignment), preset.id).toBe(roundOf(publishedThree(index)));
    }
  });

  it("agree with the published link on everything that defines the round, meter included", () => {
    for (let index = 0; index < RHYTHMS_IN_THREE_STEPS.length; index += 1) {
      const preset = RHYTHMS_IN_THREE_STEPS[index];
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      const a = built.assignment;
      const site = publishedThree(index);
      expect({ name: a.name, scope: a.scope, meter: a.meter, cells: a.cells, guide: a.guide, count: a.count, passing: a.passing, seed: a.seed, feedback: a.feedback, retry: a.retry }, preset.id)
        .toEqual({ name: site.name, scope: site.scope, meter: site.meter, cells: site.cells, guide: site.guide, count: site.count, passing: site.passing, seed: site.seed, feedback: site.feedback, retry: site.retry });
      if (!site.cells) expect(a.level, preset.id).toBe(site.level);
    }
  });

  it("differ from the published links only by the sequence label", () => {
    /* The link already names 3/4, so nothing is pinned that the page leaves open. */
    for (let index = 0; index < RHYTHMS_IN_THREE_STEPS.length; index += 1) {
      const preset = RHYTHMS_IN_THREE_STEPS[index];
      expect(preset.publishedMeter, preset.id).toBe("3-4");
      expect(publishedThree(index).meter, preset.id).toBe("3-4");
      const built = evaluateBuilder(preset.state);
      if (!built.ok) throw new Error(`${preset.id}: ${built.problem}`);
      expect(built.query).not.toMatch(/seq=|step=/);
    }
  });

  it("keep the sequence's gates", () => {
    const gates = RHYTHMS_IN_THREE_STEPS.map((preset) => `${preset.state.passing}/${preset.state.count}`);
    expect(gates).toEqual(["10/12", "10/12", "10/12"]);
  });
});
