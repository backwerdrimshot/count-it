import { describe, expect, it, vi } from "vitest";
import { copyTextOrFallback } from "../src/copy-text";

describe("copying a result summary", () => {
  it("uses the prompt fallback when the clipboard API is missing", async () => {
    const fallback = vi.fn();
    expect(await copyTextOrFallback("summary", () => undefined, fallback)).toBe(false);
    expect(fallback).toHaveBeenCalledWith("summary");
  });

  it("uses the prompt fallback when clipboard permission is denied", async () => {
    const fallback = vi.fn();
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    expect(await copyTextOrFallback("summary", () => ({ writeText }), fallback)).toBe(false);
    expect(fallback).toHaveBeenCalledWith("summary");
  });

  it("does not show a fallback after a successful write", async () => {
    const fallback = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyTextOrFallback("summary", () => ({ writeText }), fallback)).toBe(true);
    expect(writeText).toHaveBeenCalledWith("summary");
    expect(fallback).not.toHaveBeenCalled();
  });
});
