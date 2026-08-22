import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

/* Whether the beacon reaches a browser is settled in tests/rendered-html.test.mjs,
   against the HTML the built Worker actually serves. That is the authoritative
   check, and it is there rather than here because this file cannot tell a served
   tag from one the framework serialized and never rendered — which is exactly the
   bug that shipped in the first draft of this change.
   
   What is left here is the one property the rendered HTML cannot show: where the
   tag sits in the source relative to the app. */
describe("the analytics beacon's place in the layout", () => {
  it("comes after the app's own children, not before them", () => {
    // Analytics is the last thing that should compete for the main thread. The
    // rendered test proves the tag is served; only the source shows it was
    // written after {children} rather than hoisted above the app or into <head>.
    const beacon = layout.indexOf("cloudflareinsights");
    expect(beacon).toBeGreaterThan(-1);
    expect(beacon).toBeGreaterThan(layout.indexOf("{children}"));
    expect(beacon).toBeGreaterThan(layout.indexOf("</head>"));
  });
});
