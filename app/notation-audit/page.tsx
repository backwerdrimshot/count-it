import type { Metadata } from "next";
import Link from "next/link";
import CountReference from "../CountReference";
import RhythmNotation from "../RhythmNotation";
import {
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_REVIEW_DATE,
  ENGRAVING_STANDARD_VERSION,
  ALL_RHYTHM_CELLS,
  EIGHTH_BEAT_CELLS,
  RHYTHM_CELLS,
  createBeatPrompt,
  createMeasurePrompt,
  getPromptAnswer,
} from "../../src/rhythm";

export const metadata: Metadata = {
  title: "Notation Audit | Count It",
  description: "Internal engraving review sheet for every supported Count It rhythm cell.",
};

const partialNames = ["Beat", "e", "&", "a"] as const;
/* An eighth beat has two positions, and its second one is the "&" — the same
   syllable as a quarter beat's halfway point, which is index 2 there. Naming
   token 1 of an eighth-beat cell "e" would have described the wrong half. */
const eighthPartialNames = ["Beat", "&"] as const;

/* The bars a reviewer has to see that no single-beat card can show: 3/8 beams
   across the whole measure, and whether a rest correctly breaks that beam is
   only visible in a bar that has one. Everything else on this sheet is one
   beat, which is exactly why the whole-bar rule went unreviewed. */
const MEASURE_AUDITS = [
  {
    id: "3-8-whole-bar",
    title: "3/8 — the whole bar beams as one group",
    cells: ["two-sixteenths", "two-sixteenths", "two-sixteenths"] as const,
    check: "Six sixteenths under ONE beam across the bar, not three beams of two.",
  },
  {
    id: "3-8-rest-breaks-beam",
    title: "3/8 — a rest still breaks the beam",
    cells: ["two-sixteenths", "rest-sixteenth", "two-sixteenths"] as const,
    check:
      "Two beam groups. The sixteenth rest ends the first run; the entering sixteenth after it " +
      "beams forward into the last beat.",
  },
  {
    id: "3-8-eighth-beats",
    title: "3/8 — three plain eighth beats",
    cells: ["eighth-beat", "eighth-beat", "eighth-beat"] as const,
    check: "Three eighths beamed together across the bar, and the 3/8 signature on the stave.",
  },
  {
    id: "3-4-stays-per-beat",
    title: "3/4 — beams stay inside the beat",
    cells: ["sixteenths", "sixteenths", "sixteenths"] as const,
    check: "Three separate four-note beam groups. 3/4 does NOT take the whole-bar exception.",
  },
] as const;

function formatBeamGroups(groups: readonly (readonly number[])[]): string {
  if (groups.length === 0) return "None";
  return groups.map((group) => `[${group.join(", ")}]`).join(" · ");
}

function formatPartialBeams(value: Readonly<Partial<Record<number, "left" | "right">>>): string {
  const entries = Object.entries(value);
  if (entries.length === 0) return "Automatic / none";
  return entries.map(([index, direction]) => `token ${index}: ${direction}`).join(" · ");
}

function formatToken(
  token: (typeof RHYTHM_CELLS)[number]["notation"]["tokens"][number],
  beatUnit: "4" | "8" = "4",
): string {
  const duration = token.duration === "4" ? "quarter" : token.duration === "8" ? "eighth" : "sixteenth";
  const dot = token.dots ? "dotted " : "";
  const names = beatUnit === "4" ? partialNames : eighthPartialNames;
  return `${dot}${duration} ${token.rest ? "rest" : "note"} at ${names[token.partial]}`;
}

export default function NotationAuditPage() {
  return (
    <main className="audit-shell">
      <header className="audit-header">
        <div>
          <p className="eyebrow">Internal engraving review</p>
          <h1>Count It notation audit</h1>
          <p>
            Every supported cell rendered from the production rhythm model, alongside its independent
            beam, dot, and partial-beam expectation.
          </p>
        </div>
        <Link href="/">Back to Count It</Link>
      </header>

      <section className="audit-status" aria-label="Audit status">
        <div><span>16</span><small>catalog cells</small></div>
        <div><span>16</span><small>rules checked</small></div>
        <div><span>1</span><small>dotted rhythm</small></div>
        <div><span>2</span><small>explicit partial-beam recipes</small></div>
        <p>
          <strong>Baseline {ENGRAVING_STANDARD_VERSION}</strong>
          Rules reviewed {ENGRAVING_REVIEW_DATE}. Independent musician sign-off remains a release gate.
        </p>
      </section>

      <section className="audit-principles" aria-labelledby="audit-principles-title">
        <div>
          <p className="eyebrow">Engraving contract</p>
          <h2 id="audit-principles-title">What this sheet protects</h2>
        </div>
        <ul>
          <li>Beams stay inside one quarter-note beat.</li>
          <li>Beginner examples do not beam across rests.</li>
          <li>Dotted duration is encoded, counted, and drawn as a real dot.</li>
          <li>Mixed eighth/sixteenth groups retain readable secondary beams.</li>
          <li>Notation, timing positions, and spoken count remain one model.</li>
        </ul>
      </section>

      <section className="audit-grid" aria-label="Rhythm-cell engraving review">
        {ALL_RHYTHM_CELLS.map((cell, index) => {
          const prompt = createBeatPrompt(cell, cell.beatUnit === "4" ? "4-4" : "3-8");
          const expectation = ENGRAVING_EXPECTATIONS[cell.id];
          return (
            <article
              className="audit-card"
              data-cell-id={cell.id}
              data-beam-groups={JSON.stringify(expectation.beamGroups)}
              data-dot-count={expectation.dottedTokenIndexes.length}
              data-partial-beam-count={Object.keys(expectation.partialBeamDirections).length}
              key={cell.id}
            >
              <div className="audit-card-heading">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="audit-id">{cell.id}</p>
                  <h2>{cell.label}</h2>
                  <p className="audit-beat-unit">
                    {cell.beatUnit === "4" ? "Quarter-note beat · 4/4 and 3/4" : "Eighth-note beat · 3/8"}
                  </p>
                </div>
                <strong>Rules checked</strong>
              </div>

              <div className="audit-notation">
                <RhythmNotation prompt={prompt} label={`${cell.label} engraving audit example.`} />
              </div>

              <div className="audit-reference">
                <span>Complete subdivision</span>
                <CountReference prompt={prompt} revealSounding />
              </div>

              <div className="audit-answer">
                <span>Verified count</span>
                <strong>{getPromptAnswer(prompt)}</strong>
              </div>

              <dl className="audit-details">
                <div><dt>Tokens</dt><dd>{cell.notation.tokens.map((token) => formatToken(token, cell.beatUnit)).join(" · ")}</dd></div>
                <div><dt>Beam groups</dt><dd>{formatBeamGroups(expectation.beamGroups)}</dd></div>
                <div><dt>Dotted tokens</dt><dd>{expectation.dottedTokenIndexes.length ? expectation.dottedTokenIndexes.join(", ") : "None"}</dd></div>
                <div><dt>Partial beams</dt><dd>{formatPartialBeams(expectation.partialBeamDirections)}</dd></div>
                <div><dt>Review rationale</dt><dd>{expectation.rationale}</dd></div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="audit-grid" aria-label="Measure-level engraving review">
        {MEASURE_AUDITS.map((audit) => {
          const prompt = createMeasurePrompt(
            [...audit.cells],
            audit.id.startsWith("3-8") ? "3-8" : "3-4",
          );
          return (
            <article className="audit-card" data-cell-id={audit.id} key={audit.id}>
              <div className="audit-card-heading">
                <span>BAR</span>
                <div>
                  <p className="audit-id">{audit.id}</p>
                  <h2>{audit.title}</h2>
                </div>
                <strong>Rules checked</strong>
              </div>
              <div className="audit-notation">
                <RhythmNotation prompt={prompt} label={`${audit.title} engraving audit example.`} />
              </div>
              <div className="audit-reference">
                <span>Complete subdivision</span>
                <CountReference prompt={prompt} revealSounding />
              </div>
              <div className="audit-answer">
                <span>Verified count</span>
                <strong>{getPromptAnswer(prompt)}</strong>
              </div>
              <dl className="audit-details">
                <div><dt>What to check</dt><dd>{audit.check}</dd></div>
              </dl>
            </article>
          );
        })}
      </section>

      <footer className="audit-footer">
        <strong>Human review checkpoint</strong>
        <p>
          Compare this sheet with a trusted engraved reference at desktop and classroom-display sizes.
          Record musician approval before treating the baseline as release-approved.
          The {EIGHTH_BEAT_CELLS.length} eighth-beat cells and the measure cards below them are NEW
          and have had no human visual review — the 3/8 whole-bar beam in particular is this app
          departing from its own per-beat house rule, and is the one thing on this sheet a reviewer
          should look at hardest.
        </p>
      </footer>
    </main>
  );
}
