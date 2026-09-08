'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'options.js'), 'utf8');

function must(re, message) { assert.match(source, re, message); }

// Positive controls: current features must remain explicit.
must(/let\s+yandexStatusGeneration\s*=\s*0/, 'Status refresh generation must remain explicit.');
must(/async\s+function\s+refreshStatus\s*\(/, 'refreshStatus must remain discoverable.');
must(/async\s+function\s+runBusy\s*\(/, 'runBusy must remain discoverable.');
must(/WEBCLIP_YANDEX_FINISH_AUTH/, 'Finish OAuth path must remain explicit.');
must(/WEBCLIP_YANDEX_SET_MANUAL_TOKEN/, 'Manual-token path must remain explicit.');
must(/WEBCLIP_YANDEX_SAVE_ROOT/, 'Save-root path must remain explicit.');
must(/WEBCLIP_YANDEX_CREATE_FOLDER/, 'Create Folder path must remain explicit for draft-clear parity.');

// P1-222 requires a user-edit/draft revision distinct from status-read generation.
must(/(?:draft|form|edit)[A-Za-z0-9_]*(?:Generation|Revision|Epoch)|(?:Generation|Revision|Epoch)[A-Za-z0-9_]*(?:draft|form|edit)/i,
  'Editable Options fields need an explicit edit/draft revision separate from yandexStatusGeneration.');
must(/addEventListener\s*\(\s*['"](?:input|change)['"]/, 'Mutable fields must advance draft authority on input/change.');
must(/(?:capture|snapshot|revision|generation)[A-Za-z0-9_]*(?:draft|edit|field)|(?:draft|edit|field)[A-Za-z0-9_]*(?:capture|snapshot|revision|generation)/i,
  'Async reads/writes must capture field edit authority at admission.');

// Status application must be conditional on unchanged user-edit authority.
must(/(?:apply|set|update)[A-Za-z0-9_]*(?:IfUnedited|IfCurrent|Draft|Field)|(?:is|has)[A-Za-z0-9_]*(?:Unedited|CurrentDraft)/i,
  'Status completion needs an explicit per-field user-edit guard.');
must(/clientId\.value[\s\S]{0,120}(?:draft|edit|revision|generation)|(?:draft|edit|revision|generation)[\s\S]{0,120}clientId\.value/i,
  'clientId status writes must compose with draft authority.');
must(/rootPath\.value[\s\S]{0,120}(?:draft|edit|revision|generation)|(?:draft|edit|revision|generation)[\s\S]{0,120}rootPath\.value/i,
  'rootPath status writes must compose with draft authority.');

// Mutation completion must not unconditionally clear/replace captured editable inputs.
assert.doesNotMatch(source,
  /WEBCLIP_YANDEX_FINISH_AUTH[\s\S]{0,1200}requireOk\(response\);\s*confirmationCode\.value\s*=\s*['"]['"]/,
  'Finish-auth completion must not unconditionally clear confirmationCode after await.');
assert.doesNotMatch(source,
  /WEBCLIP_YANDEX_SET_MANUAL_TOKEN[\s\S]{0,1200}requireOk\(response\);\s*manualToken\.value\s*=\s*['"]['"]/,
  'Manual-token completion must not unconditionally clear manualToken after await.');
assert.doesNotMatch(source,
  /WEBCLIP_YANDEX_SAVE_ROOT[\s\S]{0,1200}requireOk\(response\);\s*rootPath\.value\s*=\s*response\.rootPath/,
  'Save-root completion must not unconditionally replace a newer rootPath draft.');
assert.doesNotMatch(source,
  /WEBCLIP_YANDEX_CREATE_FOLDER[\s\S]{0,1200}requireOk\(response\);\s*newFolderName\.value\s*=\s*['"]['"]/,
  'Create Folder completion must not unconditionally clear a newer newFolderName draft.');

must(/(?:confirmationCode|manualToken|rootPath)[\s\S]{0,250}(?:unchanged|draft|editRevision|formRevision|generation)/i,
  'Mutation completion must reconcile captured editable fields only when their admission authority is still current.');

console.log('P1-222 Options draft-generation source gate: PASS');
