import { describe, it, expect } from 'vitest';
import { EARLY_UPGRADES, resolveEarlyLaunch, SIXTEENTH_APPLICATION, SIXTEENTH_INTRO, earlyInstruction } from '../src/assignment/early-v2';
import { parseAssignment, serializeAssignment, roundKey, uniqueQuestions } from '../src/assignment';
import { generateQuestions } from '../src/question/generator';
import { parseSequenceStep } from '../src/sequence-step';
import { getPromptId, getCellsByIds, getMeter } from '../src/rhythm';
import { readFileSync, writeFileSync } from 'node:fs';
const entries = [...EARLY_UPGRADES.map(d => d.target), SIXTEENTH_APPLICATION];
const introIndex = entries.findIndex(d => d.id === SIXTEENTH_INTRO.id);
const evidence = entries.map(d => { const a = d.assignment; const questions = generateQuestions({ level: a.level, scope: a.scope, meter: a.meter!, system: a.system, response: a.response, cells: a.cells!, count: a.count!, seed: a.seed! }); return { id: d.id, query: d.query, settings: a, launch: `https://count-it.backwerdrhythmshop.com/${d.query}`, resultIdentity: parseSequenceStep(d.query), attemptKey: serializeAssignment(a), capacity: uniqueQuestions({ ...a, meter: a.meter! }), answerCapacity: new Set(getCellsByIds(a.cells!).map(c => c.activePositions.join(','))).size ** (a.scope === 'beat' ? 1 : getMeter(a.meter!).beatsPerMeasure), questions, distinctRhythms: new Set(questions.map(q => getPromptId(q.prompt))).size, distinctAnswers: new Set(questions.map(q => q.correctAnswer)).size, exposures: Object.fromEntries(a.cells!.map(id => [id, questions.flatMap(q => q.prompt.cells).filter(c => c.id === id).length])) }; });
const handoffFile = new URL('../docs/early-v2-integration.json', import.meta.url);
const payload = { schema: 'count-it.early-entrypoints.v2', minimumCapability: { earlyLaunchResolution: 2, responseVocabularies: ['eighths-v1', 'half-beats-v1'], archivePath: '/archive' }, publicResources: { notation: 'https://backwerdrhythmshop.com/lessons/notes-and-rests/', meter: 'https://backwerdrhythmshop.com/lessons/time-signatures/', sixteenths: 'https://backwerdrhythmshop.com/lessons/sixteenth-rhythms/', playing: 'https://backwerdrhythmshop.com/resources/rhythm-practice-kits/' }, status: 'local-unpublished', base: 'dd9e2724be45f70e3210cb859f78a429440114df', legacyPolicy: 'Exact known original first-five root links, marked or unmarked, open current practice with a disclosure. /archive preserves literal settings and historical replay. Custom and nonstandard counting links remain literal.', mapping: EARLY_UPGRADES.map(d => ({ legacyId: d.legacy.id, legacyQuery: d.legacy.query, archive: d.archiveLink, currentId: d.target.id, currentQuery: d.target.query, purpose: d.purpose, preparation: d.preparation })), entries: evidence.map(e => ({...e, questions: e.questions.map(({id, correctAnswer, choices, prompt}) => ({id, cells: prompt.cells.map(c => c.id), correctAnswer, choices}))})) };
if (process.env.UPDATE_EARLY_JSON === '1') writeFileSync(handoffFile, JSON.stringify(payload, null, 2) + '\n');
describe('early current entry points', () => {
    it('exports a reproducible app integration contract', () => expect(JSON.parse(readFileSync(handoffFile, 'utf8'))).toEqual(payload));
    it('upgrades exact known marked and unmarked links; retains class and explicit standard identity', () => { for (const d of EARLY_UPGRADES) {
        expect(resolveEarlyLaunch(d.legacy.query)?.query).toBe(d.target.query);
        const p = new URLSearchParams(d.legacy.query);
        p.delete('seq');
        p.delete('step');
        p.set('class', 'TEST');
        p.set('sys', 'standard');
        p.set('meter', '4-4');
        expect(resolveEarlyLaunch(p.toString())?.currentId).toBe(d.currentId);
        expect(new URLSearchParams(resolveEarlyLaunch(p.toString())!.query).get('class')).toBe('TEST');
    } });
    it('leaves customized, nonstandard, ambiguous and malformed links literal', () => { for (const d of EARLY_UPGRADES) {
        for (const [key, value] of [['sys', 'eastman-ti-te-ta'], ['sys', 'eastman-ta-te-ta'], ['n', '9'], ['seed', 'custom'], ['guide', new URLSearchParams(d.legacy.query).get('guide') === 'on' ? 'off' : 'on'], ['a', 'Custom'], ['step', '99'], ['unknown', 'x'], ['response', 'half-beats-v1']]) {
            const p = new URLSearchParams(d.legacy.query);
            p.set(key, value);
            expect(resolveEarlyLaunch(p.toString()), `${d.step} ${key}`).toBeNull();
        }
        expect(resolveEarlyLaunch(d.legacy.query + '&seed=duplicate')).toBeNull();
    } expect(resolveEarlyLaunch('?cells=bogus')).toBeNull(); });
    it('preserves literal parser and seed replay while current activities have distinct keys', () => { for (const d of EARLY_UPGRADES) {
        const p = parseAssignment(d.legacy.query);
        if (!p.ok)
            throw Error('legacy');
        const replay = parseAssignment(serializeAssignment(p.assignment));
        expect(replay).toEqual(p);
        expect(roundKey(p.assignment)).not.toBe(roundKey(d.target.assignment));
        expect(d.archiveLink).toBe('/archive' + d.legacy.query);
    } });
    it('uses bounded varied applications and a deliberately short complete introduction', () => { expect(evidence.map(e => e.capacity)).toEqual([16, 256, 256, 8, 256, 6561, 5, 625]); expect(evidence.map(e => e.answerCapacity)).toEqual([16, 81, 81, 8, 256, 6561, 5, 625]); for (const d of entries) expect(getCellsByIds(d.assignment.cells!).every(c => c.beats === 1)).toBe(true); expect(evidence.map(e => e.distinctRhythms)).toEqual([8, 8, 8, 6, 8, 12, 5, 8]); expect(evidence.map(e => e.distinctAnswers)).toEqual([8, 7, 7, 6, 8, 12, 5, 8]); for (const [i, e] of evidence.entries()) {
        expect(e.distinctAnswers).toBeGreaterThanOrEqual(i === introIndex ? 5 : 6);
        for (const n of Object.values(e.exposures))
            expect(n).toBeGreaterThan(0);
        for (const q of e.questions) {
            expect(q.prompt.cells.reduce((sum, c) => sum + c.beats, 0)).toBe(i === introIndex ? 1 : i === 3 ? 3 : 4);
            let beat = 1; const expected = q.prompt.cells.map(c => { const positions = [String(beat), 'e', '&', 'a']; beat += c.beats; return c.activePositions.map(p => positions[p]).join(' '); }).filter(Boolean).join(' | '); expect(q.correctAnswer).toBe(expected); expect(q.choices).toHaveLength(4);
            expect(new Set(q.choices.map(c => c.label)).size).toBe(4);
            expect(q.choices.filter(c => c.isCorrect)).toHaveLength(1);
            for (const c of q.choices) {
                expect(c.isCorrect).toBe(c.label === q.correctAnswer);
                expect(c.label).toMatch(i >= 4 ? /^[1-4ea& |]+$/ : /^[1-4& |]+$/);
            }
        }
    } });
    it('separates support, introduction and end-feedback sample', () => { const check = EARLY_UPGRADES[2].target.assignment; expect(check).toMatchObject({ guide: 'off', feedback: 'end', retry: 'off', passing: null, timeLimit: null }); expect(SIXTEENTH_INTRO.assignment.count).toBe(5); expect(earlyInstruction(SIXTEENTH_INTRO.assignment)).toContain('An eighth rest, a sixteenth rest'); expect(earlyInstruction({ ...SIXTEENTH_INTRO.assignment, seed: 'legacy' })).toBeUndefined(); expect(earlyInstruction({ ...SIXTEENTH_INTRO.assignment, meter: '5-4' })).toBeUndefined(); expect(earlyInstruction({ ...SIXTEENTH_INTRO.assignment, count: 12 })).toBeUndefined(); });
});
