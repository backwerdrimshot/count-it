# Count It

Count It is a local-first rhythm-reading MVP for Backwerd Rhythm Shop. It helps musicians connect standard notation to spoken subdivision counts through guided practice and short, scored challenges.

The app deliberately begins with a small, verified straight-subdivision catalog. Rhythm notation, timing, accepted answers, distractors, and explanations all come from the same structured data model; no answer is inferred from an SVG.

**Public app:** <https://count-it.backwerdrhythmshop.com/>

## What is included

- **Practice:** move through one-beat or four-beat prompts, reveal the count, inspect the subdivision guide, and read a short explanation.
- **Challenge:** answer five multiple-choice questions with immediate feedback, explanations, score, accuracy, retry, and a locally stored personal best.
- **Three cumulative levels:** quarter/eighth-note foundations, eighth-note placement with rests, and verified sixteenth-note cells.
- **Responsive, accessible UI:** phone, tablet, and desktop layouts; keyboard shortcuts 1–4 for answers; visible focus; semantic controls; and live feedback.
- **Deterministic rhythm engine:** seeded question generation, non-repeating prompts until vocabulary exhaustion, exactly one correct option, and misconception-based distractors.

## Run locally

Requirements: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:3000`).

Useful checks:

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
- The repository is hosted at <https://github.com/backwerdrimshot/count-it>, and
  deployment uses the custom domain recorded above.

## Planned for v1.1 — support and feedback

The next release will add separate **Support** and **Feedback / Feature Request**
controls. They must be easy to find, keyboard accessible, usable on mobile, and include
the app name and version where possible. Final destinations will be documented after the
intake channels are confirmed and tested. These controls are planned and are not
represented here as shipped in the current release.

## Design and provenance

The navy/orange visual language and structured rhythm-recipe approach were adapted from the local Backwerd Rhythm Shop applications and the Rhythm Repper implementation. Count It owns its copied data and UI code and has no runtime dependency on those projects. Product scope follows the Count It product brief and the Backwerd Rhythm Shop app-portfolio notes supplied for this build.

© 2026 Backwerd Rimshot, LLC. All rights reserved.
