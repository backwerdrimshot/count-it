import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

/* The shop site injects this beacon from its Worker, in one place, for every
   page it serves — but it does not serve this host. count-it.backwerdrhythmshop.com
   is its own deployment, so the tag lives in this repo and nothing upstream will
   notice if it goes missing. That is what this file is for.

   The token is deliberately asserted literally rather than read from a constant.
   A wrong-but-present token is the failure that costs the most: the beacon loads,
   the page looks correct, nothing errors, and the views land in someone else's
   dashboard or none at all. Only a literal catches that. */
const SITE_TOKEN = "4c76fa6f3023401899bbeb30fa4eebd3";

describe("the analytics beacon", () => {
  it("is present, with the shared site token", () => {
    expect(layout).toContain("static.cloudflareinsights.com/beacon.min.js");
    expect(layout).toContain(SITE_TOKEN);
  });

  it("stays in the body, after the app's own children", () => {
    // Analytics is the last thing that should compete for the main thread. If a
    // refactor hoists this into <head>, it starts fetching ahead of the app.
    // next/script's `afterInteractive` says the same thing, but the strategy is
    // a prop someone can change; the position is structural.
    const beacon = layout.indexOf("cloudflareinsights");
    expect(beacon).toBeGreaterThan(layout.indexOf("{children}"));
    expect(beacon).toBeGreaterThan(layout.indexOf("</head>"));
  });
});

/* The beacon reports pages. It must never become a route for what a student
   does — that distinction is the whole privacy claim, both here and on the shop
   site's /privacy/. This fails if anyone wires app state into the tag. */
describe("the beacon carries no app data", () => {
  it("passes nothing but the token", () => {
    // Slice the <Script> element itself. Searching the whole file would find
    // this attribute wherever it sat, including inside the JSON-LD block in
    // <head>, and pass without ever reading the beacon.
    const start = layout.indexOf("<Script");
    expect(start).toBeGreaterThan(-1);
    const tag = layout.slice(start, layout.indexOf("/>", start) + 2);
    expect(tag).toContain("cloudflareinsights");
    const config = tag.match(/data-cf-beacon='([^']*)'/)?.[1];
    expect(config).toBeDefined();
    expect(JSON.parse(config!)).toEqual({ token: SITE_TOKEN });
  });
});
