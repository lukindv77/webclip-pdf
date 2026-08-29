# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy
- Always fresh-fetch `main` before analysis or write operations.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused. Before allocating a new number, check the canonical registry ranges, all relevant `project_docs/AUDIT_DELTA_*.md`, closure/history evidence and current source.
- Historical test results are evidence only. Do not claim tests were rerun unless they were actually rerun on the current runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA gate.

## Current audit registry
The P-number registry is intentionally partitioned into two non-overlapping ranges until a full lossless merge is performed:

1. `project_docs/PRIORITIES_P0_P1_P2.md` — historical canonical registry through **P1-194**.
2. `project_docs/AUDIT_CONSOLIDATION_INDEX.md` — canonical late-number supplement for **P1-195 through P1-225**, plus evidence-retention and migration rules.

**P1-195…P1-225 are occupied.** Do not infer that any later integer is free without repository-wide semantic/history duplicate-check.

Detailed audit state is reconstructed from:
1. the two registry ranges above;
2. all current `project_docs/AUDIT_DELTA_*.md` for detailed source proof, refinements, invariants and regressions;
3. current runtime/source files;
4. focused historical closure/test/deep-audit evidence when needed to validate an existing P-item, reopen or numbering decision.

A detailed delta is not obsolete merely because its number is now indexed. Historical audit files remain in the working tree until their unique evidence has been migrated and verified according to `AUDIT_CONSOLIDATION_INDEX.md`.

## Current handoff
The only current handoff checkpoint in the working tree is:
`project_docs/HANDOFF_2026-08-29/`

Read its four text files when restoring audit context:
- `START_PROMPT.md`
- `HANDOFF_CONTEXT.md`
- `RECENT_COMMITS.md`
- `RESTORE_ARCHIVE.md`

Fresh `main` and the current audit registries always override stale handoff statements. Older handoff folders and embedded handoff ZIP snapshots are intentionally not kept in the current tree; their historical contents remain available through Git history.

## Build artifacts
Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The published `0.9.8` artifact remains available from its GitHub Release. Its former duplicate under `builds/0.9.8/` is intentionally not part of the current working tree.
