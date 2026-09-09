'use strict';

// This is an implementation acceptance SOURCE gate. It is intentionally RED on
// canonical main d4f5b268... and is not a claim that Wave 5 is implemented.
// Production closure should make every assertion below true without weakening
// existing positive security/privacy controls.

const fs = require('fs');
const assert = require('assert/strict');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const popup = fs.readFileSync('popup.js', 'utf8');
const options = fs.readFileSync('options.js', 'utf8');
const content = fs.readFileSync('content.js', 'utf8');
const frame = fs.readFileSync('frame-agent.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

// P1-165 / P1-178: captured redirect + exact attempt/state/PKCE authority.
assert.match(worker, /chrome\.identity\.launchWebAuthFlow|launchWebAuthFlow\s*\(/,
  'OAuth should capture the final redirect with chrome.identity.launchWebAuthFlow or an equivalent exact redirect receipt.');
assert.match(worker, /stateMismatch|state-mismatch|expectedState|returnedState|redirect.*state/i,
  'OAuth completion must compare returned state to the exact attempt generation.');
assert.match(worker, /authAttemptGeneration|oauthAttemptGeneration|attemptGeneration/i,
  'OAuth pending state must carry an immutable attempt generation.');

// P1-191 / P1-195 / P1-196: validate-before-commit and exact capability generation.
assert.match(worker, /authGeneration|yandexAuthGeneration/i,
  'Current auth capability must have an explicit generation.');
assert.match(worker, /grantedScopes|validatedScopes|capabilityScopes/i,
  'Connected status must expose provider-validated granted scopes, not only requested constants.');
assert.match(worker, /validate.*manual.*token|candidate.*token.*validate/i,
  'Manual token candidate must be validated before replacing current auth generation.');
assert.match(worker, /expectedAuthGeneration|authGeneration.*401|401.*authGeneration/i,
  '401 demotion must compare the generation that actually made the request.');

// P1-138: reads and provisioning mutations are explicit separate APIs.
assert.match(worker, /observeYandex|readYandex.*Pure|yandexObserve|pureYandexRead/i,
  'Read-like Yandex flows need a pure observation path that cannot ensure/create folders.');
assert.match(worker, /ensureYandex/i,
  'Provisioning mutation remains explicit and separately named.');

// P0-045: contextual popup/action privacy admission before shared state/capability reads.
assert.match(popup, /incognito/i,
  'Popup must explicitly classify active source context privacy before shared history/permission operations.');
assert.match(worker, /privacyContextReceipt|sourcePrivacy|incognito.*getJournalSummaryForUrl|getJournalSummaryForUrl.*incognito/i,
  'Action/shared-state reads must consume a privacy receipt and fail closed for private/unknown contexts.');

// P0-066: durable URL representation is not raw operational URL.
assert.match(worker, /durableUrl|displayUrl|sanitizeDurable.*Url|sourceUrlDigest|operationalUrlDigest/i,
  'Worker needs a central durable/display URL confidentiality contract separate from operational identity.');

// P1-182: durable locator v4+ must not store reversible neighbor/raw URL context.
assert.match(worker + content + frame, /SelectionSnapshot.*(?:version\s*[:=]\s*4|v4)|durableSelectionSnapshotV4|locator.*fingerprint/i,
  'Durable SelectionSnapshot requires a privacy-preserving versioned schema.');

// P0-078 / P0-069 / P1-164 / P1-180 publication governance.
assert.match(worker, /publicationPolicyGeneration|publicLinkPolicyGeneration|policyGeneration/i,
  'Publication authority must carry an immutable policy generation.');
assert.match(worker, /unpublish|revokePublic|publicationRevoke/i,
  'Per-entry public-link revoke needs a real durable/reconciled unpublish path.');
assert.match(worker, /keep-public|keepPublic|publication.*explicit/i,
  'Destructive local delete/bulk operations must encode explicit keep-public vs revoke policy.');

// P0-022: imported locator/history cannot be destructive capability by itself.
assert.match(worker, /historicalRemote|imported.*provenance|destructiveCapability|remoteAuthority/i,
  'Imported Yandex locator metadata must be separated from live destructive authority.');

// P1-161 / P1-177: reauth is manual resume; disconnect is generation-bound.
assert.match(worker, /reauth.*return|returnContext.*reauth|manualResume/i,
  'Reauthorization needs bounded non-secret return context and explicit manual resume.');
assert.match(worker, /disconnect.*authGeneration|authGeneration.*disconnect/i,
  'Disconnect/reauth transition must be exact auth-generation bound.');

// P1-172 / P1-176: early user-controlled input bounds before DOM/IPC.
assert.match(options, /MAX_YANDEX_CLIENT_ID_CHARS|MAX_YANDEX_ACCESS_TOKEN_CHARS|MAX_.*COMMENT.*CHARS/,
  'Extension page needs shared explicit user-input bounds before sendMessage.');
assert.match(content, /MAX_.*COMMENT.*CHARS|MAX_.*TITLE.*CHARS|MAX_.*INPUT.*CHARS/,
  'Content/page-owned metadata and user input need early admission bounds before expensive DOM/IPC construction.');

// P0-075: page event trust cannot authorize credential/permission/publication actions.
assert.doesNotMatch(content + frame, /window\.postMessage\([^\n]*(oauth|token|permission|public)/i,
  'Sensitive extension authority must not be delegated to page-world postMessage.');

// Existing configuration remains MV3; no implicit switch of incognito model is part of W5.
assert.equal(manifest.manifest_version, 3);

console.log('Wave 5 security/auth governance SOURCE gate: PASS');
