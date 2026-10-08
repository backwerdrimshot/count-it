# Count It practice workspace

Research and implementation: 2026-10-08. Proposed release: 2026-10-07.4.

## Evidence behind the layout

[MuseScore's systems and horizontal spacing handbook](https://handbook.musescore.org/formatting/systems-and-horizontal-spacing) describes minimum readable measure widths, elastic spacing and a threshold for stretching a short final system. The useful lesson for this app is to give content sufficient space without forcing every short example to fill a wide screen. Its score-spacing documentation also treats staff size as the basis of glyph scale, rather than scaling symbols independently.

[VexFlow 5's formatter API](https://vexflow.github.io/vexflow-docs/api/5.0.0/classes/Formatter.html) provides minimum-width formatting and staff-aware formatting. Count It keeps VexFlow for glyphs, beams, dots, ties and tuplets. After formatting, it positions notehead centres on a linear teaching time grid. This is an intentional instructional layout, not a claim to reproduce a publication engraver's optical spacing. The same coordinates position the subdivision guide and playback cursor. Long note durations receive longer space; sparse one-beat fragments receive a compact centered staff. A lone whole-bar note retains conventional centering, with an annotation describing its onset and span.

[musictheory.net's exercise documentation](https://www.musictheory.net/faq) describes in-exercise customization, teacher-controlled links, challenge limits and shareable progress reports. Count It's existing assignment-link workflow already serves that purpose. This update brings rhythm selection into free practice and adds portable result images without introducing accounts.

[Rhythmicity's product page](https://www.therhythmapp.com/) describes guided rhythm reading, counting and tap-along practice across levels. It supports exploring an audible pulse alongside notation. This update implements listening and a cursor; tapping/microphone performance assessment is not implemented and is not inferred from answer accuracy.

## Product decisions

- User-selected opening setup: Practice, Level 1, full measure, 4/4, guide on.
- Save practice settings only after an explicit opt-in. Reject corrupt or impossible stored pools. Assignment links take precedence and retain the old parser and seed behavior.
- Keep the score prominent. Collapse instructions and workshop setup until needed. Let dense measures scroll horizontally with their guide rather than compressing glyphs until unreadable.
- Use one time model for drawing and playback. Triplets use exact thirds; ties suppress the continuation attack and extend the originating sound. Rests do not sound.
- Separate the advanced workshop from scored assignments. The workshop teaches new material without changing existing published classroom rounds. Its triplet convention is explicitly `1 trip let`; the existing profile IDs retain their straight-subdivision meanings.
- Bound history at 50 completed challenges. Store no typed name/class ID. Result image downloads use the same human-readable summary as the current result card.

## Validation and release boundaries

Count It is also intended for Praxis Percussion Program. See [the Program integration plan](praxis-program-integration-plan.md) for the proposed director-led launch, assignment adapter, governed result delivery and cross-product acceptance checks. This workspace PR does not yet implement that integration.

Unit coverage includes note spans, exact triplet timing, tie suppression, all workshop focus/meter/grouping combinations, invalid preference storage, history bounds and image text wrapping. The existing assignment/preset suites verify unchanged generation contracts. Browser acceptance covers default setup, note/guide coordinates, playback start/stop, saved settings after reload, workshop notation and phone layouts.

This branch does not publish a release by itself. Updating external public guides and release records is a release follow-up. The repository's notation standard still lists independent musician sign-off as pending; automated timing/engraving checks do not stand in for that review.
