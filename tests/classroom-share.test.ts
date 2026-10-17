import { describe, expect, it } from "vitest";
import { classroomShareUrl } from "../src/classroom-share";
import { CATALOG_ENTRIES } from "../src/assignment/catalog";

describe("classroomShareUrl", () => {
  it("hands Google Classroom the full assignment link and its title", () => {
    const entry = CATALOG_ENTRIES[0];
    const share = new URL(classroomShareUrl(entry.link, entry.title));
    expect(`${share.origin}${share.pathname}`).toBe("https://classroom.google.com/share");
    expect(share.searchParams.get("url")).toBe(entry.link);
    expect(share.searchParams.get("title")).toBe(entry.title);
  });

  it("leaves the title out when there is none", () => {
    const share = new URL(classroomShareUrl("https://count-it.backwerdrhythmshop.com/?level=1"));
    expect(share.searchParams.has("title")).toBe(false);
  });
});
