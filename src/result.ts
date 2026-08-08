/* The universal result envelope: praxis.result.v0_1.
 *
 * This app had no result object at all. Scale Trail and Mallet Map each built a
 * structured result and could rename fields into the new shape; here the card
 * and the copyable summary were assembled inline from a session, so there was
 * nothing to migrate — only something to build. That makes this the largest of
 * the three migrations and also the cleanest, because nothing had to be
 * preserved for compatibility's sake.
 *
 * The shape follows Scale Trail, which took it first because it was closest to
 * it. Where this app genuinely lacks the data a field wants, it emits null and
 * says why: a consumer cannot tell a plausible-looking guess from a real value,
 * so an absence with a stated reason is worth more than a confident fiction.
 *
 * NOTHING HERE IS TRANSMITTED. The envelope is a format, not a protocol — the
 * card renders from it, the summary is copied by hand, and no request leaves
 * the device. Adopting the shape changed no privacy posture.
 */
import type { Assignment } from "./assignment";
import { describeAssignment } from "./assignment";
import { COUNT_IT_BUILD } from "./capabilities";
import type { CountQuestion } from "./question/generator";
import type { ChallengeSession } from "./question/session";
import { type SequenceStep, sequenceStepId } from "./sequence-step";
import { getLevel } from "./rhythm";

/** The contract this app now speaks, shared with Scale Trail and Mallet Map. */
export const RESULT_SCHEMA_VERSION = "praxis.result.v0_1";

/* Named and versioned so a change in how an answer is judged is legible in the
   evidence rather than silent. Bump when the judging changes, not the questions. */
export const SCORING_RULE_VERSION = "rhythm-counting-v1";

export interface ErrorSummaryEntry {
  /** A rhythm cell id from the published catalog. */
  readonly item: string;
  readonly asked: number;
  readonly wrong: number;
}

export interface PraxisEvidenceResult {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly app: { readonly id: "count-it"; readonly version: string };
  readonly activity: {
    readonly type: "choose-the-count";
    readonly version: string;
    readonly contentVersion: string | null;
    readonly scoringRuleVersion: string;
  };
  /** The conditions this round ran under, in this app's own terms. */
  readonly conditions: {
    readonly scope: "beat" | "measure";
    readonly level: string;
    readonly cells: readonly string[] | null;
    readonly guide: "on" | "off" | null;
    readonly countingSystem: string;
    /** The teacher's pass mark. Reported, never enforced. */
    readonly passing: number | null;
    readonly stated: string;
  };
  readonly skillReferences: readonly string[] | null;
  readonly assignmentReference: string | null;
  readonly sequenceStep: SequenceStep | null;
  readonly attemptReference: string;
  readonly evidenceType: "A1_ANSWER_CORRECTNESS";
  readonly outcome: {
    readonly score: number;
    readonly possible: number;
    readonly accuracy: number;
    readonly completed: boolean;
    /** Present when the link set a pass mark. Reported, never enforced. */
    readonly metGoal: boolean | null;
  };
  readonly measured: readonly string[];
  readonly notMeasured: readonly string[];
  readonly validity: { readonly valid: boolean; readonly deviceReliabilityFlags: readonly string[] };
  readonly errorSummary: readonly ErrorSummaryEntry[];
  readonly settings: Readonly<Record<string, string>>;
  readonly inputSource: readonly string[];
  readonly timestamp: string;
  readonly recommendedNextActions: readonly string[];
}

/* One attempt, named without borrowing the seed.
 *
 * The seed is a randomization input and this family's guidance is to change it
 * for a retake, so an attempt identified by it stops being a record of the step
 * that was assigned. What goes in is what was assigned, what happened and when.
 *
 * The attempt number is part of that. A retry replays the same round, so two
 * runs that scored the same used to differ only by their timestamp — and the
 * card did not re-stamp one, which made them the same string. A reference that
 * cannot distinguish two attempts is not naming an attempt.
 *
 * Deliberately NOT the same string as the user-visible verification code. That
 * code is a teacher-facing artifact with its own published format and its own
 * stated limits ("a deterrent, not proof"); whether it generalizes across the
 * three apps is an open decision, and quietly making the two identical here
 * would answer it by accident. */
function attemptReference(
  assigned: string,
  score: number,
  possible: number,
  attempt: number,
  timestamp: string,
): string {
  const input = `count-it|${assigned}|${score}/${possible}|#${attempt}|${timestamp}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `CI-${(hash >>> 0).toString(36).toUpperCase()}`;
}

/* Which rhythms this round actually asked about, and which were missed.
 *
 * Keyed by catalog cell id, which is the vocabulary a link is written against,
 * so a report reads in the same terms the assignment was set in.
 *
 * One honest caveat, stated here because the data cannot state it: in MEASURE
 * scope a question carries four cells and is answered as a whole, so a miss is
 * attributed to every cell in that measure. It is not a claim that all four
 * were misread — it is the finest attribution the question format allows, and
 * pretending otherwise would invent per-cell evidence nobody collected. */
function summarizeErrors(session: ChallengeSession): ErrorSummaryEntry[] {
  const byQuestion = new Map<string, CountQuestion>();
  for (const question of session.questions) byQuestion.set(question.id, question);

  const tally = new Map<string, { asked: number; wrong: number }>();
  const order: string[] = [];
  for (const response of session.responses) {
    const question = byQuestion.get(response.questionId);
    if (!question) continue;
    for (const cell of question.prompt.cells) {
      let entry = tally.get(cell.id);
      if (!entry) {
        entry = { asked: 0, wrong: 0 };
        tally.set(cell.id, entry);
        order.push(cell.id);
      }
      entry.asked += 1;
      if (!response.correct) entry.wrong += 1;
    }
  }
  return order.map((id) => ({ item: id, asked: tally.get(id)!.asked, wrong: tally.get(id)!.wrong }));
}

export function createPraxisEvidenceResult(options: {
  session: ChallengeSession;
  assignment: Assignment | null;
  sequenceStep: SequenceStep | null;
  level: string;
  scope: "beat" | "measure";
  finishedAt: Date;
  /** Which run of this round this is, counting from 1.
   *
   *  NOT added to the envelope's own fields. `praxis.result.v0_1` is shared
   *  with two sibling apps, and adding a field here would make this app emit a
   *  shape the others do not — a contract change dressed as a bug fix. It
   *  belongs in the schema, and that is a decision for the family rather than
   *  for this file; until then it identifies the attempt and nothing more. */
  attempt?: number;
}): PraxisEvidenceResult {
  const { session, assignment, sequenceStep, finishedAt, attempt = 1 } = options;
  const possible = session.questions.length;
  const score = session.score;
  const timestamp = finishedAt.toISOString();
  const assigned = sequenceStep
    ? sequenceStepId(sequenceStep)
    : assignment?.name ?? "free-play";
  const errorSummary = summarizeErrors(session);
  const missed = errorSummary.filter((entry) => entry.wrong > 0).map((entry) => entry.item);

  const scope = assignment?.scope ?? options.scope;
  const level = assignment?.level ?? options.level;

  const settings: Record<string, string> = {};
  if (assignment) {
    if (assignment.name) settings.a = assignment.name;
    if (!assignment.cells) settings.level = String(level).slice(-1);
    settings.scope = assignment.scope;
    if (assignment.cells) settings.cells = assignment.cells.join(",");
    if (assignment.guide) settings.guide = assignment.guide;
    if (assignment.feedback) settings.fb = assignment.feedback;
    if (assignment.retry) settings.retry = assignment.retry;
    if (assignment.count !== null) settings.n = String(assignment.count);
    if (assignment.passing !== null) settings.pass = String(assignment.passing);
    if (assignment.seed) settings.seed = assignment.seed;
  }

  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    app: { id: "count-it" as const, version: COUNT_IT_BUILD },
    activity: {
      type: "choose-the-count" as const,
      version: "1.0.0",
      /* Null, and stated rather than synthesized. This app does not version its
         question content: questions are generated from the conditions below and
         a seed, so the conditions plus `settings.seed` already reproduce the
         round exactly. A made-up string would read as a content revision that
         never happened. */
      contentVersion: null,
      scoringRuleVersion: SCORING_RULE_VERSION,
    },
    conditions: {
      scope,
      level,
      cells: assignment?.cells ?? null,
      guide: assignment?.guide ?? null,
      countingSystem: assignment?.system ?? "standard",
      passing: assignment?.passing ?? null,
      /* The same sentence the card shows, so the human record and the machine
         record cannot describe different rounds. */
      stated: assignment
        ? describeAssignment(assignment)
        : `${getLevel(level as Parameters<typeof getLevel>[0]).shortName} · ${scope === "beat" ? "one beat" : "one measure"}`,
    },
    /* Null, deliberately, and the manifest says the same thing. This app has no
       reconciled Praxis skill vocabulary: candidate ids exist in the Sequence 2
       draft but the vocabulary is an owner decision, and an invented id would be
       a contract nobody agreed to — indistinguishable, to a consumer, from a
       real one. The field is nullable across the family precisely so this can be
       said rather than faked. */
    skillReferences: null,
    assignmentReference: assignment?.name ?? null,
    sequenceStep,
    attemptReference: attemptReference(assigned, score, possible, attempt, timestamp),
    evidenceType: "A1_ANSWER_CORRECTNESS" as const,
    outcome: {
      score,
      possible,
      accuracy: possible === 0 ? 0 : Math.round((score / possible) * 100),
      completed: session.responses.length === possible,
      metGoal: assignment?.passing != null ? score >= assignment.passing : null,
    },
    measured: ["rhythm notation reading", "counting-syllable selection"],
    /* The boundary, on the evidence itself rather than only in the manifest.
       There is no timer anywhere in this app, by design. */
    notMeasured: ["live playing", "tone quality", "sticking or hand use", "tempo", "speed", "audiation"],
    validity: { valid: true, deviceReliabilityFlags: [] },
    errorSummary,
    settings,
    inputSource: ["touch", "mouse", "computer-keyboard"],
    timestamp,
    recommendedNextActions: missed.length
      ? [`Review these rhythms before the retake: ${missed.join(", ")}.`]
      : ["Repeat the same round after a delay to provide retention evidence."],
  });
}
