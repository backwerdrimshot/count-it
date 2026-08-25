# Vendored: Backwerd notation assets

Copied from the Backwerd notation SVG library — canonical source:
`backwerdrimshot/praxis-platform` → `data/notation-svg/` (@ eaad852, on
branch `claude/notion-asset-library-7hlo1c` until merged). **Do not edit
these files here**; update by re-copying from the canonical directory, whose
README documents the conventions (250 font units per staff space, SMuFL
semantic origins, `currentColor` fills, y-up path data flipped with
`scale(1,-1)`) and the regeneration scripts.

Contents:

- `notation-lib.js` — 68-glyph rhythm-teaching core as a classic script
  (works over `file://`): `BackwerdNotation.svg("note-quarter-up",
  { height: 40 })` returns themed inline SVG; `BackwerdNotation.GLYPHS`
  carries raw paths and viewBoxes for custom drawing. Other subsets
  (pictograms, --all) regenerate upstream via `compose-js.mjs`.
- `LICENSE-bravura.txt` — the outlines are extracted from Bravura (the
  SMuFL reference font), © Steinberg Media Technologies GmbH, SIL OFL 1.1
  with Reserved Font Name "Bravura"; the licence travels with the outlines.
- `rhythms/` — 24 composed rhythm cells (the "1 e & a" counting vocabulary,
  triplets, rests, and the percussion ornament cells: diddles, rolls, buzz,
  flam, drag) as stave-less SVG cards; `manifest.json` carries each cell's
  counting syllables.
