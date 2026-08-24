import { getMeter } from "./meter";
import type {
  BeatNumber,
  CountingSystemId,
  MeterId,
  PartialCount,
  PartialPosition,
  RhythmPrompt,
} from "./types";

export interface CountingSystem {
  readonly id: CountingSystemId;
  readonly name: string;
  readonly labelsForBeat: (beat: BeatNumber) => readonly [string, string, string, string];
}

export const COUNTING_SYSTEMS: Readonly<Record<CountingSystemId, CountingSystem>> =
  Object.freeze({
    standard: Object.freeze({
      id: "standard" as const,
      name: "Standard American subdivision counting",
      labelsForBeat: (beat: BeatNumber) =>
        Object.freeze([String(beat), "e", "&", "a"]) as readonly [string, string, string, string],
    }),
    eastman: Object.freeze({
      id: "eastman" as const,
      name: "Eastman counting",
      labelsForBeat: (beat: BeatNumber) =>
        Object.freeze([String(beat), "ti", "te", "ta"]) as readonly [string, string, string, string],
    }),
    takadimi: Object.freeze({
      id: "takadimi" as const,
      name: "Takadimi",
      labelsForBeat: () =>
        Object.freeze(["Ta", "ka", "di", "mi"]) as readonly [string, string, string, string],
    }),
  });

function assertBeat(beat: number): asserts beat is BeatNumber {
  if (!Number.isInteger(beat) || beat < 1 || beat > 4) {
    throw new RangeError("Beat number must be between 1 and 4.");
  }
}

function assertPositions(
  positions: readonly number[],
  partials: PartialCount,
): asserts positions is readonly PartialPosition[] {
  if (
    !Array.isArray(positions) ||
    positions.some(
      (position) => !Number.isInteger(position) || position < 0 || position >= partials,
    ) ||
    new Set(positions).size !== positions.length
  ) {
    throw new TypeError(
      `Subdivision positions must be unique integers from 0 through ${partials - 1}.`,
    );
  }
}

/* An eighth beat is counted at two positions, not four, and the labels for it
   are DERIVED from the four-partial table rather than written out again: the
   half-beat of an eighth beat is the same syllable as the "&" of a quarter
   beat, which is index 2. Taking indexes 0 and 2 yields "1 &" in standard,
   "1 te" in Eastman and "Ta di" in Takadimi — each the correct eighth-level
   count in its own system. A second hand-typed table would have been three
   more chances to be wrong about somebody else's pedagogy. */
function labelsForPartials(
  all: readonly [string, string, string, string],
  partials: PartialCount,
): readonly string[] {
  if (partials === 4) return all;
  return Object.freeze([all[0], all[2]]);
}

export function countLabelsForBeat(
  beat: number,
  system: CountingSystemId = "standard",
  partials: PartialCount = 4,
): readonly string[] {
  assertBeat(beat);
  const mapping = COUNTING_SYSTEMS[system];
  if (!mapping) throw new RangeError(`Unsupported counting system: ${String(system)}`);
  return labelsForPartials(mapping.labelsForBeat(beat), partials);
}

export function formatCounts(
  positions: readonly number[],
  beat: number = 1,
  system: CountingSystemId = "standard",
  partials: PartialCount = 4,
): string {
  assertPositions(positions, partials);
  const labels = countLabelsForBeat(beat, system, partials);
  return [...positions]
    .sort((left, right) => left - right)
    .map((position) => labels[position])
    .join(" ");
}

export function getPromptAnswer(
  prompt: RhythmPrompt,
  system: CountingSystemId = "standard",
): string {
  const { partialsPerBeat } = getMeter(prompt.meter);
  return prompt.cells
    .map((cell, index) => formatCounts(cell.activePositions, index + 1, system, partialsPerBeat))
    .filter(Boolean)
    .join(" | ");
}

export function getCompleteReference(
  scope: RhythmPrompt["scope"],
  system: CountingSystemId = "standard",
  meterId: MeterId = "4-4",
): string {
  const { beatsPerMeasure, partialsPerBeat } = getMeter(meterId);
  const beats = scope === "beat" ? 1 : beatsPerMeasure;
  return Array.from({ length: beats }, (_, index) =>
    countLabelsForBeat(index + 1, system, partialsPerBeat).join(" "),
  ).join(" | ");
}
