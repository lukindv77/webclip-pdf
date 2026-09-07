'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

// Positive controls from current implementation.
requireSource(/CONTEXT_MENU_API_TIMEOUT_MS/.test(worker), 'missing bounded context-menu API deadline');
requireSource(/contextMenuLateMutationBarrier/.test(worker), 'missing same-worker actual-settlement barrier');
requireSource(/contextMenuInitializationPromise/.test(worker), 'missing same-worker initialization coalescing');
requireSource(/chrome\.contextMenus\.removeAll\(done\)/.test(worker), 'missing callback-based removeAll positive control');
requireSource(/chrome\.contextMenus\.create\(properties,\s*done\)/.test(worker), 'missing callback-based create positive control');
requireSource(/CONTEXT_MENU_REPAIR_ALARM_PREFIX/.test(worker), 'missing pre-armed context-menu repair alarm');
requireSource(/mutateChromeAlarmSerialized/.test(worker), 'missing serialized Chrome alarm mutation positive control');

// Target 1: durable generation state exists outside module memory.
requireSource(/CONTEXT_MENU_(?:REBUILD|REPAIR)_(?:STATE|GENERATION)_KEY|contextMenu(?:Rebuild|Repair)(?:State|Generation)Key/i.test(worker),
  'no durable context-menu rebuild state/generation key');
requireSource(/currentContextMenuGeneration|contextMenuCurrentGeneration|currentGeneration[\s\S]{0,400}contextMenu/i.test(worker),
  'no explicit durable current context-menu generation');
requireSource(/terminalContextMenuGeneration|contextMenuTerminalGeneration|terminalGeneration[\s\S]{0,400}contextMenu/i.test(worker),
  'no explicit durable terminal context-menu generation');

// Target 2: issued browser mutations have explicit unknown/settled phase semantics.
requireSource(/remove[-_ ]?issued[-_ ]?unknown|issued[-_ ]?unknown[\s\S]{0,300}remove/i.test(worker),
  'no explicit remove issued-unknown phase');
requireSource(/create[-_ ]?issued[-_ ]?unknown|issued[-_ ]?unknown[\s\S]{0,300}create/i.test(worker),
  'no explicit create issued-unknown phase');
requireSource(/remove[-_ ]?settled/i.test(worker) && /create[-_ ]?settled/i.test(worker),
  'no exact settled phases for remove/create');

// Target 3: repair alarm is tied to semantic generation, not attempt-only naming.
requireSource(/CONTEXT_MENU_REPAIR_ALARM_PREFIX[\s\S]{0,500}(?:generation|contextMenuGeneration)/i.test(worker),
  'context-menu repair alarm name is not visibly generation-bound');

// Target 4: a module-start path reconciles durable repair state; onStartup alone is insufficient.
requireSource(/reconcileContextMenu(?:Rebuild|Repair)|resumeContextMenu(?:Rebuild|Repair)|recoverContextMenu(?:Rebuild|Repair)/i.test(worker),
  'no explicit durable context-menu reconciliation helper');
requireSource(/(?:reconcile|resume|recover)ContextMenu(?:Rebuild|Repair)\([^)]*\)\s*\.catch|void\s+(?:reconcile|resume|recover)ContextMenu(?:Rebuild|Repair)/i.test(worker),
  'no visible top-level/module-start durable context-menu reconciliation trigger');

// Target 5: stale generations cannot clear/terminalize newer repair state.
requireSource(/contextMenu[\s\S]{0,5000}(?:generation\s*===|generation\s*!==|isContextMenuGenerationCurrent|compare.*generation|CAS)/i.test(worker),
  'no current-generation compare-and-act/CAS for context-menu durable mutations');
requireSource(/contextMenu[\s\S]{0,5000}(?:terminal|repairRequired)[\s\S]{0,2500}(?:generation|current)/i.test(worker),
  'terminal/repair clearing is not visibly generation-fenced');

// Target 6: unresolved predecessor/quiescence truth prevents premature terminal success.
requireSource(/predecessorUnknown|unsettledPredecessor|contextMenu.*quiescen|browserMutation.*unknown|unknown.*browserMutation/i.test(worker),
  'no unresolved predecessor/quiescence model for old browser mutations');
requireSource(/repairRequired|contextMenuRepairRequired/i.test(worker),
  'no durable repair-required truth distinct from retry count');

// Target 7: finite retry exhaustion cannot be terminal proof.
requireSource(/CONTEXT_MENU_REPAIR_MAX_ATTEMPTS/.test(worker), 'missing bounded repair-attempt positive control');
requireSource(/MAX_ATTEMPTS[\s\S]{0,1800}(?:unresolved|repairRequired|pending|manual|later)/i.test(worker),
  'repair-attempt exhaustion has no visible unresolved/non-terminal state');

// Target 8: desired schema/version is explicit for deterministic reconciliation.
requireSource(/CONTEXT_MENU_SCHEMA_VERSION|contextMenuSchemaVersion/i.test(worker),
  'no explicit context-menu schema version');
requireSource(/CONTEXT_MENU_(?:ITEMS|SCHEMA)|contextMenuDesiredItems|desiredContextMenu/i.test(worker),
  'no explicit desired known-ID context-menu schema');

// Target 9: durable state uses persistent extension storage rather than only globals.
requireSource(/chrome\.storage\.local[\s\S]{0,3000}contextMenu|contextMenu[\s\S]{0,3000}chrome\.storage\.local/i.test(worker),
  'context-menu generation/repair state is not visibly persisted in chrome.storage.local');

// Target 10: P1-118 remains separate and alarm changes remain serialized.
requireSource(/mutateChromeAlarmSerialized/.test(worker), 'P1-118 serialized alarm mutation path disappeared');

// Target 11: current callback compatibility for Chrome 118 remains.
requireSource(/chrome\.contextMenus\.removeAll\(done\)/.test(worker) && /chrome\.contextMenus\.create\(properties,\s*done\)/.test(worker),
  'Chrome 118 callback compatibility was lost');

if (failures.length) {
  console.error('P1-204 context menu durable generation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-204 context menu durable generation source gate: PASS');
