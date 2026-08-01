# Count It

Count It is a local-first rhythm-reading MVP for Backwerd Rhythm Shop. It helps musicians connect standard notation to spoken subdivision counts through guided practice and short, scored challenges.

The app deliberately begins with a small, verified straight-subdivision catalog. Rhythm notation, timing, accepted answers, distractors, and explanations all come from the same structured data model; no answer is inferred from an SVG.

## Release information

- **Build:** `2026-08-01.4`
- **Status:** MVP built and publicly available
- **Live app:** <https://count-it.backwerdrhythmshop.com/>
- **Public app guide:** <https://backwerdrhythmshop.com/app-guides/count-it>
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

## Privacy and accessibility

Count It requires no account or backend and does not send practice progress or scores
off-device. Lightweight preferences and the personal best stay in `localStorage`.
Keyboard shortcuts, visible focus, semantic controls, live feedback, and responsive
layouts support phone, tablet, and desktop use.

## Deployment

The public build is available at `count-it.backwerdrhythmshop.com`.

**Publishing happens outside this repository, and outside GitHub and Cloudflare.**
This app was scaffolded as an OpenAI Sites project: `.openai/hosting.json` carries
its project id, `build/sites-vite-plugin.ts` packages the Sites metadata after Vite
compiles, and `worker/index.ts` is a Cloudflare Worker that the Sites platform
deploys on the app's behalf. Publishing means pushing a new build through the
account that owns that project id. Merging to `main` does nothing on its own.

Two things in the repo look like deployment paths and are not:

- **`CNAME`** is left over from GitHub Pages. The `pages-build-deployment`
  workflow has not run since 2026-07-21 and no longer publishes this app.
- **`vite.config.ts`** builds a Wrangler config inline, but it is
  `localBindingConfig` — dev bindings only. There is no committed
  `wrangler.jsonc`, no account id, and no `deploy` script, so `wrangler deploy`
  is not available here the way it is in the site repo.

Production currently lags `main` by two releases: the support fallback dialog from
PR #3, and the WCAG AA contrast fix for the orange-filled controls from PR #6.
Publish the current `main` revision through the Sites project, then verify the
footer build stamp, the support dialog, and the primary button's contrast on the
live origin before marking the release published.

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
