import { formatCounts, getPromptAnswer } from "../rhythm/counting";
import { getMeter } from "../rhythm/meter";
import type {
  DistractorCategory,
  PartialCount,
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

/* Every function below used to assume a four-position beat: a four-bit mask, a
   shift of `3 - partial`, and a beat number that wrapped at four. On an eighth
   beat there are two positions and three beats, so each of those constants is
   now the meter's. Nothing about the ALGORITHM changed — a wrong answer is
   still every other way the beat could have been filled. */
function promptGrid(prompt: RhythmPrompt, partials: PartialCount): Grid {
  return prompt.cells.map((cell) =>
    Array.from({ length: partials }, (_, partial) =>
      cell.activePositions.includes(partial as PartialPosition),
    ),
  );
}

function answerForGrid(grid: Grid, partials: PartialCount): string {
  return grid
    .map((beat, index) => {
      const positions = beat.flatMap((active, partial) =>
        active ? [partial as PartialPosition] : [],
      );
      return formatCounts(positions, index + 1, "standard", partials);
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

function classifyGrid(correct: Grid, candidate: Grid, partials: PartialCount): DistractorCategory {
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
  /* Confusing an eighth for a sixteenth needs both to be on the page, and on a
     two-position beat neither the e nor the a exists — the beat and its & are
     the only places a note can be. Such a miss is a shifted subdivision and is
     labelled as one, rather than borrowing a category that would tell a
     teacher the student mixed up two values the notation never showed them. */
  if (
    partials === 4 &&
    changedPartials.has(2) &&
    (changedPartials.has(1) || changedPartials.has(3))
  ) {
    return "eighth_sixteenth_confusion";
  }
  return "shifted_subdivision";
}

function withMask(
  grid: Grid,
  beatIndex: number,
  maskValue: number,
  partials: PartialCount,
): Grid {
  return grid.map((beat, index) =>
    index === beatIndex
      ? Array.from({ length: partials }, (_, partial) =>
          Boolean(maskValue & (1 << (partials - 1 - partial))),
        )
      : [...beat],
  );
}

/* Wraps at the bar, not at four. In 3/4 and 3/8 there is no beat 4, so the old
   form offered "4" as a plausible miscount in a three-beat bar — a distractor
   naming a beat the measure does not have is not a miscount a student could
   make, it is a wrong answer they can eliminate without reading the rhythm. */
function wrongBeatNumber(answer: string, beatsPerMeasure: number): string | null {
  const match = answer.match(new RegExp(`\\b([1-${beatsPerMeasure}])\\b`));
  if (!match || match.index === undefined) return null;
  const original = Number(match[1]);
  const replacement = String((original % beatsPerMeasure) + 1);
  return `${answer.slice(0, match.index)}${replacement}${answer.slice(match.index + 1)}`;
}

export function generateDistractors(
  prompt: RhythmPrompt,
  random: RandomSource,
  count = 3,
): readonly Distractor[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("Distractor count must be positive.");
  const { partialsPerBeat, beatsPerMeasure } = getMeter(prompt.meter);
  const correctAnswer = getPromptAnswer(prompt, "standard");
  const correctGrid = promptGrid(prompt, partialsPerBeat);
  const allowed = new Set(prompt.cells.flatMap((cell) => cell.permittedDistractors));
  const candidates = new Map<string, Distractor>();

  for (let beatIndex = 0; beatIndex < correctGrid.length; beatIndex += 1) {
    const currentMask = correctGrid[beatIndex].reduce(
      (value, active, partial) => value | (active ? 1 << (partialsPerBeat - 1 - partial) : 0),
      0,
    );
    for (let mask = 1; mask < 2 ** partialsPerBeat; mask += 1) {
      if (mask === currentMask) continue;
      const candidateGrid = withMask(correctGrid, beatIndex, mask, partialsPerBeat);
      const label = answerForGrid(candidateGrid, partialsPerBeat);
      if (!label || label === correctAnswer || candidates.has(label)) continue;
      const category = classifyGrid(correctGrid, candidateGrid, partialsPerBeat);
      if (!allowed.has(category)) continue;
      candidates.set(label, Object.freeze({ id: `d-${candidates.size + 1}`, label, category }));
    }
  }

  const wrongNumber = wrongBeatNumber(correctAnswer, beatsPerMeasure);
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
