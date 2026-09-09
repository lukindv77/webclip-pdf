# WebClip — Wave 1 user-operation reconciliation D-finalization addendum — 2026-09-09

Date: 2026-09-09  
Canonical production baseline rechecked before this addendum: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-user-operation-reconciliation-2026-09-09`  
Mode: **RESEARCH-ONLY / CHANGE-IMPACT ADDENDUM**  
Primary owner remains: **P1-210**.  
Mandatory composition refined by D0/D1/D2: **P0-070, P0-072, P0-076, P1-090, P1-183** plus the existing operation/destination owners.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this addendum.

---

## 1. Why this addendum exists

The earlier unified reconciliation contract was written before the later D0/D1/D2 source specification made two Journal rules fully explicit:

1. a durable **early scoped `JournalFinalizationIntent` F** exists before render/external work so a later URL/site clear can revoke only matching finalization authority;
2. **external-effect ownership and Journal-finalization authority are separate truths**.

The existing reconciliation architecture remains valid, but its terminal classification must be refined for one important state:

```text
external effect = exactly verified/completed
Journal finalization = intentionally/authority-safely suppressed
```

This state is not:

```text
remote failure
whole-operation success with Journal row present
new-attempt-safe failure
```

---

## 2. Source-bound current UI gap remains concrete

Current `content.js` still creates a page-local UUID and uses it as `operationId` before Yandex save/retry. On an error path the UI can expose:

```text
Повторить отправку
Сформировать и отправить заново
```

Current `journal.js` similarly creates page-local UUIDs for destructive Delete and Mark Read operations and exposes a generic `Повторить` action after errors.

Current worker accepts caller-provided textual `operationId` in representative save paths.

These are presentation/correlation mechanisms in current production, not worker-issued physical authority.

The E cutover must therefore remain dependent on the preceding P1-198 operation-admission cutover.

---

## 3. OperationLog remains diagnostics, not functional reconciliation authority

Current OperationLog supports:

```text
success
partial
error
canceled
```

and is retention/cleanup controlled.

Its `partial` presentation vocabulary is useful, but the durable common reconciliation result must not be derived from OperationLog status. Functional state comes from exact admission/domain/finalization receipts.

A later OperationLog cleanup must not turn a known unresolved operation into `not-admitted`.

---

## 4. Refined operation class: `settled-partial`

Add one common `operationClass` value:

```text
settled-partial
```

Strict definition:

```text
lookupResolution = exact
AND every already-admitted external/browser effect is exactly settled
AND at least one required downstream local/domain finalization is proven suppressed/revoked
AND no remaining automatic continuation is authorized
```

Primary D example:

```text
Yandex move/upload exactly verified
+ JournalFinalizationIntent F revoked by clear/import/replacement
+ exact current Journal CAS correctly not applied
```

Projection:

```text
operationClass = settled-partial
retryDisposition = none
```

This says:

```text
we know what happened
we must not repeat the old external effect
we also must not claim the original full postcondition remains present
```

---

## 5. Why `failed-terminal` is not enough

`failed-terminal` remains appropriate for true exact terminal failures such as:

```text
remote content hash mismatch
exact DownloadItem interrupted
provider identity mismatch requiring manual/quarantine policy
```

But a user later clearing/replacing Journal authority after an external effect started is not a failure of that external effect.

Classifying it merely as `failed-terminal` risks two UI mistakes:

1. presentation may imply the provider/browser action failed when it actually completed;
2. a future generic failure-retry policy may accidentally enable another physical mutation.

`settled-partial` makes the no-blind-retry rule structural.

---

## 6. `UserOperationReconcileResultV1` refinement

Target enum becomes:

```text
not-admitted
running
domain-pending
effect-unknown
succeeded
settled-partial
failed-before-effect
failed-terminal
canceled
evidence-limited
```

Existing `domain.finalization` must expose an exact state such as:

```text
not-applicable
admitted
pending
committed
revoked
suppressed-by-journal-generation
suppressed-by-entry-revision
```

For a D terminal split result, a representative projection is:

```js
{
  lookupResolution: 'exact',
  operationClass: 'settled-partial',
  retryDisposition: 'none',

  domain: {
    effectSettlement: 'verified',
    finalization: 'suppressed-by-journal-generation'
  },

  userAction: {
    mayStartNewPhysicalOperation: false,
    mayResumeSamePhysicalOperation: false,
    mayRunReadOnlyReconcile: true,
    requiresManualResolution: false
  }
}
```

`mayRunReadOnlyReconcile` may remain true to refresh/explain current truth even though no mutation retry is authorized.

---

## 7. D0/D1/D2 authority precedence in E

Refined precedence for Journal-coupled operations:

```text
1. exact worker physical admission receipt P
2. exact JournalFinalizationIntent F
3. exact domain effect E / provider-browser receipt O
4. exact Journal JG/ER/JR evidence
5. current postcondition read
6. UI ephemeral state
7. OperationLog diagnostics
```

For remote-save/local-download operations, immutable PDF/context receipts remain part of exact domain authority as defined by B/C.

No lower layer may overrule a stronger durable receipt.

---

## 8. Effect start vs clear/import projection

### 8.1 Clear wins before effect start

D effect-start transaction observes revoked/stale F before provider/browser mutation admission.

Projection:

```text
operationClass = canceled
retryDisposition = new-attempt-allowed
```

provided exact evidence proves no relevant effect admission.

### 8.2 Effect start wins, settlement unknown

```text
E.phase = started-unknown
F later revoked
```

Projection remains:

```text
operationClass = effect-unknown
retryDisposition = reconcile-only
```

F revocation does not change unknown external truth into cancellation.

### 8.3 Effect verifies after F revocation

```text
E = verified
F = revoked
Journal finalization = suppressed
```

Projection:

```text
operationClass = settled-partial
retryDisposition = none
```

Never launch the same remote move/upload/download as a retry.

---

## 9. Same-id Journal replacement

D0 introduced exact `JG + ER` authority.

If an old operation finishes after import/replace created a new row with the same `entry.id`:

```text
remote effect may be verified
old local CAS must reject
replacement row remains untouched
```

Projection is:

```text
settled-partial
```

when all external work is exactly settled and the only suppressed step is stale local finalization.

It is **not** `domain-pending`, because automatic local continuation against the replacement row is forbidden.

---

## 10. Scoped clear and bounded subject discovery

The early F intent refines page-reload subject discovery.

For a save admitted on URL A:

```text
F.scope.urlKey = A
```

A clear for URL A revokes matching F records. A clear for URL B does not.

Therefore E subject discovery must consume exact F scope/generation rather than infer cancellation from current Journal absence.

This prevents both:

```text
clear A -> stale save A resurrects Journal
```

and:

```text
clear A -> unrelated save B incorrectly canceled
```

---

## 11. UI action vocabulary after D composition

UI actions remain driven only by `retryDisposition` plus exact domain continuation capability.

```text
new-attempt-allowed -> Повторить
same-operation-only -> Продолжить / Возобновить
reconcile-only -> Проверить результат
manual-resolution -> Открыть детали / Решить вручную
none + succeeded -> Готово
none + settled-partial -> Показать результат / Закрыть
```

For `settled-partial`, the explanatory text must identify both truths, for example:

```text
Файл на Яндекс Диске подтверждён, но запись не добавлена в текущий журнал,
потому что журнал был очищен или заменён после начала операции.
```

No generic “Повторить” button is shown.

---

## 12. Current production negative controls strengthened

Current source remains RED against E because:

- caller-generated operation IDs are still used for correlation/namespace;
- content error UI can expose blind Yandex retry/new-render buttons;
- Journal delete error UI can expose generic retry;
- no common `WEBCLIP_USER_OPERATION_RECONCILE` production API exists;
- no `settled-partial` functional projection exists;
- no early F/JG/ER D implementation exists;
- OperationLog only provides diagnostics/history, not functional settlement authority.

These are expected pre-implementation gaps, not new owners.

---

## 13. Deterministic D→E composition model

Committed research model:

```text
project_tools/test_wave1_reconciliation_finalization_composition_model.js
```

Local execution before commit:

```text
Wave 1 D→E reconciliation composition model: PASS
cases=40
```

Covered assertions include:

- verified effect + revoked F + suppressed finalization -> `settled-partial`;
- `settled-partial` never exposes new-attempt retry;
- effect started/unknown remains `effect-unknown` even when F later revoked;
- verified effect + admitted F + pending finalization remains `domain-pending`;
- verified effect + committed finalization becomes `succeeded`;
- pre-effect F revocation may become exact `canceled`;
- legacy/ambiguous lookup remains manual/evidence-limited.

This is L2 architecture evidence only.

---

## 14. Coverage-status correction

The earlier reconciliation document contains a historical line:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
```

That line must **not** be treated as the current project-wide research status.

Subsequent coverage reconciliation identified the PD7 single-axis-scroll current-Stable browser receipt as still required. The current PD7 state is:

```text
REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE
```

and exact current target execution evidence has not yet been obtained in the available research environment.

Therefore current project-wide status remains:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = NOT YET RE-DECLARED
```

until the exact PD7 target receipt is attached and fresh Coverage Reconciliation confirms no other stale/nonterminal CORE cell.

This addendum supersedes only the **current-status interpretation** of the old line; it does not rewrite historical evidence.

---

## 15. Result after D→E change impact

```text
Existing reconciliation architecture                 = RETAINED
D early JournalFinalizationIntent composition         = ADDED
External effect vs Journal finalization split         = ADDED
settled-partial terminal class                        = ADDED
Blind retry prohibition after partial exact settlement = STRENGTHENED
D→E deterministic composition                         = PASS 40/40
Production implementation                             = NOT STARTED
Registry status changes                               = NONE
New P-code                                             = NONE
Project-wide coverage complete                        = NOT YET RE-DECLARED
Critical closure                                      = INCOMPLETE
Release                                               = NOT READY
```
