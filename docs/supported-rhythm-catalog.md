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

## Level behavior

- **Level 1 — Pulse & pairs:** `quarter`, `eighths`
- **Level 2 — Eighth placement:** Level 1 plus `eighth-rest`, `rest-eighth`
- **Level 3 — Sixteenth cells:** all 16 cells

Levels are cumulative. One-beat prompts draw one cell. Full-measure prompts draw four cells and translate the beat placeholder in each answer to its actual 4/4 beat number.

## Validation rules

The build fails if a cell has an unsupported resolution, invalid or duplicate positions, timing that does not fill one quarter-note beat, a mismatched rest map, an incorrect verified answer, or a malformed notation recipe. Question generation also fails rather than silently degrading when there are not enough unique, genuinely incorrect distractors.

## Explicit exclusions

The initial catalog does not include whole-beat rests, triplets, compound meter, ties across beat boundaries, tuplets, grace notes, or cross-bar syncopation. Those require additional answer and notation semantics and should be introduced as separately validated catalog families.
