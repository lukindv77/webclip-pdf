# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy
- Always fresh-fetch `main` before analysis or write operations.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused. Before allocating a new number, check `project_docs/PRIORITIES_P0_P1_P2.md`, all `project_docs/AUDIT_DELTA_*.md`, relevant closure/evidence history, and current source.
- Historical test results are evidence only. Do not claim tests were rerun unless they were actually rerun on the current runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA gate.

## Current audit sources
The active audit state is reconstructed from:
1. `project_docs/PRIORITIES_P0_P1_P2.md`;
2. all current `project_docs/AUDIT_DELTA_*.md`;
3. current runtime/source files;
4. focused historical closure/test evidence only when needed to validate an existing P-item or prevent duplicate numbering.

Canonical large audit documents can lag the newest audit deltas. A delta is not considered obsolete merely because it is not yet merged into the priority registry.

## Current handoff
The only current handoff checkpoint in the working tree is:
`project_docs/HANDOFF_2026-08-29/`

Read its four text files when restoring audit context:
- `START_PROMPT.md`
- `HANDOFF_CONTEXT.md`
- `RECENT_COMMITS.md`
- `RESTORE_ARCHIVE.md`

Older handoff folders and embedded handoff ZIP snapshots are intentionally not kept in the current tree. Their historical contents remain available through Git history.

## Build artifacts
Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The published `0.9.8` artifact remains available from its GitHub Release. Its former duplicate under `builds/0.9.8/` is intentionally not part of the current working tree.
