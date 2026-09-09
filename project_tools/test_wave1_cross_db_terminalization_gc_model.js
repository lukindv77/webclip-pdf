'use strict';
const assert = require('assert');
const crypto = require('crypto');
let cases = 0;
const ok = (v,m)=>{assert.ok(v,m);cases++;};
const eq = (a,b,m)=>{assert.deepStrictEqual(a,b,m);cases++;};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  }
  return value;
}
function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

class State {
  constructor() {
    this.P = new Map();
    this.F = new Map();
    this.E = new Map();
  }
  clone() {
    const n = new State();
    n.P = new Map([...this.P].map(([k,v])=>[k, structuredClone(v)]));
    n.F = new Map([...this.F].map(([k,v])=>[k, structuredClone(v)]));
    n.E = new Map([...this.E].map(([k,v])=>[k, structuredClone(v)]));
    return n;
  }
}

const terminalE = new Set(['canceled-before-start','local-finalized','remote-complete-local-suppressed','manual-resolution']);
const terminalF = new Set(['revoked','finalized','expired']);

function makeBase(kind='journal.delete') {
  const s = new State();
  s.P.set('P1', { id:'P1', revision:1, phase:'domain-active', terminal:null });
  s.F.set('F1', { id:'F1', P:'P1', revision:3, state:'finalized', terminalAt:100, scopeKey:'entry:e1', terminalOutcome:{operationClass:'succeeded',retryDisposition:'none'} });
  s.E.set('E1', { id:'E1', P:'P1', F:'F1', revision:7, phase:'local-finalized', terminalAt:100, remoteObjectId:'R1' });
  return s;
}

function domainSnapshot(s, Pid) {
  const Fs = [...s.F.values()].filter(x=>x.P===Pid).sort((a,b)=>a.id.localeCompare(b.id));
  const Es = [...s.E.values()].filter(x=>x.P===Pid).sort((a,b)=>a.id.localeCompare(b.id));
  if (Fs.length !== 1) return { ok:false, code:Fs.length===0?'F_MISSING':'F_AMBIGUOUS' };
  const F = Fs[0];
  if (!terminalF.has(F.state)) return { ok:false, code:'F_NOT_TERMINAL' };
  if (Es.some(e=>!terminalE.has(e.phase))) return { ok:false, code:'E_NOT_TERMINAL' };
  const material = {
    version:1,
    physicalOperationId:Pid,
    finalization:{ id:F.id, revision:F.revision, state:F.state, terminalAt:F.terminalAt||0 },
    terminalOutcome:structuredClone(F.terminalOutcome||{}),
    effects:Es.map(e=>({ id:e.id, revision:e.revision, phase:e.phase, terminalAt:e.terminalAt||0, remoteObjectId:e.remoteObjectId||'' }))
  };
  return { ok:true, material, fingerprint:fingerprint(material) };
}

function classifySnapshot(snapshot) {
  const out = snapshot.material.terminalOutcome || {};
  if (!out.operationClass || !out.retryDisposition) throw new Error('DOMAIN_TERMINAL_OUTCOME_MISSING');
  return { operationClass:out.operationClass, retryDisposition:out.retryDisposition };
}

function archiveTerminalSummary(s, Pid, expectedPRevision, snapshot) {
  const P = s.P.get(Pid);
  if (!P) return {ok:false,code:'P_MISSING'};
  if (P.terminal) {
    return P.terminal.domainFingerprint === snapshot.fingerprint
      ? {ok:true,idempotent:true,P}
      : {ok:false,code:'P_TERMINAL_CONFLICT'};
  }
  if (P.revision !== expectedPRevision) return {ok:false,code:'P_STALE'};
  const cls = classifySnapshot(snapshot);
  const terminal = {
    version:1,
    ...cls,
    domainFingerprint:snapshot.fingerprint,
    finalizationId:snapshot.material.finalization.id,
    effectIds:snapshot.material.effects.map(e=>e.id),
    archivedAt:200
  };
  const next = { ...P, revision:P.revision+1, phase:'terminal', terminal };
  s.P.set(Pid,next);
  return {ok:true,idempotent:false,P:next};
}

function deleteDomainIfArchived(s, Pid, expectedFingerprint) {
  const P = s.P.get(Pid);
  if (!P?.terminal) return {ok:false,code:'P_NOT_TERMINAL'};
  if (P.terminal.domainFingerprint !== expectedFingerprint) return {ok:false,code:'P_FINGERPRINT_MISMATCH'};
  const snap = domainSnapshot(s,Pid);
  if (!snap.ok) return {ok:false,code:snap.code};
  if (snap.fingerprint !== expectedFingerprint) return {ok:false,code:'DOMAIN_CHANGED'};
  for (const id of P.terminal.effectIds) s.E.delete(id);
  s.F.delete(P.terminal.finalizationId);
  return {ok:true};
}

function canGcP(s, Pid) {
  const P = s.P.get(Pid);
  if (!P?.terminal) return false;
  const hasF = [...s.F.values()].some(f=>f.P===Pid);
  const hasE = [...s.E.values()].some(e=>e.P===Pid);
  return !hasF && !hasE;
}
function gcP(s,Pid) {
  if (!canGcP(s,Pid)) return {ok:false,code:'DOMAIN_REMAINS'};
  s.P.delete(Pid); return {ok:true};
}

// Basic happy path.
let s = makeBase();
let snap = domainSnapshot(s,'P1');
ok(snap.ok,'terminal domain snapshot available');
eq(snap.material.finalization.revision,3,'F revision captured');
eq(snap.material.effects[0].revision,7,'E revision captured');
ok(/^[0-9a-f]{64}$/.test(snap.fingerprint),'fingerprint canonical sha256');
let a = archiveTerminalSummary(s,'P1',1,snap);
ok(a.ok && !a.idempotent,'P terminal summary archived');
eq(a.P.terminal.operationClass,'succeeded','fully terminal success classified');
ok(deleteDomainIfArchived(s,'P1',snap.fingerprint).ok,'domain pair deleted only after archive');
ok(canGcP(s,'P1'),'P gc eligible after domain absence');
ok(gcP(s,'P1').ok && !s.P.has('P1'),'P removed last');

// Crash A: domain terminal, before P archive => domain remains and reconcile can retry archive.
s = makeBase(); snap = domainSnapshot(s,'P1');
ok(s.F.has('F1') && s.E.has('E1'),'crash before archive keeps domain');
ok(!canGcP(s,'P1'),'P cannot GC while domain remains');
ok(archiveTerminalSummary(s,'P1',1,snap).ok,'restart archives same domain snapshot');

// Crash B: P archive committed, before domain delete => retry is idempotent.
s = makeBase(); snap = domainSnapshot(s,'P1');
a = archiveTerminalSummary(s,'P1',1,snap); ok(a.ok,'archive before crash');
let again = archiveTerminalSummary(s,'P1',999,snap); ok(again.ok && again.idempotent,'restart archive same fingerprint idempotent');
ok(s.F.has('F1') && s.E.has('E1'),'domain details survive crash after P archive');
ok(deleteDomainIfArchived(s,'P1',snap.fingerprint).ok,'restart deletes exact archived domain');

// Crash C: domain delete committed => P terminal summary preserves truth.
ok(s.P.get('P1').terminal.operationClass==='succeeded','terminal truth retained after domain deletion');
ok(canGcP(s,'P1'),'later common gc sees no domain');

// Changed domain after snapshot must fail compare-before-delete.
s = makeBase(); snap = domainSnapshot(s,'P1'); ok(archiveTerminalSummary(s,'P1',1,snap).ok,'archive exact old snapshot');
const eChanged = s.E.get('E1'); s.E.set('E1',{...eChanged,revision:8,phase:'manual-resolution'});
eq(deleteDomainIfArchived(s,'P1',snap.fingerprint).code,'DOMAIN_CHANGED','stale P summary cannot delete changed domain');

// Conflicting second terminal summary is rejected.
const newerSnap = domainSnapshot(s,'P1'); ok(newerSnap.ok,'new terminal snapshot exists');
eq(archiveTerminalSummary(s,'P1',2,newerSnap).code,'P_TERMINAL_CONFLICT','terminal summary immutable once archived');

// Partial/manual classes survive compaction.
s = makeBase(); s.E.set('E1',{...s.E.get('E1'),phase:'remote-complete-local-suppressed',revision:8}); s.F.set('F1',{...s.F.get('F1'),terminalOutcome:{operationClass:'settled-partial',retryDisposition:'none'}});
snap = domainSnapshot(s,'P1'); a=archiveTerminalSummary(s,'P1',1,snap);
eq(a.P.terminal.operationClass,'settled-partial','partial remote/local truth archived');
eq(a.P.terminal.retryDisposition,'none','partial external effect never blind retried');

s = makeBase(); s.E.set('E1',{...s.E.get('E1'),phase:'manual-resolution',revision:8}); s.F.set('F1',{...s.F.get('F1'),terminalOutcome:{operationClass:'evidence-limited',retryDisposition:'manual-resolution'}});
snap = domainSnapshot(s,'P1'); a=archiveTerminalSummary(s,'P1',1,snap);
eq(a.P.terminal.operationClass,'evidence-limited','manual state archived as evidence-limited');
eq(a.P.terminal.retryDisposition,'manual-resolution','manual retry disposition preserved');

s = makeBase(); s.E.set('E1',{...s.E.get('E1'),phase:'canceled-before-start',revision:8}); s.F.set('F1',{...s.F.get('F1'),terminalOutcome:{operationClass:'canceled',retryDisposition:'new-attempt-allowed'}});
snap = domainSnapshot(s,'P1'); a=archiveTerminalSummary(s,'P1',1,snap);
eq(a.P.terminal.operationClass,'canceled','no-effect cancel archived');
eq(a.P.terminal.retryDisposition,'new-attempt-allowed','exact pre-effect cancel allows new operation');

// Unresolved effects block snapshot/archive/GC.
s = makeBase(); s.E.set('E1',{...s.E.get('E1'),phase:'started-unknown'});
eq(domainSnapshot(s,'P1').code,'E_NOT_TERMINAL','unknown effect blocks domain snapshot');
ok(!canGcP(s,'P1'),'unknown effect keeps common receipt');

// F must be the single domain root per P.
s = makeBase(); s.F.set('F2',{...s.F.get('F1'),id:'F2'});
eq(domainSnapshot(s,'P1').code,'F_AMBIGUOUS','multiple F roots fail closed');

// No F cannot be interpreted as terminal success.
s = makeBase(); s.F.clear();
eq(domainSnapshot(s,'P1').code,'F_MISSING','missing F blocks terminal archive');

// P disappearance is not permission for domain GC.
s = makeBase(); snap=domainSnapshot(s,'P1'); s.P.delete('P1');
eq(deleteDomainIfArchived(s,'P1',snap.fingerprint).code,'P_NOT_TERMINAL','missing P blocks domain delete');

// P GC before domain delete is forbidden.
s = makeBase(); snap=domainSnapshot(s,'P1'); archiveTerminalSummary(s,'P1',1,snap);
eq(gcP(s,'P1').code,'DOMAIN_REMAINS','P gc cannot outrun domain gc');

// Fingerprint stable against object key order, sensitive to identity/state/revision.
const one = {b:2,a:{y:2,x:1}}; const two = {a:{x:1,y:2},b:2};
eq(fingerprint(one),fingerprint(two),'canonical fingerprint key-order stable');
ok(fingerprint(one)!==fingerprint({b:2,a:{x:1,y:3}}),'fingerprint changes with state');

// Effect ordering does not affect fingerprint; identity set does.
s = makeBase(); s.E.set('E2',{id:'E2',P:'P1',F:'F1',revision:1,phase:'local-finalized',terminalAt:100,remoteObjectId:'R2'});
const snapA = domainSnapshot(s,'P1');
const savedE1=s.E.get('E1'), savedE2=s.E.get('E2'); s.E.clear(); s.E.set('E2',savedE2); s.E.set('E1',savedE1);
const snapB = domainSnapshot(s,'P1');
eq(snapA.fingerprint,snapB.fingerprint,'effect iteration order cannot change terminal fingerprint');
s.E.delete('E2'); ok(domainSnapshot(s,'P1').fingerprint!==snapA.fingerprint,'missing linked effect changes terminal fingerprint');

// A compact domainClosed marker in P makes reconciliation independent from detailed rows.
s = makeBase(); snap=domainSnapshot(s,'P1'); a=archiveTerminalSummary(s,'P1',1,snap); deleteDomainIfArchived(s,'P1',snap.fingerprint);
eq(a.P.terminal.domainFingerprint,snap.fingerprint,'P retains exact domain closure fingerprint');
eq(a.P.terminal.effectIds,['E1'],'P retains compact effect identity list');

console.log(`Wave 1 cross-DB terminalization/GC model: PASS cases=${cases}`);
