# P1-222 — Options async completion must be latest-user-edit-wins

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-222`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`options.js` Git blob: `a07d4376d41c989540492816fb36729078776338`  
Research branch: `research/p1-222-options-draft-generation-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-222 remains the single current owner for this root cause:

> Options async status/mutation completion is latest-user-edit-wins; stale completion cannot overwrite or clear a newer unsaved draft.

This is a UI authority problem, not proof that the worker-side Yandex mutation itself targeted the wrong remote account/path/value. A request may correctly capture draft A and correctly commit A while the Options page still violates user intent by later erasing draft B typed after admission.

Historical evidence already established two parts of P1-222:

- `RESEARCH_DELTA_OPTIONS_STATUS_REFRESH_FORM_EDIT_GENERATION_2026-08-29.md` — passive/current status refresh must not overwrite a newer form edit;
- `RESEARCH_DELTA_OPTIONS_MUTATION_COMPLETION_DRAFT_GENERATION_2026-08-29.md` — write/auth completion must obey the same draft-generation rule.

The current pass binds those findings to fresh `main`, separates per-field draft authority from read generation, covers write-result reconciliation, and adds deterministic/model + source-bound production closure gates. No new P-code is required.

## 2. Current source — read generation is not edit generation

`options.js` has:

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

This is a useful positive control: an older status read cannot overwrite a newer status read.

But it does not answer a different question:

> Has the user edited this field since this read was admitted?

There is no separate Yandex form/draft revision for `clientId`, `rootPath`, `publicLinksEnabled`, `manualToken`, or `confirmationCode`. Current `input` handling found in `options.js` is for OperationLog search, not for Yandex draft ownership.

Therefore a status request R can be the latest status generation and still be stale relative to user edit B.

### Deterministic stale-read schedule

1. `rootPath` displays persisted A.
2. `refreshStatus()` admits R and captures only `yandexStatusGeneration`.
3. User types unsaved B into `rootPath`.
4. No newer status refresh starts, therefore R remains the current `yandexStatusGeneration`.
5. R returns persisted A.
6. `refreshStatus()` writes A into `rootPath.value`.
7. Draft B is silently destroyed.

The current generation check therefore proves only **latest-read-wins**, not **latest-user-edit-wins**.

## 3. Current source — mutation completion has the same authority gap

`runBusy(button, fn)` disables only the initiating button:

```js
const previous = button.disabled;
button.disabled = true;
...
await fn();
...
button.disabled = previous;
```

Related editable fields stay editable while their operation is pending.

Current examples:

### Finish OAuth

The operation captures:

```js
code: confirmationCode.value.trim()
```

After the worker response, current code unconditionally does:

```js
confirmationCode.value = '';
```

If the user typed a new code B while old code A was pending, success of A clears B.

### Manual token

The operation captures:

```js
token: manualToken.value.trim()
```

and later unconditionally does:

```js
manualToken.value = '';
```

A newer token draft can therefore be erased by completion of an older admitted token.

### Save Root

`saveRoot(path)` correctly captures its remote mutation target as function argument `path`. After `WEBCLIP_YANDEX_SAVE_ROOT` returns, however, it does:

```js
rootPath.value = response.rootPath;
```

If the user typed a new root draft while the save was pending, the older save completion replaces it.

### Start OAuth + prefetched refresh

Start OAuth captures `clientId.value.trim()`, waits for the worker, then calls `refreshStatus(response)`. Because the Start button rather than `clientId` is disabled, a new Client ID draft may be entered while the operation is pending and then overwritten by the prefetched completion.

These are the same root cause as passive refresh: completion lacks current draft ownership.

## 4. Required state model

The Options page should distinguish at least four states:

1. **persisted/verified status** — worker truth returned by a read or mutation result;
2. **editable draft** — what the user currently sees/types;
3. **dirty/edit revision** — local authority proving whether a field changed after an async admission point;
4. **operation receipt** — immutable capture of the exact draft revision/value submitted by an operation.

A practical model is per-field rather than one global form generation:

```text
FieldDraft {
  value
  editRevision
  dirty
}
```

A status-read receipt records:

```text
StatusReceipt {
  statusGeneration
  editRevisionByField
}
```

A mutation receipt records:

```text
MutationDraftReceipt {
  operationGeneration
  field
  capturedValue
  capturedEditRevision
  submittedValue
}
```

## 5. Why per-field revision is preferable

A single global edit generation is safe but unnecessarily coarse.

Example:

1. status read covers `clientId`, `rootPath`, and `publicLinksEnabled`;
2. user edits only `rootPath`;
3. response contains a new verified `clientId` and publication preference;
4. global generation mismatch would suppress all form updates;
5. per-field revisions preserve the new root draft while still allowing untouched fields to converge.

The research model therefore uses per-field revisions.

## 6. Status refresh transition rule

At read admission:

```text
capture statusGeneration
capture editRevision[field] for every editable field the response may write
```

At completion:

```text
if statusGeneration is stale:
    discard ordinary status completion
else:
    update non-editable status presentation as allowed
    for each editable field:
        if current editRevision == captured editRevision:
            apply persisted value
            clear/reconcile dirty state as appropriate
        else:
            preserve current draft
```

A stale user-edit field is not an error. It means persisted truth and current draft are intentionally different.

## 7. Mutation completion transition rule

A write/auth operation captures the exact draft it submits.

After success, any draft-side mutation such as:

- clearing `confirmationCode`;
- clearing `manualToken`;
- replacing `rootPath` with a canonical response;
- applying a prefetched status object;

is permitted only if the field still belongs to the captured draft receipt.

A useful admission predicate is:

```text
current.editRevision == receipt.editRevision
AND
current.value == receipt.capturedValue
```

If the user edited the field after admission, the worker result still remains factual worker/persisted truth, but it has no authority to overwrite the newer local draft.

## 8. Important non-goals / owner boundaries

P1-222 does not replace:

- `P0-074` immutable Yandex operation context;
- `P1-178` auth attempt generation;
- `P1-191` manual-token candidate/validate/commit rules;
- `P1-210` unknown outer transport settlement/reconciliation;
- `P1-223` Create Folder mutation target vs later browse-refresh intent.

P1-222 owns only editable Options draft authority after async admission.

Likewise, disabling every editable field until completion would avoid some stale-edit schedules but would be a product/UI locking policy, not the only correct architecture. The stronger invariant is that if edits are allowed, completion is conditional on unchanged draft authority.

## 9. Deterministic model

Added:

`project_tools/test_p1_222_options_draft_generation_model.js`

The model first reproduces the current-shape counterexample and then exercises eight schedules:

A. passive status read vs newer `rootPath` edit;
B. old read vs newer read positive control;
C. Finish OAuth A vs newer confirmation-code draft B;
D. manual token A vs newer token draft B;
E. Save Root A vs newer root draft B;
F. Start OAuth/prefetched status vs newer Client ID edit;
G. successful mutation with no intervening edit may reconcile the submitted field;
H. per-field revision preserves one dirty field while untouched fields still refresh.

Expected output:

```text
P1-222 current-shape counterexample: current refresh overwrites newer user draft
P1-222 Options draft-generation deterministic model: PASS
```

The model is intentionally UI-state deterministic and does not claim Chrome physical evidence.

## 10. Source-bound production closure gate

Added:

`project_tools/test_p1_222_options_draft_generation_source.js`

The gate keeps positive controls for:

- `yandexStatusGeneration`;
- `refreshStatus()`;
- `runBusy()`;
- Finish OAuth;
- Manual Token;
- Save Root.

It then requires:

1. an explicit form/draft edit revision distinct from `yandexStatusGeneration`;
2. `input/change` admission for mutable draft changes;
3. captured field edit authority at async admission;
4. guarded status writes for `clientId` / `rootPath` rather than bare latest-refresh authority;
5. no unconditional clearing of `confirmationCode` after Finish OAuth;
6. no unconditional clearing of `manualToken` after Manual Token completion;
7. no unconditional replacement of `rootPath` from an older Save Root completion;
8. explicit current-draft reconciliation for mutation results.

Current source is expected RED against this contract.

## 11. Required production regressions

Before P1-222 can close, production tests should cover at least:

1. Status read starts at root A; user types B; read returns A -> B remains visible/dirty.
2. Status R1 starts, R2 starts, no edits -> R2 result wins and R1 cannot overwrite it.
3. Finish Auth submits code A; user types B before result -> success of A does not clear B.
4. Finish Auth submits A; no later edit -> successful A may clear A.
5. Manual Token submits A; user types B -> A completion does not clear B.
6. Save Root submits A; user types B -> A completion may update verified persisted state but not replace draft B.
7. Save Root submits A; no newer edit -> canonical returned path may reconcile the field.
8. Start Auth submits Client ID A; user types B before prefetched status application -> B survives.
9. User edits `rootPath` while status response also changes untouched `clientId` -> root draft survives and client field can still converge.
10. Public-link checkbox edit during an older status read is not reverted by that response.
11. Unknown/failed mutation result does not fabricate dirty-state reconciliation.
12. Imported/settings-driven refresh respects the same edit-generation rule when it writes editable Options controls.

Physical Chrome evidence should additionally verify actual DOM `input`/`change` ordering and focus/typing behavior while the initiating button is disabled.

## 12. Research conclusion

Current `options.js` has a sound latest-status-read generation but lacks an orthogonal local draft/edit generation. Several mutation handlers likewise mutate editable controls after await without proving that the exact captured draft is still current.

P1-222 therefore remains ACTIVE.

Production closure requires a field-scoped latest-user-edit-wins mechanism, exact mutation-draft receipts, deterministic source regression and applicable physical Options-page evidence. This research block itself changes no production runtime or canonical status.
