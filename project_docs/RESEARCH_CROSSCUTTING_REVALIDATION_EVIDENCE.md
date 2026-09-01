# Cross-cutting research revalidation evidence

This file consolidates cross-subsystem positive controls, duplicate decisions and implementation taxonomy from broad `RESEARCH_DELTA_*REVALIDATION*` / inventory checkpoints that would otherwise duplicate many owner-specific deltas.

It is evidence/navigation, not current status authority. Owner-specific deltas remain where they still contain unique root-cause/acceptance/source proof.

## 1. No-number 20-block revalidation — durable results

The 20-block revalidation found no need for a new owner. It mapped source-confirmed manifestations back to existing items, including:

- stale pending-remote cleanup reactivation -> P0-074 + P1-184;
- backup source revision truth -> P1-207;
- grouped Journal continuation revision -> P1-206;
- OperationLog clear admission -> P1-197;
- native Save As backing-Blob lifetime -> P1-156;
- frame print/control/permission/worker-generation -> P1-199/P1-200/P1-201/P1-203/P1-171;
- mutable tab-owned PDF retry bytes -> P0-079;
- destructive entry-generation authority -> P0-076 with P1-183/P1-090/P0-069;
- local download exact recovery -> P0-048/P0-039/P1-064/P1-146;
- Settings/auth/config generation -> P1-157/P1-158/P1-195/P1-196;
- import staging live-owner lifetime -> P1-035;
- alarm-started background lifecycle -> P1-192;
- Incognito Action truth -> P0-045;
- stale document/page command authority -> P1-175/P0-070/P1-171/P0-023;
- read-like Yandex flows that can create folders -> P1-138;
- publication policy generation -> P0-078;
- `urlStats` rebuild isolation -> P0-050;
- hostile host control plane -> P0-075 with P0-067/P0-068/P0-071;
- debugger/PDF exact document authority -> P0-070/P0-023/P1-171.

Positive controls preserved from that pass:

- backup lease token acquire/renew/release has useful exact-token CAS primitives even though later semantic liveness is incomplete;
- PDF-cache expired-entry pruning performs scan/delete inside one readwrite IndexedDB transaction, so the separate pending-remote two-phase reactivation race was not reproduced there;
- ReadLater move writes its checkpoint before the remote move, though later id-only finalization still needs P0-076 generation authority;
- import staging uses random import ids, so an immediate same-key replacement race was not established by id reuse alone;
- PKCE S256, no client secret and session-only token baseline remained positive controls;
- current runtime sender admission did not expose a new administrative privilege bypass;
- `Page.printToPDF` uses stream transfer and debugger transport itself did not justify a new owner; the remaining gap was document identity.

A watch point was deliberately **not** promoted: `recoverPendingJournalAppends()` checks a pending row by textual id rather than exact generation snapshot, but the pass did not prove an admissible live path that replaces the same ordinary pending-Journal id with a new semantic owner. Any future proof must first compare against P0-041/P0-076/P1-198.

## 2. Diagnostic computation budget — P1-167 refinement

A later revalidation distinguished bounded diagnostic **output** from bounded diagnostic **computation**.

`capturePageStructureDiagnostics()` stores bounded fields, but source acquisition can still materialize/measure complete `body.innerText/textContent` and selected-element full text length, and the helper can run during prepared/beforeprint/afterprint/post-print stages.

Preserved acceptance refinement for P1-167:

- diagnostic acquisition must consume the shared PDF-preparation traversal/time/string budget;
- do not materialize complete document text merely to compute a bounded numeric length;
- repeated prepared/beforeprint/afterprint diagnostics share one per-operation budget rather than multiplying an unbounded scan;
- budget exhaustion must publish explicit truncation/budgetExceeded evidence without changing Journal/PDF truth.

P1-147 remains the output-schema/diagnostic-content owner; this does not weaken its bounded-payload controls.

## 3. Storage-pressure cleanup expands P1-035/P1-043, no new owner

`ensureStorageBudget()` may trigger `cleanupTransferPayloads()` under quota pressure, so generic TTL cleanup can remove an active >2h staged payload not only from hourly maintenance but from unrelated storage preflight.

Preserved ownership:

- P1-035: cleanup eligibility must combine owner/lease/generation state with TTL; active confirmation/export/backup/recovery generations are protected from opportunistic cleanup;
- P1-043: a free-space estimate is not a byte reservation; concurrent large writers require admission/reservation and cleanup cannot manufacture capacity by deleting another active operation's evidence.

## 4. Current-source confirmations that remain under existing owners

The revalidation source-confirmed without new numbering:

- P0-064 complete subtree clone/descendant materialization before style cap;
- P1-154 aggregate selection materialization before final count slice;
- P1-168 repeated sibling-array materialization;
- P0-067 real host `control.click()` during print preparation;
- P0-068 active `cloneNode(true)` flattened proxy;
- P1-206 mixed-revision Journal composition;
- P1-173 waiting Promise/closure turns behind unresolved actual settlement;
- P1-197/P1-205 OperationLog history/cleanup generation gaps;
- P1-177 + P0-074 old backup scheduler policy snapshot publishing newer alarms;
- P0-074/P0-073 stale `testYandexConnection()` account metadata across auth generation;
- P0-045 Incognito popup/action ordering.

These confirmations do not need their own broad delta after owner-specific evidence remains available.

## 5. Security positive controls from cross-cutting review

The reviewed current state showed no new P-number for:

- signed offscreen transfers accepting trusted extension sender and approved HTTPS Yandex signed hosts;
- content-origin `WEBCLIP_OPEN_URL` restricted to approved Yandex HTTPS destinations;
- reviewed Journal/Options dynamic external strings inserted through DOM/textContent rather than an external-data `innerHTML` sink;
- OAuth access token intended for `chrome.storage.session` with no separate new persistent-token/log sink in that pass.

These are historical/source-review positive controls, not perpetual guarantees.

## 6. Runtime sender ACL — P0-020 positive control

Fresh runtime sender revalidation found no administrative/OAuth/import/clear/OperationLog privilege bypass from an ordinary content sender.

Preserved contract:

- sender id must match the extension;
- extension pages are classified separately;
- ordinary http(s) content contexts can invoke only explicitly allowlisted content-script message types;
- administrative Options/Journal mutation, OAuth setup/token, settings import, Journal replace/clear and OperationLog administration remain extension-page-only by default;
- Incognito content data-bearing operations remain fail-closed except explicitly intended non-data exceptions;
- content PDF/upload/retry/download binds tab authority from `sender.tab.id`, not arbitrary caller target;
- content Journal list rebinds scope to sender current URL/site rather than trusting forged message URL;
- saved-file open requires a real Yandex Journal entry and approved Yandex public URL, with current-site check for content callers;
- generic content OPEN_URL accepts only approved HTTPS Yandex hosts;
- frame-agent LIST/TARGET requires top-frame content sender, while child REGISTER/STATE requires child context + optional host permission.

Remaining stale-document/frame/hostile-page problems belong to P0-070/P0-023/P1-175/P1-171/P0-075, not a new sender-ACL bypass.

Regression preservation: content cannot invoke OAuth/admin/import/OperationLog RPC by inventing a message type; forged content Journal URL cannot escape sender scope; cross-site saved-file open is rejected; arbitrary OPEN_URL host/scheme is rejected; child frame cannot use top-frame control RPC; Incognito remains fail-closed.

## 7. Browser-owned state across MV3 generations — durability taxonomy

Broad revalidation explicitly rejected the rule “persist every module-memory Promise/map.” Required durability depends on the side effect:

1. Browser/renderer state that can outlive the worker **and** whose repetition can create a second irreversible/non-convergent effect needs crash-recoverable exact generation evidence or proof-based reconciliation. Examples: P1-124 `tabs.create`, P1-204 destructive context-menu rebuild, remote/file operations.
2. Browser state derived/convergent from authoritative current state can use bounded bootstrap/repair. Chrome Action has a fresh-worker bootstrap convergence path; residual problems remain P1-130/P1-170/P0-045, not a generic worker-memory persistence item.
3. Idempotent installed renderer capability such as executeScript is primarily document-generation bound: stale A receipt cannot satisfy replacement document B (P1-125/P1-171).
4. When durable subsystem intent already exists, recovery should reconstruct from it rather than persisting every old worker promise. Automatic download uses durable intent/DownloadItem reconciliation; prepared Save As has durable session keys but needs watcher reconstruction under P1-156/P1-169.
5. Worker death and local caller timeout never imply browser cancellation.

Specific duplicate decisions preserved:

- `frameAgentsByTab` worker loss remains P1-203;
- context-menu old mutation across worker generation remains P1-204;
- automatic download restart behavior remains P1-146/P0-039/P0-048/P1-087 rather than being folded into P1-124;
- prepared Save As restart remains P1-156/P1-169.

## 8. Service-worker Chrome API taxonomy

A whole-worker inventory established an important implementation rule: raw `chrome.*` calls are not automatically deadline defects.

### A. Bounded pure reads

Observation-only `storage.get`, `tabs.get/query`, permission checks and similar APIs should use bounded read/deadline semantics. A late abandoned read result must not later resume/start a parent side effect. P1-158 owns this class.

### B. Serialized non-cancellable mutations

Inside an actual-settlement mutation owner, raw Storage get/set/remove may correctly define physical settlement. The actual promise remains owned until settlement; caller may receive bounded pending/unknown; later conflicting turns remain ordered and are admission-capped/coalesced under P1-173. Mechanically wrapping each raw mutation in abandon-on-timeout `Promise.race` would regress ordering.

Positive examples in the reviewed source: Journal context mutation chain, Yandex config mutation chain, Journal stats marker mutation and backup state serialized mutations.

### C. Browser-owned side effects with observable receipts

`tabs.create`, `executeScript`, `downloads.download`, debugger and Action use subsystem-specific actual settlement + late receipt/repair, not generic read wrappers.

### D. User-owned browser prompts

`permissions.request` and native Save As must not receive arbitrary semantic timeouts while the browser/user owns the prompt. Ownership/liveness/reconciliation is modeled separately.

### Confirmed P1-158 bypass

`readYandexAuthState()` includes direct unbounded `chrome.storage.local.get('yandexConfig')`, and `getYandexConfig()` itself is an unbounded direct read used by upload, destructive move, locate/root, folder and status flows. The fix must cover the broad config-read primitive or establish one bounded immutable `YandexOperationContext`; patching only one call site is insufficient.

P0-074 composes with P1-158: bounded prerequisite read addresses liveness, while immutable context/generation addresses consistency. Neither alone replaces the other.

### Existing owners for other direct API inventories

- extension-page version refresh -> P1-209 plus bounded prerequisite semantics;
- all-tab Action query/fan-out -> P1-170;
- direct page-command send -> P1-175/P1-157/P1-125/P1-171, not a pure-read wrapper;
- frame-agent message timeout does not prove document/session authority;
- post-print diagnostics bounded response does not replace P0-070 exact-document truth.

## Retired source set

After this consolidation and a changed-file-only compare, the following broad files may be removed from current `main` while their originals remain in Git history:

- `RESEARCH_DELTA_MULTI_BLOCK_REVALIDATION_2026-08-28.md`
- `RESEARCH_DELTA_MULTI_BLOCK_REVALIDATION_PART2_2026-08-28.md`
- `RESEARCH_DELTA_BROWSER_OWNED_WORKER_GENERATIONS_REVALIDATION_2026-08-28.md`
- `RESEARCH_DELTA_RUNTIME_SENDER_ACL_REVALIDATION_2026-08-27.md`
- `RESEARCH_DELTA_SERVICE_WORKER_CHROME_API_BYPASS_INVENTORY_2026-08-28.md`

No product tests were rerun by this consolidation. Historical 88/88 syntax + 74/74 deterministic PASS remains prior evidence only.
