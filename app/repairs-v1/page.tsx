import Link from "next/link";
import type {Metadata} from "next";
import {REPAIR_STEPS,REPAIR_PLAYING_CONNECTION} from "../../src/assignment/repairs-v1";
export const metadata:Metadata={title:"Counting repairs v1 | Count It",robots:{index:false,follow:false}};
export default function RepairPreview(){return <main className="app-shell" style={{maxWidth:900,margin:"auto",padding:"1.5rem"}}>
 <Link href="/">Count It</Link><h1>Supported counting repairs v1</h1>
 <p><strong>Supplementary supported practice · version 1</strong></p>
 <p>Three separate entry points into the existing sequence, placed before steps 4, 7 and 10. Prepare each branch’s prerequisites first; these are not three consecutive levels. All activities and linked public materials remain free.</p>
 {REPAIR_STEPS.map(step=><section key={step.id} style={{marginBlock:"2rem"}}><h2>{step.title} — before legacy step {step.beforeLegacyStep}</h2><p>{step.description}</p><p>{step.lesson}</p>
 <dl>{Object.entries(step.prerequisites).map(([kind,words])=><div key={kind}><dt><strong>{kind}</strong></dt><dd>{words}</dd></div>)}</dl>
 <p><a href={step.links.lesson}>Prepare the notation lesson</a> · <a href={step.links.prerequisite}>Prerequisite overview</a> · <a href={step.links.practiceKit}>Free teacher-led practice and checks</a></p>
 <p>{step.links.prerequisiteRequirement}</p>
 {step.links.prerequisiteLaunches.map((url,i)=><p key={url}><a href={url}>Original prerequisite step {step.links.prerequisiteLegacySteps[i]}</a></p>)}
 <a href={`/${step.query}`}>Try {step.title.toLowerCase()}</a>
 <p>{step.links.nextRequirement}</p><a href={step.links.nextLaunch}>Next: original sequence, step {step.links.nextLegacyStep}</a>
 </section>)}
 <h2>Observe playing separately</h2><p>{REPAIR_PLAYING_CONNECTION}</p><p>Support, feedback and retries are recorded conditions. Local history can be cleared and does not prove a first-ever attempt. No student account, new backend or automatic score transmission is added. Optional class-code reporting is unchanged.</p>
 </main>}
