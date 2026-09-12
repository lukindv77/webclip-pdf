'use strict';

// P0-074 deterministic model: a long-running Yandex mutation/reconciliation
// must stay bound to one immutable auth/account/root/config/publication context.

const assert = require('node:assert/strict');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }

function ctx({ token, account, root = '/WebClip', configGen = 1, authGen = 1, publicationGen = 1, publicLinks = true }) {
  return Object.freeze({ token, account, root, configGen, authGen, publicationGen, publicLinks });
}

function globals(initial) {
  return { current: initial };
}

function currentRequest(g, path, method = 'GET') {
  const c = g.current;
  return { path, method, token: c.token, account: c.account, root: c.root, configGen: c.configGen, authGen: c.authGen, publicationGen: c.publicationGen };
}

function captureOperationContext(g) {
  const c = g.current;
  return Object.freeze({ ...c });
}

function pinnedRequest(op, path, method = 'GET') {
  return { path, method, token: op.token, account: op.account, root: op.root, configGen: op.configGen, authGen: op.authGen, publicationGen: op.publicationGen };
}

function sameGeneration(op, now) {
  return op.account === now.account &&
    op.root === now.root &&
    op.configGen === now.configGen &&
    op.authGen === now.authGen &&
    op.publicationGen === now.publicationGen;
}

function continueOrSupersede(op, g) {
  return sameGeneration(op, g.current) ? 'continue' : 'superseded';
}

function verifyReceipt(op, receipt) {
  return Boolean(receipt &&
    receipt.account === op.account &&
    receipt.root === op.root &&
    receipt.authGen === op.authGen &&
    receipt.configGen === op.configGen &&
    receipt.publicationGen === op.publicationGen);
}

const A1 = ctx({ token: 'token-A1', account: 'A', root: '/WebClip', authGen: 11, configGen: 21, publicationGen: 31, publicLinks: true });
const A2 = ctx({ token: 'token-A2', account: 'A', root: '/WebClip', authGen: 12, configGen: 21, publicationGen: 31, publicLinks: true });
const B1 = ctx({ token: 'token-B1', account: 'B', root: '/WebClip', authGen: 41, configGen: 51, publicationGen: 61, publicLinks: true });
const Aroot2 = ctx({ token: 'token-A1', account: 'A', root: '/WebClip-2', authGen: 11, configGen: 22, publicationGen: 31, publicLinks: true });
const AprivacyOff = ctx({ token: 'token-A1', account: 'A', root: '/WebClip', authGen: 11, configGen: 21, publicationGen: 32, publicLinks: false });

// 1) Current behavior model: preflight under A, request-time global auth switches to B.
{
  const g = globals(A1);
  const preflight = currentRequest(g, '/');
  eq(preflight.account, 'A', 'preflight starts under account A');
  eq(preflight.token, 'token-A1', 'preflight uses A token');
  g.current = B1;
  const folder = currentRequest(g, '/resources?path=/WebClip/Upload', 'PUT');
  eq(folder.account, 'B', 'later folder request silently retargets to B');
  eq(folder.token, 'token-B1', 'later folder request uses B token');
  const move = currentRequest(g, '/resources/move?from=S&path=T', 'POST');
  eq(move.account, 'B', 'later move silently retargets to B');
  ok(preflight.account !== move.account, 'one logical operation spans two account contexts');
}

// 2) Same textual root does not make cross-account continuation safe.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  g.current = B1;
  eq(op.root, g.current.root, 'A and B may have identical textual root');
  ok(op.account !== g.current.account, 'same root string can denote a different remote namespace');
  eq(continueOrSupersede(op, g), 'superseded', 'account generation mismatch fails closed');
}

// 3) ReadLater -> Upload: source located in A, move request under B in current-global model.
{
  const g = globals(A1);
  const sourceLocate = currentRequest(g, '/resources?path=/WebClip/ReadmeLater/site/a.pdf');
  g.current = B1;
  const targetPrepare = currentRequest(g, '/resources?path=/WebClip/Upload/site', 'PUT');
  const move = currentRequest(g, '/resources/move', 'POST');
  eq(sourceLocate.account, 'A', 'read-move source is located in A');
  eq(targetPrepare.account, 'B', 'read-move target can be prepared in B');
  eq(move.account, 'B', 'read-move mutation can execute in B');
  ok(sourceLocate.account !== move.account, 'read-move violates single-context invariant');
}

// 4) Delete -> Trash has the same account-switch TOCTOU.
{
  const g = globals(A1);
  const sourceLocate = currentRequest(g, '/resources?path=/WebClip/Upload/site/a.pdf');
  g.current = B1;
  const trashPrepare = currentRequest(g, '/resources?path=/WebClip/Trash/09-2026', 'PUT');
  const move = currentRequest(g, '/resources/move', 'POST');
  eq(sourceLocate.account, 'A', 'trash source is located in A');
  eq(trashPrepare.account, 'B', 'Trash hierarchy can be created in B');
  eq(move.account, 'B', 'trash move can execute in B');
  ok(sourceLocate.account !== trashPrepare.account, 'delete spans A and B');
}

// 5) Upload pipeline can mix captured A metadata with B request-time auth.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  const checkpoint = { account: op.account, root: op.root, authGen: op.authGen, configGen: op.configGen };
  g.current = B1;
  const hrefRequest = currentRequest(g, '/resources/upload?path=/WebClip/Upload/site/a.pdf');
  eq(checkpoint.account, 'A', 'upload checkpoint remains bound to A');
  eq(hrefRequest.account, 'B', 'later upload-href request can use B');
  eq(checkpoint.root, hrefRequest.root, 'same path text can mask namespace switch');
  ok(checkpoint.account !== hrefRequest.account, 'checkpoint/request context diverges');
}

// 6) Verification after an admitted move can switch accounts and cannot prove A settlement.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  const admitted = pinnedRequest(op, '/resources/move', 'POST');
  eq(admitted.account, 'A', 'admitted move is in A');
  g.current = B1;
  const verifyCurrent = currentRequest(g, '/resources?path=T');
  eq(verifyCurrent.account, 'B', 'current-global verify observes B');
  ok(admitted.account !== verifyCurrent.account, 'B metadata cannot settle A mutation');
  eq(continueOrSupersede(op, g), 'superseded', 'candidate model blocks cross-context verify');
}

// 7) Root change in same account must supersede an operation when root/config generation is relevant.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  g.current = Aroot2;
  eq(op.account, g.current.account, 'account stays A');
  ok(op.root !== g.current.root, 'root changes R1 -> R2');
  ok(op.configGen !== g.current.configGen, 'config generation advances');
  eq(continueOrSupersede(op, g), 'superseded', 'root/config switch cannot silently continue');
}

// 8) Reauth to same account is still a generation event unless explicitly compatible.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  g.current = A2;
  eq(op.account, g.current.account, 'reauth may retain same account id');
  ok(op.token !== g.current.token, 'reauth changes credential');
  ok(op.authGen !== g.current.authGen, 'reauth advances auth generation');
  eq(continueOrSupersede(op, g), 'superseded', 'account equality alone is insufficient');
}

// 9) Publication policy change must supersede stale publish authorization.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  ok(op.publicLinks, 'operation begins while public links are enabled');
  g.current = AprivacyOff;
  ok(!g.current.publicLinks, 'user disables public links');
  ok(op.publicationGen !== g.current.publicationGen, 'publication generation advances');
  eq(continueOrSupersede(op, g), 'superseded', 'stale operation cannot publish under old policy');
}

// 10) Candidate immutable context: every request stays in A despite unrelated global switch.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  const preflight = pinnedRequest(op, '/');
  g.current = B1;
  const folder = pinnedRequest(op, '/resources?path=/WebClip/Upload', 'PUT');
  const move = pinnedRequest(op, '/resources/move', 'POST');
  const verify = pinnedRequest(op, '/resources?path=T');
  deep([preflight.account, folder.account, move.account, verify.account], ['A', 'A', 'A', 'A'], 'pinned requests remain in one account');
  deep([preflight.token, folder.token, move.token, verify.token], ['token-A1', 'token-A1', 'token-A1', 'token-A1'], 'pinned requests retain one credential generation');
  deep([folder.root, move.root, verify.root], ['/WebClip', '/WebClip', '/WebClip'], 'pinned requests retain one root');
  eq(continueOrSupersede(op, g), 'superseded', 'continuation gate still notices global supersession');
}

// 11) Candidate gate prevents any new B mutation after context switch.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  const mutations = [];
  if (continueOrSupersede(op, g) === 'continue') mutations.push(pinnedRequest(op, '/resources/move', 'POST'));
  eq(mutations.length, 1, 'mutation admitted while generation matches');
  g.current = B1;
  if (continueOrSupersede(op, g) === 'continue') mutations.push(pinnedRequest(op, '/resources/publish', 'PUT'));
  eq(mutations.length, 1, 'no new mutation admitted after supersession');
  eq(mutations[0].account, 'A', 'only admitted mutation belongs to A');
}

// 12) Durable receipts require the same immutable context, not only operationId/path.
{
  const op = captureOperationContext(globals(A1));
  const good = { operationId: 'op-1', account: 'A', root: '/WebClip', authGen: 11, configGen: 21, publicationGen: 31 };
  const wrongAccount = { ...good, account: 'B' };
  const wrongRoot = { ...good, root: '/WebClip-2' };
  const wrongAuth = { ...good, authGen: 12 };
  const wrongConfig = { ...good, configGen: 22 };
  const wrongPublication = { ...good, publicationGen: 32 };
  ok(verifyReceipt(op, good), 'matching receipt is accepted');
  ok(!verifyReceipt(op, wrongAccount), 'wrong-account receipt rejected');
  ok(!verifyReceipt(op, wrongRoot), 'wrong-root receipt rejected');
  ok(!verifyReceipt(op, wrongAuth), 'wrong-auth-generation receipt rejected');
  ok(!verifyReceipt(op, wrongConfig), 'wrong-config-generation receipt rejected');
  ok(!verifyReceipt(op, wrongPublication), 'wrong-publication-generation receipt rejected');
}

// 13) Same operation id is not authority to reuse a receipt after reconnect/reset generation.
{
  const opA = captureOperationContext(globals(A1));
  const stale = { operationId: 'same-op', account: 'A', root: '/WebClip', authGen: 11, configGen: 21, publicationGen: 31 };
  const opB = captureOperationContext(globals(B1));
  eq(stale.operationId, 'same-op', 'stale receipt can keep textual operation id');
  ok(verifyReceipt(opA, stale), 'receipt belongs to original A context');
  ok(!verifyReceipt(opB, stale), 'same operation id cannot authorize B context');
}

// 14) Different path strings do not weaken context requirement.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  const s = pinnedRequest(op, '/resources?path=/WebClip/ReadmeLater/x.pdf');
  const t = pinnedRequest(op, '/resources?path=/WebClip/Upload/x.pdf');
  eq(s.account, t.account, 'source and target stay in same account');
  eq(s.authGen, t.authGen, 'source and target stay in same auth generation');
  eq(s.configGen, t.configGen, 'source and target stay in same config generation');
}

// 15) Unchanged context is a positive control and should not be over-rejected.
{
  const g = globals(A1);
  const op = captureOperationContext(g);
  eq(continueOrSupersede(op, g), 'continue', 'unchanged context may continue');
  const move = pinnedRequest(op, '/resources/move', 'POST');
  eq(move.account, 'A', 'positive control mutates A');
  eq(move.root, '/WebClip', 'positive control uses expected root');
  eq(move.publicationGen, 31, 'positive control retains publication generation');
}

// 16) If implementation deliberately supports compatible token refresh, it still needs an explicit
// generation-equivalence decision; silently reading global state is not equivalence proof.
{
  const compatibleRefresh = ctx({ token: 'token-A-refresh', account: 'A', root: '/WebClip', authGen: 11, configGen: 21, publicationGen: 31, publicLinks: true });
  const g = globals(A1);
  const op = captureOperationContext(g);
  g.current = compatibleRefresh;
  eq(continueOrSupersede(op, g), 'continue', 'explicitly same generation may continue despite token rotation');
  ok(op.token !== g.current.token, 'token material itself need not define generation identity');
  eq(op.authGen, g.current.authGen, 'generation equivalence is explicit');
}

console.log(`PASS ${checks} checks`);
