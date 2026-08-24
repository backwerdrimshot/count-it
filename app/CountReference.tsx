import { countLabelsForBeat, getMeter, type RhythmPrompt } from "../src/rhythm";

export default function CountReference({
  prompt,
  revealSounding,
}: {
  prompt: RhythmPrompt;
  revealSounding: boolean;
}) {
  /* The grid has as many columns per beat as the beat has counted positions:
     four under a quarter beat, two under an eighth. Defaulting to four drew a
     3/8 beat with an e and an a underneath it — positions the notation cannot
     express and the student is not being asked about. */
  const { partialsPerBeat } = getMeter(prompt.meter);
  return (
    <div className="count-reference" aria-label="Complete subdivision reference">
      {prompt.cells.map((cell, beatIndex) => (
        <div className="reference-beat" key={`${cell.id}-${beatIndex}`}>
          <span className="beat-label">Beat {beatIndex + 1}</span>
          <div className="reference-counts">
            {countLabelsForBeat(beatIndex + 1, "standard", partialsPerBeat).map((label, partial) => {
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
