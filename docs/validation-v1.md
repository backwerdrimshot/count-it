# Practice controls V1 validation — 2026-10-11

Isolated checkout/branch: `codex/practice-settings-v1`, based on `7f5d7a867b6c7d241abaa7e12864c3055ba449b7`. Current main matched the supplied audit head at clone. Existing draft PR #65 (Program saved configurations) was left alone.

- PASS: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` (242 tests), `pnpm build`, `node --test tests/rendered-html.test.mjs` (9 tests), `git diff --check`.
- PASS: `tests/browser/settings.mjs` against local built app: tab arrow/Home focus, focus-popover Escape, immediate untouched changes, Cancel/Escape retaining questions/answers/settings, unchanged settings and guide retaining answers, Continue rebuilding, explicit setup/profile saving/reload/clear, assignment overrides (including omitted guide/profile defaults), saved records unchanged by assignments, clipboard absence selectable fallback and copied feedback, blocked setup storage feedback, 390px layout, no page errors.
- Existing headless acceptance: builder 20/20, catalog 31/31, notation 10/10, presets 19/19, teachers-link 19/19, trainer 39/39; meter-guard 13/15. Its two native-select ArrowUp checks fail in this macOS headless environment. Disabled-option states, playable choices and panel layout pass. Expectations were not weakened.
- Independent plain HTML native-select probe (no app or React): Home, ArrowDown, ArrowDown, Enter expected option C, retained A. Reproduced with installed headless shell and full Chromium running headlessly. Recheck those native select keys on a supported QA environment before release. Custom tab keys and modal/popover focus/Escape pass locally.
- Existing build warnings: client chunks over 500kB; vinext route classification reported Unknown. Build completed successfully.

No manual/foreground browser used; analytics blocked in test contexts. No merge or deployment. No changes to rhythm/question/assignment modules, storage key strings or published seeded assignment fixtures. Build/served manifest updated together to 2026-10-11. Public guide patch verified with `git apply --cached --check` at owning repo `backwerd-rhythm-shop-site@94fa68772f73e0790eacde9864ef6cdad92a1efc`; it is prepared, not published.

## Independent-review follow-up

The No Help starting point now applies `preset.state.guide` instead of always enabling the guide. The expanded headless regression compares all three advertised starting points with the published-link fixture: rhythm pool, scope, 4/4 meter, checkbox/rendered guide state, retained Eastman profile, and Cancel preserving the answered challenge and settings. Build and served manifest advanced together to 2026-10-11.1; guide patch wording matches each preset policy.

PASS after the independent-review fixes: lint, TypeScript, full unit suite, production build, rendered-HTML suite, diff whitespace check and expanded headless settings regression. Native-select keyboard limitation remains unchanged.
