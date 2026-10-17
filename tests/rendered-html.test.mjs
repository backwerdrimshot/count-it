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
async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
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

/* The pages other than the trainer. Each sets its own canonical, because the
   root layout names the trainer's, which would ask search engines to treat a
   second page as a duplicate of the first. */
/* The email addresses are plain mailto anchors in the Feedback dialog, so they work with no
   JavaScript. The footer shows only the two forms, so it carries no mailto link. */
test("the Feedback dialog carries the two plain email links, and the footer carries none", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const subject = (topic) => encodeURIComponent(`Count It — ${topic}`);
  const feedback = html.match(/<dialog id="workspace-feedback"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.match(feedback, new RegExp(`<a[^>]*href="mailto:support@backwerdrhythmshop\\.com\\?subject=${subject("problem report")}"[^>]*>Email support</a>`));
  assert.match(feedback, new RegExp(`<a[^>]*href="mailto:feedback@backwerdrhythmshop\\.com\\?subject=${subject("feature request")}"[^>]*>Email feedback</a>`));
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.ok(footer, "the footer is server-rendered");
  assert.doesNotMatch(footer, /mailto:/, "the footer shows only the two forms");
});

test("/build serves its own title and canonical", async () => {
  const response = await render("/build");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Build an assignment \| Count It<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/count-it\.backwerdrhythmshop\.com\/build"/);
});

test("/assignments serves every step as a card, with its own title and canonical", async () => {
  const response = await render("/assignments");
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("&amp;", "&");
  assert.match(html, /<title>Assignments \| Count It<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/count-it\.backwerdrhythmshop\.com\/assignments"/);
  assert.equal((html.match(/class="catalog-card"/g) ?? []).length, 16, "all sixteen published steps are in the server-rendered page");
  assert.equal((html.match(/href="\/build\?from=/g) ?? []).length, 13, "the thirteen steps the builder can make link to it");
  assert.match(html, /href="\/\?seq=counting-rhythms&step=3&/, "a Count It step opens its published link in this app");
  assert.match(html, /href="https:\/\/eight-time\.backwerdrhythmshop\.com\/\?seq=rhythms-in-three&step=4&/, "an Eight Time step opens in Eight Time");
});

test("/assignments does not claim what only the browser can know", async () => {
  /* How many times a student has finished a step lives in that browser's own
     storage. The server cannot read it, so its HTML must say nothing about it:
     "not finished" before the browser has looked would be a claim, not a default. */
  const html = await (await render("/assignments")).text();
  assert.doesNotMatch(html, /Not finished on this device/);
  assert.doesNotMatch(html, /Finished \d+ times? on this device/);
});

test("/notation serves its own title and canonical, and every topic", async () => {
  const response = await render("/notation");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Notation reference \| Count It<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/count-it\.backwerdrhythmshop\.com\/notation"/);
  for (const id of ["clef", "barlines", "time-signature", "beams", "rests", "held", "eighth-beat"]) {
    assert.match(html, new RegExp(`id="${id}"`), `topic ${id}`);
  }
});

test("the internal audit page navigates with a plain anchor", async () => {
  /* next/link throws on click under this vinext build; a plain anchor is the fix
     the other pages use. This keeps the audit page from quietly going back. */
  const html = await (await render("/notation-audit")).text();
  assert.match(html, /<a href="\/">Back to Count It<\/a>/);
});

test("the practice screen links teachers from the About dialog, and the header holds only Help, Feedback and About", async () => {
  /* For teachers moved out of the header into About, so the header nav holds the three buttons
     and nothing else. The footer also lists Assignments and Build an assignment. */
  const html = (await (await render("/")).text()).replace(/<!-- -->/g, "");
  const nav = html.match(/<nav class="workspace-actions"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.deepEqual([...nav.matchAll(/<button type="button" aria-label="([^"]+)"/g)].map((m) => m[1]), ["Help", "Feedback", "About"]);
  assert.doesNotMatch(nav, /For teachers/, "no teacher link in the header nav");
  const about = html.match(/<dialog id="workspace-about"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.match(about, /<a class="text-action" href="\/assignments">For teachers<\/a>/, "For teachers is in About");
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.match(footer, /<a class="foot-btn" href="\/assignments"/, "the footer lists Assignments");
});

test("the free-practice screen includes a concise, profile-aware reading scaffold", async () => {
  const html = await (await render("/")).text();
  assert.match(html, /A way to work it out/);
  assert.match(html, /Find the beat groups/);
  assert.match(html, /Rests and held notes do not begin a new count/);
  assert.match(html, /Use (?:<!--.*?-->)?Standard(?:<!--.*?-->)? counting/);
  assert.match(html, /before revealing it/);
});

/* The shop's header rule: Help, Feedback and About in one navigation labelled Help and app
   information, each with its name and a title, then the monogram last. */
test("the header has Help, Feedback and About, then the monogram last", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const header = html.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.ok(header, "the header is server-rendered");

  const nav = header.match(/<nav class="workspace-actions" aria-label="Help and app information">[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(nav, "Help, Feedback and About sit in one navigation labelled Help and app information");
  const buttons = [...nav.matchAll(/<button type="button" aria-label="([^"]+)" title="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(buttons, ["Help", "Feedback", "About"]);

  const monogram = '<a class="brs-home" href="https://backwerdrhythmshop.com/" aria-label="Backwerd Rhythm Shop home"><img src="/brs-monogram.svg" alt="" width="28" height="28"/></a>';
  assert.ok(header.endsWith(`${monogram}</header>`), "the monogram is the last item in the header");
  assert.ok(header.indexOf("</nav>") < header.indexOf('class="brs-home"'), "the monogram comes after the nav");
});

/* The page footer, below the board: the social marks, then the two forms with Guide and
   All free apps, then the copyright and build. It is a page footer,
   not a block inside a dialog. */
test("the footer carries the social marks, the two forms, the guide and the copyright, in order", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.ok(footer, "the footer is server-rendered");
  const about = html.match(/<dialog id="workspace-about"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.equal(about.includes("site-footer"), false, "the footer is not hidden inside the About dialog");

  const formSupport = 'href="https://docs.google.com/forms/d/e/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg/viewform"';
  const formFeedback = 'href="https://docs.google.com/forms/d/e/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg/viewform"';
  const guide = 'href="https://guides.backwerdrhythmshop.com/count-it/">Guide</a>';
  const allApps = 'href="https://apps.backwerdrhythmshop.com/">All free apps</a>';
  const copyright = "© 2026 Backwerd Rimshot, LLC. All rights reserved.";

  const steps = [
    'aria-label="Backwerd Rhythm Shop on Facebook"',
    'aria-label="Backwerd Rhythm Shop on Instagram"',
    'aria-label="Backwerd Rhythm Shop on YouTube"',
    formSupport,
    formFeedback,
    guide,
    allApps,
    copyright,
  ];
  let at = -1;
  for (const step of steps) {
    const found = footer.indexOf(step);
    assert.ok(found > -1, `the footer has ${step}`);
    assert.ok(found > at, `${step} comes in the footer's order`);
    at = found;
  }
  assert.match(footer.slice(at), /Build \d{4}-\d{2}-\d{2}/, "the build stamp follows the copyright");

  const marks = footer.match(/<a class="foot-ico"[\s\S]*?<\/a>/g) ?? [];
  assert.equal(marks.length, 3, "three social marks");
  for (const mark of marks) assert.match(mark, /width="16" height="16"/, "each social mark is 16px");
});

/* About: the app's build, More apps, the guide, and the copyright. No support links: those
   live in the footer and the Feedback dialog. */
test("About has the More apps link, the guide, the build and the copyright, and no support links", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const about = html.match(/<dialog id="workspace-about"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.ok(about, "the About dialog is server-rendered");
  assert.match(about, /<a class="text-action" href="https:\/\/apps\.backwerdrhythmshop\.com\/">More apps<\/a>/);
  assert.match(about, /<a class="text-action" href="https:\/\/guides\.backwerdrhythmshop\.com\/count-it\/">Guide<\/a>/);
  assert.match(about, /Build <span class="build-id">\d{4}-\d{2}-\d{2}(?:\.\d+)?<\/span>/);
  assert.match(about, /© 2026 Backwerd Rimshot, LLC\. All rights reserved\./);
  assert.doesNotMatch(about, /mailto:|docs\.google\.com|Report a problem|Request a feature/, "support links are not in About");
});

/* Feedback holds the two forms and the two email links. Help holds the help text and the
   guide, and no support links. */
test("Feedback has the two forms and two email links; Help has the guide and no support links", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const feedback = html.match(/<dialog id="workspace-feedback"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.ok(feedback, "the Feedback dialog is server-rendered");
  assert.match(feedback, /href="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg\/viewform"[^>]*>Report a problem</);
  assert.match(feedback, /href="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg\/viewform"[^>]*>Request a feature</);
  assert.match(feedback, /href="mailto:support@backwerdrhythmshop\.com\?subject=Count%20It%20%E2%80%94%20problem%20report">Email support</);
  assert.match(feedback, /href="mailto:feedback@backwerdrhythmshop\.com\?subject=Count%20It%20%E2%80%94%20feature%20request">Email feedback</);

  const help = html.match(/<dialog id="workspace-help"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.match(help, /Read the full guide/, "Help links to the guide");
  assert.doesNotMatch(help, /mailto:|docs\.google\.com|Report a problem|Request a feature/, "Help holds help and the guide only");
});

/* The secondary pages share the practice screen's header and footer: the same Help, Feedback
   and About buttons and the same forms and email links. */
test("/build, /assignments and /notation carry the same header nav and footer forms as the practice screen", async () => {
  for (const path of ["/build", "/assignments", "/notation"]) {
    const html = (await (await render(path)).text()).replace(/<!-- -->/g, "");
    const nav = html.match(/<nav class="workspace-actions" aria-label="Help and app information">[\s\S]*?<\/nav>/)?.[0] ?? "";
    const buttons = [...nav.matchAll(/<button type="button" aria-label="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(buttons, ["Help", "Feedback", "About"], `${path} has Help, Feedback and About`);
    const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
    assert.match(footer, /href="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg\/viewform"[^>]*>Report a problem</, `${path} footer has the problem form`);
    assert.doesNotMatch(footer, /mailto:/, `${path} footer shows only the two forms`);
  }
});

test("the practice screen's settings help row has the guide and More apps, and no support links", async () => {
  const html = (await (await render()).text()).replace(/<!-- -->/g, "");
  const settingsHelp = html.match(/<nav class="setup-help"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(settingsHelp, "the settings help row is server-rendered");
  assert.doesNotMatch(settingsHelp, /mailto:|docs\.google\.com/, "support links live in the footer and Feedback, not in settings");
  assert.match(settingsHelp, />More apps</);
});
