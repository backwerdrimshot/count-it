import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  FALLBACK_MAILTO,
  FORMS_NOTE,
  FORMS_NOTE_FOOTER,
  SHOP_EMAIL,
  SHOP_FORMS,
  emailHref,
  hasForm,
  requestBase,
  requestHref,
  type RequestForm,
  type RequestKind,
} from "../src/support-links";

const SETUP = "https://count-it.example/?meter=4-4&key=C · build 2026-10-11.3";

// Both request forms are Google Forms' public viewer addresses, each with the two
// entry fields a pre-filled link writes into. A pasted edit URL (…/edit) would
// send a student to the form owner's screen instead.
const FORM_VIEWER = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/;

describe("the shop's request forms", () => {
  it("are the two Google Forms viewers, each with its app and setup entry fields", () => {
    expect(SHOP_FORMS.support).toEqual({
      base: "https://docs.google.com/forms/d/e/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg/viewform",
      appEntry: "entry.588933919",
      setupEntry: "entry.1893079260",
    });
    expect(SHOP_FORMS.feedback).toEqual({
      base: "https://docs.google.com/forms/d/e/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg/viewform",
      appEntry: "entry.2020831353",
      setupEntry: "entry.1906602408",
    });
    for (const kind of ["support", "feedback"] as RequestKind[]) {
      expect(SHOP_FORMS[kind]!.base).toMatch(FORM_VIEWER);
    }
  });
});

// The shop's privacy policy says the two forms are for teachers and adults only.
describe("the notice beside the forms", () => {
  it("tells students to tell their teacher instead", () => {
    expect(FORMS_NOTE).toBe("The forms are for teachers and adults. Students, please tell your teacher instead.");
    expect(FORMS_NOTE_FOOTER).toBe(
      "The problem and feature forms are for teachers and adults. Students, please tell your teacher instead.",
    );
  });
});

describe("a request link before it is followed", () => {
  it("shows the plain form address, so it works without JavaScript", () => {
    expect(requestBase("support")).toBe(SHOP_FORMS.support!.base);
    expect(requestBase("feedback")).toBe(SHOP_FORMS.feedback!.base);
    expect(hasForm("support")).toBe(true);
    expect(hasForm("feedback")).toBe(true);
  });
});

describe("a followed request link", () => {
  it("opens its form with usp, the app name and the setup filled in", () => {
    expect(APP_NAME).toBe("Count It");
    for (const kind of ["support", "feedback"] as RequestKind[]) {
      const form = SHOP_FORMS[kind]!;
      const url = new URL(requestHref(kind, SETUP));
      expect(`${url.origin}${url.pathname}`).toBe(form.base);
      expect([...url.searchParams.keys()]).toEqual(["usp", form.appEntry, form.setupEntry]);
      expect(url.searchParams.get("usp")).toBe("pp_url");
      expect(url.searchParams.get(form.appEntry)).toBe("Count It");
      // The setup keeps its & and = intact.
      expect(url.searchParams.get(form.setupEntry)).toBe(SETUP);
    }
  });
});

describe("the email fallback", () => {
  it("is used when a form is unset, with the shop address and no body prefilled", () => {
    const forms: Record<RequestKind, RequestForm | null> = { support: null, feedback: SHOP_FORMS.feedback };
    expect(hasForm("support", forms)).toBe(false);
    expect(requestBase("support", forms)).toBe(FALLBACK_MAILTO.support);
    expect(requestHref("support", SETUP, forms)).toBe(FALLBACK_MAILTO.support);
    expect(FALLBACK_MAILTO.support).toMatch(/^mailto:support@backwerdrhythmshop\.com\?subject=/);
    expect(new URL(FALLBACK_MAILTO.support).searchParams.has("body")).toBe(false);

    // The other form still opens.
    const feedback = new URL(requestHref("feedback", SETUP, forms));
    expect(`${feedback.origin}${feedback.pathname}`).toBe(SHOP_FORMS.feedback!.base);
  });

  it("is used when a form is not a Google Forms address or names a bad entry field", () => {
    const badAddress: Record<RequestKind, RequestForm | null> = {
      support: { ...SHOP_FORMS.support!, base: "https://example.com/forms/x" },
      feedback: null,
    };
    expect(requestHref("support", SETUP, badAddress)).toBe(FALLBACK_MAILTO.support);
    expect(requestBase("support", badAddress)).toBe(FALLBACK_MAILTO.support);

    const badEntry: Record<RequestKind, RequestForm | null> = {
      support: { ...SHOP_FORMS.support!, setupEntry: "entry.1&usp=x" },
      feedback: null,
    };
    expect(hasForm("support", badEntry)).toBe(false);
    expect(requestHref("support", SETUP, badEntry)).toBe(FALLBACK_MAILTO.support);

    expect(FALLBACK_MAILTO.feedback).toMatch(/^mailto:feedback@backwerdrhythmshop\.com\?subject=/);
  });
});

describe("the email links", () => {
  it("name the shop's two addresses", () => {
    expect(SHOP_EMAIL).toEqual({
      support: "support@backwerdrhythmshop.com",
      feedback: "feedback@backwerdrhythmshop.com",
    });
  });

  it("carry the app name and the topic in the subject", () => {
    const support = new URL(emailHref("support"));
    expect(support.protocol).toBe("mailto:");
    expect(support.pathname).toBe("support@backwerdrhythmshop.com");
    expect(support.searchParams.get("subject")).toBe("Count It — problem report");

    const feedback = new URL(emailHref("feedback"));
    expect(feedback.protocol).toBe("mailto:");
    expect(feedback.pathname).toBe("feedback@backwerdrhythmshop.com");
    expect(feedback.searchParams.get("subject")).toBe("Count It — feature request");
  });

  it("are the same links the form falls back to, so the email path is always there", () => {
    expect(FALLBACK_MAILTO.support).toBe(emailHref("support"));
    expect(FALLBACK_MAILTO.feedback).toBe(emailHref("feedback"));
  });
});
