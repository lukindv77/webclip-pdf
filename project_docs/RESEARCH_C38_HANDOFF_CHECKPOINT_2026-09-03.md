# C38 interruption-safe handoff checkpoint — 2026-09-03

This file is a **working checkpoint only**, not canonical research acceptance and not P-code/status authority.

Canonical source baseline when C38 started: `b07547385c5aed6a631d7e263f1f9d9c35da2c56`.
Working branch: `research/evidence-c38-budgets-2026-09-03`.

## Completed

- Fresh current-source inspection for C38 node/byte/time/resource budgets.
- Mandatory external comparison/research for large-DOM and capture-budget failure modes.
- Durable exact-source harness: `project_tools/research_c38_budgets.py`.
- Physical Chrome evidence run `33707672607`, job `100500232853`, exact workflow head `2696ad9b2f9b19f9cdbbeb985af80feb14944dc2`, Chrome `151.0.7922.173`, conclusion SUCCESS.
- Raw result SHA-256: `145f435455e14115676e09b764b89032b178339114fd96c59d41260c572b6456`.
- Raw receipt currently stored temporarily as `project_tools/.c38-physical-result.json`.

Fresh quantitative findings:

- resource TreeWalker correctly stops at 5,000 selected elements (`scanTruncated=true`) on a >12k selected subtree;
- neighboring link collection still materializes and temporarily marks all 12,000 matching links;
- 400 disclosure controls take about 17.10 s in preparation even though the resource-report deadline is 15 s, proving it is not a shared operation deadline;
- diagnostics read a complete 2,097,152-character body string before reporting a bounded diagnostic payload;
- with 800 lazy `data-src` images, all 800 source URLs are promoted/requested while the resource task/report limit is 500 (`attempted=500`, actual requests=800);
- the existing flattened-frame preflight correctly rejects node 5,001 against the 5,000-node budget and remains the positive architectural control.

Provisional owner reconciliation (must be rechecked fresh before final integration):

- `P1-167 ACTIVE` — primary shared node/time/mutation/string preparation budget owner;
- `P1-003 ACTIVE` — resource-task lifetime/actual side-effect vs task/report-limit owner;
- `P1-154 ACTIVE` — supporting aggregate selection/snapshot admission context;
- no new P-code warranted from the fresh C38 result.

Provisional C38 classification:

`L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)`

## Important TOCTOU note

An intermediate detailed-evidence commit from the prior instrumental window was not present in the later bot-persisted branch tree. The current branch state, not that old intermediate SHA, is authoritative. Recreate/verify final detailed evidence from the durable harness + raw receipt above rather than assuming the older intermediate file still exists.

## Remaining delivery work

1. Fresh-fetch `main`, open PRs/issues and this branch/head.
2. Reconfirm current source blobs and that no production source changed since C38 baseline.
3. Create durable detailed C38 evidence from the accepted raw matrix, including external research and rejected/positive hypotheses.
4. Create compact C38 evidence receipt.
5. Advance only the C38 row/checkpoint in `RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md`.
6. Remove temporary `.github/workflows/research-c38-budgets.yml`, `.c38-physical-result.json`, and this handoff checkpoint once equivalent durable final evidence/PR body exists.
7. Ensure the final net diff is docs/tooling only and bounded.
8. Finalize PR body/change contract, run Repository Integrity on the exact final PR head, do fresh TOCTOU, squash merge with expected head, and require post-merge Repository Integrity on exact new `main`.
9. Then move to C39 — Privacy / data minimization.

Do not build/tag/release as part of this checkpoint. Manifest/runtime remain `0.9.8` and release readiness remains `NOT READY` unless fresh canonical GitHub state says otherwise.
