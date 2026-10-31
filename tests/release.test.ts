import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildStamp, liveMatches, refusal, DEPLOY } from "../scripts/release.mjs";
import { COUNT_IT_BUILD } from "../src/capabilities";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/* Deploys are by hand (GitHub Actions does not run for this account), so
   scripts/release.mjs is the only thing standing between a stray checkout and
   production. These hold the decisions it makes without a network or a deploy. */
describe("pnpm release", () => {
  it("publishes only a clean tree that is exactly origin/main", () => {
    const main = { head: "a1", target: "a1", ahead: 0, behind: 0 };
    expect(refusal({ ...main, dirty: false })).toBeNull();
    expect(refusal({ ...main, dirty: true })).toMatch(/no commit/);
    expect(refusal({ dirty: false, head: "b2", target: "a1", ahead: 1, behind: 0 })).toMatch(/ahead of main/);
    expect(refusal({ dirty: false, head: "c3", target: "a1", ahead: 0, behind: 2 })).toMatch(/behind main/);
    expect(refusal({ dirty: false, head: "d4", target: "a1", ahead: 1, behind: 1 })).toMatch(/diverged/);
  });

  it("reads the build identifier from the same constant the app uses", () => {
    expect(buildStamp(read("src/capabilities.ts"))).toBe(COUNT_IT_BUILD);
    expect(buildStamp('export const COUNT_IT_BUILD = "2026-11-02.3";')).toBe("2026-11-02.3");
    expect(buildStamp("no build here")).toBeNull();
  });

  it("counts as live only when the manifest and the footer both name this build", () => {
    const stamp = "2026-10-31.1";
    const footer = (id: string) => `<span class="build-stamp">Build ${id}</span>`;
    const commented = `<span class="build-stamp">Build <!-- -->${stamp}</span>`;
    expect(liveMatches({ version: stamp, page: footer(stamp) }, { stamp })).toBe(true);
    expect(liveMatches({ version: stamp, page: commented }, { stamp })).toBe(true);
    // The upload can succeed while the edge still serves the last build.
    expect(liveMatches({ version: "2026-10-30.4", page: footer(stamp) }, { stamp })).toBe(false);
    expect(liveMatches({ version: stamp, page: footer("2026-10-30.4") }, { stamp })).toBe(false);
    expect(liveMatches({ version: stamp, page: footer("2026-10-31.10") }, { stamp })).toBe(false);
    expect(liveMatches({ version: "unreachable", page: "" }, { stamp })).toBe(false);
    expect(liveMatches({ version: "", page: "" }, { stamp: null })).toBe(false);
  });

  it("guards, checks, deploys and then reads the origin back, in that order", () => {
    const pkg = JSON.parse(read("package.json"));
    const script = read("scripts/release.mjs");
    expect(pkg.scripts.release).toBe("node scripts/release.mjs");
    expect(DEPLOY).toEqual(["exec", "wrangler", "deploy", "--config", "dist/server/wrangler.json", "--name", "count-it"]);
    const order = ["  guard();", 'run("pnpm", ["check"]);', 'run("pnpm", DEPLOY);', "await verify();"].map((step) => script.indexOf(step));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
