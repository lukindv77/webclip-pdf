# Audit delta — Journal comment save must not discard text typed after admission — 2026-08-29

Baseline `main` before this write: `4bf8fe1edc056ff9095fed79b96b7e3d0b8d52bd`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-225 — Journal comment editor leaves textarea editable while save is in flight, then late success tears down the editor and can silently discard newer unsent text.**

This is distinct from P0-076 / rendered-revision owners, which govern which Journal record/comment generation may be mutated. P1-225 owns local draft text entered **after** the admitted mutation payload was captured.

## Source proof

`buildJournalComments(entry)` creates a normal editable `<textarea>`.

On Save:

```js
if (!input.value.trim()) ...
save.disabled = true;
cancel.disabled = true;
const message = editing
  ? { ..., comment: input.value }
  : { ..., comment: input.value };
const result = await chrome.runtime.sendMessage(message);
```

Only Save and Cancel buttons are disabled. The textarea remains editable.

After success the code unconditionally exits editor mode and rerenders:

```js
entry.journalComments = ...;
editorMode = '';
editingCommentId = '';
setStatus(...);
render();
```

Any characters typed into the textarea after the request payload was captured are not part of the committed comment and are destroyed when the editor DOM is replaced.

## Deterministic local-data-loss schedule

1. User types comment text A.
2. User clicks `Сохранить комментарий`; payload A is captured and sent.
3. Request/IndexedDB mutation remains in flight.
4. Textarea is still enabled, so user continues typing, producing local draft B (A plus new text, or replacement text).
5. Worker successfully commits A and returns.
6. UI clears editor mode and rerenders from committed response A.
7. Newer unsent draft B disappears without warning.

No worker failure or stale database row is needed; the loss occurs on the normal success path.

## Required contract

Choose and document one of two safe models:

### Freeze submitted draft

- disable/readOnly the textarea immediately after payload capture;
- make it visually clear that submitted text is awaiting settlement;
- re-enable with the exact submitted text on failure.

### Generation-aware editable draft

- capture a local editor/draft generation with payload A;
- allow continued typing into generation B;
- on A success update committed entry state, but close/replace the editor only if current draft generation still equals A;
- if B exists, preserve it as unsent draft and clearly show that A was saved while B remains pending.

For edits of an existing comment, worker-side exact entry/comment revision/CAS remains mandatory independently. A local draft receipt does not authorize mutation of a replacement Journal generation.

## Required regressions

1. Type A -> Save -> no further typing -> success closes editor normally.
2. Type A -> Save -> type B before success -> B is either impossible because textarea is frozen or remains visibly preserved as unsent draft.
3. Same case for editing an existing comment.
4. Save failure restores/retains exact submitted text and any documented newer draft semantics.
5. Delete/replace/import changing the underlying entry while save is pending remains governed by P0-076/CAS and cannot convert preserved draft into authority for another generation.
6. Re-render/load generation changes do not silently erase an acknowledged local unsent draft without an explicit discard policy.

## Duplicate check / numbering

Repository semantic search for Journal comment textarea, pending save, draft generation and text loss found no existing dedicated owner. Existing comment capacity/tombstone and Journal mutation-generation items concern persisted record correctness, not text entered locally after save admission.

Current repository search found no `P1-225`; P1-224 is the latest assigned new owner on current `main`. Therefore this checkpoint assigns **P1-225**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax + 74/74 deterministic PASS were not rerun for this HEAD.