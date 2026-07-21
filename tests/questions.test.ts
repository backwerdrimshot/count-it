import { describe, expect, it } from "vitest";
import {
  RHYTHM_CELLS,
  createBeatPrompt,
  createMeasurePrompt,
  getPromptAnswer,
} from "../src/rhythm";
import {
  advanceSession,
  answerSession,
  createSeededRandom,
  createSession,
  generateDistractors,
  generateQuestions,
  getAccuracy,
  getCurrentQuestion,
  getCurrentResponse,
  isGenuinelyIncorrect,
  resetSession,
} from "../src/question";

describe("diagnostic distractors", () => {
  it("proves every cell distractor is unique and genuinely incorrect", () => {
    for (const cell of RHYTHM_CELLS) {
      const prompt = createBeatPrompt(cell);
      const distractors = generateDistractors(prompt, createSeededRandom(cell.id));
      expect(distractors).toHaveLength(3);
      expect(new Set(distractors.map((choice) => choice.label)).size).toBe(3);
      expect(distractors.every((choice) => isGenuinelyIncorrect(prompt, choice))).toBe(true);
      expect(distractors.every((choice) => choice.label !== getPromptAnswer(prompt))).toBe(true);
    }
  });

  it("produces verified measure distractors without changing the source prompt", () => {
    const prompt = createMeasurePrompt(["quarter", "eighths", "rest-eighth", "sixteenths"]);
    const before = getPromptAnswer(prompt);
    const distractors = generateDistractors(prompt, createSeededRandom("measure"));
    expect(distractors.every((choice) => choice.label !== before)).toBe(true);
    expect(getPromptAnswer(prompt)).toBe(before);
  });
});

describe("seeded question generation", () => {
  it("is repeatable and randomizes answer order deterministically", () => {
    const options = { level: "level-3" as const, scope: "beat" as const, count: 8, seed: "class-a" };
    expect(generateQuestions(options)).toEqual(generateQuestions(options));
    expect(generateQuestions(options)).not.toEqual(generateQuestions({ ...options, seed: "class-b" }));
  });

  it("creates exactly one correct answer and no duplicate choices", () => {
    const questions = generateQuestions({ level: "level-3", scope: "measure", count: 6, seed: 42 });
    for (const question of questions) {
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
      expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(question.choices.length);
      expect(question.choices.find((choice) => choice.isCorrect)?.label).toBe(question.correctAnswer);
    }
  });

  it("does not repeat a beat prompt until the selected vocabulary is exhausted", () => {
    const questions = generateQuestions({ level: "level-2", scope: "beat", count: 4, seed: 9 });
    expect(new Set(questions.map((question) => question.prompt.cells[0].id)).size).toBe(4);
  });

  it("rejects unsupported generation requests", () => {
    expect(() => generateQuestions({ level: "level-1", scope: "beat", count: 0, seed: 1 })).toThrow(
      /between 1 and 20/,
    );
    expect(() =>
      generateQuestions({ level: "level-1", scope: "triplet" as never, count: 5, seed: 1 }),
    ).toThrow(/Unsupported question scope/);
  });
});

describe("challenge session scoring", () => {
  const questions = generateQuestions({ level: "level-2", scope: "beat", count: 3, seed: 17 });

  it("scores, advances, completes, and reports accuracy", () => {
    let session = createSession(questions);
    const first = getCurrentQuestion(session);
    session = answerSession(session, first.correctChoiceId);
    expect(session.score).toBe(1);
    expect(getCurrentResponse(session)?.correct).toBe(true);
    session = advanceSession(session);

    const second = getCurrentQuestion(session);
    const incorrect = second.choices.find((choice) => !choice.isCorrect)!;
    session = answerSession(session, incorrect.id);
    expect(session.score).toBe(1);
    expect(getAccuracy(session)).toBe(50);
    session = advanceSession(session);

    const third = getCurrentQuestion(session);
    session = answerSession(session, third.correctChoiceId);
    session = advanceSession(session);
    expect(session.status).toBe("complete");
    expect(session.score).toBe(2);
    expect(getAccuracy(session)).toBe(67);
  });

  it("requires an answer before advancing and resets cleanly", () => {
    const session = createSession(questions);
    expect(() => advanceSession(session)).toThrow(/before advancing/);
    const answered = answerSession(session, getCurrentQuestion(session).correctChoiceId);
    const reset = resetSession(answered);
    expect(reset.currentIndex).toBe(0);
    expect(reset.score).toBe(0);
    expect(reset.responses).toEqual([]);
    expect(reset.status).toBe("active");
  });

  it("rejects unknown choices and duplicate answers", () => {
    const session = createSession(questions);
    expect(() => answerSession(session, "not-a-choice")).toThrow(/does not belong/);
    const answered = answerSession(session, getCurrentQuestion(session).correctChoiceId);
    expect(() => answerSession(answered, getCurrentQuestion(answered).correctChoiceId)).toThrow(
      /already been answered/,
    );
  });
});
