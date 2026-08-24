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
    const selected = Array.from({ length: beatsPerMeasure }, () => pick(cells, random));
    const prompt = createMeasurePrompt(selected, meter);
    const id = getPromptId(prompt);
    if (used.has(id)) continue;
    used.add(id);
    prompts.push(prompt);
  }
  if (prompts.length !== count) throw new Error("Unable to create a non-repeating measure session.");
  return prompts;
}

/* How many wrong answers a question can honestly carry.
 *
 * Three, everywhere except one place. A beat with P counted positions can be
 * filled 2^P - 1 ways, so a ONE-BEAT question in 3/8 — where an eighth beat
 * has two positions — has three possible answers in total and therefore at
 * most two wrong ones. Asking for three threw, and because the ask sits under
 * a useMemo it took the whole app down: choosing 3/8 in free practice was a
 * white screen.
 *
 * The fix is not to relax the shortfall check. It is to ask for what the meter
 * can actually distinguish: a 3/8 one-beat question is a THREE-choice
 * question, and saying so is honest where padding it with a fourth option that
 * repeats one of the other three would not be. Everywhere else the ceiling is
 * far above three, so the number and the strictness are both unchanged — 4/4
 * still asks for three and still throws if it cannot produce them. */
function distractorTarget(prompt: RhythmPrompt): number {
  const { partialsPerBeat } = getMeter(prompt.meter);
  const fillsPerBeat = 2 ** partialsPerBeat - 1;
  const answers = fillsPerBeat ** prompt.cells.length;
  return Math.max(1, Math.min(3, answers - 1));
}

function buildQuestion(
  prompt: RhythmPrompt,
  index: number,
  random: RandomSource,
  presentation: RandomSource | null,
): CountQuestion {
  const correctAnswer = getPromptAnswer(prompt, "standard");
  const correctChoiceId = `q${index + 1}-correct`;
  const distractors = generateDistractors(prompt, random, distractorTarget(prompt));
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
  const { beatUnit } = getMeter(meter);
  const cells = cellIds ? getCellsByIds(cellIds) : getCellsForLevel(level, beatUnit);
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
