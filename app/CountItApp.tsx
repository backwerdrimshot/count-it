"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CountReference from "./CountReference";
import RhythmNotation from "./RhythmNotation";
import SupportFallbackDialog from "./SupportFallbackDialog";
import {
  LEVELS,
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

type AppMode = "practice" | "challenge";

const SESSION_LENGTH = 5;
const INITIAL_SEED = 20260715;
const BEST_KEY = "count-it-personal-bests-v1";
const PREFERENCES_KEY = "count-it-preferences-v1";
const BUILD_ID = "2026-08-01.7";

function makeSession(level: LevelId, scope: QuestionScope, seed: number): ChallengeSession {
  return createSession(generateQuestions({ level, scope, count: SESSION_LENGTH, seed }));
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span>1</span><i /><i /><i />
    </span>
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
  onLevelChange,
  onScopeChange,
  onReferenceChange,
}: {
  level: LevelId;
  scope: QuestionScope;
  showReference: boolean;
  onLevelChange: (value: LevelId) => void;
  onScopeChange: (value: QuestionScope) => void;
  onReferenceChange: (value: boolean) => void;
}) {
  return (
    <section className="setup-panel" aria-labelledby="setup-title">
      <div className="setup-heading">
        <p className="eyebrow">Set your focus</p>
        <h2 id="setup-title">What do you want to read?</h2>
      </div>
      <label className="level-control">
        <span>Beginner level</span>
        <select value={level} onChange={(event) => onLevelChange(event.target.value as LevelId)}>
          {LEVELS.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
        <small>{getLevel(level).description}</small>
      </label>
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
          onChange={(event) => onReferenceChange(event.target.checked)}
        />
        <span aria-hidden="true" />
        <strong>Subdivision guide</strong>
        <small>Show the complete {scope === "beat" ? "1 e & a" : "measure grid"}.</small>
      </label>
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
    return (
      <section className="trainer-card result-card" aria-labelledby="result-title">
        <div className="result-badge" aria-hidden="true"><span>{accuracy}%</span></div>
        <p className="eyebrow">Session complete</p>
        <h2 id="result-title" tabIndex={-1} ref={resultHeading}>You counted {session.score} of {session.questions.length} correctly.</h2>
        <p className="result-message">{resultMessage}</p>
        <dl className="result-stats">
          <div><dt>Score</dt><dd>{session.score}/{session.questions.length}</dd></div>
          <div><dt>Accuracy</dt><dd>{accuracy}%</dd></div>
          <div><dt>Personal best</dt><dd>{personalBest}/{session.questions.length}</dd></div>
        </dl>
        <div className="result-actions">
          <button type="button" className="secondary-button" onClick={onRetry}>Retry this set</button>
          <button type="button" className="primary-button" onClick={onNewSession}>New randomized session <span aria-hidden="true">↻</span></button>
        </div>
        <p className="result-footnote">{getLevel(level).shortName} · {scope === "beat" ? "one-beat" : "one-measure"} questions</p>
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
          <span>Score <strong>{session.score}</strong> · Accuracy <strong>{accuracy}%</strong></span>
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
            <small>{response ? "Sounding positions are highlighted." : getCompleteReference(scope)}</small>
          </div>
          <CountReference prompt={question.prompt} revealSounding={Boolean(response)} />
        </div>
      )}
      <div className="answer-grid" aria-label="Answer choices">
        {question.choices.map((choice, index) => {
          const isSelected = response?.choiceId === choice.id;
          const classNames = [
            "answer-choice",
            response && choice.isCorrect ? "is-correct" : "",
            response && isSelected && !choice.isCorrect ? "is-incorrect" : "",
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
              {response && choice.isCorrect && <span className="choice-result">Correct</span>}
              {response && isSelected && !choice.isCorrect && <span className="choice-result">Your choice</span>}
            </button>
          );
        })}
      </div>
      <div className={`feedback-panel ${!response ? "is-waiting" : response.correct ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
        {!response ? (
          <p><strong>Choose one answer.</strong>You can also press 1, 2, 3, or 4.</p>
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
  const [challengeSeed, setChallengeSeed] = useState(INITIAL_SEED + 100);
  const [session, setSession] = useState(() => makeSession("level-2", "beat", INITIAL_SEED + 100));
  const [personalBests, setPersonalBests] = useState<Record<string, number>>({});

  const practiceQuestions = useMemo(
    () => generateQuestions({ level, scope, count: 12, seed: practiceSeed }),
    [level, practiceSeed, scope],
  );
  const practiceQuestion = practiceQuestions[practiceIndex % practiceQuestions.length];
  const bestKey = `${level}:${scope}`;

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

  function resetForSettings(nextLevel: LevelId, nextScope: QuestionScope) {
    const nextSeed = challengeSeed + 1;
    setChallengeSeed(nextSeed);
    setPracticeSeed((seed) => seed + 1);
    setPracticeIndex(0);
    setRevealed(false);
    setSession(makeSession(nextLevel, nextScope, nextSeed));
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
    const nextSeed = challengeSeed + 1;
    setChallengeSeed(nextSeed);
    setSession(makeSession(level, scope, nextSeed));
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
              className={mode === "practice" ? "is-active" : ""}
              onClick={() => setMode("practice")}
            >
              <span aria-hidden="true">◎</span><strong>Practice</strong><small>Explore without a score</small>
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

          <SetupControls
            level={level}
            scope={scope}
            showReference={showReference}
            onLevelChange={changeLevel}
            onScopeChange={changeScope}
            onReferenceChange={setShowReference}
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
              onAnswer={(choiceId) => setSession((current) => answerSession(current, choiceId))}
              onAdvance={advanceChallenge}
              onRetry={() => setSession((current) => resetSession(current))}
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
        <a className="foot-btn" href="https://backwerdrhythmshop.com/app-guides/count-it">App guide</a>
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
