import { ALL_RHYTHM_CELLS, getCellsByIds, METER_IDS, type LevelId, type MeterId } from './rhythm';
import { roundLengthFor, uniqueMeasures } from './assignment';

export interface PracticeSettings {
  level: LevelId;
  scope: 'beat' | 'measure';
  meter: MeterId;
  showReference: boolean;
  cells: string[] | null;
  challengeLength: PracticeLength;
}
export const PRACTICE_LENGTHS = [5, 12, 20] as const;
export type PracticeLength = typeof PRACTICE_LENGTHS[number];

/** Choose a supported free challenge size without changing assignment semantics. */
export function supportedPracticeLength(settings: Pick<PracticeSettings, 'level' | 'scope' | 'meter' | 'cells'>, wanted: PracticeLength): PracticeLength {
  const capacity = roundLengthFor({ ...settings, cells: settings.cells ?? undefined, wanted: 20 });
  return [...PRACTICE_LENGTHS].reverse().find(count => count <= wanted && count <= capacity) ?? 5;
}

export const PRACTICE_SETTINGS_KEY = 'count-it-practice-defaults-v2';
export const DEFAULT_PRACTICE: PracticeSettings = { level: 'level-1', scope: 'beat', meter: '4-4', showReference: true, cells: null, challengeLength: 5 };

export function usablePool(ids: readonly string[], scope: PracticeSettings['scope'], meter: MeterId): boolean {
  const beats = Number(meter[0]);
  const pool = getCellsByIds(ids);
  return pool.length >= 2 && pool.every(cell => cell.beats <= (scope === 'beat' ? 1 : beats))
    && pool.some(cell => cell.activePositions.length > 0)
    && (scope === 'beat' || uniqueMeasures(pool, beats) > 0);
}

export function readPracticeSettings(storage: Pick<Storage, 'getItem'>): PracticeSettings | null {
  try {
    const value = JSON.parse(storage.getItem(PRACTICE_SETTINGS_KEY) ?? 'null');
    if (!value || !['level-1', 'level-2', 'level-3'].includes(value.level)
      || !['beat', 'measure'].includes(value.scope) || !METER_IDS.includes(value.meter)
      || typeof value.showReference !== 'boolean') return null;
    if (value.cells !== null && (!Array.isArray(value.cells) || value.cells.some((id: unknown) => !ALL_RHYTHM_CELLS.some(cell => cell.id === id))
      || !usablePool(value.cells, value.scope, value.meter))) return null;
    const challengeLength = PRACTICE_LENGTHS.includes(value.challengeLength) ? value.challengeLength : 5;
    return { challengeLength, level: value.level, scope: value.scope, meter: value.meter, showReference: value.showReference, cells: value.cells };
  } catch { return null; }
}
