import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE, PRACTICE_SETTINGS_KEY, readPracticeSettings } from '../src/practice-settings';
import { createMeasurePrompt } from '../src/rhythm';
import { playbackEvents, scoreAnswer, scoreFromPrompt } from '../src/score';
import { GROUPINGS, workshopScore, type WorkshopFocus } from '../src/workshop';
import { readHistory, saveHistory, type PracticeHistoryEntry } from '../src/practice-history';
import { wrapResultLines } from '../src/result-download';

const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage; };
describe('practice settings', () => {
  it('opens in the agreed setup and refuses corrupt or impossible saved pools', () => {
    expect(DEFAULT_PRACTICE).toMatchObject({ level: 'level-1', scope: 'measure', meter: '4-4', showReference: true });
    const store = storage();
    store.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_PRACTICE, cells: ['whole', 'half'], meter: '3-4' }));
    expect(readPracticeSettings(store)).toBeNull();
    store.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_PRACTICE, cells: ['quarter', 'eighths'], showReference: false }));
    expect(readPracticeSettings(store)?.showReference).toBe(false);
    store.setItem(PRACTICE_SETTINGS_KEY, '{bad'); expect(readPracticeSettings(store)).toBeNull();
  });
});
describe('notation and audio share time', () => {
  it('a half note sounds once and leaves two beats before the next attack', () => {
    const score = scoreFromPrompt(createMeasurePrompt(['half', 'quarter', 'eighths']));
    expect(score.notes.map(n => n.at)).toEqual([0, 2, 3, 3.5]);
    expect(playbackEvents(score, 60, true).attacks.map(e => e.time)).toEqual([4, 6, 7, 7.5]);
  });
  it('a tie across beat 2 has no new attack on beat 2', () => {
    const score = workshopScore('2-4', 'ties', [2], 1);
    expect(scoreAnswer(score, 'standard')).toBe('1 &');
    expect(playbackEvents(score, 60, false).attacks.map(e => e.time)).toEqual([0, 0.5]);
    expect(score.ties).toEqual([[1, 2]]);
    expect(playbackEvents(score, 60, false).attacks[1].length).toBe(1.5);
  });
  it('whole notes occupy four beats within longer measures', () => {
    for (const [meter, cells, onsets] of [
      ['5-4', ['whole', 'quarter'], [0, 4]],
      ['7-4', ['whole', 'half', 'quarter'], [0, 4, 6]],
    ] as const) {
      const score = scoreFromPrompt(createMeasurePrompt([...cells], meter));
      expect(score.notes.map(note => note.at)).toEqual(onsets);
      expect(score.notes[0].length).toBe(4);
    }
  });
  it('triplets occupy thirds, rather than sixteenth-grid approximations', () => {
    const score = workshopScore('2-4', 'triplets', [2], 1);
    expect(scoreAnswer(score, 'standard')).toBe('1 trip let 2 trip let');
    expect(score.notes.slice(0, 3).map(n => n.at)).toEqual([0, 1 / 3, 2 / 3]);
    expect(playbackEvents(score, 120, false).attacks[2].time).toBeCloseTo(1 / 3);
  });
  it('dotted quarters last one and a half beats; syncopation crosses the next beat', () => {
    expect(scoreAnswer(workshopScore('2-4', 'dotted', [2], 1), 'standard')).toBe('1 &');
    expect(scoreAnswer(workshopScore('2-4', 'syncopation', [2], 1), 'standard')).toBe('& &');
  });
  it('every focus fills every supported grouping without gaps or extra time', () => {
    for (const [meter, groupings] of Object.entries(GROUPINGS)) for (const groups of groupings)
      for (const focus of ['triplets', 'ties', 'dotted', 'syncopation', 'grouping', 'mixed'] as WorkshopFocus[])
        for (let seed = 0; seed < 20; seed++) {
          const score = workshopScore(meter as keyof typeof GROUPINGS, focus, groups, seed);
          expect(score.notes.reduce((sum, n) => sum + n.length, 0)).toBeCloseTo(Number(meter[0]));
          expect(scoreAnswer(score, 'standard')).not.toContain('undefined');
        }
  });
});
describe('local results', () => {
  it('bounds history and keeps a completed event once', () => {
    const store = storage();
    const entry: PracticeHistoryEntry = { id: 'round', finishedAt: '2026-10-08T00:00:00Z', score: 3, total: 5, conditions: '4/4', rhythms: ['quarter'], missed: ['quarter'], assignment: null, attempt: 1 };
    for (let i = 0; i < 60; i++) saveHistory({ ...entry, id: String(i) }, store);
    saveHistory({ ...entry, id: '59', score: 4 }, store);
    expect(readHistory(store)).toHaveLength(50); expect(readHistory(store)[0].score).toBe(4);
    expect(saveHistory(entry, { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } as unknown as Storage)).toBe(false);
  });
  it('wraps names, conditions and long identifiers inside result images', () => {
    const lines = wrapResultLines('A long assignment name\n1234567890123456789012345', s => s.length, 10);
    expect(lines.every(line => line.length <= 10)).toBe(true);
    expect(lines.join('').replace(/\s/g, '')).toBe('Alongassignmentname1234567890123456789012345');
  });
});
