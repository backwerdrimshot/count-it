# Three proposed repairs — exact local coverage evidence

These configurations are still documentation proposals, outside runtime presets, catalogs and launch pages. Their exact queries are in `next-gap-repairs-proposal.md`; `repair-proposal-evidence.json` records every generated question, correct answer and distractor for each proposed seed. `tests/repair-proposals.test.ts` extracts those exact queries, parses them, independently checks attack counts and bar sums, verifies unique choices and deterministic replay, and pins the report. No engine setting or assignment was added for this second batch.

## Seed coverage and sampling sufficiency

| Proposal / exact seed | Distinct notation prompts / capacity | Cell occurrences (questions containing cell) | Interpretation |
| --- | --- | --- | --- |
| Mixed-rest bars / `cr-repair-v1-rest-bars` | 8 / 256; 7 distinct correct-count strings | quarter 10 (7); paired eighths 10 (7); eighth-note/rest 5 (5); rest/eighth-note 7 (5) | Every target appears in several bars. Defensible brief supported bridge into the existing guide-off full-bar step, not exhaustive rhythm coverage. |
| Three new rest cells / `cr-repair-v1-rest-cells` | 3 / 3 across 6 responses; 3 correct-count strings | `two-rest` 2 (2); `rest-two` 2 (2); `rest-three` 2 (2) | Complete tiny target pool, each twice for deliberate introduction/reinforcement. Six responses are not six different rhythms or independent check evidence. |
| Long-note bars / `cr-repair-v1-long-notes` | 6 / 44; 6 correct-count strings | quarter 6 (4); paired eighths 2 (2); half 2 (2); half rest 4 (4); whole 1 (1) | All five values appear, with one whole-note model. Good introduction to spanning/uncounted beats; sparse and uneven for assessment. Four of six bars include a half rest, and neither a half note nor a half rest starts on beat 2. Do not claim coverage of every placement. |

Capacities count distinct **notation arrangements**. In the mixed-rest pool, a quarter and an eighth followed by a rest both have a single attack on the beat and therefore the same answer count. Four cells make 256 notation bars but only 81 possible attack-count patterns. This seed contains a pair of different notation questions with identical correct count strings. Neither reordered choices nor identical counts should be presented as additional attack-reading coverage. The app cannot establish that a learner distinguished quarter duration from eighth-note/rest duration by selecting their shared count.

The long-note seed asks these six bars, in order:

1. `whole` → `1`
2. `half,quarter,quarter` → `1 | 3 | 4`
3. `eighths,quarter,half-rest` → `1 & | 2`
4. `half-rest,half` → `3`
5. `half-rest,quarter,eighths` → `3 | 4 &`
6. `half-rest,quarter,quarter` → `3 | 4`

This shows held beats and silent opening/ending spans, but screen choices score note starts rather than the performed duration of a half/whole note. Use existing teacher-led kit/playing work to observe duration and continuity. Do not increase length merely to imply rigor; a later check should deliberately sample the placements/contrasts it intends to assess.

## Actual response prerequisites

All three exact configurations omit `response=eighths-v1` and use the legacy four-position vocabulary. Actual generated wrong choices contain **both `e` and `a` in all three rounds**, including the mixed eighth/rest and long-value pools whose correct answers need neither. They therefore require an explicit response lesson on the four equal positions `number e & a`, while keeping notation prerequisites distinct. Do not launch them as beginner half-beat-only tasks or silently expand the beginner profile to accommodate rests.

The sixteenth/rest-cell round has correct counts `1 e`, `e & a`, and `& a`. Its wrong choices also include beat number `2`, because the existing generator offers a wrong-beat-number option for a fragment that starts on beat 1. Prepare that response convention explicitly: `2` is an incorrect beat label here, not another beat in the fragment. No new wrong-count generator is authorized in this repair batch.

For measures, teach numbered beats 1–4, `|` between nonempty cell/attack groups, and that held/silent beats may have no count at all. In particular, a count such as `3` can represent a two-beat rest followed by a half note; it does not certify duration recognition. Four-position guides mark possible attack positions rather than sustained sound.

## Feedback-copy issue to include before the long-note repair

The exact first long-note question is a whole note (`1`), with wrong options including `1 | 2 e`. The legacy `added_sound` feedback currently says “adds a syllable where the rhythm is silent.” A whole note is sustaining at those later positions; the error is extra **note starts**, not silence. The beginner profile already uses precise note-start language, but these proposed links intentionally use legacy responses and therefore do not get that scoped copy.

Before building the long-note repair, include a small generic feedback-copy correction that describes written note starts for added/omitted attacks. That can preserve question generation, seeds, choices, correct answers and replay hashes; it does not need another response mode. This is a concrete content defect to resolve in the next batch, not a reason to seek vague educator approval or add engine features. No such runtime copy change was made in this integration.

## Engineering result and next boundary

The three fixed seeds all build, stay within capacity, contain every named target, and deterministically reproduce correct meter sums, four distinct choices and exactly one correct answer. There is no seed-coverage defect requiring an engine change. The proposed lengths are supportable as short taught introductions with the limitations above. No new pass threshold, validated mastery claim, authenticated first-attempt policy or performance grading is warranted.

Report these results before implementing the second configuration/content batch. The concrete content work still needed for that batch is the explicit four-position response preparation and the step-local rest/span instructions; existing free Notes & Rests/Practice Kit materials can supply notation preparation. This is ordinary instructional authoring and sampling design, not a vague requirement to obtain additional educator approval for the already-approved beginner bridge.
