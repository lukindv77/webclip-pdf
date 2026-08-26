# Yandex mutation / recovery audit delta — 2026-08-27

Baseline source HEAD: `e0692339f4b480b342a998b5199b637fe7ee3fbc`.

This is a lossless audit checkpoint. It does **not** replace the canonical registry. `project_docs/PRIORITIES_P0_P1_P2.md` still formally ends at P1-194 until the late audit deltas are merged losslessly into both canonical audit documents. No production/runtime/config/manifest change is made by this checkpoint.

## Mutation/outcome matrix — no P1-197 assigned from this sub-block

The Yandex mutating API paths were re-audited using the invariant `side effect -> timeout/unknown outcome -> durable receipt/checkpoint -> exact reconciliation -> retry policy`.

### `resources/move` — existing P1-090 / P1-183, stronger evidence

Both destructive move flows (`Journal delete -> Trash` and `ReadmeLater -> Upload`) perform target verification only **after** `await yandexApi('/resources/move', { method:'POST', ... })` returns successfully. If the local 15 s request timeout/Abort wins, `yandexApi()` throws before the verify loop is entered even though the remote service may already have committed the move.

This is not a new root cause. It strengthens the existing requirements:

- **P1-090**: unknown-settlement move must reconcile the exact source/target pair and prove the same object identity, not merely target path/type.
- **P1-183**: Trash delete requires a durable exact target checkpoint before destructive move so restart/timeout can verify exact target/source without deriving a collision-renamed filename.
- **P0-074**: all reconciliation requests must remain bound to the immutable operation auth/account/root context.

Required regression refinement: inject POST timeout after the remote move has physically settled; the current attempt/recovery must preserve the durable operation evidence and later prove exact source/target identity before local Journal finalization. No blind second move.

### `resources/publish` — immediate reconciliation exists; residual items remain existing P0-078/P0-069/P1-184

`ensureYandexPublicUrl()` first reads current `public_url`, attempts `PUT /resources/publish`, catches the publish error, and continues bounded GET polling for `public_url`. Therefore an immediate PUT error/timeout does not directly cause a blind publish retry in the same helper.

Residual contracts are already tracked:

- **P0-078** publication-policy generation fence before any not-yet-started publish;
- **P0-069** explicit durable unpublish/public-link lifecycle for destructive Journal deletion;
- **P1-184** exact object/content identity must be proved before object-scoped publication/recovery.

No new number is assigned here.

### Yandex folder creation — convergent exact-path retry; no new destructive root cause

`ensureYandexFolderTree()` creates one exact path segment at a time. If `PUT /resources` reports 409, the helper performs an exact-path GET and requires the existing resource to be a directory. A locally unknown create that actually settled therefore converges on the same intended directory rather than creating a second arbitrary object. Existing overall deadline/config-generation requirements still apply.

### Signed PDF/backup upload — irreversible PUT is pre-checkpointed; identity proof remains P1-184

Live PDF upload creates `pendingRemoteSaves` before the signed PUT. Journal backup similarly writes a prepared backup checkpoint before the signed transfer. Offscreen signed upload transport retry is disabled for unknown transport errors. The remaining defect is not missing retry suppression but insufficient exact remote object/content proof after an unknown upload outcome, already P1-184.

## Existing-item refinement — generic Yandex timeout text is false for mutating requests

`yandexApi()` currently maps any fetch Abort/timeout, regardless of HTTP method, to the user-facing error:

`Яндекс Диск не ответил ... Операция остановлена без изменения данных.`

For GET this is a reasonable local-side statement. For an already transmitted PUT/POST it is not provable: local timeout is not remote cancellation and the server can commit after the client stops waiting.

Required refinement across P1-090/P1-183/P0-078/P0-069/P1-184 and operation-log UX:

- mutating timeout must say that the result is **unknown/pending verification**, not "без изменения данных";
- do not present terminal failure when a durable checkpoint/reconciliation path exists;
- retry remains operation-specific and is forbidden when it could duplicate/contradict an unknown non-idempotent side effect;
- read-only GET timeout may keep a non-mutation wording.

No P1-197 is assigned solely for misleading wording because the behavioral root causes and reconciliation acceptance criteria already belong to the existing outcome items above.

## Existing-item refinement — P1-178 / P0-074 lazy account-cache race can resurrect stale auth

Fresh source review found a concrete auth-generation race in `getCurrentYandexAccountUid()`:

1. It calls `readYandexAuthState()` and snapshots `yandexAuth=A`.
2. If A has no cached account UID, it calls `yandexApi('')`.
3. `yandexApi()` independently calls `getValidYandexAccessToken()` / `readYandexAuthState()` again. A concurrent disconnect/reauth can therefore make this network GET execute with newer auth `B`.
4. The returned account belongs to B, but the helper then executes `writeYandexAuth({ ...yandexAuth, account })` using the **old A snapshot**.
5. That stale write can overwrite the newer session B, restoring A's old `accessToken` while attaching B's account metadata.

This is stronger than a cosmetic status race: a read-like lazy cache update can mutate and resurrect authorization state after a newer reauthorization.

Classification: do **not** create P1-197. This is an additional required case for **P1-178** generation-fenced auth writes, composed with **P0-074** operation-scoped identity.

Required acceptance/regressions:

- A without cached UID -> account GET starts -> reauth B commits -> late cache write from A must not overwrite B.
- If the GET actually ran under B, its account data must never be attached to A.
- Lazy account cache write must compare/fence the exact auth generation/token identity before commit, or be eliminated in favor of immutable operation context/non-mutating lookup.
- A stale account-info/cache failure must not change the terminal success/failure of a newer auth session.

## Recovery admission refinement — P1-196 / P1-177

`recoverPendingRemoteSaves()` computes `authAvailable` once before iterating its queue. Each later `yandexApi()` still re-reads the current auth state. Once P1-196 introduces authoritative invalid-current-token demotion, this loop must not keep treating the initial boolean as proof that later items can be attempted. A current-generation 401/known expiry should transition recovery to deferred/no-usable-auth for subsequent work, and P1-177 scheduler behavior should pause retries appropriately without destroying user backup preferences.

This remains a refinement of P1-196/P1-177 rather than a new item.

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun in this checkpoint. The last previously proven product gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS; real unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release QA blockers.
