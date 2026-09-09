'use strict';
const fs = require('fs');
const worker = fs.readFileSync('service-worker.js','utf8');
const journal = fs.readFileSync('journal.js','utf8');
const failures=[];
const need=(src,re,label)=>{if(!re.test(src))failures.push(`MISSING: ${label}`);};
const forbid=(src,re,label)=>{if(re.test(src))failures.push(`LEGACY: ${label}`);};

// Shared W1 J0 authority must be the base, not a second Journal generation system.
need(worker,/JOURNAL_DB_VERSION\s*=\s*8\b/,'WebClipJournal v8 structural base');
need(worker,/datasetGeneration|JOURNAL_DATASET_GENERATION/,'W1 dataset generation JG');
need(worker,/entryRevision|expectedEntryRevision/,'per-entry ER authority');

// W4-A portable-data admission / provenance.
need(worker,/PortableDataAdmission|normalizePortableJournalEntry/,'one portable-data admission pipeline');
need(worker,/canonicalImportedTimestamp|normalizeImportedTimestamp/,'canonical finite imported timestamp domain');
need(worker,/validateImportedLocalDayKey|canonicalLocalDayKey/,'calendar-valid/plausible imported localDayKey');
need(worker,/CanonicalJournalUrlIdentity|canonicalJournalUrlIdentity/,'one canonical URL identity derivation');
need(worker,/historicalOperationId|operationIdProvenance/,'imported operationId historical-only provenance');
need(worker,/cssPathGrammarVersion|parseWebClipLocatorCssPath/,'versioned locator cssPath grammar');
need(worker,/uniqueCommentIds|normalizeImportedCommentIds/,'per-entry unique imported comment ids');
need(worker,/BackupSelectionReceipt|backupSelectionReceipt/,'exact selected backup object receipt');
forbid(worker,/const hostname = boundedImportString\(raw\.hostname \|\|/,'imported raw hostname overrides URL-derived hostname');
forbid(worker,/createdAt = Number\.isFinite\(Number\(raw\.createdAt\)\) \? Number\(raw\.createdAt\) : Date\.now\(\)/,'any finite createdAt is accepted');
forbid(worker,/operationId:\s*importedOperationId\b/,'imported historical operationId stored as live operationId field');
forbid(worker,/cssPath:\s*String\(locator\.cssPath \|\| ''\)\.slice\(/,'arbitrary native CSS selector retained from portable data');

// W4-B canonical URL identity + derived projection generation.
need(worker,/urlStatsGeneration|publishedUrlStatsGeneration/,'versioned urlStats projection generation');
need(worker,/urlStatsV2|urlStatsGenerations/,'isolated/shadow urlStats generation store');
need(worker,/urlIdentityMigration|canonicalUrlIdentityMigration/,'resumable legacy URL identity migration');
forbid(worker,/const request = entries\.index\('urlKey'\)\.openCursor\(IDBKeyRange\.only\(key\)\)/,'point urlStats correctness depends solely on persisted legacy urlKey index');

// W4-C one revision-coherent composed view and revision-bound cursor.
need(worker,/JournalViewReceipt|journalViewReceipt/,'worker JournalViewReceipt');
need(worker,/expectedJournalRevision|expectedViewRevision/,'view queries accept expected revision');
need(journal,/JournalViewReceipt|viewReceipt/,'journal page consumes exact view receipt');
need(journal,/revision.*cursor|cursor.*revision/i,'pagination/group cursor is source-revision bound');
forbid(journal,/await renderCurrentEntries\(\);[\s\S]{0,300}await syncJournalRevisionBaseline\(\)/,'meta and rows may publish before final revision coherence proof');

// W4-D comment exact identity, lifecycle and draft authority.
need(worker,/expectedJournalGeneration|expectedDatasetGeneration/,'comment mutations carry expected JG');
need(worker,/expectedEntryRevision/,'comment mutations carry expected ER');
need(worker,/commentLifecyclePolicy|COMMENT_DELETE_POLICY/,'explicit P1-202 product policy switch/constant');
need(worker,/compactCommentTombstone|commentHistoryRetention/,'bounded tombstone lifecycle');
need(journal,/commentDraftGeneration|draftGeneration/,'P1-225 local draft generation');
forbid(worker,/comments\.findIndex\(\(item\) => item\.id === commentId\)/,'comment mutation resolved only by textual id after stale read');

// W4-E OperationLog and settings reconciliation generations stay independent.
need(worker,/OPERATION_LOG_DB_VERSION\s*=\s*3\b/,'OperationLog v3 history-generation migration');
need(worker,/operationLogHistoryGeneration|historyGeneration/,'OperationLog HG');
need(worker,/expectedHistoryGeneration/,'OperationLog writers/cleanup fenced by HG');
need(worker,/settingsImportGeneration|importGeneration/,'settings import reconciliation generation');
need(worker,/compareAndRemoveSettingsImportMarker|expectedImportGeneration/,'old settings reconciliation cannot remove newer marker');

if(failures.length){
  console.error('Wave 4 Journal/portable history source gate: RED');
  for(const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Wave 4 Journal/portable history source gate: GREEN');
