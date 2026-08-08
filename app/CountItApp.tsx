"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CountReference from "./CountReference";
import RhythmNotation from "./RhythmNotation";
import SupportFallbackDialog from "./SupportFallbackDialog";
import {
  LEVELS,
  getCellsByIds,
  getCompleteReference,
  getLevel,
  getPromptAnswer,
  type LevelId,
  type RhythmPrompt,
} from "../src/rhythm";
import {
  advanceSession,
  answerSession,
  createSession,
  generateQuestions,
  getAccuracy,
  getCurrentQuestion,
  getCurrentResponse,
  resetSession,
  type ChallengeSession,
  type QuestionChoice,
  type QuestionScope,
} from "../src/question";
import { COUNT_IT_BUILD } from "../src/capabilities";
import {
  DEFAULT_QUESTIONS,
  describeAssignment,
  parseAssignment,
  verificationCode,
  type Assignment,
  type AssignmentError,
} from "../src/assignment";
import { createPraxisEvidenceResult } from "../src/result";
import { parseSequenceStep, type SequenceStep } from "../src/sequence-step";

type AppMode = "practice" | "challenge";

const SESSION_LENGTH = DEFAULT_QUESTIONS;
const INITIAL_SEED = 20260715;
const BEST_KEY = "count-it-personal-bests-v1";
const PREFERENCES_KEY = "count-it-preferences-v1";
/* A stable per-browser string used to vary the ORDER of the answer choices in
   an assigned round. It is not an identity and never leaves the device: it
   exists so that two students opening the same link do not see the correct
   answer in the same position, which is what made one student's answers usable
   by the whole class. A typed name supersedes it, so a teacher can reproduce a
   particular student's ordering; with neither, the round is ordered as it
   always was. */
const DEVICE_KEY = "count-it-device-v1";

function readDeviceVariant(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const minted = crypto.randomUUID?.() ?? `d${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_KEY, minted);
    return minted;
  } catch {
    // Private mode, or storage denied. A shared order is the old behaviour, not
    // a broken one, so the round still runs.
    return "";
  }
}
/* Single-sourced from the capability manifest, so the footer stamp, the
   published manifest and the README release line cannot disagree — the drift
   the release gate exists to catch, removed rather than re-checked. */
const BUILD_ID = COUNT_IT_BUILD;

/** Which controls a link pinned, so the setup panel can disable exactly those
 *  and say why. Derived from the assignment rather than passed alongside it —
 *  a second hand-kept list would drift from the one that matters. */
function assignmentLocks(assignment: Assignment, pinned: readonly string[]): string[] {
  /* What the LINK pinned, not what an assignment is assumed to imply. The
     parser already reports this exactly; recomputing it here meant that naming
     a round — `?a=Homework 1` and nothing else — froze the level and question
     size at their defaults and told the student their teacher had chosen them.
     Nobody had. `cells` and `guide` stay derived because they are locked by
     being present at all. */
  const locks = new Set<string>(pinned);
  if (assignment.cells) locks.add("cells");
  if (assignment.guide) locks.add("guide");
  return [...locks];
}

interface RoundSpec {
  readonly level: LevelId;
  readonly scope: QuestionScope;
  readonly seed: string | number;
  readonly count: number;
  readonly cells?: readonly string[];
  readonly variant?: string;
}

function makeSession(spec: RoundSpec): ChallengeSession {
  return createSession(generateQuestions(spec));
}

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="brand-mark" src="/icon-192.png" alt="" aria-hidden="true" />
  );
}

function ScopeIcon({ scope }: { scope: QuestionScope }) {
  return (
    <span className={`scope-icon ${scope}`} aria-hidden="true">
      {scope === "beat" ? <><i /><i /><i /><i /></> : <><b>4</b><i /><i /><i /><i /></>}
    </span>
  );
}

function misconceptionMessage(choice: QuestionChoice | undefined): string {
  switch (choice?.category) {
    case "omitted_sound":
      return "That choice leaves out a subdivision where a note sounds.";
    case "added_sound":
      return "That choice adds a syllable where the rhythm is silent.";
    case "shifted_subdivision":
      return "That choice shifts a note to a different subdivision.";
    case "eighth_sixteenth_confusion":
      return "Check whether the note belongs on &, e, or a.";
    case "wrong_beat_number":
      return "The subdivision shape is close, but the beat number is not.";
    default:
      return "Compare each notehead with the complete subdivision underneath it.";
  }
}

function SetupControls({
  level,
  scope,
  showReference,
  assignment,
  locked,
  studentId,
  identityLocked,
  onLevelChange,
  onScopeChange,
  onReferenceChange,
  onStudentIdChange,
}: {
  level: LevelId;
  scope: QuestionScope;
  showReference: boolean;
  assignment: Assignment | null;
  locked: ReadonlySet<string>;
  studentId: string;
  identityLocked: boolean;
  onLevelChange: (value: LevelId) => void;
  onScopeChange: (value: QuestionScope) => void;
  onReferenceChange: (value: boolean) => void;
  onStudentIdChange: (value: string) => void;
}) {
  return (
    <section className="setup-panel" aria-labelledby="setup-title">
      <div className="setup-heading">
        <p className="eyebrow">{assignment ? "Assigned practice" : "Set your focus"}</p>
        <h2 id="setup-title">{assignment ? "Your teacher set this up." : "What do you want to read?"}</h2>
      </div>
      {assignment && (
        // The conditions, stated where the student can see them. A locked
        // control that just refuses to move is a bug from the outside; one
        // that says who locked it and what to is an instruction.
        <p className="assignment-banner" role="status">
          <strong>{assignment.name ?? "Assigned round"}</strong>
          <span>{describeAssignment(assignment)}</span>
          <small>These settings are part of the assignment, so they stay put.</small>
        </p>
      )}
      {assignment?.cells ? (
        <p className="level-control" aria-label="Rhythms in this assignment">
          <span>Rhythms</span>
          <strong>{assignment.cells.length} chosen by your teacher</strong>
          <small>{getCellsByIds(assignment.cells).map((cell) => cell.shortLabel).join(" · ")}</small>
        </p>
      ) : (
        <label className="level-control">
          <span>Beginner level</span>
          <select
            value={level}
            disabled={locked.has("level")}
            onChange={(event) => onLevelChange(event.target.value as LevelId)}
          >
            {LEVELS.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <small>{getLevel(level).description}</small>
        </label>
      )}
      <fieldset className="scope-control">
        <legend>Question size</legend>
        <div className="scope-options">
          {(["beat", "measure"] as const).map((option) => (
            <label className={scope === option ? "is-selected" : ""} key={option}>
              <input
                type="radio"
                name="question-scope"
                value={option}
                checked={scope === option}
                disabled={locked.has("scope")}
                onChange={() => onScopeChange(option)}
              />
              <ScopeIcon scope={option} />
              <span>{option === "beat" ? "One beat" : "One measure"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="reference-toggle">
        <input
          type="checkbox"
          checked={showReference}
          disabled={locked.has("guide")}
          onChange={(event) => onReferenceChange(event.target.checked)}
        />
        <span aria-hidden="true" />
        <strong>Subdivision guide</strong>
        <small>
          {locked.has("guide")
            // The guide is a support, not a preference: the gate counts the
            // assignment's policy, never the learner's own toggle.
            ? `The assignment keeps the guide ${showReference ? "visible" : "hidden"}.`
            : `Show the complete ${scope === "beat" ? "1 e & a" : "measure grid"}.`}
        </small>
      </label>
      {assignment && (
        // Asked BEFORE the round, not after it. The name labels the result a
        // student submits, and it also sets their personal answer order — which
        // only works if it is known before the questions are built. Saying so
        // is deliberate: a student who knows the order is theirs has nothing to
        // gain from a classmate's answers.
        <label className="student-id-field setup-identity">
          <span>Your name or class ID</span>
          <input
            type="text"
            value={studentId}
            maxLength={40}
            autoComplete="off"
            disabled={identityLocked}
            placeholder="Optional"
            onChange={(event) => onStudentIdChange(event.target.value)}
          />
          <small>
            {identityLocked
              ? "Locked while the round is running."
              : "Goes on the result you submit, and sets your own answer order."}
          </small>
        </label>
      )}
      <div className="system-note" aria-label="Counting system">
        <span>System</span>
        <strong>Standard</strong>
        <code>1 e & a</code>
      </div>
    </section>
  );
}

function PracticeMode({
  prompt,
  explanation,
  index,
  total,
  revealed,
  showReference,
  onReveal,
  onPrevious,
  onNext,
  onShuffle,
}: {
  prompt: RhythmPrompt;
  explanation: string;
  index: number;
  total: number;
  revealed: boolean;
  showReference: boolean;
  onReveal: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShuffle: () => void;
}) {
  const answer = getPromptAnswer(prompt);
  const notationLabel = `${prompt.scope === "beat" ? "One beat" : "One 4/4 measure"} rhythm for practice.`;
  return (
    <section className="trainer-card practice-card" aria-labelledby="practice-title">
      <div className="trainer-topline">
        <div>
          <p className="eyebrow">Practice mode</p>
          <h2 id="practice-title">Read it at your own pace.</h2>
        </div>
        <span className="example-count">Example {index + 1} of {total}</span>
      </div>
      <div className="notation-panel">
        <RhythmNotation prompt={prompt} label={notationLabel} />
      </div>
      {showReference && (
        <div className="reference-panel">
          <div className="mini-heading">
            <span>Complete subdivision</span>
            <small>{revealed ? "Orange counts match sounding notes." : "Use the guide to locate each note."}</small>
          </div>
          <CountReference prompt={prompt} revealSounding={revealed} />
        </div>
      )}
      <div className={`reveal-panel ${revealed ? "is-revealed" : ""}`}>
        <span className="reveal-label">Correct count</span>
        <strong>{revealed ? answer : "Say it first, then check."}</strong>
        <button type="button" className="secondary-button" onClick={onReveal}>
          {revealed ? "Hide the count" : "Reveal the count"}
        </button>
      </div>
      {revealed && (
        <div className="explanation" role="status">
          <span className="lesson-icon" aria-hidden="true">i</span>
          <p><strong>Why it counts this way</strong>{explanation}</p>
        </div>
      )}
      <div className="practice-actions">
        <button type="button" className="quiet-button" onClick={onPrevious}>Back</button>
        <button type="button" className="quiet-button" onClick={onShuffle}>Mix examples</button>
        <button type="button" className="primary-button" onClick={onNext}>Next example <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}

function ChallengeMode({
  session,
  level,
  scope,
  showReference,
  personalBest,
  assignment,
  sequenceStep,
  studentId,
  finishedAt,
  holdFeedback,
  attempt,
  onStudentIdChange,
  onAnswer,
  onAdvance,
  onRetry,
  onNewSession,
}: {
  session: ChallengeSession;
  level: LevelId;
  scope: QuestionScope;
  showReference: boolean;
  personalBest: number;
  assignment: Assignment | null;
  sequenceStep: SequenceStep | null;
  studentId: string;
  finishedAt: Date | null;
  /** `fb=end`: no correct answer, no running score, no highlighted guide until
   *  the round is over. Instant feedback teaches; a graded round cannot afford
   *  to hand over an answer key while it is still being answered. */
  holdFeedback: boolean;
  attempt: number;
  onAnswer: (choiceId: string) => void;
  onAdvance: () => void;
  onRetry: () => void;
  onNewSession: () => void;
}) {
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (session.status === "complete") resultHeading.current?.focus();
    else questionHeading.current?.focus();
  }, [session.currentIndex, session.status]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, select, textarea") || session.status !== "active") return;
      const question = getCurrentQuestion(session);
      const response = getCurrentResponse(session);
      if (!response && /^[1-4]$/.test(event.key)) {
        const choice = question.choices[Number(event.key) - 1];
        if (choice) onAnswer(choice.id);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onAnswer, session]);

  if (session.status === "complete") {
    const accuracy = getAccuracy(session);
    const resultMessage = accuracy >= 80
      ? "Strong reading. You are placing the counts with confidence."
      : accuracy >= 60
        ? "Good work. Review the highlighted subdivisions, then try again."
        : "Keep the guide visible and work beat by beat. Accuracy will follow.";
    const stamped = finishedAt ?? new Date(0);
    /* The evidence, built once and rendered from. Before this the card assembled
       its own facts inline, which is why this app had no result object to
       migrate — and why the human record and any machine record could have
       described different rounds without anything noticing. */
    const result = createPraxisEvidenceResult({
      session, assignment, sequenceStep, level, scope, finishedAt: stamped, attempt,
    });
    /* Separate from result.attemptReference on purpose: this is the
       teacher-facing code with its own published format and its own stated
       limits, and whether it generalizes across the three apps is still open.
       Making the two identical here would answer that by accident. */
    const code = verificationCode({
      assignment: assignment?.name ?? "",
      studentId,
      correct: session.score,
      total: session.questions.length,
      finishedAt: stamped,
      attempt,
    });
    const conditions = result.conditions.stated;
    const passed = result.outcome.metGoal;
    /* The diagnosis the app already worked out. `errorSummary` has been built on
       every completed round since the envelope was adopted and reached nothing
       a human could read, so a card said "2 of 5" where it could have said which
       rhythms went wrong. Labels for the student, catalog ids for the summary a
       teacher reads — the ids are what a follow-up link is written against. */
    const missed = result.errorSummary.filter((entry) => entry.wrong > 0);
    const missedLabels = getCellsByIds(missed.map((entry) => entry.item)).map((cell) => cell.shortLabel);
    const summary = [
      `Count It — Choose the Count`,
      assignment?.name ? `Assignment: ${assignment.name}` : "Practice session",
      sequenceStep ? `Step: ${sequenceStep.seq} #${sequenceStep.step}` : null,
      studentId ? `Student: ${studentId}` : null,
      `Score: ${session.score}/${session.questions.length} (${accuracy}%)`,
      attempt > 1 ? `Attempt: ${attempt}` : null,
      `Conditions: ${conditions}`,
      passed === null ? null : `Result: ${passed ? "met the goal" : "not yet at the goal"}`,
      missed.length ? `Missed: ${missed.map((entry) => entry.item).join(", ")}` : null,
      finishedAt ? `Finished: ${finishedAt.toLocaleString()}` : null,
      `Code: ${code}`,
    ].filter(Boolean).join("\n");
    return (
      <section className="trainer-card result-card" aria-labelledby="result-title">
        <div className="result-badge" aria-hidden="true"><span>{accuracy}%</span></div>
        <p className="eyebrow">{assignment ? "Assignment complete" : "Session complete"}</p>
        <h2 id="result-title" tabIndex={-1} ref={resultHeading}>You counted {session.score} of {session.questions.length} correctly.</h2>
        <p className="result-message">{resultMessage}</p>
        {assignment?.name && <p className="result-assignment"><strong>{assignment.name}</strong></p>}
        {sequenceStep && (
          <p className="result-step">{sequenceStep.seq} · step {sequenceStep.step}</p>
        )}
        <dl className="result-stats">
          <div><dt>Score</dt><dd>{session.score}/{session.questions.length}</dd></div>
          <div><dt>Accuracy</dt><dd>{accuracy}%</dd></div>
          {assignment?.passing != null ? (
            // The gate the teacher set, reported rather than enforced: the app
            // states what happened, and the human decides what it means.
            <div><dt>Goal</dt><dd>{assignment.passing}/{session.questions.length}{passed ? " ✓" : ""}</dd></div>
          ) : (
            <div><dt>Personal best</dt><dd>{personalBest}/{session.questions.length}</dd></div>
          )}
          {attempt > 1 && (
            // Stated rather than left to be assumed. The same round can be
            // replayed after its answers have been shown, so a score that does
            // not say which run it came from claims more than it knows.
            <div><dt>Attempt</dt><dd>{attempt}</dd></div>
          )}
        </dl>
        {missedLabels.length > 0 && (
          <p className="result-missed">
            <strong>Worth another look</strong>
            <span>{missedLabels.join(" · ")}</span>
          </p>
        )}
        {assignment && (
          <label className="student-id-field">
            <span>Your name or class ID (optional)</span>
            <input
              type="text"
              value={studentId}
              maxLength={40}
              autoComplete="off"
              placeholder="Added to the summary you submit"
              onChange={(event) => onStudentIdChange(event.target.value)}
            />
          </label>
        )}
        <div className="result-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              // Clipboard first, selectable text as the fallback — a student on
              // a locked-down device must still be able to submit something.
              navigator.clipboard?.writeText(summary).catch(() => {
                window.prompt("Copy your result summary:", summary);
              });
            }}
          >
            Copy summary
          </button>
          <button type="button" className="secondary-button" onClick={onRetry}>Retry this set</button>
          {!assignment && (
            <button type="button" className="primary-button" onClick={onNewSession}>New randomized session <span aria-hidden="true">↻</span></button>
          )}
        </div>
        {assignment && (
          <p className="result-submit">Copy the summary and submit it wherever your teacher asked.</p>
        )}
        {/* Every question, what they chose, and what it should have been. When
            feedback was held to the end this is where the round is learned
            from, so it opens by itself; otherwise it stays folded, because the
            student has already seen each answer once. */}
        <details className="result-review" open={holdFeedback}>
          <summary>Review all {session.questions.length} questions</summary>
          <ol className="review-list">
            {session.questions.map((question, index) => {
              const answered = session.responses.find((entry) => entry.questionId === question.id);
              const chosen = question.choices.find((choice) => choice.id === answered?.choiceId);
              return (
                <li key={question.id} className={answered?.correct ? "is-correct" : "is-incorrect"}>
                  <div className="review-head">
                    <span className="review-index">{index + 1}</span>
                    <span className="review-mark" aria-hidden="true">{answered?.correct ? "✓" : "!"}</span>
                    <span className="review-verdict">{answered?.correct ? "Correct" : "Not this time"}</span>
                  </div>
                  <div className="notation-panel">
                    <RhythmNotation prompt={question.prompt} label={`Rhythm from question ${index + 1}.`} />
                  </div>
                  <dl className="review-answers">
                    <div><dt>You chose</dt><dd>{chosen?.label ?? "—"}</dd></div>
                    <div><dt>Correct count</dt><dd>{question.correctAnswer}</dd></div>
                  </dl>
                  <p className="review-why">{question.explanation}</p>
                </li>
              );
            })}
          </ol>
        </details>
        <p className="result-footnote">{conditions}</p>
        <p className="result-code">
          <span>Verification</span> <code>{code}</code>
          <small>Nothing is saved or sent. The code only shows this result was not retyped by hand.</small>
        </p>
      </section>
    );
  }

  const question = getCurrentQuestion(session);
  const response = getCurrentResponse(session);
  const selected = question.choices.find((choice) => choice.id === response?.choiceId);
  const accuracy = getAccuracy(session);
  return (
    <section className="trainer-card challenge-card" aria-labelledby="challenge-title">
      <div className="challenge-progress">
        <div className="progress-copy">
          <span>Question {session.currentIndex + 1} of {session.questions.length}</span>
          {/* A running score is feedback too: watching it stall after question
              three tells a student they were wrong just as plainly as a red
              answer would. Held rounds hide it with everything else. */}
          {holdFeedback
            ? <span>Answers at the end</span>
            : <span>Score <strong>{session.score}</strong> · Accuracy <strong>{accuracy}%</strong></span>}
        </div>
        <progress value={session.currentIndex + (response ? 1 : 0)} max={session.questions.length}>
          {session.currentIndex + 1} of {session.questions.length}
        </progress>
      </div>
      <div className="trainer-topline challenge-heading">
        <div>
          <p className="eyebrow">Choose the count</p>
          <h2 id="challenge-title" tabIndex={-1} ref={questionHeading}>Which count matches this rhythm?</h2>
        </div>
      </div>
      <div className="notation-panel">
        <RhythmNotation prompt={question.prompt} label="Rhythm for the current challenge question." />
      </div>
      {showReference && (
        <div className="reference-panel compact">
          <div className="mini-heading">
            <span>Complete subdivision</span>
            <small>
              {response && !holdFeedback
                ? "Sounding positions are highlighted."
                : getCompleteReference(scope)}
            </small>
          </div>
          {/* Highlighting the sounding positions IS the answer, so a held round
              leaves the grid unmarked. */}
          <CountReference prompt={question.prompt} revealSounding={!holdFeedback && Boolean(response)} />
        </div>
      )}
      <div className="answer-grid" aria-label="Answer choices">
        {question.choices.map((choice, index) => {
          const isSelected = response?.choiceId === choice.id;
          const classNames = [
            "answer-choice",
            response && !holdFeedback && choice.isCorrect ? "is-correct" : "",
            response && !holdFeedback && isSelected && !choice.isCorrect ? "is-incorrect" : "",
            response && holdFeedback && isSelected ? "is-chosen" : "",
          ].filter(Boolean).join(" ");
          return (
            <button
              type="button"
              className={classNames}
              key={choice.id}
              disabled={Boolean(response)}
              onClick={() => onAnswer(choice.id)}
              aria-pressed={isSelected}
            >
              <span className="choice-key" aria-hidden="true">{index + 1}</span>
              <strong>{choice.label}</strong>
              {response && !holdFeedback && choice.isCorrect && <span className="choice-result">Correct</span>}
              {response && (holdFeedback || !choice.isCorrect) && isSelected && (
                <span className="choice-result">Your choice</span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className={`feedback-panel ${
          !response ? "is-waiting" : holdFeedback ? "is-held" : response.correct ? "is-correct" : "is-incorrect"
        }`}
        role="status"
        aria-live="polite"
      >
        {!response ? (
          <p><strong>Choose one answer.</strong>You can also press 1, 2, 3, or 4.</p>
        ) : holdFeedback ? (
          <>
            <span className="feedback-icon" aria-hidden="true">•</span>
            <p>
              <strong>Answer recorded.</strong>
              This round shows every answer once you reach the end.
            </p>
            <button type="button" className="primary-button" onClick={onAdvance}>
              {session.currentIndex === session.questions.length - 1 ? "See results" : "Next question"} <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <>
            <span className="feedback-icon" aria-hidden="true">{response.correct ? "✓" : "!"}</span>
            <p>
              <strong>{response.correct ? "That is it." : `The correct count is ${question.correctAnswer}.`}</strong>
              {response.correct ? question.explanation : `${misconceptionMessage(selected)} ${question.explanation}`}
            </p>
            <button type="button" className="primary-button" onClick={onAdvance}>
              {session.currentIndex === session.questions.length - 1 ? "See results" : "Next question"} <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}

// Visit counter (progressive enhancement). Counts once per browser session via the
// shared Backwerd counter Worker; dev machines only read, so local work never
// inflates the number. Returns null until a real count arrives, so nothing renders
// if the endpoint is offline, blocked, or not deployed yet.
function useVisitCount(app: string) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const API = "https://counter.backwerdrhythmshop.com";
    const dev = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)
      || location.protocol === "file:";
    let counted = false;
    try { counted = sessionStorage.getItem("brs-counted") === "1"; } catch { /* private mode */ }

    let live = true;
    fetch(`${API}${dev || counted ? "/count" : "/hit"}?app=${app}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => {
        if (!live || !d || typeof d.count !== "number" || d.count < 1) return;
        if (!dev) { try { sessionStorage.setItem("brs-counted", "1"); } catch { /* private mode */ } }
        setCount(d.count);
      })
      .catch(() => { /* leave the footer exactly as it was */ });
    return () => { live = false; };
  }, [app]);
  return count;
}

// Build stamp + self-documenting support/feedback emails (progressive enhancement).
function BuildStamp() {
  const visits = useVisitCount("count-it");
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>('a.foot-btn[href^="mailto:"]').forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/[?&]body=/.test(href)) return;
      const match = href.match(/[?&]subject=([^&]*)/);
      const subject = match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
      const appName = (subject.split(/\s[—-]\s/)[0] || document.title || "this app").trim();
      const body = (/support@/.test(href)
          ? "Describe what went wrong — what you did, what you expected, and what actually happened:"
          : "Describe your idea or request:")
        + "\n\n\n\n─── details below help with troubleshooting ───\n"
        + `App: ${appName}\nBuild: ${BUILD_ID}\nPage: ${location.href}\nBrowser: ${navigator.userAgent}`;
      a.setAttribute("href", `${href}&body=${encodeURIComponent(body)}`);
    });
  }, []);
  return (
    <p className="build-stamp" style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.55, fontSize: "11px", margin: "4px 0 0" }}>
      Build {BUILD_ID}
      {visits !== null && ` · ${visits.toLocaleString()} visit${visits === 1 ? "" : "s"}`}
    </p>
  );
}

export default function CountItApp() {
  const [mode, setMode] = useState<AppMode>("practice");
  const [level, setLevel] = useState<LevelId>("level-2");
  const [scope, setScope] = useState<QuestionScope>("beat");
  const [showReference, setShowReference] = useState(true);
  const [practiceSeed, setPracticeSeed] = useState(INITIAL_SEED);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [challengeSeed, setChallengeSeed] = useState<string | number>(INITIAL_SEED + 100);
  const [session, setSession] = useState(() =>
    makeSession({ level: "level-2", scope: "beat", seed: INITIAL_SEED + 100, count: SESSION_LENGTH }),
  );
  const [personalBests, setPersonalBests] = useState<Record<string, number>>({});
  // An assignment comes from the LINK only, never from stored preferences — it
  // is something a teacher set, not something this browser remembers. It is
  // applied after mount so the server-rendered shell and the first client
  // render agree; the round it pins takes over immediately afterwards.
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  /** Exactly which controls the LINK pinned, as the parser reported them. */
  const [pinnedLocks, setPinnedLocks] = useState<readonly string[]>([]);
  /* Which published sequence step a link named. NOT a setting — it records
     which assignment this was and never reaches the generator. See
     src/sequence-step.ts on why that separation is enforced rather than
     assumed. */
  const [sequenceStep, setSequenceStep] = useState<SequenceStep | null>(null);
  const [linkError, setLinkError] = useState<AssignmentError | null>(null);
  const [studentId, setStudentId] = useState("");
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  /** Which run of this round the student is on. Reset by anything that builds a
   *  genuinely new round; incremented by a retry, which does not. */
  const [attempt, setAttempt] = useState(1);
  const [deviceVariant, setDeviceVariant] = useState("");

  const locked = useMemo(
    () => new Set<string>(assignment ? assignmentLocks(assignment, pinnedLocks) : []),
    [assignment, pinnedLocks],
  );
  const sessionLength = assignment?.count ?? SESSION_LENGTH;
  const assignedCells = assignment?.cells ?? undefined;
  const holdFeedback = assignment?.feedback === "end";
  /* A typed name wins over the per-browser string, so a teacher can reproduce a
     particular student's ordering; either way two students differ. */
  const variant = studentId.trim() || deviceVariant;
  /* Practice reveals the count for the same vocabulary the assignment is
     testing, and the challenge keeps its place while the tab is away — so it
     was an answer key a student could open mid-round. Closed until the round is
     done; free practice is untouched. */
  const practiceLocked = Boolean(assignment) && session.status !== "complete";
  /* The order is fixed once the first answer lands: changing it later would
     rebuild the round underneath a student who had already started it. */
  const identityLocked = Boolean(assignment) && session.responses.length > 0;

  useEffect(() => {
    // Deferred rather than applied inline, matching how this file already
    // loads stored bests: the lint rule that forbids a synchronous setState in
    // an effect is guarding against cascading renders, and an assignment sets
    // several pieces of state at once.
    const applyLink = window.setTimeout(() => {
      /* Read before the assignment is validated: a link that names a step and
         then fails validation is still evidence of which step was attempted,
         and refusing the round does not make the marker untrue. */
      setSequenceStep(parseSequenceStep(window.location.search));
      const result = parseAssignment(window.location.search);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      if (result.locked.length === 0 && result.assignment.name === null) return;
      const pinned = result.assignment;
      const seed = pinned.seed ?? INITIAL_SEED + 100;
      const device = readDeviceVariant();

      /* BUILT FIRST, applied second. This used to run the other way round: the
         banner, level, scope and pass mark were set, and then the round threw
         while being assembled — leaving the student answering the default round
         under the assignment's stated conditions, and the card reporting a goal
         for questions nobody asked. Validation now rejects the links that could
         do it, but the ordering is what makes the failure impossible rather
         than merely unlikely. */
      let round: ChallengeSession;
      try {
        round = makeSession({
          level: pinned.level,
          scope: pinned.scope,
          seed,
          count: pinned.count ?? SESSION_LENGTH,
          ...(pinned.cells ? { cells: pinned.cells } : {}),
          ...(device ? { variant: device } : {}),
        });
      } catch {
        setLinkError({
          code: "round",
          message:
            "This practice link describes a round Count It cannot put together. " +
            "Nothing about it has been applied.",
        });
        return;
      }

      setDeviceVariant(device);
      setAssignment(pinned);
      setPinnedLocks(result.locked);
      setLevel(pinned.level);
      setScope(pinned.scope);
      if (pinned.guide) setShowReference(pinned.guide === "on");
      // An assignment is a scored round by definition, so it opens in the
      // challenge rather than making a student find the tab.
      setMode("challenge");
      setChallengeSeed(seed);
      setSession(round);
    }, 0);

    return () => window.clearTimeout(applyLink);
  }, []);

  const practiceQuestions = useMemo(
    () => generateQuestions({ level, scope, count: 12, seed: practiceSeed, ...(assignedCells ? { cells: assignedCells } : {}) }),
    [assignedCells, level, practiceSeed, scope],
  );
  const practiceQuestion = practiceQuestions[practiceIndex % practiceQuestions.length];
  // A pooled round is its own achievement: "the rest-entry cells" is not
  // "level 2", and a best set on two rhythms must never be compared against one
  // set on the whole level. Keys written before assignments existed still match,
  // because the pool and guide parts are appended only when a link pinned them.
  const bestKey = [
    assignment?.cells ? `cells:${assignment.cells.join(",")}` : level,
    scope,
    assignment?.guide ? `guide:${assignment.guide}` : "",
  ].filter(Boolean).join(":");

  useEffect(() => {
    const loadSavedBests = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(BEST_KEY);
        if (saved) setPersonalBests(JSON.parse(saved) as Record<string, number>);
      } catch {
        // Personal bests are optional; the learning flow must remain available.
      }
    }, 0);

    return () => window.clearTimeout(loadSavedBests);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ level, scope, showReference }));
    } catch {
      // Preferences are harmless enhancements, not required application state.
    }
  }, [level, scope, showReference]);

  useEffect(() => {
    if (session.status !== "complete") return;
    const saveBest = window.setTimeout(() => {
      // Stamped once, when the round actually ends, so the card and its
      // verification code describe the moment the work finished rather than
      // the moment someone happened to look at it.
      setFinishedAt((current) => current ?? new Date());
      setPersonalBests((current) => {
        const nextScore = Math.max(current[bestKey] ?? 0, session.score);
        if (nextScore === current[bestKey]) return current;
        const next = { ...current, [bestKey]: nextScore };
        try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch { /* optional */ }
        return next;
      });
    }, 0);

    return () => window.clearTimeout(saveBest);
  }, [bestKey, session.score, session.status]);

  function nextSeedFrom(seed: string | number): string | number {
    return typeof seed === "number" ? seed + 1 : `${seed}-again`;
  }

  function resetForSettings(nextLevel: LevelId, nextScope: QuestionScope) {
    const nextSeed = nextSeedFrom(challengeSeed);
    setChallengeSeed(nextSeed);
    setPracticeSeed((seed) => seed + 1);
    setPracticeIndex(0);
    setRevealed(false);
    setFinishedAt(null);
    setAttempt(1);
    setSession(makeSession({
      level: nextLevel,
      scope: nextScope,
      seed: nextSeed,
      count: sessionLength,
      ...(assignedCells ? { cells: assignedCells } : {}),
      ...(assignment && variant ? { variant } : {}),
    }));
  }

  function changeLevel(nextLevel: LevelId) {
    setLevel(nextLevel);
    resetForSettings(nextLevel, scope);
  }

  function changeScope(nextScope: QuestionScope) {
    setScope(nextScope);
    resetForSettings(level, nextScope);
  }

  function nextPractice(direction: 1 | -1) {
    setPracticeIndex((index) => (index + direction + practiceQuestions.length) % practiceQuestions.length);
    setRevealed(false);
  }

  function newChallenge() {
    const nextSeed = nextSeedFrom(challengeSeed);
    setChallengeSeed(nextSeed);
    setFinishedAt(null);
    setAttempt(1);
    setSession(makeSession({
      level,
      scope,
      seed: nextSeed,
      count: sessionLength,
      ...(assignedCells ? { cells: assignedCells } : {}),
      ...(assignment && variant ? { variant } : {}),
    }));
  }

  /* A retry is the SAME round again, after its answers have been shown. It is
     therefore not a new attempt at an unseen task, and everything downstream
     has to be able to tell: the finish time is re-stamped (it used to keep the
     first run's, so two attempts could produce an identical verification code)
     and the attempt number goes up. */
  function retryChallenge() {
    setSession((current) => resetSession(current));
    setFinishedAt(null);
    setAttempt((current) => current + 1);
    setMode("challenge");
  }

  /* Rebuilds the round when the student names themselves before starting, so
     their answer order follows their name rather than the browser. Refused once
     an answer exists — the round cannot change underneath a started attempt. */
  function changeStudentId(value: string) {
    setStudentId(value);
    if (!assignment || session.responses.length > 0) return;
    const nextVariant = value.trim() || deviceVariant;
    if (!nextVariant) return;
    setSession(makeSession({
      level,
      scope,
      seed: challengeSeed,
      count: sessionLength,
      ...(assignedCells ? { cells: assignedCells } : {}),
      variant: nextVariant,
    }));
  }

  function advanceChallenge() {
    setSession((current) => advanceSession(current));
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#trainer">Skip to the trainer</a>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Count It home">
          <BrandMark />
          <span><strong>Count <em>It.</em></strong><small>by Backwerd Rhythm Shop</small></span>
        </a>
        <p>Free percussion tools that teach.</p>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Rhythm counting trainer</p>
            <h1 id="hero-title">See the rhythm.<br /><span>Say the count.</span></h1>
            <p>Build the connection between notation and spoken subdivision counting - one clear example at a time.</p>
          </div>
          <div className="hero-lesson" aria-label="How Count It works">
            <div><span>1</span><p><strong>Look</strong>Read the noteheads and rests.</p></div>
            <div><span>&</span><p><strong>Locate</strong>Find each sounding subdivision.</p></div>
            <div><span>✓</span><p><strong>Connect</strong>Say the matching count.</p></div>
          </div>
        </section>

        <div className="mode-wrap" id="trainer">
          <div className="mode-tabs" role="tablist" aria-label="Learning mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "practice"}
              className={`${mode === "practice" ? "is-active" : ""}${practiceLocked ? " is-locked" : ""}`}
              disabled={practiceLocked}
              onClick={() => setMode("practice")}
            >
              <span aria-hidden="true">◎</span>
              <strong>Practice</strong>
              <small>{practiceLocked ? "Opens when the round ends" : "Explore without a score"}</small>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "challenge"}
              className={mode === "challenge" ? "is-active" : ""}
              onClick={() => setMode("challenge")}
            >
              <span aria-hidden="true">◆</span><strong>Choose the Count</strong><small>Five-question challenge</small>
            </button>
          </div>

          {linkError && (
            // An invalid link fails loudly and stays failed: the app does not
            // guess what the teacher meant and quietly run something else.
            <p className="link-error" role="alert">
              <strong>This practice link cannot be used as written.</strong>
              <span>{linkError.message}</span>
              <small>Ask your teacher for an updated link. Everything below still works normally.</small>
            </p>
          )}

          {practiceLocked && (
            // Said out loud rather than left as a control that simply refuses
            // to move — the same courtesy the locked setup controls get.
            <p className="practice-locked-note" role="status">
              Practice reveals the counts for these rhythms, so it stays shut until this
              assigned round is finished.
            </p>
          )}

          <SetupControls
            level={level}
            scope={scope}
            showReference={showReference}
            assignment={assignment}
            locked={locked}
            studentId={studentId}
            identityLocked={identityLocked}
            onLevelChange={changeLevel}
            onScopeChange={changeScope}
            onReferenceChange={setShowReference}
            onStudentIdChange={changeStudentId}
          />

          {mode === "practice" ? (
            <PracticeMode
              prompt={practiceQuestion.prompt}
              explanation={practiceQuestion.explanation}
              index={practiceIndex}
              total={practiceQuestions.length}
              revealed={revealed}
              showReference={showReference}
              onReveal={() => setRevealed((value) => !value)}
              onPrevious={() => nextPractice(-1)}
              onNext={() => nextPractice(1)}
              onShuffle={() => {
                setPracticeSeed((seed) => seed + 1);
                setPracticeIndex(0);
                setRevealed(false);
              }}
            />
          ) : (
            <ChallengeMode
              session={session}
              level={level}
              scope={scope}
              showReference={showReference}
              personalBest={Math.max(personalBests[bestKey] ?? 0, session.status === "complete" ? session.score : 0)}
              assignment={assignment}
              sequenceStep={sequenceStep}
              studentId={studentId}
              finishedAt={finishedAt}
              holdFeedback={holdFeedback}
              attempt={attempt}
              onStudentIdChange={changeStudentId}
              onAnswer={(choiceId) => setSession((current) => answerSession(current, choiceId))}
              onAdvance={advanceChallenge}
              onRetry={retryChallenge}
              onNewSession={newChallenge}
            />
          )}
        </div>

        <section className="quick-lesson" aria-labelledby="lesson-title">
          <div><p className="eyebrow">Keep this in mind</p><h2 id="lesson-title">Count the notes that sound.</h2></div>
          <p>The complete grid keeps time underneath every rhythm. Your answer names only the positions where a note begins; rests and held space stay silent.</p>
        </section>
      </main>

      <footer className="site-footer">
        <div><strong>Count It.</strong><span>by <a className="shop-link" href="https://backwerdrhythmshop.com">Backwerd Rhythm Shop</a></span></div>
        <div className="foot-links">
          <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/">All free apps</a>
        <a className="foot-btn" href="https://guides.backwerdrhythmshop.com/count-it/">App guide</a>
          <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/" title="Counting Rhythms — a free, ordered set of ready-to-assign practice links">Teaching sequence</a>
          <a className="foot-btn" href="mailto:support@backwerdrhythmshop.com?subject=Count%20It%20%E2%80%94%20Support%20request">Report a problem</a>
          <a className="foot-btn" href="mailto:feedback@backwerdrhythmshop.com?subject=Count%20It%20%E2%80%94%20Feature%20request">Request a feature</a>
          <a className="foot-btn foot-ico" href="https://www.facebook.com/backwerdrhythmshop/" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on Facebook" title="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg></a>
          <a className="foot-btn foot-ico" href="https://www.instagram.com/backwerdrhythmshop/" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on Instagram" title="Instagram"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z"/></svg></a>
          <a className="foot-btn foot-ico" href="https://www.youtube.com/@backwerdrhythmshop" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on YouTube" title="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
        </div>
        <p>Standard American counting · 4/4 · Quarter, eighth, and sixteenth-note cells</p>
        <p>Forever free. No account required.<br />© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
        <BuildStamp />
      </footer>
      <SupportFallbackDialog />
    </div>
  );
}
