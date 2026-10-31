# Names-free check

Count It checks teacher-typed text for student names, contact details and ID numbers before it goes into a shareable link. The check itself is shared with other Backwerd Rhythm Shop apps and vendored here; the assignment-link wrapper is Count It's own.

- **Package:** `identity-check` 0.1.0, from [`backwerdrimshot/brs-apps`](https://github.com/backwerdrimshot/brs-apps) `packages/identity-check`.
- **Files here:** `src/vendor/identity-check.mjs` and `src/vendor/identity-check.d.mts`, copied byte for byte. Do not edit them in this repo.
- **Stays in Count It:** `checkAssignmentIdentity` in `src/identity-check.ts`, which reads Count It's own query parameters (`a`, `class`).
- **Policy and tests:** `docs/explicit-identifier-policy.md` and `tests/fixtures/` are unchanged, and `tests/identity-check.test.ts` runs against the vendored module.

## Checking for drift

From a checkout of brs-apps:

```sh
node packages/identity-check/scripts/check-consumer.mjs <path-to-this-repo>
```

The report is read-only. Both files should read `match`. A `differs` line means the copy was edited here or the package moved on.

## Changing the check

Change it in the package, then copy the new `.mjs` and `.d.mts` files here in one pull request. A change to what counts as `block`, `warn` or `ok` also changes the fixture and the policy document, in every app.

## Rollback

Revert the adoption commit. The previous implementation is in git history.
