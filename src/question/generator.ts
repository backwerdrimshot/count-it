import {
  createBeatPrompt,
  createMeasurePrompt,
  explainPrompt,
  getCellsForLevel,
  getPromptAnswer,
  getPromptId,
  type DistractorCategory,
  type LevelId,
  type RhythmCell,
  type RhythmPrompt,
} from "../rhythm";
import { generateDistractors } from "./distractors";
import { createSeededRandom, pick, shuffle, type RandomSource } from "./random";

export type QuestionScope = RhythmPrompt["scope"];

export interface QuestionChoice {
  readonly id: string;
  readonly label: string;
  readonly category: DistractorCategory | "correct";
  readonly isCorrect: boolean;
}

export interface CountQuestion {
  readonly id: string;
  readonly prompt: RhythmPrompt;
  readonly correctAnswer: string;
  readonly correctChoiceId: string;
  readonly choices: readonly QuestionChoice[];
  readonly explanation: string;
}

export interface GenerateQuestionsOptions {
  readonly level: LevelId;
  readonly scope: QuestionScope;
  readonly count?: number;
  readonly seed: string | number;
}

function beatPrompts(cells: readonly RhythmCell[], count: number, random: RandomSource): RhythmPrompt[] {
  const prompts: RhythmPrompt[] = [];
  let previousId = "";
  while (prompts.length < count) {
    let cycle = shuffle(cells, random);
    if (cycle.length > 1 && cycle[0].id === previousId) {
      cycle = [...cycle.slice(1), cycle[0]];
    }
    for (const cell of cycle) {
      prompts.push(createBeatPrompt(cell));
      previousId = cell.id;
      if (prompts.length === count) break;
    }
  }
  return prompts;
}

function measurePrompts(cells: readonly RhythmCell[], count: number, random: RandomSource): RhythmPrompt[] {
  const prompts: RhythmPrompt[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (prompts.length < count && attempts < count * 100) {
    attempts += 1;
    const selected = Array.from({ length: 4 }, () => pick(cells, random)) as [
      RhythmCell,
      RhythmCell,
      RhythmCell,
      RhythmCell,
    ];
    const prompt = createMeasurePrompt(selected);
    const id = getPromptId(prompt);
    if (used.has(id)) continue;
    used.add(id);
    prompts.push(prompt);
  }
  if (prompts.length !== count) throw new Error("Unable to create a non-repeating measure session.");
  return prompts;
}

function buildQuestion(prompt: RhythmPrompt, index: number, random: RandomSource): CountQuestion {
  const correctAnswer = getPromptAnswer(prompt, "standard");
  const correctChoiceId = `q${index + 1}-correct`;
  const distractors = generateDistractors(prompt, random, 3);
  const choices = shuffle<QuestionChoice>(
    [
      Object.freeze({ id: correctChoiceId, label: correctAnswer, category: "correct" as const, isCorrect: true }),
      ...distractors.map((distractor, distractorIndex) =>
        Object.freeze({
          id: `q${index + 1}-d${distractorIndex + 1}`,
          label: distractor.label,
          category: distractor.category,
          isCorrect: false,
        }),
      ),
    ],
    random,
  );
  if (new Set(choices.map((choice) => choice.label)).size !== choices.length) {
    throw new Error("Question choices must be unique.");
  }
  if (choices.filter((choice) => choice.isCorrect).length !== 1) {
    throw new Error("A question must have exactly one correct answer.");
  }
  return Object.freeze({
    id: `question-${index + 1}-${getPromptId(prompt)}`,
    prompt,
    correctAnswer,
    correctChoiceId,
    choices: Object.freeze(choices),
    explanation: explainPrompt(prompt),
  });
}

export function generateQuestions({
  level,
  scope,
  count = 5,
  seed,
}: GenerateQuestionsOptions): readonly CountQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError("Question count must be between 1 and 20.");
  }
  if (scope !== "beat" && scope !== "measure") throw new RangeError(`Unsupported question scope: ${scope}`);
  const cells = getCellsForLevel(level);
  const random = createSeededRandom(`${seed}:${level}:${scope}`);
  const prompts = scope === "beat"
    ? beatPrompts(cells, count, random)
    : measurePrompts(cells, count, random);
  return Object.freeze(prompts.map((prompt, index) => buildQuestion(prompt, index, random)));
}
