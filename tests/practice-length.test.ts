import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE, PRACTICE_SETTINGS_KEY, readPracticeSettings, supportedPracticeLength } from '../src/practice-settings';
import { parseAssignment, roundLengthFor } from '../src/assignment';
import { generateQuestions } from '../src/question';

describe('free challenge length capacity', () => {
  it('keeps Quick 5 by default, offers twelve in the default sixteen-bar pool, and refuses twenty', () => {
    expect(supportedPracticeLength(DEFAULT_PRACTICE, 5)).toBe(5);
    expect(supportedPracticeLength(DEFAULT_PRACTICE, 12)).toBe(12);
    expect(supportedPracticeLength(DEFAULT_PRACTICE, 20)).toBe(12);
  });
  it('uses real duration and silent-bar capacity, with Quick shortened for tiny pools', () => {
    for (const [meter, expected] of [['2-4', 5], ['3-4', 5], ['4-4', 12], ['5-4', 20]] as const) {
      expect(supportedPracticeLength({ ...DEFAULT_PRACTICE, meter }, 20)).toBe(expected);
    }
    expect(roundLengthFor({ ...DEFAULT_PRACTICE, meter: '2-4', cells: undefined, wanted: 5 })).toBe(4);
    const held = { ...DEFAULT_PRACTICE, cells: ['whole', 'half'], meter: '4-4' as const };
    expect(supportedPracticeLength(held, 20)).toBe(5);
    expect(roundLengthFor({ ...held, wanted: 5 })).toBe(2);
    expect(supportedPracticeLength({ ...DEFAULT_PRACTICE, scope: 'beat' }, 20)).toBe(20);
  });
  it('restores only approved lengths while preserving older setup records and the storage key', () => {
    for (const length of [undefined, 0, 6, 21, '20', null, 5, 12, 20]) {
      const raw = JSON.stringify({ ...DEFAULT_PRACTICE, challengeLength: length });
      const seen: string[] = [];
      const saved = readPracticeSettings({ getItem: key => { seen.push(key); return raw; } });
      expect(seen).toEqual([PRACTICE_SETTINGS_KEY]);
      expect(saved?.challengeLength).toBe([5, 12, 20].includes(length as number) ? length : 5);
    }
  });
  it('leaves fixed assignment length, seeded questions deterministic', () => {
    const parsed = parseAssignment('?level=3&scope=measure&meter=4-4&n=12&pass=10&seed=legacy&retry=reseed');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('fixture rejected');
    const assignment = parsed.assignment;
    const spec = { level: assignment.level, scope: assignment.scope, meter: assignment.meter ?? undefined, count: assignment.count!, seed: assignment.seed! };
    const questions = generateQuestions(spec);
    expect(questions).toHaveLength(12);
    expect(generateQuestions(spec)).toEqual(questions);
    expect(parseAssignment('?level=1&scope=measure&meter=2-4&n=12&seed=legacy').ok).toBe(false);
  });
});
