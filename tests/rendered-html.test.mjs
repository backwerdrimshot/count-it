import assert from "node:assert/strict";
import test from "node:test";

/* Renders the built Worker the way Cloudflare will, and asserts against the
   HTML a browser actually receives.

   This file exists because a source-level test could not catch the bug it was
   written for. The beacon was first added with next/script and `afterInteractive`,
   which renders no tag server-side at all: it arrives as a lazy client reference
   in the RSC flight payload and only becomes a script once React hydrates. A test
   that read app/layout.tsx saw a beacon. So did a substring search of the rendered
   HTML — the flight payload carries the src and the token as data. Only asking for
   a real <script> element tells the two apart. */
async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

/* The shop site's Worker injects this beacon in one place for every page it
   serves, and it does not serve this host. Nothing upstream notices if it goes.

   The token is written out literally rather than read from a constant. A
   wrong-but-present token is the failure that costs most: the beacon loads, the
   page looks right, nothing errors, and the views land in someone else's
   dashboard or nowhere at all. */
test("serves the analytics beacon as a real script element", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  const tag = html.match(/<script[^>]*cloudflareinsights[^>]*><\/script>/);
  assert.ok(tag, "the beacon must be a real script element in the served HTML");
  assert.match(tag[0], /src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"/);
  assert.match(tag[0], /4c76fa6f3023401899bbeb30fa4eebd3/);
  assert.match(tag[0], /type="module"/, "module scripts defer without blocking the parser");
});

/* The beacon reports pages. It must never become a route for what a student
   does — that distinction is the whole privacy claim, here and on the shop
   site's /privacy/. This fails if anyone widens the config beyond the token. */
test("the served beacon carries nothing but its token", async () => {
  const html = await (await render()).text();
  const tag = html.match(/<script[^>]*cloudflareinsights[^>]*><\/script>/);
  assert.ok(tag, "the beacon must be a real script element in the served HTML");
  const config = tag[0].match(/data-cf-beacon=(?:'([^']*)'|"([^"]*)")/);
  assert.ok(config, "the served beacon must declare a data-cf-beacon config");
  const raw = (config[1] ?? config[2]).replace(/&quot;/g, '"');
  assert.deepEqual(JSON.parse(raw), { token: "4c76fa6f3023401899bbeb30fa4eebd3" });
});
