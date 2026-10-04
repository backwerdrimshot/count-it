/* The assignment catalog: every published teaching-sequence step that runs in
 * Count It or its sibling Eight Time, as data.
 *
 * ONE LIST, THREE READERS. The in-app /assignments page, the JSON the app
 * serves at /praxis-assignment-catalog.json (which Praxis Press and Praxis
 * Studio can pin or fetch), and the builder's "Start from a step" menu all read
 * this module, so the three cannot disagree about what step 3 is.
 *
 * WHERE THE STEPS COME FROM. Count It's thirteen entries are derived from
 * ./presets.ts, which holds the shop site's own links and is pinned to them by
 * tests/presets.test.ts. Eight Time's three entries are the site's links stored
 * verbatim below: Count It's parser refuses a 3/8 link on purpose, so it cannot
 * check them the way it checks its own — Eight Time's repository holds the
 * round, and tests/catalog.test.ts holds the links.
 *
 * THIS IS A CATALOG OF FREE ASSIGNMENTS. Every entry is tier "free": the same
 * link a teacher can read off the sequence page, run in a free app that needs no
 * account. Nothing here is hidden behind anything, and nothing could be — the
 * generator ships to the browser, so a named assignment is only a set of link
 * settings anyone can rebuild at /build. What a book or a Studio plan adds is
 * everything around the assignment: pages, keys, guides, a stamped licence,
 * results. If an entry for a book unit is ever added, its seed must differ from
 * every seed listed here (praxis-press holds a test of that kind for Staff
 * Spot), which is why seeds are unique across the catalog and the test says so.
 */
import { MAX_NAME_LENGTH, PRODUCTION_ORIGIN, buildQuery, evaluateBuilder } from "./builder";
import {
  ALL_PRESETS,
  COUNTING_RHYTHMS_SEQUENCE_URL,
  RHYTHMS_IN_THREE_SEQUENCE_URL,
  type BuilderPreset,
  type SequenceId,
} from "./presets";

export const EIGHT_TIME_ORIGIN = "https://eight-time.backwerdrhythmshop.com";

export type CatalogApp = "count-it" | "eight-time";

export interface CatalogSequence {
  readonly id: SequenceId;
  readonly name: string;
  /** The sequence's own page on the shop site. */
  readonly url: string;
  /** One line on what the sequence is for. */
  readonly blurb: string;
}

export const CATALOG_SEQUENCES: readonly CatalogSequence[] = Object.freeze([
  Object.freeze({
    id: "counting-rhythms" as const,
    name: "Counting Rhythms — 4/4",
    url: COUNTING_RHYTHMS_SEQUENCE_URL,
    blurb: "Quarters and pairs, rest entry, sixteenths in stages, full measures with the guide off, then notes that last longer than a beat.",
  }),
  Object.freeze({
    id: "rhythms-in-three" as const,
    name: "Rhythms in Three — 3/4 and 3/8",
    url: RHYTHMS_IN_THREE_SEQUENCE_URL,
    blurb: "The same counting in a bar of three: steps 1–3 are 3/4 and run in Count It; steps 4–6 are 3/8 and open in Eight Time.",
  }),
]);

export interface CatalogEntry {
  readonly id: string;
  /** Which app runs this step. */
  readonly app: CatalogApp;
  readonly sequence: SequenceId;
  readonly step: number;
  /** "Quarters & Pairs", without the "Step N:" prefix. */
  readonly title: string;
  /** "Step 1: Quarters & Pairs", the name the link gives the round. */
  readonly name: string;
  readonly focus: string;
  /** Always "free" today; see the note at the top of this file. */
  readonly tier: "free";
  /** The round in one line: size, meter, guide, length and pass mark. */
  readonly summary: string;
  readonly count: number;
  readonly passing: number;
  /** The published link's query string, `?seq=…&step=…&…`. */
  readonly query: string;
  /** The published link, absolute. */
  readonly link: string;
  /** The builder preset that starts from this step; null where this app's builder cannot make it. */
  readonly presetId: string | null;
}

/* ---- Count It's entries: derived from the presets ---------------------------------- */

function countItEntry(preset: BuilderPreset): CatalogEntry {
  /* The PUBLISHED round, not the preset's: Counting Rhythms links leave the meter
     open, and the preset pins it. The catalog lists what the site publishes. */
  const published = { ...preset.state, meter: preset.publishedMeter };
  const result = evaluateBuilder(published);
  if (!result.ok) {
    /* A preset the parser rejects is a defect in this repository, not something a
       page should render around. tests/presets.test.ts catches it first. */
    throw new Error(`catalog: ${preset.id} is not a valid assignment: ${result.problem}`);
  }
  const query = `?seq=${preset.sequence}&step=${preset.step}&${buildQuery(published).slice(1)}`;
  return Object.freeze({
    id: preset.id,
    app: "count-it" as const,
    sequence: preset.sequence,
    step: preset.step,
    title: preset.title,
    name: preset.state.name,
    focus: preset.focus,
    tier: "free" as const,
    summary: result.summary,
    count: preset.state.count ?? 0,
    passing: preset.state.passing ?? 0,
    query,
    link: `${PRODUCTION_ORIGIN}/${query}`,
    presetId: preset.id,
  });
}

/* ---- Eight Time's entries: the site's links, verbatim -------------------------------
 *
 * backwerd-rhythm-shop-site@63e57c8, sequences/rhythms-in-three/index.html. */

interface EightTimeStep {
  readonly step: number;
  readonly title: string;
  readonly focus: string;
  readonly query: string;
}

const EIGHT_TIME_STEPS: readonly EightTimeStep[] = Object.freeze([
  {
    step: 4,
    title: "The Eighth Takes the Beat",
    focus: "Two rhythms and nothing else: the eighth note is the beat, and half of it is a sixteenth",
    query: "?seq=rhythms-in-three&step=4&a=Step%204%3A%20The%20Eighth%20Takes%20the%20Beat&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths&guide=on&n=8&pass=7&seed=r3-4-eighth-beat",
  },
  {
    step: 5,
    title: "A Bar of Three Eighths",
    focus: "All four eighth-beat rhythms in one 3/8 measure",
    query: "?seq=rhythms-in-three&step=5&a=Step%205%3A%20A%20Bar%20of%20Three%20Eighths&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths,sixteenth-rest,rest-sixteenth&guide=on&n=12&pass=10&seed=r3-5-bar-of-three",
  },
  {
    step: 6,
    title: "Three in Eighths, Cold",
    focus: "The same bar with the guide hidden — pair it with step 3 in one sitting",
    query: "?seq=rhythms-in-three&step=6&a=Step%206%3A%20Three%20in%20Eighths%2C%20Cold&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths,sixteenth-rest,rest-sixteenth&guide=off&n=12&pass=10&seed=r3-6-cold",
  },
]);

/* A summary in the same shape Count It's builder writes, read off the link
   itself. Eight Time's own parser is the authority on whether the link is
   valid; this only has to say honestly what the link asks for. */
function looseSummary(query: string): { summary: string; count: number; passing: number } {
  const params = new URLSearchParams(query);
  const cells = (params.get("cells") ?? "").split(",").filter(Boolean).length;
  const count = Number(params.get("n"));
  const passing = Number(params.get("pass"));
  const parts = [
    cells === 1 ? "1 rhythm" : `${cells} rhythms`,
    params.get("scope") === "measure" ? "one measure" : "one beat",
    "3/8",
    params.get("guide") === "on" ? "guide visible" : "guide hidden",
    `${count} questions`,
    `pass at ${passing}`,
  ];
  return { summary: parts.join(" · "), count, passing };
}

function eightTimeEntry(source: EightTimeStep): CatalogEntry {
  const params = new URLSearchParams(source.query);
  const name = params.get("a") ?? "";
  if (name.length > MAX_NAME_LENGTH) throw new Error(`catalog: step ${source.step} name is too long`);
  const { summary, count, passing } = looseSummary(source.query);
  return Object.freeze({
    id: `rhythms-in-three-${source.step}`,
    app: "eight-time" as const,
    sequence: "rhythms-in-three" as const,
    step: source.step,
    title: source.title,
    name,
    focus: source.focus,
    tier: "free" as const,
    summary,
    count,
    passing,
    query: source.query,
    link: `${EIGHT_TIME_ORIGIN}/${source.query}`,
    presetId: null,
  });
}

/* ---- The catalog ------------------------------------------------------------------- */

export const CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze(
  [...ALL_PRESETS.map(countItEntry), ...EIGHT_TIME_STEPS.map(eightTimeEntry)].sort(
    (a, b) =>
      CATALOG_SEQUENCES.findIndex((s) => s.id === a.sequence) -
        CATALOG_SEQUENCES.findIndex((s) => s.id === b.sequence) || a.step - b.step,
  ),
);

export function entriesForSequence(sequence: SequenceId): readonly CatalogEntry[] {
  return CATALOG_ENTRIES.filter((entry) => entry.sequence === sequence);
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG_ENTRIES.find((entry) => entry.id === id);
}

/* ---- The document the app serves -------------------------------------------------- */

export const CATALOG_SCHEMA = "count-it.assignment-catalog.v1";

/** What /praxis-assignment-catalog.json holds. No timestamp and no build id, so the
 *  file changes only when the catalog does, and a test can require it to match. */
export function catalogDocument() {
  return {
    schema: CATALOG_SCHEMA,
    description:
      "Every published teaching-sequence step that runs in Count It or its sibling Eight Time. " +
      "Each `link` is the assignment link the shop site publishes for that step. All entries are " +
      "free: a named assignment is a set of link settings, not a locked resource.",
    sequences: CATALOG_SEQUENCES.map((sequence) => ({ ...sequence })),
    entries: CATALOG_ENTRIES.map((entry) => ({ ...entry })),
  };
}
