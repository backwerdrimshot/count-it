/* Which published Teaching Sequence step this round is, if any.
 *
 * The shop site publishes a sequence manifest and each assignment link carries
 * `seq` and `step` to name the step it opens:
 *
 *     ?seq=counting-rhythms&step=1&scope=beat&cells=quarter,eighths&…
 *
 * THESE ARE NOT SETTINGS, which is why they are here and not in the assignment
 * parser. A setting changes the round; these change nothing — the same link
 * with them removed runs the identical exercise, and the shop site's contract
 * check fails if any app declares them as configurable settings. They record
 * WHICH ASSIGNMENT this was, which belongs on the evidence for the same reason
 * a name belongs on a paper.
 *
 * Read from the link rather than derived from the seed on purpose: the seed is
 * a randomization input and changes for a retake, so a step identified by it
 * would move the moment a teacher reseeded, orphaning its own history.
 */

export interface SequenceStep {
  /** The sequence's stable id, e.g. "counting-rhythms". */
  readonly seq: string;
  /** Position in the DESIGNED sequence, so filling a gap later renumbers nothing. */
  readonly step: number;
}

/* A published sequence id is a slug. Anything else is a hand-typed link or an
   unrelated parameter that happens to be called `seq`, and stamping it onto
   evidence would assert an assignment that does not exist. */
const SEQUENCE_ID = /^[a-z][a-z0-9-]{0,63}$/;

export function parseSequenceStep(search: string): SequenceStep | null {
  const params = new URLSearchParams(search);
  const seq = (params.get("seq") ?? "").trim();
  const raw = (params.get("step") ?? "").trim();
  if (!SEQUENCE_ID.test(seq)) return null;
  /* Both or neither. A `seq` with no `step` names a sequence but not a place in
     it, and recording half an identity invites a consumer to guess the rest. */
  if (!/^\d{1,3}$/.test(raw)) return null;
  const step = Number(raw);
  if (step < 1) return null;
  return Object.freeze({ seq, step });
}

/** The step's stable id, the spelling the sequence manifest publishes. */
export function sequenceStepId(step: SequenceStep): string {
  return `${step.seq}#${step.step}`;
}
