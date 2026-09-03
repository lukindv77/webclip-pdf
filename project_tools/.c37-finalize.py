from pathlib import Path

p = Path('project_docs/RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md')
text = p.read_text(encoding='utf-8')
old = '| C37 | Failure/retry/rollback/convergence | `NOT-TRIAGED / UNKNOWN` |'
new = '| C37 | Failure/retry/rollback/convergence | `L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)` |'
if old not in text:
    raise SystemExit('C37 baseline row did not match expected current text')
text = text.replace(old, new, 1)
checkpoint = '''

## Fresh continuation checkpoint — focused C37 Failure / retry / rollback / convergence

`RESEARCH_FULL_RESTART_C37_FAILURE_RETRY_ROLLBACK_2026-09-03.md` records the accepted fresh C37 exact-source tranche on canonical source `a6be4cfdb7a3affd385479f04d333e75847ee94c`, exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, Google Chrome `151.0.7922.173`, workflow run `33702598102`, job `100484895616`, exact accepted workflow head `f5516c6f33e379d3fb9f99c0dcf666bda208d441`, conclusion SUCCESS and raw result SHA-256 `206ee2c9991f20864bc9f24e6c34fcbdd4e74e59c4d60914b58c137c4f9ddc36`.

Fresh clean retry is a positive convergence control: after a failure and after a successful retry, temporary header/style/wrapper/link-marker counts return to zero and the retry PDF remains selection-correct. Three host-supersession schedules remain broken: stale resource rollback overwrites a newer host `src` and the retry physically serializes the old red candidate (**P1-218**); wrapper cleanup disconnects a page-added child inserted after WebClip wrapped the image (**P1-219**); and a detached normalized link skips cleanup, then retry turns the temporary absolute href into the new rollback identity and permanently loses the authored relative href (**P1-221**).

Current source still exposes the already-owned remote restore ordering/settlement boundary under **P1-199/P1-214** (fire-and-forget restore followed by a second awaited call after shared bookkeeping may already be consumed), but C37 does not claim a fresh remote-frame L4 result. No new P-code, Registry wording/status, runtime or release change is warranted. C37 therefore advances to `L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)`. C38 — Node / byte / time / resource budgets — is the next sequential coordinate.
'''
anchor = '\n## Delivery rule\n'
if anchor not in text:
    raise SystemExit('Delivery rule anchor missing')
text = text.replace(anchor, checkpoint + anchor, 1)
p.write_text(text, encoding='utf-8')
