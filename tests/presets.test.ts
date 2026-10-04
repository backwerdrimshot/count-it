import { describe, expect, it } from "vitest";
import { parseAssignment, type Assignment } from "../src/assignment";
import { evaluateBuilder } from "../src/assignment/builder";
import { COUNTING_RHYTHMS_STEPS, getPreset } from "../src/assignment/presets";
import { generateQuestions } from "../src/question";

/* The ten Counting Rhythms steps exactly as the shop site publishes them.
 *
 * Copied verbatim from `sequences/counting-rhythms/index.html` in
 * backwerd-rhythm-shop-site, as of commit 06ca7b8 (the last to touch that page).
 * It is a copy on purpose: a preset that merely *agreed with itself* would be
 * worthless, and the thing a teacher is trusting is that "Step 3" here is the
 * same round as Step 3 there. If the page changes, this table is the place that
 * has to change with it, and the test below fails until it does. */
const PUBLISHED: readonly string[] = [
  "seq=counting-rhythms&step=1&a=Step%201%3A%20Quarters%20%26%20Pairs&scope=beat&cells=quarter,eighths&guide=on&n=12&pass=10&seed=cr1-quarters-pairs",
  "seq=counting-rhythms&step=2&a=Step%202%3A%20Where%27s%20the%20%26%3F&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2-wheres-the-and",
  "seq=counting-rhythms&step=3&a=Step%203%3A%20Pulse%20%26%20Pairs%2C%20No%20Help&scope=beat&cells=quarter,eighths,eighth-rest,rest-eighth&guide=off&n=12&pass=10&seed=cr3-no-help",
  "seq=counting-rhythms&step=4&a=Step%204%3A%20Beat%20Numbers%20Travel&scope=measure&cells=quarter,eighths,eighth-rest,rest-eighth&guide=off&n=12&pass=10&seed=cr4-beat-numbers",
  "seq=counting-rhythms&step=5&a=Step%205%3A%20Meet%20the%20Sixteenths&scope=beat&cells=sixteenths,rest-sixteenth-rest,three-rest-note,alternating-rests,rest-two-rest&guide=on&n=12&pass=10&seed=cr5-sixteenths",
  "seq=counting-rhythms&step=6&a=Step%206%3A%20Sixteenth%20Combos&scope=beat&cells=dotted-eighth-sixteenth,eighth-two,two-eighth,sixteenth-eighth-sixteenth&guide=on&n=12&pass=10&seed=cr6-combos",
  "seq=counting-rhythms&step=7&a=Step%207%3A%20Silent%20Doesn%27t%20Mean%20Skip&scope=beat&cells=eighth-rest,rest-eighth,rest-sixteenth-rest,three-rest-note,alternating-rests,rest-two-rest,two-rest,rest-two,rest-three&guide=off&n=12&pass=10&seed=cr7-silent",
  "seq=counting-rhythms&step=8&a=Step%208%3A%20Count%20It%20Cold&level=3&scope=beat&guide=off&n=12&pass=11&seed=cr8-cold",
  "seq=counting-rhythms&step=9&a=Step%209%3A%20Full%20Measures&level=3&scope=measure&guide=off&n=16&pass=14&seed=cr9-full-measures",
  "seq=counting-rhythms&step=10&a=Step%2010%3A%20Notes%20That%20Last&level=1&scope=measure&cells=whole,half,half-rest,quarter,eighths&guide=off&n=12&pass=10&seed=cr10-notes-that-last",
];

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
    expect(getPreset("counting-rhythms-11")).toBeUndefined();
    expect(getPreset("")).toBeUndefined();
  });
});
