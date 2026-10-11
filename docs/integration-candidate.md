# Local length and result-image integration

This local candidate combines Count It PR 70 at b19a690bde1c101e0536296b1de7f094358f63ef and PR 71 at 18bd00520e79ec8827459e5961a0b2df5fbbd922, based on released main fbfb44e60d5b57b755c0c9b927b4ea90cce5ee9b. App code composed automatically; README descriptions were combined and the capability stamp is 2026-10-11.3. The independent embed change is excluded.

Local validation on the combined code passed lint, TypeScript, 250 unit tests, nine rendered checks and the production build. Against that build, practice-length.mjs, result-image.mjs and settings.mjs all passed using the installed Chromium headless shell. These cover capacity fallback, answered-round cancellation, opt-in persistence, explicit and legacy assignment overrides, tabs/focus/Escape, selectable clipboard fallback, accessible copy feedback, genuine PNG bytes and dimensions, identical download bytes, unchanged result score/code and phone overflow.

Clipboard writes are mocked in automated browser coverage. Actual operating-system clipboard paste, external app paste and Safari/Firefox behavior remain untested. No foreground browser was used for this integration. No merge, deployment, push or extra remote workflow belongs to this local candidate; release remains held pending the parent’s homepage-first coordination.

Both guide patches remain separate reviewable additions for the verified guide owner backwerdrimshot/backwerd-rhythm-shop-site. No guide-owner files are changed by this candidate.
