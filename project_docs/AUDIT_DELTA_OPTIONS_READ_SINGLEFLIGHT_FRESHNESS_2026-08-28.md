# Audit delta — Options read-only single-flight freshness across mutations — 2026-08-28

Source-of-truth `main` immediately before this write: `4c664fe31a17493d7ce62828d0520cef751e9e14`.

Docs-only audit checkpoint. Production runtime, configuration, tests and `manifest.json` are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof **reopens/refines existing P1-141**. P1-141 correctly prevents repeated identical read-only `runtime.sendMessage` calls from accumulating multiple unresolved underlying RPCs after a local UI timeout. However its current assumption that a late read response is safe because logical callers are generation-fenced is incomplete when the same unresolved actual Promise is deliberately reused by a **new post-mutation refresh generation**.

Adjacent owners remain:

- P1-137 — folder-picker out-of-order navigation generation;
- P1-138 — bounded read-only extension-page RPC deadlines;
- P1-145 — OperationLog detail latest-wins queue/admission;
- P1-157 — extension-page Chrome API/mutation centralization;
- P1-158 — service-worker prerequisite Chrome read admission;
- P2-012 — OperationLog visible stale-response fencing.

The root cause here is specific to **single-flight read result freshness across a mutation epoch**.

## Current helper

Options keeps:

`const readOnlyRuntimeInFlight = new Map();`

For a read message it computes a JSON key. `getReadOnlyRuntimeMessageActual(message)`:

1. returns the existing Promise when the same key is already present;
2. otherwise starts exactly one `chrome.runtime.sendMessage(message)`;
3. keeps that Promise in the map until its **actual settlement**, even if one logical caller already timed out;
4. caps distinct unresolved reads at four.

This is valuable resource/admission behavior and must be preserved.

## Existing generation fencing

Visible refresh functions also create logical generations, for example:

`refreshStatus()` -> `const generation = ++yandexStatusGeneration`.

After awaiting the status it applies the result only when:

`generation === yandexStatusGeneration`.

Similar latest-response guards exist for backup status, folder navigation and OperationLog list/detail.

Those guards correctly reject a response belonging to an older **logical caller** when a newer caller started a different actual request.

They do not prove that the actual Promise used by the newer caller observed state after a mutation.

## Deterministic stale-snapshot schedule

### Yandex/status example

1. Options starts status read A (`WEBCLIP_YANDEX_STATUS`). It becomes the in-flight Promise for that message key.
2. Worker begins A and obtains some pre-mutation state A, but the handler/transport remains unresolved because another prerequisite is delayed.
3. User performs a settings mutation/import B that commits newer Yandex/user-settings state.
4. UI now calls `refreshStatus()` after B and increments `yandexStatusGeneration` to a newer logical generation.
5. `getReadOnlyRuntimeMessageActual()` sees A still unresolved and deliberately returns **the same actual A** instead of starting a new read.
6. A eventually settles with the snapshot it observed before B.
7. The original logical refresh that started A is rejected by generation mismatch.
8. The **new post-B refresh**, however, is awaiting the same A and its generation is current, so it accepts the stale pre-B response as though it were a fresh read.

Generation fencing has therefore converted a stale underlying snapshot into the result of the newest logical generation.

### Why this schedule is realistic

`WEBCLIP_YANDEX_STATUS` is not a single synchronous storage read; it composes multiple asynchronous auth/config/session reads. One component can observe old config before B while another component keeps the handler pending long enough for B to settle.

The problem does not require caller timeout; any overlapping unresolved identical read can be reused. Local timeout simply makes the long-lived actual more obvious and was the original reason for P1-141 single-flight retention.

## Broader affected Options reads

The same shared helper is used for:

- `WEBCLIP_YANDEX_STATUS`;
- `WEBCLIP_YANDEX_LIST_FOLDERS`;
- `WEBCLIP_JOURNAL_BACKUP_STATUS`;
- `WEBCLIP_OPERATION_LOG_SETTINGS_GET`;
- `WEBCLIP_OPERATION_LOG_LIST`;
- `WEBCLIP_STORAGE_HEALTH`.

Not every call has an equally strong mutation schedule, but the helper provides no mutation epoch/invalidation contract for any of them.

Examples:

- settings import or Yandex preference/root mutation -> post-mutation status refresh;
- backup settings mutation -> post-mutation backup-status refresh;
- OperationLog retention/clear mutation -> post-mutation list/settings refresh;
- `navigator.storage.persist()` -> post-action storage-health refresh.

Folder navigation already blocks create/save while a folder-list transition is active (P1-137 positive control), reducing this particular schedule there, but the generic helper still lacks a semantic freshness boundary.

## Why logical generation is insufficient

A UI generation number answers:

> Is this response associated with the newest logical request I care about?

It does **not** answer:

> Did the underlying read begin/observe state after the mutation that caused this refresh?

When a new logical request intentionally reuses an old actual Promise, those are different questions.

The current architecture tracks only the first.

## Why this is P1-141, not a new item

P1-141 specifically owns the choice to retain and reuse identical unresolved read RPCs until actual settlement so local timeout cannot create an unbounded stack of message channels/worker reads.

The freshness defect is a direct missing acceptance condition of that reuse policy. Creating a separate item would split one single-flight contract into resource and semantic halves.

The correct refinement is:

**same actual may be reused only while it is valid for the caller's required read epoch.**

## Required P1-141 refinement

### Preserve actual-settlement single-flight

Do not "fix" this by deleting the map entry at local timeout and launching another identical underlying RPC. That would regress the original P1-141 admission guarantee.

The old actual must remain tracked until actual settlement.

### Add read/mutation epoch

Each coalescible read key needs enough semantic versioning to decide whether an existing actual is fresh enough for a new logical caller.

Acceptable shapes include:

- per-domain mutation epochs (`yandexConfig`, backup settings/state, OperationLog, storage persistence);
- a general monotonically increasing Options read epoch incremented on relevant mutation completion/unknown-settlement transition;
- worker-issued state revisions included in responses and required by subsequent refreshes;
- explicit invalidation that marks the old actual **non-reusable** while still keeping it tracked for resource accounting until settlement.

A new post-mutation read may start a second actual only if admission budget permits and the old one remains separately tracked as stale/unresolved. In other words, "do not reuse" must not mean "forget the unresolved channel".

### Unknown mutation settlement

If a mutation times out after its physical write may have started, the UI must not assume either old or new state. A refresh should request/reconcile a state revision after the mutation's actual settlement or expose pending/unknown semantics according to the mutation owner.

Do not assign a fresh epoch merely from a local timeout if the underlying write is still ambiguous.

### Response provenance

Where practical, read responses should include a state/version receipt that allows the UI to know what they observed. A logical generation remains useful for render ordering, but it is not a substitute for state provenance.

## Required deterministic regressions

1. Status actual A observes Yandex config A and remains pending; settings mutation B commits; post-B refresh must not accept A as current status.
2. Old A remains counted in `readOnlyRuntimeInFlight` until actual settlement; fix does not create unbounded retries after timeout.
3. Post-B refresh either waits for/reconciles a sufficiently fresh read or starts a separately budgeted actual B; visible UI eventually reflects B.
4. Original logical caller A cannot repaint after a newer caller, preserving existing generation behavior.
5. Backup status read A overlaps backup-settings mutation B; post-B status does not reuse stale A as fresh.
6. OperationLog list/settings read A overlaps clear/retention mutation B; post-B refresh cannot publish pre-B list/settings solely because the new logical generation reused A.
7. Storage-health A overlaps a successful persistence request; post-action health refresh does not knowingly relabel old A as post-action truth.
8. A mutation whose settlement is unknown does not cause blind read-cache invalidation plus unlimited duplicate RPCs; pending/actual-settlement semantics remain bounded.
9. Four distinct unresolved read keys still enforce the existing global cap.
10. Repeated logical refreshes with no intervening relevant mutation may continue to share one actual safely.
11. Folder-picker P1-137 transition fencing remains intact; this change does not weaken its controls.
12. OperationLog detail P1-145 one-active+one-latest queue remains independently bounded.

## Positive controls retained

- Read-only UI callers have local deadlines (P1-138).
- Actual identical runtime reads remain single-flight across mere UI timeout (P1-141).
- Visible stale caller responses remain logical-generation fenced.
- This audit does not require caching read results after settlement; it only constrains reuse of still-unresolved actuals.

## Number allocation

No new number. **P1-141** is reopened/refined by this checkpoint. Evidence-reserved P1-208 and P1-209 remain separate.

## Test / release state

Audit documentation only. Runtime/configuration/manifest unchanged. Product tests were not rerun; historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or Release was created.
