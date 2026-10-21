/** Diagnostics only: proposed links remain in docs, outside runtime catalogs. */
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { parseAssignment, serializeAssignment, uniqueQuestions } from "../src/assignment";
import { generateQuestions, type GenerateQuestionsOptions } from "../src/question/generator";
import { getMeter, getPromptId } from "../src/rhythm";

const proposed = [...readFileSync(new URL("../docs/next-gap-repairs-proposal.md",import.meta.url),"utf8").matchAll(/`(seq=counting-repairs-v1&step=[123]&a=[^`]+)`/g)].map(match=>match[1]);
const diagnostics = proposed.map(query=>{
  const parsed=parseAssignment(query); if(!parsed.ok) throw Error(parsed.error.message);
  const a=parsed.assignment;
  const options: GenerateQuestionsOptions={level:a.level,scope:a.scope,meter:a.meter!,system:a.system,cells:a.cells!,seed:a.seed!,count:a.count!};
  const questions=generateQuestions(options);
  const exposure=Object.fromEntries(a.cells!.map(id=>[id,questions.filter(q=>q.prompt.cells.some(c=>c.id===id)).length]));
  const occurrences=Object.fromEntries(a.cells!.map(id=>[id,questions.flatMap(q=>q.prompt.cells).filter(c=>c.id===id).length]));
  return { id:`counting-repairs-v1-${new URLSearchParams(query).get("step")}`, query, seed:a.seed, scope:a.scope, count:a.count,
    capacity:uniqueQuestions({...a,meter:a.meter!}), distinctNotationQuestions:new Set(questions.map(q=>getPromptId(q.prompt))).size, distinctCorrectCounts:new Set(questions.map(q=>q.correctAnswer)).size, exposure, occurrences,
    correctTokens:[...new Set(questions.flatMap(q=>q.correctAnswer.split(/[ |]+/)))].sort(),
    distractorTokens:[...new Set(questions.flatMap(q=>q.choices.filter(c=>!c.isCorrect).flatMap(c=>c.label.split(/[ |]+/))))].sort(),
    questions:questions.map(q=>({id:q.id,cells:q.prompt.cells.map(c=>c.id),answer:q.correctAnswer,distractors:q.choices.filter(c=>!c.isCorrect).map(c=>c.label)})),
    options, assignment:a };
});
const report={status:"proposal-diagnostics-only",base:"15e701cac75d2b37f1451a678637ad55976bd93b",entries:diagnostics.map(d=>({id:d.id,query:d.query,seed:d.seed,scope:d.scope,count:d.count,capacity:d.capacity,distinctNotationQuestions:d.distinctNotationQuestions,distinctCorrectCounts:d.distinctCorrectCounts,exposure:d.exposure,occurrences:d.occurrences,correctTokens:d.correctTokens,distractorTokens:d.distractorTokens,questions:d.questions}))};
const file=new URL("../docs/repair-proposal-evidence.json",import.meta.url);
if(process.env.UPDATE_REPAIR_EVIDENCE==="1") writeFileSync(file,JSON.stringify(report,null,2)+"\n");

describe("unimplemented repair proposal diagnostics",()=>{
  it("has three exact, valid supported practice links with documented capacities",()=>{
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map(d=>d.capacity)).toEqual([256,3,44]);
    expect(diagnostics.map(d=>d.count)).toEqual([8,6,6]);
    for(const d of diagnostics) {
      expect(d.assignment.guide).toBe("on"); expect(d.assignment.feedback).toBe("each");expect(d.assignment.retry).toBe("free");
      expect(d.assignment.hints).toBe(false);expect(d.assignment.response).toBeUndefined();expect(d.assignment.passing).toBeNull();
      expect(d.assignment.meter).toBe("4-4");
      const replay=parseAssignment(serializeAssignment(d.assignment));expect(replay.ok).toBe(true);
    }
  });
  it("records exact seed coverage without equating repetition/choices with new rhythms",()=>{
    for(const d of diagnostics) {
      const questions=generateQuestions(d.options);
      expect(questions).toEqual(generateQuestions(d.options));
      expect(new Set(questions.map(q=>getPromptId(q.prompt))).size).toBe(d.scope==="beat"?3:d.count);
      expect(Object.values(d.exposure).every(n=>n>0)).toBe(true);
      if(d.scope==="beat") expect(Object.values(d.occurrences)).toEqual([2,2,2]);
      for(const q of questions) {
        const expectedBeats=d.scope==="beat"?1:getMeter(d.assignment.meter!).beatsPerMeasure;
        expect(q.prompt.cells.reduce((sum,c)=>sum+c.beats,0)).toBe(expectedBeats);
        let beat=1;
        const expected=q.prompt.cells.map(cell=>{
          const labels=[String(beat),"e","&","a"];
          const answer=cell.activePositions.map(p=>labels[p]).join(" ");beat+=cell.beats;return answer;
        }).filter(Boolean).join(" | ");
        expect(q.correctAnswer).toBe(expected);
        expect(q.choices).toHaveLength(4);expect(new Set(q.choices.map(c=>c.label)).size).toBe(4);
        expect(q.choices.filter(c=>c.isCorrect)).toHaveLength(1);
        for(const c of q.choices) {expect(c.label===expected).toBe(c.isCorrect);expect(c.label).toMatch(/^[1-4ea& |]+$/);}
      }
    }
  });
  it("pins the full diagnostic payload for independent inspection",()=>{
    expect(JSON.parse(readFileSync(file,"utf8"))).toEqual(report);
  });
});
