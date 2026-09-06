'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

const rebuildAll = functionBody(worker, 'rebuildAllUrlStats');
const rebuildOne = functionBody(worker, 'rebuildUrlStatsForUrl');
const updateAppend = functionBody(worker, 'updateUrlStatsAfterAppend');
const ensureHealthy = functionBody(worker, 'ensureJournalStatsHealthy');
const summary = functionBody(worker, 'getJournalSummaryForUrl');
const touchRevision = functionBody(worker, 'touchJournalDbRevision');

check(/JOURNAL_META_REVISION_KEY/.test(worker), 'primary Journal revision authority must remain present');
check(/JOURNAL_STATS_DIRTY_KEY/.test(worker), 'dirty-marker recovery intent must remain present');
check(/touchJournalDbRevision/.test(worker), 'primary Journal mutations must retain source-revision updates');
check(/append/.test(worker) && /delete-entry/.test(worker) && /import-replace/.test(worker) && /clear-/.test(worker), 'source revision coverage for append/delete/import/clear must remain discoverable');

check(/stats.*generation|urlStats.*generation|activeStatsGeneration|JOURNAL_STATS_.*GENERATION/i.test(worker), 'runtime needs explicit versioned urlStats generation metadata');
check(/active.*generation|generation.*active|activeStatsGeneration/i.test(worker), 'runtime needs one authoritative active stats generation pointer');
check(/staging|buildGeneration|pendingGeneration|generationStore|statsGeneration/i.test(rebuildAll), 'full rebuild must target a non-active staged generation');
check(/JOURNAL_META_REVISION_KEY|journalRevision|sourceRevision/i.test(rebuildAll), 'full rebuild must capture/compare authoritative Journal source revision');
check(/sourceRevision|capturedRevision|expectedRevision|JOURNAL_META_REVISION_KEY/i.test(rebuildAll), 'rebuild publication needs source-revision compare-and-switch');

check(!/objectStore\(JOURNAL_STATS_STORE\)\.clear\(\)/.test(rebuildAll), 'full rebuild must not clear the active live urlStats store before staged generation is complete');
check(!/const\s+current\s*=\s*req\.result\s*\|\|[^;]+;[\s\S]{0,500}dayCounts\[day\][\s\S]{0,500}store\.put/.test(rebuildAll) || /generation/i.test(rebuildAll), 'current-shaped direct live-store batch merge must be generation-isolated');

check(/active.*generation|generation.*active|resolve.*generation|statsGeneration/i.test(summary), 'urlStats reader must resolve and read one active generation');
check(/active.*generation|generation.*active|resolve.*generation|statsGeneration/i.test(updateAppend), 'append point update must resolve the current active generation');
check(/active.*generation|generation.*active|resolve.*generation|statsGeneration/i.test(rebuildOne), 'per-URL repair must resolve the current active generation');

check(/JOURNAL_STATS_DIRTY_KEY|dirty/i.test(ensureHealthy), 'healthy/read repair path must still honor dirty state');
check(/rebuildAllUrlStats/.test(ensureHealthy), 'dirty full-repair path must remain connected');
check(/revision/.test(touchRevision), 'Journal revision helper must remain explicit');

if (failures.length) {
  console.error('P0-050 urlStats generation isolation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-050 urlStats generation isolation source gate: PASS');
