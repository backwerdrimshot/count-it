import { getPromptAnswer } from "./counting";
import { getRhythmCell } from "./cells";
import type { RhythmCell, RhythmPrompt } from "./types";

export function createBeatPrompt(cellOrId: RhythmCell | string): RhythmPrompt {
  const cell = typeof cellOrId === "string" ? getRhythmCell(cellOrId) : cellOrId;
  return Object.freeze({ scope: "beat" as const, cells: Object.freeze([cell]) as readonly [RhythmCell] });
}

export function createMeasurePrompt(
  cellsOrIds: readonly [RhythmCell | string, RhythmCell | string, RhythmCell | string, RhythmCell | string],
): RhythmPrompt {
  if (!Array.isArray(cellsOrIds) || cellsOrIds.length !== 4) {
    throw new TypeError("A 4/4 measure prompt requires exactly four rhythm cells.");
  }
  const cells = cellsOrIds.map((cell) =>
    typeof cell === "string" ? getRhythmCell(cell) : cell,
  ) as [RhythmCell, RhythmCell, RhythmCell, RhythmCell];
  return Object.freeze({
    scope: "measure" as const,
    cells: Object.freeze(cells) as readonly [RhythmCell, RhythmCell, RhythmCell, RhythmCell],
  });
}

export function getPromptId(prompt: RhythmPrompt): string {
  return `${prompt.scope}:${prompt.cells.map((cell) => cell.id).join("+")}`;
}

export function explainPrompt(prompt: RhythmPrompt): string {
  if (prompt.scope === "beat") return prompt.cells[0].explanation;
  const beatDetails = prompt.cells.map((cell, index) => {
    const answer = getPromptAnswer(createBeatPrompt(cell)).replace(/^1/, String(index + 1));
    return `Beat ${index + 1}: ${answer}.`;
  });
  return beatDetails.join(" ");
}
