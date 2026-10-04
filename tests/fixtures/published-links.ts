/* The links the shop site publishes for the teaching-sequence steps that run in
 * Count It or Eight Time, held VERBATIM.
 *
 * They are copied on purpose and read by more than one test: a preset or a
 * catalog entry that merely agreed with itself would be worthless, and what a
 * teacher is trusting is that "Step 3" here is the same round as Step 3 on the
 * sequence page. When the page changes, this file is the place that has to
 * change with it, and the tests fail until it does.
 *
 * Sources, all in backwerd-rhythm-shop-site:
 *   counting-rhythms   sequences/counting-rhythms/index.html   @06ca7b8
 *   rhythms-in-three   sequences/rhythms-in-three/index.html   @63e57c8
 *
 * Steps 4-6 of Rhythms in Three are 3/8 links to Eight Time. This app's parser
 * refuses a 3/8 link by design, so they are listed here as strings only; no
 * test in this repository runs them.
 */

/** Counting Rhythms, steps 1-10, in order. */
export const PUBLISHED_COUNTING_RHYTHMS: readonly string[] = [
  "seq=counting-rhythms&step=1&a=Step%201%3A%20Quarters%20%26%20Pairs&scope=beat&cells=quarter,eighths&guide=on&n=12&pass=10&seed=cr1-quarters-pairs",
  "seq=counting-rhythms&step=2&a=Step%202%3A%20Where%27s%20the%20%26%3F&scope=beat&cells=eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=cr2-wheres-the-and",
  "seq=counting-rhythms&step=3&a=Step%203%3A%20Pulse%20%26%20Pairs%2C%20No%20Help&scope=beat&cells=quarter,eighths,eighth-rest,rest-eighth&guide=off&n=12&pass=10&seed=cr3-no-help",
  "seq=counting-rhythms&step=4&a=Step%204%3A%20Beat%20Numbers%20Travel&scope=measure&cells=quarter,eighths,eighth-rest,rest-eighth&guide=off&n=12&pass=10&seed=cr4-beat-numbers",
  "seq=counting-rhythms&step=5&a=Step%205%3A%20Meet%20the%20Sixteenths&scope=beat&cells=sixteenths,rest-sixteenth-rest,three-rest-note,alternating-rests,rest-two-rest&guide=on&n=12&pass=10&seed=cr5-sixteenths",
  "seq=counting-rhythms&step=6&a=Step%206%3A%20Sixteenth%20Combos&scope=beat&cells=dotted-eighth-sixteenth,eighth-two,two-eighth,sixteenth-eighth-sixteenth&guide=on&n=12&pass=10&seed=cr6-combos",
  "seq=counting-rhythms&step=7&a=Step%207%3A%20Silent%20Doesn%27t%20Mean%20Skip&scope=beat&cells=eighth-rest,rest-eighth,rest-sixteenth-rest,three-rest-note,alternating-rests,rest-two-rest,two-rest,rest-two,rest-three&guide=off&n=12&pass=10&seed=cr7-silent",
  "seq=counting-rhythms&step=8&a=Step%208%3A%20Count%20It%20Cold&level=3&scope=beat&guide=off&n=12&pass=11&seed=cr8-cold",
  "seq=counting-rhythms&step=9&a=Step%209%3A%20Full%20Measures&level=3&scope=measure&guide=off&n=16&pass=14&seed=cr9-full-measures",
  "seq=counting-rhythms&step=10&a=Step%2010%3A%20Notes%20That%20Last&level=1&scope=measure&cells=whole,half,half-rest,quarter,eighths&guide=off&n=12&pass=10&seed=cr10-notes-that-last",
];

/** Rhythms in Three, steps 1-3 (3/4), in order. */
export const PUBLISHED_RHYTHMS_IN_THREE: readonly string[] = [
  "seq=rhythms-in-three&step=1&a=Step%201%3A%20Three%20Beats%2C%20Not%20Four&meter=3-4&scope=measure&cells=quarter,eighths,eighth-rest,rest-eighth&guide=on&n=12&pass=10&seed=r3-1-three-beats",
  "seq=rhythms-in-three&step=2&a=Step%202%3A%20Sixteenths%20in%20Three&meter=3-4&scope=measure&cells=sixteenths,eighth-two,two-eighth,dotted-eighth-sixteenth&guide=on&n=12&pass=10&seed=r3-2-sixteenths",
  "seq=rhythms-in-three&step=3&a=Step%203%3A%203/4%20Cold&meter=3-4&level=3&scope=measure&guide=off&n=12&pass=10&seed=r3-3-cold",
];

/** Rhythms in Three, steps 4-6 (3/8, Eight Time), in order. */
export const PUBLISHED_EIGHT_TIME: readonly string[] = [
  "seq=rhythms-in-three&step=4&a=Step%204%3A%20The%20Eighth%20Takes%20the%20Beat&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths&guide=on&n=8&pass=7&seed=r3-4-eighth-beat",
  "seq=rhythms-in-three&step=5&a=Step%205%3A%20A%20Bar%20of%20Three%20Eighths&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths,sixteenth-rest,rest-sixteenth&guide=on&n=12&pass=10&seed=r3-5-bar-of-three",
  "seq=rhythms-in-three&step=6&a=Step%206%3A%20Three%20in%20Eighths%2C%20Cold&meter=3-8&scope=measure&cells=eighth-beat,two-sixteenths,sixteenth-rest,rest-sixteenth&guide=off&n=12&pass=10&seed=r3-6-cold",
];
