import Link from "next/link";
import type { Metadata } from "next";
import { BEGINNER_PLAYING_CONNECTION, BEGINNER_RESPONSE_LESSON, BEGINNER_STEPS } from "../../src/assignment/beginner-v1";

export const metadata: Metadata = { title: "Quarter/pair bridge v1 | Count It", robots: { index: false, follow: false } };

export default function BeginnerPreview() {
  return <main className="app-shell" style={{ maxWidth: 900, margin: "auto", padding: "1.5rem" }}>
    <Link href="/">Count It</Link>
    <h1>Quarter/pair bridge v1</h1>
    <p><strong>Supplementary beginner progression · version 1</strong></p>
    <p>A short introduction, supported bars in two, three and four, then a separate reduced-support check. Every step uses quarter notes and paired eighths only.</p>
    <h2>Before choosing a count</h2>
    <p>{BEGINNER_RESPONSE_LESSON}</p>
    <p>The guide marks possible positions before answering; it highlights sounding starts after feedback. A supported score may reflect matching the guide to supplied choices. There is no pass threshold. Discuss errors and choose the next step with a teacher.</p>
    <ol>{BEGINNER_STEPS.map(step => <li key={step.id} style={{ marginBlock: "1.5rem" }}>
      <h2>{step.title}</h2><p>{step.description}</p>
      <dl>{Object.entries(step.prerequisites).map(([kind, words]) => <div key={kind}><dt><strong>{kind === "response" ? "Response vocabulary" : kind === "meter" ? "Meter and beat tracking" : kind === "support" ? "Support and interpretation" : "Notation vocabulary"}</strong></dt><dd>{words}</dd></div>)}</dl>
      <p>{step.count} responses · {step.scope === "beat" ? "one beat" : `complete ${step.meter.replace("-", "/")} bar`} · guide {step.guide} · feedback {step.feedback === "end" ? "at the end" : "after each response"} · {step.retry === "off" ? "retry button off" : "same-round practice replays"}</p>
      <a href={`/${step.query}`}>Try {step.title.toLowerCase()}</a>
    </li>)}</ol>
    <h2>Connect the reading to playing</h2><p>{BEGINNER_PLAYING_CONNECTION}</p>
    <p>Attempts and optional reports stay on this device until you choose to share them. Local attempt counts can be cleared or changed by using another browser; they do not establish a student’s first-ever attempt. Optional class-code reporting is unchanged.</p>
  </main>;
}
