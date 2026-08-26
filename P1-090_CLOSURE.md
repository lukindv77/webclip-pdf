# P1-090 closure — Yandex identity/locator design

Historical implementation gate: **REGRESSION at the time of this closure**. Current canonical status: **PARTIAL**; see `project_docs/PRIORITIES_P0_P1_P2.md`.

> Later deep audit found that the pre-move identity fence documented below is not carried through post-`resources/move` reconciliation: target verification for Trash and ReadmeLater→Upload accepts `type=file` at the target path without proving the same source `resourceId`. The verification below remains historical evidence for account/root/pre-move lookup behavior; it does **not** prove the newer post-move object-identity acceptance criteria.

## Problem
Existing locator logic stored `resourceId/publicUrl/remotePath`, but did not bind new Journal entries to Yandex account/root context. Worse, when a stable `resourceId` was known, a direct candidate at the stored path could still be accepted if Yandex omitted `resource_id`, making path alone an accidental identity proof.

## Implemented
- New Yandex entries and durable remote-save checkpoints persist bounded `accountUid` and normalized `rootPath` in addition to `resourceId/publicUrl/remotePath`.
- Import/export preserves these fields; legacy entries may omit them.
- Destructive locate checks saved `rootPath` against current root and saved `accountUid` against the current Yandex account before file lookup; mismatch fails closed without changing remote/local state.
- With a known `resourceId`, path-only candidates are rejected.
- Exact `publicUrl` may serve as secondary identity only if the candidate omits `resource_id`; a conflicting candidate resource ID is never ignored even when public URL matches.
- Legacy entries without stable identity retain managed-path compatibility.
- Existing Journal delete / move-to-WebClip-Trash sequence was not redesigned.

## Evidence
- `project_tools/test_p1_090_yandex_identity.js` PASS: account mismatch, root mismatch, path-only rejection, publicUrl secondary match, conflicting resourceId rejection, legacy compatibility, durable/import field contracts.
- Full deterministic gate after P1-090/P1-074: 54/54 PASS.
- Managed Chromium P1-007 integration PASS; mocked Yandex account path remains functional.
- Manifest remains `0.9.8` / MV3.

Real Yandex/account-switch E2E remains release QA.
