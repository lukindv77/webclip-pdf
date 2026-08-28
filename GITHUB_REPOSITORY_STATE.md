# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy
- GitHub `main` is the only source of truth.
- Production manifest remains MV3 / `0.9.8` / Chrome >=118 until real release QA and explicit user request.
- Before every write, fresh-fetch `main`; preserve newer commits.
- Stable P-numbers are never reused; search canonical + all audit-delta/closure/history files before allocation.
- Builds/tags/Releases only on separate explicit user request after real QA.

## Handoff source state — 2026-08-28
Pre-handoff source HEAD: `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6`
Source tree: `d430775b544fbaa23fae4d1c5b0cea1643e4ad7e`
Last known runtime baseline with no later production changes: `e836b86f322713bf960626a6733bfaeafaf99411`.

Runtime blobs:
- service-worker.js `9c81d080051ee14d468b78c575dcd9f21ecda803`
- content.js `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
- journal.js `05cb89db3c322d547faf17b2359e92161d0bcbe7`
- manifest.json `259a7c3706e78c1a22021db7dc4769e8accdfb3e`

Inspected commits after the runtime baseline through the handoff source were audit/docs/handoff/noop changes, not production runtime changes.

## Product/build checkpoint
- Published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Historical tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Last proven product gate: **88/88 JS syntax PASS + 74/74 deterministic PASS**.
- Tests were not rerun for the recent docs-only audit/handoff stream.
- Real unpacked Chrome QA and real Yandex E2E remain release blockers.

## Audit registry caveat
Canonical large audit docs can lag newest evidence-reserved findings. Reconstruct state from canonical docs **plus all** `project_docs/AUDIT_DELTA_*.md`.

Fresh latest points include:
- P1-208 remote recovery phase fairness;
- P1-209 extension-page version refresh commit point;
- P1-210 outer user-operation transport-loss durable-state reconciliation;
- P1-124 `tabs.create` MV3 crash receipt refinement;
- P1-167 bounded diagnostic computation;
- P1-035/P1-043 active staging lifetime + quota reservation/admission.

**P1-201…P1-210 must not be assumed free.**

## Current handoff — 2026-08-28
- Pointer: `handoff/LATEST.md`
- State: `handoff/CURRENT_STATE_2026-08-28.md`
- Machine state: `handoff/CURRENT_STATE_2026-08-28.json`
- Audit index: `handoff/AUDIT_INDEX_2026-08-28.md`
- Prompt: `PROMPT_FOR_NEW_CHAT.md`
- Dated prompt: `handoff/NEW_CHAT_PROMPT_2026-08-28.md`
- Source pointer: `handoff/SOURCE_POINTER_2026-08-28.txt`
- Audit list: `handoff/AUDIT_FILES_2026-08-28.txt`
- Archive manifest: `handoff/ARCHIVE_MANIFEST_2026-08-28.txt`
- Context/audit archive: `handoff/WebClip_Handoff_Audit_Delta_2026-08-28_bcdf3e52.zip`
- Archive SHA-256: `0ff5cb8cb83610c4252d359501a38c94706ba9ffa57edca100b0b31512345abb`
- Checksum: `handoff/WebClip_Handoff_Audit_Delta_2026-08-28_bcdf3e52.zip.sha256`

Existing full source snapshot:
`handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`
SHA-256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`.

The new archive is intentionally context/audit only. Exact source is preserved by Git history/current `main`. **Current GitHub main always wins over every archive.**
