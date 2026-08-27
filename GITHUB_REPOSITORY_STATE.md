# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` / Chrome >=118 until real release QA and explicit user request for a build/release.
- GitHub `main` is the only source of truth for continued work.
- Confirmed audit findings are synchronized to GitHub in coherent docs-only batches.
- Before every write, fresh-fetch `main`; preserve newer commits.
- Stable P-numbers are never reused; search canonical + all audit-delta/closure files before allocating.
- Builds/Releases only on explicit user request.

## Product/build checkpoints

- Published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Historical requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Pre-handoff audit source HEAD for the 2026-08-27 checkpoint: `e836b86f322713bf960626a6733bfaeafaf99411`.
- Pre-handoff source tree: `61e92fca5d8f0d6b6ff35e0e26f5bab498de7d89`.
- Last proven product gate: 88/88 JS syntax PASS + 74/74 deterministic tests PASS; not rerun for the recent docs-only audit/handoff stream.
- Real unpacked Chrome QA and real Yandex E2E remain release blockers.

## Audit registry caveat

The two large canonical audit documents can lag the newest evidence-reserved findings. The current state must be reconstructed from canonical files **plus all** `project_docs/AUDIT_DELTA_*.md`.

Fresh evidence-reserved/high-priority items include:
- `P0-079` operation-owned PDF bytes/cache;
- `P1-195` Yandex OAuth capability/scope truthfulness;
- `P1-196` Yandex OAuth validity/lifetime truthfulness;
- `P1-197` OperationLog history generation (already present in its audit delta);
- `P1-198` trusted worker-owned operation identity;
- `P1-199` cross-origin print generation;
- `P1-200` cross-origin selection/control generation.

Do not assume any subsequent number is free without a fresh whole-repository search.

## Current handoff — 2026-08-27 16:53 +07

- Pointer: `handoff/LATEST.md`
- Prompt: `PROMPT_FOR_NEW_CHAT.md`
- Dated prompt: `handoff/NEW_CHAT_PROMPT_2026-08-27_1653.md`
- State: `handoff/CURRENT_STATE_2026-08-27_1653.md`
- Machine state: `handoff/CURRENT_STATE_2026-08-27_1653.json`
- Audit index: `handoff/AUDIT_INDEX_2026-08-27_1653.md`
- Source pointer: `handoff/SOURCE_POINTER_2026-08-27_1653.txt`
- Full base snapshot: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`
- Full base SHA-256: `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`
- Current context/audit delta archive: `handoff/WebClip_Handoff_Audit_Delta_2026-08-27_1653_e836b86f.zip`
- Delta SHA-256: `2b5badfe603580313c244cb019712f1d286ea5f9e8f7392e84c27b225302bc2c`
- Delta checksum: same path + `.sha256`
- Composition manifest: `handoff/ARCHIVE_MANIFEST_2026-08-27_1653.txt`

The handoff is intentionally composite: the existing full snapshot preserves source; immutable Git history/current `main` preserves all later code/docs exactly; the dated delta ZIP preserves current audit/context/prompt state. **Current GitHub `main` always wins over every archive.**
