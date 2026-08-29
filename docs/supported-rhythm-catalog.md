# Supported rhythm catalog

Count It MVP contains 16 verified, one-beat rhythm cells. Each cell is represented as structured timing positions plus a VexFlow rendering recipe. The Standard answer below uses beat 1 as the example; measure prompts replace that beat number with 1, 2, 3, or 4.

Subdivision positions within a beat are:

| Position | Standard | Eastman (internal) | Takadimi (internal) |
| --- | --- | --- | --- |
| 0 | beat number | beat number | ta |
| 1 | e | ta | ka |
| 2 | & | te | di |
| 3 | a | ti | mi |

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
- **A bar is filled by span, not by cell count.** A half note plus two quarters is three cells and four beats. A whole note needs four beats and so appears in 4/4 alone; a half note needs two and appears in 4/4 and 3/4.
- **They are in no level.** Levels describe how a beat subdivides, and a note that lasts is not a subdivision. They are opt-in by `cells=` only — which is also what keeps every assignment link already posted in a classroom generating the round it always did.

There is **no whole rest**. It fills the bar, so a measure containing one contains nothing else and has no count to ask for. The half rest is fine because the rest of the bar still sounds, and a bar that is silent throughout is refused.

## Meters

| Meter | Beats per bar | The beat is | Vocabulary | Beaming |
| --- | --- | --- | --- | --- |
| `4-4` | 4 | quarter note | the 16 cells above | inside each beat |
| `3-4` | 3 | quarter note | the 16 cells above | inside each beat |

A link that names no meter means 4/4, and generates the identical round it always did.

### The retired eighth-beat catalog (3/8)

3/8 was supported from build `2026-08-24.1` to `2026-08-29.1` and then removed. It counted an **eighth-note** beat, which brought a separate four-cell vocabulary (`eighth-beat`, `two-sixteenths`, `sixteenth-rest`, `rest-sixteenth`), a whole-bar beaming exception, a whole-bars-only question rule, and a beat-family check on every link. That formatting and rule load earned eight-time an app of its own (planned; the two may be recombined later — git history holds the full shape of what left).

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
