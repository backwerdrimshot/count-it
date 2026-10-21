# Supported counting repairs v1 — local handoff

Status: local implementation for review only. No push, hosted CI, PR, publication or deployment is authorized for this batch. The live app remains2026-10-21.5. This candidate reserves local build2026-10-21.6; release owners must reconcile that ID before any future release.

App/source owner: Charlie / Count It. Base: `e41e6b873d52ee8fa4bb90a0d9eef9dbe1fcad2e` (fresh main, PR90 merged). Isolated branch `charlie/counting-gap-repairs-v1`, checkout `/Users/taylordwyer/Developer/Codex/2026-10-21/task/count-it-repairs`. No repository `.agents/skills`, AGENTS.md or parent task instructions were present in the searched local trees. Existing README, catalog, supported-rhythm catalog, follow-up plan and exact previous repair diagnostics were inspected. A read-only GitHub ownership check found only PR88 open, still at0f747240, with no competing supplementary repair PR. Published presets/catalogs, old IDs, URLs, seeds and questions are unchanged. No website or canonical lesson files were edited.

## Exact integration contract

Source of truth: `src/assignment/repairs-v1.ts`. Local preview: `/repairs-v1`, noindex, excluded from catalog/presets. It is an ordinary local app route, not access control; remove/reconcile its local-review copy or gate the route before future approved publication. The machine payload `repairs-v1-integration.json` exports every exact setting/query, local launch, future production target, lesson, separate prerequisites, resource links, original prerequisite/next launch, purpose, capacity, question exposure and every generated answer/choice. It is not a live catalog promise.

IDs `counting-repairs-v1-1`, `-2`, `-3`, with sequence evidence `counting-repairs-v1#1..#3`. These are **three branch-specific entry points**, before original steps4,7,10, not three consecutive levels. All are Standard4/4, guide on, feedback each, same-round retry, hints off, no passing threshold or time limit. Optional existing `class=…` reporting remains available and self-entered. No account/backend or automatic learner-result transmission was added.

| ID suffix | Scope/pool | Count / seed | Placement |
| --- | --- | --- | --- |
|1|4/4 bar; quarter,eighths,eighth-rest,rest-eighth; half-beats-v1|8 / cr-repair-v1-rest-bars|After quarter/pair bridge and eighth/rest notation preparation; before original4, with the response-transition warning below|
|2|One beat; two-rest,rest-two,rest-three; existing full-position responses|6 / cr-repair-v1-rest-cells|After original5/6 and explicit sixteenth-rest preparation; before original7|
|3|4/4 bar; whole,half,half-rest,quarter,eighths; half-beats-v1|6 / cr-repair-v1-long-notes|After Notes & Rests long-value work; before original10, with the response-transition warning below|

## Minimal engine decision and capability implications

Do not broaden `eighths-v1`: its quarter/pair-only contract, three-choice beat introduction, generated rounds and URLs remain intact. Requiring `e`/`a` merely to learn eighth rests or long values would add a separate untaught prerequisite. A new opt-in `half-beats-v1` contract therefore reuses the existing half-beat guide/distractor filter for exactly **two complete pools** above, Standard, measure scope, explicit4/4 only. Subsets, unrelated cells, beat scope, other meters/systems, missing meter and repeated/unknown response versions are refused. Four choices remain. This is no new response mode, tie, multi-bar or performance engine.

Capability schema remains additive1.1.0. The candidate manifest declares half-beats-v1 `cellPools`, `scopes:[measure]`, `meters:[4-4]`, positions0/2 and four measure choices. A consumer must verify the response ID **and its exact pool/scope/meter contract** before exposing links; HTTP success/date is insufficient, because old deployed builds ignore unknown parameters. Use `cellPools` as alternatives, not the union `cells` as one supported pool. Result schema remains praxis.result.v0_1; `activity.contentVersion` is the actual response profile ID or null for unversioned rounds. Builder import/reopening, canonical round keys, replay settings and saved history preserve the profile. The middle repair uses existing responses and has null contentVersion; its independently versioned sequence marker and exact settings identify its content.

A small generic feedback correction now describes **written note starts** rather than saying an extra start falls where the rhythm is silent. A whole/half note may still be sustaining there. This intentionally changes explanatory feedback copy for old rounds; generation, choices, scoring, keys and historical replay hashes do not change. The app still cannot distinguish held duration from an eighth/rest pattern with the same starts or assess how a learner plays either.

## Prerequisites and limits

Each launch includes the relevant instruction on the direct app screen. Half-beat lessons dispatch from the profile/pool; the exact three-cell Standard one-beat rest pool plus reserved new seed cr-repair-v1-rest-cells selects its own lesson even after builder metadata loss. Historical/custom links with other seeds retain their prior support conditions; a teacher who changes this seed must provide the response lesson separately. These new instructional launches keep the feedback panel in normal flow to avoid covering phone choices. Rest-bar instruction teaches that `&` alone can be **correct**, while the original beginner intro's offbeat-only choice remains wrong in its own quarter/pair-only pool. No e/a responses appear in repairs1/3. Long-value instruction teaches one whole-note start, sustained half-note duration, elapsed silent/held beats, and `|` separating **nonempty start groups**. Do not infer one group per beat, repeat attacks across held spans, or a duration display from the guide.

Repair2 explicitly teaches all four equal positions `1 e & a`, sixteenth notes/rests, the three target note/rest arrangements and wrong beat-number2 choices. Do not use it to introduce rests before teaching sixteenth subdivision. The canonical [Sixteenth Rhythms lesson](https://backwerdrhythmshop.com/lessons/sixteenth-rhythms/) and original5/6 are its preparation; root/site owner will coordinate the exact rest-example follow-through. [Notes & Rests](https://backwerdrhythmshop.com/lessons/notes-and-rests/), [Time Signatures](https://backwerdrhythmshop.com/lessons/time-signatures/) and free [Rhythm Practice Kits](https://backwerdrhythmshop.com/resources/rhythm-practice-kits/) supply notation, meter and teacher-led playing/changed-bar checks. The machine payload links the unchanged original prerequisite and next activities directly.

**Legacy prerequisite:** original2 is optional, not required preparation for repair1. It also exposes e/a distractors; the preview and export explicitly require the four-position response lesson before opening it. Teacher-led Notes & Rests plus the inline rest examples are the primary preparation.

**Legacy transition:** original4 still has e/a distractors even though its correct notation is quarter/eighth based. Original10 also retains full-position distractors. The new half-beat repair alone does not prepare these response demands. Before using those unchanged next links, teach the four-position response convention and wrong beat labels, or use a teacher-led changed-bar check instead. This limitation is displayed beside each next link; it is not silently repaired by relabeling a legacy assignment.

Wholly silent measures remain unsupported because no empty response exists. The long-note pool has44 nonsilent bars (45 arrangements minus the all-half-rest bar). Teach whole-bar silence on paper or physically; do not add a nominal silent prompt with an invented count. No whole-rest symbol, ties or new note/rest cells were added.

## Exact coverage and interpretation

The new profiles preserve the proposal's notation draws but change its distractors. New exact questions/choices replace no historical diagnostics: inspect `repairs-v1-integration.json`; the old proposal files remain historical evidence of why e/a was unfair here.

| Repair | Exact coverage | Sampling limit |
| --- | --- | --- |
|1|8 distinct notation bars/256,7 distinct count strings. Cell occurrences quarter10,eighths10,eighth-rest5,rest-eighth7; exposures7,7,5,5 questions.|Brief varied support, not exhaustive. Quarter and eighth+rest share starts, so different notation need not mean a different answer pattern.|
|2|Complete3-cell pool, each twice in6 responses.|Purposeful introduction/reinforcement; shuffled choices and repeated cells are not new rhythms or independent evidence.|
|3|6 distinct bars/44,6 count strings. Occurrences whole1,half2,half-rest4,quarter6,eighths2; exposures1,2,4,4,2.|One whole-note model, uneven half-rest sampling; no half/half-rest starts on beat2. Not comprehensive placement coverage or duration assessment.|

Guide knowledge, notation recognition, meter tracking, response reading, immediate feedback and retries are separate conditions. A supported correct answer may reflect guide/choice matching. Retry replays the exact seed. Local history can be cleared; no authenticated first-ever attempt is asserted. Speak/clap/play a changed bar over a partner pulse and observe duration, silence, next attack and continuity separately; repeat later for delayed evidence. No mastery, retention or physical-performance validation is claimed. Public assignments, existing kits and keys remain free.

## Verification and release boundary

`tests/repairs-v1.test.ts` checks all300 nonsilent full-bar prompts across ten distractor seeds, exact fixed-seed coverage, independent attack labels/bar sums, capacity, malformed links, deterministic generation, builder/result/canonical round identity, valid offbeat answers, whole-note/no-reattack semantics and the all-silent limitation. The existing39 legacy replay hashes and all beginner contracts remain regression gates. `tests/browser/repairs.mjs` covers each candidate at320/768/1280 in light/dark, direct instructions, taught guide/choices, pointer/keyboard flow, results/history, builder and malformed links. Final executed results and independent review are recorded in `repairs-v1-validation.md`.

This batch uses local installed dependencies and local browsers only; incremental hosted spend$0. No release-cost or publication approval is requested now. Any later release requires fresh upstream/ownership reconciliation, exact-head review/checks, bounded provider estimate/approval and live capability verification before dependent website links. No new speculative assignments or broader engine features are included.
