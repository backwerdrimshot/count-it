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

  it("varies the answer order per student without changing the questions", () => {
    /* The seed exists so every student gets the SAME questions, which is what
       makes the scores comparable — and it also fixed where the correct answer
       sat, so one student could post "4, 4, 2, 3, 4" and the class scored full
       marks without reading a notehead. The variant moves the choices only. */
    const options = { level: "level-3" as const, scope: "beat" as const, count: 8, seed: "class-a" };
    const sam = generateQuestions({ ...options, variant: "sam" });
    const alex = generateQuestions({ ...options, variant: "alex" });

    const asked = (questions: typeof sam) =>
      questions.map((question) => `${question.prompt.cells.map((cell) => cell.id).join("+")}|${question.correctAnswer}`);
    const options_of = (questions: typeof sam) =>
      questions.map((question) => [...question.choices.map((choice) => choice.label)].sort().join(","));
    const key = (questions: typeof sam) =>
      questions.map((question) => question.choices.findIndex((choice) => choice.isCorrect)).join(",");

    // Same rhythms, same four options on every question...
    expect(asked(sam)).toEqual(asked(alex));
    expect(options_of(sam)).toEqual(options_of(alex));
    // ...and an answer key that does not transfer between them.
    expect(key(sam)).not.toBe(key(alex));
    // Still repeatable: the same student sitting the same link twice matches.
    expect(key(generateQuestions({ ...options, variant: "sam" }))).toBe(key(sam));
  });

  it("leaves a round with no variant exactly as it was", () => {
    /* The guarantee the parameter rests on: every link posted before variants
       existed must still produce the round it produced then. */
    const options = { level: "level-2" as const, scope: "beat" as const, count: 6, seed: 20260815 };
    expect(generateQuestions({ ...options, variant: undefined })).toEqual(generateQuestions(options));
    expect(generateQuestions({ ...options, variant: "" })).toEqual(generateQuestions(options));
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

describe("questions in three", () => {
  /* A distractor has to be a MISCOUNT — something a student could plausibly
     hear or read wrong. A wrong answer naming a beat the bar does not contain
     is none of those: it can be eliminated without reading a single notehead,
     which quietly turns a four-choice question into a three-choice one. */
  it("never offers a beat number the meter does not have", () => {
    for (const [meter, cells] of [
      ["3-4", ["quarter", "eighths", "sixteenths"]],
      ["3-8", ["eighth-beat", "two-sixteenths", "rest-sixteenth"]],
    ] as const) {
      const questions = generateQuestions({
        level: "level-3",
        scope: "measure",
        meter,
        count: 12,
        seed: `three-${meter}`,
        cells: [...cells],
      });
      expect(questions).toHaveLength(12);
      for (const question of questions) {
        for (const choice of question.choices) {
          expect(choice.label).not.toMatch(/\b4\b/);
        }
      }
    }

    /* Straight to the case that actually exercises the wrap. The wrong-beat
       distractor rewrites the FIRST beat number it finds, so a bar whose
       opening beats sound only off the beat is the one where the wrap can
       reach the last beat and roll past the end of the bar. With beats one and
       two silent on the beat, the first digit in "& | & | 3" is a 3 — and a
       wrap at four turns it into a beat this meter does not have. */
    const offBeatOpening = createMeasurePrompt(
      ["rest-sixteenth", "rest-sixteenth", "eighth-beat"],
      "3-8",
    );
    expect(getPromptAnswer(offBeatOpening)).toBe("& | & | 3");
    for (const distractor of generateDistractors(offBeatOpening, createSeededRandom("wrap"), 3)) {
      expect(distractor.label).not.toMatch(/\b4\b/);
    }
    const threeFourOpening = createMeasurePrompt(
      ["rest-eighth", "rest-eighth", "quarter"],
      "3-4",
    );
    expect(getPromptAnswer(threeFourOpening)).toBe("& | & | 3");
    for (const distractor of generateDistractors(threeFourOpening, createSeededRandom("wrap"), 3)) {
      expect(distractor.label).not.toMatch(/\b4\b/);
    }

    /* And 4/4 still offers it, so the rule above is bounded by the meter
       rather than by a blanket ban on the digit. */
    const fourFour = generateQuestions({
      level: "level-3",
      scope: "measure",
      count: 12,
      seed: "three-4-4",
      cells: ["quarter", "eighths", "sixteenths"],
    });
    expect(
      fourFour.some((question) => question.choices.some((choice) => /\b4\b/.test(choice.label))),
    ).toBe(true);
  });

  it("builds bars of the right length and counts them from the right beat", () => {
    for (const [meter, beats] of [["4-4", 4], ["3-4", 3], ["3-8", 3]] as const) {
      const cells = meter === "3-8"
        ? ["eighth-beat", "two-sixteenths", "rest-sixteenth"]
        : ["quarter", "eighths", "sixteenths"];
      const questions = generateQuestions({
        level: "level-3", scope: "measure", meter, count: 6, seed: `bars-${meter}`, cells,
      });
      for (const question of questions) {
        expect(question.prompt.cells).toHaveLength(beats);
        expect(question.prompt.meter).toBe(meter);
        /* The answer names one group per beat, separated by pipes — and a beat
           whose only sound is off the beat contributes a syllable, not a
           number, so the group count is what is checked rather than the digits. */
        expect(question.correctAnswer.split("|")).toHaveLength(beats);
      }
    }
  });

  it("keeps every 4/4 round byte-identical to one generated before meters existed", () => {
    /* The meter is mixed into the seed ONLY when it is not 4/4. If that ever
       changes, every assignment link already posted in a classroom silently
       becomes a different round — which is the one thing a seed exists to
       prevent. Passing the default explicitly must equal omitting it. */
    const omitted = generateQuestions({
      level: "level-2", scope: "measure", count: 8, seed: "stability",
    });
    const explicit = generateQuestions({
      level: "level-2", scope: "measure", meter: "4-4", count: 8, seed: "stability",
    });
    expect(explicit.map((question) => question.correctAnswer)).toEqual(
      omitted.map((question) => question.correctAnswer),
    );
    expect(explicit.map((question) => question.choices.map((choice) => choice.label))).toEqual(
      omitted.map((question) => question.choices.map((choice) => choice.label)),
    );
  });
});
