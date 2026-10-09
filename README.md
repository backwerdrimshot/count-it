# Count It

Count It is a local-first rhythm-reading MVP for Backwerd Rhythm Shop. It helps musicians connect standard notation to spoken subdivision counts through guided practice and short, scored challenges.

The app deliberately begins with a small, verified straight-subdivision catalog. Rhythm notation, timing, accepted answers, distractors, and explanations all come from the same structured data model; no answer is inferred from an SVG.

## Release information

- **Build:** `2026-10-08.1`
- **Status:** MVP built and publicly available
- **Live app:** <https://count-it.backwerdrhythmshop.com/>
- **Public app guide:** <https://guides.backwerdrhythmshop.com/count-it/>
- **Repository:** <https://github.com/backwerdrimshot/count-it>

Build identifiers use ISO `YYYY-MM-DD`, based on the date the shipped app update
began. The value stays fixed while that release pass is completed across code and
documentation.

## Practice workspace update

- The opening setup is **Practice, Level 1, a full 4/4 measure, guide on**.
- One-beat fragments use a compact centered staff. Full measures use a bounded responsive width. A teaching time grid aligns notehead centres, subdivision labels and the playback cursor; notation and guide scroll together. A lone whole-bar note keeps conventional centering and an explicit held-duration annotation.
- **Choose individual rhythms** in setup selects a pool without writing an assignment. At least two rhythms must fit the current scope and meter. Changing the level restores that level's pool.
- **Save my practice setup** restores the selected free-practice settings on this browser. Reset restores the agreed starting settings. Assignment links keep their historical parser defaults and seeded questions.
- **Listen to rhythm** provides synthesized playback, 40–200 BPM, a count-in, optional beat pulse and a cursor. Playback starts only after a click and stops on Stop, a prompt change or navigation. Scored assignments withhold playback; answer scores remain untimed.
- **Rhythm workshop** (`/workshop`) is unscored practice for triplets, ties across beats, dotted spanning values, syncopation and explicit grouping (including 3+2 vs 2+3 in 5/4). It uses the same notation/guide/playback renderer. Triplets explicitly use `1 trip let` in all profiles; this is a workshop convention, not a claim about Eastman triplet syllables. The new material is not added to assignment cell IDs or the cumulative levels.
- **Practice history** (`/history`) keeps the last 50 completed challenge summaries on-device, including conditions, attempts and rhythms to revisit, without names/class IDs. Current results and history cards download as PNG. Scores are not sent anywhere automatically.

Design research and implementation rationale: [docs/practice-workspace-design.md](docs/practice-workspace-design.md).

Praxis Percussion Program integration now includes a director-led framing bridge: approved Program hosts can embed this same workspace, receive ready/return messages and retain their selected workspace. It transmits no practice results or learner identity. See [the integration plan](docs/praxis-program-integration-plan.md); governed assignments and durable result delivery remain separate work. This branch and the companion Platform wrapper are not deployed.

## What is included

- **Practice:** move through one-beat or full-measure prompts, reveal the count, inspect the subdivision guide, and read a short explanation.
- **Challenge:** answer five multiple-choice questions with immediate feedback, explanations, score, accuracy, retry, and a locally stored personal best. A round can also hold every answer to the end, and always finishes with a review of each question beside the count it wanted.
- **Three cumulative levels:** quarter/eighth-note foundations, eighth-note placement with rests, and verified sixteenth-note cells.
- **Whole and half notes:** the values the Notes & Rests poster teaches that a one-beat catalog could not express. A half note is two beats and a whole note is four, so they are the first rhythms that span rather than subdivide. They sound once, at the top of the span, and the beats underneath are silent because the note is held — this app counts the notes that sound, so a half note on beat one of 4/4 answers `1`. Measure scope only, and a whole note needs four beats so it appears in 4/4, 5/4 and 7/4 only.
- **Five quarter-note-beat meters:** 2/4, 3/4, 4/4, 5/4 and 7/4, chosen per assignment link or in the setup panel. Each reads the same quarter-note beat as 4/4 with a different number of them per bar, so the whole sixteen-rhythm vocabulary carries over unchanged. A link that names no meter means 4/4 and generates exactly the round it always did. In 5/4 and 7/4 beams stay inside each beat, so the 3+2 or 2+3 grouping an odd meter is sometimes written with is not drawn or asked. That is the whole admission rule: **the beat is a quarter note.** Eighth-beat (3/8), half-note-beat (2/2) and compound (6/8) meters are different counting problems and are not read here. 3/8 was supported from build `2026-08-24.1` to `2026-08-29.1` and then removed: an eighth-note beat brought its own vocabulary, a whole-bar beaming exception, and a whole-bars-only rule, and that load earned [Eight Time](https://eight-time.backwerdrhythmshop.com/) its own app, live since 2026-09-02. It accepts legacy Count It 3/8 assignment links and generates byte-identical rounds; the apps share git ancestry and may be recombined later. Count It still refuses `meter=3-8` and retired eighth-beat cell ids here, with a plain-language message rather than repairing them.
- **Responsive, accessible UI:** phone, tablet, and desktop layouts; keyboard shortcuts 1–4 for answers; visible focus; semantic controls; and live feedback.
- **Deterministic rhythm engine:** seeded question generation, non-repeating prompts until vocabulary exhaustion, exactly one correct option, and misconception-based distractors.
- **Assignment links:** a teacher pins a round in a URL — rhythm vocabulary, question size, subdivision-guide policy, feedback timing, question count, pass mark and seed — and every student who opens it gets the same questions under the same conditions. The pinned controls lock and say why; the result card reports the conditions, the goal, which rhythms were missed, and a verification code beside the score.
- **Assignments page:** `/assignments` (one click from the practice screen, under **For teachers** beside Help and About; the link shows from 480px wide, and on a phone it stays in the About dialog because the header has no room for it) lists every published teaching-sequence step that runs here (and links the three that run in Eight Time) with Try it, Copy link, Customize in builder, and how many times this browser has finished each. Free and open.
- **Notation reference:** `/notation` is a teacher's refresher on the clef, barlines, time signature, beams, rests and held notes, each with a live staff drawn by the same renderer the questions use.

### Assignment builder

Writing the link by hand is the hard part, so the app writes it: **`/build`** is a
form where a teacher chooses a level or the exact rhythms, the meter, one beat or
a measure, the guide, when answers show, what trying again means, the length, the
pass mark and a seed, and gets the link to post.

It never judges a link itself. The choices are composed into a query string and
handed to `parseAssignment` — the function the student's browser runs — and
whatever it says is what the form shows, in the same words. A link the builder
calls valid is therefore one the app accepts, and there is no second copy of the
rules to drift from the first. `tests/builder.test.ts` enumerates every
combination of the choices and requires each to be either refused with a message
or playable end to end.

Three decisions worth knowing:

- **It writes only what was pinned.** A control left on "Student chooses" is
  absent from the link and stays the student's. The app's own canonical form
  (`serializeAssignment`) always writes `scope=`, so the builder does not use it.
- **A bad seed is refused, not written.** The parser silently ignores an invalid
  seed, and a link that quietly lost its seed would give a class different
  questions under one assignment name.
- **Legal but questionable is a note, never an error.** No seed, no pass mark, or
  leaving the question size to the student when full measures could not fill the
  round are said plainly and do not block the link.
- **It can start from a published step.** The "Start from a step" selector
  fills the form from any of the ten steps of the
  [Counting Rhythms sequence](https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/)
  or the three 3/4 steps of
  [Rhythms in Three](https://apps.backwerdrhythmshop.com/sequences/rhythms-in-three/),
  then everything stays editable; `/build?from=<step id>` opens it already filled
  (that is what the assignments page's Customize button uses). The steps are
  copied from the shop site's own pages, and `tests/presets.test.ts` holds those
  links verbatim (in `tests/fixtures/published-links.ts`) and requires each preset
  to run the **byte-identical round** its link runs — same questions, same
  choices, same order — so "Step 3" here cannot quietly become a different step
  from Step 3 there. Two deliberate differences, both asserted: for Counting
  Rhythms the meter is pinned to 4/4 (the published links leave it to the
  student, and a student who switches a link naming a whole note to 2/4 gets a
  round that never asks it; Rhythms in Three's links already name 3/4), and the
  `seq`/`step` label is left off, because it stops being true the moment a
  teacher changes anything.
- **"Make this a quiz" is a convention, not a lock.** It hides the guide, holds
  the answers to the end and allows one attempt, and, when the teacher has picked
  exact rhythms and a one-beat round, asks each ticked rhythm exactly once (one
  question per rhythm, pass at four in five). `applyQuiz` in
  `src/assignment/builder.ts` holds the rule; `tests/builder.test.ts` checks it
  against the real generator. It is a knowledge check, not secure testing: one
  attempt cannot stop a page reload, and the pass mark is shown, never enforced.

### Assignment catalog

`src/assignment/catalog.ts` lists every published step that runs in Count It or
its sibling Eight Time as data: thirteen Count It steps (derived from the
presets) and Eight Time's three 3/8 steps (stored verbatim from the shop site,
because this app's parser refuses 3/8 by design). Three readers share it, so they
cannot disagree: the `/assignments` page, the builder's step menu, and the JSON
the app serves at
[`/praxis-assignment-catalog.json`](https://count-it.backwerdrhythmshop.com/praxis-assignment-catalog.json),
which other repositories (Praxis Press, Praxis Studio) can pin or fetch.

Every entry is tier `free`. Nothing here is gated and nothing could be: the
generator ships to the browser, so a named assignment is only a set of link
settings anyone can rebuild at `/build`. Seeds are unique across the catalog
(`tests/catalog.test.ts`), because a book unit's seed must differ from every free
one. To regenerate the JSON after a catalog change:

```sh
UPDATE_CATALOG_JSON=1 pnpm test tests/catalog.test.ts
```

The next plain run holds the file to the data again. The same switch exists for
the capability manifest (`UPDATE_CAPABILITIES_JSON=1 pnpm test tests/capabilities.test.ts`).

### Notation reference

`/notation` explains the conventions behind every staff, and the staff itself
follows one rule that is written down and tested rather than left in the
renderer: `staffFurniture()` in `src/rhythm/engraving.ts` decides that a **measure**
gets the percussion clef, a time signature and a closing barline, and a
**one-beat fragment** gets the clef only. The reasoning, and what the other
repositories draw, are in
[docs/notation-engraving-standard.md](docs/notation-engraving-standard.md).

### Capability manifest

Count It publishes what it can do at
[`/praxis-capabilities.json`](https://count-it.backwerdrhythmshop.com/praxis-capabilities.json):
the URL parameters an assignment link may carry, the rhythm cell ids links are
written against, the evidence it produces, and the things it deliberately does
not do. The served file is a serialized copy of `src/capabilities.ts`, and a
test compares them — a manifest that drifts from the app it describes is worse
than none, because consumers act on it.

Two rules the tests keep: `configurableSettings` names URL parameters rather
than internal field names, derived from the parser itself; and no skill
vocabulary is published, because none has been agreed and an invented id would
be a contract nobody signed up to.

### Assignment link parameters

```
?a=Step 2&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2
```

| Parameter | Meaning |
| --- | --- |
| `a` | Assignment name shown to the student. Display text only. |
| `level` | `1`–`3`. Ignored when `cells` is present. |
| `scope` | `beat` or `measure`. |
| `meter` | `2-4`, `3-4`, `4-4`, `5-4` or `7-4`. Absent means 4/4. Anything else — including the retired `3-8` — is refused. A `cells` pool naming a rhythm the bar cannot hold (a whole note in 2/4 or 3/4) is refused too, rather than quietly never asked. |
| `cells` | Explicit rhythm vocabulary by catalog id. Levels are cumulative, so this is the only way to assign a subset — "the rest-entry cells and nothing else" is not a level. |
| `guide` | `on` or `off`. A support policy set by the assignment, not the learner. |
| `fb` | `each` or `end`. When the correct answer appears. `end` also hides the running score and the guide's highlighting until the round is over. |
| `retry` | `free`, `reseed` or `off`. What trying again means: the same round back (the default), the same conditions on new questions, or no retry control at all. |
| `n` | Questions in the round, 1–20. Defaults to 5. |
| `pass` | Questions needed to pass. Reported on the card, never enforced by the app. |
| `seed` | Same questions for every student who opens the link. |
| `sys` | Optional versioned counting profile: `standard`, `eastman-ti-te-ta`, or `eastman-ta-te-ta`. Absent means historical Standard. The legacy alias `eastman` is accepted and canonicalized to `eastman-ti-te-ta`. |

An invalid link is **rejected, never repaired**: an unknown rhythm id, a pool
under two, an impossible pass mark, a full-measure round longer than the pool
can fill, an unrecognized feedback setting or an unsupported counting system
each invalidate the whole link with a plain-language message, and the app keeps
working normally underneath it. A rhythm pool with a rhythm missing teaches a
different step, so silently dropping one would produce evidence for an
assignment nobody set. Nothing about a student is stored: the optional
identifier lives in session state only, and the verification code is a
deterrent rather than proof.

**A control the link leaves open is not entirely free.** A link that names no
meter, question size or level lets the student choose — but not into a round the
link could never have described. A whole note is never asked in 3/4, and two
rhythms make only four bars of 2/4, so a student who switched such a link would
get a different round than the teacher set, with a pass mark that could no longer
be reached. The setup panel asks the parser's own rule (`roundProblem`, the same
function that refuses the link) about every scope, meter and level on offer and
greys out the ones that cannot run the assignment as written, judging each against
where the student is now rather than where the link started. There is one copy of the
rule, so what a link may say and what a student may choose cannot disagree.
`tests/choice-guard.test.ts` checks it against the generator in both directions:
every choice it allows builds the teacher's round with every pinned rhythm still
askable, and every choice it blocks is a real problem.

Two bounds are worth stating because a link author cannot see them. `pass` is
checked against the length the round will **actually** be, which is 5 when the
link sets no `n` — `?pass=8` alone is refused rather than printing an
unreachable goal on every card. And a full-measure round never repeats a
measure, so a pool of *k* rhythms can fill at most *k*⁴ questions: two rhythms
make 16, and asking for 20 is refused at the link rather than throwing midway
through building the round.

### What an assigned score can and cannot claim

The app has no accounts, so nothing here is proof. What it does do:

- **The answer order is per student.** Every student who opens a link gets the
  same questions with the same four options — that is what `seed` is for — but
  the *order* of those options follows a typed name, or failing that a
  per-browser string that never leaves the device. A posted answer key does not
  transfer.
- **Attempts are counted, and the count survives a reload.** The card, the
  copied summary and the verification code all say which run produced the
  score. The tally lives in browser storage keyed by the assignment's own
  canonical link, so reloading the page — the same gesture as replaying the
  round — does not reset it to one.
- **A retry can be what the assignment needs it to be.** `retry=reseed` gives a
  retake the same conditions on new questions, seeded from the link's seed plus
  the attempt number so a teacher can regenerate any attempt; `retry=off`
  withdraws the control. Attempt one of a `reseed` round is the same round the
  link would ask without the parameter.
- **`fb=end` withholds the answer key** for rounds that are being graded, and
  the end-of-round review is where a held round gets learned from.
- **Practice closes during an assigned round**, because it reveals the counts
  for the same vocabulary the round is testing.

None of this survives a determined student: the verification code's algorithm
is in this repository, and progress is device-local. **`retry=off` cannot stop a
page reload** — it removes the control and the attempt tally reports the further
attempt, which is the same posture this app takes toward a pass mark: state what
happened and let a human decide what it means. It raises the effort from "press
retry" to "deliberately cheat", which is the honest goal.

## Local development

Requirements: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:3000`).

## Testing

```bash
pnpm test
pnpm lint
pnpm build
```

`pnpm check` runs the unit tests and the rendered-HTML tests. Separately, `pnpm test:browser` drives a real Chromium against a running copy (layout at real widths, focus order, the clipboard, a round played to its result card, the published sequence links). It is opt-in and not part of CI; run it by hand before a release that changes a page or the header. See [`tests/browser/README.md`](tests/browser/README.md) for the variables, what each file covers and what it does not (real devices and screen readers).

## Architecture

- `src/rhythm/` owns the catalog, counting-system maps, prompt assembly, validation, and rhythm types.
- `src/question/` owns seeded randomness, distractor construction, question generation, and pure challenge-session state transitions. Question content comes from the seed alone; an optional `variant` reshuffles the choices afterwards, so a round with no variant is byte-identical to one generated before variants existed.
- `app/RhythmNotation.tsx` renders the structured notation recipes with VexFlow.
- `app/CountItApp.tsx` contains the responsive Practice and Challenge experience and persists only lightweight preferences/best score in `localStorage`.
- `tests/` verifies catalog validity, count mappings, supported levels, distractor correctness, seeded generation, non-repetition, scoring, reset behavior, and invalid-input failures.

See [`docs/supported-rhythm-catalog.md`](docs/supported-rhythm-catalog.md) for the complete MVP vocabulary and counting rules.
See [`docs/notation-engraving-standard.md`](docs/notation-engraving-standard.md) for the beam, dot, partial-beam, and visual-review contract. The local `/notation-audit` route renders the complete review sheet.

## Correctness decisions

- The selectable profiles are Standard (`1 e & a`), Eastman (`1 ti te ta`) and Eastman variant (`1 ta te ta`). Labels identify the exact mapping because Eastman naming differs across teaching materials; Takadimi remains internal compatibility data.
- Every catalog recipe fills exactly one quarter-note beat and is validated at startup/test time.
- Every catalog recipe is checked against an independent engraving baseline for beams, dots, and partial-beam direction.
- A full-measure prompt is assembled from independently verified cells whose spans fill the bar, and each cell is numbered by the beat it starts on, so beat numbers are substituted consistently in every meter.
- Full-beat rests are excluded from scored prompts because an answer containing no spoken syllable would be ambiguous in a text-choice interaction.
- Distractors are generated from other valid active-position patterns or a deliberate beat-number error and are rejected if they normalize to the correct answer.

## MVP limits

- Straight quarter-, eighth-, and sixteenth-note subdivisions in quarter-note-beat meters only (2/4, 3/4, 4/4, 5/4, 7/4).
- A full-measure round never repeats a measure, so a short bar caps the round: two rhythms make only four bars of 2/4, so Level 1 in 2/4 is a four-question Challenge rather than five. An assignment link is refused instead of shortened.
- Scored assignments retain the existing straight-subdivision vocabulary. The separate unscored workshop adds eighth-note triplets, ties across beats, dotted spanning values, syncopation and odd-meter beat grouping. No compound meter, cross-barline ties, microphone input, student accounts, cloud sync or score syncing. Cloudflare Web Analytics and the shop's existing visit counter measure site traffic; neither receives practice answers or scores.
- A profile can be saved optionally on this device for free practice when browser storage is available and retained. A teacher's assignment profile takes precedence and does not overwrite the saved preference.
- Progress is device-local and intentionally lightweight.
- Results can be copied or downloaded as PNG cards. The last 50 completed challenges are saved on this device without names or class IDs. No automatic submission to an LMS.
- Nothing is timed and no duration is recorded, so a score says what was answered but not how long it took.
- Free practice opens in Practice / Level 1 / full 4/4 measure / guide on. Saving the practice setup is opt-in; it restores level, question size, meter, guide and an optional rhythm pool. A counting profile is saved separately. Assignment links take precedence and never overwrite either saved default.

## Privacy and accessibility

Count It requires no student account and does not sync practice answers or scores
off-device. Lightweight preferences, the personal best, a per-assignment attempt tally
and an opaque random string used only to vary answer order use browser storage when
available. Browser settings may block storage, and clearing site data may remove it.

Count It loads a Cloudflare Web Analytics beacon from `app/layout.tsx` and uses the
shop's existing visit counter, described below, for site-traffic measurement. These
traffic requests do not carry practice answers or scores; answers and scores are not
synced off-device. The Cloudflare beacon carries the same site token as the rest of
backwerdrhythmshop.com so this app's page views land beside the page that describes it.
The shop site's `/privacy/` describes the beacon for visitors.
Keyboard shortcuts, visible focus, semantic controls, live feedback, and responsive
layouts support phone, tablet, and desktop use.

## Deployment

The public build is at `count-it.backwerdrhythmshop.com`, and as of
**2026-08-01 it serves a current build** — verified by the shop site's Link
audit, which runs on GitHub Actions where that domain is reachable and reported
`now shipped` for this app.

**Publishing lives in this repository, and a merge ships once CI is green.**
`.github/workflows/workers.yml` runs on a successful **Validate** run against
`main`, re-runs `pnpm check`, and deploys the commit CI validated — not whatever
`main` has become by the time it starts.

This section used to say the opposite: "There is no deploy workflow here and none
is wanted", because the Workers Git integration was configured dashboard-side and
was not visible from git. That arrangement deployed correctly, and it had one
consequence worth remembering now that it is gone — **you could not tell from
this repo whether a merge published.** You can now: read the workflow run. The
site repo's **Link audit** workflow still fetches the live origin independently,
which is the stronger check of the two.

This app spent roughly 2026-07-27 to 2026-08-01 with four merged releases that
never reached users, because nothing in the repo published and nothing said so.
That is the failure mode this section exists to prevent.

`package.json` carried `deploy` and `deploy:dry-run` scripts that ran `wrangler
deploy` directly — unused, and in direct contradiction of "none is wanted"
above. Removed rather than documented: a second, working deploy path is exactly
what created the confusion this section describes, whether or not anyone ever
ran it.

### History, so the dead ends stay dead

- This app was scaffolded as an **OpenAI Sites** project. `.openai/hosting.json`
  still carries its project id and `build/sites-vite-plugin.ts` still packages
  the metadata, but Sites is no longer the live origin. The site repo settled
  the question by fingerprinting four origins against known-good examples: this
  one answers like a Cloudflare Worker and shows none of the GitHub Pages
  tells that Stick Lab still leaks through the same proxy.
- **`CNAME` is gone.** It was a GitHub Pages leftover; `pages-build-deployment`
  last ran 2026-07-21 and Pages is not the origin.
- **`.github/workflows/workers.yml` is gone.** It was a manual-only
  (`workflow_dispatch`) path that required a `cloudflare-workers-production`
  environment holding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Those
  secrets were never added and the workflow **never ran once** in 31 runs of
  this repo's history, so it published nothing and could not have. It is in git
  history if the API-token route is ever wanted again.
- **`vite.config.ts`** builds a Wrangler config inline, but that is
  `localBindingConfig` — dev bindings only, not a deploy config.

`vinext build` emits a complete deploy config at `dist/server/wrangler.json`:
worker name, compatibility flags, entry point, assets directory. There is no
hand-maintained `wrangler.jsonc` to drift from it. `pnpm deploy:dry-run` runs
the whole thing locally without credentials.

> **Size headroom is thin, and the number moves.** Measured with
> `wrangler deploy --dry-run --config dist/server/wrangler.json` at `2026-08-22`:
> **2690.02 KiB, 1004.59 KiB gzipped**, up 0.09 KiB from `2026-08-08.6`
> (1004.50 KiB) — the analytics beacon is one script tag and costs about what
> that sounds like. Before it, `2026-08-08.6` was up 1.07 KiB from
> `2026-08-08.5` (1003.43 KiB), itself up 2.55 KiB from the release before. The
> figure this note carried two passes ago (995 KiB) had gone stale unnoticed,
> which is the failure mode a hand-copied number has. Re-measure here on every
> release rather than trusting the line above it.
>
> Against the 1 MiB (1024 KiB) Workers script limit on the free plan that leaves
> roughly 20 KiB. **Confirm the plan's real ceiling in the Cloudflare dashboard
> before adding a dependency** — this note has previously implied a limit near
> 1000 KiB, and which of the two is right decides whether there is headroom or
> none. On a paid plan the limit is higher. One added dependency can break the
> deploy, and the failure reads like an unrelated build error. No bindings are
> required; the `IMAGES` binding `worker/index.ts` declares is unreachable,
> since nothing imports `next/image` and no built asset references
> `/_vinext/image`.

## Support and feedback

- **Report a problem** emails `support@backwerdrhythmshop.com`.
- **Request a feature** emails `feedback@backwerdrhythmshop.com`.
- Both controls are available in the app footer and prefill the app name, build,
  page URL, and browser details to make follow-up easier.

## Design and provenance

The navy/orange visual language and structured rhythm-recipe approach were adapted from the local Backwerd Rhythm Shop applications and the Rhythm Repper implementation. Count It owns its copied data and UI code and has no runtime dependency on those projects. Product scope follows the Count It product brief and the Backwerd Rhythm Shop app-portfolio notes supplied for this build.

## Visit counter

The footer shows a running visit count next to the build stamp. It comes from our own
Cloudflare Worker at `counter.backwerdrhythmshop.com`, which stores exactly one thing:
an integer per app. No IP, no user agent, no cookie, no timestamp — nothing tied to a
visitor. Counted once per browser session; localhost and file:// only read the number
so development never inflates it.

It is progressive enhancement. If the endpoint is offline, blocked, or not yet
deployed, the footer renders exactly as it did before and the app is unaffected.

## Follow

Backwerd Rhythm Shop posts practice ideas, new app releases, and classroom tips:

- Facebook — <https://www.facebook.com/backwerdrhythmshop/>
- Instagram — <https://www.instagram.com/backwerdrhythmshop/>
- YouTube — <https://www.youtube.com/@backwerdrhythmshop>

These three links also appear as icon buttons in the app footer.

## Ownership

© 2026 Backwerd Rimshot, LLC. All rights reserved.

## Compact practice workspace

The laptop view keeps the main instrument or exercise and its practice controls together. Help contains the instructions and About contains the app, support, and build information. Long reference material and exercise grids scroll inside their own panels; narrow and zoomed windows retain normal page scrolling.
