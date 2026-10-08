/* The assignment builder's logic — what a teacher's choices become.
 *
 * A teacher used to write the link by hand: `?scope=measure&meter=5-4&cells=…`
 * with nineteen rhythm ids and eleven parameters, each of which the parser
 * refuses loudly if it is wrong. This is the form that writes it for them.
 *
 * One rule shapes everything here: **the builder never judges a link, the
 * parser does.** The choices are composed into a query string and handed to
 * `parseAssignment` — the same function the app runs when a student opens the
 * link — and whatever it says is what the builder shows. There is no second copy
 * of "a whole note needs four beats" or "a pass mark cannot exceed the round" to
 * drift from the first, and a link the builder calls valid is, by construction,
 * one the app accepts.
 *
 * Two things the parser does NOT judge, and so this file does:
 *
 *   * An invalid `seed` is silently ignored by the parser (it becomes null).
 *     That is the one parameter where "ignored" is the same failure as "wrong":
 *     the seed is what gives every student the same questions, so a link that
 *     quietly lost it would hand a class different rounds under one assignment
 *     name. The builder refuses it before it is ever written.
 *   * Whether leaving something out is what the teacher meant. A link without a
 *     seed or a pass mark is legal, so it is a *note*, never an error.
 *
 * And one thing it deliberately does not do: run its output through
 * `serializeAssignment`. That is the app's canonical form, and it always writes
 * `scope=` — an absent scope means "the student chooses", and writing it would
 * quietly pin it. The builder writes exactly what was pinned and nothing else.
 */
import {
  ALL_RHYTHM_CELLS,
  DEFAULT_METER,
  COUNTING_PROFILES,
  METER_IDS,
  getCellsByIds,
  getCellsForLevel,
  getLevel,
  getMeter,
  type LevelId,
  type MeterId,
  type CountingProfileId,
  type RhythmCell,
} from "../rhythm";
import {
  DEFAULT_QUESTIONS,
  MAX_NAME_LENGTH,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  describeAssignment,
  parseAssignment,
  uniqueMeasures,
  type Assignment,
  type FeedbackPolicy,
  type GuidePolicy,
  type RetryPolicy,
} from "./index";

/** The production origin, for a link built where there is no window to ask. */
export const PRODUCTION_ORIGIN = "https://count-it.backwerdrhythmshop.com";

/** What the teacher says about the vocabulary. `student` pins nothing: the
 *  learner's own level control decides. */
export type Vocabulary =
  | { readonly kind: "student" }
  | { readonly kind: "level"; readonly level: 1 | 2 | 3 }
  | { readonly kind: "cells"; readonly cells: readonly string[] };

/** Every field a teacher can pin. `null` means "leave it to the student" for a
 *  control the student has, or "the app's own default" for one they do not. */
export interface BuilderState {
  readonly name: string;
  readonly vocabulary: Vocabulary;
  readonly scope: "beat" | "measure" | null;
  readonly meter: MeterId | null;
  /** Null leaves an older/preset link on its Standard default without pinning `sys`. */
  readonly system?: CountingProfileId | null;
  readonly guide: GuidePolicy | null;
  readonly feedback: FeedbackPolicy | null;
  readonly retry: RetryPolicy | null;
  /** Questions in the round. Null: the app's default of five. */
  readonly count: number | null;
  /** Questions needed to pass. Null: no goal on the card. */
  readonly passing: number | null;
  /** Empty string: none. */
  readonly seed: string;
}

/** The seed alphabet the parser accepts — duplicated here ON PURPOSE as a
 *  pattern the test pins against the parser, because the parser's reaction to a
 *  bad seed is silence and a mismatch would be invisible. */
export const SEED_PATTERN = /^[\w-]{1,32}$/;

/** A starting point that is a complete, sensible assignment rather than a blank
 *  form: the eighth-note level, one beat, 4/4, guide visible, ten questions and
 *  an eight-question goal. Every one of those is a thing the teacher can change
 *  or hand back to the student. */
export function defaultBuilderState(seed: string): BuilderState {
  return Object.freeze({
    name: "",
    vocabulary: Object.freeze({ kind: "level" as const, level: 2 as const }),
    scope: "beat" as const,
    meter: DEFAULT_METER,
    system: "standard" as const,
    guide: "on" as const,
    feedback: null,
    retry: null,
    count: 10,
    passing: 8,
    seed,
  });
}

/** Reopen a saved link while preserving every unpinned choice. The app parser
 * remains the sole validator of musical settings. */
export function builderStateFromQuery(search: string): BuilderState | null {
  const params = new URLSearchParams(search);
  const keys = ['a', 'cells', 'level', 'scope', 'meter', 'sys', 'guide', 'fb', 'retry', 'n', 'pass', 'seed'];
  if (keys.some(key => params.getAll(key).length > 1) || params.has('seed') && !SEED_PATTERN.test(params.get('seed')!)) return null;
  const parsed = parseAssignment(search);
  if (!parsed.ok) return null;
  const a = parsed.assignment;
  return {
    name: a.name ?? '',
    vocabulary: a.cells ? { kind: 'cells', cells: a.cells }
      : params.has('level') ? { kind: 'level', level: Number(a.level.slice(-1)) as 1 | 2 | 3 } : { kind: 'student' },
    scope: params.has('scope') ? a.scope : null,
    meter: a.meter,
    system: a.systemPinned ? a.system : null,
    guide: a.guide, feedback: a.feedback, retry: a.retry,
    count: a.count, passing: a.passing, seed: a.seed ?? '',
  };
}

/** A short, readable seed. Takes the random source so the logic stays pure and
 *  a test can fix it. Six base-36 characters is far more than a class needs and
 *  short enough to read aloud. */
export function makeSeed(random: () => number): string {
  let seed = "";
  for (let index = 0; index < 6; index += 1) {
    seed += "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(random() * 31) % 31];
  }
  return seed;
}

/** One rhythm as the builder lists it: what it is called, what a student would
 *  say for it, and which group it sits in. */
export interface BuilderCell {
  readonly id: string;
  readonly label: string;
  /** The Standard count with beat 1 as the example, or "silent". */
  readonly count: string;
  readonly counts: Readonly<Record<CountingProfileId, string>>;
  readonly beats: number;
  /** 1–3 for a one-beat rhythm; 0 for one that lasts longer than a beat, which
   *  is in no level and is opt-in by `cells` only. */
  readonly level: 0 | 1 | 2 | 3;
}

export const BUILDER_CELLS: readonly BuilderCell[] = Object.freeze(
  ALL_RHYTHM_CELLS.map((cell: RhythmCell) =>
    Object.freeze({
      id: cell.id,
      label: cell.label,
      count: cell.verifiedAnswers.standard || "silent",
      counts: Object.freeze(Object.fromEntries(
        Object.keys(COUNTING_PROFILES).map((id) => [
          id,
          cell.verifiedAnswers[id as CountingProfileId] || "silent",
        ]),
      ) as Record<CountingProfileId, string>),
      beats: cell.beats,
      level: cell.beats > 1 ? (0 as const) : (cell.difficulty as 1 | 2 | 3),
    }),
  ),
);

/** The ids of a level's own vocabulary, for a "start from Level 2" shortcut. */
export function cellsForLevel(level: 1 | 2 | 3): readonly string[] {
  return getCellsForLevel(`level-${level}` as LevelId).map((cell) => cell.id);
}

/** What the builder writes: only what was pinned, in the order the app's own
 *  canonical form uses, with the rhythms in catalog order so two selections of
 *  the same rhythms are one link. */
export function buildQuery(state: BuilderState): string {
  const parts: string[] = [];
  const name = state.name.trim();
  if (name) parts.push(`a=${encodeURIComponent(name)}`);
  if (state.vocabulary.kind === "level") parts.push(`level=${state.vocabulary.level}`);
  if (state.scope) parts.push(`scope=${state.scope}`);
  if (state.meter) parts.push(`meter=${state.meter}`);
  if (state.system) parts.push(`sys=${state.system}`);
  if (state.vocabulary.kind === "cells") {
    const chosen = new Set(state.vocabulary.cells);
    parts.push(`cells=${ALL_RHYTHM_CELLS.filter((cell) => chosen.has(cell.id)).map((cell) => cell.id).join(",")}`);
  }
  if (state.guide) parts.push(`guide=${state.guide}`);
  if (state.feedback) parts.push(`fb=${state.feedback}`);
  if (state.retry) parts.push(`retry=${state.retry}`);
  if (state.count !== null) parts.push(`n=${state.count}`);
  if (state.passing !== null) parts.push(`pass=${state.passing}`);
  if (state.seed) parts.push(`seed=${encodeURIComponent(state.seed)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export type BuilderResult =
  | {
      readonly ok: true;
      /** `?…`, or the empty string when nothing is pinned. */
      readonly query: string;
      /** The absolute link. */
      readonly link: string;
      readonly assignment: Assignment;
      /** The same sentence the student's banner and result card show. */
      readonly summary: string;
      /** Legal but worth saying — never a reason to withhold the link. */
      readonly notes: readonly string[];
      /** How many different measures the vocabulary can make in the chosen
       *  meter, when the round is full-measure; null for one beat. */
      readonly measureCeiling: number | null;
    }
  | {
      readonly ok: false;
      /** In the words the app itself would use to the student who opened it. */
      readonly problem: string;
    };

function isWholeNumber(value: number | null): value is number {
  return value !== null && Number.isInteger(value);
}

/** Judge a set of choices — by asking the parser. */
export function evaluateBuilder(state: BuilderState, origin: string = PRODUCTION_ORIGIN): BuilderResult {
  if (state.seed && !SEED_PATTERN.test(state.seed)) {
    return {
      ok: false,
      problem:
        "The seed can use letters, numbers, hyphens and underscores, up to 32 of them. " +
        "Without a valid seed the link would not give every student the same questions.",
    };
  }
  /* A non-integer count or pass mark never reaches the URL: `n=2.5` is refused
     by the parser, but the form's own number inputs cannot produce one, and a
     message about "2.5 questions" would be answering a question nobody asked. */
  if (state.count !== null && !isWholeNumber(state.count)) {
    return { ok: false, problem: "The number of questions has to be a whole number." };
  }
  if (state.passing !== null && !isWholeNumber(state.passing)) {
    return { ok: false, problem: "The pass mark has to be a whole number." };
  }

  const query = buildQuery(state);
  const parsed = parseAssignment(query);
  if (!parsed.ok) return { ok: false, problem: parsed.error.message };

  const { assignment, locked } = parsed;
  const meter = assignment.meter ?? DEFAULT_METER;
  const length = assignment.count ?? DEFAULT_QUESTIONS;

  let measureCeiling: number | null = null;
  if (assignment.scope === "measure") {
    const pool = assignment.cells ? getCellsByIds(assignment.cells) : getCellsForLevel(assignment.level);
    measureCeiling = uniqueMeasures(pool, getMeter(meter).beatsPerMeasure);
  }

  const notes: string[] = [];
  /* The parser judged this link as written: with the question size left to the
     student it is checked as one beat. A student who then picks full measures
     meets the other ceiling, and the round they get is shorter than the one the
     teacher set — with a pass mark that may no longer be reachable. That is not
     the parser's to refuse (the link is fine as written), so it is said here. */
  if (!locked.includes("scope")) {
    const pool = assignment.cells ? getCellsByIds(assignment.cells) : getCellsForLevel(assignment.level);
    const ifMeasures = uniqueMeasures(pool, getMeter(meter).beatsPerMeasure);
    if (ifMeasures < length) {
      notes.push(
        `Question size is left to the student. If they choose full measures, this vocabulary can make ` +
          `only ${ifMeasures} different ${getMeter(meter).label} measure${ifMeasures === 1 ? "" : "s"}, ` +
          `so their round would be shorter than the ${length} you set. Pin the question size to avoid this.`,
      );
    }
  }
  if (!state.seed) {
    notes.push(
      "No seed: each student gets different questions, so their scores are not comparable. " +
        "Add one to give the whole class the same round.",
    );
  }
  if (state.passing === null) {
    notes.push("No pass mark: the result card will show a score but no goal.");
  }
  if (state.count === null) {
    notes.push(`No question count: the round will be ${DEFAULT_QUESTIONS} questions.`);
  }
  if (locked.length === 0 && !assignment.name) {
    notes.push("Nothing is pinned, so this is just the app's own link. Students choose everything.");
  }
  if (measureCeiling !== null && measureCeiling < length * 2) {
    notes.push(
      `Full measures never repeat, and this vocabulary can make only ${measureCeiling} different ` +
        `${getMeter(meter).label} measure${measureCeiling === 1 ? "" : "s"} — ` +
        `a round of ${length} uses ${length} of them.`,
    );
  }

  const path = query ? `/${query}` : "/";
  return {
    ok: true,
    query,
    link: `${origin.replace(/\/$/, "")}${path}`,
    assignment,
    summary:
      locked.length === 0 && !assignment.name
        ? "Nothing pinned — students choose everything."
        : describeAssignment(assignment),
    notes: Object.freeze(notes),
    measureCeiling,
  };
}

/** The levels, for the form's select, in the app's own words. */
/* "Make this a quiz": the settings that turn practice into a check.
 *
 *   * the subdivision guide hidden — reading without the grid printed is what is
 *     being checked;
 *   * answers held to the end — feedback after each question teaches, which is
 *     the opposite of what a quiz is for;
 *   * one attempt — the app offers no retry button.
 *
 * And, when the teacher has picked exact rhythms and a one-beat round, one
 * question per rhythm: every ticked rhythm is asked exactly once, in an order the
 * seed fixes. That is what a short quiz on a short list means, and it is the one
 * case where the number of questions follows from the choices. The pass mark
 * follows too (four in five, rounded up) unless there is nothing sensible to
 * derive it from. Everything else is left exactly as the teacher set it, and
 * everything stays editable afterwards.
 *
 * What it does NOT do is make the round secure. The app has no accounts and no
 * server: one attempt cannot stop a page reload, and the pass mark is shown on
 * the card, never enforced. The builder says so beside the button.
 *
 * Why only one-beat rounds get "one per rhythm": in a full-measure round each
 * question is a bar of several rhythms, so there is no honest "once each". */
export function applyQuiz(state: BuilderState): BuilderState {
  const next: { -readonly [K in keyof BuilderState]: BuilderState[K] } = {
    ...state,
    guide: "off",
    feedback: "end",
    retry: "off",
  };
  if (state.vocabulary.kind === "cells" && state.scope === "beat") {
    const rhythms = state.vocabulary.cells.length;
    if (rhythms >= 2) {
      const count = Math.min(rhythms, MAX_QUESTIONS);
      next.count = count;
      next.passing = Math.ceil(count * 0.8);
    }
  }
  return Object.freeze(next);
}

export const BUILDER_LEVELS: readonly { readonly id: 1 | 2 | 3; readonly name: string; readonly description: string }[] =
  Object.freeze(
    ([1, 2, 3] as const).map((id) => {
      const level = getLevel(`level-${id}` as LevelId);
      return Object.freeze({ id, name: level.name, description: level.description });
    }),
  );

/** The meters, for the form's select, in bar order. */
export const BUILDER_METERS: readonly { readonly id: MeterId; readonly label: string }[] = Object.freeze(
  METER_IDS.map((id) => Object.freeze({ id, label: getMeter(id).label })),
);

export { MAX_NAME_LENGTH, MAX_QUESTIONS, MIN_QUESTIONS };
