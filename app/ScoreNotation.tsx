'use client';
import { useEffect, useRef } from 'react';
import { Barline, Beam, Dot, Formatter, Renderer, Stave, StaveNote, StaveTie, Tuplet, Voice } from 'vexflow';
import { countLabelsForBeat, staffFurniture, type CountingProfileId } from '../src/rhythm';
import { scoreLayout, type RhythmScore } from '../src/score';

export default function ScoreNotation({ score, label, system = 'standard', showGuide = false, revealed = false, activeBeat = null }: {
  score: RhythmScore; label: string; system?: CountingProfileId; showGuide?: boolean; revealed?: boolean; activeBeat?: number | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const draw = () => {
      element.replaceChildren();
      const layout = scoreLayout(score, element.clientWidth);
      const height = showGuide ? 205 : 140;
      const renderer = new Renderer(element, Renderer.Backends.SVG);
      renderer.resize(layout.width, height);
      const context = renderer.getContext();
      const furniture = staffFurniture(score.fragment ? 'beat' : 'measure');
      const stave = new Stave(10, 28, layout.width - 20).addClef(furniture.clef);
      if (furniture.timeSignature) stave.addTimeSignature(score.meter);
      if (!furniture.closingBarline) stave.setEndBarType(Barline.type.NONE);
      stave.setContext(context).draw();
      const notes = score.notes.map(token => {
        const note = new StaveNote({ clef: 'percussion', keys: ['b/4'], stemDirection: 1,
          duration: `${token.duration}${token.dots ? 'd' : ''}${token.rest ? 'r' : ''}` });
        if (token.dots) Dot.buildAndAttach([note], { all: true });
        return note;
      });
      const tuplets = (score.triplets ?? []).map(group => new Tuplet(group.map(i => notes[i]), { numNotes: 3, notesOccupied: 2, bracketed: true }));
      const beams = score.beams.map(group => {
        const beam = new Beam(group.map(i => notes[i]));
        group.forEach((i, position) => {
          const direction = score.partialBeams?.[i];
          if (direction) beam.setPartialBeamSideAt(position, direction === 'left' ? 'L' : 'R');
        });
        return beam;
      });
      const voice = new Voice({ numBeats: score.beats, beatValue: 4 }).addTickables(notes);
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      // A teaching time grid: notes, guide and cursor share quarter-beat coordinates.
      // Format first to size glyphs/modifiers, then position their notehead centres.
      const wholeBar = notes.length === 1 && score.notes[0].length === score.beats;
      notes.forEach((note, i) => {
        note.setStave(stave);
        const target = wholeBar && !score.fragment ? (layout.start + layout.end) / 2 : layout.x(score.notes[i].at);
        note.setXShift(target - note.getAbsoluteX() - note.getGlyphWidth() / 2);
      });
      voice.draw(context, stave);
      beams.forEach(beam => beam.setContext(context).draw());
      tuplets.forEach(tuplet => tuplet.setContext(context).draw());
      (score.ties ?? []).forEach(([first, last]) => new StaveTie({ firstNote: notes[first], lastNote: notes[last], firstIndexes: [0], lastIndexes: [0] }).setDirection(-1).setContext(context).draw());
      const svg = element.querySelector('svg');
      if (!svg) return;
      svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); svg.setAttribute('focusable', 'false');
      const add = (tag: string, attributes: Record<string, string>, text?: string) => {
        const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => child.setAttribute(key, value));
        if (text) child.textContent = text;
        svg.appendChild(child);
      };
      if (showGuide) {
        add('line', { x1: String(layout.start), x2: String(layout.end), y1: '142', y2: '142', stroke: '#b7b5a5' });
        for (let beat = 0; beat < score.beats; beat++) {
          const triplet = score.triplets?.some(group => Math.floor(score.notes[group[0]].at) === beat);
          const labels = triplet ? [String(beat + 1), 'trip', 'let'] : countLabelsForBeat(beat + 1, system);
          labels.forEach((text, partial) => {
            const at = beat + partial / labels.length;
            const sounds = score.notes.some(note => !note.rest && !note.tied && Math.abs(note.at - at) < 1e-6);
            const x = layout.x(at);
            add('text', { x: String(x), y: '170', 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': partial === 0 ? '15' : '12',
              'font-weight': sounds && revealed ? '800' : '500', fill: revealed && sounds ? '#365c35' : '#55584f', 'data-guide-at': String(at) }, text);
          });
        }
        if (wholeBar && !score.fragment) add('text', { x: String(layout.width / 2), y: '195', 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': '12', fill: '#55584f' }, `Begins on beat 1; held for ${score.beats} beats.`);
      }
      if (score.groups) {
        let at = 0;
        score.groups.forEach(group => {
          add('text', { x: String(layout.x(at + group / 2)), y: '123', 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': '11', fill: '#55584f' }, `${group} beats`);
          at += group;
        });
      }
      svg.setAttribute('data-grid-start', String(layout.start));
      svg.setAttribute('data-grid-unit', String(layout.unit));
      add('line', { x1: String(layout.start), x2: String(layout.start), y1: '24', y2: showGuide ? '179' : '110', stroke: '#9a552e', 'stroke-width': '2', 'data-playhead': 'true', visibility: 'hidden' });
      notes.forEach((note, i) => add('circle', { cx: String(note.getNoteHeadBeginX() + note.getGlyphWidth() / 2), cy: '190', r: '0', 'data-note-at': String(score.notes[i].at), 'data-note-x': String(note.getNoteHeadBeginX() + note.getGlyphWidth() / 2) }));
    };
    draw();
    const observer = new ResizeObserver(draw); observer.observe(element);
    return () => observer.disconnect();
  }, [score, label, system, showGuide, revealed]);
  useEffect(() => {
    const svg = host.current?.querySelector('svg');
    const cursor = svg?.querySelector('[data-playhead]');
    if (!svg || !cursor) return;
    cursor.setAttribute('visibility', activeBeat === null || activeBeat < 0 ? 'hidden' : 'visible');
    const x = Number(svg.getAttribute('data-grid-start')) + (activeBeat ?? 0) * Number(svg.getAttribute('data-grid-unit'));
    cursor.setAttribute('x1', String(x)); cursor.setAttribute('x2', String(x));
  }, [activeBeat]);
  return <div className="notation-scroll"><div className="notation-canvas balanced-score" ref={host} /></div>;
}
