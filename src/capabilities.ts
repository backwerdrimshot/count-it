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
import {
  ALL_RHYTHM_CELLS,
  COUNTING_PROFILES,
  COUNTING_PROFILE_REGISTRY_VERSION,
  LEVELS,
  METER_IDS,
  SPANNING_CELLS,
} from "./rhythm";

/* The build identifier, single-sourced here so the footer stamp, the manifest,
   and the README release line cannot disagree. The repo's release gate checks
   the README against this value appearing in app code. */
export const COUNT_IT_BUILD = "2026-10-09";

export const COUNT_IT_CAPABILITY_MANIFEST = {
  schemaVersion: "1.1.0",
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
    "the card renders from it, and no practice answers or scores leave the device. Scale Trail claims Level 2 on the " +
    "same terms.",
  pathway: "rhythm-reading-and-counting",
  supportedActivityTypes: ["choose-the-count", "practice-reading"],
  /* The URL parameters an assignment link may carry, exactly as the parser
     reads them. Kept honest by tests/capabilities.test.ts. */
  configurableSettings: ["a", "level", "scope", "meter", "cells", "guide", "fb", "retry", "n", "pass", "seed", "sys"],
  lockableSettings: ["level", "scope", "meter", "cells", "guide", "fb", "retry", "n", "pass", "seed", "sys"],
  assignmentLink:
    "A teacher pins a round in the URL and posts it: `cells` names an explicit rhythm " +
    "vocabulary by catalog id, `scope` chooses one beat or one measure, `meter` chooses 2/4, " +
    "3/4, 4/4, 5/4 or 7/4, `guide` fixes the " +
    "subdivision-guide policy, `fb` chooses whether the correct answer appears after each " +
    "question or only at the end, `retry` chooses what trying again means, `n` and `pass` set " +
    "the length and the goal, and `seed` makes " +
    "every student's questions identical. `level` is a shorthand for a cumulative vocabulary " +
    "and is superseded when `cells` is present. `a` is a display name and `sys` pins one of " +
    "the versioned counting profiles.",
  assignmentValidation:
    `Rejects loudly and never repairs: an unknown rhythm id, fewer than ${MIN_POOL} rhythms ` +
    `after duplicates collapse, a question count outside ${MIN_QUESTIONS}–${MAX_QUESTIONS}, a ` +
    `pass mark the round cannot reach (measured against the round's real length, ${DEFAULT_QUESTIONS} ` +
    "when the link sets none), a full-measure round longer than the pool can fill without " +
    "repeating, a meter this app does not read, a rhythm too long for the named meter's " +
    "measure (a whole note in 2/4 or 3/4), " +
    "an unrecognized feedback or retry setting, or a counting profile this app does " +
    "not support each invalidate the whole link with a plain-language message. A rhythm pool with a rhythm " +
    "missing teaches a different step, so dropping one silently would produce evidence for an " +
    "assignment nobody set.",
  roundLengthRule:
    "A full-measure round never repeats a measure, so a pool of k ONE-BEAT rhythms can fill at " +
    "most k^(beats per bar) questions: two rhythms make 4 in 2/4, 8 in 3/4, 16 in 4/4, 32 in " +
    "5/4 and 128 in 7/4. A pool " +
    "holding a whole or half note makes FEWER, because one cell fills several beats, and the " +
    "ceiling is computed from the pool's real spans rather than from its size. Asking for " +
    "more is refused at the link rather than while the round is being built — the shape of " +
    "failure that let a banner state one assignment while the student answered another.",
  /* The ids a link is written against. Published because a link authored by
     hand depends on them, which makes a rename a breaking change to every
     assignment already posted in a classroom. */
  rhythmCellIds: ALL_RHYTHM_CELLS.map((cell) => cell.id),
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
    "2/4, 3/4, 4/4, 5/4 and 7/4 — the simple meters whose beat is a quarter note. A meter is " +
    "chosen per link and defaults to 4/4, so every assignment written before meters existed " +
    "means what it meant and generates the identical round. Every meter reuses the whole " +
    "vocabulary unchanged: same quarter-note beat, a different number of them per bar. In " +
    "5/4 and 7/4 beams stay inside each beat, so the 3+2 or 2+3 grouping an odd meter is " +
    "sometimes written with is not drawn or asked. 3/8 was supported from 2026-08-24.1 to " +
    "2026-08-29.1, then moved to its own sibling app, Eight Time, live at " +
    "https://eight-time.backwerdrhythmshop.com/ since 2026-09-02. Eight Time keeps the " +
    "four-cell 3/8 vocabulary, accepts legacy Count It 3/8 assignment links, and generates " +
    "byte-identical rounds. Count It still refuses meter=3-8 and the retired eighth-beat " +
    "cell ids (eighth-beat, two-sixteenths, sixteenth-rest, rest-sixteenth) here with a " +
    "plain-language message rather than repairing them. This app also does not read 2/2, " +
    "6/8 or 5/8, which require different beat definitions.",
  levels: LEVELS.map((level) => level.id),
  countingProfileRegistryVersion: COUNTING_PROFILE_REGISTRY_VERSION,
  countingProfiles: Object.values(COUNTING_PROFILES).map(({ id, name, mapping, preview, version }) => ({
    id, name, mapping, preview, version,
  })),
  countingSystems: Object.keys(COUNTING_PROFILES),
  countingSystemStatus:
    "Students and teachers can select Standard (1 e & a), Eastman (ti-te-ta), or Eastman " +
    "variant (ta-te-ta). The latter two labels identify their exact subdivision mappings; " +
    "naming varies across teaching materials. Assignments can pin one with `sys`; links " +
    "without `sys` keep the historical Standard behavior. Takadimi remains internal data.",
  practiceWorkshop: "https://count-it.backwerdrhythmshop.com/workshop",
  practiceHistory: "https://count-it.backwerdrhythmshop.com/history",
  programPractice: {
    contextParameter: "praxisContext=program",
    parentParameter: "praxisReturnOrigin",
    messages: ["count-it.ready", "count-it.return"],
    transmitsResults: false,
    description: "Director-led framed practice on approved Praxis hosts; no learner launch or persistent Program results.",
  },
  freePracticeDefaults: { level: "level-1", scope: "measure", meter: "4-4", guide: "on" },
  freePracticeFeatures: ["individual-rhythm-selection", "optional-saved-setup", "synthesized-playback", "aligned-subdivision-guide", "download-result-png", "local-completed-challenge-history"],
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
    "format allows, not a claim that all four were misread. Emitting the shape does not " +
    "send this result; site-traffic measurement is separate.",
  supportDimensions:
    "The subdivision guide is a support, not a preference: an assignment pins it, and a gate " +
    "counts the assignment's policy rather than the learner's own toggle. Question size (one " +
    "beat or one measure) and rhythm vocabulary are the other two difficulty dimensions. " +
    "Playback has a tempo control; scored answers remain untimed.",
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
    "No account or cross-device score sync. Preferences, the optional saved counting profile, " +
    "personal bests, the last 50 completed challenge summaries without names/class IDs, a per-assignment attempt tally and an opaque per-browser string used only " +
    "to vary answer order use browser storage when available; browser settings may block it or " +
    "clearing site data may remove it. The optional assignment identifier is session-only and " +
    "never persisted. The assignments page reads the local tally to show how many times a step " +
    "was finished on this device. Count It also loads Cloudflare Web Analytics and queries the " +
    "shop's existing visit counter for site-traffic measurement; these requests do not carry " +
    "practice answers or scores. The visit counter is progressive enhancement and its absence " +
    "changes nothing.",
  siblingApps: {
    "eight-time": "https://eight-time.backwerdrhythmshop.com/",
    "mallet-map": "https://mallet-map.backwerdrhythmshop.com/",
    "scale-trail": "https://scale-trail.backwerdrhythmshop.com/",
  },
  teachingSequence: "https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/",
  assignmentBuilder: "https://count-it.backwerdrhythmshop.com/build",
  assignmentCatalog: "https://count-it.backwerdrhythmshop.com/praxis-assignment-catalog.json",
  limitations: [
    "Whole, half, quarter, eighth and sixteenth values in 2/4, 3/4, 4/4, 5/4 and 7/4. A whole " +
      "note needs four beats and so appears in 4/4, 5/4 and 7/4 only; a half note needs two " +
      "and appears in every meter.",
    "Scored assignment vocabulary remains quarter-note-beat straight subdivisions. The unscored /workshop adds triplets, ties across beats, dotted spanning values, syncopation and beat grouping. No mixed meters, pickups or compound meter in Count It.",
    "No eighth-, half- or dotted-quarter-beat meters (3/8, 2/2, 6/8): 3/8 was removed in " +
      "2026-08-29.1 and now lives in Eight Time, where legacy Count It 3/8 assignment links " +
      "generate byte-identical rounds.",
    "Free practice provides synthesized rhythm playback, a count-in, optional beat pulse and tempo from 40–200 BPM. Assigned challenges do not provide playback. No microphone input or performance scoring.",
    "Does not measure live performance, tone, sticking, or physical technique.",
    "Selectable counting profiles: Standard, Eastman (ti-te-ta), and Eastman variant (ta-te-ta). " +
      "Takadimi remains internal and is not selectable.",
    "Progress is device-local; no account, roster, or cross-device score sync. Site-traffic " +
      "measurement uses Cloudflare Web Analytics and the shop's existing visit counter; neither " +
      "receives practice answers or scores.",
    "The assignment catalog, the builder and the notation reference are free and open: a named " +
      "assignment is a set of link settings anyone can rebuild, not a locked resource. A quiz " +
      "(guide hidden, answers held to the end, one attempt) is a knowledge check, not secure " +
      "testing: one attempt cannot stop a page reload, and the pass mark is shown, never enforced.",
    "The verification code is a deterrent, not proof — signed verification is future work.",
  ],
} as const;
