/* The For teachers entry: in the About dialog at every width, and in a dedicated row under the
   header on phones below 480px. The header itself holds only Help, Feedback and About.
   Visible, 44px, keyboard reachable. Run with `pnpm test:browser` (see README.md in this folder). */
import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, finish } = reporter();
const sizes = [["laptop 1366x768", 1366, 768], ["laptop 1280x720", 1280, 720], ["small laptop 1024x600", 1024, 600], ["tablet 768x1024", 768, 1024], ["phone 390x844", 390, 844], ["phone 360x640", 360, 640]];
(async () => {
  const b = await launch();
  const errors = [];
  for (const [label, w, h] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const phone = w < 480;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const lines = await p.evaluate(() => Math.round(document.querySelector(".site-header strong").getBoundingClientRect().height / 31));
    const headerTeachers = await p.locator("header a", { hasText: "For teachers" }).count();
    const navNames = await p.$$eval("nav.workspace-actions button", (buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    note(`${label}: the header holds no For teachers link, and its nav holds Help, Feedback and About only`,
      headerTeachers === 0 && JSON.stringify(navNames) === JSON.stringify(["Help", "Feedback", "About"]), `${headerTeachers} in header; nav: ${navNames.join(", ")}`);

    // About holds the link on every width.
    await p.getByRole("button", { name: "About", exact: true }).click();
    const aboutLink = p.locator("#workspace-about").getByRole("link", { name: "For teachers", exact: true });
    const inAbout = await aboutLink.isVisible();
    const box = inAbout ? await aboutLink.boundingBox() : null;
    const inView = !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h;
    note(`${label}: For teachers is in About, in view, and at least 44px tall`,
      inAbout && inView && box.height >= 43.5, box ? `${Math.round(box.width)}x${Math.round(box.height)} at (${Math.round(box.x)},${Math.round(box.y)})` : "not visible");
    if (label.startsWith("laptop 1366")) await shot(p, `teachers-about-${w}.png`, { fullPage: false });
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    if (label.startsWith("laptop 1366")) {
      await p.getByRole("button", { name: "About", exact: true }).click();
      await aboutLink.click();
      await p.waitForURL((u) => u.pathname === "/assignments", { timeout: 10000 }).catch(() => {});
      note("clicking For teachers in About opens the assignments page", new URL(p.url()).pathname === "/assignments" && (await p.locator("h1").textContent()) === "Assignments", p.url());
      await p.goto(BASE + "/", { waitUntil: "networkidle" });
      // Keyboard: About opens from its button, and Tab reaches the link inside it.
      await p.getByRole("button", { name: "About", exact: true }).focus();
      await p.keyboard.press("Enter");
      let reached = false;
      for (let i = 0; i < 8 && !reached; i++) {
        await p.keyboard.press("Tab");
        reached = await aboutLink.evaluate((element) => document.activeElement === element);
      }
      note("keyboard: For teachers is reachable by Tab inside the About dialog", reached);
      await p.keyboard.press("Escape");
    }

    if (phone) {
      const mobileLink = p.getByRole("link", { name: "For teachers: assignments", exact: true });
      const mobileVisible = await mobileLink.isVisible();
      const mobileBox = mobileVisible ? await mobileLink.boundingBox() : null;
      const mobileInView = !!mobileBox && mobileBox.x >= 0 && mobileBox.y >= 0 && mobileBox.x + mobileBox.width <= w && mobileBox.y + mobileBox.height <= h;
      note(`${label}: dedicated assignments row is visible, in view and does not crowd the header`,
        mobileVisible && mobileInView && lines === 1 && overflow <= 0,
        mobileBox ? `${Math.round(mobileBox.width)}x${Math.round(mobileBox.height)} at (${Math.round(mobileBox.x)},${Math.round(mobileBox.y)}); ${lines} wordmark lines; ${overflow}px overflow` : `lines ${lines}, overflow ${overflow}px`);
      if (mobileBox) note(`${label}: mobile assignments tap target is at least 44px tall`, mobileBox.height >= 43.5, `${Math.round(mobileBox.height)}px`);
      if (label.startsWith("phone 390")) await shot(p, `teachers-${w}.png`, { clip: { x: 0, y: 0, width: w, height: 150 } });
      if (label.startsWith("phone 390")) {
        await p.keyboard.press("Tab"); // skip link
        let reachedByTab = false;
        for (let i = 0; i < 10; i++) {
          await p.keyboard.press("Tab");
          if (await mobileLink.evaluate((element) => document.activeElement === element)) {
            reachedByTab = true;
            break;
          }
        }
        note("phone: the assignments row is reachable by Tab", reachedByTab);
        if (reachedByTab) {
          await p.keyboard.press("Enter");
          await p.waitForURL((u) => u.pathname === "/assignments", { timeout: 10000 }).catch(() => {});
          note("phone: keyboard activation opens the assignments page",
            new URL(p.url()).pathname === "/assignments" && (await p.locator("h1").textContent()) === "Assignments", p.url());
          await p.goto(BASE + "/", { waitUntil: "networkidle" });
        }
      }
    }
    // The footer lists Assignments at every width.
    await p.locator("footer").scrollIntoViewIfNeeded();
    const inFooter = await p.locator("footer a", { hasText: /^Assignments$/ }).isVisible();
    note(`${label}: the assignments link is also in the footer`, inFooter);
    await ctx.close();
  }
  note("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await b.close();
  finish();
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
