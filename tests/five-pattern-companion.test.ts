import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseAssignment,serializeAssignment,roundKey,uniqueQuestions} from '../src/assignment';
import {SIXTEENTH_APPLICATION,SIXTEENTH_INTRO,earlyInstruction,SIXTEENTH_BAR_LESSON} from '../src/assignment/early-v2';
import {generateQuestions} from '../src/question/generator';
import {getPromptId,getCellsByIds} from '../src/rhythm';
const proposal=JSON.parse(readFileSync(new URL('../docs/five-pattern-companion-proposal.json',import.meta.url),'utf8'));
it('proposes familiar matched bars with separately keyed support; preserves original contracts',()=>{
 const parsed=parseAssignment(proposal.query);if(!parsed.ok)throw Error(parsed.error.message);const a=parsed.assignment,b=SIXTEENTH_APPLICATION.assignment;
 expect(parseAssignment(serializeAssignment(a))).toEqual(parsed);
 expect(a).toMatchObject({guide:'off',feedback:'end',retry:'off',hints:false,passing:null,timeLimit:null});
 for(const key of ['cells','scope','meter','count','seed','system','response'] as const)expect(a[key]).toEqual(b[key]);
 expect(roundKey(a)).not.toEqual(roundKey(b));
 expect(SIXTEENTH_INTRO.assignment.seed).toBe('cr-early-v2-sixteenth-intro');expect(b.seed).toBe('cr-early-v2-sixteenth-bars');
 const generate=(x:typeof a)=>generateQuestions({level:x.level,scope:x.scope,meter:x.meter!,system:x.system,response:x.response,cells:x.cells!,count:x.count!,seed:x.seed!});
 const questions=generate(a);expect(questions).toEqual(generate(b));expect(uniqueQuestions({...a,meter:a.meter!})).toBe(625);
 expect(new Set(questions.map(q=>getPromptId(q.prompt))).size).toBe(8);expect(new Set(questions.map(q=>q.correctAnswer)).size).toBe(8);
 const exposure=Object.fromEntries(a.cells!.map(id=>[id,questions.flatMap(q=>q.prompt.cells).filter(c=>c.id===id).length]));
 for(const n of Object.values(exposure))expect(n).toBeGreaterThan(0);
 for(const q of questions){expect(q.prompt.cells).toHaveLength(4);const expected=q.prompt.cells.map((c,i)=>c.activePositions.map(p=>p===0?String(i+1):['','e','&','a'][p]).join(' ')).join(' | ');expect(q.correctAnswer).toBe(expected);expect(q.choices.filter(c=>c.isCorrect)).toHaveLength(1);expect(new Set(q.choices.map(c=>c.label)).size).toBe(4);}
 console.log('Companion coverage',JSON.stringify(exposure));
});

it('documents retained instruction, Settings pattern labels and multiple-choice support',()=>{
 const parsed=parseAssignment(proposal.query);if(!parsed.ok)throw Error(parsed.error.message);
 expect(earlyInstruction(parsed.assignment)).toBe(SIXTEENTH_BAR_LESSON);
 expect(proposal.retainedSupports.settingsPatternLabels).toEqual(getCellsByIds(parsed.assignment.cells!).map(c=>c.shortLabel));
 const review=readFileSync(new URL('../docs/five-pattern-companion-review.md',import.meta.url),'utf8');
 for(const phrase of ['early bar-reading instruction','number e & a','five named pattern labels in Settings','four multiple-choice answers','not an exact-bar answer leak'])expect(review).toContain(phrase);
 for(const label of proposal.retainedSupports.settingsPatternLabels)expect(review).toContain('"'+label+'"');
 expect(proposal.retainedSupports.barReadingInstruction).toContain('Early bar-reading instruction remains visible');
 expect(proposal.retainedSupports.answerChoices).toContain('Four multiple-choice answers');
});
