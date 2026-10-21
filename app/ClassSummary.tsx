"use client";

/* The class summary page: paste what students turned in, read one table, take
 * a CSV away. Everything happens in this browser; nothing pasted is sent or
 * saved. Count It and Eight Time keep this page in step. */

import { useMemo, useState } from "react";
import {
  STATUS_TEXT,
  canvasGroups,
  canvasPreview,
  parseSummaries,
  summaryCsv,
  type AttemptPolicy,
  type CanvasGroup,
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

function fileName(base: string): string {
  return `${base.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "class"}.csv`;
}

/** One group in the export list: which assignment, which round, which class. */
function groupLabel(group: CanvasGroup): string {
  const name = group.assignment ?? "Practice";
  const round = group.round ? `round ${group.round}` : "older summary, matched by name";
  const cls = group.classCode ? ` · class ${group.classCode}` : "";
  return `${name} · ${round}${cls} · ${group.results} ${group.results === 1 ? "result" : "results"}`;
}

function scoreText(score: number, kind: CanvasScore): string {
  return kind === "percent" ? `${score}%` : String(score);
}

/** One result, in the words the teacher reads it in: its score, attempt and finish. */
function resultText(row: ParsedSummary, kind: CanvasScore): string {
  const value = row.correct === null ? "no score" : scoreText(kind === "percent" ? (row.percent ?? 0) : row.correct, kind);
  return `${value}, ${detailText(row)}`;
}

/** Attempt and finish time, which is what tells two results from the same student apart. */
function detailText(row: ParsedSummary): string {
  const when = row.stamp ? row.stamp.toLocaleString() : "no Finished time";
  return `attempt ${row.attempt}, ${when}`;
}

export default function ClassSummary() {
  const [text, setText] = useState("");
  const [column, setColumn] = useState<string | null>(null);
  const [score, setScore] = useState<CanvasScore>("correct");
  const [onlyChecked, setOnlyChecked] = useState(true);
  const [notice, setNotice] = useState("");
  const [chosenGroup, setChosenGroup] = useState<string | null>(null);
  const [chosenPolicy, setChosenPolicy] = useState<AttemptPolicy | null>(null);
  const rows = useMemo(() => parseSummaries(text), [text]);
  const groups = useMemo(() => canvasGroups(rows), [rows]);
  /* The first group is the round the app can check, with the most results: the
     starting choice, shown in the select, never a silent one. */
  const group = chosenGroup !== null && groups.some((entry) => entry.key === chosenGroup) ? chosenGroup : (groups[0]?.key ?? null);
  const current = groups.find((entry) => entry.key === group) ?? null;
  const columnName = column ?? current?.assignment ?? "";
  /* Most recent is the default only when every result in the group has a Finished
     time, so the order is known. Otherwise the teacher has to choose. */
  const ordered = useMemo(
    () => canvasPreview(rows, { column: columnName, score, onlyChecked, group, policy: null }).ordered,
    [rows, columnName, score, onlyChecked, group],
  );
  const policy: AttemptPolicy | null = chosenPolicy ?? (ordered ? "latest" : null);
  const preview = useMemo(
    () => canvasPreview(rows, { column: columnName, score, onlyChecked, group, policy }),
    [rows, columnName, score, onlyChecked, group, policy],
  );
  const withTime = rows.some((row) => row.time);
  const withClass = rows.some((row) => row.classCode);
  const counts = useMemo(() => ({
    valid: rows.filter((row) => row.status === "valid").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
    impossible: rows.filter((row) => row.status === "impossible").length,
  }), [rows]);

  /* What the file leaves out, in the teacher's words: shown before the download
     and repeated after it, so nothing is dropped without being said. */
  const leftOut = (chosen: AttemptPolicy | null) => [
    preview.skipped.otherGroup ? `${preview.skipped.otherGroup} for another assignment or round` : "",
    preview.skipped.codeFailed ? `${preview.skipped.codeFailed} without a checked code` : "",
    preview.skipped.impossible ? `${preview.skipped.impossible} with an impossible score` : "",
    preview.skipped.noScore ? `${preview.skipped.noScore} with no score` : "",
    preview.skipped.noStudent ? `${preview.skipped.noStudent} with no name or class ID` : "",
    preview.skipped.notChosen && chosen
      ? `${preview.skipped.notChosen} repeat ${preview.skipped.notChosen === 1 ? "result" : "results"} not used (${chosen === "latest" ? "most recent" : "best score"} kept)`
      : "",
  ].filter(Boolean);

  function downloadCanvas() {
    if (preview.csv === null) return;
    download(fileName(`canvas-${columnName}`), preview.csv);
    const left = leftOut(policy);
    const count = preview.students.length;
    setNotice(`Canvas file downloaded with ${count} ${count === 1 ? "student" : "students"}.` +
      (left.length ? ` Left out: ${left.join(", ")}.` : ""));
  }

  return (
    <div className="builder-shell">
      <a className="skip-link" href="#summary-input">Skip to the paste box</a>
      <PageHeader page="class-summary" />

      <main className="builder-main class-summary">
        <div className="builder-intro">
          <p className="eyebrow">For teachers</p>
          <h1>Class summary</h1>
          <p>
            Paste the summaries your students turned in (one after another, as many as you like). You get one
            table with each student&rsquo;s score, whether they met the goal, their time if the link set one, their
            class code if the link asked for one, and whether their verification code checks. Then download it as a
            CSV, or as a file Canvas can import. Everything stays in this browser: nothing you paste is sent anywhere
            or saved.
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
              (counts.invalid ? ` · ${counts.invalid} do${counts.invalid === 1 ? "es" : ""} not match` : "") +
              (counts.impossible ? ` · ${counts.impossible} ${counts.impossible === 1 ? "has" : "have"} an impossible score` : "")}
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
                    {withClass && <th scope="col">Class</th>}
                    <th scope="col">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td data-label="Student ID">{row.studentId.trim() || <em>none typed</em>}</td>
                      <td data-label="Assignment">
                        {row.assignment ?? "Practice"}{row.attempt > 1 ? ` (attempt ${row.attempt})` : ""}
                        {row.repeats && <small className="repeat-note"> · repeats some questions</small>}
                      </td>
                      <td data-label="Score">{row.correct !== null ? `${row.correct}/${row.total} (${row.percent}%)` : "—"}</td>
                      <td data-label="Threshold met">{row.metGoal === null ? "No pass mark" : row.metGoal ? "Yes" : "Not yet"}</td>
                      {withTime && <td data-label="Time">{row.time ?? "—"}</td>}
                      {withClass && <td data-label="Class">{row.classCode ?? "—"}</td>}
                      <td data-label="Code" className={`code-${row.status}`}>
                        <span className="code-status">{row.status === "valid" ? "✓ " : row.status === "invalid" || row.status === "impossible" ? "✗ " : ""}{STATUS_TEXT[row.status]}</span>
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
                <strong>Checksum matches</strong>: the score, attempt, student ID, assignment, time, hints used, round, class
                code, repeats and finishing moment in the summary are the ones its code was made from. <strong>Code does not
                match</strong>: something was changed after the summary was copied, even a single character of the name.
                <strong> Cannot check</strong>: the summary comes from before this page existed and has no Stamp line. The
                code is a deterrent, not proof: it is made in the student&rsquo;s browser, and how it is made is public.
              </p>
              <p>
                A class code is typed by the student, so it shows which class sent a result, not who sent it. A repeated
                question is practice, not an independent check of the same skill.
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
                  A file in Canvas&rsquo;s gradebook import layout: <code>Student, ID, SIS User ID, SIS Login ID, Section</code>, then one
                  column named for the assignment holding each student&rsquo;s score.
                </p>
                <p className="class-summary-note">
                  <strong>You match the names in Canvas.</strong> These apps never know who a student is, so the
                  Student column holds whatever name or class ID the student typed, and ID, SIS User ID, SIS Login ID and Section
                  are left blank. When you import it (Gradebook, then Import), Canvas lists anyone it cannot find and you
                  pick the right student there. If the column name is not the name of a Canvas assignment, Canvas
                  offers to create a new one.
                </p>
                {groups.length > 1 && (
                  <label className="level-control">
                    <span>Assignment and round to export</span>
                    <select value={group ?? ""} onChange={(event) => { setChosenGroup(event.target.value); setColumn(null); setChosenPolicy(null); }}>
                      {groups.map((entry) => <option key={entry.key} value={entry.key}>{groupLabel(entry)}</option>)}
                    </select>
                    <small>Each round is exported on its own, so one round&rsquo;s results never land in another&rsquo;s column.</small>
                  </label>
                )}
                {current && current.round === null && (
                  <p className="class-summary-warning" role="note">
                    These summaries were made before rounds were named, so they can only be matched by assignment name.
                    Check that they are the same round before you export them.
                  </p>
                )}
                <label className="builder-field">
                  <span>Assignment column name (as it is in Canvas)</span>
                  <input type="text" value={columnName} onChange={(event) => setColumn(event.target.value)} />
                </label>
                <label className="level-control">
                  <span>Which result to use for each student</span>
                  <select
                    value={policy ?? ""}
                    onChange={(event) => setChosenPolicy(event.target.value === "best" ? "best" : event.target.value === "latest" ? "latest" : null)}
                  >
                    {policy === null && <option value="">Choose one</option>}
                    <option value="latest">Most recent result</option>
                    <option value="best">Best score</option>
                  </select>
                  <small>
                    {ordered
                      ? "Most recent uses each summary’s Finished time, so the order is known. Every other result is listed below and left out of the file."
                      : "Some results have no Finished time, so the order they were made in is not known. Choose the rule yourself."}
                  </small>
                </label>
                <label className="level-control">
                  <span>Score in the column</span>
                  <select value={score} onChange={(event) => setScore(event.target.value as CanvasScore)}>
                    <option value="correct">Questions correct (e.g. 11)</option>
                    <option value="percent">Percent (e.g. 92%)</option>
                  </select>
                  <small>
                    Canvas scales a percent to whatever the assignment is worth, so any point value works. Questions
                    correct import as points, so the assignment should be worth as many points as there are questions.
                  </small>
                </label>
                <label className="class-summary-check">
                  <input type="checkbox" checked={onlyChecked} onChange={(event) => setOnlyChecked(event.target.checked)} />
                  <span>Only include summaries whose code checks</span>
                </label>

                {preview.csv === null ? (
                  <p className="canvas-preview-note" role="status">Choose which result to use for each student to see the file.</p>
                ) : (
                  <section className="canvas-preview" aria-labelledby="canvas-preview-title">
                    <h3 id="canvas-preview-title">
                      Preview: {preview.students.length} {preview.students.length === 1 ? "student" : "students"}
                    </h3>
                    <div className="canvas-preview-table" role="region" aria-label="Canvas preview table" tabIndex={0}>
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Student</th>
                            <th scope="col">Canvas gets</th>
                            <th scope="col">Other results, left out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.students.map((student) => (
                            <tr key={student.name}>
                              <td data-label="Student">{student.name}</td>
                              <td data-label="Canvas gets">
                                {student.chosen ? `${scoreText(student.score ?? 0, score)} (${detailText(student.chosen)})` : "—"}
                              </td>
                              <td data-label="Other results, left out">
                                {student.left.length === 0 ? "none" : student.left.map((row) => resultText(row, score)).join("; ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {leftOut(policy).length > 0 && (
                      <p className="canvas-preview-note">Also left out: {leftOut(policy).join(", ")}.</p>
                    )}
                  </section>
                )}
                <button type="button" className="primary-button" disabled={preview.csv === null} onClick={downloadCanvas}>
                  Download Canvas gradebook CSV
                </button>
              </fieldset>
              <p role="status" className="builder-copied">{notice}</p>
            </section>
          </>
        )}
      </main>

      <PageFooter page="class-summary" />
    </div>
  );
}
