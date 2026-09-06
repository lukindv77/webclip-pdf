# P0-073 / P0-074 — safe runtime patch strategy for large `service-worker.js` — 2026-09-06

Date: 2026-09-06  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Canonical size: `570842` bytes  
Research branch before this note: `research/p0-074-immutable-live-yandex-context-2026-09-06 @ dba8c0227bf394e501c3d3e490f9d7f5207ce0cf`

No production runtime is changed by this note.

## 1. Why connector-only whole-file replacement is rejected

The available GitHub `update_file` operation replaces the complete UTF-8 file. For a ~570 KB production worker this is unsafe unless the exact input blob is materialized locally, patched deterministically and the complete output is byte-verified before upload.

The current local execution environment cannot clone the repository:

```text
fatal: unable to access 'https://github.com/lukindv77/webclip-pdf.git/':
Could not resolve host: github.com
```

The GitHub connector can read the full source into a tool resource, but it does not expose that resource as an exact local filesystem file that a deterministic patcher can consume.

Therefore manually reconstructing the complete worker from truncated/displayed connector output and sending it through `update_file` is prohibited.

## 2. Git data API does not remove the full-blob requirement

The connector exposes:

```text
create_blob
create_tree
create_commit
update_ref
```

These are useful once a verified new blob exists, but `create_blob` still requires the complete changed file contents. A Git tree can reuse unchanged blobs but cannot express a line-level patch inside an existing blob.

Thus Git-tree workflow is safe only after exact patched bytes are already available.

## 3. No targeted patch writer is currently exposed

The connector exposes PR patch/diff **read** operations, but no arbitrary `apply_patch`/targeted-edit operation for repository files.

Therefore a unified diff cannot currently be applied to the canonical worker through the connector alone.

## 4. Exact baseline guard

Added:

`project_tools/test_p0_073_p0_074_runtime_patch_baseline.js`

It computes the true Git blob SHA-1 from local `service-worker.js` bytes:

```text
SHA1("blob " + byteLength + NUL + fileBytes)
```

and requires exact equality with:

```text
6d61ac81befdbf2804ae9dbec425aa08d1194eb1
```

It also requires critical P0-073/P0-074 source anchors to occur exactly once.

This guard is intentionally a **pre-patch baseline** test. After a legitimate runtime modification it must fail until the new baseline is deliberately reviewed and recorded.

## 5. Safe implementation workflow

Runtime implementation may begin only in an environment that can materialize and write the exact repository bytes safely.

Required sequence:

1. fresh-fetch `main` and intended implementation branch;
2. materialize exact branch checkout locally;
3. verify `git rev-parse HEAD` and the `service-worker.js` Git blob against the expected baseline;
4. run `test_p0_073_p0_074_runtime_patch_baseline.js` and require PASS;
5. apply a deterministic exact-anchor patch, never a fuzzy search/replace;
6. every replacement must assert expected old-anchor count before mutation and expected new-anchor count after mutation;
7. write to a temporary output file first;
8. run `node --check` on the patched worker;
9. run the P0-073 and P0-074 source-bound gates;
10. run the deterministic P0-073/P0-074 models plus relevant existing Yandex/recovery tests;
11. inspect `git diff --check` and the complete diff;
12. verify no unintended files changed;
13. only then commit/push the runtime patch;
14. fresh-fetch remote branch and compare pushed SHA/diff with the locally verified commit.

If the input blob differs at step 3 or any anchor count differs at step 6, the patch process stops without writing the worker.

## 6. Proposed patch decomposition

Do not implement P0-073/P0-074 as one giant rewrite. Use small semantic blocks that can be reviewed independently in the local diff even if they land in one worker file.

Recommended order:

### Block A — live context primitive

Add context acquisition and a context-bound Yandex request primitive. No existing call sites switched yet.

Acceptance:

- captured auth is not enumerable/serializable into durable records/logs;
- same captured capability is used by every request through the primitive;
- ordinary `yandexApi()` behavior for unrelated call sites remains unchanged initially.

### Block B — P0-073 durable scope validation/writer guards

Add versioned `yandexAccountRootScope`, path-under-root validation, no in-place unresolved rebind, legacy fail-closed handling and transactional `resourceId` conflict check.

No cross-account recovery remote calls are admitted yet until Block C is complete.

### Block C — remote-save recovery context propagation

For each unverified pending remote save:

- acquire one live context;
- prove expected durable account;
- perform GET/publish/poll only with that context;
- mismatch/auth-unavailable consumes no attempt/stale budget;
- preserve `remote-verified` local-only finalization.

This should make both P0-073 and recovery-focused P0-074 gates materially closer to GREEN.

### Block D — new upload context propagation

Capture coherent auth/config once and propagate through:

- service-folder preparation;
- target path construction;
- signed upload URL acquisition;
- post-PUT verification;
- optional publication/polling.

Do not silently change publication authority; P0-078 remains the policy/revocation owner.

### Block E — remaining Yandex multi-step flows

Migrate folder/move/backup flows that still mix fresh auth/root reads, with separate owner-specific evidence/tests. Do not claim these solved merely because remote-save path is corrected.

## 7. Generation dependency

A P0-074 context must be coherent at acquisition time, not merely frozen afterward.

Preferred implementation consumes monotonic auth/config generation authority from adjacent owners. If those generation primitives are not yet present, do not improvise value-equality as an ABA-safe substitute.

A temporary implementation may narrow scope to P0-073 recovery by capturing auth first and proving account with the same token while using checkpoint-owned root/path. New-upload config coherence still requires a generation-safe capture before claiming full P0-074 closure.

Therefore runtime work may legitimately make the recovery subcase GREEN while P0-074 remains ACTIVE for broader config-generation coherence.

## 8. Connector limitation conclusion

Under the current tool environment, production `service-worker.js` will **not** be overwritten through connector-only full-file replacement.

Safe next execution point is an exact local checkout/push-capable environment (or another repository editing capability that provides true targeted patch semantics). Until then, docs/models/source gates/baseline guards may advance, but production runtime claims must remain unchanged.

## 9. Release state

Runtime/manifest remain `0.9.8`. Release status remains **NOT READY**. No build, tag, GitHub Release, PR or release process is started by this work.
