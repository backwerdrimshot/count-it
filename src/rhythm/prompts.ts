import { getPromptAnswer } from "./counting";
import { getRhythmCell } from "./cells";
import { DEFAULT_METER, getMeter } from "./meter";
import type { MeterId, RhythmCell, RhythmPrompt } from "./types";

function resolve(cellOrId: RhythmCell | string): RhythmCell {
  return typeof cellOrId === "string" ? getRhythmCell(cellOrId) : cellOrId;
}

/* A cell belongs to a beat family, and a meter asks for one of them. Mixing
   them would build a bar that does not add up — three quarter-beat cells in a
   3/8 measure is a bar of 3/4 wearing the wrong time signature — and the
   student would be asked to count something the notation never said. */
function assertBeatFamily(cell: RhythmCell, meterId: MeterId): void {
  const { beatUnit, label } = getMeter(meterId);
  if (cell.beatUnit !== beatUnit) {
    throw new TypeError(
      `${cell.id} is a ${cell.beatUnit === "4" ? "quarter" : "eighth"}-beat rhythm and ${label} counts ` +
        `${beatUnit === "4" ? "quarter" : "eighth"}-note beats.`,
    );
  }
}

export function createBeatPrompt(
  cellOrId: RhythmCell | string,
  meter: MeterId = DEFAULT_METER,
): RhythmPrompt {
  const cell = resolve(cellOrId);
  assertBeatFamily(cell, meter);
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
  if (!Array.isArray(cellsOrIds) || cellsOrIds.length !== beatsPerMeasure) {
    throw new TypeError(`A ${label} measure prompt requires exactly ${beatsPerMeasure} rhythm cells.`);
  }
  const cells = cellsOrIds.map(resolve);
  for (const cell of cells) assertBeatFamily(cell, meter);
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
  const beatDetails = prompt.cells.map((cell, index) => {
    const answer = getPromptAnswer(createBeatPrompt(cell, prompt.meter)).replace(
      /^1/,
      String(index + 1),
    );
    return `Beat ${index + 1}: ${answer}.`;
  });
  return beatDetails.join(" ");
}
