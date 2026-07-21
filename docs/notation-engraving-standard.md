# Notation engraving standard

Count It treats engraving as instructional data. Beam grouping, dots, rests, durations, sounding positions, and spoken counts must agree before a rhythm cell can ship.

Current baseline: `count-it-4-4-beginner-v1`  
Rules review date: 2026-07-20  
Independent musician sign-off: pending

## House rules for the MVP

- Each catalog cell fills one quarter-note beat.
- Beam groups remain inside that beat; the measure renderer never creates a cross-beat beam.
- Eighth notes and shorter may be beamed. Quarter notes may not.
- The beginner baseline does not beam across rests.
- Consecutive sounding notes use beams that expose their primary and secondary subdivision grouping.
- A dotted duration is encoded as both a dotted note value and the correct tick total.
- Partial sixteenth beams are explicit where renderer defaults could obscure the intended grouping.
- VexFlow draws the notation, but the Count It data model owns the engraving intent.
- The complete subdivision reference and correct spoken answer come from the same timing model as the notation.

## Reviewed baseline

| Cell | Beam groups | Dotted tokens | Explicit partial beams |
| --- | --- | --- | --- |
| `quarter` | none | none | none |
| `eighths` | `[0, 1]` | none | none |
| `eighth-rest` | none | none | none |
| `rest-eighth` | none | none | none |
| `three-rest-note` | none | none | none |
| `rest-sixteenth-rest` | none | none | none |
| `alternating-rests` | none | none | none |
| `rest-two-rest` | `[1, 2]` | none | none |
| `dotted-eighth-sixteenth` | `[0, 1]` | token 0 | token 1 points left |
| `eighth-two` | `[0, 1, 2]` | none | none |
| `two-eighth` | `[0, 1, 2]` | none | none |
| `sixteenth-eighth-sixteenth` | `[0, 1, 2]` | none | token 0 points right; token 2 points left |
| `sixteenths` | `[0, 1, 2, 3]` | none | none |
| `rest-three` | `[1, 2, 3]` | none | none |
| `two-rest` | `[0, 1]` | none | none |
| `rest-two` | `[1, 2]` | none | none |

Token indexes are local to a one-beat rhythm cell. A partial-beam direction is recorded against the original token index and translated to its position inside the VexFlow beam group at render time.

## Automated gates

`tests/engraving.test.ts` maintains a hand-authored expectation independent of the live catalog. It verifies:

- one expectation for every catalog ID;
- exact beam groups and dotted-token indexes;
- explicit partial-beam directions;
- no quarter note inside a beam;
- no note in multiple beam groups;
- no beam across a rest in the current house style;
- real dotted-eighth duration data;
- preservation of beat-local groupings inside a measure;
- a clear failure when the production recipe drifts from the reviewed baseline.

Catalog validation also calls `validateEngravingCatalog`, so the ordinary test and build path cannot accept an unreviewed cell silently.

## Visual audit workflow

1. Run the app locally with `pnpm dev`.
2. Open `/notation-audit`.
3. Review all 16 cards at phone, tablet, desktop, and classroom-display widths.
4. Compare the mixed-duration and rest patterns with an independently engraved reference.
5. Check the dotted eighth–sixteenth and sixteenth–eighth–sixteenth cells at high zoom.
6. Confirm that the reference highlight and spoken count agree with every note attack.
7. Capture a full audit-sheet baseline after approval.
8. Record the reviewer and date below.

## Human sign-off record

| Review | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| Rules and implementation | Codex | 2026-07-20 | Complete | Structured expectations, explicit partial beams, tests, and audit route added. |
| Independent musician engraving review | — | — | Pending | Compare against a trusted engraved reference before public release. |
| Real-device/classroom display review | — | — | Pending | Check phone, tablet, projector, and high zoom. |

## Adding a new rhythm cell

A new cell is incomplete until all of these are present:

1. Structured timing and notation tokens.
2. Verified count mappings.
3. Beam, dot, and partial-beam expectation in `src/rhythm/engraving.ts`.
4. Matching independent expectation in `tests/engraving.test.ts`.
5. Audit-sheet rendering.
6. Automated tests.
7. Human visual review.

Do not update the production recipe and the test expectation mechanically in one step. First decide the intended engraving, then encode and review it.
