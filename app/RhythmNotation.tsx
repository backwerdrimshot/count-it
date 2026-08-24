"use client";

import { useEffect, useRef } from "react";
import { Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { getMeter, measureBeamRuns, secondaryBeamBreaks } from "../src/rhythm";
import type { RhythmPrompt } from "../src/rhythm";

/** A note as drawn, with the cell and token it came from — needed because a
 *  whole-measure beam is built across cells and still has to look up a partial
 *  beam direction recorded against a token index inside one of them. */
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
      /* A measure always shows its time signature. A single beat normally does
         not — a lone quarter note is self-evidently one beat — but in a meter
         whose beat is NOT a quarter it is the time signature that says so. An
         eighth note on its own reads as half a beat to anyone who has only met
         4/4, which is precisely the misreading the Rhythms in Three lesson is
         about: "that is what the bottom number says, and it is all it says." */
      if (prompt.scope === "measure" || meter.beatUnit !== "4") {
        stave.addTimeSignature(meter.label);
      }
      stave.setContext(context).draw();

      const beams: Beam[] = [];
      const drawn: DrawnNote[] = prompt.cells.flatMap((cell, cellIndex) =>
        cell.notation.tokens.map((notationToken, tokenIndex) => {
          const note = new StaveNote({
            clef: "percussion",
            keys: [notationToken.rest ? "b/4" : "f/4"],
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

      /* Who shares a beam is decided by the data model, not here — including
         the 3/8 whole-bar exception. This component draws what it is told. */
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
        /* A beam that crosses a beat still has to SHOW the beat: the primary
           runs the bar, the secondary breaks where the beats do. Empty in every
           per-beat meter, because those runs never cross one. */
        const breaks = secondaryBeamBreaks(run);
        if (breaks.length > 0) beam.breakSecondaryAt([...breaks]);
        beams.push(beam);
      }

      const voice = new Voice({
        numBeats: beats,
        beatValue: meter.vexBeatValue,
      }).addTickables(drawn.map((entry) => entry.note));
      new Formatter().joinVoices([voice]).format([voice], width - (prompt.scope === "measure" ? 135 : 105));
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
