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
import { DEFAULT_QUESTIONS, MAX_QUESTIONS, MIN_POOL, MIN_QUESTIONS } from "./assignment";
import { ALL_RHYTHM_CELLS, EIGHTH_BEAT_CELLS, LEVELS, METER_IDS, RHYTHM_CELLS, SPANNING_CELLS } from "./rhythm";

/* The build identifier, single-sourced here so the footer stamp, the manifest,
   and the README release line cannot disagree. The repo's release gate checks
   the README against this value appearing in app code. */
export const COUNT_IT_BUILD = "2026-08-24.1";

export const COUNT_IT_CAPABILITY_MANIFEST = {
  schemaVersion: "1.0.0",
  appId: "count-it",
  title: "Count It",
  version: COUNT_IT_BUILD,
  launchUrl: "https://count-it.backwerdrhythmshop.com/",
  launchUrlStatus: "Live. Cloudflare, custom domain.",
  /* Level 2 as of 2026-08-08.4. The previous comment here said "raising it
     means adopting the universal result envelope" — a criterion written down in
     advance, and now met, so the level moves with it. Note what the level does
     NOT assert: nothing is transmitted, by this app or by its siblings. Scale
     Trail has claimed Level 2 on exactly these terms since before this. */
  integrationLevel: 2,
  integrationLevelRationale:
    "Accepts a configured assignment link, scores objectively, and emits the universal result " +
    "envelope (praxis.result.v0_1) — the condition this manifest previously named for Level 2, " +
    "now met. Transmission is NOT part of the claim and never has been: the envelope is a format, " +
    "the card renders from it, and nothing leaves the device. Scale Trail claims Level 2 on the " +
    "same terms.",
  pathway: "rhythm-reading-and-counting",
  supportedActivityTypes: ["choose-the-count", "practice-reading"],
  /* The URL parameters an assignment link may carry, exactly as the parser
     reads them. Kept honest by tests/capabilities.test.ts. */
  configurableSettings: ["a", "level", "scope", "meter", "cells", "guide", "fb", "retry", "n", "pass", "seed", "sys"],
  lockableSettings: ["level", "scope", "meter", "cells", "guide", "fb", "retry", "n", "pass", "seed"],
  assignmentLink:
    "A teacher pins a round in the URL and posts it: `cells` names an explicit rhythm " +
    "vocabulary by catalog id, `scope` chooses one beat or one measure, `meter` chooses 4/4, " +
    "3/4 or 3/8, `guide` fixes the " +
    "subdivision-guide policy, `fb` chooses whether the correct answer appears after each " +
    "question or only at the end, `retry` chooses what trying again means, `n` and `pass` set " +
    "the length and the goal, and `seed` makes " +
    "every student's questions identical. `level` is a shorthand for a cumulative vocabulary " +
    "and is superseded when `cells` is present. `a` is a display name and `sys` names the " +
    "counting system.",
  assignmentValidation:
    `Rejects loudly and never repairs: an unknown rhythm id, fewer than ${MIN_POOL} rhythms ` +
    `after duplicates collapse, a question count outside ${MIN_QUESTIONS}–${MAX_QUESTIONS}, a ` +
    `pass mark the round cannot reach (measured against the round's real length, ${DEFAULT_QUESTIONS} ` +
    "when the link sets none), a full-measure round longer than the pool can fill without " +
    "repeating, a meter this app does not read, a rhythm whose beat unit the chosen meter does " +
    "not count, an unrecognized feedback or retry setting, or a counting system this app does " +
    "not teach each invalidate the whole link with a plain-language message. A rhythm pool with a rhythm " +
    "missing teaches a different step, so dropping one silently would produce evidence for an " +
    "assignment nobody set.",
  roundLengthRule:
    "A full-measure round never repeats a measure, so a pool of k ONE-BEAT rhythms can fill at " +
    "most k^(beats per bar) questions: two rhythms make 16 in 4/4 and 8 in 3/4 or 3/8. A pool " +
    "holding a whole or half note makes FEWER, because one cell fills several beats, and the " +
    "ceiling is computed from the pool's real spans rather than from its size. Asking for " +
    "more is refused at the link rather than while the round is being built — the shape of " +
    "failure that let a banner state one assignment while the student answered another.",
  /* The ids a link is written against. Published because a link authored by
     hand depends on them, which makes a rename a breaking change to every
     assignment already posted in a classroom. */
  rhythmCellIds: ALL_RHYTHM_CELLS.map((cell) => cell.id),
  /* Which beat each id counts, because the two families are not interchangeable
     and a link mixing them is refused. Published rather than left to be
     inferred from the name: `eighths` is a QUARTER beat filled with two eighths
     and `eighth-beat` is an eighth-note beat, which is exactly the confusion a
     hand-written link would make. */
  quarterBeatCellIds: RHYTHM_CELLS.map((cell) => cell.id),
  eighthBeatCellIds: EIGHTH_BEAT_CELLS.map((cell) => cell.id),
  /* Rhythms that last longer than one beat, with the beats each one spans.
     Published separately because they change what a LINK can ask for: they are
     legal only in `scope=measure`, and a pool containing them fills a bar by
     span rather than one cell per beat. A consumer building a link needs both
     facts, and neither is inferable from the id. */
  spanningCellIds: SPANNING_CELLS.map((cell) => cell.id),
  spanningCellBeats: Object.fromEntries(SPANNING_CELLS.map((cell) => [cell.id, cell.beats])),
  spanningCellStatus:
    "Whole and half notes, and the half rest \u2014 the values the Notes & Rests poster teaches " +
    "that a one-beat catalog could not express. They sound once, at the top of the span, and " +
    "the beats underneath are silent because the note is held: this app counts the notes that " +
    "sound, so a half note on beat one of 4/4 answers \"1\". They are measure-scope only, and a " +
    "beat-scope link naming one is refused. There is no whole rest: it fills the bar, so a " +
    "measure containing one contains nothing else and has no count to ask for.",
  meters: METER_IDS,
  meterStatus:
    "4/4, 3/4 and 3/8. A meter is chosen per link and defaults to 4/4, so every assignment " +
    "written before meters existed means what it meant and generates the identical round. " +
    "3/4 reuses the whole quarter-beat vocabulary unchanged — same beat, one fewer of them. " +
    "3/8 counts an eighth-note beat and has its own four-rhythm vocabulary, and its bars beam " +
    "across the whole measure, matching the Rhythms in Three lesson and the Theory Reference " +
    "poster rather than this app's own per-beat house rule.",
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
  resultSchemaVersion: "praxis.result.v0_1",
  resultSchemaStatus:
    "Adopted 2026-08-08, last of the three apps, after Scale Trail and Mallet Map. This app had " +
    "no result object at all — the card was assembled inline — so the envelope was built rather " +
    "than renamed. `skillReferences` is null and says so: the field is nullable across the family " +
    "precisely so an app with no reconciled vocabulary can decline rather than invent ids. " +
    "`activity.contentVersion` is null because questions are generated from the conditions and a " +
    "seed, which already reproduce the round. In measure scope a miss is attributed to every cell " +
    "in the measure, because the question is answered as a whole — the finest attribution the " +
    "format allows, not a claim that all four were misread. Emitting the shape is not " +
    "transmitting it: nothing leaves the device.",
  supportDimensions:
    "The subdivision guide is a support, not a preference: an assignment pins it, and a gate " +
    "counts the assignment's policy rather than the learner's own toggle. Question size (one " +
    "beat or one measure) and rhythm vocabulary are the other two difficulty dimensions. " +
    "There is no timer anywhere in this app, by design.",
  integrityMeasures:
    "An assigned round varies the ORDER of the answer choices per student, from the seed plus " +
    "an identifier, so the questions stay identical and comparable while a posted answer key " +
    "does not transfer. Attempts are counted and reported on the card, in the copied summary " +
    "and in the verification code, because a replay of an already-answered round is a different " +
    "fact than a first attempt. Attempts are counted per assignment in browser storage, so the " +
    "count survives a reload rather than resetting with the page. `fb=end` withholds the " +
    "correct answer, the running score and the guide's highlighting until the round is over. " +
    "`retry=reseed` gives a retake the same conditions on new questions, seeded from the link's " +
    "own seed plus the attempt number so a teacher can regenerate any attempt; `retry=off` " +
    "withdraws the retry control. Practice mode is closed while an assigned round is " +
    "unfinished, since it reveals counts for the same vocabulary. None of this makes a score " +
    "proof: the app has no accounts, `retry=off` cannot stop a page reload — it reports the " +
    "further attempt rather than preventing it, which is the same posture this app takes " +
    "toward a pass mark — and the verification code remains a deterrent rather than a signature.",
  accessibility: [
    "keyboard-operation",
    "screen-reader-labels",
    "visible-focus",
    "reduced-motion",
    "large-touch-targets",
    "non-color-status-cues",
  ],
  offlineBehavior:
    "No account, backend, or network dependency. Preferences, personal bests, a per-assignment " +
    "attempt tally and an opaque per-browser string used only to vary answer order stay in " +
    "browser storage; the optional assignment identifier is session-only and never persisted. " +
    "None of the stored values name a person: the attempt tally is keyed by the assignment's " +
    "own canonical link, and the ordering string is random and meaningless outside this " +
    "browser. The visit counter is progressive enhancement and its absence changes nothing.",
  siblingApps: {
    "mallet-map": "https://mallet-map.backwerdrhythmshop.com/",
    "scale-trail": "https://scale-trail.backwerdrhythmshop.com/",
  },
  teachingSequence: "https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/",
  limitations: [
    "Whole, half, quarter, eighth and sixteenth values in 4/4, 3/4 and 3/8. A whole note needs " +
      "four beats and so appears in 4/4 only; a half note needs two and appears in 4/4 and 3/4.",
    "No triplets, compound meter, or ties across beats. 3/8 here is a simple meter counted in " +
      "three, not 6/8 or any other compound meter.",
    "Levels 1-3 describe how a quarter-note beat subdivides, so they do not apply in 3/8: a " +
      "3/8 round draws its whole four-rhythm vocabulary at every level.",
    "Does not play, listen to, or time anything: there is no audio, no microphone, and no tempo engine.",
    "Does not measure live performance, tone, sticking, or physical technique.",
    "Standard American counting only in this release.",
    "Progress is device-local; no account, roster, or cross-device sync.",
    "The verification code is a deterrent, not proof — signed verification is future work.",
  ],
} as const;
