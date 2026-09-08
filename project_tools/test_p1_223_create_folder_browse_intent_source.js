'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'options.js'), 'utf8');

function must(re, message) { assert.match(source, re, message); }

// Positive controls for current folder navigation and remote mutation target capture.
must(/let\s+folderBrowseGeneration\s*=\s*0/, 'Folder browse generation must remain explicit.');
must(/async\s+function\s+loadFolders\s*\(/, 'loadFolders must remain discoverable.');
must(/const\s+generation\s*=\s*\+\+folderBrowseGeneration/, 'Each visible folder navigation must advance browse generation.');
must(/generation\s*!==\s*folderBrowseGeneration/, 'Late list responses must remain generation-fenced.');
must(/WEBCLIP_YANDEX_CREATE_FOLDER/, 'Create Folder path must remain explicit.');
must(/const\s+path\s*=\s*joinPath\s*\(\s*currentBrowsePath\s*,\s*name\s*\)/,
  'Create Folder must capture an immutable remote target before await.');

// P1-223: create admission must also capture current browse intent for post-success UI authority.
must(/(?:browseGenerationAtAdmission|createFolderBrowseGeneration|admittedBrowseGeneration|browseGenerationReceipt)/,
  'Create Folder must capture browse generation at admission.');
must(/(?:parentPathAtAdmission|createFolderParentPath|admittedParentPath|parentPathReceipt)/,
  'Create Folder must capture the admitted parent path separately from mutable currentBrowsePath.');

// Post-success visible refresh is conditional on unchanged browse generation and uses the admitted parent.
must(/folderBrowseGeneration\s*={2,3}\s*(?:browseGenerationAtAdmission|createFolderBrowseGeneration|admittedBrowseGeneration|browseGenerationReceipt)|(?:browseGenerationAtAdmission|createFolderBrowseGeneration|admittedBrowseGeneration|browseGenerationReceipt)\s*={2,3}\s*folderBrowseGeneration/,
  'Post-create refresh must prove no newer browse generation exists.');
must(/loadFolders\s*\(\s*(?:parentPathAtAdmission|createFolderParentPath|admittedParentPath|parentPathReceipt)\s*\)/,
  'Post-create visible refresh must target the admitted parent, not mutable currentBrowsePath.');

// Explicitly reject the current stale-refresh shape.
assert.doesNotMatch(source,
  /WEBCLIP_YANDEX_CREATE_FOLDER[\s\S]{0,1400}requireOk\(response\);[\s\S]{0,300}await\s+loadFolders\s*\(\s*currentBrowsePath\s*\)/,
  'Late Create Folder completion must not blindly reload mutable currentBrowsePath.');

// Success feedback remains tied to actual create result, not inferred current UI location.
must(/Папка создана:[^`]*\$\{response\.path\}/,
  'Create success feedback must identify the actual created response path.');

console.log('P1-223 Create Folder browse-intent source gate: PASS');
