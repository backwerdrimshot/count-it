/** Local review sequence. Do not add to the published catalog until educator and
 * release approval. IDs/settings are versioned separately from legacy rounds. */
import { parseAssignment, type Assignment } from ".";
import type { MeterId } from "../rhythm";

export const BEGINNER_SEQUENCE_ID = "quarters-pairs-bridge-v1";
export const BEGINNER_RESPONSE_LESSON =
  "A quarter note starts on the numbered beat and lasts one beat; two beamed eighth notes divide that beat into equal halves. Say the beat number for the first note and & (and) for the halfway note. Choices name note starts, not every moment a note lasts. A number alone means a start on the beat; number & means starts on both halves; & alone is an intentionally wrong choice here, meaning only a halfway start. In a bar, | separates the beats in a choice. No rest or sixteenth-note notation is introduced.";

const designs = [
  { title: "Meet the two cells", meter: "4-4", scope: "beat", count: 4, guide: "on", feedback: "each", retry: "free",
    description: "A short supported introduction: each of the two cells appears twice. The predictable repetition is for noticing and discussing the count, not four distinct rhythms or an independent check.",
    prerequisites: { notation: "Recognize a quarter note and a beamed pair of eighth notes after the introduction above.", meter: "This fragment starts on beat 1. The configured 4/4 has four quarter-note beats per bar, but this fragment omits the time signature and you are answering only the first beat.", response: "Read 1, 1 &, and the wrong option & using the response lesson above.", support: "The guide shows both half-beat positions; feedback follows each response. Replays repeat the same two rhythms." } },
  { title: "Two beats make a bar", meter: "2-4", scope: "measure", count: 4, guide: "on", feedback: "each", retry: "free",
    description: "Read all four distinct two-beat arrangements once, tracking the change from beat 1 to beat 2.",
    prerequisites: { notation: "Use the same quarter note and paired eighths from the introduction; no new symbols.", meter: "Prepare 2/4: two quarter-note beats per bar. Track both beats from the opening to the closing barline.", response: "Read beat numbers 1–2 with optional &; | separates beat groups in each choice. Wrong choices may omit a beat's start and leave only its &.", support: "Keep the half-beat guide on and discuss feedback after each response. Retry replays these same four bars." } },
  { title: "Carry the count through three", meter: "3-4", scope: "measure", count: 6, guide: "on", feedback: "each", retry: "free",
    description: "Six distinct bars from eight possible arrangements; the extra demand is tracking three numbered beats continuously.",
    prerequisites: { notation: "Quarter notes and paired eighths only; prepare with the two-beat bars.", meter: "Prepare 3/4: three quarter-note beats per bar. Count 1, 2, 3, then restart at 1 in the next bar.", response: "Extend the number/halfway vocabulary to beat 3 and read all three | groups.", support: "The guide and response feedback remain on; changing meter does not remove support. Retry replays the same selection." } },
  { title: "Carry the count through four", meter: "4-4", scope: "measure", count: 8, guide: "on", feedback: "each", retry: "free",
    description: "Eight distinct bars from sixteen possible arrangements; read all four beats without adding new note values.",
    prerequisites: { notation: "Quarter notes and paired eighths only; prepare with continuous three-beat reading.", meter: "Prepare 4/4: four quarter-note beats per bar. Follow beats 1–4 through the closing barline.", response: "Extend the same count vocabulary to beat 4 and read all four | groups.", support: "The half-beat guide and feedback remain available. Retry replays the same eight bars." } },
  { title: "Four-beat reduced-support check", meter: "4-4", scope: "measure", count: 6, guide: "off", feedback: "end", retry: "off",
    description: "Six distinct bars with the same taught vocabulary; guide hidden and feedback withheld until the end. This is a brief recognition sample, not validated mastery or a test of physical playing.",
    prerequisites: { notation: "Same quarter/pair vocabulary as supported four-beat work; introduce no new symbols here.", meter: "Maintain beat positions 1–4 without the printed guide; rehearse the bar boundary beforehand.", response: "Read beat numbers and & without the count row. Multiple choice still supplies possible answers.", support: "Finish supported four-beat practice first. No hints, no in-round playback, no retry button; reopening still permits a new attempt. Record the first local attempt separately from later attempts." } },
] as const;

export const BEGINNER_STEPS = designs.map((design, index) => {
  const step = index + 1;
  const query = new URLSearchParams({ seq: BEGINNER_SEQUENCE_ID, step: String(step),
    a: `Bridge v1.${step}: ${design.title}`, response: "eighths-v1", sys: "standard",
    scope: design.scope, meter: design.meter, cells: "quarter,eighths", guide: design.guide,
    fb: design.feedback, retry: design.retry, n: String(design.count), hints: "off",
    seed: `qp-bridge-v1-${step}` });
  const search = `?${query.toString()}`;
  const parsed = parseAssignment(search);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return Object.freeze({ ...design, meter: design.meter as MeterId, id: `${BEGINNER_SEQUENCE_ID}-${step}`,
    step, query: search, assignment: parsed.assignment as Assignment });
});

export const BEGINNER_PLAYING_CONNECTION =
  "After supported reading, choose a comfortable pulse with a teacher or partner. Speak a bar, then clap or play it while someone else keeps the beat. Keep a quarter note sounding or moving for the whole beat; divide paired eighths evenly. Repeat across a barline, then try a different bar. Observe pulse, even halves, duration and continuity separately from the app score. These skills need live observation; choosing a count on screen does not demonstrate them.";
