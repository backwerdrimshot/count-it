import type { Metadata } from "next";
import AssignmentCatalog from "../AssignmentCatalog";

const url = "https://count-it.backwerdrhythmshop.com/assignments";
const title = "Assignments | Count It";
const description =
  "Every published Counting Rhythms and Rhythms in Three step, ready to try, copy into your LMS, or customize. Free, no account.";

/* Its own canonical, for the same reason /build has one: the root layout names the
   trainer, which would ask search engines to treat this page as a duplicate. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, type: "website", url, siteName: "Backwerd Rhythm Shop" },
  twitter: { card: "summary", title, description },
};

export default function AssignmentsPage() {
  return <AssignmentCatalog />;
}
