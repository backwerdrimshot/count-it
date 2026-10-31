#!/usr/bin/env node
/* Publish main by hand (the fallback), with the same gate the deploy workflow had.
 *
 *     pnpm release
 *
 * WHY THIS EXISTS. On 2026-09-30 the account's GitHub Actions minutes ran out,
 * and they are not coming back. No GitHub workflow starts for this account any
 * more, so a pull request shows no checks. Since 2026-10-31 a merge to main
 * publishes through Cloudflare Workers Builds instead (the README's Deployment
 * section records the settings); this script is the hand fallback.
 * `.github/workflows/workers.yml` used to deploy a green merge; this script
 * carries its guarantees, in the order it applied them:
 *
 *   1. The tree is exactly origin/main, fetched just now, with nothing
 *      uncommitted. The workflow deployed the commit CI had validated; a hand
 *      deploy otherwise publishes whatever the checkout happens to hold.
 *   2. `pnpm check` passes on that tree: the unit suite, then the build and the
 *      rendered-HTML tests. It is the workflow's own "Validate" step, and it
 *      leaves the dist/ that step 3 uploads.
 *   3. `wrangler deploy`, the workflow's own command. vinext writes
 *      dist/server/wrangler.json at build time; --name pins the Worker this
 *      deploys to. CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID come from
 *      the environment, or from a `wrangler login`; nothing is read from the
 *      repository.
 *   4. The live origin serves this build: /praxis-capabilities.json names it and
 *      the page's footer shows it. Not "the upload succeeded". The workflow never
 *      had this step.
 *
 * A KNOWN FLAKE IN STEP 2. tests/beginner-v1.test.ts exhausts every measure
 * across 100 seeds in one test, and on a slow machine that can pass vitest's
 * default 5 s timeout. It passes on a rerun. This script does not retry it, raise
 * the timeout or skip it: a failed gate stops the release, and you run
 * `pnpm release` again. If it keeps failing on a fast machine, that is a real
 * regression, not the flake.
 *
 * The tests cover the pure functions below (refusal, buildStamp, liveMatches) and
 * the order of the steps. The deploy and the live check have never been run. */
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const ORIGIN = "https://count-it.backwerdrhythmshop.com/";
export const CAPABILITIES_PATH = "praxis-capabilities.json";
// Where the build identifier is single-sourced; the footer, the manifest and the
// README all follow it (tests/capabilities.test.ts keeps them in step).
export const BUILD_SOURCE = "src/capabilities.ts";
export const DEPLOY = ["exec", "wrangler", "deploy", "--config", "dist/server/wrangler.json", "--name", "count-it"];
// About two minutes: the edge takes a few seconds to agree with itself.
export const ATTEMPTS = 12;
export const WAIT_MS = 10_000;

/** Why this tree must not be published, or null when it may be. */
export function refusal({ dirty, head, target, ahead, behind }) {
  if (dirty) return "the working tree has changes that are in no commit.";
  if (head === target) return null;
  if (ahead > 0 && behind > 0) return `this branch has diverged from main (${ahead} ahead, ${behind} behind).`;
  if (behind > 0) return `this branch is ${behind} commit(s) behind main; publishing it would take live work offline.`;
  return `this branch is ${ahead} commit(s) ahead of main: work main does not have.`;
}

/** The build identifier declared in src/capabilities.ts, or null. */
export function buildStamp(source) {
  return /export const COUNT_IT_BUILD = "(\d{4}-\d{2}-\d{2}(?:\.\d+)?)"/.exec(source)?.[1] ?? null;
}

/** Whether the live origin is serving this build: the manifest names it and the
 *  page footer shows it. React may put a comment between "Build " and the stamp. */
export function liveMatches({ version, page }, { stamp }) {
  if (!stamp || version !== stamp) return false;
  return new RegExp(`Build (?:<!-- -->)?${stamp.replace(/\./g, "\\.")}(?![\\d.])`).test(page);
}

const root = new URL("../", import.meta.url);
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nRelease stopped: ${command} ${args.join(" ")} failed. Nothing further was published.`);
    process.exit(result.status ?? 1);
  }
}

function guard() {
  const dirty = git("status", "--porcelain") !== "";
  git("fetch", "--quiet", "origin", "main");
  const head = git("rev-parse", "HEAD");
  const target = git("rev-parse", "origin/main");
  const ahead = Number(git("rev-list", "--count", `${target}..${head}`));
  const behind = Number(git("rev-list", "--count", `${head}..${target}`));
  const reason = refusal({ dirty, head, target, ahead, behind });
  if (reason) {
    console.error(`\nRefusing to release: ${reason}`);
    console.error("Release what main says:  git checkout --detach origin/main && pnpm release\n");
    process.exit(1);
  }
  console.log(`release guard  ok: origin/main at ${head.slice(0, 12)}, tree clean`);
}

async function live() {
  const bust = `?release=${Date.now()}`;
  const [capabilities, page] = await Promise.all([
    fetch(new URL(CAPABILITIES_PATH + bust, ORIGIN), { cache: "no-store" }).then((r) => r.json()),
    fetch(new URL(bust, ORIGIN), { cache: "no-store" }).then((r) => r.text()),
  ]);
  return { version: capabilities.version, page };
}

async function verify() {
  const stamp = buildStamp(await readFile(new URL(BUILD_SOURCE, root), "utf8"));
  if (!stamp) {
    console.error(`\nCould not read COUNT_IT_BUILD from ${BUILD_SOURCE}, so the live check has nothing to compare.`);
    process.exit(1);
  }
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const served = await live().catch(() => ({ version: "unreachable", page: "" }));
    if (liveMatches(served, { stamp })) {
      console.log(`\nLive: ${ORIGIN} serves build ${stamp} (manifest and footer).`);
      return;
    }
    console.log(`  waiting for the edge (${attempt}/${ATTEMPTS}): live manifest says ${served.version}, want ${stamp}`);
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
  console.error(`\nThe deploy finished but ${ORIGIN} is not serving build ${stamp} after two minutes. Check the live footer.`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  guard();
  run("pnpm", ["check"]);
  run("pnpm", DEPLOY);
  await verify();
}
