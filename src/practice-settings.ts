import { ALL_RHYTHM_CELLS, getCellsByIds, METER_IDS, type LevelId, type MeterId } from './rhythm';
import { uniqueMeasures } from './assignment';

export interface PracticeSettings {
  level: LevelId;
  scope: 'beat' | 'measure';
  meter: MeterId;
  showReference: boolean;
  cells: string[] | null;
}
export const PRACTICE_SETTINGS_KEY = 'count-it-practice-defaults-v2';
export const DEFAULT_PRACTICE: PracticeSettings = { level: 'level-1', scope: 'measure', meter: '4-4', showReference: true, cells: null };

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
    return { level: value.level, scope: value.scope, meter: value.meter, showReference: value.showReference, cells: value.cells };
  } catch { return null; }
}
