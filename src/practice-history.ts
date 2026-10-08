export interface PracticeHistoryEntry {
  id: string; finishedAt: string; score: number; total: number; conditions: string;
  rhythms: string[]; missed: string[]; assignment: string | null; attempt: number;
}
const KEY = 'count-it-practice-history-v1';
export function readHistory(storage: Pick<Storage, 'getItem'>): PracticeHistoryEntry[] {
  try {
    const values = JSON.parse(storage.getItem(KEY) ?? '[]');
    if (!Array.isArray(values)) return [];
    return values.filter(v => v && typeof v.id === 'string' && typeof v.finishedAt === 'string'
      && Number.isFinite(Date.parse(v.finishedAt)) && Number.isInteger(v.score) && Number.isInteger(v.total)
      && v.total > 0 && v.score >= 0 && v.score <= v.total && typeof v.conditions === 'string'
      && Array.isArray(v.rhythms) && v.rhythms.every((id: unknown) => typeof id === 'string')
      && Array.isArray(v.missed) && v.missed.every((id: unknown) => typeof id === 'string')
      && (typeof v.assignment === 'string' || v.assignment === null) && Number.isInteger(v.attempt) && v.attempt > 0).slice(0, 50);
  } catch { return []; }
}
export function saveHistory(entry: PracticeHistoryEntry, storage?: Storage): boolean {
  try {
    const target = storage ?? localStorage;
    target.setItem(KEY, JSON.stringify([entry, ...readHistory(target).filter(v => v.id !== entry.id)].slice(0, 50)));
    return true;
  } catch { return false; }
}
