'use strict';

const assert = require('assert');

class FreezeDraftModel {
  constructor(initial = '', mode = 'add') {
    this.mode = mode;
    this.draft = String(initial);
    this.editorOpen = true;
    this.readOnly = false;
    this.pending = null;
    this.committed = mode === 'edit' ? String(initial) : '';
  }
  type(value) {
    if (this.readOnly || !this.editorOpen) return false;
    this.draft = String(value);
    return true;
  }
  submit() {
    assert.ok(this.editorOpen && !this.pending);
    const submitted = this.draft;
    assert.ok(submitted.trim());
    this.readOnly = true;
    this.pending = { submitted, mode: this.mode };
    return this.pending;
  }
  success(receipt = this.pending) {
    assert.ok(receipt && receipt === this.pending);
    this.committed = receipt.submitted;
    this.pending = null;
    this.editorOpen = false;
    this.readOnly = false;
  }
  failure(receipt = this.pending) {
    assert.ok(receipt && receipt === this.pending);
    this.pending = null;
    this.readOnly = false;
    this.editorOpen = true;
    // Because typing was frozen, the exact submitted draft is still present.
    assert.strictEqual(this.draft, receipt.submitted);
  }
}

class GenerationDraftModel {
  constructor(initial = '', mode = 'add') {
    this.mode = mode;
    this.draft = String(initial);
    this.editRevision = 0;
    this.editorOpen = true;
    this.pending = null;
    this.committed = mode === 'edit' ? String(initial) : '';
    this.status = '';
  }
  type(value) {
    assert.ok(this.editorOpen);
    this.draft = String(value);
    this.editRevision += 1;
  }
  submit() {
    assert.ok(this.editorOpen && !this.pending);
    assert.ok(this.draft.trim());
    this.pending = {
      submitted: this.draft,
      editRevision: this.editRevision,
      mode: this.mode
    };
    return this.pending;
  }
  receiptStillOwnsDraft(receipt) {
    return this.editorOpen
      && this.editRevision === receipt.editRevision
      && this.draft === receipt.submitted;
  }
  journalChanged(committedValue) {
    // A page-level reload may update committed truth, but current local draft is
    // separate state and remains visible while an editor is open.
    this.committed = String(committedValue);
  }
  success(receipt = this.pending) {
    assert.ok(receipt && receipt === this.pending);
    this.committed = receipt.submitted;
    this.pending = null;
    if (this.receiptStillOwnsDraft(receipt)) {
      this.editorOpen = false;
      this.status = 'saved-and-closed';
    } else {
      this.editorOpen = true;
      this.status = 'saved-older-draft-newer-draft-preserved';
    }
  }
  failure(receipt = this.pending) {
    assert.ok(receipt && receipt === this.pending);
    this.pending = null;
    this.editorOpen = true;
    this.status = 'save-failed-draft-preserved';
  }
}

function legacyLateSuccess(initialDraft, newerDraft) {
  let input = initialDraft;
  const submitted = input;
  input = newerDraft;               // user types while request is pending
  const committed = submitted;      // worker commits A
  const editorOpen = false;          // current success tears editor down
  input = committed;                 // rerender displays committed A
  return { submitted, input, editorOpen };
}

const legacy = legacyLateSuccess('A', 'B');
assert.deepStrictEqual(legacy, { submitted: 'A', input: 'A', editorOpen: false });
console.log('P1-225 current-shape counterexample: late save success discards newer local draft B');

// A. Freeze policy: textarea becomes immutable at admission, so newer B cannot
// exist silently while A is pending.
{
  const m = new FreezeDraftModel('', 'add');
  m.type('A');
  const r = m.submit();
  assert.strictEqual(m.type('B'), false);
  assert.strictEqual(m.draft, 'A');
  m.success(r);
  assert.strictEqual(m.committed, 'A');
  assert.strictEqual(m.editorOpen, false);
}

// B. Freeze failure: exact submitted A is restored/editable after failure.
{
  const m = new FreezeDraftModel('old', 'edit');
  m.type('A');
  const r = m.submit();
  m.failure(r);
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.readOnly, false);
  assert.strictEqual(m.draft, 'A');
}

// C. Generation-aware policy with no newer edit: A success may close editor.
{
  const m = new GenerationDraftModel('', 'add');
  m.type('A');
  const r = m.submit();
  m.success(r);
  assert.strictEqual(m.committed, 'A');
  assert.strictEqual(m.editorOpen, false);
}

// D. Generation-aware policy: user types B while A is pending. A commits, but
// completion cannot discard B.
{
  const m = new GenerationDraftModel('', 'add');
  m.type('A');
  const r = m.submit();
  m.type('B');
  m.success(r);
  assert.strictEqual(m.committed, 'A');
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.draft, 'B');
  assert.strictEqual(m.status, 'saved-older-draft-newer-draft-preserved');
}

// E. Same contract for editing an existing comment.
{
  const m = new GenerationDraftModel('old', 'edit');
  m.type('A');
  const r = m.submit();
  m.type('B');
  m.success(r);
  assert.strictEqual(m.committed, 'A');
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.draft, 'B');
}

// F. Self-notification/reload may publish committed A before direct response.
// The page-level committed view updates, but newer local draft B remains.
{
  const m = new GenerationDraftModel('', 'add');
  m.type('A');
  const r = m.submit();
  m.type('B');
  m.journalChanged('A');
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.draft, 'B');
  m.success(r);
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.draft, 'B');
  assert.strictEqual(m.committed, 'A');
}

// G. Failure after newer typing preserves the current B draft.
{
  const m = new GenerationDraftModel('', 'add');
  m.type('A');
  const r = m.submit();
  m.type('B');
  m.failure(r);
  assert.strictEqual(m.editorOpen, true);
  assert.strictEqual(m.draft, 'B');
}

// H. After A succeeds while B is preserved, B can be explicitly submitted as
// a distinct later operation; A's success does not silently commit B.
{
  const m = new GenerationDraftModel('', 'add');
  m.type('A');
  const a = m.submit();
  m.type('B');
  m.success(a);
  assert.strictEqual(m.committed, 'A');
  const b = m.submit();
  m.success(b);
  assert.strictEqual(m.committed, 'B');
  assert.strictEqual(m.editorOpen, false);
}

console.log('P1-225 comment pending-save draft deterministic model: PASS');
