# Count It in Praxis Percussion Program

Planning date: 2026-10-07. Taylor confirmed that Count It is also being built into Praxis Percussion Program. Integration is part of the intended scope; this document plans that work and does not claim it is implemented.

## Current, verified

- Standalone Count It PR #63 implements the rhythm-reading workspace: full-measure defaults, aligned notation/guide, custom rhythm pools, playback, an unscored advanced workshop, local history and PNG results.
- The locally inspected Praxis Platform revision `51f0b19bda2ed2ba15f5e68e9f5e808305c0511f` contains `apps/count-it-contract/index.html`. This is a separate rudiment sticking knowledge quiz with A1 evidence, not the standalone rhythm-reading engine. Preserve its existing activity and skill contracts during integration.
- `apps/shared/praxis-program-app-catalog.js` does not yet list the rhythm-reading Count It app.
- Platform ADR 0033 adopts framed activities and validated `postMessage` result transport. The platform owns identity, attribution, authorization and durable records. Activities receive no learner credentials and cannot award mastery or teacher verification.
- Standalone `src/result.ts` builds local evidence but transmits nothing. Its shape uses `schemaVersion`, nested `app` and `outcome`; the existing platform quiz uses `contract`, `appId`, `skillId` and evidence entries. Sharing the label `praxis.result.v0_1` is not proof that those payloads are interchangeable. An adapter and platform-validator tests are required.

## Proposed implementation order

### 1. Director-led Program practice

Register a Count It rhythm-reading activity and add a Program entry that opens its practice workspace. Use the platform's registered activity launch surface; implement the framing/launch portions of ADR 0033 rather than creating an independently maintained copy of the app. Confirm the current launcher implementation and registered origins before changing it.

Carry over the same readable measure spacing, aligned guide, rhythm selection, playback and advanced workshop. Launch with Practice, full 4/4 measures, Level 1 and guide on when the director has not supplied settings. Program chrome provides a clear return route. Standalone use stays free and useful.

The first acceptance milestone is a director opening Count It from Program, selecting a rehearsal rhythm, listening and returning to the Program workspace. It does not require student accounts or persistent learner evidence.

### 2. Governed assignment launches

Map Program assignment settings to the existing Count It parser: rhythm pool, meter, scope, counting profile, guide policy, attempt limit and feedback policy. Explicit assignment settings override saved free-practice preferences. Preserve versioned content and deterministic rounds.

Keep the rudiment quiz's existing activity ID and evidence meaning intact. Give rhythm reading a distinct registered activity identity. Reconcile an approved rhythm skill mapping with the platform vocabulary; do not invent skill IDs or attach rhythm results to rudiment knowledge skills for convenience.

### 3. Result delivery and director review

Create and validate an explicit adapter into the platform's accepted result contract. Bind the result to the launch's opaque attempt reference. Follow ADR 0033's exact origin, frame-source, payload and activity/skill checks; the Worker revalidates, authorizes and attributes the attempt from its own context. Do not add credentials to activity URLs or broaden CORS to bypass the launch boundary.

Persist through the existing authorized platform path, with idempotent retry and a visible saved/failed state. A failed delivery retains the local result. Include actual conditions, guide use, rhythm pool, scoring/content versions, completion and answer correctness. Playback and workshop exploration are practice aids, not evidence of performed rhythm accuracy. Advanced workshop exercises remain unscored until separately validated.

Program-owned history and director reports must come from durable platform records; the standalone device-local history is a convenience, not the Program record. Teacher review owns any attestation or mastery decision.

### 4. Verification and release

Verify embedded viewport sizing, readable dense measures, keyboard operation, return navigation and playback cancellation on departure. Check preference isolation and assignment overrides in framed and standalone use. Test duplicate results, wrong origin/source/activity/skill, invalid payloads, launch expiration, failed delivery and tenant isolation at the platform boundary.

Begin result delivery with synthetic staging data under existing platform gates. Director access and learner access are separate release decisions; integration does not authorize changing the learner-data firewall. Complete musician review, capability/guide updates and deployment verification before calling either build released.

## Build ownership

- Count It owns rhythm generation, notation, counting, playback, local practice and the activity-side launch/result adapter.
- Praxis Percussion Program owns the catalog entry, launch context, assignments, permissions, durable results and director reporting.
- Shared behavior should have one maintained source. If later native Program embedding requires extracting the engine into a package, propose that architecture in the platform ADR process before introducing a second implementation.

Platform implementation must follow its current handbook and lane checks. Other active Program work should be inspected and coordinated before editing shared platform paths. This planning update changes only the Count It repository.
