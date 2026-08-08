/* What Count It can do, published for anything that integrates with it.
 *
 * Count It was the only app of the three carrying a Teaching Sequence that
 * published no manifest at all — so the shop site's link-contract check could
 * verify Mallet Map and Scale Trail and had to report Count It as an
 * unverifiable gap, on the app whose link vocabulary is the most fragile in
 * the family: sixteen hand-written cell ids.
 *
 * Two rules this file exists to keep, both learned the hard way elsewhere:
 *
 *   1. `configurableSettings` names URL PARAMETERS, not internal fields.
 *      Scale Trail published `questionTypes` — its settings field — where the
 *      parameter it reads is `types`, so anything building a link from that
 *      manifest sent something the app ignored and silently got defaults. The
 *      test beside this derives the list from the parser rather than trusting
 *      anyone to keep two lists in step.
 *   2. The served copy in public/ is a SERIALIZED COPY of this object, and a
 *      test compares them. A manifest that drifts from the app it describes is
 *      worse than none: it is confidently wrong, and consumers act on it.
 */
import { MAX_QUESTIONS, MIN_POOL, MIN_QUESTIONS } from "./assignment";
import { LEVELS, RHYTHM_CELLS } from "./rhythm";

/* The build identifier, single-sourced here so the footer stamp, the manifest,
   and the README release line cannot disagree. The repo's release gate checks
   the README against this value appearing in app code. */
export const COUNT_IT_BUILD = "2026-08-08.3";

export const COUNT_IT_CAPABILITY_MANIFEST = {
  schemaVersion: "1.0.0",
  appId: "count-it",
  title: "Count It",
  version: COUNT_IT_BUILD,
  launchUrl: "https://count-it.backwerdrhythmshop.com/",
  launchUrlStatus: "Live. Cloudflare, custom domain.",
  /* Level 1: it scores objectively and builds a result card a student can
     submit, but that result is app-local and never transmitted, so it does not
     claim Level 2. Raising it means adopting the universal result envelope —
     see doc 23, which lists this app's envelope as unreconciled. */
  integrationLevel: 1,
  integrationLevelRationale:
    "Accepts a configured assignment link and scores objectively, producing a capture-ready " +
    "result card with a verification code. The result is app-local and never transmitted, so " +
    "this is Level 1 until the universal result envelope is adopted.",
  pathway: "rhythm-reading-and-counting",
  supportedActivityTypes: ["choose-the-count", "practice-reading"],
  /* The URL parameters an assignment link may carry, exactly as the parser
     reads them. Kept honest by tests/capabilities.test.ts. */
  configurableSettings: ["a", "level", "scope", "cells", "guide", "n", "pass", "seed", "sys"],
  lockableSettings: ["level", "scope", "cells", "guide", "n", "pass", "seed"],
  assignmentLink:
    "A teacher pins a round in the URL and posts it: `cells` names an explicit rhythm " +
    "vocabulary by catalog id, `scope` chooses one beat or one measure, `guide` fixes the " +
    "subdivision-guide policy, `n` and `pass` set the length and the goal, and `seed` makes " +
    "every student's questions identical. `level` is a shorthand for a cumulative vocabulary " +
    "and is superseded when `cells` is present. `a` is a display name and `sys` names the " +
    "counting system.",
  assignmentValidation:
    `Rejects loudly and never repairs: an unknown rhythm id, fewer than ${MIN_POOL} rhythms ` +
    `after duplicates collapse, a question count outside ${MIN_QUESTIONS}–${MAX_QUESTIONS}, a ` +
    "pass mark the round cannot reach, or a counting system this app does not teach each " +
    "invalidate the whole link with a plain-language message. A rhythm pool with a rhythm " +
    "missing teaches a different step, so dropping one silently would produce evidence for an " +
    "assignment nobody set.",
  /* The ids a link is written against. Published because a link authored by
     hand depends on them, which makes a rename a breaking change to every
     assignment already posted in a classroom. */
  rhythmCellIds: RHYTHM_CELLS.map((cell) => cell.id),
  levels: LEVELS.map((level) => level.id),
  countingSystems: ["standard"],
  countingSystemStatus:
    "Standard American counting (1 e & a) is the only system this release teaches. The data " +
    "model carries Eastman and Takadimi, but a link asking for either is refused rather than " +
    "graded against a system the app does not present.",
  acceptedInputSources: ["touch", "mouse", "computer-keyboard"],
  evidenceTypes: ["A1_ANSWER_CORRECTNESS"],
  /* Deliberately empty, and said out loud rather than invented. Count It has
     no reconciled Praxis skill vocabulary yet; the Sequence 2 draft reserves
     that as an owner decision and names `notation.rhythm-counting` only as a
     candidate. Publishing a guess here would be a contract nobody agreed to. */
  compatibleSkillDomains: [] as string[],
  skillVocabularyStatus:
    "Not yet reconciled. Candidate ids exist in the Sequence 2 draft but the vocabulary is an " +
    "owner decision, and an invented id would be a contract no one agreed to. Until it is " +
    "settled this app emits no skill ids.",
  resultSchemaVersion: "app-local-1",
  resultSchemaStatus:
    "The result card is app-local: score, accuracy, the assignment's stated conditions, the " +
    "teacher's pass mark, and a non-cryptographic verification code. It is not the universal " +
    "result contract and is never transmitted. Migrating it is separate work.",
  supportDimensions:
    "The subdivision guide is a support, not a preference: an assignment pins it, and a gate " +
    "counts the assignment's policy rather than the learner's own toggle. Question size (one " +
    "beat or one measure) and rhythm vocabulary are the other two difficulty dimensions. " +
    "There is no timer anywhere in this app, by design.",
  accessibility: [
    "keyboard-operation",
    "screen-reader-labels",
    "visible-focus",
    "reduced-motion",
    "large-touch-targets",
    "non-color-status-cues",
  ],
  offlineBehavior:
    "No account, backend, or network dependency. Preferences and personal bests stay in " +
    "browser storage; the optional assignment identifier is session-only and never persisted. " +
    "The visit counter is progressive enhancement and its absence changes nothing.",
  siblingApps: {
    "mallet-map": "https://mallet-map.backwerdrhythmshop.com/",
    "scale-trail": "https://scale-trail.backwerdrhythmshop.com/",
  },
  teachingSequence: "https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/",
  limitations: [
    "Straight quarter-, eighth-, and sixteenth-note subdivisions in 4/4 only.",
    "No triplets, compound meter, or ties across beats.",
    "Does not play, listen to, or time anything: there is no audio, no microphone, and no tempo engine.",
    "Does not measure live performance, tone, sticking, or physical technique.",
    "Standard American counting only in this release.",
    "Progress is device-local; no account, roster, or cross-device sync.",
    "The verification code is a deterrent, not proof — signed verification is future work.",
  ],
} as const;
