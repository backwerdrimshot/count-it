"use client";
import { useMemo, useState } from 'react';
import { type CountingProfileId, type RhythmPrompt } from '../src/rhythm';
import { scoreFromPrompt } from '../src/score';
import ScoreNotation from './ScoreNotation';
import RhythmPlayer from './RhythmPlayer';

export default function RhythmNotation({ prompt, label, system = 'standard', showGuide = false, revealed = false, playback = false }: {
  prompt: RhythmPrompt; label: string; system?: CountingProfileId; showGuide?: boolean; revealed?: boolean; playback?: boolean;
}) {
  const score = useMemo(() => scoreFromPrompt(prompt), [prompt]);
  const [beat, setBeat] = useState<number | null>(null);
  return <div className="rhythm-exercise">
    <ScoreNotation score={score} label={label} system={system} showGuide={showGuide} revealed={revealed} activeBeat={beat} />
    {playback && <RhythmPlayer key={JSON.stringify(score)} score={score} onBeat={setBeat} />}
  </div>;
}
