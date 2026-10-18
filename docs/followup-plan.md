# Future shared Count It shell (planning only)

Taylor deferred implementation. This V1 patch keeps two apps and engines.

## Observed boundaries

Both are React 19.2.6 / Next 16.2.6 / vinext 0.2.1 / Vite 8 apps, built with the Cloudflare Vite plugin into distinct Workers, with separate `.openai/hosting.json` project IDs. Both use the same practice/challenge pattern, modal help/about, notation, counting-profile preference format, deterministic questions and URL assignments. Those similarities support a consistent home and navigation shell.

Count It supports quarter-note beats in 2/4, 3/4, 4/4, 5/4 and 7/4, spanning values, adjustable beat/measure scope, builder/catalog, workshop, history and playback. Its routes are `/`, `/assignments`, `/build`, `/history`, `/notation`, `/notation-audit`, `/workshop`. Eight Time supports complete eighth-note-meter measures in 3/8, 5/8, 6/8, 7/8, 9/8 and 12/8 with grouped or individually numbered eighths; its routes are `/` and `/notation-audit`. The four eighth-unit cells, variable beat grouping, beaming and compound syllables are not Count It's quarter-unit model.

The apps' parsers, defaults, cell IDs, legacy meter omission, canonical assignment/history keys, choice variants and seeded rounds are distinct contracts. Count It's Worker also adds Program framing CSP; Eight Time does not have that policy. A runtime merge must preserve it intentionally. Neither app has D1/R2 bindings configured for user data.

## Phased path

1. A Count It family home with direct mode/app links and consistent help/settings can ship independently while keeping both existing origins and all published assignment links. Share design language first; do not extract a new engine in this patch.
2. If later approved, prototype a single shell with namespaced routes (`/count-it`, `/eight-time`) and separate existing parsers/renderers. Carry complete query strings into the selected app. Capture golden fixtures for every published/legacy link, every counting profile and both apps' absent-meter defaults before moving code. Validate result schema, retry/held feedback, count/goal, choice variant, verification and Program messaging/framing.
3. Treat a single origin/full runtime migration as a separate decision. Keep old URLs serving their original compatible app or explicitly route them to the right namespaced parser without losing queries; do not blindly redirect both `/` paths to a new default mode. Plan assets, manifests/service-worker scope if later introduced, notation audit routes, worker/CSP behavior and support/build stamps.
4. Local storage belongs to the full origin. `count-it.backwerdrhythmshop.com` and `eight-time.backwerdrhythmshop.com` do not automatically share saved settings, bests, history or attempt/device identifiers. A new origin starts with none of those records. Preserve existing keys and app namespaces if sharing an origin; any preference migration requires an explicit, reviewed transfer/export approach, not guessed access to another subdomain. Decide whether profiles remain per-app or whether an opt-in shared default is wanted; assignments always win.

No account, SSO, gradebook or mastery claim is needed for any phase.

## Separate pedagogical follow-up

Review printable worksheets and new active-response modes (spoken count, tap/place a count, rhythm writing) as teaching designs before building. Specify accessibility, feedback timing, silent rests/held notes, compound grouping, assessment/evidence limits and deterministic replay. Prototype unscored practice first and test with teachers; preserve current assignment/result contracts unless a separately versioned format is approved.
