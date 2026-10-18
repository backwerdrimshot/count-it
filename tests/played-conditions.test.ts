import { describe, expect, it } from "vitest";
import { parseAssignment, playedAssignment } from "../src/assignment";
import { answerSession, createSession, generateQuestions } from "../src/question";
import { createPraxisEvidenceResult } from "../src/result";
import type { LevelId, MeterId } from "../src/rhythm";

/* A link that pins only some options (n, pass, time, hints) leaves level, scope
 * and meter for the student to choose. The report and ticket must then state
 * what the student actually played, not the parser's defaults. Codex flagged
 * this on #77. */

function parsed(search: string) {
  const result = parseAssignment(search);
  if (!result.ok) throw new Error(result.error.message);
  return result;
}

function finish(search: string, played: { level: LevelId; scope: "beat" | "measure"; meter: MeterId }) {
  const { assignment, locked } = parsed(search);
  const effective = playedAssignment(assignment, locked, played);
  const questions = generateQuestions({ ...played, count: 2, seed: "p" });
  let session = createSession(questions);
  session = answerSession(session, questions[0].correctChoiceId);
  return createPraxisEvidenceResult({
    session, assignment: effective, sequenceStep: null, level: played.level, scope: played.scope,
    countingSystem: "standard", finishedAt: new Date("2026-10-18T12:00:00.000Z"),
  });
}

describe("conditions on a link that leaves level, scope and meter open", () => {
  for (const search of ["?n=2&pass=1", "?time=5", "?hints=on", "?n=2&pass=1&time=5&hints=on"]) {
    it(`${search} reports the level, scope and meter the student played`, () => {
      const result = finish(search, { level: "level-1", scope: "measure", meter: "3-4" });
      expect(result.conditions.level).toBe("level-1");
      expect(result.conditions.scope).toBe("measure");
      expect(result.conditions.stated).toMatch(/^Pulse & pairs · one measure · 3\/4/);
      expect(result.settings.level).toBe("1");
      expect(result.settings.scope).toBe("measure");
      expect(result.settings.meter).toBe("3-4");
    });
  }

  it("a student who stays in 4/4 gets no meter entry, as before", () => {
    const result = finish("?n=2&pass=1", { level: "level-2", scope: "beat", meter: "4-4" });
    expect(result.conditions.stated).toBe("Eighth placement · one beat · 2 questions · pass at 1");
    expect(result.settings.meter).toBeUndefined();
  });

  it("what the link pinned is never replaced", () => {
    const { assignment, locked } = parsed("?level=3&scope=beat&meter=2-4&n=2");
    const effective = playedAssignment(assignment, locked, { level: "level-1", scope: "measure", meter: "5-4" });
    expect(effective).toBe(assignment);
  });
});
