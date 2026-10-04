"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";

export function WorkspaceActions() {
  const open = (id: string) => (document.getElementById(id) as HTMLDialogElement | null)?.showModal();
  return <nav className="workspace-actions" aria-label="Help and app information">
    <button type="button" onClick={() => open("workspace-help")}>Help</button>
    <button type="button" onClick={() => open("workspace-about")}>About</button>
  </nav>;
}

export default function WorkspaceInfo({ name, guide, help, children }: { name: string; guide?: string; help?: ReactNode; children: ReactNode }) {
  const helpDialog = useRef<HTMLDialogElement>(null);
  const aboutDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      if (helpDialog.current?.open || aboutDialog.current?.open) event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", guard, true);
    return () => window.removeEventListener("keydown", guard, true);
  }, []);
  const closeForSupport = (event: MouseEvent<HTMLDialogElement>) => {
    if ((event.target as HTMLElement).closest('a[href^="mailto:"]')) aboutDialog.current?.close();
  };
  const closeBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
  };
  return <>
    <dialog id="workspace-help" ref={helpDialog} className="workspace-dialog" aria-labelledby="workspace-help-title" onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-help-title">How to use {name}</h2><button type="button" aria-label="Close help" onClick={() => helpDialog.current?.close()}>Close</button></div>
      {help ?? <p>Choose your settings, then use the practice controls. Your work stays in this browser.</p>}
      {guide && <a href={guide}>Read the full guide ↗</a>}
    </dialog>
    <dialog id="workspace-about" ref={aboutDialog} className="workspace-dialog" aria-labelledby="workspace-about-title" onClickCapture={closeForSupport} onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-about-title">About {name}</h2><button type="button" aria-label="Close about" onClick={() => aboutDialog.current?.close()}>Close</button></div>
      {children}
    </dialog>
  </>;
}
