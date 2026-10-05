/* The For teachers link beside Help and About: visible, inside the viewport, 44px, reachable by Tab, absent below 480px.
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
    const link = p.getByRole("link", { name: "For teachers" });
    const visible = await link.isVisible();
    const phone = w < 480;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const lines = await p.evaluate(() => Math.round(document.querySelector(".site-header strong").getBoundingClientRect().height / 31));
    if (phone) {
      // Too narrow for a fourth header item: it must be absent, the wordmark intact, and the links still reachable through About.
      note(`${label}: link is not squeezed into the header; wordmark stays on one line; no overflow`, !visible && lines === 1 && overflow <= 0, `lines ${lines}, overflow ${overflow}px`);
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
    if (label.startsWith("laptop 1366") || label.startsWith("phone 390")) await shot(p, `teachers-${w}.png`, { clip: { x: 0, y: 0, width: w, height: 130 } });
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
