import {readFileSync} from 'node:fs';
import {launch,BASE,reporter,shot} from './harness.mjs';
const {note,finish}=reporter(),browser=await launch(),errors=[];
const handoff=JSON.parse(readFileSync(new URL('../../docs/repairs-v1-integration.json',import.meta.url),'utf8'));
for(const width of [320,768,1280])for(const colorScheme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},colorScheme}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/repairs-v1',{waitUntil:'networkidle'});
 note(`${width} ${colorScheme}: three local candidates`,await page.locator('a[href*="seq=counting-repairs-v1"]').count()===3);
 note(`${width} ${colorScheme}: honest local/legacy transition`,(await page.locator('body').innerText()).includes('half-beat repair alone does not prepare'));
 await shot(page,`repairs-page-${width}-${colorScheme}.png`,{fullPage:true});
 for(const entry of handoff.entries){
  const tag=`${width} ${colorScheme} repair${entry.step}`;
  await page.goto(BASE+entry.localLaunch,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
  note(`${tag}: direct lesson taught`,(await page.locator('.beginner-response-lesson').innerText())===entry.lesson);
  const guide=await page.locator('[data-guide-at]').allTextContents();
  note(`${tag}: correct guide vocabulary`,guide.length===(entry.step===2?4:8)&&(entry.step===2||guide.every(t=>/^[1-4&]$/.test(t))));
  note(`${tag}: choices fit prerequisites`,(await page.locator('.answer-choice').allTextContents()).every(t=>entry.step===2||!/[ea]/.test(t.replace(/\s/g,''))));
  note(`${tag}: feedback panel stays in flow`,await page.locator('.dock').evaluate(el=>getComputedStyle(el).position==='static'));
  note(`${tag}: page fits width`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const score=page.locator('.notation-scroll').first();if(await score.evaluate(el=>el.scrollWidth>el.clientWidth+1)){await score.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);note(`${tag}: keyboard scrolling`,await score.evaluate(el=>el.scrollLeft>0));}
  await shot(page,`repair${entry.step}-${width}-${colorScheme}.png`,{fullPage:true});
  const last=page.locator('.answer-choice').last();await last.click();note(`${tag}: final choice pointer reachable`,await last.isDisabled());
  if(entry.step===3)note(`${tag}: whole-note feedback avoids false silence`,!(await page.locator('.feedback-panel').innerText()).includes('rhythm is silent'));
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
  for(let i=0;i<entry.count;i++){
   const labels=await page.locator('.answer-choice strong').allTextContents();const correctIndex=labels.indexOf(entry.questions[i].answer);if(correctIndex<0)throw Error('Expected count missing from rendered choices: '+entry.questions[i].answer);await page.keyboard.press(String(correctIndex+1));
   const next=page.getByRole('button',{name:i===entry.count-1?/See results/:/Next question/});await next.waitFor();note(`${tag} q${i+1}: next keyboard focus`,await next.evaluate(el=>el===document.activeElement));await page.keyboard.press('Enter');
  }
  await page.waitForSelector('.result-card');note(`${tag}: correct full round`,(await page.locator('#result-title').innerText())===`You counted ${entry.count} of ${entry.count} correctly.`);
  if(entry.minimumCapability){
   note(`${tag}: profile recorded in result`,(await page.locator('.result-card').innerText()).includes(entry.minimumCapability));
   await page.waitForFunction(profile=>JSON.parse(localStorage.getItem('count-it-practice-history-v1')??'[]').some(h=>h.conditions.includes(profile)),entry.minimumCapability);
   await page.goto(BASE+'/build'+entry.query,{waitUntil:'networkidle'});const built=await page.locator('.builder-linkbox input').inputValue();note(`${tag}: builder preserves profile`,new URL(built).searchParams.get('response')===entry.minimumCapability);
  }
  if(entry.step===2){await page.goto(BASE+'/build'+entry.query,{waitUntil:'networkidle'});const rebuilt=await page.locator('.builder-linkbox input').inputValue();await page.goto(rebuilt,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');note(`${tag}: rebuilt lesson retained`,await page.locator('.beginner-response-lesson').innerText()===entry.lesson);}
 }
 await page.goto(BASE+handoff.entries[0].localLaunch+'&response=wrong',{waitUntil:'networkidle'});note(`${width} ${colorScheme}: malformed link refused`,await page.locator('.answer-choice').count()===0&&(await page.locator('body').innerText()).includes('Unknown or repeated response'));
 await context.close();
}
note('no browser errors',errors.length===0,errors.join('; '));await browser.close();finish();
