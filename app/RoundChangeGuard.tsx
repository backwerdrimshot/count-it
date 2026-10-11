"use client";
import { useRef } from "react";

/** Defer every mutation until Continue; Cancel and Escape leave the round intact. */
export function useRoundChangeGuard(hasAnswers: boolean) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pending = useRef<(() => void) | null>(null);
  function protect(change: () => void) {
    if (!hasAnswers) { change(); return; }
    returnFocus.current = document.activeElement as HTMLElement;
    pending.current = change;
    dialog.current?.showModal();
  }
  const confirmation = <dialog ref={dialog} className="workspace-dialog" aria-labelledby="round-change-title"
    onCancel={() => { pending.current = null; }}
    onClose={() => { pending.current = null; returnFocus.current?.focus(); }}
    onPointerDownCapture={event => event.stopPropagation()}
    onKeyDownCapture={event => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); pending.current = null; dialog.current?.close(); }
    }}>
    <h2 id="round-change-title">Start a new set?</h2>
    <p>Changing the rhythms, meter or counting starts a new set and clears this unfinished challenge.</p>
    <div className="result-actions">
      <button type="button" className="secondary-button" autoFocus onClick={() => { pending.current = null; dialog.current?.close(); }}>Cancel</button>
      <button type="button" className="primary-button" onClick={() => {
        const change = pending.current;
        pending.current = null;
        dialog.current?.close();
        change?.();
      }}>Continue</button>
    </div>
  </dialog>;
  return { protect, confirmation };
}
