import type { Metadata } from "next";
import Link from "next/link";
import CountReference from "../CountReference";
import RhythmNotation from "../RhythmNotation";
import {
  ENGRAVING_EXPECTATIONS,
  ENGRAVING_REVIEW_DATE,
  ENGRAVING_STANDARD_VERSION,
  RHYTHM_CELLS,
  createBeatPrompt,
  getPromptAnswer,
} from "../../src/rhythm";

export const metadata: Metadata = {
  title: "Notation Audit | Count It",
  description: "Internal engraving review sheet for every supported Count It rhythm cell.",
};

const partialNames = ["Beat", "e", "&", "a"] as const;

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
        {RHYTHM_CELLS.map((cell, index) => {
          const prompt = createBeatPrompt(cell);
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
                <div><dt>Tokens</dt><dd>{cell.notation.tokens.map(formatToken).join(" · ")}</dd></div>
                <div><dt>Beam groups</dt><dd>{formatBeamGroups(expectation.beamGroups)}</dd></div>
                <div><dt>Dotted tokens</dt><dd>{expectation.dottedTokenIndexes.length ? expectation.dottedTokenIndexes.join(", ") : "None"}</dd></div>
                <div><dt>Partial beams</dt><dd>{formatPartialBeams(expectation.partialBeamDirections)}</dd></div>
                <div><dt>Review rationale</dt><dd>{expectation.rationale}</dd></div>
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
