"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseAssignment, serializeAssignment } from "../src/assignment";
import {
  CATALOG_SEQUENCES,
  entriesForSequence,
  type CatalogEntry,
} from "../src/assignment/catalog";
import { readAllAttempts } from "../src/attempt-tally";
import { PageFooter, PageHeader } from "./PageChrome";

/* The key this browser's attempt tally uses for a Count It step: the same string
   the trainer writes under when the round finishes (tests/catalog.test.ts holds
   it equal to the site's own link). Eight Time keeps its own storage on its own
   origin, so its steps carry no tally here. */
function tallyKey(entry: CatalogEntry): string | null {
  if (entry.app !== "count-it") return null;
  const parsed = parseAssignment(entry.query);
  return parsed.ok ? serializeAssignment(parsed.assignment) : null;
}

function triedText(count: number): string {
  if (count === 0) return "Not finished on this device yet.";
  return `Finished ${count} ${count === 1 ? "time" : "times"} on this device.`;
}

export default function AssignmentCatalog() {
  /* null until the page is in a browser: localStorage is not there for the server
     render, and showing "not finished" before it is read would be a claim. */
  const [attempts, setAttempts] = useState<Record<string, number> | null>(null);
  /* `field` is set only when the browser refused to copy: then the link is shown
     in a field to select by hand, which is the one thing that always works. */
  const [copied, setCopied] = useState<{ id: string; text: string; field: boolean } | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const fallbackField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setAttempts(readAllAttempts()), 0);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(copyTimer.current);
    };
  }, []);

  const keys = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const sequence of CATALOG_SEQUENCES) {
      for (const entry of entriesForSequence(sequence.id)) map.set(entry.id, tallyKey(entry));
    }
    return map;
  }, []);

  /* When the fallback field appears, put the cursor in it with the link selected. */
  useEffect(() => {
    if (copied?.field) {
      fallbackField.current?.focus();
      fallbackField.current?.select();
    }
  }, [copied]);

  async function copyLink(entry: CatalogEntry) {
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(entry.link);
      setCopied({ id: entry.id, text: "Copied. Paste it wherever you post assignments.", field: false });
      copyTimer.current = window.setTimeout(() => setCopied(null), 6000);
    } catch {
      /* Some school browsers refuse clipboard access from a page. Leave the field
         up (no timer): taking it away while someone is still pressing Ctrl+C
         would be unkind. */
      setCopied({ id: entry.id, text: "Your browser would not copy it for you. The link is selected below — press Ctrl+C (or ⌘C).", field: true });
    }
  }

  return (
    <div className="builder-shell">
      <a className="skip-link" href="#catalog">Skip to the assignments</a>
      <PageHeader />

      <main className="builder-main" id="catalog">
        <div className="builder-intro">
          <p className="eyebrow">For teachers</p>
          <h1>Assignments</h1>
          <p>
            Every published step of the two teaching sequences that run in Count It and its sibling Eight Time.
            Try one the way a student will see it, copy its link for Google Classroom or Canvas, or open it in the
            builder and change what you need. They are all free, and nothing about a student is stored.
          </p>
          <p className="catalog-lede-link">
            Want your own rhythms or a quiz? <a href="/build">Build an assignment</a>.
          </p>
        </div>

        {CATALOG_SEQUENCES.map((sequence) => {
          const entries = entriesForSequence(sequence.id);
          return (
            <section key={sequence.id} className="catalog-sequence" aria-labelledby={`seq-${sequence.id}`}>
              <h2 id={`seq-${sequence.id}`}>{sequence.name}</h2>
              <p className="catalog-blurb">
                {sequence.blurb}{" "}
                <a href={sequence.url} target="_blank" rel="noopener noreferrer">About the sequence</a>
              </p>
              <ol className="catalog-list">
                {entries.map((entry) => {
                  const key = keys.get(entry.id) ?? null;
                  const href = entry.app === "count-it" ? `/${entry.query}` : entry.link;
                  return (
                    <li key={entry.id} className="catalog-card" id={entry.id}>
                      <div className="catalog-step" aria-hidden="true">{entry.step}</div>
                      <div className="catalog-body">
                        <h3>
                          <span className="builder-visually-hidden">Step {entry.step}: </span>
                          {entry.title}
                          {entry.app === "eight-time" && <span className="catalog-badge">Opens in Eight Time</span>}
                        </h3>
                        <p className="catalog-focus">{entry.focus}</p>
                        <p className="catalog-summary">{entry.summary}</p>
                        {key !== null && attempts !== null && (
                          <p className="catalog-status">{triedText(attempts[key] ?? 0)}</p>
                        )}
                        <div className="catalog-actions">
                          <a className="primary-button" href={href} aria-label={`Try step ${entry.step}: ${entry.title}`}>
                            Try it
                          </a>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => copyLink(entry)}
                            aria-label={`Copy the link for step ${entry.step}: ${entry.title}`}
                          >
                            Copy link
                          </button>
                          {entry.presetId && (
                            <a
                              className="quiet-button"
                              href={`/build?from=${entry.presetId}`}
                              aria-label={`Customize step ${entry.step}: ${entry.title} in the builder`}
                            >
                              Customize in builder
                            </a>
                          )}
                        </div>
                        <p className="builder-copied" role="status" aria-live="polite">
                          {copied?.id === entry.id ? copied.text : ""}
                        </p>
                        {copied?.id === entry.id && copied.field && (
                          <label className="builder-linkbox catalog-linkbox">
                            <span className="builder-visually-hidden">Link for step {entry.step}: {entry.title}</span>
                            <input ref={fallbackField} type="text" readOnly value={entry.link} />
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        <p className="builder-fine">
          Free, logged out, on any device. Scores report accuracy under stated conditions — never speed. The pass
          mark is shown on the result card and never enforced.
        </p>
      </main>

      <PageFooter page="assignments" feedbackSubject="Count It — Assignments feedback" />
    </div>
  );
}
