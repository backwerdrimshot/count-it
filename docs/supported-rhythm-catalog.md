# Supported rhythm catalog

Count It contains 16 verified, one-beat rhythm cells. Each cell is represented as structured timing positions plus a VexFlow rendering recipe. The Standard answers below use beat 1 as the example; measure prompts replace that beat number with the beat the cell starts on, from 1 up to the bar's last beat (2 in 2/4, up to 7 in 7/4).

Subdivision positions within a beat are:

| Position | Standard | Eastman (ti-te-ta) | Eastman variant (ta-te-ta) | Takadimi (internal) |
| --- | --- | --- | --- | --- |
| 0 | beat number | beat number | beat number | ta |
| 1 | e | ti | ta | ka |
| 2 | & | te | te | di |
| 3 | a | ta | ta | mi |

The two Eastman labels intentionally describe the exact syllable mapping rather than assert a universal name. Teaching materials use Eastman names differently: [Wayland Baptist University](https://www.wbu.edu/news-and-events/2021/02/3-great-things-about-eastman-counting-system.html) teaches `1 ti te ta`, while [West Texas A&M University](https://www.wtamu.edu/_files/docs/academics/college-fine-arts-humanities/school-of-music/Week%202%20notes.pdf) teaches `1 ta te ta`. The [UNT Trumpet Manual](https://s3.amazonaws.com/mirror.facultyinfo.unt.edu/rhr0003%2Fschteach%2FUNT%20Trumpet%20Manual_24-25-9.pdf) calls the latter Eastman Simplified. The [Pulse Pocket guide](https://guides.backwerdrhythmshop.com/pulse-pocket/) presents both sixteenth-note mappings and advises matching the ensemble convention. For paired eighth notes, both mappings use `1 te`. Match the profile to the convention a teacher or ensemble uses. The syllable-to-position mapping is stable once selected; rests stay silent and do not shift later syllables.

## Catalog

| ID | Level | Display name | Sounding positions | Rests / held positions | Standard answer |
| --- | ---: | --- | --- | --- | --- |
| `quarter` | 1 | Quarter note | beat | — | `1` |
| `eighths` | 1 | Two eighth notes | beat, & | — | `1 &` |
| `eighth-rest` | 2 | Eighth note, then rest | beat | & | `1` |
| `rest-eighth` | 2 | Eighth rest, then note | & | beat | `&` |
| `three-rest-note` | 3 | Eighth rest, sixteenth rest, note | a | beat, e, & | `a` |
| `rest-sixteenth-rest` | 3 | Sixteenth rest, note, eighth rest | e | beat, &, a | `e` |
| `alternating-rests` | 3 | Rest, note, rest, note | e, a | beat, & | `e a` |
| `rest-two-rest` | 3 | Rest, two notes, rest | e, & | beat, a | `e &` |
| `dotted-eighth-sixteenth` | 3 | Dotted eighth, sixteenth | beat, a | e and & are sustained | `1 a` |
| `eighth-two` | 3 | Eighth, two sixteenths | beat, &, a | e is sustained | `1 & a` |
| `two-eighth` | 3 | Two sixteenths, eighth | beat, e, & | a is sustained | `1 e &` |
| `sixteenth-eighth-sixteenth` | 3 | Sixteenth, eighth, sixteenth | beat, e, a | & is sustained | `1 e a` |
| `sixteenths` | 3 | Four sixteenth notes | beat, e, &, a | — | `1 e & a` |
| `rest-three` | 3 | Rest, then three sixteenths | e, &, a | beat | `e & a` |
| `two-rest` | 3 | Two sixteenths, eighth rest | beat, e | &, a | `1 e` |
| `rest-two` | 3 | Eighth rest, two sixteenths | &, a | beat, e | `& a` |

## Notes that last longer than a beat

Every cell above fills exactly one beat, which is what let the model treat a bar as a list of beats. A half note is two beats and a whole note is four, and no amount of subdividing one beat expresses either — so these are the first cells with a **span**.

| ID | Beats | Description | Sounds on | Verified count |
| --- | --- | --- | --- | --- |
| `half` | 2 | Half note | its first beat | `1` |
| `half-rest` | 2 | Half rest | — | *(silent)* |
| `whole` | 4 | Whole note | its first beat | `1` |

They sound **once**, at the top of the span. The beats underneath are silent because the note is still ringing, not because anything rests there, and the count does not distinguish those: this app counts the notes that sound. A half note on beat one of 4/4 answers `1`, and beat two contributes nothing.

Three rules follow, all enforced:

- **Measure scope only.** "How long does this last?" is not a question one beat can pose. The app drops them when a student picks beat scope; a *link* that names one with `scope=beat` is refused, because a teacher who wrote it meant something the round cannot deliver.
- **A bar is filled by span, not by cell count.** A half note plus two quarters is three cells and four beats. A whole note needs four beats and so appears in 4/4, 5/4 and 7/4; a half note needs two and appears in every meter, where in 2/4 it is the whole bar.
- **A link may not name a rhythm the bar cannot hold.** `cells=whole,quarter,eighths` with `meter=3-4` is refused: the generator would discard every draw containing the whole note, and the link would say it taught something the round never asked.
- **They are in no level.** Levels describe how a beat subdivides, and a note that lasts is not a subdivision. They are opt-in by `cells=` only — which is also what keeps every assignment link already posted in a classroom generating the round it always did.

There is **no whole rest**. It fills the bar, so a measure containing one contains nothing else and has no count to ask for. The half rest is fine because the rest of the bar still sounds, and a bar that is silent throughout is refused.

## Meters

| Meter | Beats per bar | The beat is | Vocabulary | Beaming |
| --- | --- | --- | --- | --- |
| `2-4` | 2 | quarter note | the 16 cells above | inside each beat |
| `3-4` | 3 | quarter note | the 16 cells above | inside each beat |
| `4-4` | 4 | quarter note | the 16 cells above | inside each beat |
| `5-4` | 5 | quarter note | the 16 cells above | inside each beat |
| `7-4` | 7 | quarter note | the 16 cells above | inside each beat |

A link that names no meter means 4/4, and generates the identical round it always did. A link without `sys` also keeps the historical Standard profile; assignment profiles are explicit and override a browser's saved free-practice default.

**The admission rule is that the beat is a quarter note.** A meter that passes it needs no new cells or beaming: the selected profile's four-position count is repeated, numbered up to the bar's last beat, and a bar is a whole number of those beats. 5/4 and 7/4 pass it on the same terms as 3/4. Beams stay inside each beat, so the 3+2 / 2+3 grouping an odd meter is sometimes written with is not drawn or asked.

**What the rule keeps out.** An eighth-note beat (3/8, 5/8), a half-note beat (2/2, cut time) and a dotted-quarter beat (6/8, 9/8, 12/8) each need their own vocabulary, beaming and syllables — see the retired 3/8 catalog below for what one of them cost. A link naming one is refused. Mixed or changing meters and pickup measures are not read either.

**A short bar caps the round.** A full-measure round never repeats a measure, so two rhythms make 4 bars of 2/4, 8 of 3/4, 16 of 4/4, 32 of 5/4 and 128 of 7/4. Level 1 in 2/4 therefore gives the student a four-question Challenge rather than five; an assignment link asking for more than its pool can fill is refused rather than shortened.

### The retired eighth-beat catalog (3/8)

3/8 was supported from build `2026-08-24.1` to `2026-08-29.1` and then removed. It counted an **eighth-note** beat, which brought a separate four-cell vocabulary (`eighth-beat`, `two-sixteenths`, `sixteenth-rest`, `rest-sixteenth`), a whole-bar beaming exception, a whole-bars-only question rule, and a beat-family check on every link. That formatting and rule load earned [Eight Time](https://eight-time.backwerdrhythmshop.com/) an app of its own, live since 2026-09-02. Eight Time accepts legacy Count It 3/8 assignment links and generates byte-identical rounds; the repositories share git ancestry and may be recombined later (git history holds the full shape of what left).

The four retired ids stay retired: a link naming any of them, or `meter=3-8`, is refused with a plain-language message rather than repaired, and a future cell must not reuse the names — an old link would quietly come to mean something new.

## Level behavior

- **Level 1 — Pulse & pairs:** `quarter`, `eighths`
- **Level 2 — Eighth placement:** Level 1 plus `eighth-rest`, `rest-eighth`
- **Level 3 — Sixteenth cells:** all 16 cells

Levels are cumulative. One-beat prompts draw one cell. Full-measure prompts draw one cell per beat and translate the beat placeholder in each answer to its actual beat number.

## Validation rules

The build fails if a cell has an unsupported resolution, invalid or duplicate positions, timing that does not fill exactly the beats it claims to span (four sixteenth-ticks per quarter beat, times the span), a cell that sounds nothing without being written as a rest, a mismatched rest map, an incorrect verified answer, or a malformed notation recipe. Question generation also fails rather than silently degrading when there are not enough unique, genuinely incorrect distractors.

## Explicit exclusions

The catalog does not include whole-beat rests, triplets, compound meter, ties across beat boundaries, tuplets, grace notes, or cross-bar syncopation. Those require additional answer and notation semantics and should be introduced as separately validated catalog families.

Eighth-note-beat meters (3/8 and its relatives) are excluded too — see the retired catalog above.
