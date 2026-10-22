import {readFileSync} from 'node:fs';
import {launch,BASE,reporter,shot} from './harness.mjs';
const {note,finish}=reporter(),browser=await launch(),errors=[];
const data=JSON.parse(readFileSync(new URL('../../docs/early-v2-integration.json',import.meta.url),'utf8'));
for(const width of [320,768,1280])for(const colorScheme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},colorScheme}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/hydration|hydrated|Minified React/.test(m.text()))errors.push(m.text());});
  /* Steps are found by id, not by position: steps 6 and 7 sit beside step 5 in the handoff file. */
  const stepOf=i=>Number(data.mapping[i].legacyId.split('-').pop());
  for(const n of [...data.mapping.keys()].filter(i=>stepOf(i)<=5)){
  const step=stepOf(n),map=data.mapping[n],entry=data.entries.find(e=>e.id===map.currentId),tag=`${width} ${colorScheme} entry${step}`;
  await page.goto(BASE+'/'+map.legacyQuery,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
  note(`${tag}: actual old URL opens current`,new URL(page.url()).search===entry.query);
  note(`${tag}: explicit archive disclosure`,(await page.locator('[aria-label="Updated assignment"]').innerText()).includes('old scores are not converted'));
  if(step===5)note(`${tag}: lesson appears once`,await page.getByText(map.preparation,{exact:true}).count()===1);
  note(`${tag}: guide matches support`,await page.locator('[data-guide-at]').count()===(step===3?0:step===5?4:step===4?6:8));
  note(`${tag}: fits screen`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); if(step===1||step===3||step===5)await shot(page,`early-question${step}-${width}-${colorScheme}.png`,{fullPage:true});
  for(let i=0;i<entry.questions.length;i++){
   const q=entry.questions[i],labels=await page.locator('.answer-choice strong').allTextContents();note(`${tag} q${i+1}: exact seeded choices`,JSON.stringify([...labels].sort())===JSON.stringify(q.choices.map(c=>c.label).sort()));
   await page.keyboard.press(String(labels.indexOf(q.correctAnswer)+1));
   const next=page.getByRole('button',{name:i===entry.questions.length-1?/See results/:/Next question/});await next.waitFor();note(`${tag} q${i+1}: next receives keyboard focus`,await next.evaluate(el=>el===document.activeElement));await page.keyboard.press('Enter');
  }
  await page.waitForSelector('.result-card');note(`${tag}: correct full round`,(await page.locator('#result-title').innerText())===`You counted ${entry.questions.length} of ${entry.questions.length} correctly.`);
  note(`${tag}: current identity`,(await page.locator('.result-card').innerText()).includes(new URLSearchParams(entry.query).get('seq')));
  if(n===0)await shot(page,`early-result-${width}-${colorScheme}.png`,{fullPage:true});
  await page.goto(BASE+map.archive,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
  note(`${tag}: archive stays literal`,new URL(page.url()).pathname==='/archive'&&(await page.locator('body').innerText()).includes('Archived original round.')&&await page.locator('[aria-label="Updated assignment"]').count()===0);
  const returnLink=page.getByRole('link',{name:'open the updated entry point'});note(`${tag}: archive return carries original query`,new URLSearchParams(new URL(await returnLink.getAttribute('href'),BASE).search).toString()===new URLSearchParams(map.legacyQuery).toString());
  if(n===0){await returnLink.click();await page.waitForSelector('[aria-label="Updated assignment"]');note(`${tag}: archive -> current navigation works`,new URL(page.url()).search===entry.query);}
 }
 /* Steps 6 and 7: each opens its current activity from the original link and completes a round. */
 for(const n of [...data.mapping.keys()].filter(i=>stepOf(i)>5)){const map=data.mapping[n],entry=data.entries.find(e=>e.id===map.currentId),tag=`${width} ${colorScheme} entry${stepOf(n)}`;await page.goto(BASE+'/'+map.legacyQuery,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');note(`${tag}: actual old URL opens current`,new URL(page.url()).search===entry.query);note(`${tag}: fits screen`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(let i=0;i<entry.questions.length;i++){const labels=await page.locator('.answer-choice strong').allTextContents();await page.keyboard.press(String(labels.indexOf(entry.questions[i].correctAnswer)+1));await page.getByRole('button',{name:i===entry.questions.length-1?/See results/:/Next question/}).click();}await page.waitForSelector('.result-card');note(`${tag}: round completes`,(await page.locator('#result-title').innerText()).includes('You counted'));}
 const optional=data.entries.find(e=>e.id==='counting-early-v2-6');await page.goto(BASE+'/'+optional.query,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
 for(let i=0;i<optional.questions.length;i++){const labels=await page.locator('.answer-choice strong').allTextContents();await page.keyboard.press(String(labels.indexOf(optional.questions[i].correctAnswer)+1));await page.getByRole('button',{name:i===optional.questions.length-1?/See results/:/Next question/}).click();}await page.waitForSelector('.result-card');note(`${width} ${colorScheme}: optional full bar sample completed`,(await page.locator('#result-title').innerText())==='You counted 8 of 8 correctly.');
 const custom=data.mapping[0].legacyQuery.replace('seed=cr1-quarters-pairs','seed=custom');await page.goto(BASE+'/'+custom,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');note(`${width} ${colorScheme}: custom remains literal`,await page.locator('[aria-label="Updated assignment"]').count()===0);
 const unmarked=new URLSearchParams(data.mapping[0].legacyQuery);unmarked.delete('seq');unmarked.delete('step');await page.goto(BASE+'/?'+unmarked,{waitUntil:'networkidle'});await page.waitForSelector('[aria-label="Updated assignment"]');note(`${width} ${colorScheme}: unmarked saved link repaired`,new URL(page.url()).search===data.entries[0].query);
 await context.close();
}
note('no hydration or page errors',errors.length===0,errors.join('; '));await browser.close();finish();
