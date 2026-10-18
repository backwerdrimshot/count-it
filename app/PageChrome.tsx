import SupportLink from "./SupportLink";
import WorkspaceInfo, { WorkspaceActions } from "./WorkspaceInfo";
import { SOCIAL_LINKS, SocialGlyph } from "./BrandFooterBits";
import { COUNT_IT_BUILD } from "../src/capabilities";
import { emailHref } from "../src/support-links";

/* The header and footer the secondary pages (/build, /assignments, /notation, /class-summary) share. They
 * match the practice screen: the same Help, Feedback and About dialogs, the same footer order.
 *
 * Plain anchors, not next/link: under this vinext build next/link logs an RSC
 * prefetch error on mount and throws on click, so the navigation never happens.
 * Small pages lose nothing to a full page load, and one place explains it. */

export type PageName = "build" | "assignments" | "notation" | "class-summary";

/* What each page is for, as its Help text. */
const PAGE_HELP: Record<PageName, string> = {
  build: "Choose the rhythms, meter and pass mark, then copy the link. Every student who opens it gets the same round.",
  assignments: "Every published teaching-sequence step. Try one, copy its link, or customize it in the builder.",
  notation: "The clef, barlines, time signature, beams and rests, each with a live example drawn by the same renderer the questions use.",
  "class-summary": "Paste what students turned in. Each code is checked, and you can download the table as a CSV or a Canvas gradebook file.",
};

export function PageHeader({ page }: { page: PageName }) {
  return (
    <>
      <header className="site-header">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand-lockup" href="/" aria-label="Count It home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/icon-192.png" alt="" aria-hidden="true" />
          <span><strong>Count <em>It.</em></strong><small>by Backwerd Rhythm Shop</small></span>
        </a>
        <p>Free percussion tools that teach.</p>
        <WorkspaceActions />
        <a className="brs-home" href="https://backwerdrhythmshop.com/" aria-label="Backwerd Rhythm Shop home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brs-monogram.svg" alt="" width="28" height="28" />
        </a>
      </header>
      <WorkspaceInfo
        name="Count It"
        guide="https://guides.backwerdrhythmshop.com/count-it/"
        help={<>
          <p>{PAGE_HELP[page]}</p>
          <p>Forever free. No account required.</p>
        </>}
        feedback={<>
          <p><SupportLink kind="support">Report a problem</SupportLink> · <SupportLink kind="feedback">Request a feature</SupportLink></p>
          <p><a href={emailHref("support")}>Email support</a> · <a href={emailHref("feedback")}>Email feedback</a></p>
        </>}
      >
        <p className="about-build">Build <span className="build-id">{COUNT_IT_BUILD}</span></p>
        <nav className="about-links" aria-label="More from Backwerd Rhythm Shop">
          <a className="text-action" href="https://apps.backwerdrhythmshop.com/">More apps</a>
          <a className="text-action" href="https://guides.backwerdrhythmshop.com/count-it/">Guide</a>
        </nav>
        <p className="about-copyright">© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
      </WorkspaceInfo>
    </>
  );
}

export function PageFooter({ page }: { page: PageName }) {
  return (
    <footer className="site-footer">
      <nav className="foot-social" aria-label="Backwerd Rhythm Shop on social media">
        {SOCIAL_LINKS.map(({ network, href }) => (
          <a key={network} className="foot-ico" href={href} target="_blank" rel="noreferrer" aria-label={`Backwerd Rhythm Shop on ${network}`} title={network}>
            <SocialGlyph network={network} />
          </a>
        ))}
      </nav>
      <nav className="foot-links" aria-label="Count It links">
        <SupportLink kind="support" className="foot-btn">Report a problem</SupportLink>
        <SupportLink kind="feedback" className="foot-btn">Request a feature</SupportLink>
        <a className="foot-btn" href="https://guides.backwerdrhythmshop.com/count-it/">Guide</a>
        <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/">All free apps</a>
        {/* The app's own pages follow the shop links. The page you are on is not linked. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="foot-btn" href="/">Back to Count It</a>
        {page !== "assignments" && (
          <a className="foot-btn" href="/assignments" title="Every published step, ready to try, copy or customize">Assignments</a>
        )}
        {page !== "build" && (
          <a className="foot-btn" href="/build" title="Choose the rhythms, meter and pass mark, and get a link that gives every student the same round">Build an assignment</a>
        )}
        {page !== "class-summary" && (
          <a className="foot-btn" href="/class-summary" title="Paste what students turned in, check their codes, download a CSV or a Canvas gradebook file">Class summary</a>
        )}
        {page !== "notation" && (
          <a className="foot-btn" href="/notation" title="The clef, barlines, time signature, beams and rests, with live examples">Notation</a>
        )}
        <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/" title="Counting Rhythms — a free, ordered set of ready-to-assign practice links">Teaching sequence</a>
      </nav>
      <div className="foot-legal">
        <span>© 2026 Backwerd Rimshot, LLC. All rights reserved.</span>
        <span className="build-stamp">Build {COUNT_IT_BUILD}</span>
      </div>
    </footer>
  );
}
