"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CountReference from "./CountReference";
import RhythmNotation from "./RhythmNotation";
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
        <div><strong>Count It.</strong><span>by Backwerd Rhythm Shop</span></div>
        <div className="foot-links">
          <a className="foot-btn" href="mailto:support@backwerdrhythmshop.com?subject=Count%20It%20%E2%80%94%20Support%20request">Report a problem</a>
          <a className="foot-btn" href="mailto:feedback@backwerdrhythmshop.com?subject=Count%20It%20%E2%80%94%20Feature%20request">Request a feature</a>
        </div>
        <p>Standard American counting · 4/4 · Quarter, eighth, and sixteenth-note cells</p>
        <p>Forever free. No account required.<br />© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
