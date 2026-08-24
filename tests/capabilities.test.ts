import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { COUNT_IT_BUILD, COUNT_IT_CAPABILITY_MANIFEST } from "../src/capabilities";
import { ALL_RHYTHM_CELLS, EIGHTH_BEAT_CELLS, METER_IDS, RHYTHM_CELLS } from "../src/rhythm";

const served = JSON.parse(
  readFileSync(new URL("../public/praxis-capabilities.json", import.meta.url), "utf8"),
);

describe("the published capability manifest", () => {
  it("is a serialized copy of the manifest the app builds", () => {
    // The served file is what siblings and the shop site actually read. A
    // manifest that drifts from the app it describes is worse than none: it is
    // confidently wrong, and consumers act on it.
    expect(served).toEqual(JSON.parse(JSON.stringify(COUNT_IT_CAPABILITY_MANIFEST)));
  });

  it("declares the URL parameters the assignment parser actually reads", () => {
    // Scale Trail published `questionTypes` — an internal settings field —
    // where the parameter it reads is `types`, so anything building a link
    // from that manifest sent something the app ignored and silently received
    // defaults. Nobody caught it because the manifest was data and the parser
    // was code, with no test between them. This is that test, derived from the
    // parser rather than restating it.
    const parser = readFileSync(new URL("../src/assignment/index.ts", import.meta.url), "utf8");
    const read = new Set(
      [...parser.matchAll(/params\.get\("([a-zA-Z]+)"\)/g)].map((match) => match[1]),
    );
    expect(read.size).toBeGreaterThanOrEqual(8);
    const declared = new Set<string>(COUNT_IT_CAPABILITY_MANIFEST.configurableSettings);
    expect([...read].filter((name) => !declared.has(name))).toEqual([]);
    expect([...declared].filter((name) => !read.has(name))).toEqual([]);
  });

  it("publishes the cell ids links are written against", () => {
    // A link authored by hand names these, so a rename is a breaking change to
    // every assignment already posted in a classroom. Publishing them is what
    // lets a consumer check a link before a student opens it.
    expect(COUNT_IT_CAPABILITY_MANIFEST.rhythmCellIds).toEqual(
      ALL_RHYTHM_CELLS.map((cell) => cell.id),
    );
    /* The two beat families are published separately because they are not
       interchangeable and a link mixing them is refused. `eighths` is a
       QUARTER beat filled with two eighths; `eighth-beat` is an eighth-note
       beat. A consumer that could not tell them apart would write a link this
       app rejects, and the names alone do not settle it. */
    expect(COUNT_IT_CAPABILITY_MANIFEST.quarterBeatCellIds).toEqual(
      RHYTHM_CELLS.map((cell) => cell.id),
    );
    expect(COUNT_IT_CAPABILITY_MANIFEST.eighthBeatCellIds).toEqual(
      EIGHTH_BEAT_CELLS.map((cell) => cell.id),
    );
    /* Every published id belongs to exactly one family, and the two together
       are the whole catalog — no id in both, none in neither. */
    const quarter = new Set<string>(COUNT_IT_CAPABILITY_MANIFEST.quarterBeatCellIds);
    const eighth = new Set<string>(COUNT_IT_CAPABILITY_MANIFEST.eighthBeatCellIds);
    expect([...quarter].filter((id) => eighth.has(id))).toEqual([]);
    expect(quarter.size + eighth.size).toBe(COUNT_IT_CAPABILITY_MANIFEST.rhythmCellIds.length);
    expect(COUNT_IT_CAPABILITY_MANIFEST.meters).toEqual(METER_IDS);
  });

  it("keeps the build identifier married to the footer stamp", () => {
    const app = readFileSync(new URL("../app/CountItApp.tsx", import.meta.url), "utf8");
    expect(app).toContain("COUNT_IT_BUILD");
    expect(COUNT_IT_CAPABILITY_MANIFEST.version).toBe(COUNT_IT_BUILD);
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toContain(`- **Build:** \`${COUNT_IT_BUILD}\``);
  });

  it("claims no skill vocabulary, because none has been agreed", () => {
    // An invented skill id is a contract nobody agreed to, and it would be
    // consumed as though someone had.
    expect(COUNT_IT_CAPABILITY_MANIFEST.compatibleSkillDomains).toEqual([]);
    expect(COUNT_IT_CAPABILITY_MANIFEST.skillVocabularyStatus).toMatch(/not yet reconciled/i);
  });

  it("does not claim evidence or abilities this app lacks", () => {
    /* Was 1. The manifest itself named the condition — "Level 1 until the
       universal result envelope is adopted" — and 2026-08-08.4 adopted it, so
       the level moves with the criterion that was written down in advance.
       What Level 2 does NOT assert is transmission: nothing leaves the device
       here or in either sibling, and Scale Trail has claimed 2 on the same
       terms throughout. */
    expect(COUNT_IT_CAPABILITY_MANIFEST.integrationLevel).toBe(2);
    expect(COUNT_IT_CAPABILITY_MANIFEST.integrationLevelRationale).toMatch(/nothing leaves the device/i);
    expect(COUNT_IT_CAPABILITY_MANIFEST.resultSchemaVersion).toBe("praxis.result.v0_1");
    const limitations = COUNT_IT_CAPABILITY_MANIFEST.limitations.join(" ");
    expect(limitations).toMatch(/no audio, no microphone, and no tempo engine/i);
    expect(limitations).toMatch(/does not measure live performance/i);
  });
});
