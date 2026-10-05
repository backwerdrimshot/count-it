/* Shared set-up for the browser checks in this folder. They drive a real
   Chromium against a running Count It, which the unit and rendered-HTML tests
   cannot do: layout at real widths, focus order, clipboard, a round played
   through to its result card, the guide's links.

   They are NOT part of `pnpm check` or CI. See README.md in this folder. */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

/** The app under test. Set BASE_URL to point at a running copy (a dev server or
    the deployed site); `pnpm test:browser` starts its own when it is unset. */
export const BASE = (process.env.BASE_URL || process.env.BASE || "http://localhost:3000").replace(/\/$/, "");

const ANALYTICS = /counter\.backwerdrhythmshop\.com|cloudflareinsights\.com/;
const APP_ORIGIN = /^https:\/\/count-it\.backwerdrhythmshop\.com\//;

/* Node trusts a corporate or sandbox proxy's CA; headless Chromium may not.
   ROUTE_VIA_NODE=1 fetches the app's pages with Node and hands the response to
   the browser. maxRedirects: 0 lets a 308 reach the browser, so redirect
   behaviour is tested rather than hidden. Only used for https targets. */
const viaNode = async (route) => {
  try {
    const response = await route.fetch({ maxRedirects: 0 });
    await route.fulfill({ response });
  } catch (error) {
    console.log("route.fetch failed:", route.request().url(), String(error.message).split("\n")[0]);
    await route.abort();
  }
};

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  return existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
}

/* Every context the checks open gets the same two routes, so no check has to
   remember them: analytics is blocked (a test must never count as a visitor),
   and https pages can go through Node when asked. */
async function prepare(context) {
  await context.route(ANALYTICS, (route) => route.abort());
  if (BASE.startsWith("https://") && process.env.ROUTE_VIA_NODE === "1") await context.route(APP_ORIGIN, viaNode);
  return context;
}

/** Chromium, with `newContext` patched to prepare every context. */
export async function launch() {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chromiumPath() });
  } catch (error) {
    console.error(
      "Could not start Chromium. Set CHROMIUM_PATH to a Chromium or Chrome binary " +
        "(playwright-core does not download one).\n" + String(error.message).split("\n")[0],
    );
    process.exit(2);
  }
  const open = browser.newContext.bind(browser);
  browser.newContext = async (options) => prepare(await open(options));
  return browser;
}

/** Records a check and prints it. `finish` prints the tally and exits. */
export function reporter() {
  const results = [];
  const note = (name, ok, detail = "") => {
    results.push({ name, ok: Boolean(ok) });
    console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail ? "  — " + detail : ""));
  };
  const finish = () => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  };
  return { note, finish, results };
}

/** Page errors and app console errors, collected for one final check. */
export function collectErrors(errors, ignore = /favicon|ERR_|Failed to load resource/) {
  return (page) => {
    page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !ignore.test(message.text())) errors.push("console: " + message.text());
    });
  };
}

/** A screenshot, only when SHOTS_DIR is set (they are for a person to look at). */
export async function shot(target, name, options = {}) {
  if (!process.env.SHOTS_DIR) return;
  mkdirSync(process.env.SHOTS_DIR, { recursive: true });
  await target.screenshot({ path: `${process.env.SHOTS_DIR}/${name}`, ...options });
}

/* The links the shop site publishes, from the same fixture the unit tests hold
   verbatim, so a browser check and a unit test can never disagree about what
   "Step 3" is. Read as text: the fixture is TypeScript and Node >=22.13 does not
   strip types by default. */
const FIXTURE = new URL("../fixtures/published-links.ts", import.meta.url);
export function publishedLinks(sequence) {
  const source = readFileSync(FIXTURE, "utf8");
  const found = [...source.matchAll(new RegExp(`"(seq=${sequence}&[^"]+)"`, "g"))].map((m) => m[1]);
  if (!found.length) throw new Error(`no published links for ${sequence} in tests/fixtures/published-links.ts`);
  return found;
}
