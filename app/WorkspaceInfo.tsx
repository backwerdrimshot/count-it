"use client";

import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { FeedbackIcon, HelpIcon, InfoIcon } from "./icons";

/* `teachers` is a page worth one visible click from the practice screen, for an
   audience that is not the student at the keyboard. Everything else a person might
   look for lives in the Help, Feedback and About dialogs, which is right for links nobody
   needs to find in a hurry and wrong for the one a teacher has to find at all. */
// Each action shows its icon with its name. Below 600px the name is kept, visually
// hidden, so the button still reads as Help, Feedback or About to a screen reader.
export function WorkspaceActions({ teachers }: { teachers?: { href: string; label: string } }) {
  const open = (id: string) => (document.getElementById(id) as HTMLDialogElement | null)?.showModal();
  return <nav className="workspace-actions" aria-label="Help and app information">
    {teachers && <a href={teachers.href}>{teachers.label}</a>}
    <button type="button" aria-label="Help" title="Help" onClick={() => open("workspace-help")}><HelpIcon /><span>Help</span></button>
    <button type="button" aria-label="Feedback" title="Send feedback" onClick={() => open("workspace-feedback")}><FeedbackIcon /><span>Feedback</span></button>
    <button type="button" aria-label="About" title="About" onClick={() => open("workspace-about")}><InfoIcon /><span>About</span></button>
  </nav>;
}

/* Help holds the app's help text and its guide. The two forms and the two email links
   live in Feedback; About carries the app, its build, More apps, the guide and the copyright. */
export default function WorkspaceInfo({ name, guide, help, feedback, children }: { name: string; guide?: string; help?: ReactNode; feedback?: ReactNode; children: ReactNode }) {
  const helpDialog = useRef<HTMLDialogElement>(null);
  const feedbackDialog = useRef<HTMLDialogElement>(null);
  const aboutDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      if (helpDialog.current?.open || feedbackDialog.current?.open || aboutDialog.current?.open) event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", guard, true);
    return () => window.removeEventListener("keydown", guard, true);
  }, []);
  // A mail link hands the message to the mail app, so the dialog holding it closes.
  const closeForSupport = (event: MouseEvent<HTMLDialogElement>) => {
    if ((event.target as HTMLElement).closest('a[href^="mailto:"]')) event.currentTarget.close();
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
      {guide && <p className="dialog-guide"><a className="text-action" href={guide}>Read the full guide ↗</a></p>}
    </dialog>
    <dialog id="workspace-feedback" ref={feedbackDialog} className="workspace-dialog" aria-labelledby="workspace-feedback-title" onClickCapture={closeForSupport} onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-feedback-title">Send feedback</h2><button type="button" aria-label="Close feedback" onClick={() => feedbackDialog.current?.close()}>Close</button></div>
      {feedback}
    </dialog>
    <dialog id="workspace-about" ref={aboutDialog} className="workspace-dialog" aria-labelledby="workspace-about-title" onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-about-title">About {name}</h2><button type="button" aria-label="Close about" onClick={() => aboutDialog.current?.close()}>Close</button></div>
      {children}
    </dialog>
  </>;
}
