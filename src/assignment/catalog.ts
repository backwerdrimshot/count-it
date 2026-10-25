/** Literal legacy fields stay available; currentLaunch explicitly identifies updated entry points. */
export { EIGHT_TIME_ORIGIN, CATALOG_SCHEMA, withHints, type CatalogApp, type CatalogSequence } from './catalog-original';
import { CATALOG_ENTRIES as ORIGINAL, CATALOG_SEQUENCES as ORIGINAL_SEQUENCES, CATALOG_SCHEMA, type CatalogEntry as OriginalEntry } from './catalog-original';
import { EARLY_UPGRADES } from './early-v2';
export const CATALOG_SEQUENCES = ORIGINAL_SEQUENCES.map(s => s.id === "counting-rhythms" ? { ...s, name: "Counting Rhythms — current practice", blurb: "Short introductions, supported bar applications and reduced-support recognition, including a supported 3/4 transfer. Original first-five rounds remain available in the archive." } : s);
export interface CatalogEntry extends OriginalEntry {
    readonly currentLaunch?: {
        readonly activityId: string;
        readonly title: string;
        readonly name: string;
        readonly focus: string;
        readonly query: string;
        readonly link: string;
        readonly summary: string;
        readonly count: number;
        readonly passing: number | null;
        readonly preparation: string;
        readonly archivedSummary: string;
    };
    readonly archiveLink?: string;
}
export const CATALOG_ENTRIES: readonly CatalogEntry[] = ORIGINAL.map(old => { const update = old.app === 'count-it' ? EARLY_UPGRADES.find(d => d.legacy.id === old.id) : undefined; if (!update)
    return old; const a = update.target.assignment; return { ...old, link: `https://count-it.backwerdrhythmshop.com${update.archiveLink}`, archiveLink: update.archiveLink, currentLaunch: { activityId: update.currentId, title: update.target.title, name: a.name!, focus: update.purpose, query: update.target.query, link: `https://count-it.backwerdrhythmshop.com/${update.target.query}`, summary: update.summary, count: a.count!, passing: a.passing, preparation: update.preparation, archivedSummary: old.summary } }; });
export function entriesForSequence(sequence: OriginalEntry['sequence']) { return CATALOG_ENTRIES.filter(e => e.sequence === sequence); }
export function getCatalogEntry(id: string) { return CATALOG_ENTRIES.find(e => e.id === id); }
export type CatalogDisplayEntry = Omit<CatalogEntry, 'passing'> & {
    passing: number | null;
};
export function currentCatalogEntry(entry: CatalogEntry): CatalogDisplayEntry { return entry.currentLaunch ? { ...entry, ...entry.currentLaunch } : entry; }
export function catalogDocument() { return { schema: CATALOG_SCHEMA, launchResolutionVersion: 2, description: 'Original settings and explicit archive links remain literal for historical replay. currentLaunch describes the recommended activity for Counting Rhythms steps 1 to 7. Exact old root URLs upgrade with a visible notice; /archive preserves their original rounds. All activities are free.', sequences: CATALOG_SEQUENCES.map(s => ({ ...s })), entries: CATALOG_ENTRIES.map(e => ({ ...e })) }; }
