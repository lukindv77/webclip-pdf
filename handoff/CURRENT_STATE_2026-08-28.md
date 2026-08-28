# WebClip PDF — current handoff state — 2026-08-28

## Authority
`lukindv77/webclip-pdf` / `main` is the only source of truth. This handoff is context/recovery only.

Pre-handoff source HEAD: `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6`
Tree: `d430775b544fbaa23fae4d1c5b0cea1643e4ad7e`
Last known runtime baseline with no later production source change: `e836b86f322713bf960626a6733bfaeafaf99411`

Runtime blobs at the source HEAD:
- `service-worker.js`: `9c81d080051ee14d468b78c575dcd9f21ecda803`
- `content.js`: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
- `journal.js`: `05cb89db3c322d547faf17b2359e92161d0bcbe7`
- `manifest.json`: `259a7c3706e78c1a22021db7dc4769e8accdfb3e`

## Manifest / release
- MV3 / version `0.9.8` / Chrome >=118.
- Do not bump to 0.9.9.
- No build/tag/Release without separate explicit request after real release QA.
- Last proven product gate: **88/88 JS syntax + 74/74 deterministic PASS**.
- Tests were not rerun for the docs-only audit stream ending at the source HEAD.
- Real unpacked Chrome QA and real Yandex E2E remain release blockers.

## Recent docs-only audit commits
- `29aea17e760b9af395a5c1fa43ac800c7cfa0e3f` — reopen signed URL log redaction.
- `47b5f615ff170f399d3dd53004ea54af680e50f3` — consolidate multi-block refinements.
- `78d199c37b270c944a73ffb69517a9bbe62ab697` — refine P1-124 `tabs.create` MV3 crash receipt.
- `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6` — new P1-210 user-operation outer transport-loss reconciliation.

No inspected production runtime/config/manifest/test changes were introduced by these commits.

## Latest audit state
- **P1-210**: rejected/lost outer `runtime.sendMessage` result is `unknown`, not terminal failure; reconcile exact durable operation state before admitting a new non-idempotent retry.
- **P1-124 refinement**: same-worker `tabCreateSettlements` is not crash-recoverable across MV3 restart.
- **P1-167 refinement**: bounded diagnostic output still performs potentially unbounded full-text acquisition.
- **P1-035/P1-043 refinement**: quota-pressure cleanup can remove active TTL-aged staging; estimates are not reservations.
- **P1-208**: pending remote-save phase fairness.
- **P1-209**: extension-page version-refresh success marker precedes proven reload completion.
- **P1-206**: Journal composed-view revision coherence; grouped-pagination refinement.
- **P1-141**: Options read single-flight freshness across mutation epochs.
- **P0-033**: signed URL OperationLog redaction reopened.

**P1-201…P1-210 are not safely free. Read all 2026-08-28 audit deltas and whole-repo search before allocation.**

## Earlier blocker cluster retained
P0-079; P0-073/P0-074; P1-184; P1-183/P1-090; P0-072/P0-076/P0-077; P0-078/P0-069/P1-164; P1-195/P1-196; P1-197/P1-205; P1-198; P1-199/P1-200; P1-192/P1-194; P0-045; P0-050; P1-052; P1-064; P1-130/P1-170; P1-174; P0-075/P0-067/P0-068/P0-071/P0-066; P1-138; P1-086; P1-178/P1-191; P1-207.

See canonical + all deltas for exact contracts/status.

## Final large-pass audit work
1. Transfer staging keys are UUID/chunk-derived; no independent key-reuse root confirmed.
2. Operation identity inventory kept hostile content as P1-198 boundary; trusted extension pages use UUIDs.
3. Streaming import parser bounds/duplicate-key/fatal UTF-8 controls confirmed; no independent parser blocker.
4. Browser-state crash consistency refined P1-124.
5. Destructive/public-link paths remain owned by P1-183/P1-090/P0-069/P1-180/P1-164.
6. Recovery queues: no new generic root; P1-064/P1-208 retain fairness.
7. OAuth/PKCE low-level crypto controls positive; state-machine/auth-generation remain blockers.
8. Backup source revision remains P1-207.
9. Offscreen readonly request-before-tx-complete remains P1-086.
10. UI/durable reconciliation produced new P1-210.
11. Native Save As lifecycle audit started but was interrupted by handoff request. Positive controls observed: distinct prepared/started/released session keys, durable released tombstone, cap 64, serialized mutation, visible extension-page Save As ownership. No new item confirmed.

## Continuation
Fresh-fetch GitHub first. If runtime is unchanged, a strong next block is finishing native Save As crash/reload/actual-settlement lifecycle, then widen to P1-210 status surfaces, destructive remote receipts, browser-state crash generations, recovery capacity/fairness, resource reservations, hostile-DOM print/iframe, and extension-page freshness.

## Recovery composition
Old full source snapshot: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`
SHA256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`.

New 2026-08-28 ZIP is context/audit only. Exact source is Git history/current `main`.

**Fresh current main always wins; never reset to this handoff.**
