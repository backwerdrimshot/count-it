import { describe, expect, it } from "vitest";
import { checkIdentity } from "../src/identity-check";
describe("names-free builder check", () => {
  it.each(["Step 3 pulse", "Band 2 period 3", "", "2nd period"])("passes %s", (text) => expect(checkIdentity(text).verdict).toBe("ok"));
  it.each(["Ava Rodriguez", "Garcia, Maria", "ava@example.com", "555-123-4567"])("warns on %s", (text) => expect(checkIdentity(text).verdict).toBe("warn"));
  it.each(["ID 12345", "123-45-6789", "student id 44", "1234567"])("blocks %s", (text) => expect(checkIdentity(text).verdict).toBe("block"));
});
