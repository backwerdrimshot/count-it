import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Count It | Rhythm Counting Trainer",
  description:
    "Practice reading quarter-note, eighth-note, and sixteenth-note rhythms with clear counting feedback.",
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
