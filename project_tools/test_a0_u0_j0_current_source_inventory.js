'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
let cases = 0;
const check = (cond, msg) => { cases += 1; assert.ok(cond, msg); };
const absent = (text, needle, msg) => check(!text.includes(needle), msg);
const present = (text, needle, msg) => check(text.includes(needle), msg);

const worker = fs.readFileSync('service-worker.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');
const content = fs.readFileSync('content.js', 'utf8');
const offscreen = fs.readFileSync('offscreen.js', 'utf8');
const journalHtml = fs.readFileSync('journal.html', 'utf8');
const optionsHtml = fs.readFileSync('options.html', 'utf8');

// A0 is absent from current production source.
absent(worker, "WebClipOperationReceipts", 'current worker has no functional OperationReceipt DB');
absent(worker, 'OPERATION_RECEIPT_DB_VERSION', 'current worker has no OperationReceipt schema constant');
absent(worker, 'clientRequestId', 'current worker has no clientRequestId admission identity');
present(worker, "const OPERATION_LOG_DB_VERSION = 2", 'current OperationLog remains v2 diagnostics');

// U0 is absent / current repair is precommitted.
absent(worker, 'WEBCLIP_WORKER_PROTOCOL_VERSION', 'current worker has no internal worker protocol v2');
absent(content, 'WEBCLIP_CONTENT_PROTOCOL_VERSION', 'current content has no protocol v2');
absent(offscreen, 'WEBCLIP_OFFSCREEN_PROTOCOL_VERSION', 'current offscreen has no protocol v2');
present(content, 'globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__', 'current content uses legacy global duplicate-load sentinel');
present(worker, 'await chrome.storage.local.set({ [WEBCLIP_RUNTIME_VERSION_KEY]: version });', 'current extension-page version marker is written before repair completion');
present(worker, 'await chrome.tabs.reload(tab.id)', 'current page repair reloads extension tabs');
present(worker, 'if (contexts.length > 0) return;', 'current offscreen existence-by-URL is accepted without handshake');
present(offscreen, 'const blobUrls = new Map();', 'current offscreen owns pinned Blob URL continuations');
present(offscreen, 'let activeTransfers = 0;', 'current offscreen owns actual transfer lifetime');

// J0 is not implemented and journal page is still a competing schema owner.
present(worker, "const JOURNAL_DB_VERSION = 7", 'current worker opens Journal v7');
present(journal, "const JOURNAL_DB_VERSION = 7", 'current Journal page opens Journal v7');
present(journal, "db.createObjectStore(JOURNAL_STORE", 'current Journal page can structurally create entries store');
present(journal, "db.createObjectStore('urlStats'", 'current Journal page can structurally create urlStats store');
present(journal, "db.createObjectStore('pendingAppends'", 'current Journal page owns pendingAppends schema');
present(journal, "db.createObjectStore('pendingRemoteSaves'", 'current Journal page owns pendingRemoteSaves schema');
present(journal, "db.createObjectStore('importStaging'", 'current Journal page owns importStaging schema');
absent(journal, 'WEBCLIP_JOURNAL_SCHEMA_READY', 'current Journal page has no worker schema-ready barrier');
present(journal, 'Promise.all([resolveSourceContext(), loadJournalViewPreferences()])', 'current startup reaches load sequence without schema-ready barrier');
present(journal, '.then(() => loadJournal({ preserveScroll: false, clearStatus: true }))', 'current startup invokes loadJournal directly');

// Current shared PDF cache is still v3; J0 must not accidentally couple B1.
present(worker, "const PDF_CACHE_DB_VERSION = 3", 'current worker PDF cache is v3');
present(offscreen, "const PDF_CACHE_DB_VERSION = 3", 'current offscreen PDF cache is v3');

// Save As continuation runs inside Journal/Options pages, so blind page reload is unsafe.
present(journalHtml, '<script src="prepared-save-as.js"></script>', 'Journal page hosts native Save As continuation code');
present(optionsHtml, '<script src="prepared-save-as.js"></script>', 'Options page hosts native Save As continuation code');

console.log(`A0/U0/J0 current-source inventory: PASS; RED facts=${cases}`);
