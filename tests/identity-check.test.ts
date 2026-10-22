import { describe, expect, it } from "vitest";
import { checkIdentity, checkAssignmentIdentity } from "../src/identity-check";
describe("names-free builder check", () => {
  it.each(["Step 3 pulse", "Band 2 period 3", "", "2nd period"])("passes %s", (text) => expect(checkIdentity(text).verdict).toBe("ok"));
  it.each(["Ava Rodriguez", "Garcia, Maria", "ava@example.com", "555-123-4567"])("warns on %s", (text) => expect(checkIdentity(text).verdict).toBe("warn"));
  it.each(["ID 12345", "123-45-6789", "student id 44", "1234567"])("blocks %s", (text) => expect(checkIdentity(text).verdict).toBe("block"));
});

const cases = {"ok": ["Snare 2", "Band 2 period 3", "Class 1234", "Class A1234", "identity1234", "sideline1234", "A1234", "4B-SPRING", ""], "warn": ["555-123-4567", "5551234567", "555-123-4567 and 555-234-5678", "Ava Rodriguez", "ava@example.com"], "block": ["ID1234", "SID1234", "studentid44", "student ID1234", "IDno1234", "IDnumber1234", "Student ID: #1234", "Student ID No.: 1234", "SID: #1234", "student number 1234", "student number: 1234", "student no. 1234", "student # 1234", "ID A1234", "ID: A1234B", "12341 555-123-4567", "555-123-4567 12341 555-234-5678", "12345 call 555-123-4567", "555-123-4567 then 12345", "555-123-4567 12345 555-234-5678", "555-123-4567 555-234-5678 12345", "ID 5551234567", "123-45-6789 call 555-123-4567", "555-123-4567 1234567890123", "12345,555-123-4567"]};
for (const [verdict, values] of Object.entries(cases)) {
  it.each(values)(`${verdict}: %s`, text => expect(checkIdentity(text).verdict).toBe(verdict));
}
it("checks decoded reopened and duplicate outbound name/class values", () => {
  for (const key of ["a", "class"]) {
    const link = `https://example.test/?${key}=Snare&${key}=${encodeURIComponent("12345 call 555-123-4567")}`;
    expect(checkAssignmentIdentity(link).verdict).toBe("block");
  }
  expect(checkAssignmentIdentity("/?a=Snare", "ID 44").verdict).toBe("block");
  expect(checkAssignmentIdentity("/?a=Ava%20Rodriguez").verdict).toBe("warn");
  for (const name of ["Snare 2", "12345 call 555-123-4567", "Band 2"]) {
    expect(checkAssignmentIdentity("/?a=" + encodeURIComponent(name)).verdict).toBe(checkIdentity(name).verdict);
  }
});

it.each(["Student ID: #1234", "student number 1234", "student # 1234", "ID A1234"])("blocks reopened marker %s", text => {
  expect(checkAssignmentIdentity("/?a=" + encodeURIComponent(text)).verdict).toBe("block");
});
