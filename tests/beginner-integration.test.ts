import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { COUNT_IT_CAPABILITY_MANIFEST } from "../src/capabilities";
import { parseAssignment } from "../src/assignment";
import { BEGINNER_STEPS, BEGINNER_SEQUENCE_ID, BEGINNER_RESPONSE_LESSON, BEGINNER_PLAYING_CONNECTION } from "../src/assignment/beginner-v1";
const file=new URL("../docs/beginner-v1-integration.json",import.meta.url);
const payload={ schema:"count-it.supplementary-draft.v1", status:"local-draft-unpublished", owner:"Charlie / Count It", sequenceId:BEGINNER_SEQUENCE_ID, appMinimumCapability:{responseVocabulary:"eighths-v1"}, responseLesson:BEGINNER_RESPONSE_LESSON, playingConnection:BEGINNER_PLAYING_CONNECTION,
 entries:BEGINNER_STEPS.map(({assignment,...step})=>({...step,settings: Object.fromEntries(new URLSearchParams(step.query)),responseVersion: assignment.response,localLaunch:`/${step.query}`,futureProductionLaunch:`https://count-it.backwerdrhythmshop.com/${step.query}`})) };
if(process.env.UPDATE_BEGINNER_JSON==="1") writeFileSync(file,JSON.stringify(payload,null,2)+"\n");
describe("draft website handoff",()=>{it("copies exact source settings and prerequisites without claiming publication",()=>{expect(JSON.parse(readFileSync(file,"utf8"))).toEqual(payload);});
it("supplies a consumer-verifiable app-specific launch contract",()=>{
  expect(COUNT_IT_CAPABILITY_MANIFEST.configurableSettings).toContain("response");
  const profile=COUNT_IT_CAPABILITY_MANIFEST.responseVocabularies.find(v=>v.id===payload.appMinimumCapability.responseVocabulary)!;
  expect(profile).toBeDefined();
  for(const entry of payload.entries) {
    expect(entry.settings.response).toBe(profile.id);
    expect(profile.meters).toContain(entry.settings.meter);
    expect(entry.settings.cells.split(",")).toEqual(profile.cells);
    expect(entry.settings.sys).toBe(profile.countingSystem);
    expect(entry.futureProductionLaunch).toBe(`https://count-it.backwerdrhythmshop.com/${entry.query}`);
    expect(parseAssignment(new URL(entry.futureProductionLaunch).search).ok).toBe(true);
  }
});});
