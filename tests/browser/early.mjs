import {readFileSync} from 'node:fs';
import {launch,BASE,reporter,shot} from './harness.mjs';
const {note,finish}=reporter(),browser=await launch(),errors=[];
const data=JSON.parse(readFileSync(new URL('../../docs/early-v2-integration.json',import.meta.url),'utf8'));
for(const width of [320,768,1280])for(const colorScheme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},colorScheme}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/hydration|hydrated|Minified React/.test(m.text()))errors.push(m.text());});
 for(let n=0;n<5;n++){
  const map=data.mapping[n],entry=data.entries[n],tag=`${width} ${colorScheme} entry${n+1}`;
  await page.goto(BASE+'/'+map.legacyQuery,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
  note(`${tag}: actual old URL opens current`,new URL(page.url()).search===entry.query);
  note(`${tag}: explicit archive disclosure`,(await page.locator('[aria-label="Updated assignment"]').innerText()).includes('old scores are not converted'));
  if(n===4)note(`${tag}: lesson appears once`,await page.getByText(map.preparation,{exact:true}).count()===1);
  note(`${tag}: guide matches support`,await page.locator('[data-guide-at]').count()===(n===2?0:n===4?4:n===3?6:8));
  note(`${tag}: fits screen`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); if(n===0||n===2||n===4)await shot(page,`early-question${n+1}-${width}-${colorScheme}.png`,{fullPage:true});
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
 const optional=data.entries[5];await page.goto(BASE+'/'+optional.query,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');
 for(let i=0;i<optional.questions.length;i++){const labels=await page.locator('.answer-choice strong').allTextContents();await page.keyboard.press(String(labels.indexOf(optional.questions[i].correctAnswer)+1));await page.getByRole('button',{name:i===optional.questions.length-1?/See results/:/Next question/}).click();}await page.waitForSelector('.result-card');note(`${width} ${colorScheme}: optional full bar sample completed`,(await page.locator('#result-title').innerText())==='You counted 8 of 8 correctly.');
 const custom=data.mapping[0].legacyQuery.replace('seed=cr1-quarters-pairs','seed=custom');await page.goto(BASE+'/'+custom,{waitUntil:'networkidle'});await page.waitForSelector('.answer-choice');note(`${width} ${colorScheme}: custom remains literal`,await page.locator('[aria-label="Updated assignment"]').count()===0);
 const unmarked=new URLSearchParams(data.mapping[0].legacyQuery);unmarked.delete('seq');unmarked.delete('step');await page.goto(BASE+'/?'+unmarked,{waitUntil:'networkidle'});await page.waitForSelector('[aria-label="Updated assignment"]');note(`${width} ${colorScheme}: unmarked saved link repaired`,new URL(page.url()).search===data.entries[0].query);
 await context.close();
}
note('no hydration or page errors',errors.length===0,errors.join('; '));await browser.close();finish();
