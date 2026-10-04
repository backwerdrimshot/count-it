"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDER_CELLS,
  BUILDER_LEVELS,
  BUILDER_METERS,
  MAX_NAME_LENGTH,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  PRODUCTION_ORIGIN,
  applyQuiz,
  cellsForLevel,
  evaluateBuilder,
  makeSeed,
  type BuilderState,
  type Vocabulary,
} from "../src/assignment/builder";
import {
  COUNTING_RHYTHMS_SEQUENCE_URL,
  COUNTING_RHYTHMS_STEPS,
  RHYTHMS_IN_THREE_SEQUENCE_URL,
  RHYTHMS_IN_THREE_STEPS,
  getPreset,
} from "../src/assignment/presets";
import type { MeterId } from "../src/rhythm";
import { PageFooter, PageHeader } from "./PageChrome";

type VocabularyKind = Vocabulary["kind"];

/* "" in a select means "leave this to the student" (or the app's own default
   for a control the student does not have). It is never written into the link:
   an unpinned control must stay unpinned. */
function orNull<T extends string>(value: string): T | null {
  return value === "" ? null : (value as T);
}

/* A number box that is empty means "not set". Anything else is passed on as it
   was typed, including a fraction: the builder says so in words, where silently
   rounding it would hand the teacher a different assignment than they wrote. */
function numberOrNull(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const GROUPS: readonly { readonly level: 0 | 1 | 2 | 3; readonly title: string; readonly hint?: string }[] = [
  { level: 1, title: "Level 1 — Pulse & pairs" },
  { level: 2, title: "Level 2 — Eighth-note placement" },
  { level: 3, title: "Level 3 — Sixteenth cells" },
  {
    level: 0,
    title: "Held notes",
    hint: "Last longer than one beat, so they need full measures.",
  },
];

/* What a starting point does about the meter. Counting Rhythms' published links
   leave it to the student and the preset pins it; Rhythms in Three's already
   name it. */
function meterNote(published: MeterId | null, meter: MeterId | null): string {
  const label = BUILDER_METERS.find((option) => option.id === meter)?.label ?? "";
  return published === null
    ? `The meter is pinned to ${label}.`
    : `The meter is ${label}, as the step publishes it.`;
}

export default function AssignmentBuilder() {
  const [name, setName] = useState("");
  const [vocabKind, setVocabKind] = useState<VocabularyKind>("level");
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [cells, setCells] = useState<readonly string[]>(() => cellsForLevel(2));
  const [scope, setScope] = useState<"beat" | "measure" | null>("beat");
  const [meter, setMeter] = useState<MeterId | null>("4-4");
  const [guide, setGuide] = useState<"on" | "off" | null>("on");
  const [feedback, setFeedback] = useState<"each" | "end" | null>(null);
  const [retry, setRetry] = useState<"free" | "reseed" | "off" | null>(null);
  const [countText, setCountText] = useState("10");
  const [passText, setPassText] = useState("8");
  const [seed, setSeed] = useState("");
  const [presetId, setPresetId] = useState("");
  const [origin, setOrigin] = useState(PRODUCTION_ORIGIN);
  const [copyMessage, setCopyMessage] = useState("");
  const [quizMessage, setQuizMessage] = useState("");
  const linkField = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  const vocabulary: Vocabulary = useMemo(() => {
    if (vocabKind === "level") return { kind: "level", level };
    if (vocabKind === "cells") return { kind: "cells", cells };
    return { kind: "student" };
  }, [vocabKind, level, cells]);

  const state: BuilderState = useMemo(
    () => ({
      name,
      vocabulary,
      scope,
      meter,
      guide,
      feedback,
      retry,
      count: numberOrNull(countText),
      passing: numberOrNull(passText),
      seed: seed.trim(),
    }),
    [name, vocabulary, scope, meter, guide, feedback, retry, countText, passText, seed],
  );

  /* Everything the teacher sees about the link comes from the app's own parser. */
  const result = useMemo(() => evaluateBuilder(state, origin), [state, origin]);

  const heldNotesAllowed = scope === "measure";

  /* Fill every field from a published teaching-sequence step, exactly as the
     sequence page publishes it (the presets' own test holds the published
     links verbatim). Everything stays editable afterwards. Choosing "my own
     choices" leaves the form as it is rather than wiping it. */
  const applyPreset = useCallback((id: string) => {
    setPresetId(id);
    const preset = getPreset(id);
    if (!preset) return;
    const next = preset.state;
    setName(next.name);
    setVocabKind(next.vocabulary.kind);
    if (next.vocabulary.kind === "level") setLevel(next.vocabulary.level);
    if (next.vocabulary.kind === "cells") setCells(next.vocabulary.cells);
    setScope(next.scope);
    setMeter(next.meter);
    setGuide(next.guide);
    setFeedback(next.feedback);
    setRetry(next.retry);
    setCountText(next.count === null ? "" : String(next.count));
    setPassText(next.passing === null ? "" : String(next.passing));
    setSeed(next.seed);
  }, []);

  /* The seed is random and the origin is the page's own, and neither is known on
     the server — so they are filled in once the page is in a browser, rather
     than during the render, which would make the server's HTML and the
     browser's disagree. A link from the assignments page (`?from=<step id>`)
     starts the form from that step instead, keeping the step's own seed. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      setOrigin(window.location.origin);
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && getPreset(from)) applyPreset(from);
      else setSeed((current) => current || makeSeed(Math.random));
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(copyTimer.current);
    };
  }, [applyPreset]);

  const chosenPreset = getPreset(presetId);

  /* "Make this a quiz" applies the rule in src/assignment/builder.ts (applyQuiz,
     tested there) and says what it did. The message is shown only while the form
     still matches it, so it cannot go on claiming a hidden guide after the
     teacher turned the guide back on. */
  const isQuiz = guide === "off" && feedback === "end" && retry === "off";
  function makeQuiz() {
    const next = applyQuiz(state);
    setGuide(next.guide);
    setFeedback(next.feedback);
    setRetry(next.retry);
    setCountText(next.count === null ? "" : String(next.count));
    setPassText(next.passing === null ? "" : String(next.passing));
    const oncePerRhythm = state.vocabulary.kind === "cells" && state.scope === "beat" && state.vocabulary.cells.length >= 2;
    setQuizMessage(
      oncePerRhythm
        ? `Quiz settings applied: guide hidden, answers held to the end, one attempt, and ${next.count} questions — one for each rhythm you ticked.`
        : "Quiz settings applied: guide hidden, answers held to the end, one attempt. Your question count and pass mark are unchanged.",
    );
  }

  function changeScope(next: "beat" | "measure" | null) {
    setScope(next);
    /* A held note cannot be asked as a one-beat question. Rather than leave a
       ticked box that the form has just disabled — which would still be in the
       link and still be refused — drop them. */
    if (next !== "measure") {
      setCells((current) => current.filter((id) => BUILDER_CELLS.find((cell) => cell.id === id)?.beats === 1));
    }
  }

  function toggleCell(id: string, checked: boolean) {
    setCells((current) => (checked ? [...current, id] : current.filter((existing) => existing !== id)));
  }

  async function copyLink() {
    if (!result.ok) return;
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(result.link);
      setCopyMessage("Copied. Paste it wherever you post assignments.");
    } catch {
      /* Some school browsers refuse clipboard access from a page. The link is
         still on screen, so select it for the teacher and say what to press. */
      linkField.current?.focus();
      linkField.current?.select();
      setCopyMessage("Your browser would not copy it for you. The link is selected — press Ctrl+C (or ⌘C).");
    }
    copyTimer.current = window.setTimeout(() => setCopyMessage(""), 6000);
  }

  return (
    <div className="builder-shell">
      <a className="skip-link" href="#builder-form">Skip to the form</a>
      <PageHeader />

      <main className="builder-main">
        <div className="builder-intro">
          <p className="eyebrow">For teachers</p>
          <h1>Build an assignment</h1>
          <p>
            Choose what your students practise and Count It writes a link that pins it. Every student who opens
            the link gets the same questions under the same conditions, and the result card they copy out says
            what those conditions were. Nothing about a student is stored.
          </p>
        </div>

        <div className="builder-grid">
          <form
            id="builder-form"
            className="builder-form"
            aria-label="Assignment settings"
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className="builder-group">
              <legend>Start from a step <small>optional</small></legend>
              <label className="level-control">
                <span className="builder-visually-hidden">Teaching-sequence step to start from</span>
                <select value={presetId} onChange={(event) => applyPreset(event.target.value)}>
                  <option value="">My own choices</option>
                  <optgroup label="Counting Rhythms — 4/4">
                    {COUNTING_RHYTHMS_STEPS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        Step {preset.step}: {preset.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Rhythms in Three — 3/4">
                    {RHYTHMS_IN_THREE_STEPS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        Step {preset.step}: {preset.title}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <small>
                  {chosenPreset
                    ? `${chosenPreset.focus}. ${chosenPreset.state.count} questions, pass at ${chosenPreset.state.passing}. Change anything below.`
                    : "The steps of Counting Rhythms and Rhythms in Three that run in Count It, filled in as published. Change anything after."}
                  {" "}
                  <a
                    href={chosenPreset?.sequence === "rhythms-in-three" ? RHYTHMS_IN_THREE_SEQUENCE_URL : COUNTING_RHYTHMS_SEQUENCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    About the sequence
                  </a>
                </small>
              </label>
              {chosenPreset && (
                <p className="builder-preset-note">
                  This keeps the step&rsquo;s own seed, so your class runs the same questions as the published
                  step and scores stay comparable. {meterNote(chosenPreset.publishedMeter, chosenPreset.state.meter)}{" "}
                  Press &ldquo;New seed&rdquo; for different questions.
                </p>
              )}
            </fieldset>

            <fieldset className="builder-group">
              <legend>Quiz <small>optional</small></legend>
              <button type="button" className="quiet-button" onClick={makeQuiz}>Make this a quiz</button>
              <small className="builder-quiz-note">
                Hides the guide, holds the answers to the end and allows one attempt. With &ldquo;Pick the
                rhythms&rdquo; and one beat, it asks each ticked rhythm once. It is a quick knowledge check, not
                secure testing: one attempt can&rsquo;t stop a page reload, and the pass mark is shown on the card but
                never enforced.
              </small>
              <p className="builder-quiz-status" role="status" aria-live="polite">{isQuiz ? quizMessage : ""}</p>
            </fieldset>

            <fieldset className="builder-group">
              <legend>Name <small>optional</small></legend>
              <label className="builder-field">
                <span className="builder-visually-hidden">Assignment name</span>
                <input
                  type="text"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder="Step 3 — Pulse & pairs, no help"
                  onChange={(event) => setName(event.target.value)}
                />
                <small>Shown to students at the top and on their result card.</small>
              </label>
            </fieldset>

            <fieldset className="builder-group">
              <legend>What are they reading?</legend>
              <div className="builder-choices" role="radiogroup" aria-label="Rhythm vocabulary">
                {([
                  ["level", "A level", "Everything up to that level."],
                  ["cells", "Pick the rhythms", "Exactly the rhythms you tick — nothing else."],
                  ["student", "Let the student choose", "Pins nothing; their own level control decides."],
                ] as const).map(([kind, title, hint]) => (
                  <label key={kind} className={`builder-choice${vocabKind === kind ? " is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="vocabulary"
                      value={kind}
                      checked={vocabKind === kind}
                      onChange={() => setVocabKind(kind)}
                    />
                    <span><strong>{title}</strong><small>{hint}</small></span>
                  </label>
                ))}
              </div>

              {vocabKind === "level" && (
                <label className="level-control builder-sub">
                  <span>Level</span>
                  <select value={level} onChange={(event) => setLevel(Number(event.target.value) as 1 | 2 | 3)}>
                    {BUILDER_LEVELS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <small>{BUILDER_LEVELS.find((option) => option.id === level)?.description}</small>
                </label>
              )}

              {vocabKind === "cells" && (
                <div className="builder-sub">
                  <div className="builder-quick" role="group" aria-label="Start from a level">
                    <span>Start from</span>
                    {([1, 2, 3] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="quiet-button"
                        onClick={() => setCells(cellsForLevel(option))}
                      >
                        Level {option}
                      </button>
                    ))}
                    <button type="button" className="quiet-button" onClick={() => setCells([])}>Clear</button>
                  </div>
                  {GROUPS.map((group) => {
                    const members = BUILDER_CELLS.filter((cell) => cell.level === group.level);
                    const disabled = group.level === 0 && !heldNotesAllowed;
                    return (
                      <fieldset key={group.level} className="builder-cells" disabled={disabled}>
                        <legend>{group.title}</legend>
                        {group.hint && (
                          <p className="builder-cells-hint">
                            {disabled ? "Choose “One measure” below to use these. " : ""}{group.hint}
                          </p>
                        )}
                        <ul>
                          {members.map((cell) => (
                            <li key={cell.id}>
                              <label className="builder-cell">
                                <input
                                  type="checkbox"
                                  checked={cells.includes(cell.id)}
                                  onChange={(event) => toggleCell(cell.id, event.target.checked)}
                                />
                                <span>
                                  <strong>{cell.label}</strong>
                                  <small>
                                    {cell.count === "silent" ? "silent" : <>counts <code>{cell.count}</code></>}
                                    {cell.beats > 1 ? ` · ${cell.beats} beats` : ""}
                                  </small>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </fieldset>
                    );
                  })}
                  <p className="builder-count" aria-live="polite">
                    {cells.length} rhythm{cells.length === 1 ? "" : "s"} chosen
                  </p>
                </div>
              )}
            </fieldset>

            <fieldset className="builder-group">
              <legend>Question size and meter</legend>
              <div className="builder-pair">
                <label className="level-control">
                  <span>Question size</span>
                  <select value={scope ?? ""} onChange={(event) => changeScope(orNull<"beat" | "measure">(event.target.value))}>
                    <option value="">Student chooses</option>
                    <option value="beat">One beat</option>
                    <option value="measure">One measure</option>
                  </select>
                  <small>A measure is a whole bar read at once.</small>
                </label>
                <label className="level-control">
                  <span>Meter</span>
                  <select value={meter ?? ""} onChange={(event) => setMeter(orNull<MeterId>(event.target.value))}>
                    <option value="">Student chooses</option>
                    {BUILDER_METERS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <small>The beat is a quarter note in every one.</small>
                </label>
              </div>
            </fieldset>

            <fieldset className="builder-group">
              <legend>Support and feedback</legend>
              <div className="builder-triple">
                <label className="level-control">
                  <span>Subdivision guide</span>
                  <select value={guide ?? ""} onChange={(event) => setGuide(orNull<"on" | "off">(event.target.value))}>
                    <option value="">Student chooses</option>
                    <option value="on">Visible</option>
                    <option value="off">Hidden</option>
                  </select>
                  <small>The 1 e &amp; a grid under the notation.</small>
                </label>
                <label className="level-control">
                  <span>Answers shown</span>
                  <select value={feedback ?? ""} onChange={(event) => setFeedback(orNull<"each" | "end">(event.target.value))}>
                    <option value="">After each question</option>
                    <option value="each">After each question (pinned)</option>
                    <option value="end">Held to the end</option>
                  </select>
                  <small>Holding them back makes it an assessment.</small>
                </label>
                <label className="level-control">
                  <span>Trying again</span>
                  <select value={retry ?? ""} onChange={(event) => setRetry(orNull<"free" | "reseed" | "off">(event.target.value))}>
                    <option value="">The same round</option>
                    <option value="reseed">New questions each time</option>
                    <option value="off">One attempt</option>
                  </select>
                  <small>One attempt can’t stop a page reload.</small>
                </label>
              </div>
            </fieldset>

            <fieldset className="builder-group">
              <legend>Length and goal</legend>
              <div className="builder-pair">
                <label className="level-control">
                  <span>Questions</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_QUESTIONS}
                    max={MAX_QUESTIONS}
                    value={countText}
                    placeholder="5"
                    onChange={(event) => setCountText(event.target.value)}
                  />
                  <small>{MIN_QUESTIONS}–{MAX_QUESTIONS}. Blank means 5.</small>
                </label>
                <label className="level-control">
                  <span>Pass mark</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_QUESTIONS}
                    value={passText}
                    placeholder="none"
                    onChange={(event) => setPassText(event.target.value)}
                  />
                  <small>Correct answers needed. Shown on the card, never enforced.</small>
                </label>
              </div>
              <div className="builder-seed">
                <label className="level-control">
                  <span>Seed</span>
                  <input
                    type="text"
                    value={seed}
                    maxLength={40}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="none"
                    onChange={(event) => setSeed(event.target.value)}
                  />
                  <small>The same seed gives every student the same questions.</small>
                </label>
                <button type="button" className="quiet-button" onClick={() => setSeed(makeSeed(Math.random))}>
                  New seed
                </button>
              </div>
            </fieldset>
          </form>

          <aside className="builder-output" aria-labelledby="builder-link-title">
            <h2 id="builder-link-title">Your link</h2>
            {result.ok ? (
              <>
                <p className="builder-summary">{result.summary}</p>
                <label className="builder-linkbox">
                  <span className="builder-visually-hidden">Assignment link</span>
                  <input
                    ref={linkField}
                    type="text"
                    readOnly
                    value={result.link}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </label>
                <div className="builder-actions">
                  <button type="button" className="primary-button" onClick={copyLink}>Copy link</button>
                  <a className="secondary-button" href={result.link} target="_blank" rel="noopener noreferrer">
                    Try it as a student
                  </a>
                </div>
                <p className="builder-copied" role="status" aria-live="polite">{copyMessage}</p>
                {result.notes.length > 0 && (
                  <ul className="builder-notes" aria-label="Worth knowing">
                    {result.notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <div className="builder-problem" role="alert">
                <strong>This can’t be a link yet.</strong>
                <p>{result.problem}</p>
              </div>
            )}
            <p className="builder-fine">
              The link opens Count It already set up. A student can’t change anything you pinned, and nothing
              they do leaves their device.
            </p>
          </aside>
        </div>
      </main>

      <PageFooter page="build" feedbackSubject="Count It — Assignment builder feedback" />
    </div>
  );
}
