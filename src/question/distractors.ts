import { formatCounts, getPromptAnswer } from "../rhythm/counting";
import type {
  DistractorCategory,
  PartialPosition,
  RhythmPrompt,
} from "../rhythm/types";
import type { RandomSource } from "./random";
import { shuffle } from "./random";

export interface Distractor {
  readonly id: string;
  readonly label: string;
  readonly category: DistractorCategory;
}

type Grid = readonly (readonly boolean[])[];

function promptGrid(prompt: RhythmPrompt): Grid {
  return prompt.cells.map((cell) =>
    Array.from({ length: 4 }, (_, partial) =>
      cell.activePositions.includes(partial as PartialPosition),
    ),
  );
}

function answerForGrid(grid: Grid): string {
  return grid
    .map((beat, index) => {
      const positions = beat.flatMap((active, partial) =>
        active ? [partial as PartialPosition] : [],
      );
      return formatCounts(positions, index + 1, "standard");
    })
    .filter(Boolean)
    .join(" | ");
}

function activeKeys(grid: Grid): Set<string> {
  return new Set(
    grid.flatMap((beat, beatIndex) =>
      beat.flatMap((active, partial) => (active ? [`${beatIndex}:${partial}`] : [])),
    ),
  );
}

function isSubset(left: Set<string>, right: Set<string>): boolean {
  return [...left].every((value) => right.has(value));
}

function classifyGrid(correct: Grid, candidate: Grid): DistractorCategory {
  const correctKeys = activeKeys(correct);
  const candidateKeys = activeKeys(candidate);
  if (candidateKeys.size < correctKeys.size && isSubset(candidateKeys, correctKeys)) {
    return "omitted_sound";
  }
  if (candidateKeys.size > correctKeys.size && isSubset(correctKeys, candidateKeys)) {
    return "added_sound";
  }
  const changedPartials = new Set<number>();
  correct.forEach((beat, beatIndex) => {
    beat.forEach((active, partial) => {
      if (active !== candidate[beatIndex][partial]) changedPartials.add(partial);
    });
  });
  if (changedPartials.has(2) && (changedPartials.has(1) || changedPartials.has(3))) {
    return "eighth_sixteenth_confusion";
  }
  return "shifted_subdivision";
}

function withMask(grid: Grid, beatIndex: number, maskValue: number): Grid {
  return grid.map((beat, index) =>
    index === beatIndex
      ? Array.from({ length: 4 }, (_, partial) =>
          Boolean(maskValue & (1 << (3 - partial))),
        )
      : [...beat],
  );
}

function wrongBeatNumber(answer: string): string | null {
  const match = answer.match(/\b([1-4])\b/);
  if (!match || match.index === undefined) return null;
  const original = Number(match[1]);
  const replacement = String((original % 4) + 1);
  return `${answer.slice(0, match.index)}${replacement}${answer.slice(match.index + 1)}`;
}

export function generateDistractors(
  prompt: RhythmPrompt,
  random: RandomSource,
  count = 3,
): readonly Distractor[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("Distractor count must be positive.");
  const correctAnswer = getPromptAnswer(prompt, "standard");
  const correctGrid = promptGrid(prompt);
  const allowed = new Set(prompt.cells.flatMap((cell) => cell.permittedDistractors));
  const candidates = new Map<string, Distractor>();

  for (let beatIndex = 0; beatIndex < correctGrid.length; beatIndex += 1) {
    const currentMask = correctGrid[beatIndex].reduce(
      (value, active, partial) => value | (active ? 1 << (3 - partial) : 0),
      0,
    );
    for (let mask = 1; mask < 16; mask += 1) {
      if (mask === currentMask) continue;
      const candidateGrid = withMask(correctGrid, beatIndex, mask);
      const label = answerForGrid(candidateGrid);
      if (!label || label === correctAnswer || candidates.has(label)) continue;
      const category = classifyGrid(correctGrid, candidateGrid);
      if (!allowed.has(category)) continue;
      candidates.set(label, Object.freeze({ id: `d-${candidates.size + 1}`, label, category }));
    }
  }

  const wrongNumber = wrongBeatNumber(correctAnswer);
  if (
    wrongNumber &&
    wrongNumber !== correctAnswer &&
    !candidates.has(wrongNumber) &&
    allowed.has("wrong_beat_number")
  ) {
    candidates.set(
      wrongNumber,
      Object.freeze({ id: `d-${candidates.size + 1}`, label: wrongNumber, category: "wrong_beat_number" }),
    );
  }

  const shuffled = shuffle([...candidates.values()], random);
  const selected: Distractor[] = [];
  const usedCategories = new Set<DistractorCategory>();
  for (const candidate of shuffled) {
    if (!usedCategories.has(candidate.category)) {
      selected.push(candidate);
      usedCategories.add(candidate.category);
    }
    if (selected.length === count) break;
  }
  for (const candidate of shuffled) {
    if (selected.length === count) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  if (selected.length !== count) {
    throw new Error("The verified vocabulary could not produce enough unique distractors.");
  }
  if (selected.some((candidate) => candidate.label === correctAnswer)) {
    throw new Error("A distractor matched the verified correct answer.");
  }
  return Object.freeze(selected.map((candidate) => Object.freeze(candidate)));
}

export function isGenuinelyIncorrect(prompt: RhythmPrompt, distractor: Distractor): boolean {
  return distractor.label !== getPromptAnswer(prompt, "standard");
}
