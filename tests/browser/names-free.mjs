import assert from 'node:assert/strict';
import {launch,BASE} from './harness.mjs';
const browser=await launch();
async function assertFeedbackContrast(locator){
 const ratio=await locator.evaluate(el=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
  const lum=s=>rgb(s).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
  let surface=el;
  while(surface.parentElement && getComputedStyle(surface).backgroundColor==='rgba(0, 0, 0, 0)')surface=surface.parentElement;
  const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(surface).backgroundColor);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });
 assert.ok(ratio>=4.5,'feedback text contrast '+ratio+' is below 4.5:1');
}

try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  window.outbound=[];window.copyFails=false;
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.copyFails)throw Error('Synthetic failure');outbound.push(text);}}});
 });
 const page=await context.newPage();
 await page.goto(BASE+'/build');
 const input=page.getByLabel(/^Assignment name/);
 await input.fill('Snare 2');await page.getByRole('button',{name:'Copy link',exact:true}).click();
 assert.equal(await page.evaluate(()=>outbound.length),1);
 for(const marker of ['Student ID: #1234','student number 1234','student # 1234','ID A1234']) {
  await input.fill(marker);
  assert.equal(await page.getByRole('button',{name:'Copy link',exact:true}).count(),0);
  assert.equal(await page.locator('.builder-linkbox input').count(),0);
  for(const label of ['Try it as a student','Post to Google Classroom'])assert.equal(await page.getByRole('link',{name:label,exact:true}).count(),0);
 }
 await input.fill('12345 call 555-123-4567');
 await assertFeedbackContrast(page.locator('.builder-problem').first());
 for(const label of ['Try it as a student','Post to Google Classroom'])assert.equal(await page.getByRole('link',{name:label,exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Copy link',exact:true}).count(),0);
 assert.equal(await page.locator('.builder-linkbox input').count(),0);
 await input.fill('555-123-4567');await page.evaluate(()=>copyFails=true);
 await page.getByRole('button',{name:'Copy link',exact:true}).press('Enter');
 assert.equal(await page.locator('.builder-linkbox input').evaluate(el=>document.activeElement===el),true);
 assert.match(await page.locator('.builder-copied').innerText(),/selected/);
 assert.match(await page.locator('.builder-problem').first().innerText(),/phone number/);
 await input.fill('Band 2');await page.evaluate(()=>copyFails=false);await page.getByRole('button',{name:'Copy link',exact:true}).click();
 assert.equal(await page.evaluate(()=>outbound.length),2);
 for(const key of ['a','class']) {
  await page.goto(BASE+'/build?level=2&scope=beat&meter=4-4&sys=standard&guide=on&n=10&pass=8&seed=band&'+key+'='+encodeURIComponent(key==='class'?'12345-555-123-4567':'student number 1234'));
  await page.waitForFunction(()=>document.body.textContent.includes('Remove the ID number'));
  assert.equal(await page.getByRole('button',{name:'Copy link',exact:true}).count(),0);
 }
 await context.route('https://count-it.backwerdrhythmshop.com/**',async route=>{const url=new URL(route.request().url());const response=await route.fetch({url:BASE+url.pathname+url.search});await route.fulfill({response});});
 await context.route('https://praxispercussion.com/names-free-fixture',route=>route.fulfill({contentType:'text/html',body:`<script>window.saved=[];addEventListener('message',e=>{if(e.data.type==='count-it.configuration.save'){saved.push(e.data);e.source.postMessage({type:'count-it.configuration.saved',version:1,requestId:e.data.requestId,ok:true},e.origin)}})</script><iframe title="Builder" src="https://count-it.backwerdrhythmshop.com/build?praxisContext=program&praxisReturnOrigin=https%3A%2F%2Fpraxispercussion.com&a=Band%202&level=2&seed=band"></iframe>`}));
 await page.goto('https://praxispercussion.com/names-free-fixture');
 const frame=page.frameLocator('iframe');
 await frame.getByRole('button',{name:'Save to Program',exact:true}).click();
 await page.waitForFunction(()=>saved.length===1);
 const frameName=frame.getByLabel(/^Assignment name/);
 await frameName.fill('ID A1234');
 assert.equal(await frame.getByRole('button',{name:'Save to Program',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>saved.length),1);
 await frameName.fill('Band 3');await frame.getByRole('button',{name:'Save to Program',exact:true}).press('Enter');
 await page.waitForFunction(()=>saved.length===2);
 await page.goto(BASE+'/build');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('PASS Count It Chromium: current/reopened name/class, Copy/Try/Classroom/Program gating, stale links, warning/focus/clipboard fallback/keyboard retry, narrow layout');
} finally {await browser.close();}
