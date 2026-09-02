# Count It

Count It is a local-first rhythm-reading MVP for Backwerd Rhythm Shop. It helps musicians connect standard notation to spoken subdivision counts through guided practice and short, scored challenges.

The app deliberately begins with a small, verified straight-subdivision catalog. Rhythm notation, timing, accepted answers, distractors, and explanations all come from the same structured data model; no answer is inferred from an SVG.

## Release information

- **Build:** `2026-09-02.2`
- **Status:** MVP built and publicly available
- **Live app:** <https://count-it.backwerdrhythmshop.com/>
- **Public app guide:** <https://guides.backwerdrhythmshop.com/count-it/>
- **Repository:** <https://github.com/backwerdrimshot/count-it>

Build identifiers use ISO `YYYY-MM-DD`, based on the date the shipped app update
began. The value stays fixed while that release pass is completed across code and
documentation.

## What is included

- **Practice:** move through one-beat or full-measure prompts, reveal the count, inspect the subdivision guide, and read a short explanation.
- **Challenge:** answer five multiple-choice questions with immediate feedback, explanations, score, accuracy, retry, and a locally stored personal best. A round can also hold every answer to the end, and always finishes with a review of each question beside the count it wanted.
- **Three cumulative levels:** quarter/eighth-note foundations, eighth-note placement with rests, and verified sixteenth-note cells.
- **Whole and half notes:** the values the Notes & Rests poster teaches that a one-beat catalog could not express. A half note is two beats and a whole note is four, so they are the first rhythms that span rather than subdivide. They sound once, at the top of the span, and the beats underneath are silent because the note is held — this app counts the notes that sound, so a half note on beat one of 4/4 answers `1`. Measure scope only, and a whole note needs four beats so it appears in 4/4 alone.
- **Two simple meters:** 4/4 and 3/4, chosen per assignment link. 3/4 reads the same quarter-note beat as 4/4 with one fewer of them per bar, so the whole sixteen-rhythm vocabulary carries over unchanged. A link that names no meter means 4/4 and generates exactly the round it always did. 3/8 was supported from build `2026-08-24.1` to `2026-08-29.1` and then removed: an eighth-note beat brought its own vocabulary, a whole-bar beaming exception, and a whole-bars-only rule, and that load earned eight-time an app of its own (planned; the two may be recombined later). A link naming `meter=3-8` or a retired eighth-beat cell id is refused with a plain-language message, never repaired.
- **Responsive, accessible UI:** phone, tablet, and desktop layouts; keyboard shortcuts 1–4 for answers; visible focus; semantic controls; and live feedback.
- **Deterministic rhythm engine:** seeded question generation, non-repeating prompts until vocabulary exhaustion, exactly one correct option, and misconception-based distractors.
- **Assignment links:** a teacher pins a round in a URL — rhythm vocabulary, question size, subdivision-guide policy, feedback timing, question count, pass mark and seed — and every student who opens it gets the same questions under the same conditions. The pinned controls lock and say why; the result card reports the conditions, the goal, which rhythms were missed, and a verification code beside the score.

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
| `cells` | Explicit rhythm vocabulary by catalog id. Levels are cumulative, so this is the only way to assign a subset — "the rest-entry cells and nothing else" is not a level. |
| `guide` | `on` or `off`. A support policy set by the assignment, not the learner. |
| `fb` | `each` or `end`. When the correct answer appears. `end` also hides the running score and the guide's highlighting until the round is over. |
| `retry` | `free`, `reseed` or `off`. What trying again means: the same round back (the default), the same conditions on new questions, or no retry control at all. |
| `n` | Questions in the round, 1–20. Defaults to 5. |
| `pass` | Questions needed to pass. Reported on the card, never enforced by the app. |
| `seed` | Same questions for every student who opens the link. |
| `sys` | Counting system. `standard` only today; anything else is refused rather than silently graded against the wrong system. |

An invalid link is **rejected, never repaired**: an unknown rhythm id, a pool
under two, an impossible pass mark, a full-measure round longer than the pool
can fill, an unrecognized feedback setting or an unsupported counting system
each invalidate the whole link with a plain-language message, and the app keeps
working normally underneath it. A rhythm pool with a rhythm missing teaches a
different step, so silently dropping one would produce evidence for an
assignment nobody set. Nothing about a student is stored: the optional
identifier lives in session state only, and the verification code is a
deterrent rather than proof.

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

## Architecture

- `src/rhythm/` owns the catalog, counting-system maps, prompt assembly, validation, and rhythm types.
- `src/question/` owns seeded randomness, distractor construction, question generation, and pure challenge-session state transitions. Question content comes from the seed alone; an optional `variant` reshuffles the choices afterwards, so a round with no variant is byte-identical to one generated before variants existed.
- `app/RhythmNotation.tsx` renders the structured notation recipes with VexFlow.
- `app/CountItApp.tsx` contains the responsive Practice and Challenge experience and persists only lightweight preferences/best score in `localStorage`.
- `tests/` verifies catalog validity, count mappings, supported levels, distractor correctness, seeded generation, non-repetition, scoring, reset behavior, and invalid-input failures.

See [`docs/supported-rhythm-catalog.md`](docs/supported-rhythm-catalog.md) for the complete MVP vocabulary and counting rules.
See [`docs/notation-engraving-standard.md`](docs/notation-engraving-standard.md) for the beam, dot, partial-beam, and visual-review contract. The local `/notation-audit` route renders the complete review sheet.

## Correctness decisions

- The visible MVP uses the standard American `1 e & a` system. Eastman and Takadimi mappings remain internal compatibility data for later expansion.
- Every catalog recipe fills exactly one quarter-note beat and is validated at startup/test time.
- Every catalog recipe is checked against an independent engraving baseline for beams, dots, and partial-beam direction.
- A four-beat prompt is assembled from four independently verified cells, so beat numbers are substituted consistently.
- Full-beat rests are excluded from scored prompts because an answer containing no spoken syllable would be ambiguous in a text-choice interaction.
- Distractors are generated from other valid active-position patterns or a deliberate beat-number error and are rejected if they normalize to the correct answer.

## MVP limits

- Straight quarter-, eighth-, and sixteenth-note subdivisions in 4/4 only.
- No triplets, compound meter, ties across beats, syncopation across barlines, audio input/playback, tempo engine, accounts, cloud sync, analytics, or backend.
- Standard counting is the only user-selectable system in this release.
- Progress is device-local and intentionally lightweight.
- Assignment results are copied out by the student; there is no download-as-image yet, and no submission to any LMS.
- Nothing is timed and no duration is recorded, so a score says what was answered but not how long it took.
- Level, question size and guide preferences are written to `localStorage` and never read back, so a returning visitor always starts at Level 2 / one beat. Whether they should resume or start fresh is an open product decision, not an oversight to route around.

## Privacy and accessibility

Count It requires no account or backend and does not send practice progress or scores
off-device. Lightweight preferences, the personal best, a per-assignment attempt tally
and an opaque random string used only to vary answer order stay in `localStorage`.
None of them names a person: the tally is keyed by the assignment's own link, and the
ordering string is meaningless outside the browser that minted it.

One script does load: a Cloudflare Web Analytics beacon, in `app/layout.tsx`. It counts
page views and nothing else — no cookies, no fingerprinting, no following anyone to
another site. It carries the same site token as the rest of backwerdrhythmshop.com so
this app's numbers land beside the page that describes it. It is not a route out for
anything above: what a student answers still never leaves the device, which is exactly
what `integrationLevelRationale` in `src/capabilities.ts` claims. The shop site's
`/privacy/` describes the beacon for visitors.
Keyboard shortcuts, visible focus, semantic controls, live feedback, and responsive
layouts support phone, tablet, and desktop use.

## Deployment

The public build is at `count-it.backwerdrhythmshop.com`, and as of
**2026-08-01 it serves a current build** — verified by the shop site's Link
audit, which runs on GitHub Actions where that domain is reachable and reported
`now shipped` for this app.

**Publishing is configured in Cloudflare, outside this repository.** There is no
deploy workflow here and none is wanted: the Workers Git integration is
configured dashboard-side and is not visible from git. That has one consequence
worth internalising — **you cannot tell from this repo whether a merge
published.** Check the Cloudflare dashboard, or run the site repo's **Link
audit** workflow, which fetches the live origin and reports what it finds.

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
