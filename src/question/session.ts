import type { CountQuestion } from "./generator";

export interface SessionResponse {
  readonly questionId: string;
  readonly choiceId: string;
  readonly correct: boolean;
}

export interface ChallengeSession {
  readonly questions: readonly CountQuestion[];
  readonly currentIndex: number;
  readonly score: number;
  readonly responses: readonly SessionResponse[];
  readonly status: "active" | "complete";
}

function validateQuestions(questions: readonly CountQuestion[]): void {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new TypeError("A challenge session requires at least one question.");
  }
  for (const question of questions) {
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
      throw new TypeError(`${question.id} must have exactly one correct choice.`);
    }
  }
}

export function createSession(questions: readonly CountQuestion[]): ChallengeSession {
  validateQuestions(questions);
  return Object.freeze({
    questions: Object.freeze([...questions]),
    currentIndex: 0,
    score: 0,
    responses: Object.freeze([]),
    status: "active" as const,
  });
}

export function getCurrentQuestion(session: ChallengeSession): CountQuestion {
  return session.questions[session.currentIndex];
}

export function getCurrentResponse(session: ChallengeSession): SessionResponse | undefined {
  return session.responses.find(
    (response) => response.questionId === getCurrentQuestion(session).id,
  );
}

export function answerSession(session: ChallengeSession, choiceId: string): ChallengeSession {
  if (session.status !== "active") throw new Error("This challenge session is complete.");
  if (getCurrentResponse(session)) throw new Error("The current question has already been answered.");
  const question = getCurrentQuestion(session);
  const choice = question.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new RangeError("That answer choice does not belong to the current question.");
  const response = Object.freeze({ questionId: question.id, choiceId, correct: choice.isCorrect });
  return Object.freeze({
    ...session,
    score: session.score + (choice.isCorrect ? 1 : 0),
    responses: Object.freeze([...session.responses, response]),
  });
}

export function advanceSession(session: ChallengeSession): ChallengeSession {
  if (session.status !== "active") return session;
  if (!getCurrentResponse(session)) throw new Error("Answer the current question before advancing.");
  if (session.currentIndex === session.questions.length - 1) {
    return Object.freeze({ ...session, status: "complete" as const });
  }
  return Object.freeze({ ...session, currentIndex: session.currentIndex + 1 });
}

export function resetSession(session: ChallengeSession): ChallengeSession {
  return createSession(session.questions);
}

export function getAccuracy(session: ChallengeSession): number {
  if (session.responses.length === 0) return 0;
  return Math.round((session.score / session.responses.length) * 100);
}
