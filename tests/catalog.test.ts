import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssignment, serializeAssignment } from "../src/assignment";
import {
  CATALOG_ENTRIES,
  CATALOG_SEQUENCES,
  EIGHT_TIME_ORIGIN,
  catalogDocument,
  entriesForSequence,
  getCatalogEntry,
} from "../src/assignment/catalog";
import { PRODUCTION_ORIGIN } from "../src/assignment/builder";
import { ALL_PRESETS, getPreset } from "../src/assignment/presets";
import { parseSequenceStep } from "../src/sequence-step";
import { generateQuestions } from "../src/question";
import {
  PUBLISHED_COUNTING_RHYTHMS,
  PUBLISHED_EIGHT_TIME,
  PUBLISHED_RHYTHMS_IN_THREE,
} from "./fixtures/published-links";

const countIt = CATALOG_ENTRIES.filter((entry) => entry.app === "count-it");
const eightTime = CATALOG_ENTRIES.filter((entry) => entry.app === "eight-time");

/* The links the site publishes, in catalog order: Counting Rhythms 1–10, then
   Rhythms in Three 1–6 (3/4 here, 3/8 in Eight Time). */
const SITE_LINKS = [...PUBLISHED_COUNTING_RHYTHMS, ...PUBLISHED_RHYTHMS_IN_THREE, ...PUBLISHED_EIGHT_TIME];

function roundOf(query: string): string {
  const parsed = parseAssignment(query);
  if (!parsed.ok) throw new Error(parsed.error.message);
  const a = parsed.assignment;
  return JSON.stringify(
    generateQuestions({
      level: a.level,
      scope: a.scope,
      ...(a.meter ? { meter: a.meter } : {}),
      ...(a.cells ? { cells: a.cells } : {}),
      count: a.count ?? 5,
      seed: a.seed ?? "none",
      variant: "a-student",
    }).map((q) => [q.id, q.correctChoiceId, q.choices.map((c) => [c.id, c.label]), q.explanation]),
  );
}

describe("the assignment catalog", () => {
  it("lists thirteen Count It steps and three Eight Time steps, in sequence order", () => {
    expect(CATALOG_ENTRIES).toHaveLength(16);
    expect(countIt).toHaveLength(13);
    expect(eightTime).toHaveLength(3);
    expect(CATALOG_ENTRIES.map((entry) => `${entry.sequence}#${entry.step}`)).toEqual([
      ...Array.from({ length: 10 }, (_, i) => `counting-rhythms#${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `rhythms-in-three#${i + 1}`),
    ]);
    expect(CATALOG_SEQUENCES.map((sequence) => sequence.id)).toEqual(["counting-rhythms", "rhythms-in-three"]);
  });

  it("has unique ids and unique seeds, so no two named assignments are the same round", () => {
    expect(new Set(CATALOG_ENTRIES.map((entry) => entry.id)).size).toBe(16);
    const seeds = CATALOG_ENTRIES.map((entry) => new URLSearchParams(entry.query).get("seed"));
    expect(seeds.every(Boolean)).toBe(true);
    expect(new Set(seeds).size).toBe(16);
  });

  it("is entirely free: every entry says so", () => {
    expect(CATALOG_ENTRIES.every((entry) => entry.tier === "free")).toBe(true);
  });

  it("publishes each entry's link exactly as the shop site does, same round and same labels", () => {
    CATALOG_ENTRIES.forEach((entry, index) => {
      const site = `?${SITE_LINKS[index]}`;
      if (entry.app === "eight-time") {
        /* Count It's parser refuses 3/8 by design; these are held as strings. */
        expect(entry.query, entry.id).toBe(site);
        return;
      }
      expect(roundOf(entry.query), entry.id).toBe(roundOf(site));
      const mine = parseAssignment(entry.query);
      const theirs = parseAssignment(site);
      if (!mine.ok || !theirs.ok) throw new Error(entry.id);
      /* The attempt tally is keyed by the serialized assignment, so equal keys mean a
         student's history is the same whichever of the two links they opened. (Step
         10's published link also says level=1 beside its rhythms; the parser ignores
         it and the serializer drops it, which is why this compares keys rather than
         every field.) */
      expect(serializeAssignment(mine.assignment), entry.id).toBe(serializeAssignment(theirs.assignment));
      expect(parseSequenceStep(entry.query), entry.id).toEqual(parseSequenceStep(site));
      expect(parseSequenceStep(entry.query), entry.id).toEqual({ seq: entry.sequence, step: entry.step });
    });
  });

  it("leaves Counting Rhythms' meter open and names Rhythms in Three's, as the site does", () => {
    for (const entry of countIt) {
      const meter = new URLSearchParams(entry.query).get("meter");
      expect(meter, entry.id).toBe(entry.sequence === "rhythms-in-three" ? "3-4" : null);
    }
  });

  it("points each entry at the app that runs it", () => {
    for (const entry of countIt) expect(entry.link).toBe(`${PRODUCTION_ORIGIN}/${entry.query}`);
    for (const entry of eightTime) {
      expect(entry.link).toBe(`${EIGHT_TIME_ORIGIN}/${entry.query}`);
      expect(new URLSearchParams(entry.query).get("meter")).toBe("3-8");
      expect(entry.presetId).toBeNull();
    }
  });

  it("starts the builder only from steps the builder can make", () => {
    expect(countIt.every((entry) => entry.presetId !== null && getPreset(entry.presetId))).toBe(true);
    expect(countIt.map((entry) => entry.presetId)).toEqual(ALL_PRESETS.map((preset) => preset.id));
  });

  it("states each round in a line a teacher can read", () => {
    const step3 = getCatalogEntry("counting-rhythms-3");
    expect(step3?.summary).toContain("one beat");
    expect(step3?.summary).toContain("guide hidden");
    expect(step3?.summary).toContain("12 questions");
    expect(step3?.summary).toContain("pass at 10");
    expect(getCatalogEntry("rhythms-in-three-4")?.summary).toBe("2 rhythms · one measure · 3/8 · guide visible · 8 questions · pass at 7");
    expect(getCatalogEntry("rhythms-in-three-6")?.summary).toBe("4 rhythms · one measure · 3/8 · guide hidden · 12 questions · pass at 10");
  });

  it("carries each step's own question count and pass mark", () => {
    expect(countIt.map((entry) => `${entry.passing}/${entry.count}`)).toEqual([
      "10/12", "10/12", "10/12", "10/12", "10/12", "10/12", "10/12", "11/12", "14/16", "10/12", // Counting Rhythms
      "10/12", "10/12", "10/12", // Rhythms in Three, 3/4
    ]);
    expect(eightTime.map((entry) => `${entry.passing}/${entry.count}`)).toEqual(["7/8", "10/12", "10/12"]);
  });

  it("finds a step by id and a sequence's steps by sequence", () => {
    expect(getCatalogEntry("counting-rhythms-10")?.title).toBe("Notes That Last");
    expect(getCatalogEntry("rhythms-in-three-6")?.app).toBe("eight-time");
    expect(getCatalogEntry("nope")).toBeUndefined();
    expect(entriesForSequence("counting-rhythms")).toHaveLength(10);
    expect(entriesForSequence("rhythms-in-three")).toHaveLength(6);
  });
});

describe("the catalog the app serves", () => {
  const FILE = new URL("../public/praxis-assignment-catalog.json", import.meta.url);
  const serialized = JSON.stringify(catalogDocument(), null, 2) + "\n";

  /* To regenerate after a catalog change:
       UPDATE_CATALOG_JSON=1 pnpm test tests/catalog.test.ts
     The next plain run then holds the file to the data again. */
  if (process.env.UPDATE_CATALOG_JSON === "1") writeFileSync(FILE, serialized);

  it("is exactly the serialized catalog, so a consumer never reads a stale copy", () => {
    expect(readFileSync(FILE, "utf8")).toBe(serialized);
  });

  it("names its schema and carries no timestamp or build id", () => {
    const document = catalogDocument();
    expect(document.schema).toBe("count-it.assignment-catalog.v1");
    expect(JSON.stringify(document)).not.toMatch(/20\d\d-\d\d-\d\d/);
    expect(document.entries).toHaveLength(16);
  });
});
