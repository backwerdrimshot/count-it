"use client";

import { useEffect, useRef } from "react";
import { Barline, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { getMeter, measureBeamRuns } from "../src/rhythm";
import type { RhythmPrompt } from "../src/rhythm";

/** A note as drawn, with the cell and token it came from — the beam runs name
 *  their members by (cell, token), and a partial beam direction is recorded
 *  against a token index inside one cell. */
interface DrawnNote {
  readonly note: StaveNote;
  readonly cellIndex: number;
  readonly tokenIndex: number;
  readonly rest: boolean;
  readonly beamable: boolean;
}

export default function RhythmNotation({
  prompt,
  label,
}: {
  prompt: RhythmPrompt;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const draw = () => {
      element.replaceChildren();
      const meter = getMeter(prompt.meter);
      const beats = prompt.scope === "measure" ? meter.beatsPerMeasure : 1;
      const naturalWidth = prompt.scope === "measure" ? 190 * beats : 390;
      const width = Math.max(naturalWidth, element.clientWidth || naturalWidth);
      const renderer = new Renderer(element, Renderer.Backends.SVG);
      renderer.resize(width, 172);
      const context = renderer.getContext();
      const stave = new Stave(10, 26, width - 20);
      stave.addClef("percussion");
      /* A measure shows its time signature. A single beat does not — a lone
         quarter note is self-evidently one beat, and printing a signature over
         a fragment would claim a bar the arithmetic denies. */
      if (prompt.scope === "measure") {
        stave.addTimeSignature(meter.label);
      }
      /* A single beat is a FRAGMENT, so it does not get a closing barline.
         Without one it reads as an incipit — here is a beat — which is what it
         is. With one it reads as a complete measure, which the prompt is not. */
      if (prompt.scope === "beat") stave.setEndBarType(Barline.type.NONE);
      stave.setContext(context).draw();

      const beams: Beam[] = [];
      const drawn: DrawnNote[] = prompt.cells.flatMap((cell, cellIndex) =>
        cell.notation.tokens.map((notationToken, tokenIndex) => {
          const note = new StaveNote({
            clef: "percussion",
            /* Both on the MIDDLE line, and stems up.
               Rests were already there (b/4); notes were on f/4, which VexFlow's
               percussion clef maps like treble — the bottom SPACE. On a drum
               staff that space is the bass drum, so a rhythm trainer was writing
               every note as a kick, and its own rests sat a third higher than
               its notes.
               The site draws the same rhythms at `base - 2 * SPACE` in
               assets/notation/rhythm-staff.js — the middle line, where it also
               centres the percussion clef — for notes and rests alike. An app
               should not engrave a figure differently from the poster on the
               wall of the room using it; this is that rule applied to the
               same staff.
               Stems are forced up because VexFlow would otherwise flip them down
               on the middle line, and the lesson figures beam upward. */
            keys: ["b/4"],
            stemDirection: 1,
            duration: `${notationToken.duration}${notationToken.dots ? "d" : ""}${notationToken.rest ? "r" : ""}`,
          });
          if (notationToken.dots) Dot.buildAndAttach([note], { all: true });
          return {
            note,
            cellIndex,
            tokenIndex,
            rest: Boolean(notationToken.rest),
            beamable: notationToken.duration !== "4",
          };
        }),
      );

      /* Who shares a beam is decided by the data model, not here. This
         component draws what it is told. */
      const find = (cellIndex: number, tokenIndex: number) =>
        drawn.find((entry) => entry.cellIndex === cellIndex && entry.tokenIndex === tokenIndex);

      for (const run of measureBeamRuns(prompt)) {
        const members = run.map((member) => find(member.cellIndex, member.tokenIndex));
        if (members.some((entry) => !entry)) continue;
        const present = members as DrawnNote[];
        const beam = new Beam(present.map((entry) => entry.note));
        present.forEach((entry, position) => {
          const direction =
            prompt.cells[entry.cellIndex].notation.partialBeamDirections[entry.tokenIndex];
          if (direction) beam.setPartialBeamSideAt(position, direction === "left" ? "L" : "R");
        });
        beams.push(beam);
      }

      const voice = new Voice({
        numBeats: beats,
        beatValue: meter.vexBeatValue,
      }).addTickables(drawn.map((entry) => entry.note));
      new Formatter().joinVoices([voice]).format([voice], width - (prompt.scope === "measure" ? 135 : 105));

      /* A note that fills the bar on its own is CENTRED, not flush left.
         Traditional engraving centres a whole note (and a whole-bar rest) when
         nothing else shares the measure — Gould gives centred, a shade left of
         centre, as the standard. VexFlow's formatter has nothing to space
         against with one note, so it left-aligns and the whole note ended up
         jammed against the time signature with three empty beats after it.
         Only for a measure whose single note IS the whole bar: a half note
         alone would be an incomplete measure, and this must not paper over
         that the way the closed barline used to. */
      if (prompt.scope === "measure" && drawn.length === 1 && prompt.cells.length === 1) {
        const only = drawn[0].note;
        const centre = stave.getNoteStartX() + (stave.getNoteEndX() - stave.getNoteStartX()) / 2;
        only.setXShift(centre - only.getAbsoluteX() - only.getGlyphWidth() / 2);
      }

      voice.draw(context, stave);
      beams.forEach((beam) => beam.setContext(context).draw());

      const svg = element.querySelector("svg");
      svg?.setAttribute("role", "img");
      svg?.setAttribute("aria-label", label);
      svg?.setAttribute("focusable", "false");
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label, prompt]);

  return (
    <div className="notation-scroll">
      <div className="notation-canvas" ref={host} />
    </div>
  );
}
