import type { Metadata } from "next";
import AssignmentBuilder from "../AssignmentBuilder";

const url = "https://count-it.backwerdrhythmshop.com/build";
const title = "Build an assignment | Count It";
const description =
  "Choose a level or the exact rhythms, a meter and a pass mark, and Count It writes a link that gives every student the same rhythm-counting round.";

/* The root layout names the home page as canonical, which is right for it and
   wrong here: this page is its own thing, and a canonical pointing elsewhere
   would ask search engines to treat it as a duplicate of the trainer. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, type: "website", url, siteName: "Backwerd Rhythm Shop" },
  twitter: { card: "summary", title, description },
};

export default function BuildPage() {
  return <AssignmentBuilder />;
}
