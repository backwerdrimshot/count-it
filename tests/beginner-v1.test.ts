import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import legacy from "./fixtures/legacy-rounds-main-15e701c.json";
import { builderStateFromQuery, buildQuery, evaluateBuilder } from "../src/assignment/builder";
import { BEGINNER_STEPS } from "../src/assignment/beginner-v1";
import { parseAssignment, serializeAssignment, roundKey, uniqueQuestions } from "../src/assignment";
import { generateQuestions, type GenerateQuestionsOptions } from "../src/question/generator";
import { getMeter, getPromptAnswer, getPromptId } from "../src/rhythm";
import { createPraxisEvidenceResult } from "../src/result";
import { advanceSession, answerSession, createSession } from "../src/question/session";
import { parseSequenceStep } from "../src/sequence-step";

function options(search: string): GenerateQuestionsOptions {
  const parsed = parseAssignment(search);
  if (!parsed.ok) throw Error(parsed.error.message);
  const a = parsed.assignment;
  return { level: a.level, scope: a.scope, meter: a.meter ?? undefined, cells: a.cells ?? undefined,
    system: a.system, response: a.response, count: a.count ?? 5, seed: a.seed ?? "none" };
}

describe("supplementary quarter/pair bridge v1", () => {
  it("preserves all published legacy rounds, choices, explanations and canonical attempt keys byte for byte against fresh main", () => {
    for (const fixture of legacy) {
      const parsed = parseAssignment(fixture.search); if (!parsed.ok) throw Error(parsed.error.message);
      expect(serializeAssignment(parsed.assignment)).toBe(fixture.serialized);
      const questions = generateQuestions(fixture.options as GenerateQuestionsOptions);
      expect(createHash("sha256").update(JSON.stringify(questions)).digest("hex")).toBe(fixture.digest);
    }
  });

  it("pins the five distinct purposes, capacities and interpretation settings", () => {
    expect(new Set(BEGINNER_STEPS.map(s => s.id)).size).toBe(5);
    expect(BEGINNER_STEPS.map(s => s.count)).toEqual([4, 4, 6, 8, 6]);
    for (const step of BEGINNER_STEPS) {
      const a = step.assignment;
      expect(a.response).toBe("eighths-v1"); expect(a.system).toBe("standard");
      expect(a.cells).toEqual(["quarter", "eighths"]); expect(a.passing).toBeNull();
      expect(a.hints).toBe(false); expect(a.timeLimit).toBeNull();
      expect(a.guide).toBe(step.step === 5 ? "off" : "on");
      expect(a.feedback).toBe(step.step === 5 ? "end" : "each");
      expect(a.retry).toBe(step.step === 5 ? "off" : "free");
      expect(uniqueQuestions({...a,meter:a.meter ?? undefined})).toBe(a.scope === "beat" ? 2 : 2 ** getMeter(a.meter!).beatsPerMeasure);
      const round = generateQuestions(options(step.query));
      expect(round).toEqual(generateQuestions(options(serializeAssignment(a))));
      expect(new Set(round.map(q => getPromptId(q.prompt))).size).toBe(a.scope === "beat" ? 2 : a.count);
      if (a.scope === "beat") for (const id of ["quarter", "eighths"]) expect(round.filter(q=>q.prompt.cells[0].id===id)).toHaveLength(2);
    }
  });

  it("exhausts every measure in each meter across 100 seeds with only taught answer tokens, correct sums and unique incorrect choices", () => {
    for (const [meter, capacity] of [["2-4",4],["3-4",8],["4-4",16]] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const opts = { ...options(BEGINNER_STEPS[1].query), meter, count:capacity, seed };
        const questions = generateQuestions(opts);
        expect(new Set(questions.map(q=>getPromptId(q.prompt))).size).toBe(capacity);
        expect(questions).toEqual(generateQuestions(opts));
        for (const q of questions) {
          expect(q.prompt.cells.reduce((n,c)=>n+c.beats,0)).toBe(getMeter(meter).beatsPerMeasure);
          expect(q.correctAnswer).toBe(getPromptAnswer(q.prompt));
          expect(q.correctAnswer).toBe(q.prompt.cells.map((cell,index)=>`${index+1}${cell.id === "eighths" ? " &" : ""}`).join(" | "));
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices.map(c=>c.label)).size).toBe(4);
          expect(q.choices.filter(c=>c.isCorrect)).toHaveLength(1);
          for (const choice of q.choices) {
            const groups = choice.label.split(" | ");
            expect(groups).toHaveLength(getMeter(meter).beatsPerMeasure);
            groups.forEach((g, index)=>expect([`${index+1}`, `${index+1} &`, "&"]).toContain(g));
            expect(choice.label === q.correctAnswer).toBe(choice.isCorrect);
          }
        }
      }
      const url = new URLSearchParams(BEGINNER_STEPS[1].query); url.set("meter",meter); url.set("n",String(capacity+1));
      expect(parseAssignment(url.toString()).ok).toBe(false);
    }
  });

  it("keeps the tiny intro honest: only three choices exist in the taught vocabulary", () => {
    for (let seed=0; seed<100; seed++) for (const q of generateQuestions({...options(BEGINNER_STEPS[0].query),seed})) {
      expect(q.choices.map(c=>c.label).sort()).toEqual(["&", "1", "1 &"]);
    }
  });

  it("preserves the profile when reopening in the builder and refuses incompatible edits", () => {
    const state=builderStateFromQuery(BEGINNER_STEPS[1].query)!;
    expect(state.response).toBe("eighths-v1");
    expect(generateQuestions(options(buildQuery(state)))).toEqual(generateQuestions(options(BEGINNER_STEPS[1].query)));
    expect(evaluateBuilder({...state, meter:"5-4"}).ok).toBe(false);
  });

  it("refuses malformed/unsupported profile links without repairing the task", () => {
    const base = BEGINNER_STEPS[1].query;
    for (const [key,value] of [["response","sixteenths-v1"],["response",""],["meter","5-4"],["meter",""],["sys","eastman"],["cells","quarter,rest-eighth"],["cells","quarter,eighths,sixteenths"]]) {
      const params=new URLSearchParams(base);params.set(key,value);
      expect(parseAssignment(params.toString()).ok,`${key}=${value}`).toBe(false);
    }
    expect(parseAssignment(`${base}&response=eighths-v1`).ok).toBe(false);
    const params=new URLSearchParams(base);params.delete("meter");expect(parseAssignment(params.toString()).ok).toBe(false);
    expect(()=>generateQuestions({...options(base),cells:["quarter","sixteenths"]})).toThrow();
  });

  it("records profile identity in canonical links, per-round keys and replayable result settings without affecting class codes", () => {
    const step=BEGINNER_STEPS[4], a=step.assignment;
    const old={...a}; delete old.response;
    expect(roundKey(a)).not.toBe(roundKey(old));
    let session=createSession(generateQuestions(options(step.query)));
    for (const q of session.questions) session=advanceSession(answerSession(session,q.correctChoiceId));
    const result=createPraxisEvidenceResult({session,assignment:a,sequenceStep:parseSequenceStep(step.query),level:a.level,scope:a.scope,countingSystem:a.system,finishedAt:new Date("2026-10-21T00:00:00Z"),attempt:1});
    expect(result.settings.response).toBe("eighths-v1");
    expect(result.activity.contentVersion).toBe("eighths-v1");
    const replay=new URLSearchParams(result.settings).toString();
    expect(generateQuestions(options(replay))).toEqual(session.questions);
    const withClass=parseAssignment(`${step.query}&class=TEST-1`);
    expect(withClass.ok && withClass.assignment.classCode).toBe("TEST-1");
  });
});
