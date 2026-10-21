# Quarter/pair bridge v1 — local integration handoff

Integration update: this document preserves the original `50749ed` candidate evidence. The separate combined worktree now reconciles PR88 locally; current status, exact upstream hashes, ownership and release boundaries are in [integration validation](integration-pr88-validation.md). The approved beginner design has no additional unresolved educator-approval question.
Status: implemented locally for review, not published. Owner: Charlie / Count It app. Base: `15e701cac75d2b37f1451a678637ad55976bd93b` (fresh origin/main; PR89 merged). Branch: `charlie/beginner-supplement-v1`. Isolated checkout: `/Users/taylordwyer/Developer/Codex/2026-10-21/task/count-it`. No website checkout edited. Claude retains PR88 accessibility/default-size work and reporting work. The [ownership clarification](https://github.com/backwerdrimshot/count-it/pull/88#issuecomment-6308615395) was read before implementation; only PR88 was open, with no supplementary draft.

## Sources and launch contract

- App/content source of truth: `src/assignment/beginner-v1.ts`. Local review route: `/beginner-v1` (noindex, outside published catalog and sitemap).
- Exact machine-readable integration payload: `docs/beginner-v1-integration.json`; use its query strings unchanged. Relative `/?…` links target the reviewed local app. Production URLs in the payload are future targets only: **do not post them to students yet**.
- Sequence ID: `quarters-pairs-bridge-v1`. Entry IDs: `quarters-pairs-bridge-v1-1` through `-5`; evidence markers are `quarters-pairs-bridge-v1#1` through `#5`.
- All launches explicitly pin `cells=quarter,eighths`, `sys=standard`, `response=eighths-v1`, `meter`, `scope`, `guide`, `fb`, `retry`, `n`, `hints=off`, and a distinct fixed seed. No pass threshold or time limit is proposed. Optional `class=…` can be appended under PR89's existing policy.
- App build is locally identified as `2026-10-21.4`; reserve/reconcile the final build with Claude before any release. Capability schema remains the additive `1.1.0`; `configurableSettings`, `lockableSettings` and `responseVocabularies` declare the new setting. Result schema stays `praxis.result.v0_1`; new results carry `settings.response` and `activity.contentVersion=eighths-v1`. Canonical assignment/round/best keys distinguish the response profile. Absent profile leaves legacy keys and question bytes unchanged.
- Older deployed builds ignore unknown URL parameters. A website must verify `responseVocabularies` includes `eighths-v1` before exposing any launch; mere HTTP success or accepting the URL is insufficient. The website catalog/sequence contract needs to accept this new explicit setting and capability requirement. Do not infer support from a date alone.

## Teaching purposes and limits

| Step | Purpose | Size / length | Support / feedback / retry | Capacity and interpretation |
| --- | --- | --- | --- | --- |
| 1 | Meet quarter/pair cells | One beat, configured 4/4, 4 responses | Guide on / each / same-round replay | Only 2 rhythms; each twice deliberately. Predictable alternation is supported noticing, not a fresh test. Beat fragment shows no time signature. |
| 2 | Join two beats | 2/4 bar, 4 questions | On / each / same round | All 4 distinct bars, once each. |
| 3 | Track three numbered beats | 3/4 bar, 6 questions | On / each / same round | 6 of 8 distinct bars. |
| 4 | Track four numbered beats | 4/4 bar, 8 questions | On / each / same round | 8 of 16 distinct bars. |
| 5 | Reduced-support recognition sample | 4/4 bar, 6 questions | Off / end / no retry button | 6 distinct bars, a separate seed. Same finite pool can overlap practice; this is not an unseen transfer test. |

Notation vocabulary stays at quarter notes and beamed paired eighths. The response lesson in source and on both the preview and direct launches teaches numbers, `&`, beat-group separators `|`, and the intentionally wrong offbeat-only choice `&`. It distinguishes note starts from sustained duration. The opt-in generator admits only positions 0 and 2; the guide shows only those positions. A one-beat prompt has just three unique available labels (`1`, `1 &`, `&`), so it offers three choices; full bars retain four. Reordering choices is not a new rhythm.

Each step's source/payload separates notation, meter/beat tracking, response vocabulary, and support prerequisites. Teach the meter before its launch; the same note values do not remove the need to learn beat numbers and the barline. Guide-on scores may include matching to printed positions. Guide-off still supplies multiple-choice responses. Step 5 also withholds feedback and disables the retry button; opening a new visit remains possible. Existing local attempt counts persist after completion, can be cleared, and do not authenticate a student's first-ever attempt. Record a teacher-observed first sitting separately; do not claim validated mastery.

The source's playing connection asks learners to speak then clap/play selected bars over a partner's pulse, maintain quarter-note duration, divide paired eighths evenly and continue over barlines. Observe these separately. App selections do not measure pulse, sound quality, physical duration, continuity or live playing. Teacher-led extensions can draw on the existing free [Rhythm Practice Kits](https://backwerdrhythmshop.com/resources/rhythm-practice-kits/) (explanation, construction, diagnostic, ensemble and delayed checks); do not imply those are app-scored. Keep public assignments, kits and keys free.

## Website ownership and publication decision

Website owner owns the Mallet Map/curriculum batch and the eventual site pages, cards, navigation and catalog synchronization. Use these five steps as one supplementary progression, not a replacement/renumbering of the original Counting Rhythms sequence. Preserve every legacy URL, seed, settings combination and historical interpretation. The published JSON/catalog/presets remain byte-for-byte unchanged in this patch. Do not create an absolute published sequence-page URL until the website owner chooses its route. The integration JSON is a draft handoff, not a published catalog promise.

Minimal engine decision made here: an explicit opt-in response vocabulary was necessary because the legacy four-subdivision distractors demanded untaught `e`/`a` responses. It changes neither legacy guide behavior nor free-practice defaults. No generic response-mode picker, multi-bar engine, new note/rest cells, learner accounts or backend was added. Builder reopening preserves the profile, and incompatible edits are refused by the existing parser.

## Cost and validation proposal

Local unit/exhaustive generation, rendered HTML, build/type/lint and headless-browser checks use existing installed dependencies; no paid hosted CI, deployment or new service is required or was started. Review artifacts stay local. Paid workflow cost cannot be quoted from repository evidence; obtain owner approval of an explicit provider/workflow estimate before triggering any paid run.

Before publication: educator/musician signs off lengths, instructions, wrong-answer vocabulary and interpretation; independent code/content review findings are resolved; reconcile PR88 on a fresh base without altering Claude's branch; choose the final build ID; app/site owners verify capability gating and exact links together; perform final device/screen-reader checks and obtain separate publication approval. A local browser pass is not real-device or assistive-technology certification. Merge still triggers hosted validate/deploy workflows, so merge remains a separate release decision.

See `docs/beginner-v1-validation.md` for exact verification evidence and remaining limits. The next repair batch is a configuration/content proposal in `docs/next-gap-repairs-proposal.md`, not added runtime behavior or extra assignments in this commit.

## PR88 comparison and integration ordering

Read-only comparison on 2026-10-21 used PR88 head [`0f747240033d1c55efdc765d04c1aecc3c8bc815`](https://github.com/backwerdrimshot/count-it/commit/0f747240033d1c55efdc765d04c1aecc3c8bc815). Its base is older than PR89/current main; GitHub reports `mergeable:false` at that snapshot. No branch was changed or cherry-picked here.

Shared code is confined to `app/ScoreNotation.tsx`, additive CSS near notation styling, README and capability/build metadata. PR88 adds a general `scroller` ref, measures actual overflow after drawing, conditionally exposes keyboard region/tabstop/cue for every score, and at the inspected head still uses the reviewed outward `outline-offset:2px`. This branch supplies those accessibility affordances **only when response=eighths-v1** for a locally usable draft, with `beginnerOverflow`, a profile-only cue and an inset outline. Both solve the same overflow affordance for new-profile bars; do not ship two sets of overflow state/cues. The separate new-profile dock-in-flow rule fixes choice occlusion and is not in PR88.

Recommended authorized-release ordering (proposal, not performed):

1. Claude/PR88 owner reconciles its branch with fresh main/PR89, resolves the focus-ring review, and obtains the existing release approvals. Keep PR88's default-size and general accessibility ownership there.
2. Rebase/cherry-pick this implementation onto that approved final code in an integration branch. In `ScoreNotation`, keep PR88's one `scroller`/overflow measurement and one conditional region/cue; remove this branch's duplicate `beginnerOverflow` state, measurement and profile cue. Retain this branch's response context and half-beat label filtering. Keep the final inset focus treatment from the reviewed general fix; remove the profile-only outline if redundant. Keep the profile-only dock/lesson rules.
3. Reconcile build metadata once; retain PR89's repeat/class/Canvas work and PR88's agreed free default. Regenerate the capability JSON, keep the explicit `response` contract, and rerun the aggregate and both owners' browser suites on that exact integrated head. Verify readable label spacing, one cue only, fitting bars without inert stops and a fully visible inset ring.
4. Website owner exposes the draft progression only after app capability verification and explicit publication approval. Existing website-authored sequence ownership remains unchanged; this producer export covers only the new draft and does not migrate the original catalog's source of truth.

The local branch intentionally does not claim that PR88's future conflict resolution or all general accessibility fixes are complete. Its general whole-note trainer failures are separately recorded as baseline failures.
