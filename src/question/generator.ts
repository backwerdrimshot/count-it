import {
  createBeatPrompt,
  createMeasurePrompt,
  explainPrompt,
  getCellsByIds,
  getCellsForLevel,
  getPromptAnswer,
  getPromptId,
  DEFAULT_METER,
  getMeter,
  type DistractorCategory,
  type LevelId,
  type MeterId,
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
  /** The meter the round is read in. Absent, 4/4 — so every link, seed and
   *  saved round written before meters existed generates the same questions. */
  readonly meter?: MeterId;
  readonly count?: number;
  readonly seed: string | number;
  /** An explicit cell vocabulary, by id. When present it SUPERSEDES the level
   *  entirely — an assignment that names its rhythms means those rhythms and
   *  no others. Absent, the level's cumulative vocabulary is used exactly as
   *  before, so every existing caller and every existing seed is untouched. */
  readonly cells?: readonly string[];
  /** Who is sitting the round, as an opaque string.
   *
   *  A seed exists so every student gets the SAME questions, which is what
   *  makes their scores comparable. It also fixed the position of the correct
   *  answer, so one student could post "4, 4, 2, 3, 4" and the rest of the
   *  class scored full marks without reading a notehead.
   *
   *  This varies the ORDER OF THE CHOICES ONLY. The prompts and the distractor
   *  set are still drawn from `seed` alone, so two students answer identical
   *  questions with identical options — the answer key just stops transferring.
   *  Absent, the round is byte-identical to one generated before this existed. */
  readonly variant?: string;
}

function beatPrompts(
  cells: readonly RhythmCell[],
  count: number,
  random: RandomSource,
  meter: MeterId,
): RhythmPrompt[] {
  const prompts: RhythmPrompt[] = [];
  let previousId = "";
  while (prompts.length < count) {
    let cycle = shuffle(cells, random);
    if (cycle.length > 1 && cycle[0].id === previousId) {
      cycle = [...cycle.slice(1), cycle[0]];
    }
    for (const cell of cycle) {
      prompts.push(createBeatPrompt(cell, meter));
      previousId = cell.id;
      if (prompts.length === count) break;
    }
  }
  return prompts;
}

function measurePrompts(
  cells: readonly RhythmCell[],
  count: number,
  random: RandomSource,
  meter: MeterId,
): RhythmPrompt[] {
  const prompts: RhythmPrompt[] = [];
  const used = new Set<string>();
  let attempts = 0;
  const { beatsPerMeasure } = getMeter(meter);
  while (prompts.length < count && attempts < count * 100) {
    attempts += 1;
    /* Fill the bar by SPAN rather than by taking one cell per beat. A pool
       holding a half note can overshoot — two halves and a quarter is five
       beats — so a draw that does not land exactly on the bar line is
       discarded and retried rather than trimmed, which would silently change
       the vocabulary the round was asked for. */
    const selected: RhythmCell[] = [];
    let filled = 0;
    while (filled < beatsPerMeasure) {
      const cell = pick(cells, random);
      if (filled + cell.beats > beatsPerMeasure) break;
      selected.push(cell);
      filled += cell.beats;
    }
    if (filled !== beatsPerMeasure) continue;
    /* A bar of nothing but rests has no answer to ask for. */
    if (!selected.some((cell) => cell.activePositions.length > 0)) continue;
    const prompt = createMeasurePrompt(selected, meter);
    const id = getPromptId(prompt);
    if (used.has(id)) continue;
    used.add(id);
    prompts.push(prompt);
  }
  if (prompts.length !== count) throw new Error("Unable to create a non-repeating measure session.");
  return prompts;
}

function buildQuestion(
  prompt: RhythmPrompt,
  index: number,
  random: RandomSource,
  presentation: RandomSource | null,
): CountQuestion {
  const correctAnswer = getPromptAnswer(prompt, "standard");
  const correctChoiceId = `q${index + 1}-correct`;
  const distractors = generateDistractors(prompt, random, 3);
  const ordered = shuffle<QuestionChoice>(
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
  /* Reshuffled from a second source rather than seeding the first one
     differently, so the draw above consumes exactly the randomness it always
     did. That is what keeps the QUESTIONS — prompts and distractor sets, which
     come off the same stream — identical for every student and identical to
     every round generated before variants existed. */
  const choices = presentation ? shuffle(ordered, presentation) : ordered;
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
  meter = DEFAULT_METER,
  count = 5,
  seed,
  cells: cellIds,
  variant,
}: GenerateQuestionsOptions): readonly CountQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError("Question count must be between 1 and 20.");
  }
  if (scope !== "beat" && scope !== "measure") throw new RangeError(`Unsupported question scope: ${scope}`);
  let cells = cellIds ? getCellsByIds(cellIds) : getCellsForLevel(level);
  /* A one-beat question cannot ask a half note, so a beat-scope round drops
     them rather than throwing. Dropping is right HERE and wrong in the
     assignment layer: this is the app's own vocabulary for a scope the student
     chose, where a link that NAMES a half note and asks for beat scope is
     refused outright, because a teacher who wrote it meant something the round
     cannot deliver. */
  if (scope === "beat") cells = cells.filter((cell) => cell.beats === 1);
  if (cells.length === 0) throw new RangeError("A round needs at least one rhythm cell.");
  // The seed string carries the vocabulary, so two rounds that share a seed but
  // name different rhythms are different rounds. A pooled round mixes the pool
  // in rather than the level, so adding this parameter cannot move any seed
  // that existed before it.
  //
  // The meter is mixed in ONLY when it is not 4/4, for the same reason: a
  // round generated before meters existed must still generate byte-identically
  // today, and appending ":4-4" to every seed would have silently reshuffled
  // every assignment already posted in a classroom.
  const vocabulary = cellIds ? getCellsByIds(cellIds).map((cell) => cell.id).join(",") : level;
  const meterKey = meter === DEFAULT_METER ? "" : `:${meter}`;
  const random = createSeededRandom(`${seed}:${vocabulary}:${scope}${meterKey}`);
  const presentation = variant
    ? createSeededRandom(`${seed}:${vocabulary}:${scope}${meterKey}:${variant}`)
    : null;
  const prompts = scope === "beat"
    ? beatPrompts(cells, count, random, meter)
    : measurePrompts(cells, count, random, meter);
  return Object.freeze(
    prompts.map((prompt, index) => buildQuestion(prompt, index, random, presentation)),
  );
}
