import type { Metadata } from "next";
import ClassSummary from "../ClassSummary";

const url = "https://count-it.backwerdrhythmshop.com/class-summary";
const title = "Class summary | Count It";
const description =
  "Paste the summaries students turned in, check their verification codes and download a CSV or a Canvas gradebook file. Nothing leaves your browser.";

/* Its own canonical, like /build and /assignments: the root layout names the trainer. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, type: "website", url, siteName: "Backwerd Rhythm Shop" },
  twitter: { card: "summary", title, description },
};

export default function ClassSummaryPage() {
  return <ClassSummary />;
}
