# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` until real release QA and explicit user request for a build/release.
- GitHub `main` is the only source of truth for continued work.
- During the full audit, stable confirmed findings are synchronized to GitHub in coherent docs-only batches.
- Builds/Releases only on explicit user request.
- Handoff archive/prompt only on explicit user request. This checkpoint was requested on 2026-08-26 22:27 +07:00.

## Product/build checkpoints

- Published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Last production runtime/config change: P0-063 `ef0e12bda980d947b8a02da816cf6f64be47ceb8`.
- Handoff source HEAD: `66fd5f828639a9d29f85013fedd4185cd4168e09`.
- Last product gate: 88/88 JS syntax PASS + 74/74 deterministic tests PASS; not rerun for docs-only audit/handoff syncs.
- Registry at source HEAD: P0-078 / P1-194 / P2-019.

## Current handoff

- Pointer: `handoff/LATEST.md`
- Prompt: `PROMPT_FOR_NEW_CHAT.md`
- State: `handoff/CURRENT_STATE_2026-08-26_2227.md`
- Full base snapshot: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip` (SHA-256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`)
- Current delta archive: `handoff/WebClip_Handoff_Audit_Delta_2026-08-26_2227_66fd5f82.zip`
- Delta checksum: same path + `.sha256`
- Composition/manifest: `handoff/ARCHIVE_MANIFEST_2026-08-26_2227.txt`

The handoff is intentionally composite because the complete 10:47 snapshot already contains all production/source/tests/architecture and production did not change afterward; the 22:27 delta captures all newer audit/context/prompt state. Current GitHub `main` always wins over both archives.
