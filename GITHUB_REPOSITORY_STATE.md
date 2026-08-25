# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` until real release QA and an explicit user request for a new build/release.
- Related changes are accumulated and pushed as one meaningful commit or a small coherent series at task completion, a self-contained major intermediate stage, or an important pre-risk checkpoint.
- Do not create a commit for every small harness/docs/manifest/intermediate edit.
- Builds and GitHub Releases are created only on explicit user request.
- Handoff archive/prompt for a new chat is created/uploaded only on explicit user request.

## Canonical source/build checkpoint

- Canonical source snapshot for the currently published 0.9.8 build: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Handoff pointer: `handoff/LATEST.md`.
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`.

Historical incomplete `.bootstrap` transport and its temporary synchronization workflow were removed from active `main`; they must not be restored.

The handoff archive is a checkpoint convenience. The authoritative live working tree is always the current `main` branch plus the audit/closure documentation committed with it.
