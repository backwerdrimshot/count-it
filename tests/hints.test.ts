import { describe, expect, it } from "vitest";
import {
  describeAssignment,
  isAssigned,
  parseAssignment,
  serializeAssignment,
  verificationCode,
} from "../src/assignment";
import { buildQuery, defaultBuilderState, evaluateBuilder, type BuilderState } from "../src/assignment/builder";
import { CATALOG_ENTRIES, withHints } from "../src/assignment/catalog";
import { COUNT_IT_CAPABILITY_MANIFEST } from "../src/capabilities";
import { hintFor, hintsTicketLine } from "../src/hints";
import { answerSession, createSession, generateQuestions } from "../src/question";
import { createPraxisEvidenceResult } from "../src/result";
import {
  COUNTING_PROFILES,
  createBeatPrompt,
  createMeasurePrompt,
  getPromptAnswer,
  getRhythmCell,
  METER_IDS,
  RHYTHM_CELLS,
  type CountingProfileId,
} from "../src/rhythm";

/* Hints are optional and teacher-enabled: off unless a link says hints=on. A
 * question then offers one tip, built from the question, that says how to count
 * it and never which syllables sound; the card says how many were used. */

function ok(search: string) {
  const result = parseAssignment(search);
  if (!result.ok) throw new Error(`expected a valid link, got: ${result.error.message}`);
  return result;
}

const PROFILES = Object.keys(COUNTING_PROFILES) as CountingProfileId[];
/** True when `text` holds `count` as its own run of syllables, not inside a word ("where a" is not "e a"). */
const says = (text: string, count: string) =>
  new RegExp(`(?<![\\w&])${count.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w&])`).test(text);
const beat = (id: string, meter: (typeof METER_IDS)[number] = "4-4") => createBeatPrompt(getRhythmCell(id), meter);

describe("the hints parameter", () => {
  it("is off for every link that does not name it, and old links serialize as they did", () => {
    const old = ok("?a=Step%202&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2");
    expect(old.assignment.hints).toBe(false);
    expect(old.locked).not.toContain("hints");
    expect(serializeAssignment(old.assignment)).not.toContain("hints");
    expect(describeAssignment(old.assignment)).not.toMatch(/hint/);
  });

  it("reads on and off, and on is a teacher's setting stated in the conditions", () => {
    const on = ok("?level=2&scope=beat&n=10&pass=8&hints=on");
    expect(on.assignment.hints).toBe(true);
    expect(on.locked).toContain("hints");
    expect(isAssigned(parseAssignment("?hints=on"))).toBe(true);
    expect(describeAssignment(on.assignment)).toBe("Eighth placement · one beat · 10 questions · pass at 8 · hints on request");
    expect(ok("?level=2&hints=off").assignment.hints).toBe(false);
    expect(ok("?level=2&hints=off").locked).not.toContain("hints");
  });

  it("round-trips through the canonical link", () => {
    const link = "?a=Quiz&level=2&scope=beat&n=10&pass=8&time=5&hints=on&seed=abc";
    const parsed = ok(link).assignment;
    expect(serializeAssignment(parsed)).toBe(link);
    expect(ok(serializeAssignment(parsed)).assignment).toEqual(parsed);
  });

  it("refuses any other value with a message, so a typo is reported rather than ignored", () => {
    for (const raw of ["yes", "true", "1", "", "ON"]) {
      const result = parseAssignment(`?scope=beat&n=5&hints=${encodeURIComponent(raw)}`);
      expect(result.ok, raw).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("hints");
      expect(result.error.entry).toBe(raw);
      expect(result.error.message).toContain(`hints to “${raw}”`);
    }
  });

  it("is declared in the capability manifest", () => {
    expect(COUNT_IT_CAPABILITY_MANIFEST.configurableSettings).toContain("hints");
    expect(COUNT_IT_CAPABILITY_MANIFEST.lockableSettings).toContain("hints");
  });
});

describe("a hint", () => {
  it("names the grid of the beat it points at, in the round's own syllables", () => {
    expect(hintFor(beat("sixteenths"))).toBe(
      "Split the beat into four sixteenths: the beat number, e, &, a. Say only the ones where a note starts.",
    );
    expect(hintFor(beat("eighths"))).toBe("Split the beat into two eighths: the beat number, then &. Say only the ones where a note starts.");
    expect(hintFor(beat("sixteenths"), "eastman-ti-te-ta")).toContain("the beat number, ti, te, ta.");
    expect(hintFor(beat("eighths"), "eastman-ta-te-ta")).toContain("the beat number, then te.");
    expect(hintFor(beat("rest-eighth"))).toBe(
      "Split the beat into two eighths: the beat number, then &. Say only the ones where a note starts. " +
        "A rest is silent: skip its syllable, but keep it in your count.",
    );
    expect(hintFor(beat("dotted-eighth-sixteenth"))).toMatch(/A dotted eighth lasts three sixteenths\.$/);
    expect(hintFor(beat("eighth-two"))).toMatch(/An eighth note lasts two sixteenths, so it holds through the syllable after it\.$/);
    expect(hintFor(beat("quarter"))).toBe("A quarter note fills a whole beat. Say a syllable only where a note starts.");
  });

  it("depends on how a beat divides, never on which parts of it sound", () => {
    // Every rest-bearing sixteenth cell gets one tip, though their answers all differ.
    const restCells = ["three-rest-note", "rest-sixteenth-rest", "alternating-rests", "rest-two-rest", "rest-three", "two-rest", "rest-two"];
    const tips = new Set(restCells.map((id) => hintFor(beat(id))));
    expect(tips.size).toBe(1);
    expect(new Set(restCells.map((id) => getPromptAnswer(beat(id)))).size).toBe(restCells.length);
    expect(hintFor(beat("eighth-rest"))).toBe(hintFor(beat("rest-eighth")));
    expect(new Set(["eighth-two", "two-eighth", "sixteenth-eighth-sixteenth"].map((id) => hintFor(beat(id)))).size).toBe(1);
  });

  it("never contains the answer, for any one-beat rhythm, meter or counting profile", () => {
    for (const system of PROFILES) {
      for (const meter of METER_IDS) {
        for (const cell of RHYTHM_CELLS) {
          const prompt = createBeatPrompt(cell, meter);
          const answer = getPromptAnswer(prompt, system);
          const tip = hintFor(prompt, system);
          // A one-syllable answer ("&", "a") is a grid name the tip has to use.
          if (answer.includes(" ")) expect(says(tip, answer), `${cell.id} ${system}: ${tip}`).toBe(false);
          expect(says(tip, "e a")).toBe(false);
          expect(tip).not.toMatch(/\b1\b/);
        }
      }
    }
  });

  it("in a measure, names the meter and the hardest beat, and never the answer", () => {
    const measure = createMeasurePrompt(["quarter", "eighths", "rest-three", "quarter"].map(getRhythmCell), "4-4");
    expect(hintFor(measure)).toBe(
      "This 4/4 bar has four beats. Look closely at beat 3. " +
        "Split the beat into four sixteenths: the beat number, e, &, a. Say only the ones where a note starts. " +
        "A rest is silent: skip its syllable, but keep it in your count.",
    );
    const held = createMeasurePrompt(["half", "quarter", "quarter"].map(getRhythmCell), "4-4");
    expect(hintFor(held)).toBe(
      "This 4/4 bar has four beats. Look closely at beat 1. " +
        "A half note lasts two beats. Say it once, on the beat where it starts, and stay silent through the beats it holds.",
    );
    const rested = createMeasurePrompt(["quarter", "half-rest"].map(getRhythmCell), "3-4");
    expect(hintFor(rested)).toMatch(/^This 3\/4 bar has three beats\. Look closely at beat 2\. A half rest is two silent beats\./);

    for (const system of PROFILES) {
      for (const meter of METER_IDS) {
        for (const question of generateQuestions({ level: "level-3", scope: "measure", meter, system, count: 20, seed: `hints-${meter}` })) {
          const tip = hintFor(question.prompt, system);
          for (const choice of question.choices) expect(says(tip, choice.label), `${choice.label}: ${tip}`).toBe(false);
        }
      }
    }
  });
});

describe("hints on the card", () => {
  const stamp = new Date("2026-10-17T14:03:00.000Z");
  const base = { assignment: "Quiz", studentId: "", correct: 7, total: 8, finishedAt: stamp };

  it("a right answer after a hint still scores: hints never touch the session", () => {
    const [question] = generateQuestions({ level: "level-2", scope: "beat", count: 1, seed: "h" });
    const session = answerSession(createSession([question]), question.correctChoiceId);
    expect(session.score).toBe(1);
  });

  it("the verification code covers the hints used, and codes without hints are unchanged", () => {
    const plain = verificationCode(base);
    expect(plain).toBe(verificationCode({ ...base, attempt: 1 }));
    const three = verificationCode({ ...base, hintsUsed: 3 });
    expect(three).not.toBe(plain);
    expect(three).not.toBe(verificationCode({ ...base, hintsUsed: 0 }));
    expect(verificationCode({ ...base, hintsUsed: 0 })).not.toBe(plain);
    expect(hintsTicketLine(3)).toBe("Hints used: 3");
  });

  it("the evidence record keeps the setting so the conditions can be reproduced", () => {
    const assignment = ok("?level=2&scope=beat&n=1&hints=on&seed=h").assignment;
    const questions = generateQuestions({ level: "level-2", scope: "beat", count: 1, seed: "h" });
    const session = answerSession(createSession(questions), questions[0].correctChoiceId);
    const result = createPraxisEvidenceResult({
      session, assignment, sequenceStep: null, level: "level-2", scope: "beat", countingSystem: "standard",
      finishedAt: stamp, attempt: 1,
    });
    expect(JSON.stringify(result)).toContain('"hints":"on"');
  });
});

describe("writing a link with hints", () => {
  const base: BuilderState = { ...defaultBuilderState("abc123"), name: "Quiz" };

  it("the builder writes hints=on only when asked, and notes what it does", () => {
    expect(buildQuery(base)).not.toContain("hints");
    expect(buildQuery({ ...base, hints: true })).toMatch(/&hints=on&seed=abc123$/);
    const result = evaluateBuilder({ ...base, hints: true });
    if (!result.ok) throw new Error(result.problem);
    expect(result.assignment.hints).toBe(true);
    expect(result.notes.join(" ")).toMatch(/^Hints on|Hints on: each question has a Hint button/);
  });

  it("the assignments page toggle adds or removes only hints", () => {
    for (const entry of CATALOG_ENTRIES) {
      const on = withHints(entry.link, true);
      expect(on).toBe(`${entry.link}&hints=on`);
      expect(withHints(on, true)).toBe(on);
      expect(withHints(on, false)).toBe(entry.link);
      if (entry.app === "count-it") expect(ok(`?${on.split("?")[1]}`).assignment.hints).toBe(true);
    }
    expect(withHints("/", true)).toBe("/?hints=on");
    expect(withHints("/?hints=on", false)).toBe("/");
  });
});
