'use strict';
const assert = require('assert');

class OptionsDraftModel {
  constructor(initial = {}) {
    this.fields = new Map();
    for (const [name, value] of Object.entries(initial)) {
      this.fields.set(name, { value, editRevision: 0, dirty: false });
    }
    this.nextEditRevision = 1;
    this.nextStatusGeneration = 1;
    this.currentStatusGeneration = 0;
    this.nextMutationGeneration = 1;
    this.persistedStatus = {};
  }

  ensure(name) {
    if (!this.fields.has(name)) this.fields.set(name, { value: '', editRevision: 0, dirty: false });
    return this.fields.get(name);
  }

  edit(name, value) {
    const field = this.ensure(name);
    field.value = value;
    field.editRevision = this.nextEditRevision++;
    field.dirty = true;
    return field.editRevision;
  }

  read(name) { return this.ensure(name).value; }

  startStatusRefresh(fieldNames) {
    const generation = this.nextStatusGeneration++;
    this.currentStatusGeneration = generation;
    const editRevisions = {};
    for (const name of fieldNames) editRevisions[name] = this.ensure(name).editRevision;
    return { generation, editRevisions, fieldNames: [...fieldNames] };
  }

  completeStatusRefresh(receipt, status) {
    if (receipt.generation !== this.currentStatusGeneration) return { applied: [], stale: true };
    this.persistedStatus = { ...this.persistedStatus, ...status };
    const applied = [];
    for (const name of receipt.fieldNames) {
      if (!Object.prototype.hasOwnProperty.call(status, name)) continue;
      const field = this.ensure(name);
      if (field.editRevision !== receipt.editRevisions[name]) continue;
      field.value = status[name];
      field.dirty = false;
      applied.push(name);
    }
    return { applied, stale: false };
  }

  startMutation(kind, captures = {}) {
    const generation = this.nextMutationGeneration++;
    const fields = {};
    for (const name of Object.keys(captures)) {
      const field = this.ensure(name);
      fields[name] = {
        editRevision: field.editRevision,
        capturedValue: field.value,
        submittedValue: captures[name]
      };
    }
    return { generation, kind, fields };
  }

  fieldStillOwned(receipt, name) {
    const captured = receipt.fields[name];
    const field = this.ensure(name);
    return Boolean(captured)
      && field.editRevision === captured.editRevision
      && field.value === captured.capturedValue;
  }

  clearCapturedFieldOnSuccess(receipt, name) {
    if (!this.fieldStillOwned(receipt, name)) return false;
    const field = this.ensure(name);
    field.value = '';
    field.dirty = false;
    return true;
  }

  replaceCapturedFieldOnSuccess(receipt, name, value) {
    if (!this.fieldStillOwned(receipt, name)) return false;
    const field = this.ensure(name);
    field.value = value;
    field.dirty = false;
    return true;
  }
}

// Current-shape counterexample: refresh generation alone does not protect newer user edits.
{
  let yandexStatusGeneration = 0;
  const root = { value: '/persisted-A' };
  const generation = ++yandexStatusGeneration;
  root.value = '/draft-B'; // user edit while status request is pending
  if (generation === yandexStatusGeneration) root.value = '/persisted-A';
  assert.strictEqual(root.value, '/persisted-A');
  console.log('P1-222 current-shape counterexample: current refresh overwrites newer user draft');
}

// A. Passive status refresh cannot overwrite a newer rootPath edit.
{
  const m = new OptionsDraftModel({ rootPath: '/A' });
  const r = m.startStatusRefresh(['rootPath']);
  m.edit('rootPath', '/B');
  m.completeStatusRefresh(r, { rootPath: '/A' });
  assert.strictEqual(m.read('rootPath'), '/B');
}

// B. Latest refresh still wins among reads when there are no user edits.
{
  const m = new OptionsDraftModel({ rootPath: '/A' });
  const r1 = m.startStatusRefresh(['rootPath']);
  const r2 = m.startStatusRefresh(['rootPath']);
  assert.strictEqual(m.completeStatusRefresh(r1, { rootPath: '/OLD' }).stale, true);
  m.completeStatusRefresh(r2, { rootPath: '/NEW' });
  assert.strictEqual(m.read('rootPath'), '/NEW');
}

// C. Finish OAuth may clear only the exact confirmation-code draft it submitted.
{
  const m = new OptionsDraftModel({ confirmationCode: 'code-A' });
  const op = m.startMutation('finish-auth', { confirmationCode: 'code-A' });
  m.edit('confirmationCode', 'code-B');
  assert.strictEqual(m.clearCapturedFieldOnSuccess(op, 'confirmationCode'), false);
  assert.strictEqual(m.read('confirmationCode'), 'code-B');
}

// D. Manual-token completion cannot clear a newer token draft.
{
  const m = new OptionsDraftModel({ manualToken: 'token-A' });
  const op = m.startMutation('manual-token', { manualToken: 'token-A' });
  m.edit('manualToken', 'token-B');
  assert.strictEqual(m.clearCapturedFieldOnSuccess(op, 'manualToken'), false);
  assert.strictEqual(m.read('manualToken'), 'token-B');
}

// E. Save-root completion cannot replace a root draft typed after admission.
{
  const m = new OptionsDraftModel({ rootPath: '/A' });
  const op = m.startMutation('save-root', { rootPath: '/A' });
  m.edit('rootPath', '/B');
  assert.strictEqual(m.replaceCapturedFieldOnSuccess(op, 'rootPath', '/A-canonical'), false);
  assert.strictEqual(m.read('rootPath'), '/B');
}

// F. Start-auth prefetched status cannot overwrite a newer clientId edit.
{
  const m = new OptionsDraftModel({ clientId: 'client-A', rootPath: '/root' });
  const op = m.startMutation('start-auth', { clientId: 'client-A' });
  const refresh = m.startStatusRefresh(['clientId', 'rootPath']);
  m.edit('clientId', 'client-B');
  m.completeStatusRefresh(refresh, { clientId: 'client-A', rootPath: '/root2' });
  assert.strictEqual(m.read('clientId'), 'client-B');
  assert.strictEqual(m.read('rootPath'), '/root2');
  assert.ok(op);
}

// G. If the submitted draft was not edited, successful mutation may reconcile it.
{
  const m = new OptionsDraftModel({ rootPath: '/draft' });
  const op = m.startMutation('save-root', { rootPath: '/draft' });
  assert.strictEqual(m.replaceCapturedFieldOnSuccess(op, 'rootPath', '/canonical'), true);
  assert.strictEqual(m.read('rootPath'), '/canonical');
}

// H. Per-field revisions preserve unrelated edits while allowing untouched fields to refresh.
{
  const m = new OptionsDraftModel({ clientId: 'A', rootPath: '/A', publicLinksEnabled: true });
  const r = m.startStatusRefresh(['clientId', 'rootPath', 'publicLinksEnabled']);
  m.edit('rootPath', '/B');
  m.completeStatusRefresh(r, { clientId: 'SERVER', rootPath: '/SERVER', publicLinksEnabled: false });
  assert.strictEqual(m.read('rootPath'), '/B');
  assert.strictEqual(m.read('clientId'), 'SERVER');
  assert.strictEqual(m.read('publicLinksEnabled'), false);
}

console.log('P1-222 Options draft-generation deterministic model: PASS');
