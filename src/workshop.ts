import { scoreFromPrompt, type RhythmScore, type ScoreNote } from './score';
import { createMeasurePrompt, getCellsForLevel, getMeter, type MeterId } from './rhythm';
import { createSeededRandom, pick } from './question/random';

export type WorkshopFocus = 'triplets' | 'ties' | 'dotted' | 'syncopation' | 'grouping' | 'mixed';
export const WORKSHOP_FOCI: Record<WorkshopFocus, string> = {
  triplets: 'Eighth-note triplets', ties: 'Ties across beats', dotted: 'Dotted spanning notes',
  syncopation: 'Syncopation', grouping: 'Odd-meter grouping', mixed: 'Mixed advanced rhythms',
};
export const GROUPINGS: Record<MeterId, number[][]> = {
  '2-4': [[2]], '3-4': [[3]], '4-4': [[2, 2], [4]], '5-4': [[3, 2], [2, 3]], '7-4': [[2, 2, 3], [3, 2, 2], [2, 3, 2]],
};
export function workshopScore(meter: MeterId, focus: WorkshopFocus, groups: number[], seed: number): RhythmScore {
  const beats = getMeter(meter).beatsPerMeasure;
  if (!GROUPINGS[meter].some(option => option.join() === groups.join())) throw new RangeError('Grouping must match the meter.');
  const score: RhythmScore = { meter: getMeter(meter).label, beats, notes: [], beams: [], triplets: [], ties: [], groups };
  const random = createSeededRandom(`workshop:${meter}:${focus}:${seed}`);
  let at = 0;
  const add = (note: Omit<ScoreNote, 'at'>, offset = 0) => { score.notes.push({ ...note, at: at + offset }); };
  while (at < beats) {
    const mode = focus === 'mixed' ? pick(['triplets', 'ties', 'dotted', 'syncopation'] as const, random) : focus;
    const index = score.notes.length;
    if (mode === 'triplets') {
      const restIndex = seed % 2 === 0 ? Math.floor(random() * 3) : -1;
      for (let i = 0; i < 3; i++) add({ duration: '8', length: 1 / 3, rest: i === restIndex }, i / 3);
      score.triplets!.push([index, index + 1, index + 2]);
      if (restIndex === -1) score.beams.push([index, index + 1, index + 2]);
      else if (restIndex === 0) score.beams.push([index + 1, index + 2]);
      else if (restIndex === 2) score.beams.push([index, index + 1]);
      at++;
    } else if (mode === 'grouping') {
      add({ duration: '8', length: 0.5 });
      if (seed % 2 === 0) {
        add({ duration: '16', length: 0.25 }, 0.5); add({ duration: '16', length: 0.25 }, 0.75);
      } else add({ duration: '8', length: 0.5 }, 0.5);
      at++;
    } else if (at + 2 <= beats) {
      if (seed % 2 === 0 && mode === 'dotted') {
        add({ duration: '8', length: 0.5 }); add({ duration: '4', dots: 1, length: 1.5 }, 0.5);
      } else if (seed % 2 === 0 && mode === 'ties') {
        add({ duration: '4', length: 1 }); add({ duration: '8', length: 0.5, tied: true }, 1); add({ duration: '8', length: 0.5 }, 1.5);
        score.ties!.push([index, index + 1]); score.beams.push([index + 1, index + 2]);
      } else if (seed % 2 === 0 && mode === 'syncopation') {
        add({ duration: '8', length: 0.5 }); add({ duration: '4', length: 1 }, 0.5); add({ duration: '8', length: 0.5, rest: true }, 1.5);
      } else if (mode === 'dotted') {
        add({ duration: '4', dots: 1, length: 1.5 }); add({ duration: '8', length: 0.5 }, 1.5);
      } else if (mode === 'ties') {
        add({ duration: '8', length: 0.5 }); add({ duration: '8', length: 0.5 }, 0.5);
        add({ duration: '4', length: 1, tied: true }, 1);
        score.beams.push([index, index + 1]); score.ties!.push([index + 1, index + 2]);
      } else {
        add({ duration: '8', length: 0.5, rest: true }); add({ duration: '4', length: 1 }, 0.5);
        add({ duration: '8', length: 0.5 }, 1.5);
      }
      at += 2;
    } else {
      const base = scoreFromPrompt(createMeasurePrompt([pick(getCellsForLevel('level-2'), random), 'quarter'], '2-4'));
      const cellNotes = base.notes.filter(note => note.at < 1);
      cellNotes.forEach(note => add({ ...note }, note.at));
      if (cellNotes.length === 2 && cellNotes.every(note => !note.rest)) score.beams.push([index, index + 1]);
      at++;
    }
  }
  if (focus === 'grouping') {
    let start = 0;
    groups.forEach(group => {
      score.beams.push(score.notes.map((_, i) => i).filter(i => score.notes[i].at >= start && score.notes[i].at < start + group));
      start += group;
    });
  }
  validateScore(score);
  return score;
}
export function validateScore(score: RhythmScore) {
  let end = 0;
  score.notes.forEach(note => {
    if (Math.abs(note.at - end) > 1e-6 || note.length <= 0) throw new TypeError('Notes must fill time consecutively.');
    end += note.length;
  });
  if (Math.abs(end - score.beats) > 1e-6) throw new TypeError('Notes must fill the measure.');
  (score.ties ?? []).forEach(([first, last]) => {
    if (last !== first + 1 || score.notes[first].rest || score.notes[last].rest || !score.notes[last].tied) throw new TypeError('Ties connect adjacent sounding notes.');
  });
}
