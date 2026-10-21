/** Versioned response contracts; absence always retains legacy generation. */
export type ResponseVocabulary = "eighths-v1" | "half-beats-v1";
export const HALF_BEAT_REPAIR_POOLS = [
  ["quarter", "eighths", "eighth-rest", "rest-eighth"],
  ["whole", "half", "half-rest", "quarter", "eighths"],
] as const;
export function acceptsResponseVocabulary(response: string, system: string | undefined, scope: string | undefined, meter: string | null | undefined, cells: readonly string[] | null | undefined): response is ResponseVocabulary {
  if (system !== "standard" || !cells) return false;
  if (response === "eighths-v1") return ["2-4", "3-4", "4-4"].includes(meter ?? "") && cells.length === 2 && cells.includes("quarter") && cells.includes("eighths");
  return response === "half-beats-v1" && scope === "measure" && meter === "4-4" && HALF_BEAT_REPAIR_POOLS.some(pool => pool.length === cells.length && pool.every(id => cells.includes(id)));
}
