import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUESTIONS,
  uniqueMeasures,
} from "../src/assignment";
import { generateQuestions, type QuestionScope } from "../src/question";
import {
  LEVELS,
  METER_IDS,
  getCellsForLevel,
  getMeter,
  type LevelId,
  type MeterId,
} from "../src/rhythm";

/* Every state the setup panel can be clicked into must build a round.
 *
 * This file exists because two white screens shipped in one day, and the suite
 * was green for both. Both were the same shape — a constant that was only ever
 * safe while every bar had four beats — and both were reachable by clicking:
 *
 *   1. A full-measure round asked for twelve prompts. Two rhythms in a
 *      three-beat bar make eight distinct measures, so the generator threw.
 *   2. A one-beat question asked for three distractors. An eighth beat has two
 *      counted positions, so a 3/8 beat question has three possible answers in
 *      total and at most two wrong ones, so the generator threw.
 *
 * Neither was reachable from a test, because every test NAMED ITS OWN
 * VOCABULARY — an explicit `cells` list, sized to whatever the test needed.
 * The app does not. It hands the generator whatever the three controls
 * currently say, and the failures lived in the combinations nobody wrote down.
 *
 * So this enumerates the controls instead of the cases: every meter, every
 * level, every question size, at the round sizes CountItApp actually asks for.
 * The lists come from the app's own exports, so a fourth meter or a fourth
 * level is covered the day it is added rather than the day someone remembers
 * this file. */

/* The practice memo in CountItApp, restated once. A full-measure round never
   repeats a measure, so the pool sets a ceiling the control cannot see. */
function practiceCount(level: LevelId, meter: MeterId, scope: QuestionScope): number {
  if (scope !== "measure") return 12;
  const { beatUnit, beatsPerMeasure } = getMeter(meter);
  const pool = getCellsForLevel(level, beatUnit);
  return Math.max(1, Math.min(12, uniqueMeasures(pool, beatsPerMeasure)));
}

const SCOPES: readonly QuestionScope[] = ["beat", "measure"];

describe("every state the setup panel can reach", () => {
  it("builds a practice round, for every meter, level and question size", () => {
    const failures: string[] = [];
    let built = 0;
    for (const meter of METER_IDS) {
      for (const level of LEVELS) {
        for (const scope of SCOPES) {
          const where = `${meter} · ${level.id} · ${scope}`;
          try {
            const questions = generateQuestions({
              level: level.id,
              scope,
              meter,
              count: practiceCount(level.id, meter, scope),
              seed: `practice-${where}`,
            });
            expect(questions.length, where).toBeGreaterThan(0);
            for (const question of questions) {
              /* A question a student cannot answer is as broken as one that
                 throws: exactly one correct choice, and no repeated option. */
              expect(question.choices.filter((c) => c.isCorrect), where).toHaveLength(1);
              expect(
                new Set(question.choices.map((c) => c.label)).size,
                `${where} repeats a choice`,
              ).toBe(question.choices.length);
              expect(question.choices.length, `${where} offers too few choices`)
                .toBeGreaterThanOrEqual(3);
            }
            built += 1;
          } catch (error) {
            failures.push(`${where}: ${(error as Error).message}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
    /* A loop that silently covered nothing would pass. */
    expect(built).toBe(METER_IDS.length * LEVELS.length * SCOPES.length);
  });

  it("builds a challenge round, for every meter, level and question size", () => {
    /* The challenge asks for DEFAULT_QUESTIONS rather than twelve, and does not
       clamp — a shorter round is further from the ceiling, so this is the
       cheaper half. It is here anyway because "practice works" and "the scored
       round works" are two claims, and the app has two code paths. */
    const failures: string[] = [];
    for (const meter of METER_IDS) {
      for (const level of LEVELS) {
        for (const scope of SCOPES) {
          const where = `${meter} · ${level.id} · ${scope}`;
          try {
            const questions = generateQuestions({
              level: level.id,
              scope,
              meter,
              count: DEFAULT_QUESTIONS,
              seed: `challenge-${where}`,
            });
            expect(questions, where).toHaveLength(DEFAULT_QUESTIONS);
          } catch (error) {
            failures.push(`${where}: ${(error as Error).message}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("survives a student naming themselves, which rebuilds the round", () => {
    /* changeStudentId rebuilds the session with a `variant`, on the same
       conditions. It reshuffles the choices only — but it is a second call
       into the generator from a control, so it is a state the panel reaches. */
    const failures: string[] = [];
    for (const meter of METER_IDS) {
      for (const scope of SCOPES) {
        const where = `${meter} · ${scope}`;
        try {
          generateQuestions({
            level: "level-3", scope, meter,
            count: DEFAULT_QUESTIONS, seed: `variant-${where}`, variant: "a-student",
          });
        } catch (error) {
          failures.push(`${where}: ${(error as Error).message}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
