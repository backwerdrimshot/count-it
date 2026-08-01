import type { Metadata } from "next";
import "./globals.css";

const title = "Count It — Backwerd Rhythm Shop";
const description =
  "Practice reading quarter-note, eighth-note, and sixteenth-note rhythms with clear counting feedback.";
const url = "https://count-it.backwerdrhythmshop.com/";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  alternates: { canonical: url },
  manifest: "/manifest.webmanifest",
  icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  openGraph: { title, description, type: "website", url, siteName: "Backwerd Rhythm Shop" },
  // summary, not summary_large_image: there is no og image yet. Add one
  // 1200x630 image and switch the card type together, never separately.
  twitter: { card: "summary", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
