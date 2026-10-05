/* Runs the browser checks one after another against a Count It server.

     pnpm build && pnpm test:browser            all checks, against a server this starts
     pnpm test:browser catalog notation         only those files
     BASE_URL=https://count-it.backwerdrhythmshop.com pnpm test:browser
                                                against a running copy; nothing is started

   Exits non-zero if any check file fails. See README.md in this folder. */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createServer } from "node:net";

const HERE = new URL("./", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const SKIP = new Set(["harness.mjs", "run.mjs"]);

const all = readdirSync(HERE).filter((f) => f.endsWith(".mjs") && !SKIP.has(f)).sort();
const wanted = process.argv.slice(2).map((name) => name.replace(/\.mjs$/, ""));
const unknown = wanted.filter((name) => !all.includes(`${name}.mjs`));
if (unknown.length) {
  console.error(`No such check: ${unknown.join(", ")}. Available: ${all.map((f) => f.replace(/\.mjs$/, "")).join(", ")}`);
  process.exit(2);
}
const files = wanted.length ? wanted.map((name) => `${name}.mjs`) : all;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitFor(url, ms = 60000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`${url} did not come up within ${ms / 1000}s`);
}

const run = (file, env) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [new URL(file, HERE).pathname], { stdio: "inherit", env });
    child.on("exit", (code) => resolve(code ?? 1));
  });

let server;
/* `pnpm exec` starts the server as a grandchild, so stop the whole group. */
const stop = () => {
  if (server?.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* already gone */
    }
  }
};
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));
let baseUrl = process.env.BASE_URL || process.env.BASE;
if (!baseUrl) {
  if (!existsSync(new URL("dist/server/index.js", ROOT))) {
    console.error("No build to serve. Run `pnpm build` first, or set BASE_URL to a running Count It.");
    process.exit(2);
  }
  const port = await freePort();
  server = spawn("pnpm", ["exec", "vinext", "start", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: ROOT.pathname,
    stdio: "ignore",
    detached: true,
  });
  baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitFor(baseUrl);
  } catch (error) {
    console.error(String(error.message));
    process.exit(2);
  }
  console.log(`Serving the build at ${baseUrl}\n`);
}

const env = { ...process.env, BASE_URL: baseUrl };
const failed = [];
for (const file of files) {
  console.log(`\n=== ${file}`);
  if ((await run(file, env)) !== 0) failed.push(file);
}
console.log(failed.length ? `\nFAILED: ${failed.join(", ")}` : `\nAll ${files.length} browser check files passed.`);
process.exit(failed.length ? 1 : 0);
