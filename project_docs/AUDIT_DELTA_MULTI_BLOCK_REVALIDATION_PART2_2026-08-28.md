# Audit delta — multi-block revalidation, part 2 — 2026-08-28

Source-of-truth `main` immediately before this write: `29aea17e760b9af395a5c1fa43ac800c7cfa0e3f`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Scope

This checkpoint closes the late refinements from the previous large source-audit pass and records duplicate/positive-control decisions so they are not lost between sessions.

No new P-number is allocated by this checkpoint.

## 1. P1-167 refinement — bounded diagnostic output is not bounded diagnostic computation

`content.js::capturePageStructureDiagnostics()` stores only bounded structural diagnostics, and the worker additionally sanitizes/limits the OperationLog payload. That remains a useful P1-147 output-size control.

Fresh source proof shows that the computation itself still includes full-document work before the bounded object is produced:

- it evaluates `String(body?.innerText || body?.textContent || '').length` for the complete top document;
- `diagnosticElementSnapshot()` may evaluate full selected-element `innerText/textContent` merely to keep a bounded numeric length;
- the helper is invoked during `prepareForPrint()`, on `beforeprint`, on `afterprint`, and through the post-print diagnostic RPC.

Therefore a hostile/very large DOM can pay O(document-text) work several times even though only a few bounded numbers/items reach OperationLog.

Classification: **refinement of existing P1-167**, not a new number. P1-167 already owns PDF-preparation/print paths lacking a shared visited-node/time/string budget. P1-147 remains the output-schema/diagnostic-content owner and should not be weakened.

Required acceptance refinement:

- diagnostics must consume the same shared PDF-preparation traversal/time/string budget as the work they observe;
- do not materialize whole-document text only to calculate a length; use bounded traversal/accounting or explicit `>= cap` truncation semantics;
- repeated prepared/before/after captures must have a combined per-operation budget, not independent full scans;
- if the diagnostic budget is exhausted, record an explicit `truncated/budgetExceeded` fact rather than causing the save path to stall/OOM;
- bounded diagnostic output and bounded diagnostic acquisition are separate requirements.

Required regressions:

1. Huge body text / many text nodes: diagnostic acquisition stops at the shared cap and records truncation.
2. prepared + beforeprint + afterprint together cannot triple an unbounded full-body scan.
3. Normal pages retain current P1-147 fields.
4. Diagnostic truncation never changes Journal/PDF source-of-truth semantics.

## 2. P1-035 / P1-043 refinement — quota-pressure cleanup can delete active long-lived staging

`service-worker.js::ensureStorageBudget()` does more than inspect `navigator.storage.estimate()`:

1. if free space is below `required + STORAGE_SAFETY_RESERVE_BYTES`, it calls `cleanupTransferPayloads()`;
2. then expired PDF-cache cleanup;
3. then OperationLog cleanup;
4. then re-estimates storage.

`cleanupTransferPayloads()` is TTL-based (`TRANSFER_PAYLOAD_TTL_MS = 2 h`). Existing P1-035 already proves that TTL alone cannot distinguish an orphaned transfer/import staging object from one still owned by a live long-running confirmation/import/export flow.

Fresh implication: the bug is not limited to hourly maintenance. Any unrelated operation that invokes storage preflight while the origin is under pressure can trigger the same TTL cleanup and remove an active >2 h staged payload.

Classification:

- **P1-035** remains the owner-lifetime/active-staging cleanup root cause;
- **P1-043** remains the quota-admission/reservation owner because `ensureStorageBudget()` is still snapshot-only and concurrent writers may all pass the same free-space estimate;
- no new number is created for the fact that quota pressure is an additional trigger.

Required P1-035 refinement:

- cleanup eligibility must be based on owner/lease/generation state plus TTL, not TTL alone;
- active import confirmation, active export/download, active backup transfer and any staged payload referenced by a durable recovery/checkpoint receipt must be protected from opportunistic quota cleanup;
- cleanup should prefer proven orphan/terminal generations;
- stale owner lease must have a crash-recoverable bounded reclamation rule.

Required P1-043 composition:

- a successful quota snapshot does not reserve bytes;
- concurrent staging/PDF/OperationLog/import work needs reservation/admission accounting before large materialization/commit;
- cleanup must not manufacture free space by deleting another operation's active recovery evidence.

## 3. Existing large-selection / hostile-DOM items remain source-confirmed

Fresh source revalidation keeps the following owners open without new numbering:

- **P0-064** — selected same-origin iframe flattening deep-clones complete child subtrees and materializes full source/target descendant arrays before the 2500 computed-style cap is applied;
- **P1-154** — `serializeSelectionSnapshot()` gathers local and remote locators first and applies `.slice(0, 250)` only after aggregate materialization;
- **P1-168** — locator creation/scoring still materializes sibling arrays (`[...parent.children]`, tag-filter copies) repeatedly;
- **P0-067** — print preparation still invokes real host `control.click()` for disclosure expansion;
- **P0-068** — flattened iframe proxy still uses active `cloneNode(true)` and removes scripts/excludes only after cloning; iframe/object/embed/custom-element inertness is not established before mount.

These are not new discoveries; they are current-source confirmation that the corresponding OPEN items remain real.

## 4. Existing Journal / OperationLog generation items remain source-confirmed

No new number is assigned for these revalidations:

- **P1-206** — one Journal render can still compose metadata/page reads from separate IndexedDB transactions, then `syncJournalRevisionBaseline()` reads the current revision after rendering rather than a revision proven to match every published component;
- **P1-173** — per-operation/ad-hoc actual-settlement chains can still allocate one waiting Promise/closure turn per later caller behind a never-settling actual side effect;
- **P1-197 / P1-205** — OperationLog retention/clear generations and delete-vs-write linearization remain incomplete; current in-memory write chains are not a durable history epoch.

## 5. Existing scheduler/account/Incognito items remain source-confirmed

- **P1-177 + P0-074** — a long backup can still use its old `status.enabled/interval/retry` snapshot to publish future alarms after newer Settings policy won; disabled `worker-start` fast path does not proactively repair unexpected stale alarms.
- **P0-074 / P0-073** — `testYandexConnection()` still performs `/disk` first and only afterward reads current auth before caching account metadata, allowing an old response to contaminate a newer auth generation unless generation-fenced.
- **P0-045** — popup still invokes backup-status loading immediately, before classifying the active/source tab as Incognito; existing Incognito popup/action/permission deltas remain applicable.

## 6. Security positive controls retained

Fresh review did **not** find an additional P-number in these areas:

- offscreen signed transfer accepts only trusted extension senders and HTTPS `disk.yandex.net` / subdomains;
- content-origin `WEBCLIP_OPEN_URL` is restricted to saved Yandex URLs rather than arbitrary HTTP(S);
- checked Journal/Options dynamic UI paths use text nodes / `textContent` for external strings instead of an external-data `innerHTML` sink;
- OAuth access token remains intended for `chrome.storage.session`; this checkpoint found no separate persistent-token/log sink beyond already tracked items.

The existing P0-033 signed-URL pathname regression remains separately recorded in `AUDIT_DELTA_SIGNED_URL_OPERATION_LOG_REDACTION_2026-08-27.md` / the immediately preceding audit commit. This file does not duplicate its ownership.

## Numbering result

No new P0/P1/P2 number allocated.

- P1-210 remains unassigned by this checkpoint.
- P1-167 owns diagnostic acquisition budget.
- P1-035 owns active staging lifetime under cleanup.
- P1-043 owns quota reservation/admission.
- P0-064/P0-067/P0-068/P1-154/P1-168 retain their existing hostile-DOM/print owners.
- P1-206/P1-173/P1-197/P1-205 retain their Journal/OperationLog owners.
- P1-177/P0-074/P0-073/P0-045 retain scheduler/auth/Incognito owners.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless a newer independently recorded gate exists. No runtime/config/manifest change was made. No build, tag or GitHub Release was created.
