/**
 * Where a learner or teacher sends a problem or a feature request.
 *
 * Both are the shop's Google Forms, shared by every app. Each form has an "App"
 * question, so one form serves every app. A link opens its form with the app's
 * name and the page as it stands pre-filled. If a form is ever unset, the link
 * falls back to the shop's email address. Change a form here, not in the
 * components that show it.
 */

export const APP_NAME = "Count It";

export type RequestKind = "support" | "feedback";

/** Who the two forms are for, shown beside the links to them (the shop's privacy policy). */
export const FORMS_NOTE = "The forms are for teachers and adults. Students, please tell your teacher instead.";
/** The same notice for the footer, where the forms sit among other links. */
export const FORMS_NOTE_FOOTER =
  "The problem and feature forms are for teachers and adults. Students, please tell your teacher instead.";

export interface RequestForm {
  /** The form's viewer address, as Google gives it. */
  base: string;
  /** The entry field that takes the app's name. */
  appEntry: string;
  /** The entry field that takes the page, its settings and the build. */
  setupEntry: string;
}

/** The shop's forms. A form set to null falls back to its email address. */
export const SHOP_FORMS: Record<RequestKind, RequestForm | null> = {
  support: {
    base: "https://docs.google.com/forms/d/e/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg/viewform",
    appEntry: "entry.588933919",
    setupEntry: "entry.1893079260",
  },
  feedback: {
    base: "https://docs.google.com/forms/d/e/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg/viewform",
    appEntry: "entry.2020831353",
    setupEntry: "entry.1906602408",
  },
};

/** The shop's email address for each kind of request. */
export const SHOP_EMAIL: Record<RequestKind, string> = {
  support: "support@backwerdrhythmshop.com",
  feedback: "feedback@backwerdrhythmshop.com",
};

/** A plain mailto link for a kind of request, with the app name in the subject. */
export function emailHref(kind: RequestKind): string {
  const topic = kind === "support" ? "problem report" : "feature request";
  return `mailto:${SHOP_EMAIL[kind]}?subject=${encodeURIComponent(`${APP_NAME} — ${topic}`)}`;
}

/** The email address each kind of request goes to when its form is not set. */
export const FALLBACK_MAILTO: Record<RequestKind, string> = {
  support: emailHref("support"),
  feedback: emailHref("feedback"),
};

/** Only a Google Forms address and entry fields may be pre-filled. */
const FORM_ADDRESS = /^https:\/\/docs\.google\.com\/forms\//;
const ENTRY_FIELD = /^entry\.\d+$/;

/** The form if it can be used, otherwise null. */
function usableForm(form: RequestForm | null | undefined): RequestForm | null {
  return form && FORM_ADDRESS.test(form.base) && ENTRY_FIELD.test(form.appEntry) && ENTRY_FIELD.test(form.setupEntry)
    ? form
    : null;
}

/** True when a request of this kind opens the shop's form rather than email. */
export function hasForm(kind: RequestKind, forms: Record<RequestKind, RequestForm | null> = SHOP_FORMS): boolean {
  return usableForm(forms[kind]) !== null;
}

/** The address a link shows before it is followed: the plain form, or the email address. */
export function requestBase(kind: RequestKind, forms: Record<RequestKind, RequestForm | null> = SHOP_FORMS): string {
  return usableForm(forms[kind])?.base ?? FALLBACK_MAILTO[kind];
}

/** Where a link goes once followed: the form with the app and the setup filled in, or the email address. */
export function requestHref(
  kind: RequestKind,
  setup: string,
  forms: Record<RequestKind, RequestForm | null> = SHOP_FORMS,
): string {
  const form = usableForm(forms[kind]);
  if (!form) return FALLBACK_MAILTO[kind];
  const url = new URL(form.base);
  url.searchParams.set("usp", "pp_url");
  url.searchParams.set(form.appEntry, APP_NAME);
  url.searchParams.set(form.setupEntry, setup);
  return url.toString();
}
