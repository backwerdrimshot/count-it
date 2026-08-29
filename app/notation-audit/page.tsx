import type { Metadata } from "next";
import Link from "next/link";
import CountReference from "../CountReference";
import RhythmNotation from "../RhythmNotation";
import {
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_REVIEW_DATE,
  ENGRAVING_STANDARD_VERSION,
  ALL_RHYTHM_CELLS,
  RHYTHM_CELLS,
  createBeatPrompt,
  createMeasurePrompt,
  getPromptAnswer,
  METERS,
} from "../../src/rhythm";

export const metadata: Metadata = {
  title: "Notation Audit | Count It",
  description: "Internal engraving review sheet for every supported Count It rhythm cell.",
};


/* Which meters a card's notation is actually reviewed against.
 *
 * This read a static "Quarter-note beat · 4/4 and 3/4", which was true for the
 * sixteen one-beat cells and false the moment a cell could SPAN beats. A whole
 * note is four of them, so it cannot appear in 3/4 at all — and the whole-note
 * card told a reviewer they were signing off on 3/4 engraving that the app
 * refuses to generate. An audit sheet that overstates its own scope is the one
 * document where that costs the most.
 *
 * Derived from the meters themselves now: a cell fits a meter when its span is
 * not longer than the bar. A third meter is described correctly the day it is
 * added. */
function meterScope(cell: { readonly beats: number }): string {
  const fits = Object.values(METERS).filter(
    (meter) => cell.beats <= meter.beatsPerMeasure,
  );
  const names = fits.map((meter) => meter.label);
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `Quarter-note beat · ${list}`;
}

const partialNames = ["Beat", "e", "&", "a"] as const;

/* The bars a reviewer has to see that no single-beat card can show: the
   per-beat rule is only visible in a bar with more than one beamable beat. */
const MEASURE_AUDITS = [
  {
    id: "3-4-stays-per-beat",
    title: "3/4 — beams stay inside the beat",
    cells: ["sixteenths", "sixteenths", "sixteenths"] as const,
    check: "Three separate four-note beam groups — a beam never crosses a beat.",
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
): string {
  const duration = token.duration === "4" ? "quarter" : token.duration === "8" ? "eighth" : "sixteenth";
  const dot = token.dots ? "dotted " : "";
  return `${dot}${duration} ${token.rest ? "rest" : "note"} at ${partialNames[token.partial]}`;
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
        <div><span>{ALL_RHYTHM_CELLS.length}</span><small>catalog cells</small></div>
        <div><span>{ALL_RHYTHM_CELLS.length}</span><small>rules checked</small></div>
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
          /* A spanning cell cannot be a one-beat prompt, so it is shown in the
             smallest bar that holds it: a half note plus two quarters, a whole
             note alone. The card is still about the cell's own engraving. */
          const meter = "4-4";
          const filler = 4 - cell.beats;
          const prompt = cell.beats === 1
            ? createBeatPrompt(cell, meter)
            : createMeasurePrompt([cell, ...Array.from({ length: filler }, () => "quarter")], meter);
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
                  <p className="audit-beat-unit">{meterScope(cell)}</p>
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
                <div><dt>Tokens</dt><dd>{cell.notation.tokens.map((token) => formatToken(token)).join(" · ")}</dd></div>
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
          const prompt = createMeasurePrompt([...audit.cells], "3-4");
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
        </p>
      </footer>
    </main>
  );
}
