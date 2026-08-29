import { getPromptAnswer } from "./counting";
import { getRhythmCell } from "./cells";
import { beatSpan, beatStarts, DEFAULT_METER, getMeter } from "./meter";
import type { MeterId, RhythmCell, RhythmPrompt } from "./types";

function resolve(cellOrId: RhythmCell | string): RhythmCell {
  return typeof cellOrId === "string" ? getRhythmCell(cellOrId) : cellOrId;
}

export function createBeatPrompt(
  cellOrId: RhythmCell | string,
  meter: MeterId = DEFAULT_METER,
): RhythmPrompt {
  const cell = resolve(cellOrId);
  /* A note that lasts longer than a beat cannot be asked as a one-beat
     question. "How long does this last?" is the reading skill a half note
     teaches, and a single beat cannot pose it. */
  if (cell.beats !== 1) {
    throw new TypeError(
      `${cell.id} spans ${cell.beats} beats, so it can only appear in a full-measure question.`,
    );
  }
  return Object.freeze({
    scope: "beat" as const,
    meter,
    cells: Object.freeze([cell]) as readonly [RhythmCell],
  });
}

export function createMeasurePrompt(
  cellsOrIds: readonly (RhythmCell | string)[],
  meter: MeterId = DEFAULT_METER,
): RhythmPrompt {
  const { beatsPerMeasure, label } = getMeter(meter);
  if (!Array.isArray(cellsOrIds) || cellsOrIds.length === 0) {
    throw new TypeError(`A ${label} measure prompt requires at least one rhythm cell.`);
  }
  const cells = cellsOrIds.map(resolve);
  /* The SPANS must fill the bar, not the count of cells. Those were the same
     check while every cell was one beat; a half note plus two quarters is
     three cells and four beats, and a bar of four half notes is four cells and
     eight beats — the second is not a bar of 4/4 and has to be refused. */
  const span = beatSpan(cells);
  if (span !== beatsPerMeasure) {
    throw new TypeError(
      `A ${label} measure holds ${beatsPerMeasure} beats; these rhythms fill ${span}.`,
    );
  }
  /* Something has to be countable. A cell may be silent — a half rest is two
     beats of nothing — but a bar that is silent throughout has no answer, and
     the question would be "which count matches?" with silence as the response. */
  if (!cells.some((cell) => cell.activePositions.length > 0)) {
    throw new TypeError("A measure prompt must sound at least one note.");
  }
  return Object.freeze({
    scope: "measure" as const,
    meter,
    cells: Object.freeze(cells) as readonly RhythmCell[],
  });
}

export function getPromptId(prompt: RhythmPrompt): string {
  return `${prompt.meter}:${prompt.scope}:${prompt.cells.map((cell) => cell.id).join("+")}`;
}

export function explainPrompt(prompt: RhythmPrompt): string {
  if (prompt.scope === "beat") return prompt.cells[0].explanation;
  const starts = beatStarts(prompt.cells);
  const beatDetails = prompt.cells.map((cell, index) => {
    const start = starts[index];
    /* A spanning cell is explained by what it covers rather than by a count
       inside one beat — "Beats 1-2: the half note holds" says the thing a
       student got wrong, where "Beat 1: 1" would not. Its own explanation
       carries that sentence, so it is used verbatim. */
    if (cell.beats > 1) {
      return `Beats ${start}\u2013${start + cell.beats - 1}: ${cell.explanation}`;
    }
    const answer = getPromptAnswer(createBeatPrompt(cell, prompt.meter)).replace(
      /^1/,
      String(start),
    );
    return answer
      ? `Beat ${start}: ${answer}.`
      : `Beat ${start}: silent.`;
  });
  return beatDetails.join(" ");
}
