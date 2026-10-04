/* The header and footer the secondary pages (/build, /assignments) share.
 *
 * Plain anchors, not next/link: under this vinext build next/link logs an RSC
 * prefetch error on mount and throws on click, so the navigation never happens.
 * Small pages lose nothing to a full page load, and one place explains it. */

export function PageHeader() {
  return (
    <header className="site-header">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="brand-lockup" href="/" aria-label="Count It home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-mark" src="/icon-192.png" alt="" aria-hidden="true" />
        <span><strong>Count <em>It.</em></strong><small>by Backwerd Rhythm Shop</small></span>
      </a>
      <p>Free percussion tools that teach.</p>
      <a className="brs-home" href="https://backwerdrhythmshop.com/" aria-label="Backwerd Rhythm Shop home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brs-monogram.svg" alt="" width="28" height="28" />
      </a>
    </header>
  );
}

export type PageName = "build" | "assignments" | "notation";

export function PageFooter({ page, feedbackSubject }: { page: PageName; feedbackSubject: string }) {
  return (
    <footer className="site-footer">
      <div><strong>Count It.</strong><span>by <a className="shop-link" href="https://backwerdrhythmshop.com">Backwerd Rhythm Shop</a></span></div>
      <div className="foot-links">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="foot-btn" href="/">Back to Count It</a>
        {page !== "assignments" && (
          <a className="foot-btn" href="/assignments" title="Every published step, ready to try, copy or customize">Assignments</a>
        )}
        {page !== "build" && (
          <a className="foot-btn" href="/build" title="Choose the rhythms, meter and pass mark, and get a link that gives every student the same round">Build an assignment</a>
        )}
        {page !== "notation" && (
          <a className="foot-btn" href="/notation" title="The clef, barlines, time signature, beams and rests, with live examples">Notation</a>
        )}
        <a className="foot-btn" href="https://guides.backwerdrhythmshop.com/count-it/">App guide</a>
        <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/sequences/counting-rhythms/" title="Counting Rhythms — a free, ordered set of ready-to-assign practice links">Teaching sequence</a>
        <a className="foot-btn" href={`mailto:feedback@backwerdrhythmshop.com?subject=${encodeURIComponent(feedbackSubject)}`}>Send feedback</a>
      </div>
      <p>© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
    </footer>
  );
}
