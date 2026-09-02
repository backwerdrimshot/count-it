# Notation engraving standard

Count It treats engraving as instructional data. Beam grouping, dots, rests, durations, sounding positions, and spoken counts must agree before a rhythm cell can ship.

Current baseline: `count-it-quarter-meters-beginner-v3`  
Rules review date: 2026-07-20  
Spanning-note family review date: **not yet reviewed**  
Independent musician sign-off: pending

v3 removed the 3/8 eighth-beat family and its whole-bar beam exception
(2026-08-29 — eight-time is now an app of its own, live 2026-09-02). The remaining rows
are the 2026-07-20 baseline untouched; narrowing the standard re-reviewed
nothing.

## House rules for the MVP

- Each catalog cell fills a whole number of quarter-note beats: four sixteenth-ticks per beat, times the beats it spans. Almost everything spans one; a half note spans two and a whole note four.
- Beam groups remain inside their beat. A beam never crosses a beat or a rest.
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

### Spanning notes — NEW, not yet reviewed

| Cell | Beats | Beam groups | Dotted tokens | Explicit partial beams |
| --- | --- | --- | --- | --- |
| `half` | 2 | none | none | none |
| `half-rest` | 2 | none | none | none |
| `whole` | 4 | none | none | none |

Nothing to beam and nothing to dot: a beam joins separate notes, and these **are** one note held across beats. What a reviewer has to check is one level up — that the bar gives them the right number of beats, and that the note sits where its beat starts. The measure cards on the audit sheet are where that shows.

Token indexes are local to a one-beat rhythm cell. A partial-beam direction is recorded against the original token index and translated to its position inside the VexFlow beam group at render time.

## No cross-beat beam

There is no meter here that beams across a beat: every bar beams beat by beat, reading each cell's reviewed groups. 3/8 was the one exception — it beamed its whole bar as one group, with the secondary beam broken at the beats — and it left with the meter on 2026-08-29. `measureBeamRuns` remains the single place beam runs are assembled for a bar, so the renderer still never decides engraving inline, and a future cross-beat rule would land there deliberately rather than be discovered in a React effect.

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
3. Review all 19 cell cards **and the measure cards** at phone, tablet, desktop, and classroom-display widths. The measure cards exist because per-beat beaming across a full bar is not visible on any single-beat card.
4. Compare the mixed-duration and rest patterns with an independently engraved reference.
5. Check the dotted eighth–sixteenth and sixteenth–eighth–sixteenth cells at high zoom.
6. Confirm that the reference highlight and spoken count agree with every note attack.
7. Capture a full audit-sheet baseline after approval.
8. Record the reviewer and date below.

## Human sign-off record

| Review | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| Rules and implementation | Codex | 2026-07-20 | Complete | Structured expectations, explicit partial beams, tests, and audit route added. |
| Spanning notes — half, whole, half rest | — | — | **Pending** | Three cells that last longer than a beat, which is new to this catalog. Automated gates pass. Two things need a human: that a whole note alone in a bar is placed acceptably (VexFlow left-aligns it; some engravers centre it), and that the half rest sits on the correct side of the middle line in percussion clef. |
| Eighth-beat family and the 3/8 whole-bar beam | Owner | 2026-08-24 | Superseded | Reviewed and approved on `/notation-audit`, then removed with the meter on 2026-08-29 — eight-time became an app of its own (live 2026-09-02), and this row traveled with it as the record of what was signed off. |
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
