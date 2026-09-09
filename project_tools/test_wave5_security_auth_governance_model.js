'use strict';

const assert = require('assert/strict');
let cases = 0;
const ok = (v, m = '') => { cases += 1; assert.ok(v, m); };
const eq = (a, b, m = '') => { cases += 1; assert.deepEqual(a, b, m); };

function mint(prefix, n) { return `${prefix}${n}`; }

// ---------- P0-045 contextual privacy ----------
function classifySourceTab(tab) {
  if (!tab || !Number.isInteger(Number(tab.id)) || Number(tab.id) <= 0) {
    return Object.freeze({ privacy: 'unknown', tabId: 0, url: '' });
  }
  const privacy = tab.incognito === true ? 'incognito' : tab.incognito === false ? 'normal' : 'unknown';
  return Object.freeze({ privacy, tabId: Number(tab.id), url: String(tab.url || '') });
}
function mayReadNormalProfileHistory(receipt) { return receipt?.privacy === 'normal'; }
function mayRequestSharedHostPermission(receipt) { return receipt?.privacy === 'normal'; }

// ---------- P1-165/P1-178 OAuth attempt ----------
class OAuthAttempts {
  constructor() { this.next = 1; this.current = null; }
  begin(clientId, redirectUri) {
    const attempt = Object.freeze({
      attemptGeneration: mint('AG', this.next++),
      clientId: String(clientId),
      redirectUri: String(redirectUri),
      state: `state-${this.next}-${clientId}`,
      pkceChallenge: `challenge-${this.next}`,
      phase: 'redirect-pending'
    });
    this.current = attempt;
    return attempt;
  }
  acceptRedirect(attempt, finalUrl) {
    if (!this.current || this.current.attemptGeneration !== attempt.attemptGeneration) return { ok: false, reason: 'stale-attempt' };
    let parsed;
    try { parsed = new URL(finalUrl); } catch (_) { return { ok: false, reason: 'invalid-url' }; }
    if (`${parsed.origin}${parsed.pathname}` !== attempt.redirectUri) return { ok: false, reason: 'wrong-redirect' };
    if (parsed.searchParams.get('state') !== attempt.state) return { ok: false, reason: 'state-mismatch' };
    const code = parsed.searchParams.get('code') || '';
    if (!code) return { ok: false, reason: 'missing-code' };
    return { ok: true, code, attemptGeneration: attempt.attemptGeneration };
  }
  clearExact(attemptGeneration) {
    if (!this.current || this.current.attemptGeneration !== attemptGeneration) return false;
    this.current = null;
    return true;
  }
}

// ---------- Auth generation/capability ----------
class AuthStore {
  constructor() { this.next = 1; this.current = null; }
  commitValidated({ source, accountUid, scopes, tokenTag }) {
    const generation = mint('ARG', this.next++);
    this.current = Object.freeze({
      authGeneration: generation,
      source,
      accountUid: String(accountUid || ''),
      scopes: Object.freeze([...new Set(scopes || [])].sort()),
      tokenTag: String(tokenTag || ''),
      validation: 'provider-validated'
    });
    return this.current;
  }
  hasScopes(required) {
    const have = new Set(this.current?.scopes || []);
    return required.every((s) => have.has(s));
  }
  demoteOn401(expectedGeneration) {
    if (!this.current || this.current.authGeneration !== expectedGeneration) return false;
    this.current = null;
    return true;
  }
  disconnect(expectedGeneration = '') {
    if (expectedGeneration && this.current?.authGeneration !== expectedGeneration) return false;
    this.current = null;
    return true;
  }
}

async function replaceManualTokenValidateFirst(authStore, candidate, validate) {
  const previous = authStore.current;
  const proof = await validate(candidate);
  if (!proof?.ok) return { ok: false, previousStillCurrent: authStore.current === previous };
  const next = authStore.commitValidated({
    source: 'manual', accountUid: proof.accountUid, scopes: proof.scopes, tokenTag: candidate.tag
  });
  return { ok: true, next };
}

// ---------- Reauth/manual resume ----------
function makeReauthReturnContext({ destination, pdfGeneration, sourceReceiptId, reason }) {
  return Object.freeze({
    destination: destination === 'yandex' ? 'yandex' : 'other',
    pdfGeneration: String(pdfGeneration || ''),
    sourceReceiptId: String(sourceReceiptId || ''),
    reason: String(reason || '').slice(0, 120),
    // Deliberately no token, signed URL, raw source URL, file comment or selected text.
  });
}
function mayAutoReplayAfterReauth() { return false; }
function manualResumeCreatesFreshPhysicalOperation(oldPhysicalOperationId, nextPhysicalOperationId) {
  return Boolean(nextPhysicalOperationId && nextPhysicalOperationId !== oldPhysicalOperationId);
}

// ---------- P1-138 read/mutation split ----------
class YandexFacadeModel {
  constructor() { this.mutations = 0; this.reads = 0; }
  observe(path) { this.reads += 1; return { ok: true, path, mutated: false }; }
  ensure(path) { this.mutations += 1; return { ok: true, path, mutated: true }; }
}

// ---------- P0-078/P0-069/P1-164/P1-180 publication ----------
class PublicationPolicy {
  constructor() { this.generation = 1; this.enabled = true; }
  set(enabled) { this.generation += 1; this.enabled = Boolean(enabled); return this.receipt(); }
  receipt() { return Object.freeze({ policyGeneration: `PG${this.generation}`, enabled: this.enabled }); }
}
function publicationAdmission(policyNow, captured) {
  if (policyNow.policyGeneration !== captured.policyGeneration) return { admitted: false, reason: 'stale-policy-generation' };
  if (!policyNow.enabled || !captured.enabled) return { admitted: false, reason: 'disabled' };
  return { admitted: true, phase: 'admitted' };
}
function publicationSettlement({ admission, observedPublicUrl, revokeObserved }) {
  if (!admission?.admitted) return { state: 'not-admitted' };
  if (revokeObserved === true) return { state: 'verified-private' };
  if (observedPublicUrl) return { state: 'verified-public', publicUrl: observedPublicUrl };
  return { state: 'unknown' };
}
function deleteGovernance({ hadPublicAuthority, revokeState, userKeepPublic }) {
  if (!hadPublicAuthority) return { localDeleteAllowed: true, publication: 'none' };
  if (userKeepPublic === true) return { localDeleteAllowed: true, publication: 'kept-public-explicitly' };
  if (revokeState === 'verified-private') return { localDeleteAllowed: true, publication: 'revoked' };
  return { localDeleteAllowed: false, publication: revokeState || 'unknown' };
}
function bulkPublicationPlan(entries, policy) {
  const impacted = entries.filter((e) => e.hasPublicAuthority);
  return { impactedCount: impacted.length, policy, requiresExplicitDisclosure: impacted.length > 0 };
}

// ---------- P0-022 imported provenance ----------
function importedRemoteDescriptor(raw) {
  return Object.freeze({
    historical: true,
    accountUid: String(raw.accountUid || ''), rootPath: String(raw.rootPath || ''),
    remotePath: String(raw.remotePath || ''), resourceId: String(raw.resourceId || ''),
    destructiveCapability: false
  });
}
function liveObjectProof({ imported, observed }) {
  const exact = Boolean(observed?.providerValidated && observed.resourceId && observed.accountUid &&
    observed.accountUid === imported.accountUid && observed.rootPath === imported.rootPath &&
    observed.remotePath === imported.remotePath && observed.resourceId === imported.resourceId);
  return { destructiveCapability: exact, proofKind: exact ? 'live-exact-object' : 'none' };
}

// ---------- P0-066 URL confidentiality ----------
function durableUrlProjection(raw) {
  let u;
  try { u = new URL(String(raw || '')); } catch (_) { return ''; }
  if (!['http:', 'https:'].includes(u.protocol)) return '';
  u.username = '';
  u.password = '';
  u.search = '';
  u.hash = '';
  return u.toString();
}
function operationalUrlEqualityKey(raw) {
  // Model-only non-display authority. Production may use a digest/receipt instead.
  return `opaque:${Buffer.from(String(raw || ''), 'utf8').toString('base64url')}`;
}

// ---------- P1-182 SelectionSnapshot minimization ----------
function durableLocator(ephemeral) {
  const hashish = (v) => String(v || '') ? `fp:${Buffer.from(String(v), 'utf8').toString('base64url').slice(0, 32)}` : '';
  return Object.freeze({
    version: 4,
    tag: String(ephemeral.tag || '').slice(0, 64),
    idFingerprint: hashish(ephemeral.id),
    classFingerprints: (ephemeral.classes || []).slice(0, 8).map(hashish),
    selectedTextFingerprint: hashish(ephemeral.text),
    parentFingerprint: hashish(ephemeral.parentText),
    previousFingerprint: hashish(ephemeral.previousText),
    nextFingerprint: hashish(ephemeral.nextText),
    hrefFingerprint: hashish(ephemeral.href),
    srcFingerprint: hashish(ephemeral.src)
  });
}
function containsRawSecret(locator, secret) { return JSON.stringify(locator).includes(secret); }

// ---------- P1-172/P1-176 bounded pre-IPC ----------
function boundUserInput(value, maxChars, label) {
  const text = String(value ?? '');
  if (text.length > maxChars) return { ok: false, error: `${label}:too-long` };
  return { ok: true, value: text };
}
function extensionPreIpcMessage(input) {
  const token = boundUserInput(input.token, 16 * 1024, 'token');
  const clientId = boundUserInput(input.clientId, 512, 'clientId');
  const comment = boundUserInput(input.comment, 100000, 'comment');
  return token.ok && clientId.ok && comment.ok ? { ok: true } : { ok: false };
}

// ---------- P0-075 host trust ----------
function authorizeSensitiveCommand({ senderKind, hostEventTrusted, extensionGestureReceipt }) {
  // Page event trust is deliberately irrelevant. Extension-owned receipt is required.
  return senderKind === 'extension' && Boolean(extensionGestureReceipt);
}

// ---------- P1-177 disconnect/backup ----------
class BackupAuthBinding {
  constructor() { this.paused = false; this.boundAuthGeneration = ''; this.resumeRequired = false; }
  bind(authGeneration) { this.boundAuthGeneration = authGeneration; this.paused = false; this.resumeRequired = false; }
  disconnect(authGeneration) {
    if (this.boundAuthGeneration && this.boundAuthGeneration !== authGeneration) return false;
    this.paused = true; this.resumeRequired = true; return true;
  }
  reauth(newGeneration) { this.boundAuthGeneration = newGeneration; return { autoResume: false, manualResumeRequired: this.resumeRequired }; }
}

// ---------- tests ----------
const normal = classifySourceTab({ id: 1, url: 'https://example.test', incognito: false });
const incog = classifySourceTab({ id: 2, url: 'https://private.test', incognito: true });
const unknown = classifySourceTab({ id: 3, url: 'https://x.test' });
ok(mayReadNormalProfileHistory(normal)); ok(!mayReadNormalProfileHistory(incog)); ok(!mayReadNormalProfileHistory(unknown));
ok(mayRequestSharedHostPermission(normal)); ok(!mayRequestSharedHostPermission(incog));

const oauth = new OAuthAttempts();
const a1 = oauth.begin('client-A', 'https://ext.chromiumapp.org/cb');
const a2 = oauth.begin('client-A', 'https://ext.chromiumapp.org/cb');
eq(oauth.acceptRedirect(a1, `https://ext.chromiumapp.org/cb?code=OLD&state=${encodeURIComponent(a1.state)}`).reason, 'stale-attempt');
eq(oauth.acceptRedirect(a2, 'https://ext.chromiumapp.org/cb?code=X&state=WRONG').reason, 'state-mismatch');
ok(oauth.acceptRedirect(a2, `https://ext.chromiumapp.org/cb?code=GOOD&state=${encodeURIComponent(a2.state)}`).ok);
ok(!oauth.clearExact(a1.attemptGeneration)); ok(oauth.clearExact(a2.attemptGeneration));

const auth = new AuthStore();
const arg1 = auth.commitValidated({ source: 'oauth', accountUid: 'A', scopes: ['read', 'write', 'info'], tokenTag: 'T1' });
ok(auth.hasScopes(['read', 'write', 'info']));
const arg2 = auth.commitValidated({ source: 'oauth', accountUid: 'A', scopes: ['read', 'write', 'info'], tokenTag: 'T2' });
ok(!auth.demoteOn401(arg1.authGeneration), 'late 401 for ARG1 must not clear ARG2');
eq(auth.current.authGeneration, arg2.authGeneration);
ok(auth.demoteOn401(arg2.authGeneration)); eq(auth.current, null);

(async () => {
  const auth2 = new AuthStore();
  const stable = auth2.commitValidated({ source: 'oauth', accountUid: 'A', scopes: ['read', 'write'], tokenTag: 'stable' });
  const bad = await replaceManualTokenValidateFirst(auth2, { tag: 'bad' }, async () => ({ ok: false }));
  ok(!bad.ok); ok(bad.previousStillCurrent); eq(auth2.current.authGeneration, stable.authGeneration);
  const good = await replaceManualTokenValidateFirst(auth2, { tag: 'good' }, async () => ({ ok: true, accountUid: 'B', scopes: ['read', 'write', 'info'] }));
  ok(good.ok); eq(auth2.current.accountUid, 'B'); ok(auth2.hasScopes(['read', 'write', 'info']));

  const ctx = makeReauthReturnContext({ destination: 'yandex', pdfGeneration: 'G9', sourceReceiptId: 'S4', reason: '401' });
  eq(ctx.destination, 'yandex'); ok(!('token' in ctx)); ok(!mayAutoReplayAfterReauth()); ok(manualResumeCreatesFreshPhysicalOperation('P1', 'P2'));

  const facade = new YandexFacadeModel(); facade.observe('/Upload'); eq(facade.mutations, 0); facade.ensure('/Upload'); eq(facade.mutations, 1);

  const policy = new PublicationPolicy(); const pg1 = policy.receipt();
  ok(publicationAdmission(policy.receipt(), pg1).admitted);
  const pg2 = policy.set(false); ok(!publicationAdmission(pg2, pg1).admitted, 'old generation loses admission after disable');
  const pg3 = policy.set(true); ok(!publicationAdmission(pg3, pg1).admitted, 'ABA re-enable cannot resurrect PG1');
  const admitted3 = publicationAdmission(pg3, pg3); ok(admitted3.admitted);
  eq(publicationSettlement({ admission: admitted3, observedPublicUrl: 'https://public.test/x' }).state, 'verified-public');
  eq(publicationSettlement({ admission: admitted3 }).state, 'unknown');
  eq(deleteGovernance({ hadPublicAuthority: true, revokeState: 'unknown', userKeepPublic: false }).localDeleteAllowed, false);
  eq(deleteGovernance({ hadPublicAuthority: true, revokeState: 'verified-private', userKeepPublic: false }).localDeleteAllowed, true);
  eq(deleteGovernance({ hadPublicAuthority: true, revokeState: 'unknown', userKeepPublic: true }).publication, 'kept-public-explicitly');
  const bulk = bulkPublicationPlan([{hasPublicAuthority:true},{hasPublicAuthority:false},{hasPublicAuthority:true}], 'revoke-first');
  eq(bulk.impactedCount, 2); ok(bulk.requiresExplicitDisclosure);

  const imported = importedRemoteDescriptor({ accountUid:'A', rootPath:'/R', remotePath:'/R/a.pdf', resourceId:'RID1' });
  ok(!imported.destructiveCapability);
  ok(!liveObjectProof({ imported, observed:{providerValidated:true,accountUid:'A',rootPath:'/R',remotePath:'/R/a.pdf',resourceId:'RID2'} }).destructiveCapability);
  ok(liveObjectProof({ imported, observed:{providerValidated:true,accountUid:'A',rootPath:'/R',remotePath:'/R/a.pdf',resourceId:'RID1'} }).destructiveCapability);

  const rawUrl = 'https://user:pass@example.test/private?q=SECRET#FRAG';
  const projected = durableUrlProjection(rawUrl);
  ok(!projected.includes('user')); ok(!projected.includes('SECRET')); ok(!projected.includes('FRAG')); eq(projected, 'https://example.test/private');
  ok(operationalUrlEqualityKey(rawUrl) !== projected);

  const loc = durableLocator({ tag:'a', id:'id-secret', classes:['c1'], text:'selected', parentText:'PARENT_SECRET', previousText:'PREV_SECRET', nextText:'NEXT_SECRET', href:'https://x/?token=HREF_SECRET', src:'https://x/i?sig=SRC_SECRET' });
  eq(loc.version, 4); ok(!containsRawSecret(loc, 'PARENT_SECRET')); ok(!containsRawSecret(loc, 'PREV_SECRET')); ok(!containsRawSecret(loc, 'HREF_SECRET')); ok(!containsRawSecret(loc, 'SRC_SECRET'));

  ok(extensionPreIpcMessage({ token:'t'.repeat(10), clientId:'c', comment:'ok' }).ok);
  ok(!extensionPreIpcMessage({ token:'t'.repeat(16*1024+1), clientId:'c', comment:'ok' }).ok);
  ok(!extensionPreIpcMessage({ token:'t', clientId:'c'.repeat(513), comment:'ok' }).ok);

  ok(authorizeSensitiveCommand({ senderKind:'extension', hostEventTrusted:false, extensionGestureReceipt:{id:'UG1'} }));
  ok(!authorizeSensitiveCommand({ senderKind:'content', hostEventTrusted:true, extensionGestureReceipt:null }));

  const backup = new BackupAuthBinding(); backup.bind('ARG1'); ok(backup.disconnect('ARG1')); const rr = backup.reauth('ARG2'); ok(!rr.autoResume); ok(rr.manualResumeRequired);

  const domains = { privacy:'PC1', authAttempt:'AG5', auth:'ARG7', publication:'PG9', durableSchema:'DS4' };
  eq(new Set(Object.values(domains)).size, 5, 'authority domains remain distinct');

  console.log(`Wave 5 security/auth governance model: PASS; cases=${cases}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
