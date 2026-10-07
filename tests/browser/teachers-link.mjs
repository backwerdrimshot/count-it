/* The For teachers entry: in the header on wide screens and in a dedicated row on phones; visible, 44px, keyboard reachable.
   Run with `pnpm test:browser` (see README.md in this folder). */
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
    const link = p.getByRole("link", { name: "For teachers", exact: true });
    const visible = await link.isVisible();
    const phone = w < 480;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const lines = await p.evaluate(() => Math.round(document.querySelector(".site-header strong").getBoundingClientRect().height / 31));
    if (phone) {
      const mobileLink = p.getByRole("link", { name: "For teachers: assignments", exact: true });
      const mobileVisible = await mobileLink.isVisible();
      const box = mobileVisible ? await mobileLink.boundingBox() : null;
      const inView = !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h;
      note(`${label}: dedicated assignments entry is visible, in view and does not crowd the header`,
        !visible && mobileVisible && inView && lines === 1 && overflow <= 0,
        box ? `${Math.round(box.width)}x${Math.round(box.height)} at (${Math.round(box.x)},${Math.round(box.y)}); ${lines} wordmark lines; ${overflow}px overflow` : `lines ${lines}, overflow ${overflow}px`);
      if (box) note(`${label}: mobile assignments tap target is at least 44px tall`, box.height >= 43.5, `${Math.round(box.height)}px`);
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
        note("phone: assignments entry is reachable by Tab", reachedByTab);
        if (reachedByTab) {
          await p.keyboard.press("Enter");
          await p.waitForURL((u) => u.pathname === "/assignments", { timeout: 10000 }).catch(() => {});
          note("phone: keyboard activation opens the assignments page",
            new URL(p.url()).pathname === "/assignments" && (await p.locator("h1").textContent()) === "Assignments", p.url());
          await p.goto(BASE + "/", { waitUntil: "networkidle" });
        }
      }
      await p.getByRole("button", { name: "About", exact: true }).click();
      const inAbout = await p.locator("#workspace-about a", { hasText: /^Assignments$/ }).isVisible();
      note(`${label}: the assignments link is still reachable through About`, inAbout);
    } else {
      const box = visible ? await link.boundingBox() : null;
      const inView = !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h;
      const others = await Promise.all(["Help", "About"].map(async (n) => p.getByRole("button", { name: n, exact: true }).boundingBox()));
      const overlaps = box && others.some((o) => o && !(box.x + box.width <= o.x || o.x + o.width <= box.x || box.y + box.height <= o.y || o.y + o.height <= box.y));
      note(`${label}: visible, inside the viewport, not overlapping Help/About, wordmark on one line, no overflow`, visible && inView && !overlaps && lines === 1 && overflow <= 0, box ? `${Math.round(box.width)}x${Math.round(box.height)} at (${Math.round(box.x)},${Math.round(box.y)})` : "not visible");
      if (box) note(`${label}: tap target at least 44px tall`, box.height >= 43.5, `${Math.round(box.height)}px`);
    }
    if (label.startsWith("laptop 1366")) await shot(p, `teachers-${w}.png`, { clip: { x: 0, y: 0, width: w, height: 130 } });
    if (label.startsWith("laptop 1366")) {
      await link.click();
      await p.waitForURL((u) => u.pathname === "/assignments", { timeout: 10000 }).catch(() => {});
      note("clicking it opens the assignments page", new URL(p.url()).pathname === "/assignments" && (await p.locator("h1").textContent()) === "Assignments", p.url());
      await p.goto(BASE + "/", { waitUntil: "networkidle" });
      await p.keyboard.press("Tab"); // skip link
      const order = [];
      for (let i = 0; i < 6; i++) { await p.keyboard.press("Tab"); order.push(await p.evaluate(() => (document.activeElement?.textContent || "").trim().slice(0, 18))); }
      note("keyboard: it is reachable by Tab, before Help and About", order.indexOf("For teachers") !== -1 && order.indexOf("For teachers") < order.indexOf("Help"), order.join(" > "));
    }
    await ctx.close();
  }
  note("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await b.close();
  finish();
})().catch((e) => { console.error("script error:", e.message); process.exit(2); });
