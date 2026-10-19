'use client';
import { useEffect, useState } from 'react';
import { PROGRAM_FRAME_KEY, programFrameOrigin } from '../src/program-frame';
export function useProgramOrigin() {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let remembered = null;
      try { remembered = sessionStorage.getItem(PROGRAM_FRAME_KEY); } catch { /* optional */ }
      setOrigin(programFrameOrigin(location.search, document.referrer, window.parent !== window,
        location.origin, remembered, process.env.NODE_ENV !== 'production'));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return origin;
}
