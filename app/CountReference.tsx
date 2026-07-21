import { countLabelsForBeat, type RhythmPrompt } from "../src/rhythm";

export default function CountReference({
  prompt,
  revealSounding,
}: {
  prompt: RhythmPrompt;
  revealSounding: boolean;
}) {
  return (
    <div className="count-reference" aria-label="Complete subdivision reference">
      {prompt.cells.map((cell, beatIndex) => (
        <div className="reference-beat" key={`${cell.id}-${beatIndex}`}>
          <span className="beat-label">Beat {beatIndex + 1}</span>
          <div className="reference-counts">
            {countLabelsForBeat(beatIndex + 1).map((label, partial) => {
              const active = cell.activePositions.includes(partial as 0 | 1 | 2 | 3);
              const className = revealSounding ? (active ? "sounds" : "silent") : "unmarked";
              return (
                <span className={className} key={`${label}-${partial}`}>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
