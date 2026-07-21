export const PARTIALS_PER_BEAT = 4 as const;
export const BEATS_PER_MEASURE = 4 as const;

export type BeatNumber = 1 | 2 | 3 | 4;
export type PartialPosition = 0 | 1 | 2 | 3;
export type LevelId = "level-1" | "level-2" | "level-3";
export type CountingSystemId = "standard" | "eastman" | "takadimi";
export type DistractorCategory =
  | "omitted_sound"
  | "added_sound"
  | "shifted_subdivision"
  | "eighth_sixteenth_confusion"
  | "wrong_beat_number";

export type NoteDuration = "4" | "8" | "16";
export type PartialBeamDirection = "left" | "right";

export interface NotationToken {
  readonly duration: NoteDuration;
  readonly partial: PartialPosition;
  readonly ticks: 1 | 2 | 3 | 4;
  readonly rest?: true;
  readonly dots?: 1;
}

export interface RhythmCell {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly resolution: 1 | 2 | 4;
  readonly activePositions: readonly PartialPosition[];
  readonly restPositions: readonly PartialPosition[];
  readonly difficulty: 1 | 2 | 3;
  readonly minLevel: LevelId;
  readonly verifiedAnswers: Readonly<Record<CountingSystemId, string>>;
  readonly notation: {
    readonly tokens: readonly NotationToken[];
    readonly beamGroups: readonly (readonly number[])[];
    readonly partialBeamDirections: Readonly<Partial<Record<number, PartialBeamDirection>>>;
  };
  readonly explanation: string;
  readonly permittedDistractors: readonly DistractorCategory[];
}

export interface LevelDefinition {
  readonly id: LevelId;
  readonly order: 1 | 2 | 3;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
}

export interface BeatPrompt {
  readonly scope: "beat";
  readonly cells: readonly [RhythmCell];
}

export interface MeasurePrompt {
  readonly scope: "measure";
  readonly cells: readonly [RhythmCell, RhythmCell, RhythmCell, RhythmCell];
}

export type RhythmPrompt = BeatPrompt | MeasurePrompt;
