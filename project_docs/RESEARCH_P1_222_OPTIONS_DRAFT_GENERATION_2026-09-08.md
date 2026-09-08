# P1-222 — Options async completion must be latest-user-edit-wins

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-222`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`options.js` Git blob: `e603455b346f56d047a650b03986453c3ad663a9`  
Research branch: `research/p1-222-options-draft-generation-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-222 remains the single owner for this root cause:

> Options async status/mutation completion is latest-user-edit-wins; stale completion cannot overwrite or clear a newer unsaved draft.

This is a UI authority problem, separate from worker-side Yandex mutation correctness. A request may correctly capture and commit draft A while the Options page still violates current user intent by erasing draft B typed after admission.

Historical evidence already established both passive-read and mutation-completion forms:

- `RESEARCH_DELTA_OPTIONS_STATUS_REFRESH_FORM_EDIT_GENERATION_2026-08-29.md`;
- `RESEARCH_DELTA_OPTIONS_MUTATION_COMPLETION_DRAFT_GENERATION_2026-08-29.md`.

Fresh P1-223 review also exposed Create Folder's unconditional `newFolderName.value = ''` as another concrete P1-222 instance. No new P-code is required.

## 2. Current source proof — latest read is not latest edit

Current `options.js` has:

```js
let yandexStatusGeneration = 0;
```

and `refreshStatus()` does:

```js
const generation = ++yandexStatusGeneration;
const status = ... await ...;
requireOk(status);
if (generation !== yandexStatusGeneration) return;

clientId.value = status.clientId || clientId.value || '';
redirectUri.value = status.redirectUri || '';
rootPath.value = status.rootPath || '';
publicLinksEnabled.checked = status.createPublicLinks !== false;
```

This correctly prevents an older status read from overwriting a newer status read. It does not prove that an editable field has remained untouched by the user since the request started.

Current source has no separate Yandex form/draft revision for `clientId`, `rootPath`, `publicLinksEnabled`, `manualToken`, `confirmationCode`, or `newFolderName`. The `input` listener found in current `options.js` is for OperationLog search, not Yandex draft ownership.

Deterministic schedule:

1. `rootPath` shows persisted A.
2. `refreshStatus()` starts R.
3. User types unsaved B.
4. No newer status refresh starts, so R remains current by `yandexStatusGeneration`.
5. R returns A.
6. Current code writes A into `rootPath.value`.
7. B is silently destroyed.

Thus `yandexStatusGeneration` proves **latest-read-wins**, not **latest-user-edit-wins**.

## 3. Current source proof — mutation completion parity

`runBusy(button, fn)` disables only the initiating button and leaves related input fields editable while the operation awaits.

Concrete current paths:

### Finish OAuth

Captures `confirmationCode.value.trim()` and, after async completion, unconditionally executes:

```js
confirmationCode.value = '';
```

A newer confirmation-code draft can be erased by completion of the older submitted code.

### Manual token

Captures `manualToken.value.trim()` and later unconditionally executes:

```js
manualToken.value = '';
```

A newer token draft can be erased by completion of the older token operation.

### Save Root

The remote target is correctly captured as `path`, but after `WEBCLIP_YANDEX_SAVE_ROOT` returns current code does:

```js
rootPath.value = response.rootPath;
```

A root draft typed after save admission can therefore be replaced by the older completion.

### Start OAuth

The operation captures `clientId.value.trim()`, awaits the worker, then calls `refreshStatus(response)`. The Start button is disabled, not `clientId`, so a newer Client ID draft may be overwritten by the prefetched completion.

### Create Folder — added during P1-223 review

The operation captures:

```js
const name = newFolderName.value.trim();
```

and after the remote Create Folder response current code unconditionally does:

```js
newFolderName.value = '';
```

If the user has typed Folder-B while Folder-A is pending, completion of Folder-A clears Folder-B. This is P1-222 draft authority; P1-223 separately owns whether the same completion may start a visible folder reload.

All of these are one root cause: async completion lacks current draft ownership.

## 4. Required state model

The Options page should distinguish:

1. persisted/verified worker status;
2. current editable draft;
3. dirty/edit revision per mutable field;
4. immutable operation receipt for the exact draft submitted.

Recommended field model:

```text
FieldDraft {
  value
  editRevision
  dirty
}
```

Status-read receipt:

```text
StatusReceipt {
  statusGeneration
  editRevisionByField
}
```

Mutation receipt:

```text
MutationDraftReceipt {
  operationGeneration
  field
  capturedValue
  capturedEditRevision
  submittedValue
}
```

## 5. Per-field revision rather than only global form revision

A single global edit generation is safe but coarse. If the user edits only `rootPath`, an incoming status response may still safely update untouched `clientId` or other presentation fields.

Per-field revisions give the stronger convergence rule:

```text
for each editable response field:
  if current.editRevision == receipt.editRevision[field]:
      apply persisted value
  else:
      preserve current draft
```

A dirty field is not an error; it represents intentional divergence between persisted truth and current unsaved user intent.

## 6. Mutation completion rule

A result may clear or canonicalize a captured field only while the exact submitted draft is still current:

```text
current.editRevision == receipt.capturedEditRevision
AND
current.value == receipt.capturedValue
```

If either condition is false, worker/persisted truth remains factual but has no authority to overwrite the newer local draft.

This applies to:

- clearing `confirmationCode`;
- clearing `manualToken`;
- replacing `rootPath`;
- applying prefetched status after Start OAuth;
- clearing `newFolderName` after Create Folder.

## 7. Owner boundaries

P1-222 does not replace:

- `P0-074` immutable Yandex operation context;
- `P1-178` auth-attempt generation;
- `P1-191` manual-token candidate validation/commit;
- `P1-210` unknown outer transport settlement/reconciliation;
- `P1-223` Create Folder mutation target vs later browse-refresh authority.

P1-222 owns only editable Options draft authority after asynchronous admission.

## 8. Deterministic model

Added:

`project_tools/test_p1_222_options_draft_generation_model.js`

Schedules:

A. passive status read vs newer `rootPath` edit;
B. old read vs newer read positive control;
C. Finish OAuth A vs newer confirmation-code draft B;
D. Manual Token A vs newer token draft B;
E. Save Root A vs newer root draft B;
F. Start OAuth/prefetched status vs newer Client ID edit;
G. no intervening edit -> successful mutation may reconcile its captured field;
H. per-field revision preserves one edited field while untouched fields still refresh;
I. Create Folder name A vs newer `newFolderName` draft B.

Expected output:

```text
P1-222 current-shape counterexample: current refresh overwrites newer user draft
P1-222 Options draft-generation deterministic model: PASS
```

The model is deterministic UI-state evidence, not physical Chrome evidence.

## 9. Source-bound closure gate

Added:

`project_tools/test_p1_222_options_draft_generation_source.js`

It requires:

1. explicit draft/edit revision distinct from `yandexStatusGeneration`;
2. draft authority advanced by `input/change` for mutable fields;
3. captured edit authority at async admission;
4. conditional status writes for editable controls;
5. no unconditional post-await clearing of `confirmationCode`;
6. no unconditional post-await clearing of `manualToken`;
7. no unconditional post-await replacement of `rootPath` from older Save Root result;
8. no unconditional post-await clearing of `newFolderName` from older Create Folder result;
9. explicit current-draft reconciliation for mutation results.

Current source is expected RED against this production contract.

## 10. Required regressions before closure

1. Status read starts at root A; user types B; read returns A -> B survives.
2. R1 then R2, no edits -> R2 wins and R1 cannot overwrite it.
3. Finish Auth submits A; user types B -> A success does not clear B.
4. Finish Auth submits A; no later edit -> successful A may clear A.
5. Manual Token A; user types B -> A completion does not clear B.
6. Save Root A; user types B -> persisted truth may update, draft B survives.
7. Save Root A; no newer edit -> canonical response may reconcile the field.
8. Start Auth with Client ID A; user types B before prefetched status -> B survives.
9. Edit only `rootPath`; status also changes untouched `clientId` -> root draft survives and untouched field may converge.
10. Publication checkbox edit during an older status read is not reverted by that response.
11. Create Folder submits name A; user types name B while pending -> A completion does not clear B.
12. Create Folder A with no later name edit -> success may clear exactly A while P1-223 independently decides refresh relevance.
13. Unknown/failed mutation result does not fabricate dirty-state reconciliation.
14. Import/settings-triggered refresh obeys the same draft-generation rule.

Physical Options-page evidence should additionally verify real DOM event ordering and typing/focus behavior while an initiating button is disabled.

## 11. Conclusion

Fresh current-source review confirms the historical P1-222 root cause and expands concrete coverage to Create Folder's editable name field. Current `options.js` has a useful latest-status-read generation but no orthogonal user-edit/draft authority, and multiple mutation completions directly rewrite editable controls after `await`.

P1-222 remains ACTIVE. Production closure requires field-scoped latest-user-edit-wins semantics, immutable mutation-draft receipts, deterministic source regression and applicable physical Options-page verification.
