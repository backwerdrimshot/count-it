# Beginner bridge v1 — local verification

Base: fresh `origin/main` at `15e701cac75d2b37f1451a678637ad55976bd93b`; isolated branch `charlie/beginner-supplement-v1`. No existing worktree/branch, website source, published preset/catalog or original launch fixture was edited. No `AGENTS.md` or `.agents/skills` exists in the cloned repository or its task ancestors; README, browser guidance, presets, notation catalog, capability contract and relevant plans were read.

## Automated evidence

- Aggregate Vitest: **373 tests, 34 files pass**. Includes 9 new focused generator/integration tests.
- Build: local `vinext build` passes; TypeScript `--noEmit`, ESLint and `git diff --check` pass.
- Rendered production Worker HTML: **16/16 pass**.
- Golden legacy evidence: 39 complete round hashes (13 original Count It links × absent/student-a/student-b choice variants), plus canonical assignment strings, captured using untouched `git archive 15e701c` sources. Current questions, prompts, ordered choices and explanations match those SHA-256 hashes. The published catalog, presets and URL fixture have no diff.
- Exhaustive beginner checks: all 4 distinct 2/4, 8 distinct 3/4 and 16 distinct 4/4 bars, across 100 seeds each. Independently checks correct cell-to-count labels, whole-bar beat sums, only taught answer tokens, 4 unique choices with exactly one correct answer, seed determinism and capacity rejection. 100 intro seeds verify its 3 distinct choices and two intentional encounters with each cell.
- Parser/canonical/result checks: unknown/empty/duplicate response version, unsupported meter/profile/cells and capacity overflow refused. Builder helpers preserve profile and refuse incompatible edits. Result settings reproduce the same round and distinguish its round key; `contentVersion` is `eighths-v1`. Optional class code still parses.
- Draft integration payload is derived from source, pinned by tests, and checked against declared response capability, permitted meters/cells/system and exact future production URL. It is not added to the published catalog.

Direct Node commands use the installed pinned dependencies, equivalent to package scripts. The first attempt to share a node_modules symlink could not write Vite's temporary config under the older checkout, so dependencies were copied into this isolated checkout before building. Local loopback serving and headless Chrome required sandbox escalation, which was approved. Neither operation is public hosting.

## Browser and visual evidence

**Final frozen-build browser run: beginner 335/335; challenge 18/18; settings all 5 scenario groups pass. All three selected files pass.** `tests/browser/beginner.mjs` covers all five steps at 320, 768 and 1280px in light/dark. It exercises keyboard answers and next-button focus, complete intro/check rounds, delayed feedback, retry-off UI, history persistence, reload, actual builder output and malformed imports. It also checks taught guide positions/choices, no page overflow, fitting notation without a tab stop, arrow scrolling with a visible cue when needed, and pointer access to the last choice. Screenshots are local under `outputs/beginner-browser/`.

Visual inspection includes phone supported 4/4, tablet dark introduction and desktop dark reduced-support view, plus the preview lesson (screenshots for all six viewport/theme combinations). It found the existing sticky action dock could obscure phone choices after the longer lesson; the new profile now keeps that dock in document flow. Overflow cue/tabstop/inset focus styling is conditional on the new profile; legacy rendering behavior is preserved. Inspect at final release again after PR88 reconciliation.

## Existing baseline failures

The existing trainer suite reports **37/39** on this branch and **37/39** on a separately built untouched `15e701c`. The same two checks fail in both:

- Phone 390px: whole-note guided measure is 464px inside a 326px panel.
- Phone 320px: whole-note guided measure is 464px inside a 256px panel.

These tests expect a whole-note bar to fit. Current main retains a horizontally scrollable guide at its minimum width. Do not report those checks as passing, and do not attribute them to this supplementary profile. PR88 owns the general phone scroll/default/focus fixes. No other trainer regressions were seen in the comparison. The browser harness blocks analytics.

## Independent review and limits

An independent read-only agent reviewed code and teaching content in multiple passes. Resolved findings: builder helper and actual UI lost response version; personal-best keys mixed profiles; saved history conditions omitted profile; feedback confused extra note starts with silence during a held quarter; the intro incorrectly called configured 4/4 displayed. Final focused independent run: **9/9 pass**, no valid-launch blocker. Malformed response-only builder import was also corrected.

This is Chromium automation and screenshot inspection, not actual phones/tablets, touch-drag validation, screen-reader testing, educator validation or a study of learning outcomes. No mastery claim is supported. Local attempt counters are not authenticated first-attempt evidence. No accounts, backend or new transmission were introduced. Existing optional class-code and per-round Canvas behavior is retained; these local checks are not a new full Canvas integration audit.

Publication remains blocked by intentional release holds: educator/musician review, website capability gating/ownership, PR88 shared-file reconciliation, final build identity, final device/assistive-technology checks and explicit publication/cost approval. No push, PR, hosted CI, merge or deploy occurred.


Commands used for final local evidence:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.config.ts --configLoader runner
node node_modules/vinext/dist/cli.js build
node --test tests/rendered-html.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js app src tests/beginner-v1.test.ts tests/beginner-integration.test.ts tests/browser/beginner.mjs
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" BASE_URL=http://127.0.0.1:3106 SHOTS_DIR=outputs/beginner-browser node tests/browser/run.mjs beginner challenge settings
```

The trainer comparison used the same browser harness against separate production builds on loopback ports 3106 (branch) and 3107 (`git archive 15e701c`), yielding the identical two baseline failures listed above. PR88 head/overlap and proposed integration ordering are documented in the handoff. No merge or cherry-pick was performed.
