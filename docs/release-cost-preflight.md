# Count It coordinated release — bounded cost and dependency preflight

This is a fresh estimate for Count It only. It reuses none of website PR503's completed $0.70 ceiling or Eight Time's separate approval. No new hosted workflow, remote update, PR or deployment was triggered during this preflight. The root owner is consolidating one explicit cost approval before publication.

## Proposed bounded operation

One final Count It integration PR/update, one reviewed merge to main, one automatic deployment gated on the exact main commit's successful Validate run, and at most 30 total post-deploy HTTP smoke requests. No paid retries, runner upgrades, new plans, storage services or larger second assignment batch are included. If the release needs another publication cycle, or a separately metered provider/build unexpectedly starts, stop and report before extending this scope.

Known workflow side effects, from the checked-in YAML:

| Event | Jobs | Effect |
| --- | --- | --- |
| PR open/update | `Validate/check`, `README standard/validate` | Installs pinned dependencies; unit suite and build/render checks; README contract. No deploy. |
| Reviewed main push | Same two jobs | Revalidates final exact main SHA. |
| Main Validate completion | `Deploy to Cloudflare Workers/deploy` | Only on successful push-to-main Validate in this repository; checks out that exact SHA, reruns `pnpm check`, then deploys existing Worker `count-it`. Production environment approval may still pause the job. |

No workflow uploads build/test artifacts. The setup-node pnpm cache is existing. Read-only GitHub inventory confirms this repository is **public**, every configured runner is standard `ubuntu-latest`, and current cache usage is 215,575,892 bytes (one cache), well below the included 10 GB. Main's observed checks are only GitHub Actions `check`, `validate`, and `deploy`; no external Cloudflare Builds check appears for the current main SHA. The repository says the prior dashboard Git integration was replaced, but this does not independently prove every dashboard setting.

## Dollar estimate and suggested ceiling

**New GitHub Actions runner cost: $0** for this public repository's standard runners, per [GitHub's current billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Larger runners are not included. Existing cache remains below the included allowance, and no artifact upload is added. The last main cycle took about 47 seconds Validate, 9 seconds README, and 62 seconds in the deploy job; that is evidence of the existing pipeline's scale, not a duration guarantee. Do not invent a paid CI requirement from the obsolete private-repository minute rate.

Cloudflare deployment reuses the existing Worker/custom domain and adds no account plan, D1, R2, KV or paid binding. [Static asset storage/requests have no added charge](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/); SSR requests follow existing Workers request/CPU billing.

For a deliberately conservative **30-request smoke ceiling**, price every request as paid dynamic execution at the documented maximum 300,000 CPU ms, even though the app's default is far lower: 30 × 300,000 = 9,000,000 CPU ms. At [$0.02 per million CPU ms plus $0.30 per million requests](https://developers.cloudflare.com/workers/platform/pricing/), this is $0.180009 before included usage. The [documented paid HTTP CPU maximum is five minutes](https://developers.cloudflare.com/workers/platform/limits/). Reserve **$0.25 for Count It's complete incremental release/smoke operation**, with expected actual marginal cost near $0. This ceiling covers the planned requests under standard published pricing; it does not authorize a new subscription, enterprise contract change, paid external build service, uncontrolled public traffic or extra release attempts. Stop rather than expand if those assumptions differ.

Automatically configured code-review apps may also consume the owner's existing AI/review entitlement on a PR update; their account-specific billing is not exposed by this repository preflight. No additional paid review product or upgrade is proposed. Preserve the required exact-head review/checks; root should account for the existing review integration in the consolidated authorization.

## Exact-head and release readiness

Read-only `branches/main/protection` returns HTTP 404 / “Branch not protected”; no enforced protection configuration is claimed. The release must still manually require the expected `check` and `validate` results and an independent review of the final exact head. Main's current check/deploy run IDs are 39547252391 / 39547329478, with README run 39547252313; all succeeded on `15e701cac75d2b37f1451a678637ad55976bd93b`.

Minimum chain for morning availability:

1. Final combined local commit and independent exact-head review; local regression checks clear.
2. Root's consolidated cost authorization; publish the chosen app integration branch/PR, wait for its exact-head checks/review. Choose one owner/path to avoid deploying PR88 and this combined candidate twice.
3. Merge that reviewed app commit; wait for main's exact-SHA Validate and gated `count-it` deployment.
4. Verify served build and `responseVocabularies` contains `eighths-v1`, then smoke the new launch and an original legacy link within the request cap.
5. Website owner publishes the new beginner path as the clear entry only after that live capability check, preserving original Assignment 1 URLs/seeds and labeling its two-cell repetition honestly.

There is no new unresolved educator-design approval for the already-approved beginner path. Actual remaining gates are final runtime/browser evidence, remote exact-head checks/review, the consolidated cost decision, app deployment and dependent website integration. Morning availability is achievable as a target; a future CI/deploy/environment failure cannot be guaranteed away. The three proposed repairs are not on this critical path and remain documentation/test evidence only.
