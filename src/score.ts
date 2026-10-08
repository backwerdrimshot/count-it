import { beatStarts, countLabelsForBeat, getMeter, type CountingProfileId, type NoteDuration, type RhythmPrompt } from './rhythm';

export interface ScoreNote { at: number; length: number; duration: NoteDuration; rest?: boolean; dots?: 1; tied?: boolean }
export interface RhythmScore {
  meter: string;
  beats: number;
  fragment?: boolean;
  notes: ScoreNote[];
  beams: number[][];
  partialBeams?: Record<number, 'left' | 'right'>;
  triplets?: number[][];
  ties?: [number, number][];
  groups?: number[];
}
export function scoreFromPrompt(prompt: RhythmPrompt): RhythmScore {
  const starts = beatStarts(prompt.cells);
  const notes: ScoreNote[] = [];
  const beams: number[][] = [];
  const partialBeams: Record<number, 'left' | 'right'> = {};
  prompt.cells.forEach((cell, index) => {
    const offset = notes.length;
    let at = starts[index] - 1;
    cell.notation.tokens.forEach(token => {
      notes.push({ at, length: token.ticks / 4, duration: token.duration, rest: token.rest, dots: token.dots });
      at += token.ticks / 4;
    });
    cell.notation.beamGroups.forEach(group => beams.push(group.map(i => i + offset)));
    Object.entries(cell.notation.partialBeamDirections).forEach(([i, direction]) => { if (direction) partialBeams[Number(i) + offset] = direction; });
  });
  return { meter: getMeter(prompt.meter).label, beats: prompt.scope === 'beat' ? 1 : getMeter(prompt.meter).beatsPerMeasure,
    fragment: prompt.scope === 'beat', notes, beams, partialBeams };
}
export function scoreAnswer(score: RhythmScore, system: CountingProfileId): string {
  return score.notes.filter(note => !note.rest && !note.tied).map(note => {
    const beat = Math.floor(note.at + 1e-8);
    const triplet = score.triplets?.some(group => group.some(i => score.notes[i] === note));
    return triplet ? [String(beat + 1), 'trip', 'let'][Math.round((note.at - beat) * 3)]
      : countLabelsForBeat(beat + 1, system)[Math.round((note.at - beat) * 4)];
  }).join(' ');
}
export function scoreLayout(score: RhythmScore, available: number) {
  const perBeat = score.notes.some(n => n.length <= 0.25) ? 112 : 68;
  const minimum = score.fragment ? 240 : 124 + score.beats * perBeat;
  const width = score.fragment ? 260 : Math.max(minimum, Math.min(820, available));
  const start = score.fragment ? 62 : 94;
  const end = width - 30;
  const unit = (end - start) / score.beats;
  return { width, start, end, unit, x: (at: number) => start + at * unit };
}
export function playbackEvents(score: RhythmScore, bpm: number, countIn: boolean) {
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 200) throw new RangeError('Tempo must be 40–200 BPM.');
  const beatSeconds = 60 / bpm;
  const lead = countIn ? score.beats : 0;
  return {
    beatSeconds, lead, duration: (lead + score.beats) * beatSeconds,
    clicks: Array.from({ length: lead + score.beats }, (_, beat) => ({ time: beat * beatSeconds, accent: beat % score.beats === 0
      || (!countIn || beat >= lead) && Boolean(score.groups?.slice(0, -1).reduce<number[]>((a, n) => [...a, (a.at(-1) ?? 0) + n], []).includes(beat - lead)) })),
    attacks: score.notes.flatMap((note, index) => {
      if (note.rest || note.tied) return [];
      let length = note.length;
      for (let next = index + 1; next < score.notes.length && score.notes[next].tied; next++) length += score.notes[next].length;
      return [{ time: (lead + note.at) * beatSeconds, length: length * beatSeconds }];
    }),
  };
}
