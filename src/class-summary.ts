/* The class summary: a teacher pastes the summaries students turned in and gets
 * one table, a plain CSV and a Canvas gradebook CSV.
 *
 * Nothing leaves the teacher's browser, and nothing here knows a student any
 * better than the summary does: the "student" is whatever name or class ID the
 * student typed, or nothing.
 *
 * The code check is the app's own `verificationCode`, run again on the facts the
 * summary states. It is exactly as strong as the code on the card — a deterrent,
 * not proof — and never weaker: a summary passes only when every fact the code
 * covers recomputes to the same digest. The one thing the teacher's browser
 * cannot know is the student's time zone, which only decides the calendar date
 * printed in the code (the digest covers the exact UTC instant), so the date is
 * accepted when it is the finishing instant's date in some real time zone.
 *
 * Count It and Eight Time keep this file in step; only the constants below
 * differ, because each app checks its own codes. */
import { verificationCode } from "./assignment";

const APP = { name: "Count It", header: "Count It — Choose the Count", prefix: "BRS-CI-" } as const;
const SIBLING = { name: "Eight Time", header: "Eight Time — Choose the Count", prefix: "BRS-ET-" } as const;

/** The summary line that carries the exact finishing instant, so a pasted
 *  summary can be checked. Older summaries do not have it. */
export const STAMP_LABEL = "Stamp";
export function stampLine(finishedAt: Date): string {
  return `${STAMP_LABEL}: ${finishedAt.toISOString()}`;
}

export type CodeStatus =
  /** Every fact recomputes to the code printed. */
  | "valid"
  /** The facts and the code disagree: something was changed after copying. */
  | "invalid"
  /** The score cannot be right: more correct answers than questions, or no questions. */
  | "impossible"
  /** No Stamp line (made before this check existed), so it cannot be checked. */
  | "unchecked"
  /** The other app's summary; check it on that app's page. */
  | "other-app"
  /** No code line at all. */
  | "missing";

export interface ParsedSummary {
  readonly app: string;
  readonly assignment: string | null;
  readonly studentId: string;
  readonly correct: number | null;
  readonly total: number | null;
  readonly percent: number | null;
  readonly attempt: number;
  readonly metGoal: boolean | null;
  /** The ticket's own words, e.g. `4:12 (limit 5:00, within limit)`. */
  readonly time: string | null;
  /** Hints asked for, when the assignment turned hints on; null otherwise. */
  readonly hintsUsed: number | null;
  readonly finished: string | null;
  /** The exact finishing instant from the Stamp line, when it is well formed. */
  readonly stamp: Date | null;
  readonly code: string | null;
  /** The round's identity (`R` and six characters), when the summary names one.
   *  Older summaries have none and can only be matched by assignment name. */
  readonly round: string | null;
  /** The class code the student entered, when the link asked for one. */
  readonly classCode: string | null;
  /** True when the round had to repeat some of its questions. */
  readonly repeats: boolean;
  readonly status: CodeStatus;
}

const FIELD = /^\s*([A-Za-z][A-Za-z ]*?):[ \t]?(.*)$/;
const HEADERS: readonly string[] = [APP.header, SIBLING.header];

/** Splits pasted text into one block per summary. A summary starts at its app
 *  heading; text that has no heading is split after each `Code:` line instead,
 *  so summaries whose first line got lost still come through. */
export function splitSummaries(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  let sawCode = false;
  const flush = () => {
    if (current.some((line) => FIELD.test(line))) blocks.push(current);
    current = [];
    sawCode = false;
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/^\s+/, "");
    const isHeader = HEADERS.includes(line.trim());
    const match = FIELD.exec(line);
    if (isHeader || (sawCode && match && match[1] !== "Code")) flush();
    current.push(line);
    if (match?.[1] === "Code") sawCode = true;
  }
  flush();
  return blocks;
}

function clockSeconds(text: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(text);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

/** The calendar dates (yyMMdd) an instant falls on somewhere on Earth. */
function possibleDates(instant: Date): Set<string> {
  const dates = new Set<string>();
  for (let offset = -12; offset <= 14; offset += 1) {
    const shifted = new Date(instant.getTime() + offset * 3_600_000);
    dates.add(
      twoDigit(shifted.getUTCFullYear() % 100) + twoDigit(shifted.getUTCMonth() + 1) + twoDigit(shifted.getUTCDate()),
    );
  }
  return dates;
}

export function parseSummary(lines: readonly string[]): ParsedSummary {
  const fields = new Map<string, string>();
  let header: string | null = null;
  let practice = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (HEADERS.includes(trimmed)) { header = trimmed; continue; }
    if (trimmed === "Practice session") { practice = true; continue; }
    const match = FIELD.exec(line);
    if (match && !fields.has(match[1])) fields.set(match[1], match[2]);
  }
  const code = fields.get("Code")?.trim() || null;
  const app = header === SIBLING.header || code?.startsWith(SIBLING.prefix) ? SIBLING.name : APP.name;
  const score = /^(\d+)\/(\d+)(?:\s*\((\d+)%\))?/.exec(fields.get("Score")?.trim() ?? "");
  const correct = score ? Number(score[1]) : null;
  const total = score ? Number(score[2]) : null;
  /* Always from the numbers the code covers, never from the "(92%)" text beside
     them: that text is not in the code, so a copy that edited only it would
     otherwise still say "Checksum matches" and export the edited percent. */
  const percent = correct !== null && total ? Math.round((correct / total) * 100) : correct !== null ? 0 : null;
  const attemptRaw = fields.get("Attempt")?.trim();
  const attempt = attemptRaw && /^\d+$/.test(attemptRaw) ? Number(attemptRaw) : 1;
  const result = fields.get("Result")?.trim() ?? null;
  const metGoal = result === "met the goal" ? true : result === "not yet at the goal" ? false : null;
  const time = fields.get("Time")?.trim() || null;
  const hintsRaw = fields.get("Hints used")?.trim();
  const hintsUsed = hintsRaw !== undefined && /^\d+$/.test(hintsRaw) ? Number(hintsRaw) : null;
  const assignment = practice ? null : (fields.get("Assignment") ?? null);
  /* Exactly what the student typed, spaces included: the code was made from it. */
  const studentId = fields.get("Student") ?? "";

  const stampText = fields.get(STAMP_LABEL)?.trim();
  const stampDate = stampText ? new Date(stampText) : null;
  const stamp = stampDate && !Number.isNaN(stampDate.getTime()) && stampText === stampDate.toISOString() ? stampDate : null;
  const round = fields.get("Round")?.trim() || null;
  const classCode = fields.get("Class")?.trim() || null;
  const repeats = fields.get("Repeats")?.trim() === "yes";

  const base = {
    app, assignment, studentId, correct, total, percent, attempt, metGoal, time, hintsUsed,
    finished: fields.get("Finished")?.trim() || null, stamp, code, round, classCode, repeats,
  };
  /* Checked before any code or stamp: a score that cannot be right stays out of
     every export, whether or not it carries a code that could be checked. */
  if (correct !== null && total !== null && (total === 0 || correct > total)) return { ...base, status: "impossible" };
  if (!code) return { ...base, status: "missing" };
  if (app !== APP.name) return { ...base, status: "other-app" };
  if (!stamp) return { ...base, status: "unchecked" };
  const finishedAt = stamp;
  if (correct === null || total === null) return { ...base, status: "invalid" };
  /* Its own status, not "invalid": the code may well match, because anyone can make
     a code for any numbers. The score itself is what is wrong. */
  if (attemptRaw !== undefined && !/^\d+$/.test(attemptRaw)) return { ...base, status: "invalid" };
  if (hintsRaw !== undefined && hintsUsed === null) return { ...base, status: "invalid" };

  let timing: { elapsedSeconds: number; limitMinutes: number } | undefined;
  if (time) {
    const parts = /^(\d+:\d\d) \(limit (\d+):00,/.exec(time);
    const elapsed = parts ? clockSeconds(parts[1]) : null;
    if (!parts || elapsed === null) return { ...base, status: "invalid" };
    timing = { elapsedSeconds: elapsed, limitMinutes: Number(parts[2]) };
  }
  const expected = verificationCode({
    assignment: assignment ?? "",
    studentId,
    correct,
    total,
    finishedAt,
    attempt,
    ...(timing ? { timing } : {}),
    /* A "Hints used" line is written exactly when the link turned hints on,
       and the code covers the count then, so it is checked the same way. */
    ...(hintsUsed !== null ? { hintsUsed } : {}),
    /* Each new fact is covered only when its line is present, so every summary
       made before this existed still checks exactly as it did. */
    ...(round !== null ? { round } : {}),
    ...(classCode !== null ? { classCode } : {}),
    ...(repeats ? { repeats } : {}),
  });
  /* `BRS-XX-yyMMdd-percent-digest`. Everything but the date must match
     exactly; the date may be the student's local date instead of ours. */
  const want = expected.split("-");
  const got = code.split("-");
  const valid =
    got.length === want.length &&
    got.every((part, index) => index === 2 ? possibleDates(finishedAt).has(part) : part === want[index]);
  return { ...base, status: valid ? "valid" : "invalid" };
}

export function parseSummaries(text: string): ParsedSummary[] {
  return splitSummaries(text).map(parseSummary);
}

export const STATUS_TEXT: Record<CodeStatus, string> = {
  valid: "Checksum matches",
  invalid: "Code does not match",
  impossible: "Score is impossible",
  unchecked: "Cannot check (older summary)",
  "other-app": `${SIBLING.name} summary`,
  missing: "No code",
};

/* ---- CSV ------------------------------------------------------------------------ */

/** One CSV cell. Quoted when it must be; and a student-typed value that a
 *  spreadsheet would run as a formula gets a leading apostrophe. */
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Every pasted summary, one row each, as the table shows them. */
export function summaryCsv(rows: readonly ParsedSummary[]): string {
  const withTime = rows.some((row) => row.time);
  /* Each new column appears only when some summary has it, so a class that has
     never heard of rounds gets the same table it always did. */
  const withClass = rows.some((row) => row.classCode);
  const withRound = rows.some((row) => row.round);
  const withRepeats = rows.some((row) => row.repeats);
  return csv([
    [
      "Student ID", "Assignment", "Score", "Out of", "Percent", "Threshold met",
      ...(withTime ? ["Time"] : []), ...(withClass ? ["Class"] : []), ...(withRound ? ["Round"] : []),
      ...(withRepeats ? ["Repeats questions"] : []), "Attempt", "Finished", "Code", "Code check",
    ],
    ...rows.map((row) => [
      row.studentId.trim(),
      row.assignment ?? "Practice",
      row.correct,
      row.total,
      row.percent,
      row.metGoal === null ? "no pass mark" : row.metGoal ? "yes" : "no",
      ...(withTime ? [row.time] : []),
      ...(withClass ? [row.classCode] : []),
      ...(withRound ? [row.round] : []),
      ...(withRepeats ? [row.repeats ? "yes" : "no"] : []),
      row.attempt,
      row.finished,
      row.code,
      STATUS_TEXT[row.status],
    ]),
  ]);
}

export type CanvasScore = "correct" | "percent";
/** How a student's several results for one assignment become one row. `latest`
 *  reads the Stamp (then the attempt number); `best` keeps the highest score. */
export type AttemptPolicy = "latest" | "best";

/** The results a pasted set of summaries holds, grouped the way Canvas needs
 *  them: one group per round identity and assignment name. A summary with no
 *  Round line is grouped by name alone, and says so. Two links that share a
 *  name but ask different rounds are two groups, never one. */
export interface CanvasGroup {
  readonly key: string;
  readonly assignment: string | null;
  readonly round: string | null;
  readonly classCode: string | null;
  readonly results: number;
}

function groupKey(row: ParsedSummary): string {
  return `${row.round ?? "older"}|${row.assignment ?? ""}`;
}

export function canvasGroups(rows: readonly ParsedSummary[]): CanvasGroup[] {
  const groups = new Map<string, { round: string | null; assignment: string | null; classCode: string | null; results: number }>();
  for (const row of rows) {
    const key = groupKey(row);
    const seen = groups.get(key);
    if (seen) seen.results += 1;
    else groups.set(key, { round: row.round, assignment: row.assignment, classCode: row.classCode, results: 1 });
  }
  return [...groups.entries()]
    /* Rounds before older summaries: a teacher's default should be the one the
       app can actually check. Within each, the most common first. */
    .sort(([, a], [, b]) => Number(b.round !== null) - Number(a.round !== null) || b.results - a.results)
    .map(([key, group]) => ({ key, ...group }));
}

export interface CanvasOptions {
  readonly column: string;
  readonly score: CanvasScore;
  readonly onlyChecked: boolean;
  /** The group to export, by its key. Null: none chosen yet, so nothing is exported. */
  readonly group: string | null;
  /** How a student's results become one row. Null: not chosen, so no file. */
  readonly policy: AttemptPolicy | null;
}

export interface CanvasStudent {
  readonly name: string;
  /** The result that goes in the file; null until a policy is chosen. */
  readonly chosen: ParsedSummary | null;
  /** The other results for this student, which are left out of the file. */
  readonly left: readonly ParsedSummary[];
  /** The number that goes in the Canvas column for the chosen result. */
  readonly score: number | null;
}

export interface CanvasPreview {
  readonly students: readonly CanvasStudent[];
  /** True when every result in the group carries a Stamp, so the order they were
   *  finished in is known. Only then is `latest` offered as the default. */
  readonly ordered: boolean;
  /** Rows left out before the attempt policy applies, and why. */
  readonly skipped: {
    readonly otherGroup: number;
    readonly noScore: number;
    readonly impossible: number;
    readonly codeFailed: number;
    readonly noStudent: number;
    /** Results for a student that the policy did not choose. Originals are kept. */
    readonly notChosen: number;
  };
  /** The Canvas file, or null until a group and a policy are both chosen. */
  readonly csv: string | null;
}

/** Canvas's gradebook import layout: Student, ID, SIS User ID, SIS Login ID,
 *  Section, then one column named for the assignment. The apps never know a
 *  Canvas user, so Student holds what the student typed and the ID columns stay
 *  blank; Canvas asks the teacher to match anyone it cannot find.
 *
 *  Nothing is merged silently. Each student's results are listed; the attempt
 *  policy decides which one goes in the file, and every other result is reported
 *  as left out. The pasted summaries themselves are never changed.
 *  Canvas's importer reads a bare `75` as 75 points but scales `75%` to the
 *  assignment's points, so percents are written with the sign and questions
 *  correct stay bare counts (points). */
export function canvasPreview(rows: readonly ParsedSummary[], options: CanvasOptions): CanvasPreview {
  const skipped = { otherGroup: 0, noScore: 0, impossible: 0, codeFailed: 0, noStudent: 0, notChosen: 0 };
  const byStudent = new Map<string, { name: string; results: ParsedSummary[] }>();
  for (const row of rows) {
    if (options.group === null || groupKey(row) !== options.group) { skipped.otherGroup += 1; continue; }
    if (row.correct === null || row.total === null) { skipped.noScore += 1; continue; }
    if (row.status === "impossible" || row.total === 0 || row.correct > row.total) { skipped.impossible += 1; continue; }
    if (options.onlyChecked && row.status !== "valid") { skipped.codeFailed += 1; continue; }
    const name = row.studentId.trim();
    if (!name) { skipped.noStudent += 1; continue; }
    const key = name.toLowerCase();
    const entry = byStudent.get(key) ?? { name, results: [] };
    entry.results.push(row);
    byStudent.set(key, entry);
  }

  const results = [...byStudent.values()].flatMap((entry) => entry.results);
  const ordered = results.every((row) => row.stamp !== null);
  const scoreOf = (row: ParsedSummary) => (options.score === "percent" ? (row.percent ?? 0) : (row.correct ?? 0));
  const newest = (a: ParsedSummary, b: ParsedSummary) =>
    (a.stamp?.getTime() ?? -Infinity) - (b.stamp?.getTime() ?? -Infinity) || a.attempt - b.attempt;

  const students: CanvasStudent[] = [...byStudent.values()]
    .map(({ name: firstName, results: own }) => {
      if (options.policy === null) {
        return { name: firstName, chosen: null, left: [], score: null };
      }
      /* Newest first for `latest`; highest score first for `best`, with the newest
         result breaking a tie. Either way the first one is the one that is kept. */
      const sorted = [...own].sort((a, b) =>
        options.policy === "latest" ? newest(b, a) : scoreOf(b) - scoreOf(a) || newest(b, a),
      );
      skipped.notChosen += sorted.length - 1;
      /* The name typed on the result that is kept, so the file says what that
         student typed, whatever case the other results used. */
      return { name: sorted[0].studentId.trim(), chosen: sorted[0], left: sorted.slice(1), score: scoreOf(sorted[0]) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let csvText: string | null = null;
  if (options.policy !== null && options.group !== null) {
    const column = options.column.trim() || "Assignment";
    csvText = csv([
      ["Student", "ID", "SIS User ID", "SIS Login ID", "Section", column],
      /* Canvas reads a bare number as points; a percent has to say so. */
      ...students.map(({ name, score }) => [name, "", "", "", "", options.score === "percent" ? `${score}%` : score]),
    ]);
  }
  return { students, ordered, skipped, csv: csvText };
}
