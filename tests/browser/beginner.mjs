import { launch, BASE, reporter, shot } from "./harness.mjs";
const { note, finish } = reporter();
const browser=await launch(), errors=[];
for (const width of [320,768,1280]) for (const colorScheme of ["light","dark"]) {
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme});
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${BASE}/beginner-v1`,{waitUntil:"networkidle"});
  const links=await page.locator('a[href*="seq=quarters-pairs-bridge-v1"]').evaluateAll(as=>as.map(a=>a.getAttribute("href")));
  note(`${width} ${colorScheme}: five draft launches`,links.length===5);
  await shot(page,`beginner-lesson-${width}-${colorScheme}.png`,{fullPage:true});
  note(`${width} ${colorScheme}: lesson fits page`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(let i=0;i<links.length;i++) {
    await page.goto(BASE+links[i],{waitUntil:"networkidle"});
    await page.waitForSelector(".answer-choice");
    const count=i===0?3:4;
    note(`${width} ${colorScheme} step ${i+1}: taught choices`,await page.locator(".answer-choice").count()===count && (await page.locator(".answer-choice").allTextContents()).every(t=>!/[ea]/.test(t.replace(/\s/g,''))));
    const guides=await page.locator('[data-guide-at]').allTextContents();
    note(`${width} ${colorScheme} step ${i+1}: guide vocabulary/policy`,i===4?guides.length===0:guides.length===(i===0?2:i===1?4:i===2?6:8)&&guides.every(t=>/^[1-4&]$/.test(t)));
    note(`${width} ${colorScheme} step ${i+1}: no page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    note(`${width} ${colorScheme} step ${i+1}: assigned playback absent`,await page.getByRole("button",{name:"Listen to rhythm"}).count()===0);
    const scroller=page.locator(".notation-scroll").first();
    const overflowing=await scroller.evaluate(el=>el.scrollWidth>el.clientWidth+1);
    if(overflowing) {
      await scroller.focus(); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100);
      note(`${width} ${colorScheme} step ${i+1}: keyboard notation scroll`,await scroller.evaluate(el=>el.scrollLeft>0&&el.tabIndex===0));
      note(`${width} ${colorScheme} step ${i+1}: visible cue`,await page.getByText("Scroll sideways to see the rest of the bar.",{exact:true}).count()===1);
    } else note(`${width} ${colorScheme} step ${i+1}: fitting notation has no tab stop`,await scroller.getAttribute("tabindex")===null);
    if(i===3) {
      const last=page.locator(".answer-choice").last(); await last.click();
      note(`${width} ${colorScheme}: last choice pointer-accessible`,await last.isDisabled());
      await page.reload({waitUntil:"networkidle"});await page.waitForSelector(".answer-choice");
    }
    if(i===0||i===3||i===4) await shot(page,`beginner-${width}-${colorScheme}-step-${i+1}.png`,{fullPage:true});
    // One complete supported and reduced-support round per viewport/theme, using keys.
    if(i===0||i===4) {
      const total=i===0?4:6;
      for(let q=0;q<total;q++) {
        await page.keyboard.press("1");
        const next=page.getByRole("button",{name:q===total-1?/See results/:/Next question/});
        await next.waitFor();
        note(`${width} ${colorScheme} step ${i+1} q${q+1}: focus moves to next`,await next.evaluate(el=>el===document.activeElement));
        if(i===4) note(`${width} ${colorScheme}: feedback withheld q${q+1}`,await page.locator(".feedback-panel").innerText().then(t=>t.includes("Answer recorded")&&!t.includes("correct count")));
        await page.keyboard.press("Enter");
      }
      await page.waitForSelector(".result-card");
      note(`${width} ${colorScheme} step ${i+1}: profile on result`,await page.locator(".result-card").innerText().then(t=>t.includes("eighths-v1")));
      if(i===4) note(`${width} ${colorScheme}: retry disabled`,await page.locator(".result-retry-note").count()===1);
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem("count-it-practice-history-v1")??"[]").some(h=>h.conditions.includes("eighths-v1")));
      const history=await page.evaluate(()=>JSON.parse(localStorage.getItem("count-it-practice-history-v1")??"[]"));
      note(`${width} ${colorScheme} step ${i+1}: saved conditions retain profile`,history.some(h=>h.conditions.includes("eighths-v1")));
      await page.reload({waitUntil:"networkidle"});await page.waitForSelector(".answer-choice");
      note(`${width} ${colorScheme} step ${i+1}: reload retains profile`,await page.locator(".answer-choice").count()===count);
    }
  }
  await page.goto(BASE+"/build"+links[1].slice(1),{waitUntil:"networkidle"});
  const built=await page.locator(".builder-linkbox input").inputValue();
  note(`${width} ${colorScheme}: builder UI preserves profile`,new URL(built).searchParams.get("response")==="eighths-v1");
  await page.goto(BASE+"/build?response=bad",{waitUntil:"networkidle"});
  note(`${width} ${colorScheme}: malformed profile-only builder import refused`,await page.locator(".builder-problem").innerText().then(t=>t.includes("cannot be reopened")));
  await page.goto(BASE+links[0]+"&response=bad",{waitUntil:"networkidle"});
  note(`${width} ${colorScheme}: malformed version refused`,await page.getByText(/eighths-v1 response vocabulary needs/).count()>0 && await page.locator(".answer-choice").count()===0);
  await context.close();
}
note("no browser errors",errors.length===0,errors.join("; "));
await browser.close();finish();
