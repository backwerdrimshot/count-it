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
 *     policy, never the student's own toggle.
 *   * Nothing here is a timer. Difficulty comes from cell vocabulary, scope,
 *     and the guide — never from speed.
 */
import { RHYTHM_CELLS, getLevel, type LevelId } from "../rhythm";

export type GuidePolicy = "on" | "off";
export type CountingSystemParam = "standard";
export type AssignmentScope = "beat" | "measure";

/** Bounds. The engine accepts 1–20 questions; the pool needs at least two
 *  cells or every question in the round is the same question. */
export const MIN_POOL = 2;
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 20;
export const MAX_NAME_LENGTH = 60;

export interface AssignmentError {
  readonly code:
    | "cell"
    | "too-few-cells"
    | "count"
    | "pass"
    | "level"
    | "scope"
    | "system";
  readonly entry?: string;
  /** Written for the person who actually hits it — a student on a phone. */
  readonly message: string;
}

export interface Assignment {
  /** Present only when the link named one; display text, never an identity. */
  readonly name: string | null;
  readonly level: LevelId;
  readonly scope: AssignmentScope;
  /** Explicit cell pool, or null when the level's own vocabulary is used. */
  readonly cells: readonly string[] | null;
  readonly guide: GuidePolicy | null;
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

const CELL_IDS = new Set(RHYTHM_CELLS.map((cell) => cell.id));
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
      RHYTHM_CELLS.filter((cell) => seen.has(cell.id)).map((cell) => cell.id),
    );
    locked.push("cells");
  }

  let guide: GuidePolicy | null = null;
  const guideRaw = params.get("guide");
  if (guideRaw === "on" || guideRaw === "off") {
    guide = guideRaw;
    locked.push("guide");
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

  let passing: number | null = null;
  const passRaw = params.get("pass");
  if (passRaw !== null) {
    const parsed = integerParam(passRaw);
    const ceiling = count ?? MAX_QUESTIONS;
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
      cells,
      guide,
      count,
      passing,
      seed,
      system: "standard" as const,
      levelIgnored: cells !== null && levelRaw !== null,
    }),
    locked: Object.freeze(locked),
  };
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
}: VerificationInput): string {
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const stamp =
    twoDigit(finishedAt.getFullYear() % 100) +
    twoDigit(finishedAt.getMonth() + 1) +
    twoDigit(finishedAt.getDate());
  const digest = fnv1a(
    `count-it|${assignment}|${studentId}|${correct}/${total}|${finishedAt.toISOString()}`,
  )
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
    .slice(-4);
  return `BRS-CI-${stamp}-${percent}-${digest}`;
}
