# P1-225 — Journal comment Save must freeze or preserve newer local draft

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-225`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`journal.js` Git blob: `1138e4fbf177e31008f510bc1addfd539885f10e`  
`service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Research branch: `research/p1-225-comment-draft-save-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-225 remains the single current owner for this root cause:

> Journal comment editor must freeze or preserve a newer draft after Save admission; late success cannot silently destroy text typed while the request was pending.

The canonical family evidence in `RESEARCH_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md` already established this exact local data-loss schedule and intentionally separated it from P0-076, which owns authoritative Journal mutation CAS across entries/tabs/generations.

The current pass binds P1-225 to fresh `main`, confirms the original current-shape defect still exists, adds the self-notification/reload race created by `WEBCLIP_JOURNAL_CHANGED`, models both allowed UI contracts, and adds a source-bound production closure gate.

No new P-code is required.

## 2. Current editor shape

Current `journal.js::buildJournalComments(entry)` creates editor state inside the rendered comment-card closure:

```js
let editorMode = '';
let editingCommentId = '';
```

When editing is active it creates:

```js
const input = document.createElement('textarea');
input.value = editing ? editing.text : '';
```

The same function supports both:

- Add Comment;
- Edit Comment.

The P1-225 contract therefore must cover both paths.

## 3. Current Save admission

The Save handler validates the textarea, then disables only the Save and Cancel buttons:

```js
save.disabled = true;
cancel.disabled = true;
```

It captures the submitted text into the outbound mutation message:

```js
const message = editing
  ? { type: 'WEBCLIP_JOURNAL_EDIT_COMMENT', id: entry.id, commentId: editing.id, comment: input.value }
  : { type: 'WEBCLIP_JOURNAL_ADD_COMMENT', id: entry.id, comment: input.value };
```

and then awaits:

```js
const result = await chrome.runtime.sendMessage(message);
```

This gives the remote/local mutation a concrete submitted value A.

However the textarea itself is neither `readonly` nor `disabled` and has no local draft revision/generation receipt.

The user can therefore type a new B while A is pending.

## 4. Current success path destroys newer draft

After successful result, current code applies committed entry state and unconditionally tears down the editor:

```js
entry.journalComments = normalizeEntryJournalComments(result.entry || entry);
entry.journalComment = String(result.entry?.journalComment || entry.journalComment || '');
editorMode = '';
editingCommentId = '';
setStatus(..., 'ok');
render();
```

There is no check that the textarea still contains the exact submitted draft A.

There is no edit revision captured at Save admission.

Therefore a newer unsent B is lost.

## 5. Deterministic local data-loss schedule

```text
user types A
→ Save captures A
→ Save/Cancel disabled
→ textarea remains editable
→ user types B
→ worker commits A
→ result success
→ editorMode=''
→ render committed A
→ unsent B disappears
```

The worker may have behaved completely correctly for submitted A. The defect is the page-local authority of the completion over the newer editor draft.

## 6. Existing failure path is a useful positive control

On ordinary RPC error, current code does:

```js
setStatus(error..., 'error');
save.disabled = false;
cancel.disabled = false;
```

and does not tear down the editor.

Because the textarea object remains in place, a B typed while the request was pending normally survives an ordinary caught failure.

P1-225 therefore specifically needs success-path draft ownership, while any freeze implementation must preserve equivalent failure UX by unfreezing the exact submitted draft.

## 7. New current-source refinement — self-notification can race direct completion

The service worker comment mutation flow does more than return a direct response.

After successful IndexedDB mutation, Add/Edit call:

```js
notifyJournalChanged('comment-add');
```

or:

```js
notifyJournalChanged('comment-edit');
```

before returning the `{ ok:true, entry:... }` result.

`notifyJournalChanged()` queues a runtime message:

```text
WEBCLIP_JOURNAL_CHANGED
```

and starts its runtime notification drain without awaiting that drain before the comment mutation returns.

The Journal page listens for that message and calls:

```js
scheduleJournalReload(40, { preserveScroll: true });
```

which later calls `loadJournal()`.

Therefore there are two success-side UI paths that can converge on a rerender:

1. the direct RPC completion inside `buildJournalComments()`;
2. the page-level Journal-changed reload caused by the same committed mutation.

The exact browser ordering between those paths is physical Chrome behavior and is not claimed from source inspection alone. But source proves the race exists as a schedule that production closure must tolerate.

## 8. Why this still belongs to P1-225

The new notification schedule does not create a separate root cause.

The invariant remains:

> once Save A is admitted, any later local draft B must either be impossible by explicit freeze or remain independent from committed A until B is explicitly submitted/cancelled.

If the product chooses generation-aware editing, local draft state cannot exist only in a disposable textarea/card closure if a self-induced page-level reload can replace that closure.

If the product chooses freeze-on-submit, no newer B can arise after admission, so the original data-loss class is closed with a simpler UX contract.

## 9. Two accepted implementation architectures

Historical evidence explicitly permits either approach.

### Option A — freeze submitted draft

At Save admission:

```text
capture submitted A
set textarea readonly/disabled
show pending state
block duplicate Save/Cancel as already done
```

After success:

```text
commit A is confirmed
close editor
render committed A
```

After failure:

```text
keep exact A in textarea
remove readonly/disabled
keep editor open
```

This is the smallest correctness patch if product UX accepts no typing while Save is pending.

### Option B — generation-aware editable draft

Maintain local state such as:

```text
CommentDraftState {
    entryId
    commentId / add-mode identity
    text
    editRevision
    editorOpen
}
```

Save creates an immutable receipt:

```text
CommentSaveReceipt {
    submittedText
    submittedEditRevision
    mode
    entryId
    commentId
}
```

Typing B increments `editRevision`.

A success may close the editor only when:

```text
current editRevision == submittedEditRevision
AND
current draft text == submittedText
```

If B exists, A is committed truth but has no authority to remove B.

## 10. Committed truth and local draft are different state domains

For generation-aware editing the UI must represent both:

```text
Committed comment truth = A
Current unsent local draft = B
```

This state is not contradictory.

The page may show a status such as:

```text
A saved; newer unsaved changes remain in editor
```

B must not be silently auto-committed. It becomes a separate later user operation only when the user explicitly presses Save again.

## 11. Add/Edit parity

P1-225 applies identically to:

- creating a new comment;
- editing an existing active comment.

The difference in worker mutation type does not change local draft ownership.

The source model therefore exercises both modes.

## 12. Interaction with P0-076

P0-076 remains authoritative for Journal mutation CAS.

Preserving local B after A succeeds does **not** grant B authority to overwrite a comment that was concurrently deleted/replaced/changed in another tab or Journal generation.

When B is later submitted, that new mutation must independently satisfy P0-076 entry/comment generation rules.

P1-225 is only about not losing the user's local unsent text.

## 13. Interaction with delete/tombstone owners

P1-202 and P1-211 define deletion semantics and tombstone lifecycle.

If an existing comment is deleted while a local edit draft exists, P1-225 preservation does not imply that the old draft can resurrect the comment.

The UI may preserve the text for user recovery while refusing/reconciling a later mutation under P0-076.

## 14. Deterministic model

Added:

`project_tools/test_p1_225_comment_draft_save_model.js`

The model first reproduces the current-shape failure:

```text
P1-225 current-shape counterexample: late save success discards newer local draft B
```

It then validates both accepted strategies.

### Freeze schedules

A. Add A -> Save -> textarea frozen -> attempted B typing is rejected -> A success closes.

B. Edit A -> Save -> failure -> editor reopens/unfreezes with exact submitted A.

### Generation-aware schedules

C. A submitted, no later edit -> A success may close editor.

D. Add A -> user types B -> A success commits A but preserves B and editor.

E. Edit existing comment -> A submitted -> B typed -> A success preserves B.

F. Worker/JOURNAL_CHANGED publishes committed A before direct response -> B remains local and visible; direct A success also preserves B.

G. Save A fails after B typing -> B remains.

H. A succeeds while B is preserved -> later explicit Save B is a separate operation and can then commit B.

Expected model output:

```text
P1-225 current-shape counterexample: late save success discards newer local draft B
P1-225 comment pending-save draft deterministic model: PASS
```

The model is UI-state evidence, not physical Chrome runtime evidence.

## 15. Source-bound closure gate

Added:

`project_tools/test_p1_225_comment_draft_save_source.js`

Positive controls require the existing feature to remain explicit:

- `buildJournalComments()`;
- `textarea` editor;
- Save action;
- Add mutation route;
- Edit mutation route;
- duplicate-save button disablement;
- Cancel disablement while mutation is pending.

The gate then accepts either:

### Freeze closure

- textarea becomes `readonly` or `disabled` before the first awaited runtime mutation;
- failure path restores editability.

### Generation-aware closure

- explicit comment/editor/draft generation or revision;
- input events update local draft authority;
- Save captures draft generation/revision;
- success teardown is guarded by current-draft ownership.

If the textarea remains editable, the gate rejects the current unconditional:

```text
requireOk(result)
→ editorMode=''
→ render()
```

shape.

## 16. Self-notification requirement for generation-aware implementation

If production chooses generation-aware editing rather than freeze, physical tests must include the actual `WEBCLIP_JOURNAL_CHANGED` path.

A correct implementation may use one of several designs:

- page-level draft state keyed by entry/comment identity that survives card rerender;
- defer/suppress self-induced Journal reload while a newer local draft exists;
- merge committed A into the card while keeping the editor subtree/draft B;
- another explicit architecture with equivalent semantics.

The research does not prescribe the exact mechanism.

## 17. Required production regressions

Before P1-225 can close, evidence should cover at least:

1. Add A, no later typing -> successful A behaves normally.
2. Edit A, no later typing -> successful A behaves normally.
3. Add A, type B while A pending -> either B is prevented by visible freeze or B survives A success.
4. Edit A, type B while A pending -> same rule.
5. Ordinary failure after A preserves the documented draft state.
6. If freeze is used, textarea is frozen before the first await and re-enabled on failure.
7. If generation-aware editing is used, A success with unchanged draft may close.
8. If generation-aware editing is used, A success with newer B leaves B visible and unsaved.
9. Self-induced `WEBCLIP_JOURNAL_CHANGED` before/around direct success cannot destroy newer B.
10. A success does not silently treat B as already saved.
11. Explicit later Save B creates a distinct mutation.
12. Concurrent delete/replacement does not allow preserved B to bypass P0-076.
13. Add and Edit use the same draft-loss policy.
14. Keyboard/focus behavior while pending matches the chosen contract.

Physical Chrome evidence is required for actual textarea input ordering, runtime message ordering and rerender/focus behavior.

## 18. Validation state

Actually executed during this research block:

- `node --check project_tools/test_p1_225_comment_draft_save_model.js` — PASS on locally created bytes;
- deterministic model execution — PASS;
- local Git blob hash of executed model recorded for committed-blob comparison;
- `node --check project_tools/test_p1_225_comment_draft_save_source.js` — PASS on locally created gate bytes;
- local Git blob hash recorded for committed-blob comparison.

The source gate was not executed against an exact materialized `journal.js` checkout in the execution container. Current RED is based on direct GitHub source inspection.

No production PASS and no physical Chrome E2E are claimed.

## 19. Research conclusion

Current Journal comment editor admits Save A while leaving the textarea editable, then unconditionally tears the editor down after A succeeds. A newer local B can therefore be silently lost.

The worker's `WEBCLIP_JOURNAL_CHANGED` publication adds a second success-side rerender path that generation-aware production design must tolerate.

P1-225 remains ACTIVE. Closure requires either explicit freeze-before-await or generation-aware draft preservation, plus deterministic/source regression and applicable physical Chrome evidence.
