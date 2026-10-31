export type IdentityVerdict = { verdict: "ok" | "warn" | "block"; message: string };
export const IDENTITY_HINT: string;
export function checkIdentity(value: unknown): IdentityVerdict;
/** Checks every string `name` field anywhere in a nested payload; returns the worst verdict. */
export function checkNames(payload: unknown): IdentityVerdict;
