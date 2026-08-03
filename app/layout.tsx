import type { Metadata } from "next";
import "./globals.css";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Count It",
  "url": "https://count-it.backwerdrhythmshop.com/",
  "applicationCategory": "EducationalApplication",
  "applicationSubCategory": "Music education",
  "operatingSystem": "Any device with a modern web browser",
  "isAccessibleForFree": true,
  "description": "Practice connecting written rhythms to spoken subdivision counts with Count It, a free browser-based rhythm-counting trainer.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Backwerd Rhythm Shop",
    "url": "https://backwerdrhythmshop.com/"
  }
} as const;

const title = "Count It | Free Rhythm-Counting Practice App";
const description =
  "Practice connecting written rhythms to spoken subdivision counts with Count It, a free browser-based rhythm-counting trainer.";
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
