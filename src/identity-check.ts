import { checkIdentity, IDENTITY_HINT, type IdentityVerdict } from "./vendor/identity-check.mjs";
export { checkIdentity, IDENTITY_HINT };
export type { IdentityVerdict };

/** Check the actual outbound configuration, including reopened query values. */
export function checkAssignmentIdentity(link: string, name = ""): IdentityVerdict {
  const query = new URL(link, "https://count-it.backwerdrhythmshop.com").searchParams;
  const checks = [name, ...query.getAll("a"), ...query.getAll("class")].map(checkIdentity);
  return checks.find(check => check.verdict === "block")
    ?? checks.find(check => check.verdict === "warn") ?? checks[0];
}
