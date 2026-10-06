# Browser checks

Seven scripts that drive a real Chromium against a running Count It. They cover what the unit and rendered-HTML tests cannot: layout at real widths, focus order, the clipboard, a round played through to its result card, and the links a teacher actually clicks.

They are **not part of `pnpm check` and not run in CI**. Whether to run a browser in CI is an open decision; until it is made, run them by hand before a release that changes a page or the header, and after a deploy.

## Run

```sh
pnpm build && pnpm test:browser                 # all checks, against a server the runner starts and stops
pnpm test:browser catalog notation              # only those files
BASE_URL=https://count-it.backwerdrhythmshop.com pnpm test:browser    # a running copy; nothing is started
```

Each file prints `PASS`/`FAIL` per check and a tally, and exits non-zero on any failure; the runner exits non-zero if any file failed.

| Variable | What it does |
| --- | --- |
| `BASE_URL` | The app under test. Unset: the runner serves `dist/` with `vinext start`. |
| `CHROMIUM_PATH` | A Chromium or Chrome binary. `playwright-core` downloads none; defaults to `/opt/pw-browsers/chromium` when that exists. |
| `ROUTE_VIA_NODE=1` | For an `https` target behind a proxy whose CA Chromium does not trust: Node fetches the page and hands it to the browser. Redirects are passed through, not followed. |
| `SHOTS_DIR` | Write screenshots there. Unset: none are taken. |

Analytics (`counter.backwerdrhythmshop.com`, Cloudflare Insights) is blocked in every context, so a run never counts as a visitor, even against the live site.

**Known limit of `ROUTE_VIA_NODE=1`.** Chromium re-requests a redirect's target outside the route, so a check that needs the browser to *follow* a redirect fails with `ERR_CERT_AUTHORITY_INVALID`. Today that is only the last check in `builder.mjs` (`/build/` with a trailing slash), and because it is last, every check before it still runs and reports. Run that file against a local build, where it passes, or against the live site from a machine whose browser trusts the connection. The redirect itself can be confirmed without a browser: `curl -sI https://count-it.backwerdrhythmshop.com/build/` answers `308` with `location: /build`.

## What each file checks

| File | Covers |
| --- | --- |
| `trainer.mjs` | A 2/4 measure challenge answered by keyboard shortcut, an assigned 7/4 link, a refused link (a whole note in 3/4), a legacy link with no meter, phone width. |
| `presets.mjs` | Each step in the builder's menu opens the same first question as the link the shop site publishes for it. |
| `builder.mjs` | The link the builder makes, Copy, the quiz setting, refusals in plain words, routes to and from the app. |
| `meter-guard.mjs` | A choice that cannot make a round is greyed out with the reason, never offered. |
| `catalog.mjs` | `/assignments`: sixteen steps, their links, Copy, a step played from the catalog to its result, the finished count. |
| `notation.mjs` | `/notation`: the seven topics, every example staff drawn, the one-beat example without a closing barline and every measure example with one (as the page says), the contents links, phone width. |
| `teachers-link.mjs` | The **For teachers** link: visible, in the viewport, 44px tall, reachable by Tab before Help, absent below 480px. |

## Keeping them true

- Published step links come from `tests/fixtures/published-links.ts`, the same file the unit tests hold verbatim. When the shop site's sequence pages change, that file changes first and both kinds of test follow.
- Some checks count things on purpose (sixteen catalog steps, five meters, seven notation topics). When the catalog or the topics change on purpose, update the number in the check in the same change.
- To add a check file: `import { launch, BASE, reporter, shot } from "./harness.mjs"`, open contexts with `browser.newContext(...)` (the harness adds the analytics block and the Node routing), and finish with `process.exit(failed ? 1 : 0)` or `finish()`. The runner picks up any other `.mjs` in this folder.

## What these do not cover

Real phones, tablets and screen readers. Every check is an automated Chromium session, so a pass is evidence about layout and behavior in that browser, not a statement that the app has been tested on devices or with assistive technology.
