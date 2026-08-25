const fs = require('fs');
const assert = require('assert');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');

assert(worker.includes("operationId: String(data.operationId || '').slice(0, MAX_OPERATION_ID_CHARS)"), 'durable journal data must preserve operationId');
assert(worker.includes("journalCreatedAt = 0, operationId = ''"), 'appendJournalEntry must accept exact operationId');
assert(worker.includes("operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS)"), 'journal record must persist bounded operationId');
assert(worker.includes('const importedOperationIdRaw = String(raw.operationId || \'\').trim();'), 'journal import must explicitly sanitize operationId');

assert(journal.includes('function buildLinkedOperationLog(entry)'), 'Journal linked OperationLog UI must exist');
assert(journal.includes("{ type: 'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId }"), 'Journal must fetch log by exact operationId');
assert(journal.includes("sendReadOnlyRuntimeMessage("), 'linked log reads must use bounded actual-settlement read RPC helper');
assert(journal.includes("makeButton('Показать лог'"), 'Journal must expose show-log action');
assert(journal.includes("makeButton('Копировать лог'"), 'Journal must expose copy-log action');
assert(journal.includes('WebClip не подбирает лог по имени файла или времени.'), 'old entries must not use fuzzy log matching');
assert(journal.includes("String(log.operationId || '') !== exactOperationId"), 'returned log identity must be verified');
console.log('P1-148 linked Journal OperationLog regression PASS');
