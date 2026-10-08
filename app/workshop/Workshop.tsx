/* Plain anchors match the app navigation: next/link fails in this vinext build. */
/* eslint-disable @next/next/no-html-link-for-pages */
'use client';
import { useMemo, useState } from 'react';
import { COUNTING_PROFILES, METER_IDS, getMeter, type CountingProfileId, type MeterId } from '../../src/rhythm';
import { scoreAnswer } from '../../src/score';
import { GROUPINGS, WORKSHOP_FOCI, workshopScore, type WorkshopFocus } from '../../src/workshop';
import ScoreNotation from '../ScoreNotation';
import RhythmPlayer from '../RhythmPlayer';

export default function Workshop() {
  const [meter, setMeter] = useState<MeterId>('4-4');
  const [focus, setFocus] = useState<WorkshopFocus>('ties');
  const [groups, setGroups] = useState([2, 2]);
  const [system, setSystem] = useState<CountingProfileId>('standard');
  const [seed, setSeed] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [guide, setGuide] = useState(true);
  const [beat, setBeat] = useState<number | null>(null);
  const score = useMemo(() => workshopScore(meter, focus, groups, seed), [meter, focus, groups, seed]);
  return <main className="workshop-page">
    <nav className="practice-links"><a href="/">← Count It practice</a><a href="/notation">Notation reference</a></nav>
    <p className="eyebrow">Read · say · listen</p><h1>Rhythm workshop</h1>
    <p>Practice ties, dotted values, triplets and syncopation in a complete measure. These exercises are unscored.</p>
    <details className="workshop-setup"><summary>{WORKSHOP_FOCI[focus]} · {getMeter(meter).label} · {groups.join(' + ')} <span>Change setup</span></summary>
    <section className="workshop-controls" aria-label="Workshop setup">
      <label>Focus<select value={focus} onChange={e => { setFocus(e.target.value as WorkshopFocus); setRevealed(false); }}>
        {Object.entries(WORKSHOP_FOCI).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Meter<select value={meter} onChange={e => { const next = e.target.value as MeterId; setMeter(next); setGroups(GROUPINGS[next][0]); setRevealed(false); }}>
        {METER_IDS.map(id => <option key={id} value={id}>{getMeter(id).label}</option>)}
      </select></label>
      <label>Beat grouping<select value={groups.join('+')} onChange={e => { setGroups(e.target.value.split('+').map(Number)); setRevealed(false); }}>
        {GROUPINGS[meter].map(group => <option key={group.join('+')} value={group.join('+')}>{group.join(' + ')}</option>)}
      </select></label>
      <label>Counting profile<select value={system} onChange={e => setSystem(e.target.value as CountingProfileId)}>
        {Object.values(COUNTING_PROFILES).map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
      </select></label>
      <label><input type="checkbox" checked={guide} onChange={e => setGuide(e.target.checked)} /> Subdivision guide</label>
    </section></details>
    <section className="workshop-exercise" aria-label="Workshop rhythm">
      <h2>{WORKSHOP_FOCI[focus]} · {getMeter(meter).label}</h2>
      <ScoreNotation score={score} label={`${WORKSHOP_FOCI[focus]} in ${getMeter(meter).label}, grouped ${groups.join(' plus ')}.`} system={system} showGuide={guide} revealed={revealed} activeBeat={beat} />
      <RhythmPlayer key={JSON.stringify(score)} score={score} onBeat={setBeat} />
      <div className="reveal-panel"><span>Sounding count</span><strong>{revealed ? scoreAnswer(score, system) : 'Say it first, then check.'}</strong></div>
      <div className="focused-practice-actions"><button type="button" className="secondary-button" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide count' : 'Reveal count'}</button>
        <button type="button" className="primary-button" onClick={() => { setSeed(seed + 1); setRevealed(false); }}>Next example</button></div>
      <details className="reading-scaffold"><summary>How to read this rhythm</summary>
        <p>A tie continues the first note: its second notehead has no new attack. A dot adds half the original duration. Syncopation places an attack between beats and sustains it across the next beat.</p>
        <p>Triplets divide one beat into three equal parts. This workshop explicitly uses “1 trip let” in all three profiles; it does not label those triplet syllables as an Eastman standard.</p>
        <p>Numbers continue through the measure. Grouping accents organize the pulse; the grouping exercise beams short notes within the selected groups.</p>
      </details>
    </section>
  </main>;
}
