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
  getCellsForLevel,
  getLevel,
  getMeter,
  getRhythmCell,
  isMeterId,
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
export type CountingSystemParam = "standard";
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

export interface AssignmentError {
  readonly code:
    | "cell"
    | "too-few-cells"
    | "count"
    | "pass"
    | "level"
    | "scope"
    | "meter"
    | "meter-cells"
    | "meter-scope"
    | "scope-cells"
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

/**
 * Parse and validate an assignment link.
 *
 * Returns the pinned round plus the list of controls the link locks, or a
 * single error naming what is wrong. A link with no assignment params at all
 * is not an error — it is an ordinary visit, and `locked` comes back empty.
 */
export function parseAssignment(search: string): AssignmentResult {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const locked: string[] = [];

  const system = params.get("sys");
  if (system !== null && system !== "standard") {
    return {
      ok: false,
      error: {
        code: "system",
        entry: system,
        message:
          `This practice link asks for “${system}” counting. Count It teaches Standard ` +
          "American counting (1 e & a) today, so the link cannot be used as written.",
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

  /* A measure round assembles four cells and never repeats a measure, so the
     pool sets a ceiling the link author cannot see: two rhythms make sixteen
     measures, and asking for twenty used to be ACCEPTED here and then throw
     while the round was being built — after the banner, the level, the scope
     and the pass mark had already applied. The student answered the default
     round under the assignment's stated conditions. Rejecting the link is the
     same rule as every other check in this file: a round that cannot be built
     as written is not repaired into a different one. */
  /* A rhythm belongs to a beat family, and the meter says which family the bar
     is made of. An eighth-beat rhythm in a 3/4 link is not a harder round, it
     is a bar that does not add up — so it is refused at the link with the ids
     named, on the same rule as every other check here: a round that cannot be
     built as written is not repaired into a different one. */
  const activeMeter = getMeter(meter ?? DEFAULT_METER);

  /* A meter that asks whole bars only refuses a one-beat link.
   *
   * In 3/8 the beat IS an eighth, so a one-beat question is a third of a
   * measure and no honest way to draw it exists: closing the barline claims a
   * complete bar the arithmetic denies, and leaving it open draws a 3/8
   * signature trailing into empty space. The meter beams across its whole bar
   * because the bar is the unit; asking a third of it worked against that.
   *
   * Refused at the link rather than quietly promoted to a measure, on the same
   * rule as every other check here: a round that cannot be built as written is
   * not repaired into a different one. */
  if (scope === "beat" && !activeMeter.allowsBeatScope) {
    return {
      ok: false,
      error: {
        code: "meter-scope",
        entry: activeMeter.id,
        message:
          `${activeMeter.label} counts ${activeMeter.beatUnit === "8" ? "an eighth" : "a quarter"}-note beat, ` +
          `so a one-beat question would show a third of a bar. This practice link needs to ask ` +
          "one measure. The link needs to be fixed before it can be used.",
      },
    };
  }

  if (cells) {
    const wrongFamily = cells.filter(
      (id) => getRhythmCell(id).beatUnit !== activeMeter.beatUnit,
    );
    if (wrongFamily.length > 0) {
      return {
        ok: false,
        error: {
          code: "meter-cells",
          entry: wrongFamily[0],
          message:
            `${wrongFamily.length === 1 ? "The rhythm" : "The rhythms"} ` +
            `${wrongFamily.map((id) => `“${id}”`).join(", ")} in this practice link ` +
            `${wrongFamily.length === 1 ? "counts" : "count"} a ` +
            `${activeMeter.beatUnit === "4" ? "eighth" : "quarter"}-note beat, and ` +
            `${activeMeter.label} counts ${activeMeter.beatUnit === "4" ? "quarter" : "eighth"}-note ` +
            "beats. The link needs to be fixed before it can be used.",
        },
      };
    }
  }

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
        ok: false,
        error: {
          code: "scope-cells",
          entry: spanning[0].id,
          message:
            `${spanning.length === 1 ? "The rhythm" : "The rhythms"} ` +
            `${spanning.map((cell) => `\u201c${cell.id}\u201d`).join(", ")} ` +
            `${spanning.length === 1 ? "lasts" : "last"} longer than one beat, so ` +
            "this practice link cannot ask for one-beat questions. Ask for full measures, " +
            "or drop those rhythms.",
        },
      };
    }
  }

  if (scope === "measure") {
    const pool = cells
      ? cells.map((id) => getRhythmCell(id))
      : getCellsForLevel(level, activeMeter.beatUnit);
    const available = uniqueMeasures(pool, activeMeter.beatsPerMeasure);
    const wanted = count ?? DEFAULT_QUESTIONS;
    if (available < wanted) {
      return {
        ok: false,
        error: {
          code: "measure-pool",
          message:
            `This practice link asks for ${wanted} full-measure questions, but ${pool.length} ` +
            `rhythms can only make ${available} different ${activeMeter.label} measures. Ask for ` +
            "fewer questions, or add rhythms to the link.",
        },
      };
    }
  }

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
      system: "standard" as const,
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

/** Canonical serialization, so a link round-trips losslessly. */
export function serializeAssignment(assignment: Assignment): string {
  const parts: string[] = [];
  if (assignment.name) parts.push(`a=${encodeURIComponent(assignment.name)}`);
  if (!assignment.cells) parts.push(`level=${assignment.level.slice(-1)}`);
  parts.push(`scope=${assignment.scope}`);
  if (assignment.cells) parts.push(`cells=${assignment.cells.join(",")}`);
  if (assignment.guide) parts.push(`guide=${assignment.guide}`);
  if (assignment.feedback) parts.push(`fb=${assignment.feedback}`);
  if (assignment.retry) parts.push(`retry=${assignment.retry}`);
  if (assignment.count !== null) parts.push(`n=${assignment.count}`);
  if (assignment.passing !== null) parts.push(`pass=${assignment.passing}`);
  if (assignment.seed) parts.push(`seed=${encodeURIComponent(assignment.seed)}`);
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
