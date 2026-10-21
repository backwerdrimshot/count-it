/** Current entry points reuse released practice; literal engine/settings remain reproducible. */
import { parseAssignment, serializeAssignment, describeAssignment, type Assignment } from ".";
import { BEGINNER_STEPS } from "./beginner-v1";
import { REPAIR_STEPS } from "./repairs-v1";
import { CATALOG_ENTRIES as ORIGINAL_ENTRIES } from "./catalog-original";
import { builderStateFromQuery } from "./builder";
import { COUNTING_RHYTHMS_STEPS, getPreset as getOriginalPreset, type BuilderPreset } from "./presets";
export const EARLY_VERSION = "counting-early-v2";
export const SIXTEENTH_INTRO_LESSON = "Divide one quarter-note beat into four equal positions: 1 e & a. Four sixteenth notes start at all four positions. A sixteenth rest, one sixteenth note, then an eighth rest starts only on e. An eighth rest, a sixteenth rest, then one sixteenth note starts only on a. Alternating sixteenth rests and notes start on e and a. A sixteenth rest, two sixteenth notes, then a sixteenth rest starts on e and &. Rests take time but have no note start. This fragment starts on beat 1; 2 in a wrong choice is a wrong beat number, not another beat here. Read supplied choices as note starts. Five questions introduce these five patterns once each; replay them deliberately if helpful, then try the separate supported bar application when ready.";
export const SIXTEENTH_BAR_LESSON = "Use the same five taught sixteenth patterns from the introduction across four quarter-note beats in 4/4. Each beat has number e & a; replace the number by 1, 2, 3 or 4. A silent beat-start does not remove that beat. | separates nonempty groups of starts. Track the bar from left to right before choosing. Eight different bars are a supported application sample, not a new notation vocabulary or a mastery test.";
function make(query: URLSearchParams) { const search = `?${query.toString()}`; const p = parseAssignment(search); if (!p.ok)
    throw Error(p.error.message); return { query: search, assignment: p.assignment }; }
const old5 = ORIGINAL_ENTRIES.find(e => e.id === 'counting-rhythms-5')!;
const introParams = new URLSearchParams(old5.query);
for (const key of ['pass', 'level'])
    introParams.delete(key);
for (const [k, v] of Object.entries({ seq: EARLY_VERSION, step: '5', a: 'Early v2: Meet five sixteenth patterns', sys: 'standard', meter: '4-4', n: '5', fb: 'each', retry: 'free', hints: 'off', seed: 'cr-early-v2-sixteenth-intro' }))
    introParams.set(k, v);
export const SIXTEENTH_INTRO = { id: `${EARLY_VERSION}-5`, title: 'Meet five sixteenth patterns', ...make(introParams) };
const barParams = new URLSearchParams(introParams);
for (const [k, v] of Object.entries({ step: '6', a: 'Early v2: Sixteenth patterns across a bar', scope: 'measure', n: '8', seed: 'cr-early-v2-sixteenth-bars' }))
    barParams.set(k, v);
export const SIXTEENTH_APPLICATION = { id: `${EARLY_VERSION}-6`, title: 'Sixteenth patterns across a bar', ...make(barParams) };
const checkParams = new URLSearchParams(REPAIR_STEPS[0].query);
for (const [k, v] of Object.entries({ seq: EARLY_VERSION, step: '3', a: 'Early v2: Mixed-rest reduced-support sample', guide: 'off', fb: 'end', retry: 'off', seed: 'cr-early-v2-rest-check' }))
    checkParams.set(k, v);
const restCheck = { id: `${EARLY_VERSION}-3`, title: 'Mixed-rest reduced-support sample', ...make(checkParams) };
export const EARLY_UPGRADES = [
    { step: 1, target: BEGINNER_STEPS[3], purpose: 'Supported application: eight different four-beat quarter/pair bars, not twelve alternating one-beat prompts.', preparation: 'Teach four numbered quarter-note beats and the number/& response lesson first. The short one-beat introduction and two-beat practice remain available as warm-ups.', warmup: BEGINNER_STEPS[0].query, twoBeatPractice: BEGINNER_STEPS[1].query },
    { step: 2, target: REPAIR_STEPS[0], purpose: 'Supported integration of already prepared quarter/pair cells and eighth-rest order over a full bar. Eight notation arrangements give seven distinct count patterns.', preparation: 'Teach eighth-note/rest order using the inline examples and Notes & Rests before this application. Different written durations can share a count.' },
    { step: 3, target: restCheck, purpose: 'A brief reduced-support recognition sample of the same prepared four-beat rest vocabulary. Multiple choice, previous practice and possible pool overlap remain supports; this is not independent mastery.', preparation: 'Complete supported mixed-rest bars first. Guide off, feedback at the end, retry button off; reopening remains possible.' },
    { step: 4, target: BEGINNER_STEPS[2], purpose: 'Supported meter transfer: six of eight quarter/pair bars in 3/4. Restore the guide and use familiar note values while learning a different bar length.', preparation: 'Teach three quarter-note beats per 3/4 bar and restarting at 1. This is not a harder notation pool. Use the optional two-beat practice if changing bar length is new.' },
    { step: 5, target: SIXTEENTH_INTRO, purpose: 'A short notation/response introduction: all five target one-beat patterns once each. Small pools and deliberate replay are appropriate here; twelve responses are unnecessary.', preparation: SIXTEENTH_INTRO_LESSON, application: SIXTEENTH_APPLICATION.query },
].map(d => Object.freeze({ ...d, legacy: ORIGINAL_ENTRIES.find(e => e.id === `counting-rhythms-${d.step}`)!, currentId: d.target.id, summary: describeAssignment(d.target.assignment), archiveLink: `/archive${ORIGINAL_ENTRIES.find(e => e.id === `counting-rhythms-${d.step}`)!.query}` }));
function signature(a: Assignment) {
    return serializeAssignment({ ...a, meter: a.meter ?? '4-4', systemPinned: false, classCode: null });
}
// A bad snapshot must fail loudly, never fall back to a new activity's settings.
const legacySignatures = new Map(EARLY_UPGRADES.map(d => {
    const original = parseAssignment(d.legacy.query);
    if (!original.ok) throw Error(`Invalid original entry: ${d.legacy.id}`);
    return [d.step, signature(original.assignment)] as const;
}));
export function resolveEarlyLaunch(search: string) {
    const params = new URLSearchParams(search);
    if ([...params.keys()].some(k => params.getAll(k).length !== 1))
        return null;
    const known = new Set(['seq', 'step', 'a', 'level', 'scope', 'meter', 'cells', 'guide', 'fb', 'retry', 'n', 'pass', 'time', 'hints', 'class', 'seed', 'sys']);
    if ([...params.keys()].some(k => !known.has(k)))
        return null;
    const parsed = parseAssignment(search);
    if (!parsed.ok || parsed.assignment.system !== "standard")
        return null;
    const found = EARLY_UPGRADES.find(d => signature(parsed.assignment) === legacySignatures.get(d.step));
    if (!found)
        return null;
    if ((params.has('seq') || params.has('step')) && (params.get('seq') !== 'counting-rhythms' || params.get('step') !== String(found.step)))
        return null;
    const next = new URLSearchParams(found.target.query);
    if (parsed.assignment.classCode)
        next.set('class', parsed.assignment.classCode);
    return { step: found.step, currentId: found.currentId, title: found.target.title, purpose: found.purpose, preparation: found.preparation, query: `?${next.toString()}`, originalQuery: search.startsWith('?') ? search : `?${search}`, archiveLink: `/archive${search.startsWith('?') ? search : `?${search}`}`, warmup: 'warmup' in found ? found.warmup : undefined, twoBeatPractice: 'twoBeatPractice' in found ? found.twoBeatPractice : undefined };
}
export const CURRENT_COUNTING_RHYTHMS_STEPS: readonly BuilderPreset[] = COUNTING_RHYTHMS_STEPS.map(old => { const d = EARLY_UPGRADES.find(d => d.step === old.step); if (!d)
    return old; const state = builderStateFromQuery(d.target.query); if (!state)
    throw Error('Current preset refused'); return { ...old, title: d.target.title, focus: d.purpose, publishedMeter: d.target.assignment.meter ?? "4-4", state }; });
export function getCurrentPreset(id: string) { return CURRENT_COUNTING_RHYTHMS_STEPS.find(p => p.id === id) ?? getOriginalPreset(id); }
export function earlyInstruction(a: Assignment | null) { if (!a)
    return undefined; const expected = a.seed === SIXTEENTH_INTRO.assignment.seed ? SIXTEENTH_INTRO : a.seed === SIXTEENTH_APPLICATION.assignment.seed ? SIXTEENTH_APPLICATION : null; if (!expected || a.system !== 'standard' || a.scope !== expected.assignment.scope || (a.meter ?? '4-4') !== expected.assignment.meter || a.count !== expected.assignment.count || JSON.stringify(a.cells) !== JSON.stringify(expected.assignment.cells))
    return undefined; return expected === SIXTEENTH_INTRO ? SIXTEENTH_INTRO_LESSON : SIXTEENTH_BAR_LESSON; }
