"use client";

/* The class summary page: paste what students turned in, read one table, take
 * a CSV away. Everything happens in this browser; nothing pasted is sent or
 * saved. Count It and Eight Time keep this page in step. */

import { useMemo, useState } from "react";
import {
  STATUS_TEXT,
  canvasCsv,
  parseSummaries,
  summaryCsv,
  type CanvasScore,
  type ParsedSummary,
} from "../src/class-summary";
import { PageFooter, PageHeader } from "./PageChrome";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The assignment most rows name, to start the Canvas column with. */
function commonAssignment(rows: readonly ParsedSummary[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) if (row.assignment) counts.set(row.assignment, (counts.get(row.assignment) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function fileName(base: string): string {
  return `${base.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "class"}.csv`;
}

export default function ClassSummary() {
  const [text, setText] = useState("");
  const [column, setColumn] = useState<string | null>(null);
  const [score, setScore] = useState<CanvasScore>("correct");
  const [onlyChecked, setOnlyChecked] = useState(true);
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => parseSummaries(text), [text]);
  const columnName = column ?? commonAssignment(rows);
  const withTime = rows.some((row) => row.time);
  const counts = useMemo(() => ({
    valid: rows.filter((row) => row.status === "valid").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
  }), [rows]);

  function downloadCanvas() {
    const result = canvasCsv(rows, { column: columnName, score, onlyChecked });
    download(fileName(`canvas-${columnName}`), result.csv);
    const left = [
      result.skipped.codeFailed ? `${result.skipped.codeFailed} without a checked code` : "",
      result.skipped.noStudent ? `${result.skipped.noStudent} with no name or class ID` : "",
      result.skipped.duplicates ? `${result.skipped.duplicates} repeat results (best score kept)` : "",
    ].filter(Boolean);
    setNotice(`Canvas file downloaded with ${result.included} ${result.included === 1 ? "student" : "students"}.` +
      (left.length ? ` Left out: ${left.join(", ")}.` : ""));
  }

  return (
    <div className="builder-shell">
      <a className="skip-link" href="#summary-input">Skip to the paste box</a>
      <PageHeader />

      <main className="builder-main class-summary">
        <div className="builder-intro">
          <p className="eyebrow">For teachers</p>
          <h1>Class summary</h1>
          <p>
            Paste the summaries your students turned in (one after another, as many as you like). You get one
            table with each student&rsquo;s score, whether they met the goal, their time if the link set one, and
            whether their verification code checks. Then download it as a CSV, or as a file Canvas can import.
            Everything stays in this browser: nothing you paste is sent anywhere or saved.
          </p>
        </div>

        <label className="class-summary-input" htmlFor="summary-input">
          <span>Students&rsquo; summaries</span>
          <textarea
            id="summary-input"
            value={text}
            rows={10}
            spellCheck={false}
            placeholder={"Count It — Choose the Count\nAssignment: Step 2\nStudent: 4B-07\nScore: 11/12 (92%)\n…\nCode: BRS-CI-…"}
            onChange={(event) => { setText(event.target.value); setNotice(""); }}
          />
        </label>

        <p className="class-summary-count" role="status" aria-live="polite">
          {rows.length === 0
            ? "No summaries yet."
            : `${rows.length} ${rows.length === 1 ? "summary" : "summaries"} · ${counts.valid} code${counts.valid === 1 ? "" : "s"} check` +
              (counts.invalid ? ` · ${counts.invalid} do${counts.invalid === 1 ? "es" : ""} not match` : "")}
        </p>

        {rows.length > 0 && (
          <>
            <div className="class-summary-table" role="region" aria-label="Class summary table" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Student ID</th>
                    <th scope="col">Assignment</th>
                    <th scope="col">Score</th>
                    <th scope="col">Threshold met</th>
                    {withTime && <th scope="col">Time</th>}
                    <th scope="col">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td data-label="Student ID">{row.studentId.trim() || <em>none typed</em>}</td>
                      <td data-label="Assignment">{row.assignment ?? "Practice"}{row.attempt > 1 ? ` (attempt ${row.attempt})` : ""}</td>
                      <td data-label="Score">{row.correct !== null ? `${row.correct}/${row.total} (${row.percent}%)` : "—"}</td>
                      <td data-label="Threshold met">{row.metGoal === null ? "No pass mark" : row.metGoal ? "Yes" : "Not yet"}</td>
                      {withTime && <td data-label="Time">{row.time ?? "—"}</td>}
                      <td data-label="Code" className={`code-${row.status}`}>
                        <span className="code-status">{row.status === "valid" ? "✓ " : row.status === "invalid" ? "✗ " : ""}{STATUS_TEXT[row.status]}</span>
                        {row.code && <code>{row.code}</code>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="class-summary-help">
              <summary>What the code check means</summary>
              <p>
                <strong>Code checks</strong>: the score, attempt, student ID, assignment, time and finishing moment in
                the summary are the ones its code was made from. <strong>Code does not match</strong>: something was
                changed after the summary was copied, even a single character of the name. <strong>Cannot
                check</strong>: the summary comes from before this page existed and has no Stamp line. The code is a
                deterrent, not proof: it is made in the student&rsquo;s browser, and how it is made is public.
              </p>
            </details>

            <section className="class-summary-downloads" aria-labelledby="downloads-title">
              <h2 id="downloads-title">Download</h2>
              <button type="button" className="secondary-button" onClick={() => download(fileName(`class-summary-${columnName}`), summaryCsv(rows))}>
                Download table (CSV)
              </button>

              <fieldset className="builder-group">
                <legend>Canvas gradebook</legend>
                <p>
                  A file in Canvas&rsquo;s gradebook import layout: <code>Student, ID, SIS User ID, Section</code>, then one
                  column named for the assignment holding each student&rsquo;s score.
                </p>
                <p className="class-summary-note">
                  <strong>You match the names in Canvas.</strong> These apps never know who a student is, so the
                  Student column holds whatever name or class ID the student typed, and ID, SIS User ID and Section
                  are left blank. When you import it (Gradebook, then Import), Canvas lists anyone it cannot match and you
                  pick the right student there. If the column name is not the name of a Canvas assignment, Canvas
                  offers to create a new one.
                </p>
                <label className="builder-field">
                  <span>Assignment column name (as it is in Canvas)</span>
                  <input type="text" value={columnName} onChange={(event) => setColumn(event.target.value)} />
                </label>
                <label className="level-control">
                  <span>Score in the column</span>
                  <select value={score} onChange={(event) => setScore(event.target.value as CanvasScore)}>
                    <option value="correct">Questions correct (e.g. 11)</option>
                    <option value="percent">Percent (e.g. 92)</option>
                  </select>
                </label>
                <label className="class-summary-check">
                  <input type="checkbox" checked={onlyChecked} onChange={(event) => setOnlyChecked(event.target.checked)} />
                  <span>Only include summaries whose code checks</span>
                </label>
                <small>One row per student: if a student turned in more than one result, the best score is kept.</small>
                <button type="button" className="primary-button" onClick={downloadCanvas}>
                  Download Canvas gradebook CSV
                </button>
              </fieldset>
              <p role="status" className="builder-copied">{notice}</p>
            </section>
          </>
        )}
      </main>

      <PageFooter page="class-summary" feedbackSubject="Count It — Class summary feedback" />
    </div>
  );
}
