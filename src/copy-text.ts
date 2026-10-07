export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/** Copy when available; always offer the caller's fallback when access is absent or denied. */
export async function copyTextOrFallback(
  text: string,
  getClipboard: () => ClipboardLike | null | undefined,
  fallback: (text: string) => void,
): Promise<boolean> {
  try {
    const clipboard = getClipboard();
    if (!clipboard?.writeText) throw new Error("Clipboard API unavailable.");
    await clipboard.writeText(text);
    return true;
  } catch {
    fallback(text);
    return false;
  }
}
