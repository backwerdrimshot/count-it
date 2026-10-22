/* Names-free check for teacher-typed text that goes into a shareable link.
   Ported from Praxis Program's seat-label check (praxis-platform
   apps/shared/praxis-seat-label-check.js). Runs only in the browser; it never
   stores, sends or logs the text it reads.
   "block": an SSN-like number, a student ID marker ("ID 1234") or a run of 5+
   digits. The link is not made.
   "warn": looks like a person's name, an email address or a phone number.
   "ok": nothing found. */
const VOCABULARY = new Set("snare snares tenor tenors quad quads quint quints bass basses drum drums drumline line battery cymbal cymbals cym cyms crash crashes ride splash china hihat hi-hat hat hats suspended sus gong gongs tam tam-tam tamtam pit front frontline keys key keyboard keyboards mallet mallets marimba marimbas vibe vibes vibraphone vibraphones xylophone xylo xylos glockenspiel glock glocks bell bells orchestra chimes chime crotales celesta timpani timp timps tympani kettle kettledrum kettledrums auxiliary aux auxes perc percussion percussionist drumset drumkit kit set trap traps toms tom rack floor kick synth synthesizer synths electronics electronic sampler pad pads spd mixer sound audio triangle tambourine tamb castanets woodblock woodblocks wood block blocks temple shaker shakers congas conga bongos bongo cajon guiro claves clave maracas cowbell cowbells agogo timbales djembe whip ratchet slapstick slap mark tree windchimes wind chimes anvil brake siren steel pan pans steelpan tenor-pan cello guitar piano harp concert symphonic jazz marching varsity jv nonvarsity non-varsity freshman sub-varsity beginning beginner beginners intermediate advanced honor region all-region all-state part parts seat seats chair chairs player players position spot section voice voices sub alternate alt alts solo soloist soloists feature featured duet trio quartet ensemble ensembles group groups band bands team first second third fourth fifth sixth seventh eighth ninth tenth primary principal assistant lead high low mid middle upper lower top bottom inside outside center centre left right stage upstage downstage field sideline sidelines row rows station stations rotation book a b c d e i ii iii iv v vi vii viii ix x and or the of with on in at to for no period class block day am pm fall spring winter summer season show movement mvt opener closer ballad halftime pregame contest uil tmea pas battery-snare front-ensemble tom-tom tom-toms bass-drum".split(" "));
const FIRST_NAMES = new Set("james john robert michael william david richard joseph thomas charles christopher daniel matthew anthony donald steven paul andrew joshua kenneth kevin brian george timothy ronald edward jason jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon benjamin samuel gregory alexander patrick frank raymond jack dennis jerry tyler aaron jose adam nathan henry zachary douglas peter kyle noah ethan jeremy walter christian keith roger terry austin sean gerald carl harold dylan arthur lawrence jordan jesse bryan billy bruce gabriel joe logan albert willie alan juan wayne elijah randy roy vincent ralph eugene russell bobby mason philip louis liam lucas aiden jayden caleb isaac luke owen hunter carter landon wyatt grayson levi julian isaiah eli josiah jaxon connor colton cameron evan gavin luis carlos jesus miguel diego angel alejandro adrian javier antonio francisco manuel ricardo eduardo fernando jorge mateo santiago emiliano sebastian leonardo marcos oscar pedro rafael sergio victor hector mary patricia jennifer linda elizabeth barbara susan jessica sarah karen lisa nancy betty margaret sandra ashley kimberly emily donna michelle carol amanda dorothy melissa deborah stephanie rebecca sharon laura cynthia kathleen amy angela shirley anna brenda pamela emma nicole helen samantha katherine christine debra rachel carolyn janet catherine maria heather diane ruth julie olivia joyce virginia victoria kelly lauren christina joan evelyn judith megan andrea cheryl hannah jacqueline martha gloria teresa ann sara madison frances kathryn janice jean abigail alice julia judy sophia grace denise amber doris marilyn danielle beverly isabella theresa diana natalie brittany charlotte marie kayla alexis lori ava mia harper amelia evelyn ella avery sofia camila aria scarlett chloe zoey riley nora lily layla zoe penelope addison aubrey ellie stella natalia leah hazel violet aurora savannah brooklyn bella claire skylar lucy paisley everly anna caroline nova genesis emilia kennedy maya willow kinsley naomi valentina ximena valeria camila lucia daniela gabriela fernanda mariana alejandra guadalupe juana rosa ana carmen veronica adriana yesenia esmeralda jasmine destiny alyssa brianna jade jaylen jalen deshawn darius malik jamal tyrone terrell marcus andre kendrick devin trevor".split(" "));
const SURNAMES = new Set("garcia martinez hernandez lopez gonzalez rodriguez perez sanchez ramirez flores rivera gomez torres diaz reyes cruz morales gutierrez ortiz ramos chavez castillo jimenez vasquez vazquez ruiz mendoza alvarez romero herrera medina aguilar moreno guerrero salinas trevino cantu rios delgado silva ortega smith johnson williams brown jones miller davis wilson anderson taylor thomas moore jackson martin lee thompson white harris clark lewis robinson walker young allen king wright scott hill green adams nelson baker hall campbell mitchell carter roberts phillips evans turner parker collins edwards stewart morris murphy cook rogers morgan peterson cooper reed bailey bell kelly howard ward cox richardson wood watson brooks bennett gray james hughes price sanders myers long ross foster nguyen tran".split(" ").filter((w) => !VOCABULARY.has(w)));
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u;
const PHONE = /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b|\b\d{3}[\s.-]\d{4}\b/;
const LONG_NUMBER = /(?<!\d)\d{5,}(?!\d)/;
const ID_MARKER = /\b(?:student\s*)?(?:id|sid)\s*(?:#|no\.?|number)?\s*:?\s*\d+/i;
const SSN_LIKE = /\b\d{3}-\d{2}-\d{4}\b/;
const WORD = /[\p{L}][\p{L}'’-]*/gu;
const CAPITALIZED = /^\p{Lu}[\p{Ll}'’-]+$/u;
const LAST_FIRST = /^\s*([\p{L}][\p{L}'’-]+)\s*,\s*([\p{L}][\p{L}'’-]+)/u;
const known = (word: string) => {
  const lower = word.toLowerCase();
  return VOCABULARY.has(lower) || lower.split("-").every((piece) => VOCABULARY.has(piece));
};
const personal = (word: string) => {
  const lower = word.toLowerCase().replace(/’/g, "'");
  return !known(word) && (FIRST_NAMES.has(lower) || SURNAMES.has(lower));
};
export const IDENTITY_HINT = "Don't use student names.";
export type IdentityVerdict = { verdict: "ok" | "warn" | "block"; message: string };
export function checkIdentity(value: unknown): IdentityVerdict {
  const text = typeof value === "string" ? value.normalize("NFC") : "";
  // Check explicit identifiers before masking phones; phone spans alone are warnings.
  if (SSN_LIKE.test(text) || ID_MARKER.test(text)
    || LONG_NUMBER.test(text.replace(new RegExp(PHONE.source, "g"), (span) => " ".repeat(span.length)))) {
    return { verdict: "block", message: "Remove the ID number. Links can't carry student IDs." };
  }
  if (EMAIL.test(text) || PHONE.test(text)) {
    return { verdict: "warn", message: "This looks like an email address or phone number. Links are shared, so leave contact details out." };
  }
  const tokens = text.match(WORD) || [];
  const lastFirst = text.match(LAST_FIRST);
  let nameLike = tokens.some(personal) || Boolean(lastFirst && !known(lastFirst[1]) && !known(lastFirst[2]));
  for (let i = 0; !nameLike && i < tokens.length - 1; i++) {
    nameLike = CAPITALIZED.test(tokens[i]) && CAPITALIZED.test(tokens[i + 1]) && !known(tokens[i]) && !known(tokens[i + 1]);
  }
  return nameLike
    ? { verdict: "warn", message: "This looks like a person's name. Don't use student names." }
    : { verdict: "ok", message: "" };
}

/** Check the actual outbound configuration, including reopened query values. */
export function checkAssignmentIdentity(link: string, name = ""): IdentityVerdict {
  const query = new URL(link, "https://count-it.backwerdrhythmshop.com").searchParams;
  const checks = [name, ...query.getAll("a"), ...query.getAll("class")].map(checkIdentity);
  return checks.find(check => check.verdict === "block")
    ?? checks.find(check => check.verdict === "warn") ?? checks[0];
}
