// Review-only proposed query; no catalog identity is registered.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {launch,BASE} from './harness.mjs';
const proposal=JSON.parse(readFileSync(new URL('../../docs/five-pattern-companion-proposal.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('../../docs/early-v2-integration.json',import.meta.url))).entries.find(e=>e.id==='counting-early-v2-6');
const browser=await launch();let checks=0;const errors=[];
try{for(const width of [320,768,1280])for(const colorScheme of ['light','dark']){
 const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/'+proposal.query,{waitUntil:'networkidle'});
 await page.locator('.answer-choice').first().waitFor();
 const instruction=page.locator('.beginner-response-lesson[role="note"]');
 assert.match(await instruction.innerText(),/Each beat has number e & a/);
 assert.match(await instruction.innerText(),/A silent beat-start does not remove that beat/);
 await page.getByRole('button',{name:/settings/i}).first().click();
 assert.equal(await page.getByLabel('Rhythms in this assignment').locator('small').innerText(),proposal.retainedSupports.settingsPatternLabels.join(' · '));
 await page.keyboard.press('Escape');checks++;
 for(const [i,q]of fixture.questions.entries()){
  await page.locator('.answer-choice').first().waitFor();assert.equal(await page.locator('#practice-tab').isDisabled(),true);assert.equal(await page.locator('[data-guide-at]').count(),0);
  assert.equal(await page.locator('.answer-choice').count(),4);assert.equal(await page.getByRole('button',{name:/play rhythm/i}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const labels=await page.locator('.answer-choice strong').allTextContents(),at=labels.indexOf(q.correctAnswer);assert.ok(at>=0);
  await page.keyboard.press(String(at+1));assert.equal(await page.locator('.answer-choice.is-correct,.answer-choice.is-incorrect').count(),0);
  assert.equal(await page.locator('.choice-result').filter({hasText:'Correct'}).count(),0);
  const next=page.getByRole('button',{name:i===7?'See results':'Next question',exact:true});await next.click();checks++;
 }
 await page.getByRole('heading',{name:'You counted 8 of 8 correctly.'}).waitFor();
 assert.equal(await page.getByRole('button',{name:/try again|retry|new questions/i}).count(),0);
 assert.ok(await page.locator('.result-review').count());await ctx.close();checks++;
}assert.deepEqual(errors,[]);console.log(`PASS ${checks} proposed companion browser groups, keyboard rounds at 320/768/1280 light/dark; no page errors`);}finally{await browser.close();}
