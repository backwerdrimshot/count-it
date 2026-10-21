import { describe, expect, it } from "vitest";
import {
  isAssigned,
  parseAssignment,
  playedAssignment,
  questionRepeats,
  roundKey,
  serializeAssignment,
  uniqueQuestions,
} from "../src/assignment";
import { buildQuery, builderStateFromQuery, defaultBuilderState, evaluateBuilder, type BuilderState } from "../src/assignment/builder";
import { ALL_RHYTHM_CELLS, getCellsForLevel } from "../src/rhythm";
import { generateQuestions } from "../src/question";

describe("a class code on an assignment link", () => {
  it("reads the code, and writes it back in the link", () => {
    const parsed = parseAssignment("?cells=quarter,eighths&scope=beat&class=4B-SPRING");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("fixture rejected");
    expect(parsed.assignment.classCode).toBe("4B-SPRING");
    expect(serializeAssignment(parsed.assignment)).toContain("class=4B-SPRING");
  });

  it("refuses a code a student cannot type from a board", () => {
    for (const bad of ["4 B", "-4B", "x".repeat(25), "4B_SPRING", "4B."]) {
      const parsed = parseAssignment(`?cells=quarter,eighths&class=${encodeURIComponent(bad)}`);
      expect(parsed.ok, bad).toBe(false);
      if (!parsed.ok) expect(parsed.error.code, bad).toBe("class");
    }
  });

  it("makes a class-only link an assignment, and leaves links without one as they were", () => {
    expect(isAssigned(parseAssignment("?class=4B"))).toBe(true);
    const plain = parseAssignment("?cells=quarter,eighths&scope=beat");
    expect(plain.ok).toBe(true);
    if (!plain.ok) throw new Error("fixture rejected");
    expect(plain.assignment.classCode).toBeNull();
    expect(serializeAssignment(plain.assignment)).not.toContain("class=");
  });
});

describe("the round's identity", () => {
  it("is the same for the same settings whatever the link calls them", () => {
    const one = parseAssignment("?a=Step%201&cells=quarter,eighths&seed=cr1");
    const two = parseAssignment("?a=Step%202&cells=quarter,eighths&seed=cr1");
    if (!one.ok || !two.ok) throw new Error("fixture rejected");
    expect(roundKey(one.assignment)).toBe(roundKey(two.assignment));
    expect(roundKey(one.assignment)).toMatch(/^R[0-9A-Z]{6}$/);
  });

  it("changes with any setting that changes the questions or how they are asked", () => {
    const base = parseAssignment("?cells=quarter,eighths&seed=cr1");
    if (!base.ok) throw new Error("fixture rejected");
    const key = roundKey(base.assignment);
    for (const variant of [
      "?cells=quarter,eighths&seed=cr2",
      "?cells=quarter,eighths&seed=cr1&scope=measure&meter=4-4",
      "?cells=quarter,eighths&seed=cr1&class=4B",
      "?cells=quarter,eighths&seed=cr1&guide=off",
      "?cells=quarter,eighths,quarter&seed=cr1&n=4",
    ]) {
      const other = parseAssignment(variant);
      if (!other.ok) throw new Error(`fixture rejected: ${variant}`);
      expect(roundKey(other.assignment), variant).not.toBe(key);
    }
  });

  it("is taken from the round as played, not from the link, when a student changes the level", () => {
    const link = parseAssignment("?seed=cr1&n=5");
    if (!link.ok) throw new Error("fixture rejected");
    const played = playedAssignment(link.assignment, link.locked, { level: "level-1", scope: "beat", meter: "4-4" });
    expect(roundKey(played)).not.toBe(roundKey(link.assignment));
  });
});

describe("repeated questions", () => {
  it("counts the different questions a round can ask", () => {
    const oneBeat = getCellsForLevel("level-1").filter((cell) => cell.beats === 1).length;
    expect(uniqueQuestions({ scope: "beat", level: "level-1" })).toBe(oneBeat);
    expect(uniqueQuestions({ scope: "beat", level: "level-2", cells: ["quarter", "eighths"] })).toBe(2);
  });

  it("says a round repeats only when it asks more questions than there are different ones", () => {
    expect(questionRepeats({ scope: "beat", level: "level-2", cells: ["quarter", "eighths"], count: 12 })).toEqual({ unique: 2, repeats: true });
    expect(questionRepeats({ scope: "beat", level: "level-2", cells: ["quarter", "eighths"], count: 2 })).toEqual({ unique: 2, repeats: false });
  });
});

describe("the builder warns about a repeating round, and never refuses it", () => {
  const pinned = { ...defaultBuilderState("cr1"), vocabulary: { kind: "cells" as const, cells: ["quarter", "eighths"] }, count: 12, passing: null };
  const notesOf = (state: BuilderState) => {
    const result = evaluateBuilder(state);
    if (!result.ok) throw new Error(`builder refused: ${result.problem}`);
    return result.notes.join(" ");
  };

  it("keeps the link, and says how many questions repeat and how to avoid it", () => {
    const notes = notesOf(pinned);
    expect(notes).toMatch(/asks 12 questions from 2 different one-beat rhythms/);
    expect(notes).toMatch(/ask for 2 or fewer/);
  });

  it("says nothing about repeats when the round asks no more than its rhythms make", () => {
    expect(notesOf({ ...pinned, count: 2 })).not.toMatch(/repeat/);
  });

  it("warns about the level the student starts from when the rhythm choice is left to them", () => {
    const notes = notesOf({ ...pinned, vocabulary: { kind: "student" as const } });
    expect(notes).toMatch(/Rhythm choice is left to the student/);
  });

  it("still allows the default starting point, which asks more questions than the level's rhythms make", () => {
    const result = evaluateBuilder(defaultBuilderState("cr1"));
    expect(result.ok).toBe(true);
  });

  it("writes the class code and reads it back when the builder reopens a link", () => {
    const query = buildQuery({ ...defaultBuilderState("cr1"), classCode: "4B" });
    expect(query).toContain("class=4B");
    expect(builderStateFromQuery(query)?.classCode).toBe("4B");
  });
});

describe("the Eastman variant keeps every rhythm and builds a fair question for each", () => {
  it("builds one question per one-beat rhythm, with distinct choices and the verified answer", () => {
    const systems = ["eastman-ta-te-ta", "eastman-ti-te-ta"] as const;
    for (const system of systems) {
      for (const cell of ALL_RHYTHM_CELLS.filter((entry) => entry.beats === 1)) {
        const [question] = generateQuestions({ level: "level-3", scope: "beat", cells: [cell.id], system, count: 1, seed: "eastman" });
        expect(question.choices, cell.id).toHaveLength(4);
        expect(new Set(question.choices.map((choice) => choice.label)).size, cell.id).toBe(4);
        expect(question.correctAnswer, cell.id).toBe(cell.verifiedAnswers[system]);
        expect(question.choices.filter((choice) => choice.isCorrect), cell.id).toHaveLength(1);
      }
    }
  });

  it("does not drop a rhythm because the variant says ta for two positions", () => {
    const shared = ALL_RHYTHM_CELLS.filter((cell) => {
      const answer = cell.verifiedAnswers["eastman-ta-te-ta"];
      return cell.beats === 1 && answer.split(" ").filter((word) => word === "ta").length > 1;
    });
    expect(shared.length).toBeGreaterThan(0);
    for (const cell of shared) {
      const levelOne = getCellsForLevel(cell.minLevel);
      expect(levelOne.map((entry) => entry.id), cell.id).toContain(cell.id);
    }
  });
});
