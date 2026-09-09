'use strict';
const assert = require('node:assert/strict');
let cases = 0;
const ok = (v, m) => { assert.ok(v, m); cases += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); cases += 1; };

const order = ['A0','U0','J0','A1','A2','B0','B1','C0','C1','D0','D1','D2','E0','E1','Z0'];
const index = Object.fromEntries(order.map((x, i) => [x, i]));
const before = (a, b) => index[a] < index[b];

for (const [a,b] of [
  ['A0','U0'],['U0','J0'],['J0','A1'],['A1','A2'],['A2','B0'],['B0','B1'],
  ['B1','C0'],['C0','C1'],['C1','D0'],['D0','D1'],['D1','D2'],['D2','E0'],['E0','E1'],['E1','Z0']
]) ok(before(a,b), `${a} must precede ${b}`);

const tranche = {
  A0:{trust:'passive',db:'OperationReceipts v1',productionAuthority:false},
  U0:{trust:'fence',protocol:2},
  J0:{trust:'passive',db:'Journal v8',forwardOnly:true,productionAuthority:false},
  A1:{trust:'reviewed-source'},
  A2:{trust:'physical-operation'},
  B0:{trust:'exact-render-source'},
  B1:{trust:'sealed-pdf',db:'PdfRetryCache v4',forwardOnly:true},
  C0:{trust:'immutable-destination-context'},
  C1:{trust:'remote-effect-content'},
  D0:{trust:'journal-cas-authority'},
  D1:{trust:'destructive-domain-receipts'},
  D2:{trust:'save-finalization'},
  E0:{trust:'read-only-reconciliation'},
  E1:{trust:'ui-reconcile-cutover'},
  Z0:{trust:'trusted-default'}
};

eq(tranche.J0.db, 'Journal v8', 'J0 owns Journal schema cutover');
eq(tranche.B1.db, 'PdfRetryCache v4', 'B1 owns PDF schema cutover');
ok(tranche.J0.forwardOnly && tranche.B1.forwardOnly, 'schema cutovers are forward-only rollback boundaries');
ok(!tranche.A0.productionAuthority && !tranche.J0.productionAuthority, 'A0/J0 are passive foundations');
ok(before('A2','B1') && before('B0','B1'), 'B1 trusted G cannot precede physical/source authority');
ok(before('C0','C1'), 'remote effect cannot precede immutable destination context');
ok(before('D0','D2'), 'save finalization cannot precede Journal CAS authority');
ok(before('E0','E1'), 'UI cannot cut over before read-only reconciliation exists');
ok(before('E1','Z0'), 'trusted-default activation is last');

const atomicPackage = {
  U0:new Set(['service-worker.js','content.js','offscreen.js','journal.js','options.js']),
  J0:new Set(['service-worker.js','journal.js']),
  B1:new Set(['service-worker.js','offscreen.js'])
};
ok(atomicPackage.J0.has('service-worker.js') && atomicPackage.J0.has('journal.js'), 'J0 package owns both Journal openers');
ok(atomicPackage.B1.has('service-worker.js') && atomicPackage.B1.has('offscreen.js'), 'B1 package owns both PDF DB openers');

function mayActivateExactPdf(state) {
  return state.protocolV2 && state.physicalOperationId && state.sourceGenerationId && state.renderProbeABC && state.pdfDbV4;
}
ok(!mayActivateExactPdf({protocolV2:true,physicalOperationId:'P',sourceGenerationId:'S',renderProbeABC:false,pdfDbV4:true}), 'DB4 alone cannot confer trusted PDF authority');
ok(mayActivateExactPdf({protocolV2:true,physicalOperationId:'P',sourceGenerationId:'S',renderProbeABC:true,pdfDbV4:true}), 'exact PDF authority requires full chain');

function effectStartAllowed({F,E}) {
  return !!F && F.state === 'admitted' && !!E && E.phase === 'prepared' && E.P === F.P && E.F === F.id;
}
ok(effectStartAllowed({F:{id:'F1',P:'P1',state:'admitted'},E:{id:'E1',P:'P1',F:'F1',phase:'prepared'}}), 'exact admitted F permits effect start');
ok(!effectStartAllowed({F:{id:'F1',P:'P1',state:'revoked'},E:{id:'E1',P:'P1',F:'F1',phase:'prepared'}}), 'revoked F blocks effect before start');

function revokeAfterStart(E) {
  if (E.phase === 'prepared') return {...E,phase:'canceled-before-start'};
  return E;
}
eq(revokeAfterStart({phase:'prepared'}).phase, 'canceled-before-start', 'prepared effect can terminalize with exact no-start proof');
eq(revokeAfterStart({phase:'started-unknown'}).phase, 'started-unknown', 'started-unknown cannot be rewritten as canceled');

function gcAllowed({domainTerminal, pSummaryDurable, lateBarrierSatisfied, ageSatisfied}) {
  return domainTerminal && pSummaryDurable && lateBarrierSatisfied && ageSatisfied;
}
ok(!gcAllowed({domainTerminal:true,pSummaryDurable:false,lateBarrierSatisfied:true,ageSatisfied:true}), 'domain detail cannot GC before P terminal summary');
ok(gcAllowed({domainTerminal:true,pSummaryDurable:true,lateBarrierSatisfied:true,ageSatisfied:true}), 'terminal detail may GC only after durable summary and barriers');

function capacityAdmission({active,total,activeCap,totalCap}) {
  if (active >= activeCap) return 'ACTIVE_CAP';
  if (total >= totalCap) return 'TOTAL_CAP';
  return 'ADMIT';
}
eq(capacityAdmission({active:2,total:2,activeCap:2,totalCap:10}), 'ACTIVE_CAP', 'active capacity rejects new authority');
eq(capacityAdmission({active:1,total:10,activeCap:2,totalCap:10}), 'TOTAL_CAP', 'total retained evidence is bounded');
eq(capacityAdmission({active:1,total:2,activeCap:2,totalCap:10}), 'ADMIT', 'bounded slot admits');

const evidence = {
  pd7:{stable:'153.0.8010.36',featureSupported:false,researchTerminal:true},
  c42:{classification:'EXTERNAL-REQUIRED',researchTerminal:true,l5Executed:false},
  coverageComplete:true,
  criticalClosure:false,
  releaseReady:false
};
ok(evidence.pd7.researchTerminal && evidence.pd7.featureSupported === false, 'PD7 exact selected Stable is terminal feature-inactive/watch');
ok(evidence.c42.researchTerminal && !evidence.c42.l5Executed, 'C42 may be research-terminal while live Yandex L5 remains deferred');
ok(evidence.coverageComplete && !evidence.criticalClosure && !evidence.releaseReady, 'research completeness is separate from implementation/release');

const ownerAllocation = {newP1231:false};
ok(!ownerAllocation.newP1231, 'no new P1-231 is justified by consolidation');

console.log('Wave 1 consolidated implementation-readiness model: PASS');
console.log(`cases=${cases}`);
console.log(`topology=${order.join('>')}`);
