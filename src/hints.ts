/* Optional hints — off unless a teacher's link says `hints=on`.
 *
 * A hint is one tip for one question, asked for with the Hint button and built
 * from the question itself: the meter, which beat holds the hardest rhythm, and
 * HOW that beat divides — sixteenths or eighths, a rest, a dot, a note held
 * longer than its neighbours, a note that lasts more than one beat. It never
 * says WHICH syllables sound. Two beats that divide the same way get the same
 * tip whatever their answers are, so a tip teaches the way to count and leaves
 * the counting to the student. The grid it names is written with commas
 * ("the beat number, e, &, a"), never as a count a choice could match.
 *
 * Asking for a hint changes nothing about scoring: a right answer after a tip
 * still counts, because the student still read the rhythm. The card says how
 * many hints were used, and the verification code covers that number.
 *
 * Everything here is pure, so every tip is tested against every rhythm.
 */
import {
  beatStarts,
  COUNTING_PROFILES,
  getMeter,
  type CountingProfileId,
  type RhythmCell,
  type RhythmPrompt,
} from "./rhythm";

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven"];

function hasRest(cell: RhythmCell): boolean {
  return cell.notation.tokens.some((token) => token.rest);
}

function isDotted(cell: RhythmCell): boolean {
  return cell.notation.tokens.some((token) => token.dots);
}

/** An eighth note sounding among sixteenths: it holds through the next one. */
function holdsAnEighth(cell: RhythmCell): boolean {
  return cell.resolution === 4 && cell.notation.tokens.some((token) => !token.rest && !token.dots && token.ticks === 2);
}

/* How much there is to work out in a beat. The tip goes to the hardest beat of
   a measure, the earliest one on a tie. */
function weight(cell: RhythmCell): number {
  if (cell.beats > 1) return 2;
  if (cell.resolution === 4) return 3 + (hasRest(cell) || isDotted(cell) || holdsAnEighth(cell) ? 1 : 0);
  if (cell.resolution === 2) return 1 + (hasRest(cell) ? 1 : 0);
  return 0;
}

function cellTip(cell: RhythmCell, system: CountingProfileId): string {
  const [, e, and, a] = COUNTING_PROFILES[system].mapping;
  if (cell.beats > 1) {
    const span = NUMBER_WORDS[cell.beats];
    if (hasRest(cell)) {
      return `A half rest is ${span} silent beats. Say nothing there, but keep counting so the next note gets the right beat number.`;
    }
    return `A ${cell.beats === 4 ? "whole" : "half"} note lasts ${span} beats. Say it once, on the beat where it starts, and stay silent through the beats it holds.`;
  }
  if (cell.resolution === 1) {
    return "A quarter note fills a whole beat. Say a syllable only where a note starts.";
  }
  const parts = cell.resolution === 4
    ? [`Split the beat into four sixteenths: the beat number, ${e}, ${and}, ${a}. Say only the ones where a note starts.`]
    : [`Split the beat into two eighths: the beat number, then ${and}. Say only the ones where a note starts.`];
  if (hasRest(cell)) parts.push("A rest is silent: skip its syllable, but keep it in your count.");
  if (isDotted(cell)) parts.push("A dotted eighth lasts three sixteenths.");
  if (holdsAnEighth(cell)) parts.push("An eighth note lasts two sixteenths, so it holds through the syllable after it.");
  return parts.join(" ");
}

/** The one tip a question offers. Never the answer: see the file comment. */
export function hintFor(prompt: RhythmPrompt, system: CountingProfileId = "standard"): string {
  if (prompt.scope === "beat") return cellTip(prompt.cells[0], system);
  const starts = beatStarts(prompt.cells);
  let focus = 0;
  prompt.cells.forEach((cell, index) => {
    if (weight(cell) > weight(prompt.cells[focus])) focus = index;
  });
  const meter = getMeter(prompt.meter);
  return `This ${meter.label} bar has ${NUMBER_WORDS[meter.beatsPerMeasure]} beats. ` +
    `Look closely at beat ${starts[focus]}. ${cellTip(prompt.cells[focus], system)}`;
}

/** The ticket line, only for a round that offered hints. */
export function hintsTicketLine(used: number): string {
  return `Hints used: ${used}`;
}
