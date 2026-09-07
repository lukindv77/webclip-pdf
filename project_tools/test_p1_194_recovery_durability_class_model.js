'use strict';
const assert = require('assert');

const DURABILITY = Object.freeze({
  UNCOMMITTED: 'uncommitted',
  SESSION_ONLY: 'session-only',
  BROWSER_MANAGED_LOCAL: 'browser-managed-local',
  PROTECTED_LOCAL: 'protected-local',
  EXTERNAL_COPY_CONFIRMED: 'external-copy-confirmed'
});

function classifyLocalRecovery({ committed, storageKind = 'indexeddb', persisted = null, unlimitedStorage = false }) {
  if (!committed) {
    return {
      class: DURABILITY.UNCOMMITTED,
      usable: false,
      survivesNormalRestart: false,
      protectedFromAutomaticStoragePressureEviction: false,
      absoluteGuarantee: false
    };
  }

  if (storageKind === 'session') {
    return {
      class: DURABILITY.SESSION_ONLY,
      usable: true,
      survivesNormalRestart: false,
      protectedFromAutomaticStoragePressureEviction: false,
      absoluteGuarantee: false
    };
  }

  const protectedByChrome = unlimitedStorage === true || persisted === true;
  return {
    class: protectedByChrome ? DURABILITY.PROTECTED_LOCAL : DURABILITY.BROWSER_MANAGED_LOCAL,
    usable: true,
    survivesNormalRestart: true,
    protectedFromAutomaticStoragePressureEviction: protectedByChrome,
    protectionEvidence: unlimitedStorage === true ? 'unlimitedStorage' : persisted === true ? 'persisted' : persisted === false ? 'not-persisted' : 'unknown',
    absoluteGuarantee: false
  };
}

function applyAutomaticStoragePressure(localCopies, classification) {
  if (classification.protectedFromAutomaticStoragePressureEviction) return [...localCopies];
  return localCopies.map(() => false);
}

function classifyExternalCopy(receipt) {
  const exact = receipt?.namespaceVerified === true && receipt?.exactContentVerified === true;
  return {
    class: exact ? DURABILITY.EXTERNAL_COPY_CONFIRMED : 'external-copy-unverified',
    independentFailureDomain: exact,
    usableForRecovery: exact,
    absoluteGuarantee: false
  };
}

// Ordinary committed IDB without proven persistence is browser-managed local
// recovery state. Transaction completion proves commit/atomicity, not eviction
// immunity and not an absolute recovery guarantee.
{
  const state = classifyLocalRecovery({ committed: true, storageKind: 'indexeddb', persisted: false, unlimitedStorage: false });
  assert.equal(state.class, DURABILITY.BROWSER_MANAGED_LOCAL);
  assert.equal(state.survivesNormalRestart, true);
  assert.equal(state.protectedFromAutomaticStoragePressureEviction, false);
  assert.equal(state.absoluteGuarantee, false);
  assert.deepEqual(applyAutomaticStoragePressure([true], state), [false]);
}

// Unknown persistence status must fail toward the weaker truthful class.
{
  const state = classifyLocalRecovery({ committed: true, persisted: null, unlimitedStorage: false });
  assert.equal(state.class, DURABILITY.BROWSER_MANAGED_LOCAL);
  assert.equal(state.protectionEvidence, 'unknown');
  assert.equal(state.absoluteGuarantee, false);
}

// Chrome-confirmed persistent storage protects the local origin from the
// automatic storage-pressure eviction class, but is still not an absolute
// guarantee against uninstall, explicit deletion, profile loss, disk failure,
// or other failure domains.
{
  const state = classifyLocalRecovery({ committed: true, persisted: true, unlimitedStorage: false });
  assert.equal(state.class, DURABILITY.PROTECTED_LOCAL);
  assert.equal(state.protectionEvidence, 'persisted');
  assert.equal(state.protectedFromAutomaticStoragePressureEviction, true);
  assert.equal(state.absoluteGuarantee, false);
  assert.deepEqual(applyAutomaticStoragePressure([true], state), [true]);
}

// unlimitedStorage is another valid Chrome-side protection evidence, without
// converting local storage into an absolute guarantee.
{
  const state = classifyLocalRecovery({ committed: true, persisted: false, unlimitedStorage: true });
  assert.equal(state.class, DURABILITY.PROTECTED_LOCAL);
  assert.equal(state.protectionEvidence, 'unlimitedStorage');
  assert.equal(state.absoluteGuarantee, false);
}

// Multiple recovery copies inside the same unprotected extension-origin
// failure domain do not become independent merely because they are different
// stores/records. Automatic origin eviction can remove all of them together.
{
  const state = classifyLocalRecovery({ committed: true, persisted: false, unlimitedStorage: false });
  assert.deepEqual(applyAutomaticStoragePressure([true, true, true], state), [false, false, false]);
}

// Session storage is intentionally ephemeral and cannot be recovery authority
// across a complete browser restart.
{
  const state = classifyLocalRecovery({ committed: true, storageKind: 'session', persisted: true, unlimitedStorage: true });
  assert.equal(state.class, DURABILITY.SESSION_ONLY);
  assert.equal(state.survivesNormalRestart, false);
  assert.equal(state.absoluteGuarantee, false);
}

// Protection is current evidence, not a historical property frozen into the
// checkpoint. Existing data that is still present can be reclassified after
// Chrome later confirms persistence.
{
  const before = classifyLocalRecovery({ committed: true, persisted: false });
  const after = classifyLocalRecovery({ committed: true, persisted: true });
  assert.equal(before.class, DURABILITY.BROWSER_MANAGED_LOCAL);
  assert.equal(after.class, DURABILITY.PROTECTED_LOCAL);
}

// An independent external copy is usable only when the owning identity/content
// contracts have verified the exact namespace and exact bytes. Same path/size
// or other weak hints are not sufficient for P1-194 to promote durability.
{
  const weak = classifyExternalCopy({ namespaceVerified: true, exactContentVerified: false });
  assert.equal(weak.usableForRecovery, false);
  assert.equal(weak.independentFailureDomain, false);

  const exact = classifyExternalCopy({ namespaceVerified: true, exactContentVerified: true });
  assert.equal(exact.class, DURABILITY.EXTERNAL_COPY_CONFIRMED);
  assert.equal(exact.usableForRecovery, true);
  assert.equal(exact.independentFailureDomain, true);
  assert.equal(exact.absoluteGuarantee, false);
}

// No local class can truthfully be promoted to "guaranteed recovery" solely by
// a successful commit or Chrome persistence protection.
for (const state of [
  classifyLocalRecovery({ committed: true, persisted: false }),
  classifyLocalRecovery({ committed: true, persisted: true }),
  classifyLocalRecovery({ committed: true, unlimitedStorage: true })
]) {
  assert.equal(state.absoluteGuarantee, false);
}

console.log('P1-194 recovery durability class model: PASS');
