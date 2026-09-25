# P1-179 — source/runtime closure review — 2026-09-26

## Decision

P1-179 transitions from **ACTIVE** to **IMPLEMENTED / RELEASE-REGRESSION**.

Canonical implementation baseline:

`main=c92872d4133fb33cbf8bb1667fed0779a064dbb0`

Implementation PRs:

- #350 — backup lease/checkpoint namespace binding and exact-current recovery
- #351 — namespace-local scheduler success/failure/last-path state
- #352 — same-account old-root read-only historical reconciliation

Post-merge Repository Integrity on the final source tranche:

`#1164 / run 36177104180 — SUCCESS`

## Closure review against registered acceptance contract

The registered P1-179 acceptance roots are now absorbed:

1. **Durable non-secret BackupNamespaceIdentity**
   - semantic account UID + root + derived Journal root;
   - no token, authorization secret or signed URL.

2. **Lease namespace authority**
   - acquire requires namespace;
   - renew/release require token + exact namespace.

3. **Checkpoint namespace authority**
   - prepared and remote-verified checkpoints persist exact namespace;
   - stored remotePath is validated against the checkpoint Journal root.

4. **Recovery ordering**
   - legacy/unbound and invalid-path checkpoints fail closed before provider observation;
   - foreign semantic account fails closed with zero remote request;
   - historical namespace/path proof precedes any current-root provisioning.

5. **Exact-current namespace recovery**
   - current root provisioning is allowed only after namespace agreement;
   - provider verification then uses the exact checkpoint path.

6. **Same-account old-root recovery**
   - A/R1 checkpoint under current A/R2 is reconciled read-only at exact historical R1 path;
   - current R2 provisioning is skipped during historical observation;
   - historical path/root is never retargeted to R2.

7. **Historical success settlement**
   - recovered success is committed to checkpoint namespace state;
   - historical R1 success does not become R2 success;
   - after terminal historical settlement, current R2 proceeds through its own fresh backup path.

8. **Namespace-local scheduler state**
   - success/failure/attempt/path/status truth is selected by account/root namespace;
   - legacy flat state is preserved only as unbound evidence;
   - A/R1 success/failure/path cannot suppress, retry-block or masquerade as A/R2 or B/R1 state.

9. **404 aging**
   - foreign-account and legacy/unbound checkpoints make zero provider calls and therefore cannot age;
   - admitted exact historical/current path 404 may age only under the existing grace/attempt policy.

10. **Race fencing**
    - manual/background operation captures immutable operation context;
    - status account/root is rechecked against operation namespace before lease/remote admission.

## Deterministic evidence

Current P1-179 deterministic models report:

- checkpoint namespace: implemented;
- lease namespace CAS: implemented;
- exact-current recovery: implemented;
- scheduler state namespace-local: implemented;
- legacy flat state authority: false;
- same-account root rotation read-only: implemented;
- live provider calls in deterministic tests: zero.

Final implementation-head and post-merge Repository Integrity both completed SUCCESS before this closure transition.

## Owner boundaries

This closure does not absorb adjacent owners:

- scheduler generation/alarm delivery remains separate;
- auth/settings generation remains separate;
- exact auth validity/current-credential recheck remains separate;
- provisioning mutation admission remains separate;
- exact remote object/content identity remains separate;
- release-generation and physical QA evidence remains separate.

## Release-regression boundary

P1-179 source/runtime work is closed. Applicable real Chrome/Yandex regression remains part of the release phase and is not performed by this closure transition.

No live Yandex OAuth/API mutation, real Chrome qualification, physical release receipt, product ZIP/build, S2/release-policy activation, manifest bump, tag, deployment, GitHub Release or release decision is performed.

Manifest remains `0.9.8`. Target remains `0.9.9`. Release readiness remains **NOT READY**.
