# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` until real release QA and an explicit user request for a new build/release.
- GitHub `main` is the only source of truth for continued work. Never reconstruct production code from a handoff archive when a newer `main` exists.
- During the current full audit, confirmed findings are synchronized to GitHub in small coherent docs-only batches as the audit progresses.
- Builds and GitHub Releases are created only on explicit user request.
- Handoff archive/prompt is created only on explicit user request. The 2026-08-26 10:47 +07 checkpoint was explicitly requested.

## Product/build checkpoints

- Currently published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Current product runtime/config code last changed at P0-063 commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`.
- Audit/handoff source HEAD before the new checkpoint packaging: `a57042fe82e9c8659a6241b23728f613ae905531`.
- Comparing P0-063 product commit to that audit HEAD changes only `DEEP_AUDIT_2026-08-25.md` and `project_docs/PRIORITIES_P0_P1_P2.md`.
- Last verified product gate: 88/88 JS syntax PASS and 74/74 deterministic tests PASS.

## Current handoff

- Handoff pointer: `handoff/LATEST.md`.
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`.
- Current-state note: `handoff/CURRENT_STATE_2026-08-26_1047.md`.
- Archive: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`.
- Archive checksum: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip.sha256`.
- Archive contents manifest: `handoff/ARCHIVE_MANIFEST_2026-08-26_1047.txt`.

Historical incomplete `.bootstrap` transport and temporary synchronization workflows are not part of the active tree and must not be restored.

The handoff archive is a checkpoint convenience. The authoritative live working tree is always the **current** `main` branch plus the audit/closure documentation committed with it.
