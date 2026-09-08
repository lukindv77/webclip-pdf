'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'journal.js'), 'utf8');

function functionSlice(name) {
  const starts = [`function ${name}`, `async function ${name}`]
    .map((m) => source.indexOf(m)).filter((x) => x >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const candidates = [source.indexOf('\nfunction ', start + 20), source.indexOf('\nasync function ', start + 20)]
    .filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

const comments = functionSlice('buildJournalComments');

// Positive controls: current add/edit editor and mutation routes remain explicit.
assert.match(comments, /document\.createElement\s*\(\s*['"]textarea['"]\s*\)/,
  'Journal comment editor must still expose a textarea.');
assert.match(comments, /Сохранить комментарий/,
  'Journal comment save action must remain explicit.');
assert.match(comments, /WEBCLIP_JOURNAL_ADD_COMMENT/,
  'Add-comment mutation route must remain explicit.');
assert.match(comments, /WEBCLIP_JOURNAL_EDIT_COMMENT/,
  'Edit-comment mutation route must remain explicit.');
assert.match(comments, /save\.disabled\s*=\s*true/,
  'Pending save state must still block duplicate Save admission.');
assert.match(comments, /cancel\.disabled\s*=\s*true/,
  'Pending save state must still block Cancel from racing the submitted operation.');

// P1-225 permits either of two safe UI contracts.
// Contract A: freeze the submitted textarea before the first await.
const freezeBeforeAwait = /input\.(?:readOnly|disabled)\s*=\s*true[\s\S]{0,1800}await\s+chrome\.runtime\.sendMessage\s*\(/.test(comments);
const freezeFailureRestoresEditability = /catch\s*\([^)]*\)\s*\{[\s\S]{0,800}input\.(?:readOnly|disabled)\s*=\s*false/.test(comments);

// Contract B: keep editing enabled but track a local draft generation/revision
// and guard success teardown against a newer draft.
const hasDraftGeneration = /(?:comment|editor|draft)[A-Za-z0-9_]*(?:Generation|Revision)|(?:generation|revision)[A-Za-z0-9_]*(?:comment|editor|draft)/i.test(source);
const tracksInputEdits = /input\.addEventListener\s*\(\s*['"]input['"][\s\S]{0,500}(?:generation|revision|draft)/i.test(comments);
const capturesDraftAuthority = /(?:submitted|captured|pending|receipt)[A-Za-z0-9_]*[\s\S]{0,500}(?:generation|revision)/i.test(comments);
const guardedSuccessTeardown = /(?:if|else)\s*\([^)]*(?:generation|revision|draft)[^)]*\)[\s\S]{0,900}editorMode\s*=\s*['"]{2}/i.test(comments)
  || /(?:generation|revision|draft)[\s\S]{0,500}(?:preserv|newer|current)[\s\S]{0,900}editorMode\s*=\s*['"]{2}/i.test(comments);
const generationAware = hasDraftGeneration && tracksInputEdits && capturesDraftAuthority && guardedSuccessTeardown;

assert.ok(
  (freezeBeforeAwait && freezeFailureRestoresEditability) || generationAware,
  'P1-225 requires either pre-await textarea freeze with failure unfreeze, or generation-aware editable-draft preservation.'
);

// A pending success must not rely only on button disablement while textarea
// remains editable and then unconditionally tear the editor down.
if (!freezeBeforeAwait) {
  assert.doesNotMatch(comments,
    /requireOk\s*\(\s*result\s*\)[\s\S]{0,500}editorMode\s*=\s*['"]{2}[\s\S]{0,200}render\s*\(\s*\)/,
    'Editable pending draft must not be unconditionally destroyed after an older save succeeds.');
}

console.log('P1-225 comment pending-save draft source gate: PASS');
