'use client';
import { useEffect, useRef, useState } from 'react';
import { playbackEvents, type RhythmScore } from '../src/score';

export default function RhythmPlayer({ score, onBeat }: { score: RhythmScore; onBeat: (beat: number | null) => void }) {
  const [bpm, setBpm] = useState(80);
  const [countIn, setCountIn] = useState(true);
  const [pulse, setPulse] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const context = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const run = useRef(0);
  const callback = useRef(onBeat);
  useEffect(() => { callback.current = onBeat; }, [onBeat]);
  useEffect(() => () => {
    run.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    void context.current?.close();
    callback.current(null);
  }, [score]);
  function stop() {
    run.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    void context.current?.close(); context.current = null;
    setPlaying(false); onBeat(null); setMessage('Stopped.');
  }
  async function play() {
    const token = ++run.current;
    try {
      const audio = new AudioContext(); context.current = audio;
      await audio.resume();
      if (token !== run.current) { void audio.close(); return; }
      const schedule = playbackEvents(score, bpm, countIn);
      const start = audio.currentTime + 0.08;
      const tone = (when: number, frequency: number, gain: number, length: number) => {
        const oscillator = audio.createOscillator(); const envelope = audio.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, when); envelope.gain.linearRampToValueAtTime(gain, when + 0.003);
        envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
        oscillator.connect(envelope); envelope.connect(audio.destination);
        oscillator.start(when); oscillator.stop(when + length + 0.01);
      };
      schedule.clicks.forEach((event, index) => { if (pulse || index < schedule.lead) tone(start + event.time, event.accent ? 1600 : 1100, 0.06, 0.055); });
      schedule.attacks.forEach(event => tone(start + event.time, 320, 0.16, Math.min(6, event.length * 0.85)));
      setPlaying(true); setMessage(countIn ? `Count in: ${score.beats} beats.` : 'Playing rhythm.');
      const update = () => {
        if (token !== run.current) return;
        const elapsed = audio.currentTime - start;
        const beat = elapsed / schedule.beatSeconds - schedule.lead;
        callback.current(beat >= 0 ? Math.min(beat, score.beats) : null);
        if (elapsed >= schedule.duration) {
          setPlaying(false); setMessage('Playback complete.'); callback.current(null);
          void audio.close(); context.current = null; return;
        }
        frame.current = requestAnimationFrame(update);
      };
      frame.current = requestAnimationFrame(update);
    } catch {
      void context.current?.close(); context.current = null;
      setPlaying(false); onBeat(null); setMessage('Audio is unavailable in this browser. The reading exercise still works.');
    }
  }
  return <div className="rhythm-player">
    <button type="button" className="secondary-button" onClick={() => { if (playing) stop(); else void play(); }}>{playing ? 'Stop playback' : 'Listen to rhythm'}</button>
    <label>Tempo <input aria-label="Tempo BPM" type="number" min={40} max={200} value={bpm} disabled={playing} onChange={e => setBpm(Math.max(40, Math.min(200, Number(e.target.value) || 80)))} /> BPM</label>
    <label><input type="checkbox" checked={countIn} disabled={playing} onChange={e => setCountIn(e.target.checked)} /> Count in</label>
    <label><input type="checkbox" checked={pulse} disabled={playing} onChange={e => setPulse(e.target.checked)} /> Beat pulse</label>
    <span className="visually-hidden" role="status">{message}</span>
  </div>;
}
