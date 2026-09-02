from pathlib import Path
p=Path('project_docs/RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md')
t=p.read_text(encoding='utf-8')
old='| C34 | Animated image/GIF frame | `NOT-TRIAGED / UNKNOWN` |'
new='| C34 | Animated image/GIF frame | `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)` |'
if old not in t: raise SystemExit('C34 baseline row mismatch')
t=t.replace(old,new,1)
checkpoint='''\n\n## Fresh continuation checkpoint — focused C34 Animated image/GIF frame\n\n`RESEARCH_FULL_RESTART_C34_ANIMATED_IMAGE_FRAME_2026-09-02.md` records the accepted C34 exact-source tranche on canonical source `ba76db1e68ed2855f29fc040ed0ad40bfb898a7f`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Chrome `151.0.7922.173`, workflow run `33655118948`, job `100331638249`, exact workflow head `ceb314d811404886cdbfdcd93321015ce8011c07`, conclusion SUCCESS and result SHA-256 `734d5ece256669f898aa1d1bca141f358c0bf610e06f5027dd12da2981ddf844`.\n\nThe admitted GIF is directly observed on its green second frame (`30,800` green pixels), while direct Chromium and the current WebClip selected PDF both serialize an embedded red first/default frame. WebClip's resource report remains clean (`attempted=2, loaded=2, failed=0`). A static green PNG and the exact green admission screenshot bytes re-served as a static PNG both remain green embedded images through the same WebClip PDF path. This separates renderer-resource readiness from admitted current-frame fidelity.\n\nDuplicate/root-cause reconciliation maps C34 to existing **P0-004 / P0-070 ACTIVE**, with **P1-003 ACTIVE** supporting readiness semantics. No new P-code or Registry status/writing change is warranted. C34 advances to `L4-REVALIDATED / FINDING + POSITIVE/DIRECT/STATIC-PNG/ADMISSION-RASTER/EMBEDDED-IMAGE/CAUSAL CONTROLS (P0-004, P0-070; P1-003 supporting)`. C35 — Mutation during preparation / beforeprint / physical render cut — is next and requires completion/revalidation of its current `PARTIAL / L4 FINDING` state.\n'''
anchor='\n## Delivery rule\n'
if anchor not in t: raise SystemExit('Delivery rule anchor missing')
t=t.replace(anchor,checkpoint+anchor,1)
p.write_text(t,encoding='utf-8')
