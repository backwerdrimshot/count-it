"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeToDialogSupport = () => () => {};
const getDialogSupportSnapshot = () => "HTMLDialogElement" in window;
const getDialogSupportServerSnapshot = () => false;

function mailtoFor(address: string, subject: string, body: string): string {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function SupportFallbackDialog() {
  const supported = useSyncExternalStore(
    subscribeToDialogSupport,
    getDialogSupportSnapshot,
    getDialogSupportServerSnapshot,
  );
  const [copyLabel, setCopyLabel] = useState("Copy details");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const addressElementRef = useRef<HTMLElement>(null);
  const bodyFieldRef = useRef<HTMLTextAreaElement>(null);
  const openLinkRef = useRef<HTMLAnchorElement>(null);
  const triggeringLinkRef = useRef<HTMLAnchorElement | null>(null);
  const addressRef = useRef("");
  const subjectRef = useRef("");
  const copyResetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    const dialog = dialogRef.current;
    const dialogTitle = titleRef.current;
    const addressElement = addressElementRef.current;
    const bodyField = bodyFieldRef.current;
    const openLink = openLinkRef.current;
    if (!dialog || !dialogTitle || !addressElement || !bodyField || !openLink) return;

    const handlers = new Map<HTMLAnchorElement, (event: MouseEvent) => void>();
    document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((link) => {
      if (!/support@|feedback@/.test(link.getAttribute("href") || "")) return;
      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        const url = new URL(link.getAttribute("href") || "");
        addressRef.current = url.pathname;
        subjectRef.current = url.searchParams.get("subject") || "";
        bodyField.value = url.searchParams.get("body") || "";
        dialogTitle.textContent = link.textContent?.trim() || "Contact us";
        addressElement.textContent = addressRef.current;
        openLink.setAttribute(
          "href",
          mailtoFor(addressRef.current, subjectRef.current, bodyField.value),
        );
        triggeringLinkRef.current = link;
        if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
        setCopyLabel("Copy details");
        dialog.showModal();
        bodyField.setSelectionRange(0, 0);
        bodyField.scrollTop = 0;
      };
      handlers.set(link, handleClick);
      link.addEventListener("click", handleClick);
    });

    return () => {
      handlers.forEach((handler, link) => link.removeEventListener("click", handler));
    };
  }, [supported]);

  if (!supported) return null;

  const handleCopy = async () => {
    const bodyField = bodyFieldRef.current;
    if (!bodyField) return;
    const text = `To: ${addressRef.current}\nSubject: ${subjectRef.current}\n\n${bodyField.value}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied ✓");
    } catch {
      bodyField.select();
      setCopyLabel("Press Ctrl+C to copy");
    }
    if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    copyResetRef.current = window.setTimeout(() => setCopyLabel("Copy details"), 2000);
  };

  return (
    <dialog
      className="support-dialog"
      ref={dialogRef}
      aria-labelledby="support-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      onClose={() => triggeringLinkRef.current?.focus()}
    >
      <h2 id="support-dialog-title" ref={titleRef} />
      <p className="support-dialog-lede">
        Open your email app below — or copy the message and paste it into any
        email (webmail included) addressed to{" "}
        <strong ref={addressElementRef} className="support-dialog-address" />.
      </p>
      <label className="support-dialog-label">
        Message
        <textarea ref={bodyFieldRef} className="support-dialog-body" rows={9} spellCheck={false} />
      </label>
      <div className="support-dialog-actions">
        <a
          ref={openLinkRef}
          className="foot-btn support-dialog-open"
          href="#"
          onClick={(event) => {
            event.currentTarget.href = mailtoFor(
              addressRef.current,
              subjectRef.current,
              bodyFieldRef.current?.value || "",
            );
          }}
        >
          Open in my email app
        </a>
        <button type="button" className="foot-btn support-dialog-copy" onClick={() => void handleCopy()}>
          {copyLabel}
        </button>
        <button
          type="button"
          className="foot-btn support-dialog-close"
          onClick={() => dialogRef.current?.close()}
        >
          Close
        </button>
      </div>
      <p className="support-dialog-hint">
        Nothing opens? This device has no email app set up — use “Copy details”
        and paste into the email service you use.
      </p>
    </dialog>
  );
}
