'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const optionsJs = fs.readFileSync(path.join(root, 'options.js'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(root, 'options.html'), 'utf8');
const architecture = fs.readFileSync(path.join(root, 'project_docs', 'ARCHITECTURE.md'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
const hasUnlimitedStorage = permissions.includes('unlimitedStorage');

// Existing positive controls: P1-194 must preserve the current user-visible
// StorageManager flow and must not force unlimitedStorage as the only solution.
requireSource(/navigator\.storage\.persisted\s*\(/.test(worker),
  'missing existing StorageManager.persisted() health evidence');
requireSource(/navigator\.storage\.persist\s*\(/.test(optionsJs),
  'missing existing explicit-user-action StorageManager.persist() flow');
requireSource(/requestStoragePersistence/.test(optionsHtml),
  'missing existing user-visible storage-persistence control');
requireSource(/pendingDownloads/.test(worker) && /pendingRemoteSaves/.test(worker) && /pendingAppends/.test(worker),
  'Journal recovery checkpoint positive controls disappeared');

// Target contract: runtime needs an explicit classifier that separates commit
// completion from retention class and surfaces that class to recovery/status
// consumers. Naming alternatives are intentionally accepted, but the truthful
// semantic classes must be present.
requireSource(
  /classify(?:Recovery)?Durability|derive(?:Recovery)?Durability|RECOVERY_DURABILITY_(?:CLASS|STATE)/.test(worker),
  'missing explicit recovery durability classifier/state authority'
);
requireSource(/session-only/.test(worker),
  'runtime does not expose session-only durability class');
requireSource(/browser-managed-local|browser-evictable/.test(worker),
  'runtime does not expose browser-managed/evictable local durability class');
requireSource(/protected-local/.test(worker),
  'runtime does not expose protected-local durability class');
requireSource(/durabilityClass|recoveryDurability|storageDurability/.test(worker),
  'recovery/storage status does not publish a durability class');

// Without unlimitedStorage in the manifest, protected-local must be derived
// only from affirmative Chrome persistence evidence. If unlimitedStorage is
// added later by a separately approved product decision, this gate accepts it
// as another protection source rather than requiring both mechanisms.
if (!hasUnlimitedStorage) {
  requireSource(
    /persisted\s*===\s*true[\s\S]{0,1200}protected-local|protected-local[\s\S]{0,1200}persisted\s*===\s*true/.test(worker),
    'protected-local is not source-bound to affirmative persisted() evidence while unlimitedStorage is absent'
  );
}

// Truthful UI/docs must distinguish normal browser-managed local retention from
// Chrome-protected storage and must not equate IDB commit with absolute recovery.
const uiText = `${optionsJs}\n${optionsHtml}`;
requireSource(/browser-managed|управля(?:ется|емое) Chrome|evict|вытесн|storage pressure/i.test(uiText),
  'Options UI does not explain the browser-managed/evictable local class');
requireSource(/protected-local|защищ.*(?:вытесн|storage pressure)|persistent storage.*(?:защищ|вытесн)/i.test(uiText),
  'Options UI does not explain the protected-local class boundary');
requireSource(/storage pressure|browser.*evict|вытесн|эвикт/i.test(architecture),
  'architecture does not state the browser storage-pressure eviction boundary');
requireSource(/browser-managed-local|protected-local|session-only/i.test(architecture),
  'architecture does not define explicit recovery durability classes');
requireSource(/IDB|IndexedDB/.test(architecture) && /commit/.test(architecture),
  'architecture lost IndexedDB commit-boundary terminology');
requireSource(/commit[^\n]{0,220}(?:не|not)[^\n]{0,160}(?:guarantee|гарант|evict|вытесн)|(?:guarantee|гарант)[^\n]{0,220}(?:не|not)[^\n]{0,160}commit/i.test(architecture),
  'architecture does not explicitly separate transaction commit from retention/guarantee semantics');

if (failures.length) {
  console.error('P1-194 recovery durability class source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-194 recovery durability class source gate: PASS');
