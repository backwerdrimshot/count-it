import type { Metadata } from "next";
import type { ReactNode } from "react";
import CountReference from "../CountReference";
import RhythmNotation from "../RhythmNotation";
import { PageFooter, PageHeader } from "../PageChrome";
import {
  ENGRAVING_REVIEW_DATE,
  ENGRAVING_STANDARD_VERSION,
  createBeatPrompt,
  createMeasurePrompt,
  getPromptAnswer,
  type RhythmPrompt,
} from "../../src/rhythm";

const url = "https://count-it.backwerdrhythmshop.com/notation";
const title = "Notation reference | Count It";
const description =
  "The clef, barlines, time signature, beams, rests and held notes behind every rhythm Count It draws, each with a live example. A refresher for teachers.";

/* Its own canonical, for the same reason /build and /assignments have one. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, type: "website", url, siteName: "Backwerd Rhythm Shop" },
  twitter: { card: "summary", title, description },
};

/* Every staff on this page is drawn by the same component, from the same rhythm
   model, as the questions students answer. That is the point of the page: it
   cannot describe an engraving the app does not draw, because it is the app's
   own drawing. What it SAYS about each convention is checked against
   docs/notation-engraving-standard.md and src/rhythm/engraving.ts. */

function Example({
  prompt,
  caption,
  grid = false,
}: {
  prompt: RhythmPrompt;
  caption: string;
  /** Show the full subdivision grid with the sounding positions marked. */
  grid?: boolean;
}) {
  return (
    <figure className="notation-example">
      <RhythmNotation prompt={prompt} label={`${caption}.`} />
      {grid && <CountReference prompt={prompt} revealSounding />}
      <figcaption>
        <strong>{caption}</strong>
        <span>Count: {getPromptAnswer(prompt)}</span>
      </figcaption>
    </figure>
  );
}

function Topic({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section className="notation-topic" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{heading}</h2>
      {children}
    </section>
  );
}

export default function NotationPage() {
  const barA = createMeasurePrompt(["quarter", "eighths", "eighth-rest", "rest-eighth"], "4-4");
  const oneBeat = createBeatPrompt("eighths", "4-4");
  const three = createMeasurePrompt(["sixteenths", "sixteenths", "sixteenths"], "3-4");
  const five = createMeasurePrompt(["quarter", "quarter", "quarter", "quarter", "quarter"], "5-4");
  const beams = createMeasurePrompt(["sixteenths", "eighths", "dotted-eighth-sixteenth", "quarter"], "4-4");
  const rests = createMeasurePrompt(["eighth-rest", "rest-eighth", "quarter", "eighths"], "4-4");
  const dotted = createMeasurePrompt(["dotted-eighth-sixteenth", "quarter", "quarter", "quarter"], "4-4");
  const half = createMeasurePrompt(["half", "quarter", "quarter"], "4-4");
  const whole = createMeasurePrompt(["whole"], "4-4");

  return (
    <div className="builder-shell">
      <a className="skip-link" href="#reference">Skip to the reference</a>
      <PageHeader />

      <main className="builder-main" id="reference">
        <div className="builder-intro">
          <p className="eyebrow">For teachers</p>
          <h1>Notation reference</h1>
          <p>
            The conventions behind every rhythm Count It draws, with a live example of each. Use it to refresh a
            convention before you teach it, or to answer a student who asks why the staff looks the way it does.
            Every staff below is drawn by the same code that draws the questions, so what you see here is what
            students see.
          </p>
          <p className="catalog-lede-link">
            Ready to practice these? See the <a href="/assignments">assignments</a>.
          </p>
        </div>

        <nav className="notation-contents" aria-label="On this page">
          <ul>
            <li><a href="#clef">The clef</a></li>
            <li><a href="#barlines">Barlines and the measure</a></li>
            <li><a href="#time-signature">The time signature</a></li>
            <li><a href="#beams">Beams</a></li>
            <li><a href="#rests">Rests and counting</a></li>
            <li><a href="#held">Dotted and held notes</a></li>
            <li><a href="#eighth-beat">When the beat is an eighth</a></li>
          </ul>
        </nav>

        <Topic id="clef" heading="The clef">
          <p>
            Every staff starts with the <strong>percussion clef</strong>, the two short vertical bars. It tells the
            reader that position on the staff names an instrument or a sound, not a pitch: this is rhythm. Count It
            puts every note and rest on the middle line, so position carries no meaning here and attention stays on
            when each note sounds.
          </p>
          <p>
            It is always there. A five-line staff with notes and no clef is not something a student will meet in a
            real part.
          </p>
          <Example prompt={barA} caption="One measure of 4/4 with the percussion clef" />
        </Topic>

        <Topic id="barlines" heading="Barlines and the measure">
          <p>
            A single <strong>barline</strong> closes a measure. The notes and rests inside it add up to exactly the
            beats the time signature names, and then the bar ends.
          </p>
          <p>
            A one-beat prompt has <em>no</em> closing barline on purpose. It is a fragment, so it reads as &ldquo;here
            is one beat&rdquo; and not as a finished measure it isn&rsquo;t.
          </p>
          <div className="notation-pair">
            <Example prompt={barA} caption="A measure: closed by a barline" />
            <Example prompt={oneBeat} caption="One beat: a fragment, left open" />
          </div>
        </Topic>

        <Topic id="time-signature" heading="The time signature: when it shows">
          <p>
            The top number is how many beats are in the bar. The bottom number says which note gets the beat. In every
            meter Count It uses the bottom number is 4, so a quarter note is one beat: 3/4 is three of them and 5/4 is
            five.
          </p>
          <ul>
            <li>
              <strong>It shows on every measure prompt.</strong> The bar is what is being read, and the meter decides
              how many beats come before the bar line.
            </li>
            <li>
              <strong>It shows on every measure, not only the first.</strong> Each question is the start of its own
              staff, so there is no earlier bar it could have been printed on.
            </li>
            <li>
              <strong>It does not show on a one-beat prompt.</strong> A time signature over a fragment would claim a
              bar that is not there.
            </li>
          </ul>
          <div className="notation-pair">
            <Example prompt={three} caption="3/4: three beats, so the bar line falls after three" />
            <Example prompt={five} caption="5/4: five beats before the bar line" />
          </div>
        </Topic>

        <Topic id="beams" heading="Beams stay inside the beat">
          <p>
            Notes shorter than a quarter are beamed together, and a <strong>beam never crosses a beat</strong>. That
            keeps every beat visible on the page: a student can see where beat 2 begins by where its beam starts.
          </p>
          <p>
            Beginner examples also do not beam across a rest. A rest breaks the group, which shows where the next
            sounding position starts.
          </p>
          <Example prompt={beams} caption="Four beats, four beam groups: sixteenths, eighths, dotted eighth and sixteenth, quarter" grid />
        </Topic>

        <Topic id="rests" heading="Rests and counting">
          <p>
            <strong>Count the notes that sound.</strong> A rest is a silent position: it keeps its place in the count,
            and the student says nothing for it. Count It&rsquo;s answer names only the positions where a note begins,
            and the grid under the notation shows every position, so the silence is visible too.
          </p>
          <p>
            When you write counts on a page by hand, the Rhythm Shop&rsquo;s convention is to put the count for a rest
            in parentheses, count the notes strongly, and whisper the rests or keep them silent.
          </p>
          <Example prompt={rests} caption="Rests in 4/4: the count names only what sounds" grid />
        </Topic>

        <Topic id="held" heading="Dotted and held notes">
          <p>
            A <strong>dot</strong> adds half the note&rsquo;s length. A dotted eighth is an eighth plus a sixteenth, so
            it fills three of the four sixteenth positions in its beat, and the sixteenth after it finishes the beat.
          </p>
          <p>
            A <strong>half note</strong> lasts two beats and a <strong>whole note</strong> four, so they appear only in
            a full measure with room for them. A whole note alone fills a 4/4 bar and is centered in it, as in printed
            music. A bar of 3/4 has no room for one, so Count It never asks for it there.
          </p>
          <Example prompt={dotted} caption="A dotted eighth and a sixteenth, then three quarters" grid />
          <div className="notation-pair">
            <Example prompt={half} caption="A half note lasts two beats" />
            <Example prompt={whole} caption="A whole note alone, centered in the bar" />
          </div>
        </Topic>

        <Topic id="eighth-beat" heading="When the beat is an eighth">
          <p>
            In 3/8 the eighth note is the beat. That is a different reading skill behind a similar-looking time
            signature, so Count It stays with meters whose beat is a quarter note. 3/8 lives in its sibling app,{" "}
            <a href="https://eight-time.backwerdrhythmshop.com/">Eight Time</a>, and the{" "}
            <a href="https://backwerdrhythmshop.com/lessons/rhythms-in-three/">Rhythms in Three lesson</a> teaches both
            spellings of a bar of three. Meters such as 6/8 and cut time are not in either app.
          </p>
        </Topic>

        <p className="builder-fine">
          Engraving standard {ENGRAVING_STANDARD_VERSION}, rules reviewed {ENGRAVING_REVIEW_DATE}. An independent
          musician&rsquo;s sign-off is still pending. The rules behind this page are in the{" "}
          <a href="https://github.com/backwerdrimshot/count-it/blob/main/docs/notation-engraving-standard.md">
            engraving standard
          </a>.
        </p>
      </main>

      <PageFooter page="notation" feedbackSubject="Count It — Notation reference feedback" />
    </div>
  );
}
