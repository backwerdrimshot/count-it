# Count It

Count It is a local-first rhythm-reading MVP for Backwerd Rhythm Shop. It helps musicians connect standard notation to spoken subdivision counts through guided practice and short, scored challenges.

The app deliberately begins with a small, verified straight-subdivision catalog. Rhythm notation, timing, accepted answers, distractors, and explanations all come from the same structured data model; no answer is inferred from an SVG.

## Release information

- **Build:** `2026-08-08.4`
- **Status:** MVP built and publicly available
- **Live app:** <https://count-it.backwerdrhythmshop.com/>
- **Public app guide:** <https://guides.backwerdrhythmshop.com/count-it/>
- **Repository:** <https://github.com/backwerdrimshot/count-it>

Build identifiers use ISO `YYYY-MM-DD`, based on the date the shipped app update
began. The value stays fixed while that release pass is completed across code and
documentation.

## What is included

- **Practice:** move through one-beat or four-beat prompts, reveal the count, inspect the subdivision guide, and read a short explanation.
- **Challenge:** answer five multiple-choice questions with immediate feedback, explanations, score, accuracy, retry, and a locally stored personal best.
- **Three cumulative levels:** quarter/eighth-note foundations, eighth-note placement with rests, and verified sixteenth-note cells.
- **Responsive, accessible UI:** phone, tablet, and desktop layouts; keyboard shortcuts 1–4 for answers; visible focus; semantic controls; and live feedback.
- **Deterministic rhythm engine:** seeded question generation, non-repeating prompts until vocabulary exhaustion, exactly one correct option, and misconception-based distractors.
- **Assignment links:** a teacher pins a round in a URL — rhythm vocabulary, question size, subdivision-guide policy, question count, pass mark and seed — and every student who opens it gets the same questions under the same conditions. The pinned controls lock and say why; the result card reports the conditions, the goal, and a verification code beside the score.

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
| `n` | Questions in the round, 1–20. |
| `pass` | Questions needed to pass. Reported on the card, never enforced by the app. |
| `seed` | Same questions for every student who opens the link. |
| `sys` | Counting system. `standard` only today; anything else is refused rather than silently graded against the wrong system. |

An invalid link is **rejected, never repaired**: an unknown rhythm id, a pool
under two, an impossible pass mark or an unsupported counting system each
invalidate the whole link with a plain-language message, and the app keeps
working normally underneath it. A rhythm pool with a rhythm missing teaches a
different step, so silently dropping one would produce evidence for an
assignment nobody set. Nothing about a student is stored: the optional
identifier lives in session state only, and the verification code is a
deterrent rather than proof.

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
- `src/question/` owns seeded randomness, distractor construction, question generation, and pure challenge-session state transitions.
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

## Privacy and accessibility

Count It requires no account or backend and does not send practice progress or scores
off-device. Lightweight preferences and the personal best stay in `localStorage`.
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

> **Size headroom is thin.** The build is 2655 KiB, **995 KiB gzipped**, against
> the 1 MiB Workers script limit on the free plan — about 5 KiB of room. On a
> paid plan the limit is 3 MiB. On free, one added dependency breaks the deploy,
> and the failure reads like an unrelated build error. No bindings are required;
> the `IMAGES` binding `worker/index.ts` declares is unreachable, since nothing
> imports `next/image` and no built asset references `/_vinext/image`.

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
