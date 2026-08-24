/* PARTIALS_PER_BEAT and BEATS_PER_MEASURE used to live here as `4 as const`.
   Both were exported and imported by nothing: every place that needed the
   number wrote its own literal 4, which is how "4/4" became eight independent
   assumptions instead of one setting. They are properties of a Meter now —
   see ./meter.ts. */

export type MeterId = "4-4" | "3-4" | "3-8";
/** Which written note gets the beat: a quarter, or an eighth. */
export type BeatUnit = "4" | "8";
/** Counted positions inside one beat. A quarter beat holds four, an eighth two. */
export type PartialCount = 2 | 4;

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

export type NoteDuration = "1" | "2" | "4" | "8" | "16";
export type PartialBeamDirection = "left" | "right";

export interface NotationToken {
  readonly duration: NoteDuration;
  readonly partial: PartialPosition;
  readonly ticks: 1 | 2 | 3 | 4 | 8 | 16;
  readonly rest?: true;
  readonly dots?: 1;
}

export interface RhythmCell {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  /* Which beat this cell IS one of. A quarter-beat cell is legal in 4/4 and
     3/4; an eighth-beat cell is legal in 3/8. A round mixing the two would ask
     a student to count a bar that does not add up, so the pool is filtered by
     this rather than by hoping a link author knows the difference. */
  readonly beatUnit: BeatUnit;
  /* How many beats the cell SPANS. One for everything the catalog held until
     whole and half notes arrived — a half note is two beats and a whole note
     is four, and no amount of subdividing one beat can express either.
     A spanning cell sounds once, at the top of its span, and the beats it
     covers are silent because they are held rather than because they are
     rests. The count does not distinguish those: this app counts the notes
     that sound, so a half note on beat one of 4/4 answers "1" and beat two
     contributes nothing. */
  readonly beats: number;
  /** Equal divisions of the beat this cell uses: 1 whole, 2 halves, 4 quarters. */
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
  readonly meter: MeterId;
  readonly cells: readonly [RhythmCell];
}

/* Was a fixed four-tuple, which is the type system asserting 4/4. The cells'
   beat SPANS sum to the meter's beatsPerMeasure, which is checked when the
   prompt is built — the length alone stopped being the right question once a
   cell could be worth more than one beat. */
export interface MeasurePrompt {
  readonly scope: "measure";
  readonly meter: MeterId;
  readonly cells: readonly RhythmCell[];
}

export type RhythmPrompt = BeatPrompt | MeasurePrompt;
