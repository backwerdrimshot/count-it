# Local PR88 / beginner integration

Status: local engineering integration only. Branch `charlie/beginner-pr88-integration`; worktree `/Users/taylordwyer/Developer/Codex/2026-10-21/task/count-it-integration`. Reviewed candidate `/Users/taylordwyer/Developer/Codex/2026-10-21/task/count-it` and branch `charlie/beginner-supplement-v1` remain unchanged at `50749edf87bac4004d7394496c8aa9707b30c756`. Claude's branch was not changed. No Git merge, remote comment, push, PR, hosted CI, deployment or paid release workflow was performed.

## Fresh upstream and deployment snapshot

Repeated fresh fetch and GitHub read-only inspection on 2026-10-21 confirmed:

- Main: `15e701cac75d2b37f1451a678637ad55976bd93b`.
- PR88: open, unmerged, head `0f747240033d1c55efdc765d04c1aecc3c8bc815`; its base/merge-base is `a552743fed0fecf6ffc17e52718cb1c90a77db6a`. GitHub reports mergeable false at that snapshot.
- Public deployed `https://count-it.backwerdrhythmshop.com/praxis-capabilities.json`: HTTP 200, version `2026-10-21.3`, free defaults Level 1 / full 4/4 measure / guide on, and no `responseVocabularies` declaration. Website copy naming .3 is consistent with current main/PR89, not evidence that PR88 merged. The served manifest does not independently prove the deployment's Git SHA.

The combined candidate uses a distinct local build identifier `2026-10-21.5`; this is not a deployment assertion. Website launches remain gated on the actual served `eighths-v1` capability.

## Diff ownership and reconciliation

PR88's nine-file patch was inspected against its own base, then its content was applied locally without merging its branch history. The integration branch starts at reviewed candidate `50749ed`, which already descends from current main/PR89.

- **Claude/PR88:** one-beat fresh free-practice default; saved full-measure preferences still restore; general `scroller` ref and `overflowing` state measured after drawing; one conditional keyboard region/tabstop/cue; its trainer checks and practice-length/workspace regressions; matching README/default capability text.
- **Beginner candidate:** response context and half-beat guide filtering; exact five supplementary settings/IDs; response parser/generator/builder/result/history contracts; profile-only dock-in-flow/lesson styling. These contracts have no source diff against `50749ed`.
- **Local integration correction:** keep the general focus ring inside the paper panel (`outline-offset:-3px`) and use dark green `#365c35` for clear visibility. Remove the candidate's duplicate profile overflow state/cue/outline. The combined renderer has one overflow implementation and one cue regardless of profile. Add two trainer assertions that the phone focus ring remains inset. A final phone flow exposed a pre-existing 1px hover hit-box oscillation when smooth focus scrolling placed the pointer on Next’s edge; the integration now suppresses that transform only on docked primary actions. Ordinary pointer clicks remain the regression test; none are forced or silently swallowed.
- **Reporting/privacy:** PR89's class codes, repeated-question labels and per-round Canvas behavior remain from main. No learner account/backend or new result transmission was added.

Compared directly with PR88, `ScoreNotation.tsx` adds only the beginner response import/context, half-beat label filtering and matching effect dependency. `src/practice-settings.ts` and its two unit-test files match PR88's source. Original published catalogs/presets/links and golden replay fixture remain unchanged.

## Validation and review

The aggregate suite includes the original candidate's 39 legacy round hashes and canonical keys, all beginner capacity/distractor tests and the new proposal diagnostics. Build, rendered Worker HTML, TypeScript, lint and browser evidence are recorded with the final local commits.

Independent read-only review found no runtime blocker: one general overflow implementation; visible inset focus ring; beginner response/history/builder/result contracts preserved; PR88 one-beat/saved-preference behavior retained. Its initial focused rerun passed 31/31 tests. Proposed repair evidence received a separate independent review.

The original main/candidate trainer comparison had 37/39 with the same two whole-note-fit failures. The combined branch uses PR88's intended horizontal-scroll contract and updated tests; do not relabel those historical failures as new regressions or pretend the old fit assertion passed.

## Remaining decisions

No unresolved pedagogical design choice blocks this engineering integration: the approved five-step bridge remains supported introduction plus reduced-support recognition, with no validated mastery or physical-duration claim. Teacher observation of playing and duration is normal instruction, not an added publication-approval question.

Remaining release work is concrete: decide which owner publishes/rebases the combined changes, coordinate app/site capability verification and final build identity, and obtain the already-required explicit authorization for remote publication/spending. Real-device, touch-drag and screen-reader coverage remain limits of the local automated evidence. The user has subsequently authorized merge/deploy after checks; the root owner is consolidating the separate bounded cost authorization described in `release-cost-preflight.md`. No second repair batch is implemented; see `repair-proposal-validation.md` for the exact seed evidence before that next implementation decision.


The full browser inventory also exposed a stale contrast harness assumption that challenge playback exists before answering. The application already withholds it. The harness now asserts that withholding, answers a question, then checks the actual playback controls; its targeted rerun passed 205/205. This test repair changes no playback behavior.
