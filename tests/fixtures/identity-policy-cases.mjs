/** Build the same explicit-identifier cases for Node and real browser contexts.
 * @param {Record<string, string[]>} policy
 * @returns {Array<[string, string]>}
 */
export function identityPolicyCases(policy) {
  /** @type {Array<[string, string]>} */
  const cases = [];
  const add = (text, verdict) => cases.push([text, verdict]);
  for (const verdict of ["ok", "warn", "block"]) for (const text of policy[verdict]) add(text, verdict);
  for (const marker of policy.numericMarkers) for (const value of policy.numericValues) for (const suffix of policy.suffixes) add(marker + value + suffix, "block");
  for (const prefix of policy.overlapPrefixes) for (const marker of policy.numericMarkers) for (const value of policy.numericValues) for (const suffix of policy.suffixes) add(prefix + marker + value + suffix, "block");
  for (const marker of policy.separatedMarkers) for (const value of policy.alphanumericValues) for (const suffix of policy.suffixes) add(marker + value + suffix, "block");
  for (const prefix of policy.leftBoundaryBlockPrefixes) add(prefix + "ID1234_ABC", "block");
  for (const prefix of policy.leftBoundaryAllowPrefixes) add(prefix + "ID 1234", "ok");
  for (const value of ["ID 1234_ABC", "ID A1234_B", "ID α1234", "ID １２３４_alpha", "ID ١٢٣٤_alpha", "student#1234_"]) {
    for (const text of [value + " call 555-123-4567", "555-123-4567 " + value, "555-123-4567 " + value + " 555-234-5678"]) add(text, "block");
  }
  for (const text of policy.unicodeOk) add(text, "ok");
  for (const text of policy.unicodeBlock) add(text, "block");
  for (const prefix of policy.qualifierPrefixes) {
    for (const word of policy.compactQualifierWords) add(prefix + word, "ok");
    for (const value of policy.compactQualifierValues) add(prefix + value, "block");
    for (const separator of policy.qualifierSeparators) for (const word of policy.compactQualifierWords) add(prefix + separator + word, "block");
  }
  return cases;
}
