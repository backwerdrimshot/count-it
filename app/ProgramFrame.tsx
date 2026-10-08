'use client';
import { useEffect, useState } from 'react';
import { PROGRAM_FRAME_KEY, programFrameOrigin } from '../src/program-frame';

export default function ProgramFrame() {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let remembered = null;
      try { remembered = sessionStorage.getItem(PROGRAM_FRAME_KEY); } catch { /* optional */ }
      const parentOrigin = programFrameOrigin(location.search, document.referrer, window.parent !== window,
        location.origin, remembered, process.env.NODE_ENV !== 'production');
      if (!parentOrigin) return;
      setOrigin(parentOrigin);
      document.body.dataset.praxisProgram = 'true';
      try { sessionStorage.setItem(PROGRAM_FRAME_KEY, parentOrigin); } catch { /* optional */ }
      window.parent.postMessage({ type: 'count-it.ready', version: 1 }, parentOrigin);
    }, 0);
    return () => { clearTimeout(timer); delete document.body.dataset.praxisProgram; };
  }, []);
  if (!origin) return null;
  return <nav className="program-frame-bar" aria-label="Program practice">
    <button type="button" className="secondary-button" onClick={() => window.parent.postMessage({ type: 'count-it.return', version: 1 }, origin)}>← Back to Program</button>
    <span>Director-led practice · results stay on this device</span>
  </nav>;
}
