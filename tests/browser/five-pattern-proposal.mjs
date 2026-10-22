// Review-only proposed query; no catalog identity is registered.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {launch,BASE} from './harness.mjs';
const proposal=JSON.parse(readFileSync(new URL('../../docs/five-pattern-companion-proposal.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('../../docs/early-v2-integration.json',import.meta.url))).entries.find(e=>e.id==='counting-early-v2-6');
const browser=await launch();let checks=0;const errors=[];
try{for(const width of [320,768,1280])for(const colorScheme of ['light','dark'])for(const wrongFirst of [false,true]){
 const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/'+proposal.query,{waitUntil:'networkidle'});
 await page.locator('.answer-choice').first().waitFor();
 const instruction=page.locator('.beginner-response-lesson[role="note"]');
 assert.match(await instruction.innerText(),/Each beat has number e & a/);
 assert.match(await instruction.innerText(),/A silent beat-start does not remove that beat/);
 await page.getByRole('button',{name:/settings/i}).first().click();
 assert.equal(await page.getByLabel('Rhythms in this assignment').locator('small').innerText(),proposal.retainedSupports.settingsPatternLabels.join(' · '));
 await page.keyboard.press('Escape');checks++;
 const chosen=[];
 for(const [i,q]of fixture.questions.entries()){
  await page.locator('.answer-choice').first().waitFor();assert.equal(await page.locator('#practice-tab').isDisabled(),true);assert.equal(await page.locator('[data-guide-at]').count(),0);
  assert.equal(await page.locator('.answer-choice').count(),4);assert.equal(await page.getByRole('button',{name:'Listen to rhythm',exact:true}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const labels=await page.locator('.answer-choice strong').allTextContents(),at=wrongFirst&&i===0?labels.findIndex(label=>label!==q.correctAnswer):labels.indexOf(q.correctAnswer);assert.ok(at>=0);chosen.push(labels[at]);
  await page.keyboard.press(String(at+1));assert.equal(await page.locator('.answer-choice.is-correct,.answer-choice.is-incorrect').count(),0);
  assert.equal(await page.locator('.choice-result').filter({hasText:'Correct'}).count(),0);
  const next=page.getByRole('button',{name:i===7?'See results':'Next question',exact:true});await next.click();checks++;
 }
 await page.getByRole('heading',{name:`You counted ${wrongFirst?7:8} of 8 correctly.`}).waitFor();
 assert.equal(await page.getByRole('button',{name:/try again|retry|new questions/i}).count(),0);
 assert.equal(await page.locator('.result-review').getAttribute('open'),'');
 const models=page.locator('.review-list > li');assert.equal(await models.count(),8);
 for(const [i,q]of fixture.questions.entries()){
  const model=models.nth(i);assert.equal(await model.locator('svg').count(),1);
  assert.deepEqual(await model.locator('.review-answers dd').allTextContents(),[chosen[i],q.correctAnswer]);
  assert.equal(await model.locator('.review-verdict').textContent(),wrongFirst&&i===0?'Not this time':'Correct');
  const explanation=q.correctAnswer.split(' | ').map((count,j)=>`Beat ${j+1}: ${count}.`).join(' ');
  assert.equal(await model.locator('.review-why').innerText(),explanation);checks++;
 }
 assert.equal(await page.locator('#practice-tab').isDisabled(),false);
 await page.locator('#practice-tab').click();await page.locator('.practice-card').waitFor();
 assert.equal(await page.getByRole('button',{name:'Listen to rhythm',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Reveal the count',exact:true}).click();
 assert.ok(await page.locator('.reveal-panel.is-revealed strong').innerText());
 assert.ok(await page.locator('.explanation').innerText());await ctx.close();checks++;
}assert.deepEqual(errors,[]);console.log(`PASS ${checks} proposed companion browser groups, correct/wrong keyboard rounds, all result models and post-completion Practice/playback at 320/768/1280 light/dark; no page errors`);}finally{await browser.close();}
