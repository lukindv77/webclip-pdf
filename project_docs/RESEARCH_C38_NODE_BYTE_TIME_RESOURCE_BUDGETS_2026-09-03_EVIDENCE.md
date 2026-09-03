# C38 compact evidence — Node / byte / time / resource budgets — 2026-09-03

Canonical source baseline: `b07547385c5aed6a631d7e263f1f9d9c35da2c56`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)`**.

No new P-code and no Registry wording/status change. `P0-064` remains DONE and is used only as a positive architecture example.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33707672607`;
- job `100500232853`;
- exact accepted workflow head `2696ad9b2f9b19f9cdbbeb985af80feb14944dc2`;
- conclusion SUCCESS;
- raw result receipt commit `d619a67205e11a4ae89e8dd609e7ecd6bdaaabf7`;
- raw result SHA-256 `145f435455e14115676e09b764b89032b178339114fd96c59d41260c572b6456`;
- durable harness `project_tools/research_c38_budgets.py`.

A later automatic Chrome 152 rerun was caused by the temporary workflow's push trigger after handoff. It did not change the relevant production source and is not promoted over the accepted evidence above. The temporary workflow is removed from the final C38 delivery.

## Fresh matrix

### Early frame preflight — positive control

The flattened-frame preflight stops incrementally at the node budget: limit `5000`, observed `5001`, `ok=false`, `reason=nodes`; the same preflight also carries a `2,000,000` text-character cap and an `8,388,608` estimated-byte cap. This is the desired early-admission shape.

### Resource selected-element scan — positive control

With `12002` selected descendants the resource TreeWalker reports `scanTruncated=true` and stops at its `5000`-element budget. Prepare time is approximately `0.340s`.

### P1-167 neighboring link collector

For `12000` selected links, `querySelectorAll('a[href], area[href]')` materializes all `12000` matches and all receive the temporary WebClip href marker, even while the resource report says `scanTruncated=true`. Cleanup returns marker count to zero. Prepare time is approximately `0.302s`.

The resource TreeWalker cap therefore does not bound neighboring preparation collectors.

### P1-167 disclosure time domain

With `400` disclosure controls, all `400` are expanded and preparation takes `17.102823178...s`. The resource report still carries `deadlineMs=15000`, resource elapsed is only about `9ms`, and `deadlineExceeded=false`. The `P0-067` page-click guard remains a positive control with `blockedPageClicks=400`; the physical PDF has `16` pages.

The nominal 15-second resource deadline is not an overall PDF preparation deadline.

### P1-167 diagnostics acquisition

With a `2,097,152`-character body, diagnostics materialize/read the full `2,097,152` characters before bounded reporting. Bounded report output therefore does not bound diagnostic string acquisition.

### P1-003 resource side-effect admission

With `800` lazy images, requests before prepare are `0`; preparation promotes `src` for all `800`, producing `800` actual HTTP requests. The resource report itself is capped at task limit `500`, with `attempted=500`, `loaded=500`, `omittedByLimit=1` and `deadlineExceeded=false`; prepare time is approximately `2.707s`.

The task/report cap therefore does not bound renderer/network side effects because common lazy attributes are promoted before task enumeration/admission.

## Source-level supporting boundary

Snapshot serialization still applies post-hoc `includes.slice(0, 250)` / `excludes.slice(0, 250)`. This keeps `P1-154` as supporting/source evidence: bounded serialized output is not an aggregate live Include/Exclude admission budget.

## Owner reconciliation

Fresh Registry reconciliation maps the shared node/time/mutation/string-budget finding to **P1-167 ACTIVE** and the pre-admission resource/network finding to **P1-003 ACTIVE**, with **P1-154 ACTIVE** supporting/source. `P0-064 DONE` is not reopened. No new P-code is warranted.

## Architecture direction

Use one shared preparation governor across relevant work domains; perform incremental traversal/admission before materialization or mutation; admit resource work before URL promotion/network side effects; bound diagnostic acquisition rather than only emitted report text; and surface truthful partial/failure semantics when any shared budget is reached.

Detailed evidence: `RESEARCH_FULL_RESTART_C38_NODE_BYTE_TIME_RESOURCE_BUDGETS_2026-09-03.md`.
