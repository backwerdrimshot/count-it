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

## The eighth-beat catalog (3/8)

The sixteen cells above all fill one **quarter-note** beat, which is the beat in 4/4 and in 3/4. In 3/8 the beat is an **eighth note**, so it divides in two rather than four, and it needs its own four cells. A link mixing the two families is refused: three quarter-beat cells in a 3/8 bar is a bar of 3/4 wearing the wrong time signature.

| ID | Description | Sounds on | Rests on | Verified count |
| --- | --- | --- | --- | --- |
| `eighth-beat` | One eighth note | beat | — | `1` |
| `two-sixteenths` | Two sixteenth notes | beat, & | — | `1 &` |
| `sixteenth-rest` | Sixteenth note, then rest | beat | & | `1` |
| `rest-sixteenth` | Sixteenth rest, then note | & | beat | `&` |

Four, not sixteen, because an eighth beat can only be sounded, split, half-sounded at the front, or half-sounded at the back. The list is short because the meter is.

Read `eighth-beat` and `eighths` carefully: `eighths` is a **quarter** beat filled with two eighth notes, and `eighth-beat` is an eighth note that **is** the beat. The manifest publishes the two families separately (`quarterBeatCellIds`, `eighthBeatCellIds`) rather than leaving anyone to tell them apart by name.

## Meters

| Meter | Beats per bar | The beat is | Vocabulary | Beaming |
| --- | --- | --- | --- | --- |
| `4-4` | 4 | quarter note | the 16 cells above | inside each beat |
| `3-4` | 3 | quarter note | the 16 cells above | inside each beat |
| `3-8` | 3 | eighth note | the 4 eighth-beat cells | **across the whole bar** |

A link that names no meter means 4/4, and generates the identical round it always did.

3/8 beaming the whole bar is a deliberate exception to this app's rule that a beam stays inside its beat. It is not this app's decision: the Rhythms in Three lesson teaches it and the Theory Reference poster prints it — *"in 3/8 the whole bar beams as one group, because at that level the measure itself is the unit."* A rest still breaks a beam, in every meter.

## Level behavior

- **Level 1 — Pulse & pairs:** `quarter`, `eighths`
- **Level 2 — Eighth placement:** Level 1 plus `eighth-rest`, `rest-eighth`
- **Level 3 — Sixteenth cells:** all 16 cells

Levels are cumulative. One-beat prompts draw one cell. Full-measure prompts draw one cell per beat and translate the beat placeholder in each answer to its actual beat number.

Levels describe how a **quarter** beat subdivides, so they do not apply in 3/8: a 3/8 round draws all four of its rhythms at every level rather than hiding three behind a gate that means nothing there.

## Validation rules

The build fails if a cell has an unsupported resolution, invalid or duplicate positions, timing that does not fill exactly one beat of its own family (four sixteenth-ticks for a quarter beat, two for an eighth), a mismatched rest map, an incorrect verified answer, or a malformed notation recipe. Question generation also fails rather than silently degrading when there are not enough unique, genuinely incorrect distractors.

## Explicit exclusions

The catalog does not include whole-beat rests, triplets, compound meter, ties across beat boundaries, tuplets, grace notes, or cross-bar syncopation. Those require additional answer and notation semantics and should be introduced as separately validated catalog families.

3/8 here is a **simple** meter counted in three, not a compound one. 6/8 and its relatives are still excluded: they subdivide the beat in three, which is the triplet semantics this catalog does not carry.
