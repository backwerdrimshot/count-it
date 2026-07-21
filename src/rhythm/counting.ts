import type {
  BeatNumber,
  CountingSystemId,
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
): asserts positions is readonly PartialPosition[] {
  if (
    !Array.isArray(positions) ||
    positions.some((position) => !Number.isInteger(position) || position < 0 || position > 3) ||
    new Set(positions).size !== positions.length
  ) {
    throw new TypeError("Subdivision positions must be unique integers from 0 through 3.");
  }
}

export function countLabelsForBeat(
  beat: number,
  system: CountingSystemId = "standard",
): readonly [string, string, string, string] {
  assertBeat(beat);
  const mapping = COUNTING_SYSTEMS[system];
  if (!mapping) throw new RangeError(`Unsupported counting system: ${String(system)}`);
  return mapping.labelsForBeat(beat);
}

export function formatCounts(
  positions: readonly number[],
  beat: number = 1,
  system: CountingSystemId = "standard",
): string {
  assertPositions(positions);
  const labels = countLabelsForBeat(beat, system);
  return [...positions]
    .sort((left, right) => left - right)
    .map((position) => labels[position])
    .join(" ");
}

export function getPromptAnswer(
  prompt: RhythmPrompt,
  system: CountingSystemId = "standard",
): string {
  return prompt.cells
    .map((cell, index) => formatCounts(cell.activePositions, index + 1, system))
    .filter(Boolean)
    .join(" | ");
}

export function getCompleteReference(
  scope: RhythmPrompt["scope"],
  system: CountingSystemId = "standard",
): string {
  const beats = scope === "beat" ? 1 : 4;
  return Array.from({ length: beats }, (_, index) =>
    countLabelsForBeat(index + 1, system).join(" "),
  ).join(" | ");
}
