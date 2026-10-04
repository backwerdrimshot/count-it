import {
  beatStarts,
  countLabelsForBeat,
  getMeter,
  type RhythmPrompt,
} from "../src/rhythm";

export default function CountReference({
  prompt,
  revealSounding,
}: {
  prompt: RhythmPrompt;
  revealSounding: boolean;
}) {
  /* One block per BEAT of the bar, numbered by the beat it is.
   *
   * This used to be one block per CELL, numbered by the cell's position in the
   * list. Those are the same thing while every cell is one beat, and not after
   * a half or whole note: [half, quarter, quarter] drew three blocks labelled
   * 1, 2, 3 and lit the "2" for a quarter that actually sounds on beat three —
   * a guide teaching the wrong bar, in a mode whose whole job is the guide.
   * The beat under a held note has no cell starting on it, so it is drawn
   * silent, which is what "this app counts the notes that sound" means. */
  const starts = beatStarts(prompt.cells);
  const beats = prompt.scope === "beat" ? 1 : getMeter(prompt.meter).beatsPerMeasure;
  return (
    <div className="count-reference" aria-label="Complete subdivision reference">
      {Array.from({ length: beats }, (_, index) => {
        const beat = index + 1;
        const cellIndex = starts.indexOf(beat);
        const cell = cellIndex === -1 ? null : prompt.cells[cellIndex];
        return (
          <div className="reference-beat" key={`beat-${beat}`}>
            <span className="beat-label">Beat {beat}</span>
            <div className="reference-counts">
              {countLabelsForBeat(beat, "standard").map((label, partial) => {
                const active = Boolean(cell?.activePositions.includes(partial as 0 | 1 | 2 | 3));
                const className = revealSounding ? (active ? "sounds" : "silent") : "unmarked";
                return (
                  <span className={className} key={`${label}-${partial}`}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
