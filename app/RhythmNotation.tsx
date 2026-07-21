"use client";

import { useEffect, useRef } from "react";
import { Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import type { RhythmPrompt } from "../src/rhythm";

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
      const naturalWidth = prompt.scope === "measure" ? 760 : 390;
      const width = Math.max(naturalWidth, element.clientWidth || naturalWidth);
      const renderer = new Renderer(element, Renderer.Backends.SVG);
      renderer.resize(width, 172);
      const context = renderer.getContext();
      const stave = new Stave(10, 26, width - 20);
      stave.addClef("percussion");
      if (prompt.scope === "measure") stave.addTimeSignature("4/4");
      stave.setContext(context).draw();

      const beams: Beam[] = [];
      const notes = prompt.cells.flatMap((cell) => {
        const beatNotes = cell.notation.tokens.map((notationToken) => {
          const note = new StaveNote({
            clef: "percussion",
            keys: [notationToken.rest ? "b/4" : "f/4"],
            duration: `${notationToken.duration}${notationToken.dots ? "d" : ""}${notationToken.rest ? "r" : ""}`,
          });
          if (notationToken.dots) Dot.buildAndAttach([note], { all: true });
          return note;
        });
        for (const group of cell.notation.beamGroups) {
          const beam = new Beam(group.map((index) => beatNotes[index]));
          for (const [tokenIndex, direction] of Object.entries(cell.notation.partialBeamDirections)) {
            const beamNoteIndex = group.indexOf(Number(tokenIndex));
            if (beamNoteIndex >= 0) {
              beam.setPartialBeamSideAt(beamNoteIndex, direction === "left" ? "L" : "R");
            }
          }
          beams.push(beam);
        }
        return beatNotes;
      });

      const voice = new Voice({
        numBeats: prompt.scope === "measure" ? 4 : 1,
        beatValue: 4,
      }).addTickables(notes);
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
