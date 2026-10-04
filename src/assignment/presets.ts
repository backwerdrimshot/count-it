/* The steps of the teaching sequences that run in this app, as builder presets:
 * the ten of Counting Rhythms, and (further down) the three 3/4 steps of
 * Rhythms in Three. The notes below are written about Counting Rhythms, where
 * the two deliberate differences arise; Rhythms in Three has one of them.
 *
 * The sequence lives on the shop site (`sequences/counting-rhythms/` in
 * backwerd-rhythm-shop-site) as hand-written HTML with one assignment link per
 * step. A teacher who wants to *adjust* a step — a different pass mark for a
 * younger class, a seed of their own, the same step in another meter — used to
 * have to read that link apart by hand. These presets start the builder from a
 * step exactly as published.
 *
 * WHERE THE NUMBERS COME FROM. Not from this repository's imagination and not
 * from the Notion draft they started as: they are the live page's own links, as
 * of backwerd-rhythm-shop-site@06ca7b8 (the last commit to touch that page). The
 * pass marks are the sequence's gates — 10 of 12 for most steps, 11 of 12 for
 * "Count It Cold", 14 of 16 for the capstone. tests/presets.test.ts holds the
 * published links verbatim and requires each preset to run *the byte-identical
 * round* its link runs, so the two cannot drift apart without a test saying so.
 *
 * TWO DELIBERATE DIFFERENCES from the published links, both visible in that
 * test rather than hidden:
 *
 *   * The meter is pinned to 4/4. The sequence is called Counting Rhythms —
 *     4/4, but its links leave the meter to the student, and a student who
 *     switches a link that names a whole note to 2/4 or 3/4 gets a round that
 *     quietly never asks it. A pinned meter cannot be switched. It does not
 *     change the round: 4/4 is the default and mixes nothing into the seed.
 *   * No `seq` or `step` parameters. Those tell the result card "this was step
 *     3 of the sequence", which stops being true the moment a teacher changes
 *     anything. A teacher who wants the unmodified step with its label should
 *     use the sequence page's own link.
 *
 * The published seeds are kept, so an unmodified preset gives a class exactly
 * the questions the published step gives, and scores stay comparable across
 * classes. "New seed" in the builder is how a teacher opts out of that.
 */
import type { MeterId } from "../rhythm/types";
import type { BuilderState, Vocabulary } from "./builder";

export const COUNTING_RHYTHMS_SEQUENCE_URL =
  "https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/";

export const RHYTHMS_IN_THREE_SEQUENCE_URL =
  "https://apps.backwerdrhythmshop.com/sequences/rhythms-in-three/";

/** The published sequences whose steps run in this app. */
export type SequenceId = "counting-rhythms" | "rhythms-in-three";

export interface BuilderPreset {
  readonly id: string;
  readonly sequence: SequenceId;
  /** The step's place in its sequence, as the sequence page numbers it. */
  readonly step: number;
  /** The step's name without its "Step N:" prefix, as the sequence page says it. */
  readonly title: string;
  /** What the step teaches, in a line, from the sequence page's own wording. */
  readonly focus: string;
  /** The meter the PUBLISHED link names. Null: the link leaves it to the student. */
  readonly publishedMeter: MeterId | null;
  readonly state: BuilderState;
}

const FOUR_FOUR = "4-4" as const;
const THREE_FOUR = "3-4" as const;

interface StepSettings {
  readonly vocabulary: Vocabulary;
  readonly scope: "beat" | "measure";
  readonly guide: "on" | "off";
  readonly count: number;
  readonly passing: number;
  readonly seed: string;
}

function makeStep(
  sequence: SequenceId,
  meter: MeterId,
  publishedMeter: MeterId | null,
  number: number,
  title: string,
  focus: string,
  settings: StepSettings,
): BuilderPreset {
  return Object.freeze({
    id: `${sequence}-${number}`,
    sequence,
    step: number,
    title,
    focus,
    publishedMeter,
    state: Object.freeze({
      name: `Step ${number}: ${title}`,
      vocabulary: settings.vocabulary,
      scope: settings.scope,
      meter,
      guide: settings.guide,
      feedback: null,
      retry: null,
      count: settings.count,
      passing: settings.passing,
      seed: settings.seed,
    }),
  });
}

/* Counting Rhythms links leave the meter open; the preset pins 4/4 (see above). */
const step = (number: number, title: string, focus: string, settings: StepSettings): BuilderPreset =>
  makeStep("counting-rhythms", FOUR_FOUR, null, number, title, focus, settings);

/* Rhythms in Three links already name their meter, so there is nothing to pin. */
const threeStep = (number: number, title: string, focus: string, settings: StepSettings): BuilderPreset =>
  makeStep("rhythms-in-three", THREE_FOUR, THREE_FOUR, number, title, focus, settings);

const cells = (...ids: string[]): Vocabulary => Object.freeze({ kind: "cells" as const, cells: Object.freeze(ids) });
const level = (value: 1 | 2 | 3): Vocabulary => Object.freeze({ kind: "level" as const, level: value });

export const COUNTING_RHYTHMS_STEPS: readonly BuilderPreset[] = Object.freeze([
  step(1, "Quarters & Pairs", "Quarter note and two eighths", {
    vocabulary: cells("quarter", "eighths"),
    scope: "beat", guide: "on", count: 12, passing: 10, seed: "cr1-quarters-pairs",
  }),
  step(2, "Where's the &?", "Rest-entry cells", {
    vocabulary: cells("eighth-rest", "rest-eighth"),
    scope: "beat", guide: "on", count: 12, passing: 10, seed: "cr2-wheres-the-and",
  }),
  step(3, "Pulse & Pairs, No Help", "Levels 1 and 2 mixed, guide hidden", {
    vocabulary: cells("quarter", "eighths", "eighth-rest", "rest-eighth"),
    scope: "beat", guide: "off", count: 12, passing: 10, seed: "cr3-no-help",
  }),
  step(4, "Beat Numbers Travel", "The same rhythms as full measures", {
    vocabulary: cells("quarter", "eighths", "eighth-rest", "rest-eighth"),
    scope: "measure", guide: "off", count: 12, passing: 10, seed: "cr4-beat-numbers",
  }),
  step(5, "Meet the Sixteenths", "e, a, e-a, e-& and four sixteenths", {
    vocabulary: cells(
      "sixteenths", "rest-sixteenth-rest", "three-rest-note", "alternating-rests", "rest-two-rest",
    ),
    scope: "beat", guide: "on", count: 12, passing: 10, seed: "cr5-sixteenths",
  }),
  step(6, "Sixteenth Combos", "Dotted eighth and sixteenth, and friends", {
    vocabulary: cells("dotted-eighth-sixteenth", "eighth-two", "two-eighth", "sixteenth-eighth-sixteenth"),
    /* The sequence page labels this step "Scaffold, then hide", but its link
       pins the guide visible for the whole round — and Count It has no
       scaffold-then-hide policy to pin. The preset follows the link, which is
       what a student actually gets; the discrepancy is the page's to settle. */
    scope: "beat", guide: "on", count: 12, passing: 10, seed: "cr6-combos",
  }),
  step(7, "Silent Doesn't Mean Skip", "Rests, with the guide hidden", {
    vocabulary: cells(
      "eighth-rest", "rest-eighth", "rest-sixteenth-rest", "three-rest-note", "alternating-rests",
      "rest-two-rest", "two-rest", "rest-two", "rest-three",
    ),
    scope: "beat", guide: "off", count: 12, passing: 10, seed: "cr7-silent",
  }),
  step(8, "Count It Cold", "All sixteen rhythms, one beat, guide hidden", {
    vocabulary: level(3),
    scope: "beat", guide: "off", count: 12, passing: 11, seed: "cr8-cold",
  }),
  step(9, "Full Measures", "All sixteen rhythms across a whole bar — the capstone", {
    vocabulary: level(3),
    scope: "measure", guide: "off", count: 16, passing: 14, seed: "cr9-full-measures",
  }),
  step(10, "Notes That Last", "Whole notes, half notes and half rests with quarters and eighths", {
    vocabulary: cells("whole", "half", "half-rest", "quarter", "eighths"),
    scope: "measure", guide: "off", count: 12, passing: 10, seed: "cr10-notes-that-last",
  }),
]);

/* Steps 1–3 of Rhythms in Three — the 3/4 half. Steps 4–6 are 3/8 and open in
 * Eight Time, so they are not presets here (see ./catalog.ts, which lists them).
 *
 * Same provenance rule as the ten above: these are the sequence page's own
 * links as of backwerd-rhythm-shop-site@63e57c8, held verbatim in
 * tests/presets.test.ts, and each runs the byte-identical round its link runs.
 * The links already name their meter, so unlike Counting Rhythms nothing is
 * pinned here that the published link leaves open; the only difference is the
 * missing seq/step label, for the reason given above. */
export const RHYTHMS_IN_THREE_STEPS: readonly BuilderPreset[] = Object.freeze([
  threeStep(1, "Three Beats, Not Four", "Quarter notes, pairs and rest entry in a bar of three", {
    vocabulary: cells("quarter", "eighths", "eighth-rest", "rest-eighth"),
    scope: "measure", guide: "on", count: 12, passing: 10, seed: "r3-1-three-beats",
  }),
  threeStep(2, "Sixteenths in Three", "Four sixteenth combinations in a bar of three", {
    vocabulary: cells("sixteenths", "eighth-two", "two-eighth", "dotted-eighth-sixteenth"),
    scope: "measure", guide: "on", count: 12, passing: 10, seed: "r3-2-sixteenths",
  }),
  threeStep(3, "3/4 Cold", "All sixteen quarter-beat rhythms in 3/4, guide hidden", {
    vocabulary: level(3),
    scope: "measure", guide: "off", count: 12, passing: 10, seed: "r3-3-cold",
  }),
]);

export const ALL_PRESETS: readonly BuilderPreset[] = Object.freeze([
  ...COUNTING_RHYTHMS_STEPS,
  ...RHYTHMS_IN_THREE_STEPS,
]);

export function getPreset(id: string): BuilderPreset | undefined {
  return ALL_PRESETS.find((preset) => preset.id === id);
}
