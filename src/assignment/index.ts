/* The assignment link — Count It's Phase 0 wrapper.
 *
 * A teacher pins a round in a URL and posts it; every student who opens it gets
 * the same questions under the same conditions. Implements the Level 0 build
 * ticket, plus the cell-pool selection Sequence 2 needs.
 *
 * The contract shape is deliberately Mallet Map's, param for param where the
 * concepts line up (`cells` is that app's `pool`, `guide` is its `labels`), so
 * the two assignment grammars are one thing a teacher learns once. The rules
 * that matter are the same too:
 *
 *   * An invalid link is REJECTED, never repaired. A clamped range still
 *     teaches the same task, but a cell pool with a cell missing teaches a
 *     DIFFERENT step: "rest-entry cells" without rest-then-& is not rest-entry.
 *     Silently dropping one would hand a teacher evidence for an assignment
 *     they never set.
 *   * The support policy belongs to the LINK, not the learner. The subdivision
 *     guide is Count It's equivalent of bar labels: a gate counts the level's
 *     policy, never the student's own toggle. The same is true of when feedback
 *     arrives: instant feedback teaches and withheld feedback assesses, so `fb`
 *     is the assignment's call rather than the learner's.
 *   * Nothing here is a timer. Difficulty comes from cell vocabulary, scope,
 *     and the guide — never from speed.
 */
import {
  ALL_RHYTHM_CELLS,
  DEFAULT_METER,
  METER_IDS,
  getCellsByIds,
  getCellsForLevel,
  getLevel,
  getMeter,
  getRhythmCell,
  isMeterId,
  COUNTING_PROFILES,
  type CountingProfileId,
  type LevelId,
  type MeterId,
} from "../rhythm";

export type GuidePolicy = "on" | "off";
/** When the correct answer is shown. `each` teaches, `end` assesses. */
export type FeedbackPolicy = "each" | "end";
/** What "try again" means.
 *
 *  `free` is the app's own behaviour and the default: the same round again.
 *  That is right for practice and wrong for a graded round, where it means a
 *  student can loop questions whose answers they have already been shown.
 *  `reseed` is the pedagogically honest retake — same conditions, new
 *  questions — and `off` withdraws the button. */
export type RetryPolicy = "free" | "reseed" | "off";
export type CountingSystemParam = CountingProfileId;
export type AssignmentScope = "beat" | "measure";

/** Bounds. The engine accepts 1–20 questions; the pool needs at least two
 *  cells or every question in the round is the same question. */
export const MIN_POOL = 2;
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 20;
export const MAX_NAME_LENGTH = 60;
/** The round length when a link does not set one. Single-sourced here because
 *  `pass` has to be validated against the length the round will ACTUALLY be —
 *  checking it against MAX_QUESTIONS accepted `?pass=8` for a five-question
 *  round and put an unreachable goal on every student's card. */
export const DEFAULT_QUESTIONS = 5;

/** Distinct measures a pool can assemble. Measure rounds never repeat a
 *  measure, so this is a hard ceiling on the round length — the one bound that
 *  was never written down, and the only one that could fail AFTER the link had
 *  been accepted.
 *
 *  This has now been wrong twice in the same way, and both times the same
 *  failure followed: the link was accepted and the round threw while being
 *  built, which is precisely what this function exists to prevent.
 *
 *    1. It was `size ** 4`. A three-beat bar from two rhythms makes eight
 *       measures, not sixteen, so a sixteen-question 3/4 round was accepted.
 *    2. It was `size ** beatsPerMeasure`. That still assumes every cell fills
 *       exactly one beat. A pool of {half, quarter} makes FIVE bars of 4/4 —
 *       1+1+1+1, three arrangements of 2+1+1, and 2+2 — not sixteen.
 *
 *  So it counts the arrangements rather than estimating them: how many ordered
 *  ways the pool's spans sum to the bar. All-silent bars are subtracted rather
 *  than ignored, because the generator refuses them and a ceiling that counts
 *  bars the generator will not build is the same bug a third time. */
export function uniqueMeasures(
  cells: readonly { readonly beats: number; readonly activePositions: readonly number[] }[],
  beatsPerMeasure = 4,
): number {
  const arrangements = (pool: readonly { readonly beats: number }[]): number => {
    const ways = new Array<number>(beatsPerMeasure + 1).fill(0);
    ways[0] = 1;
    for (let filled = 1; filled <= beatsPerMeasure; filled += 1) {
      for (const cell of pool) {
        if (cell.beats <= filled) ways[filled] += ways[filled - cell.beats];
      }
    }
    return ways[beatsPerMeasure];
  };
  const silent = cells.filter((cell) => cell.activePositions.length === 0);
  return arrangements(cells) - arrangements(silent);
}

/** How long a round can honestly be, given how long it was asked to be.
 *
 *  A one-beat round has no ceiling the controls can reach. A full-measure round
 *  never repeats a measure, so the pool sets one — and the shorter the bar, the
 *  lower it sits: two rhythms make 4 bars of 2/4, against 8 of 3/4 and 16 of
 *  4/4. Level 1 in 2/4 is therefore shorter than the five-question default, and
 *  asking the generator for five threw rather than returning four.
 *
 *  This is for the student's OWN controls, where a shorter round is a shorter
 *  round. It is never the answer for an assignment link: a teacher who asked
 *  for twelve meant twelve, and `parseAssignment` has already refused the link
 *  if the pool cannot fill them, so for a link this returns `wanted` unchanged. */
export function roundLengthFor({
  level,
  scope,
  meter = DEFAULT_METER,
  cells: cellIds,
  wanted,
}: {
  readonly level: LevelId;
  readonly scope: AssignmentScope;
  readonly meter?: MeterId;
  readonly cells?: readonly string[];
  readonly wanted: number;
}): number {
  if (scope !== "measure") return wanted;
  const pool = cellIds ? getCellsByIds(cellIds) : getCellsForLevel(level);
  return Math.max(1, Math.min(wanted, uniqueMeasures(pool, getMeter(meter).beatsPerMeasure)));
}

export interface AssignmentError {
  readonly code:
    | "cell"
    | "too-few-cells"
    | "count"
    | "pass"
    | "level"
    | "scope"
    | "meter"
    | "scope-cells"
    | "meter-cells"
    | "system"
    | "feedback"
    | "retry"
    | "measure-pool"
    /** Raised by the app, not the parser: a round that refused to build for a
     *  reason validation did not anticipate. The link is still rejected whole. */
    | "round";
  readonly entry?: string;
  /** Written for the person who actually hits it — a student on a phone. */
  readonly message: string;
}

export interface Assignment {
  /** Present only when the link named one; display text, never an identity. */
  readonly name: string | null;
  readonly level: LevelId;
  readonly scope: AssignmentScope;
  /** The meter the round is read in. Null when the link did not say, which
   *  means 4/4 — the meter every link written before this existed meant. */
  readonly meter: MeterId | null;
  /** Explicit cell pool, or null when the level's own vocabulary is used. */
  readonly cells: readonly string[] | null;
  readonly guide: GuidePolicy | null;
  /** When the correct answer is shown. Null when the link did not say, which
   *  means the app's default: after every question. */
  readonly feedback: FeedbackPolicy | null;
  /** What a retry does. Null when the link did not say, which means `free`. */
  readonly retry: RetryPolicy | null;
  readonly count: number | null;
  /** Questions needed to pass, as the teacher set it. Never enforced by the
   *  app — it is reported on the card so a human can read the gate. */
  readonly passing: number | null;
  readonly seed: string | null;
  readonly system: CountingSystemParam;
  /** True only when the URL explicitly chose `sys`; links without it remain Standard. */
  readonly systemPinned: boolean;
  /** True when `cells` superseded a `level` the link also carried. */
  readonly levelIgnored: boolean;
}

export type AssignmentResult =
  | { readonly ok: true; readonly assignment: Assignment; readonly locked: readonly string[] }
  | { readonly ok: false; readonly error: AssignmentError };

const CELL_IDS = new Set(ALL_RHYTHM_CELLS.map((cell) => cell.id));
const LEVEL_IDS: readonly LevelId[] = ["level-1", "level-2", "level-3"];

/** An assignment name is display text. Strip anything that could smuggle
 *  markup, collapse whitespace, and truncate — a long name must degrade to a
 *  short one rather than break the card. */
function sanitizeName(raw: string): string | null {
  const cleaned = raw.replace(/[<>\\]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_NAME_LENGTH ? `${cleaned.slice(0, MAX_NAME_LENGTH - 1)}…` : cleaned;
}

function integerParam(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

/** Whether a round with these conditions can be built as the link wrote it.
 *
 *  This is the parser's "a round that cannot be built as written is refused, not
 *  repaired" rule, lifted out so a second caller can ask the same question: the
 *  setup panel asks it of every scope and meter a student could pick on an
 *  assignment, because a link that leaves one open (the ten published Counting
 *  Rhythms links leave the meter open) is otherwise a link whose round the
 *  student can quietly change into a different one.
 *
 *  Null means the round can be built. Otherwise the same error, with the same
 *  code and the same words, that opening a link with those conditions gives.
 *
 *  Three rules, in this order:
 *    * a rhythm that lasts longer than a beat cannot be a one-beat question;
 *    * a rhythm longer than the bar can never be asked, so the round would
 *      silently teach a different step;
 *    * a full-measure round never repeats a measure, so the pool sets a ceiling
 *      on its length that a link author cannot see. */
export function roundProblem({
  scope,
  meter,
  cells,
  level,
  count,
}: {
  readonly scope: AssignmentScope;
  readonly meter: MeterId | null;
  readonly cells: readonly string[] | null;
  readonly level: LevelId;
  readonly count: number | null;
}): AssignmentError | null {
  const activeMeter = getMeter(meter ?? DEFAULT_METER);

  /* A rhythm that lasts longer than a beat cannot be a one-beat question.
     The generator drops such cells in beat scope, which is right for the app's
     own controls — the student chose the scope and the vocabulary follows. It
     is wrong for a LINK: a teacher who wrote `cells=half,quarter&scope=beat`
     meant something the round cannot deliver, and silently handing the class a
     quarter-note-only round is the "pool with a cell missing teaches a
     different step" failure this file exists to refuse. */
  if (scope === "beat" && cells) {
    const spanning = cells.map((id) => getRhythmCell(id)).filter((cell) => cell.beats > 1);
    if (spanning.length > 0) {
      return {
        code: "scope-cells",
        entry: spanning[0].id,
        message:
          `${spanning.length === 1 ? "The rhythm" : "The rhythms"} ` +
          `${spanning.map((cell) => `\u201c${cell.id}\u201d`).join(", ")} ` +
          `${spanning.length === 1 ? "lasts" : "last"} longer than one beat, so ` +
          "this practice link cannot ask for one-beat questions. Ask for full measures, " +
          "or drop those rhythms.",
      };
    }
  }

  if (scope === "measure") {
    const pool = cells ? cells.map((id) => getRhythmCell(id)) : getCellsForLevel(level);
    /* A rhythm the bar cannot hold would be named by the link and never asked:
       the generator discards any draw that overshoots the bar line, so
       `cells=whole,quarter,eighths` in 3/4 builds a round of quarters and
       eighths and the link says it taught the whole note. That is the same
       "pool with a cell missing" failure the rest of this file refuses, and the
       shorter the bar the likelier it is, so it is refused at the link. */
    const tooLong = pool.filter((cell) => cell.beats > activeMeter.beatsPerMeasure);
    if (tooLong.length > 0) {
      return {
        code: "meter-cells",
        entry: tooLong[0].id,
        message:
          `${tooLong.length === 1 ? "The rhythm" : "The rhythms"} ` +
          `${tooLong.map((cell) => `\u201c${cell.id}\u201d`).join(", ")} ` +
          `${tooLong.length === 1 ? "lasts" : "last"} longer than a ${activeMeter.label} ` +
          "measure holds, so this practice link could never ask for " +
          `${tooLong.length === 1 ? "it" : "them"}. Choose a longer meter, or drop ` +
          `${tooLong.length === 1 ? "that rhythm" : "those rhythms"}.`,
      };
    }
    /* A measure round assembles whole bars and never repeats one, so the pool
       sets a ceiling the link author cannot see: two rhythms make sixteen bars
       of 4/4, and asking for twenty used to be ACCEPTED here and then throw
       while the round was being built — after the banner, the level, the scope
       and the pass mark had already applied. */
    const available = uniqueMeasures(pool, activeMeter.beatsPerMeasure);
    const wanted = count ?? DEFAULT_QUESTIONS;
    if (available < wanted) {
      return {
        code: "measure-pool",
        message:
          `This practice link asks for ${wanted} full-measure questions, but ${pool.length} ` +
          `rhythms can only make ${available} different ${activeMeter.label} measures. Ask for ` +
          "fewer questions, or add rhythms to the link.",
      };
    }
  }

  return null;
}

/** The levels, scopes and meters a student can switch to on an assignment
 *  WITHOUT changing what it asks, and why each of the others cannot be chosen.
 *
 *  `current` is where the STUDENT is now, not where the link started. A link
 *  that leaves the level open lets them move it, and every other judgement here
 *  is made against the pool they are actually in: judging against the link's own
 *  level would say 2/4 was fine after the student had switched to a level whose
 *  two rhythms make only four bars of it.
 *
 *  Each dimension is judged with the others held at their current values, so
 *  from any valid state an allowed change lands on another valid state — there is
 *  no sequence of allowed clicks that reaches a round the link could not have
 *  described. A dimension the link pinned is never offered as a choice, so it is
 *  not judged here. When the link names its rhythms the level does not matter,
 *  and no level is ruled out.
 *
 *  The value is the reason in the parser's own words, for a tooltip or a note;
 *  absence means the choice is fine. */
export function unavailableChoices(
  assignment: Assignment,
  current: { readonly scope: AssignmentScope; readonly meter: MeterId; readonly level: LevelId },
): {
  readonly scopes: Readonly<Partial<Record<AssignmentScope, string>>>;
  readonly meters: Readonly<Partial<Record<MeterId, string>>>;
  readonly levels: Readonly<Partial<Record<LevelId, string>>>;
} {
  const base = { cells: assignment.cells, count: assignment.count };
  const scopes: Partial<Record<AssignmentScope, string>> = {};
  const meters: Partial<Record<MeterId, string>> = {};
  const levels: Partial<Record<LevelId, string>> = {};
  for (const scope of ["beat", "measure"] as const) {
    if (scope === current.scope) continue;
    const problem = roundProblem({ ...base, level: current.level, scope, meter: current.meter });
    if (problem) scopes[scope] = problem.message;
  }
  for (const meter of METER_IDS) {
    if (meter === current.meter) continue;
    const problem = roundProblem({ ...base, level: current.level, scope: current.scope, meter });
    if (problem) meters[meter] = problem.message;
  }
  for (const level of LEVEL_IDS) {
    if (level === current.level) continue;
    const problem = roundProblem({ ...base, level, scope: current.scope, meter: current.meter });
    if (problem) levels[level] = problem.message;
  }
  return Object.freeze({
    scopes: Object.freeze(scopes),
    meters: Object.freeze(meters),
    levels: Object.freeze(levels),
  });
}

/**
 * Parse and validate an assignment link.
 *
 * Returns the pinned round plus the list of controls the link locks, or a
 * single error naming what is wrong. A link with no assignment params at all
 * is not an error — it is an ordinary visit, and `locked` comes back empty.
 */
export function parseAssignment(search: string): AssignmentResult {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const systemRaw = params.get("sys");
  const locked: string[] = [];
  if (systemRaw !== null) locked.push("sys");

  const systemAliases: Readonly<Record<string, CountingProfileId>> = {
    standard: "standard",
    eastman: "eastman-ti-te-ta",
    "eastman-ti-te-ta": "eastman-ti-te-ta",
    "eastman-ta-te-ta": "eastman-ta-te-ta",
  };
  const system = systemRaw === null
    ? "standard"
    : Object.prototype.hasOwnProperty.call(systemAliases, systemRaw)
      ? systemAliases[systemRaw]
      : undefined;
  if (systemRaw !== null && !system) {
    return {
      ok: false,
      error: {
        code: "system",
        entry: systemRaw,
        message:
          `This practice link asks for “${systemRaw}” counting. Choose Standard, ` +
          "Eastman (ti-te-ta), or Eastman variant (ta-te-ta) in a supported link.",
      },
    };
  }

  let level: LevelId = "level-2";
  const levelRaw = params.get("level");
  if (levelRaw !== null) {
    const candidate = /^[123]$/.test(levelRaw) ? (`level-${levelRaw}` as LevelId) : null;
    const direct = LEVEL_IDS.includes(levelRaw as LevelId) ? (levelRaw as LevelId) : null;
    const resolved = candidate ?? direct;
    if (!resolved) {
      return {
        ok: false,
        error: {
          code: "level",
          entry: levelRaw,
          message: `“${levelRaw}” is not a Count It level. Levels are 1, 2 and 3.`,
        },
      };
    }
    level = resolved;
    locked.push("level");
  }

  let scope: AssignmentScope = "beat";
  const scopeRaw = params.get("scope");
  if (scopeRaw !== null) {
    if (scopeRaw !== "beat" && scopeRaw !== "measure") {
      return {
        ok: false,
        error: {
          code: "scope",
          entry: scopeRaw,
          message: `“${scopeRaw}” is not a question size. Choose one beat or one measure.`,
        },
      };
    }
    scope = scopeRaw;
    locked.push("scope");
  }

  /* The meter. Absent means 4/4, which is what every link written before this
     parameter existed meant — so an old link is not merely still accepted, it
     still generates the identical round. */
  let meter: MeterId | null = null;
  const meterRaw = params.get("meter");
  if (meterRaw !== null) {
    if (!isMeterId(meterRaw)) {
      return {
        ok: false,
        error: {
          code: "meter",
          entry: meterRaw,
          message:
            `“${meterRaw}” is not a meter Count It reads. This app counts ` +
            `${METER_IDS.map((id) => id.replace("-", "/")).join(", ")}.`,
        },
      };
    }
    meter = meterRaw;
    locked.push("meter");
  }

  // The cell pool. Levels are CUMULATIVE — level 2 contains level 1 — so a step
  // that teaches only the rest-entry cells cannot be expressed as a level at
  // all. This is that expression, and it is why an unknown id is fatal rather
  // than skipped.
  let cells: readonly string[] | null = null;
  const cellsRaw = params.get("cells");
  if (cellsRaw !== null) {
    const seen = new Set<string>();
    const collected: string[] = [];
    for (const token of cellsRaw.split(",")) {
      const id = token.trim();
      if (!id) continue;
      if (!CELL_IDS.has(id)) {
        return {
          ok: false,
          error: {
            code: "cell",
            entry: id,
            message:
              `“${id}” in this practice link is not a rhythm Count It knows. ` +
              "The link needs to be fixed before it can be used.",
          },
        };
      }
      if (seen.has(id)) continue; // an exact duplicate collapses silently
      seen.add(id);
      collected.push(id);
    }
    if (collected.length < MIN_POOL) {
      return {
        ok: false,
        error: {
          code: "too-few-cells",
          message:
            `This practice link needs at least ${MIN_POOL} different rhythms, but it has ` +
            `${collected.length === 1 ? "only one" : "none"}.`,
        },
      };
    }
    // Canonical order is the CATALOG's, not the link author's, so two links
    // naming the same rhythms in different orders are one round and serialize
    // identically. The generator normalizes the same way; if these two
    // disagreed, a round-tripped link would quietly become a different round.
    cells = Object.freeze(
      ALL_RHYTHM_CELLS.filter((cell) => seen.has(cell.id)).map((cell) => cell.id),
    );
    locked.push("cells");
  }

  let guide: GuidePolicy | null = null;
  const guideRaw = params.get("guide");
  if (guideRaw === "on" || guideRaw === "off") {
    guide = guideRaw;
    locked.push("guide");
  }

  /* When the correct answer appears. Refused rather than defaulted when the
     value is unrecognized: a link that meant to withhold feedback and silently
     got the teaching default would produce a graded round with the answer key
     shown, which is the failure this parameter exists to prevent. */
  let feedback: FeedbackPolicy | null = null;
  const feedbackRaw = params.get("fb");
  if (feedbackRaw !== null) {
    if (feedbackRaw !== "each" && feedbackRaw !== "end") {
      return {
        ok: false,
        error: {
          code: "feedback",
          entry: feedbackRaw,
          message:
            `“${feedbackRaw}” is not a feedback setting. A round can show the answer after ` +
            "each question, or hold it to the end.",
        },
      };
    }
    feedback = feedbackRaw;
    locked.push("fb");
  }

  /* What a retry means. Refused rather than defaulted for the same reason `fb`
     is: a link that meant to withdraw the retry and silently got the default
     would let a student loop a round whose answers they had already seen,
     which is the thing the parameter exists to stop. */
  let retry: RetryPolicy | null = null;
  const retryRaw = params.get("retry");
  if (retryRaw !== null) {
    if (retryRaw !== "free" && retryRaw !== "reseed" && retryRaw !== "off") {
      return {
        ok: false,
        error: {
          code: "retry",
          entry: retryRaw,
          message:
            `“${retryRaw}” is not a retry setting. A round can be tried again as it was, ` +
            "tried again on new questions, or not tried again at all.",
        },
      };
    }
    retry = retryRaw;
    locked.push("retry");
  }

  let count: number | null = null;
  const countRaw = params.get("n");
  if (countRaw !== null) {
    const parsed = integerParam(countRaw);
    if (parsed === null || parsed < MIN_QUESTIONS || parsed > MAX_QUESTIONS) {
      return {
        ok: false,
        error: {
          code: "count",
          entry: countRaw,
          message:
            `This practice link asks for ${countRaw} questions. One round can run ` +
            `${MIN_QUESTIONS}–${MAX_QUESTIONS}.`,
        },
      };
    }
    count = parsed;
    locked.push("n");
  }

  /* Whether the round can be built as written. The rules live in roundProblem,
     which the setup panel asks too, so what a student is allowed to choose and
     what a link is allowed to say can never disagree. */
  const roundError = roundProblem({ scope, meter, cells, level, count });
  if (roundError) return { ok: false, error: roundError };

  let passing: number | null = null;
  const passRaw = params.get("pass");
  if (passRaw !== null) {
    const parsed = integerParam(passRaw);
    /* Against the length the round will ACTUALLY be. A link with no `n` runs
       five questions, so `pass=8` is unreachable — it used to be measured
       against MAX_QUESTIONS and accepted, and every student failed a goal
       nobody could clear. */
    const ceiling = count ?? DEFAULT_QUESTIONS;
    if (parsed === null || parsed < 1 || parsed > ceiling) {
      return {
        ok: false,
        error: {
          code: "pass",
          entry: passRaw,
          message:
            `This practice link needs ${passRaw} correct to pass, which is not possible in ` +
            `a round of ${ceiling}.`,
        },
      };
    }
    passing = parsed;
  }

  const seedRaw = params.get("seed");
  const seed = seedRaw !== null && /^[\w-]{1,32}$/.test(seedRaw) ? seedRaw : null;
  if (seed) locked.push("seed");

  const nameRaw = params.get("a");
  const name = nameRaw !== null ? sanitizeName(nameRaw) : null;

  return {
    ok: true,
    assignment: Object.freeze({
      name,
      level,
      scope,
      meter,
      cells,
      guide,
      feedback,
      retry,
      count,
      passing,
      seed,
      system: system as CountingProfileId,
      systemPinned: systemRaw !== null,
      levelIgnored: cells !== null && levelRaw !== null,
    }),
    locked: Object.freeze(locked),
  };
}

/* The seed a `reseed` retake runs on.
 *
 * Derived from the link's own seed and the attempt number rather than picked
 * at random, so a teacher holding the link can regenerate exactly what attempt
 * three asked — a retake nobody can reconstruct is not evidence, it is a
 * number. Always derived from the ORIGINAL seed, never from the previous
 * attempt's derived one, so attempts do not chain into `seed#a2#a3` and a
 * teacher can jump straight to any attempt.
 *
 * Attempt one is the link's seed untouched, so a `retry=reseed` round opens
 * with exactly the questions the same link without the parameter would ask. */
export function retakeSeed(seed: string | number, attempt: number): string | number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError("An attempt number counts from 1.");
  }
  return attempt === 1 ? seed : `${seed}#a${attempt}`;
}

/** True when the link pinned anything at all — the app is in assignment mode. */
export function isAssigned(result: AssignmentResult): boolean {
  return result.ok && (result.locked.length > 0 || result.assignment.name !== null);
}

/** Canonical serialization, so a link round-trips losslessly.
 *
 *  This is also the key a browser's attempt tally is stored under, so anything
 *  the link pins that changes the round has to be in it. The meter was not, for
 *  as long as 3/4 existed: a 3/4 assignment and its 4/4 twin counted attempts
 *  together. A link that names no meter still serializes exactly as it always
 *  did, so no existing tally is orphaned. */
export function serializeAssignment(assignment: Assignment): string {
  const parts: string[] = [];
  if (assignment.name) parts.push(`a=${encodeURIComponent(assignment.name)}`);
  if (!assignment.cells) parts.push(`level=${assignment.level.slice(-1)}`);
  parts.push(`scope=${assignment.scope}`);
  if (assignment.meter) parts.push(`meter=${assignment.meter}`);
  if (assignment.cells) parts.push(`cells=${assignment.cells.join(",")}`);
  if (assignment.guide) parts.push(`guide=${assignment.guide}`);
  if (assignment.feedback) parts.push(`fb=${assignment.feedback}`);
  if (assignment.retry) parts.push(`retry=${assignment.retry}`);
  if (assignment.count !== null) parts.push(`n=${assignment.count}`);
  if (assignment.passing !== null) parts.push(`pass=${assignment.passing}`);
  if (assignment.seed) parts.push(`seed=${encodeURIComponent(assignment.seed)}`);
  if (assignment.systemPinned) parts.push(`sys=${assignment.system}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** A one-line description of the conditions, for the result card and the
 *  locked-setup banner. The CONDITIONS are the informative record — a score
 *  without them says nothing about what was practised. */
export function describeAssignment(assignment: Assignment): string {
  const parts: string[] = [];
  parts.push(assignment.cells
    ? `${assignment.cells.length} rhythms`
    : getLevel(assignment.level).shortName);
  parts.push(assignment.scope === "beat" ? "one beat" : "one measure");
  if (assignment.systemPinned) {
    parts.push(`${COUNTING_PROFILES[assignment.system].name} counting`);
  }
  /* Only when it is not 4/4, the same rule as the settings below: a card for a
     seven-beat bar that does not say so describes a different round than the
     one answered, and 4/4 cards stay exactly as they always were. */
  if (assignment.meter && assignment.meter !== DEFAULT_METER) {
    parts.push(getMeter(assignment.meter).label);
  }
  if (assignment.guide) parts.push(assignment.guide === "on" ? "guide visible" : "guide hidden");
  if (assignment.feedback === "end") parts.push("answers at the end");
  /* Only when it deviates from what the app does anyway, the same rule `fb`
     follows — a conditions line that restates every default stops being read. */
  if (assignment.retry === "reseed") parts.push("retry on new questions");
  if (assignment.retry === "off") parts.push("one attempt");
  if (assignment.count !== null) parts.push(`${assignment.count} questions`);
  if (assignment.passing !== null) parts.push(`pass at ${assignment.passing}`);
  return parts.join(" · ");
}

/* ---------------------------------------------------------------------------
   Verification code.

   A deterrent, not proof. It is a short non-cryptographic hash over the facts
   a card claims, so two cards claiming different scores cannot carry the same
   code and a code cannot be transplanted onto a different result. Anyone
   determined can still forge one — signed verification is Phase 2, and the
   card says as much rather than implying more than it can back up. */
function fnv1a(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface VerificationInput {
  readonly assignment: string;
  readonly studentId: string;
  readonly correct: number;
  readonly total: number;
  readonly finishedAt: Date;
  /** Which run of this round produced the score, counting from 1. A replay is
   *  a different fact about a student than a first attempt, and a code that
   *  cannot tell them apart attests to less than it appears to. */
  readonly attempt?: number;
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

/** `BRS-CI-{yyMMdd}-{percent}-{4 chars}` — the format from the 11a spec. */
export function verificationCode({
  assignment,
  studentId,
  correct,
  total,
  finishedAt,
  attempt = 1,
}: VerificationInput): string {
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const stamp =
    twoDigit(finishedAt.getFullYear() % 100) +
    twoDigit(finishedAt.getMonth() + 1) +
    twoDigit(finishedAt.getDate());
  const digest = fnv1a(
    `count-it|${assignment}|${studentId}|${correct}/${total}|#${attempt}|${finishedAt.toISOString()}`,
  )
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
    .slice(-4);
  return `BRS-CI-${stamp}-${percent}-${digest}`;
}
