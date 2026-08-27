# Audit delta — cross-origin print operation generation

Date: 2026-08-27
Source-of-truth `main` immediately before write: `546f9284dbadbd402b7f88e4d404cc8aa2747412`.

This file is a lossless audit checkpoint. It does **not** replace the canonical registry in `project_docs/PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md`. Those large canonical files should be synchronized together in a later lossless update; production/runtime files are intentionally untouched in this checkpoint.

## P1-199 — cross-origin iframe print prepare/restore is not operation-generation fenced

**Status:** CONFIRMED by source audit; pending canonical sync and implementation.

### Root cause

`content.js` keeps selected remote-frame print state in the process-global `state.remotePrintPrepared` set. `restoreRemoteFramesAfterPrint()` snapshots that set, immediately clears it, and then asynchronously sends `restore-print` to each frame.

`restoreAfterPrint()` is synchronous and calls `restoreRemoteFramesAfterPrint().catch(() => {})` fire-and-forget.

`prepareForPrint()` starts with:

1. `restoreAfterPrint()` — launches the old remote restore asynchronously and clears `remotePrintPrepared` immediately;
2. `await restoreRemoteFramesAfterPrint()` — this second call can now observe an empty set and therefore does **not** wait for the restore that step 1 already launched;
3. `syncRemoteFrameAgents()` / local preparation;
4. `prepareRemoteFramesForPrint()` — sends a new `prepare-print` and re-adds the same frame ids.

Therefore old restore A and new prepare B are not ordered by actual settlement. If B's `prepare-print` reaches a child frame before A's delayed `restore-print`, A can later undo B.

`stopSelection()` contains the same lifecycle smell: it calls `restoreAfterPrint()` and then starts another fire-and-forget `restoreRemoteFramesAfterPrint()` before `stop`, without an operation token that makes a stale restore harmless.

### Child-frame proof

`frame-agent.js` has one mutable state object with `phase`, `printStyle` and `changedAttrs`; there is no print operation/generation token.

- `preparePrint()` sets `state.phase='printing'`, mutates selected resource attributes, injects `PRINT_STYLE_ID`, and stores the element in `state.printStyle`.
- `restorePrint()` unconditionally removes the current `state.printStyle`, rolls back every current `state.changedAttrs`, clears them, and returns phase to `selecting`.

Consequently a stale `restore-print` from operation A cannot distinguish A's style/attribute mutations from a newer operation B. It can remove B's print style and/or roll back B's resource preparation.

### User-visible effect

A rapid subsequent PDF operation on the same document with the same selected cross-origin iframe can reach `Page.printToPDF` after a stale restore has removed the new frame print preparation. Expected outcomes include:

- selected cross-origin iframe content missing or no longer filtered as selected-only;
- lazy image/resource attributes restored while the new print is still pending;
- remote frame height/style state inconsistent with the top-frame preparation;
- intermittent behavior depending on message timing, making the defect difficult to reproduce without a delayed-command test.

This is not merely cleanup cosmetic state: `prepare-print`/`restore-print` alter the actual representation printed into the PDF.

### Classification / duplicate check

No `P1-199` exists in the fresh canonical registry.

This is **not** a duplicate of:

- `P1-171`: cross-origin frame registry/command document identity after same-URL reload/navigation. P1-199 reproduces within one unchanged document and is an operation-generation ordering problem.
- `P1-004`: feature-level cross-origin iframe support umbrella. P1-199 is a concrete independent lifecycle root cause with its own deterministic acceptance tests.
- `P1-157`: generic unbounded/direct Chrome API/RPC audit. The problem here is not absence of a timeout; adding a timeout would not make a stale restore safe.
- `P0-070`: top-document live PDF document identity. P1-199 is child-frame mutable print-state ownership even when the top document identity never changes.

### Required contract

Use one explicit print-operation generation/token shared by top `content.js` and every mapped remote frame command.

At minimum:

1. A new print preparation must not begin until cleanup of the preceding generation has **actually settled**, or cleanup must be generation-aware and incapable of touching newer state.
2. `prepare-print` carries a print generation/token; frame-agent records ownership of `printStyle` and changed attributes for that generation.
3. `restore-print(A)` is idempotent and may restore only state owned by A; if B is current, stale A restore is a no-op.
4. Top-frame `remotePrintPrepared` must represent exact generation ownership, not one shared unversioned set.
5. `restoreAfterPrint()` must not launch an untracked asynchronous cleanup that a later `prepareForPrint()` can overtake.
6. `stop`, error cleanup and successful completion use the same ordering/generation contract.
7. Navigation/document generation fencing from P1-171 remains mandatory in addition to this operation-generation fence.

### Regression / proof requirements

Deterministic test with a mocked/delayed frame command channel:

1. Operation A completes local print and starts `restore-print(A)`, but its delivery/settlement is delayed.
2. Operation B starts on the same document and successfully executes `prepare-print(B)`.
3. Delayed `restore-print(A)` is then delivered.
4. Assert B remains in `printing` state; B's print style and B-owned changed attributes remain intact.
5. `restore-print(B)` then restores exactly B once.
6. Repeat with A failure cleanup and with `stopSelection()` interleaving.
7. Repeat with two selected cross-origin frames and reversed per-frame response order, proving there is no partial-generation rollback.

Real unpacked Chrome QA should additionally repeat rapid consecutive saves with a deliberately slow cross-origin iframe.

## Related positive controls from the same audit block

- `frame-agent.js` still requires extension runtime sender for `WEBCLIP_FRAME_AGENT_COMMAND`.
- Actual cross-origin permission/document identity remains governed separately by P1-004/P1-171.
- The defect does not require host-page script privilege or navigation; it is reproducible purely from legal WebClip operation ordering.

## Test / release state

No production files or `manifest.json` were modified by this checkpoint.

Product tests were **not rerun** for this docs-only audit write. Do not upgrade the previously proven JS/deterministic gate based on this commit.

No build/tag/release was created.
