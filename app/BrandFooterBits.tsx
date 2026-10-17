
/* The social links and their glyphs, lifted verbatim from Scale Trail so the
   two footers render the same marks at the same size. Mallet Board was the one
   app in the portfolio shipping no social links at all. */

export const SOCIAL_LINKS = [
  { network: "Facebook", href: "https://www.facebook.com/backwerdrhythmshop/" },
  { network: "Instagram", href: "https://www.instagram.com/backwerdrhythmshop/" },
  { network: "YouTube", href: "https://www.youtube.com/@backwerdrhythmshop" },
] as const;

export function SocialGlyph({ network }: { network: string }) {
  if (network === "Facebook") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.13-2.41-.13-2.38 0-4.01 1.45-4.01 4.13v2.3H7.5V13h2.78v8Z"
        />
      </svg>
    );
  }
  if (network === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.75-1.77C18.3 5 12 5 12 5s-6.3 0-7.85.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.75 1.77C5.7 19 12 19 12 19s6.3 0 7.85-.43a2.5 2.5 0 0 0 1.75-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z"
      />
      <path fill="var(--white)" d="M10.25 15.02 15.5 12l-5.25-3.02Z" />
    </svg>
  );
}
