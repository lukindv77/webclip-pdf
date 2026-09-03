from pathlib import Path

p = Path('project_docs/RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md')
s = p.read_text(encoding='utf-8')
replacements = [
    (
        "| C43 | Journal / provenance / exact artifact linkage | `NOT-TRIAGED / UNKNOWN` |",
        "| C43 | Journal / provenance / exact artifact linkage | `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)` |",
    ),
    (
        "| C43 | OPEN — unknown | Trace one local and one remote artifact from admitted document/PDF hash through cache/checkpoint/final append; inject Journal revision change during finalization and prove artifact, URL, operation and entry provenance remain one exact generation. | P0-070, P0-076, P1-206; P1-190/P1-216 supporting | B2/B6/B7/B8; deterministic race plus physical artifact |",
        "| C43 | OPEN — L4 partial; remote exact-object linkage remains | With an explicitly authorized Yandex test context, carry one exact PDF digest through immutable cache/remote checkpoint/upload/object/publication/final Journal append and reconcile it after unknown/retry; keep the accepted local stale-finalization CAS control and prove the remote object/public link belongs to that exact digest and operation generation. | P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source | B2/B6/B7/B8; real Yandex object/publication L5 plus exact digest provenance |",
    ),
    (
        "Execution stays sequential unless an earlier row exposes a cross-boundary blocker: **C41's native/restart L5 continuation remains next; C42 is queued**. External-account/user-owned UI work must not be simulated as L5; unavailable external prerequisites remain explicit blockers rather than inferred success.",
        "Execution stays sequential unless an earlier row exposes a cross-boundary blocker. **C41 remains blocked on real native/restart L5; C42 remains blocked on an explicitly authorized Yandex test account/root; C43 advances locally to L4 partial and its remote remainder shares the C42 external prerequisite. C44 is therefore the next locally executable coordinate.** External-account/user-owned UI work must not be simulated as L5; unavailable external prerequisites remain explicit blockers rather than inferred success.",
    ),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f'baseline contract changed: {old[:80]}')
    s = s.replace(old, new, 1)
checkpoint = '''

## Fresh continuation checkpoint — focused C43 Journal / provenance / exact artifact linkage

`RESEARCH_FULL_RESTART_C43_JOURNAL_PROVENANCE_2026-09-03.md` records the accepted local C43 tranche on canonical source `ddb56d6b7c7ceabb3dcfefcfc80d0d288e9efb28`, Chrome `151.0.7922.173`, workflow run `33720292239`, job `100537851083`, exact accepted workflow head `f727a96e77a748fce23dfa9ad97485cc6bf20c75`, conclusion SUCCESS and result SHA-256 `ed8ae54695d688d644407e4549c3a525de36be313039285744231a4b7d940149`.

Two current-path physical PDFs from the same URL had distinct hashes (`6ebc998486a22afdc620a87d2d8fcf4f2d29b06f87a27d2848cfb9ee662e58f6` and `91b6127452b44c40e6508c55b948e2b81d9f0dbbea08014b713c9e367770a677`). Current pending-Journal normalization and PDF-cache metadata carry operation/Journal identity and byte length but no cryptographic PDF digest, so those receipts do not by themselves prove which exact bytes reach finalization. A digest-bound control rejects the substituted physical generation.

Current `appendJournalEntry()` remains a positive stale-finalization control: required durable and pending checkpoints are re-read on the append write path, a concurrently removed durable checkpoint sets `durableCheckpointMissing` instead of resurrecting stale in-memory metadata, and the successful append path touches the Journal DB revision. This preserves P0-076's CAS direction but does not close P0-070's end-to-end exact-generation requirement.

Duplicate/root-cause reconciliation maps the physical-byte/provenance gap to **P0-070 ACTIVE**. **P0-076 ACTIVE** is positive here; **P1-206/P1-190/P1-216 ACTIVE** remain supporting/source contracts with different direct root causes. No new P-code or Registry wording/status change is warranted. C43 advances to `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)`. The remote object/public-link digest chain remains blocked on the same explicitly authorized Yandex prerequisite as C42.
'''
anchor = '\n## Delivery rule\n'
if anchor not in s:
    raise SystemExit('delivery-rule anchor missing')
s = s.replace(anchor, checkpoint + anchor, 1)
p.write_text(s, encoding='utf-8')
