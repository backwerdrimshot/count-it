/* Plain anchors match the app navigation: next/link fails in this vinext build. */
/* eslint-disable @next/next/no-html-link-for-pages */
'use client';
import { useEffect, useState } from 'react';
import { readHistory, type PracticeHistoryEntry } from '../../src/practice-history';
import { downloadResultImage } from '../../src/result-download';
export default function History() {
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
  useEffect(() => { const timer = setTimeout(() => { try { setHistory(readHistory(localStorage)); } catch { /* optional */ } }, 0); return () => clearTimeout(timer); }, []);
  return <main className="workshop-page"><a href="/">← Count It practice</a><h1>Practice history</h1>
    <p>Your last 50 completed challenges on this device. Names and class IDs are not saved here. Clearing browser data removes this history.</p>
    {history.length === 0 ? <p>No completed challenges saved on this device yet.</p> : <ol className="history-list">{history.map(entry => <li key={entry.id}>
      <h2>{entry.score}/{entry.total} · {Math.round(entry.score / entry.total * 100)}%</h2>
      <p>{new Date(entry.finishedAt).toLocaleString()} · Attempt {entry.attempt}</p><p>{entry.assignment ?? 'Free practice'} · {entry.conditions}</p>
      <p>{entry.missed.length ? `Rhythms to revisit: ${entry.missed.join(', ')}` : 'All questions correct.'}</p>
      <button type="button" className="secondary-button" onClick={() => downloadResultImage(`Count It — Practice history\n${entry.assignment ?? 'Free practice'}\nScore: ${entry.score}/${entry.total}\nConditions: ${entry.conditions}\nFinished: ${new Date(entry.finishedAt).toLocaleString()}\nAttempt: ${entry.attempt}\nMissed: ${entry.missed.join(', ') || 'None'}`)}>Download history card</button>
    </li>)}</ol>}
  </main>;
}
