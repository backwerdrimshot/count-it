import {describe,it,expect} from "vitest";
import {readFileSync,writeFileSync} from "node:fs";
import {REPAIR_STEPS, REPAIR_SEQUENCE_ID, REPAIR_PLAYING_CONNECTION, responseLessonForAssignment} from "../src/assignment/repairs-v1";
import {parseAssignment,serializeAssignment,roundKey,uniqueQuestions} from "../src/assignment";
import {builderStateFromQuery,buildQuery,evaluateBuilder} from "../src/assignment/builder";
import {generateQuestions,type GenerateQuestionsOptions} from "../src/question/generator";
import {generateDistractors} from "../src/question/distractors";
import {createSeededRandom} from "../src/question/random";
import {misconceptionMessage} from "../src/question/feedback";
import {createMeasurePrompt,getCellsByIds,getPromptAnswer,getPromptId} from "../src/rhythm";
import {HALF_BEAT_REPAIR_POOLS} from "../src/response-vocabulary";
import {COUNT_IT_CAPABILITY_MANIFEST} from "../src/capabilities";
import {parseSequenceStep} from "../src/sequence-step";
import {createPraxisEvidenceResult} from "../src/result";
import {createSession,answerSession,advanceSession} from "../src/question/session";
const opts=(query:string):GenerateQuestionsOptions=>{const p=parseAssignment(query);if(!p.ok)throw Error(p.error.message);const a=p.assignment;return {level:a.level,scope:a.scope,meter:a.meter!,system:a.system,response:a.response,cells:a.cells!,count:a.count!,seed:a.seed!};};
const generated=REPAIR_STEPS.map(s=>generateQuestions(opts(s.query)));
const entries=REPAIR_STEPS.map(({assignment,...step},i)=>({...step,settings:Object.fromEntries(new URLSearchParams(step.query)),minimumCapability:assignment.response??null,localLaunch:`/${step.query}`,futureProductionLaunch:`https://count-it.backwerdrhythmshop.com/${step.query}`,coverage:{...step.coverage,occurrences:Object.fromEntries(assignment.cells!.map(id=>[id,generated[i].flatMap(q=>q.prompt.cells).filter(c=>c.id===id).length]))},questions:generated[i].map(q=>({id:q.id,cells:q.prompt.cells.map(c=>c.id),answer:q.correctAnswer,choices:q.choices}))}));
const payload={schema:"count-it.repair-candidates.v1",status:"local-unpublished",owner:"Charlie / Count It app",base:"e41e6b873d52ee8fa4bb90a0d9eef9dbe1fcad2e",sequenceId:REPAIR_SEQUENCE_ID,placement:"Three separate entry points, not consecutive levels",capabilityRequirement:"Verify half-beats-v1 exact pools, measure scope and4/4; do not infer from a date or HTTP success. Step2 uses existing full-position responses.",playingConnection:REPAIR_PLAYING_CONNECTION,entries};
const file=new URL("../docs/repairs-v1-integration.json",import.meta.url);if(process.env.UPDATE_REPAIRS_JSON==="1")writeFileSync(file,JSON.stringify(payload,null,2)+"\n");
describe("local gap repairs v1",()=>{
 it("exports exact settings, public resource/prerequisite/next links and every generated choice",()=>{expect(JSON.parse(readFileSync(file,"utf8"))).toEqual(payload);expect(entries).toHaveLength(3);for(const e of entries){expect(new URL(e.futureProductionLaunch).search).toBe(e.query);expect(e.links.lesson).toMatch(/^https:\/\/backwerdrhythmshop.com\/lessons\//);expect(e.links.nextLaunch).toContain(`step=${e.beforeLegacyStep}`);}});
 it("pins each brief sample's actual coverage, count diversity and purposeful repetition",()=>{
  expect(REPAIR_STEPS.map(s=>uniqueQuestions({...s.assignment,meter:s.assignment.meter!}))).toEqual([256,3,44]);
  REPAIR_STEPS.forEach((s,i)=>{const qs=generated[i];expect(qs).toEqual(generateQuestions(opts(s.query)));expect(new Set(qs.map(q=>getPromptId(q.prompt))).size).toBe(s.coverage.distinctNotation);expect(new Set(qs.map(q=>q.correctAnswer)).size).toBe(s.coverage.distinctCorrectCounts);
   for(const [id,n] of Object.entries(s.coverage.questionExposures))expect(qs.filter(q=>q.prompt.cells.some(c=>c.id===id)).length,id).toBe(n);
   expect(s.assignment.guide).toBe("on");expect(s.assignment.feedback).toBe("each");expect(s.assignment.retry).toBe("free");expect(s.assignment.passing).toBeNull();expect(s.assignment.timeLimit).toBeNull();expect(s.assignment.hints).toBe(false);
   for(const q of qs){let beat=1;const answer=q.prompt.cells.map(c=>{const labels=[String(beat),"e","&","a"];const out=c.activePositions.map(p=>labels[p]).join(" ");beat+=c.beats;return out;}).filter(Boolean).join(" | ");expect(q.correctAnswer).toBe(answer);expect(beat-1).toBe(s.scope==="beat"?1:4);expect(q.choices).toHaveLength(4);expect(new Set(q.choices.map(c=>c.label)).size).toBe(4);expect(q.choices.filter(c=>c.isCorrect)).toHaveLength(1);for(const c of q.choices){expect(c.isCorrect).toBe(c.label===answer);expect(c.label).toMatch(s.response?/^[1-4& |]+$/:/^[1-4ea& |]+$/);}}
  });
 });
 it("exhausts all300 nonsilent bars with independently checked half-beat choices across seeds",()=>{
  for(const [index,pool] of HALF_BEAT_REPAIR_POOLS.entries()){
   const cells=getCellsByIds(pool),bars:string[][]=[];
   function fill(bar:string[],beats:number){if(beats===4){if(bar.some(id=>getCellsByIds([id])[0].activePositions.length))bars.push(bar);return;}for(const c of cells)if(beats+c.beats<=4)fill([...bar,c.id],beats+c.beats);}
   fill([],0);expect(bars).toHaveLength(index===0?256:44);
   for(const ids of bars){const prompt=createMeasurePrompt(ids);const answer=getPromptAnswer(prompt,"standard");for(let seed=0;seed<10;seed++){const ds=generateDistractors(prompt,createSeededRandom(seed),3,"standard","half-beats-v1");expect(new Set([answer,...ds.map(d=>d.label)]).size).toBe(4);for(const d of ds)expect(d.label).toMatch(/^[1-4& |]+$/);}}
  }
 });
 it("strictly refuses malformed/incompatible profiles without broadening the old profile",()=>{
  const base=REPAIR_STEPS[0].query;
  for(const [key,value] of [["scope","beat"],["meter","3-4"],["sys","eastman-ti-te-ta"],["cells","quarter,eighths"],["cells","quarter,sixteenths"],["response","unknown"],["response","eighths-v1"]]){const p=new URLSearchParams(base);p.set(key,value);expect(parseAssignment(p.toString()).ok,`${key}=${value}`).toBe(false);}
  expect(parseAssignment(base+"&response=half-beats-v1").ok).toBe(false);const p=new URLSearchParams(base);p.delete("meter");expect(parseAssignment(p.toString()).ok).toBe(false);
  expect(()=>generateQuestions({...opts(base),scope:"beat"})).toThrow();expect(()=>generateQuestions({...opts(base),cells:["quarter","eighths"]})).toThrow();
 });
 it("keeps profile identity across builder, canonical keys and result replay",()=>{
  for(const s of REPAIR_STEPS.filter(s=>s.response)){const a=s.assignment;expect(parseAssignment(serializeAssignment(a))).toMatchObject({ok:true,assignment:a});const state=builderStateFromQuery(s.query)!;expect(state.response).toBe("half-beats-v1");expect(evaluateBuilder(state).ok).toBe(true);expect(new URLSearchParams(buildQuery(state)).get("response")).toBe("half-beats-v1");expect(roundKey(a)).not.toBe(roundKey({...a,response:undefined}));let session=createSession(generateQuestions(opts(s.query)));for(const q of session.questions)session=advanceSession(answerSession(session,q.correctChoiceId));const result=createPraxisEvidenceResult({session,assignment:a,sequenceStep:parseSequenceStep(s.query),level:a.level,scope:a.scope,countingSystem:a.system,finishedAt:new Date("2026-10-21T00:00:00Z"),attempt:1});expect(result.activity.contentVersion).toBe("half-beats-v1");expect(generateQuestions(opts(new URLSearchParams(result.settings).toString()))).toEqual(session.questions);}
  expect(COUNT_IT_CAPABILITY_MANIFEST.responseVocabularies.find(v=>v.id==="half-beats-v1")?.scopes).toEqual(["measure"]);
 });
 it("retains the exact sixteenth-rest response instruction through builder metadata loss",()=>{
  const state=builderStateFromQuery(REPAIR_STEPS[1].query)!;const rebuilt=parseAssignment(buildQuery(state));if(!rebuilt.ok)throw Error(rebuilt.error.message);expect(responseLessonForAssignment(rebuilt.assignment)).toBe(REPAIR_STEPS[1].lesson);expect(new URLSearchParams(buildQuery(state)).has("seq")).toBe(false);
 });
 it("does not add instructional support to historical custom links with the same cells",()=>{
  const old={...REPAIR_STEPS[1].assignment,seed:"historical-custom",guide:"off" as const,feedback:"end" as const};expect(responseLessonForAssignment(old)).toBeUndefined();expect(REPAIR_STEPS[0].links.prerequisiteRequirement).toContain("optional");expect(REPAIR_STEPS[0].links.prerequisiteRequirement).toContain("e and a");
 });
 it("teaches valid offbeats and held durations without reattack/silence inference",()=>{
  expect(responseLessonForAssignment(REPAIR_STEPS[0].assignment)).toContain("& alone can be correct");expect(responseLessonForAssignment(REPAIR_STEPS[1].assignment)).toContain("2 is not a second beat");expect(responseLessonForAssignment(REPAIR_STEPS[2].assignment)).toContain("without starting it again");
  expect(getPromptAnswer(createMeasurePrompt(["whole"]))).toBe("1");expect(getPromptAnswer(createMeasurePrompt(["half-rest","half"]))).toBe("3");expect(()=>createMeasurePrompt(["half-rest","half-rest"])).toThrow(/at least one note/);
  const extra={id:"extra",label:"1 | 2",category:"added_sound" as const,isCorrect:false};for(const response of [undefined,"half-beats-v1" as const]){expect(misconceptionMessage(extra,response)).toContain("note start");expect(misconceptionMessage(extra,response)).not.toMatch(/silent/);}
 });
});
