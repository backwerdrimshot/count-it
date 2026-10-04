/* praxis.result.v0_1, the envelope this app had never had (doc 24).
 *
 * Scale Trail and Mallet Board each had a structured result to rename. Here the
 * card assembled its facts inline, so there was nothing to migrate and nothing
 * to preserve — which makes these tests the only thing standing between the
 * envelope and quiet drift from the card it is supposed to describe.
 */
import { describe, expect, it } from "vitest";
import { createPraxisEvidenceResult, RESULT_SCHEMA_VERSION } from "../src/result";
import { parseSequenceStep, sequenceStepId } from "../src/sequence-step";
import { parseAssignment } from "../src/assignment";
import { generateQuestions } from "../src/question/generator";
import { advanceSession, answerSession, createSession, type ChallengeSession } from "../src/question/session";
import { COUNT_IT_BUILD } from "../src/capabilities";

function playedSession(options: { correct: boolean[]; seed?: number }): ChallengeSession {
  const questions = generateQuestions({
    level: "level-1", scope: "beat", count: options.correct.length, seed: options.seed ?? 4242,
  });
  let session = createSession(questions);
  for (const correct of options.correct) {
    const current = session.questions[session.currentIndex];
    const choice = correct
      ? current.choices.find((candidate) => candidate.isCorrect)!
      : current.choices.find((candidate) => !candidate.isCorrect)!;
    session = advanceSession(answerSession(session, choice.id));
  }
  return session;
}

function receipt(over: {
  correct?: boolean[];
  search?: string;
  finishedAt?: Date;
  attempt?: number;
} = {}) {
  const session = playedSession({ correct: over.correct ?? [true, true, false] });
  const search = over.search ?? "";
  const parsed = search ? parseAssignment(search) : null;
  const assignment = parsed && parsed.ok ? parsed.assignment : null;
  return createPraxisEvidenceResult({
    session,
    assignment,
    sequenceStep: parseSequenceStep(search),
    level: assignment?.level ?? "level-1",
    scope: assignment?.scope ?? "beat",
    finishedAt: over.finishedAt ?? new Date("2026-08-08T00:00:00.000Z"),
    ...(over.attempt === undefined ? {} : { attempt: over.attempt }),
  });
}

describe("the result envelope", () => {
  it("names the universal contract and this build", () => {
    const result = receipt();
    expect(RESULT_SCHEMA_VERSION).toBe("praxis.result.v0_1");
    expect(result.schemaVersion).toBe("praxis.result.v0_1");
    expect(result.app).toEqual({ id: "count-it", version: COUNT_IT_BUILD });
    expect(result.activity.scoringRuleVersion).toBe("rhythm-counting-v1");
  });

  it("declines to claim a skill vocabulary rather than inventing one", () => {
    /* The field is nullable across the family for exactly this app: candidate
       ids exist in the Sequence 2 draft, but the vocabulary is an owner
       decision and an invented id is indistinguishable, to a consumer, from a
       real one. */
    expect(receipt().skillReferences).toBeNull();
  });

  it("states the boundary on the evidence, not only in the manifest", () => {
    const result = receipt();
    expect(result.notMeasured).toContain("speed");
    expect(result.notMeasured).toContain("live playing");
    expect(result.evidenceType).toBe("A1_ANSWER_CORRECTNESS");
    expect(result.validity.valid).toBe(true);
    expect(result).not.toHaveProperty("mastery");
    expect(result).not.toHaveProperty("grade");
  });

  it("reports the goal without enforcing it", () => {
    const search = "?scope=beat&cells=quarter,eighths&n=3&pass=3&seed=cr1";
    const met = receipt({ correct: [true, true, true], search });
    const missedIt = receipt({ correct: [true, true, false], search });
    expect(met.outcome.metGoal).toBe(true);
    expect(missedIt.outcome.metGoal).toBe(false);
    /* Reported, never enforced: a round below the mark still completes and
       still produces evidence. */
    expect(missedIt.outcome.completed).toBe(true);
    expect(missedIt.conditions.passing).toBe(3);
    /* Free play has no goal, and says null rather than false. */
    expect(receipt().outcome.metGoal).toBeNull();
  });

  it("records which published step it was", () => {
    const result = receipt({ search: "?seq=counting-rhythms&step=1&scope=beat&cells=quarter,eighths&seed=cr1" });
    expect(result.sequenceStep).toEqual({ seq: "counting-rhythms", step: 1 });
    expect(sequenceStepId(result.sequenceStep!)).toBe("counting-rhythms#1");
    expect(receipt().sequenceStep).toBeNull();
  });

  /* THE RULE THE RECONCILIATION TURNS ON. The seed is a randomization input and
     this family's guidance is to change it for a retake, so an attempt
     identified by it stops being a record of the step that was assigned. */
  it("does not move the attempt reference when only the seed changes", () => {
    const base = "?seq=counting-rhythms&step=1&scope=beat&cells=quarter,eighths&n=3";
    const first = receipt({ search: `${base}&seed=cr1-quarters-pairs` });
    const retake = receipt({ search: `${base}&seed=cr1-quarters-pairs-again` });
    expect(first.attemptReference).toBe(retake.attemptReference);
    expect(first.attemptReference).not.toMatch(/quarters/);
  });

  it("still separates two genuinely different attempts", () => {
    const search = "?seq=counting-rhythms&step=1&scope=beat&cells=quarter,eighths&n=3&seed=cr1";
    expect(receipt({ search, finishedAt: new Date("2026-08-08T00:00:00.000Z") }).attemptReference)
      .not.toBe(receipt({ search, finishedAt: new Date("2026-08-09T00:00:00.000Z") }).attemptReference);
  });

  it("separates a replay of the same round from the first run of it", () => {
    /* Retry replays the identical questions after showing every answer, so two
       runs can land on the same score at the same stamped moment. A reference
       that cannot tell them apart is not naming an attempt. */
    const search = "?scope=beat&cells=quarter,eighths&n=3&seed=cr1";
    const first = receipt({ search });
    const replay = receipt({ search, attempt: 2 });
    expect(replay.attemptReference).not.toBe(first.attemptReference);
    expect(receipt({ search, attempt: 1 }).attemptReference).toBe(first.attemptReference);
  });

  it("records the feedback policy the round actually ran under", () => {
    /* A score earned with the answer shown after every question is not the
       same evidence as one earned with it held to the end, so the conditions
       have to carry which it was. */
    const held = receipt({ search: "?scope=beat&cells=quarter,eighths&fb=end&n=3&seed=cr1" });
    expect(held.settings.fb).toBe("end");
    expect(held.conditions.stated).toContain("answers at the end");
    expect(receipt().settings.fb).toBeUndefined();
  });

  it("records what a retry was allowed to be", () => {
    /* A score from a round that could be replayed on the same questions is
       different evidence from one that could not be replayed at all, so the
       policy travels with the result. */
    const once = receipt({ search: "?scope=beat&cells=quarter,eighths&retry=off&n=3&seed=cr1" });
    expect(once.settings.retry).toBe("off");
    expect(once.conditions.stated).toContain("one attempt");
    expect(receipt({ search: "?scope=beat&cells=quarter,eighths&retry=reseed&n=3&seed=cr1" }).settings.retry)
      .toBe("reseed");
    expect(receipt().settings.retry).toBeUndefined();
  });

  it("keeps the verification code distinct from the attempt reference", () => {
    /* The code is teacher-facing, with its own published format and its own
       stated limits. Whether it generalizes across the three apps is an open
       decision; making the two identical would answer it by accident. */
    expect(receipt().attemptReference).toMatch(/^CI-[0-9A-Z]+$/);
    expect(receipt().attemptReference).not.toMatch(/^BRS-CI-/);
  });

  it("keeps the human sentence and the machine record describing one round", () => {
    const result = receipt({ search: "?scope=beat&cells=quarter,eighths&guide=on&n=3&pass=2&seed=cr1" });
    /* `stated` is the exact string the card prints, carried on the evidence, so
       the two cannot describe different rounds. */
    expect(result.conditions.stated).toContain("2 rhythms");
    expect(result.conditions.cells).toEqual(["quarter", "eighths"]);
    expect(result.conditions.guide).toBe("on");
    expect(result.settings.cells).toBe("quarter,eighths");
    expect(result.settings.seed).toBe("cr1");
  });

  it("reports which rhythms were asked and which were missed", () => {
    const result = receipt({ correct: [true, false, false] });
    const asked = result.errorSummary.reduce((total, entry) => total + entry.asked, 0);
    expect(asked).toBe(3);
    expect(result.errorSummary.reduce((total, entry) => total + entry.wrong, 0)).toBe(2);
    expect(result.recommendedNextActions[0]).toMatch(/Review these rhythms/);
    /* A clean round recommends retention rather than remediation. */
    expect(receipt({ correct: [true, true, true] }).recommendedNextActions[0]).toMatch(/retention/);
  });

  it("does not version content it does not version", () => {
    /* Null, and said out loud: questions come from the conditions plus a seed,
       which already reproduce the round. A synthesized string would read as a
       content revision that never happened. */
    expect(receipt().activity.contentVersion).toBeNull();
  });
});

describe("the sequence identity markers", () => {
  it("needs both halves, and a published slug", () => {
    expect(parseSequenceStep("?seq=counting-rhythms&step=2")).toEqual({ seq: "counting-rhythms", step: 2 });
    expect(parseSequenceStep("?seq=counting-rhythms")).toBeNull();
    expect(parseSequenceStep("?step=2")).toBeNull();
    expect(parseSequenceStep("?seq=Counting-Rhythms&step=2")).toBeNull();
    expect(parseSequenceStep("?seq=counting-rhythms&step=0")).toBeNull();
  });

  it("changes nothing about the round", () => {
    /* The claim that makes them inert, checked rather than asserted. The shop
       site's contract check fails if this app ever declares them as settings; a
       marker that started changing the round would mean a Module pointing at
       step 1 points at something that acts. */
    const bare = "?scope=beat&cells=quarter,eighths&guide=on&n=12&pass=10&seed=cr1-quarters-pairs";
    const marked = `?seq=counting-rhythms&step=1&${bare.slice(1)}`;
    const a = parseAssignment(bare);
    const b = parseAssignment(marked);
    expect(a.ok && b.ok).toBe(true);
    expect(b.ok && a.ok ? b.assignment : null).toEqual(a.ok ? a.assignment : null);
    expect(b.ok && a.ok ? [...b.locked] : null).toEqual(a.ok ? [...a.locked] : null);
  });
});

/* The card states the meter it was played in.
 *
 * A score card is what a student hands in. "Level 2 · one measure" under a
 * seven-beat bar describes a different round than the one answered, and the
 * machine record carried the same gap: `settings` reproduces the link's
 * pinned parameters, and `meter` was missing from it even though it changes how
 * many beats a bar holds and which wrong answers exist.
 *
 * 4/4 is the default and stays unstated, so every card and record for a 4/4
 * round is exactly what it was. */
describe("the meter on the card and in the record", () => {
  function measureReceipt(meter: "2-4" | "3-4" | "4-4" | "5-4" | "7-4" | undefined, search = "") {
    const questions = generateQuestions({
      level: "level-2", scope: "measure", count: 3, seed: 77, ...(meter ? { meter } : {}),
    });
    let session = createSession(questions);
    for (let index = 0; index < questions.length; index += 1) {
      const current = session.questions[session.currentIndex];
      session = advanceSession(
        answerSession(session, current.choices.find((choice) => choice.isCorrect)!.id),
      );
    }
    const parsed = search ? parseAssignment(search) : null;
    const assignment = parsed && parsed.ok ? parsed.assignment : null;
    return createPraxisEvidenceResult({
      session,
      assignment,
      sequenceStep: null,
      level: assignment?.level ?? "level-2",
      scope: assignment?.scope ?? "measure",
      finishedAt: new Date("2026-10-04T00:00:00.000Z"),
    });
  }

  it("says so for a free-play round in any meter but 4/4", () => {
    for (const meter of ["2-4", "3-4", "5-4", "7-4"] as const) {
      expect(measureReceipt(meter).conditions.stated, meter).toContain(`${meter.replace("-", "/")}`);
    }
    expect(measureReceipt("4-4").conditions.stated).not.toMatch(/\d\/4/);
    expect(measureReceipt(undefined).conditions.stated).not.toMatch(/\d\/4/);
  });

  it("says so for an assigned round, and records the link's own parameter", () => {
    const seven = measureReceipt("7-4", "?scope=measure&meter=7-4&level=2&n=5&pass=4&seed=a");
    expect(seven.conditions.stated).toContain("7/4");
    expect(seven.settings.meter).toBe("7-4");
  });

  it("leaves a 4/4 record exactly as it was", () => {
    /* No meter in the link: nothing stated, nothing recorded. A link that NAMES
       4/4 records it — it is the link's parameter — but still states nothing,
       because 4/4 is what the app does anyway. */
    const none = measureReceipt(undefined, "?scope=measure&level=2&n=5&pass=4&seed=a");
    expect(none.settings).not.toHaveProperty("meter");
    expect(none.conditions.stated).not.toMatch(/\d\/4/);
    const named = measureReceipt("4-4", "?scope=measure&meter=4-4&level=2&n=5&pass=4&seed=a");
    expect(named.settings.meter).toBe("4-4");
    expect(named.conditions.stated).not.toMatch(/\d\/4/);
  });

  it("adds nothing to the envelope the sibling apps share", () => {
    /* `praxis.result.v0_1` is shared with Scale Trail and Mallet Map. The meter
       goes in the free-text sentence and the free-form `settings` map, never in
       a new field of `conditions`. */
    expect(Object.keys(measureReceipt("7-4").conditions)).toEqual([
      "scope", "level", "cells", "guide", "countingSystem", "passing", "stated",
    ]);
  });
});
