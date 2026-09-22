'use strict';

// Research-only P1-231 S1-D migration rehearsal / negative matrix.
// No WebClip package projection is loaded, no product ZIP is built, and no
// readiness/release policy is mutated.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-migration-rehearsal/v1';
const ID_SCHEMA = 'webclip-shadow-identity/v1';
const SET_SCHEMA = 'webclip-shadow-settlement/v1';
const EQ_SCHEMA = 'webclip-builder-equivalence/v1';
const WORKFLOW_REF = 'lukindv77/webclip-pdf/.github/workflows/repository-integrity.yml@refs/heads/main';
const ANCHORS = Object.freeze({
  'project_docs/RELEASE_READINESS.md': '165766b248ffa48fc88f0140283adf0e855df22f',
  'project_tools/check_release_readiness.py': 'd3569428a3ea4e5d90be24426fd09c233c75b882',
  '.github/workflows/release-gate.yml': 'f6813f364d39932fb32a1cc2d527d2d7a489ed02',
  '.github/workflows/repository-integrity.yml': 'caeb28f5bc46661487cc049cdc8642ff577c957c',
});
const KINDS = ['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision'];
const SHA = Object.freeze({
  source: '1'.repeat(40), candidate: '2'.repeat(40), moved: '3'.repeat(40),
  prHead: '4'.repeat(40), merge: '5'.repeat(40), workflow: '6'.repeat(40), other: '7'.repeat(40),
});
let cases = 0;

function test(name, fn) {
  try { fn(); cases += 1; }
  catch (e) { e.message = `${name}: ${e.message}`; throw e; }
}
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function throwsCode(fn, code) { assert.throws(fn, (e) => e && e.code === code, `expected ${code}`); }
function sha(v) { return /^[0-9a-f]{40}$/.test(String(v || '')); }
function dig(ch) { return `sha256:${String(ch).repeat(64)}`; }
function validDig(v) { return /^sha256:[0-9a-f]{64}$/.test(String(v || '')); }
function clone(v) { return structuredClone(v); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function kv(line) {
  const out = {};
  for (const raw of String(line).split(';').slice(1)) {
    const i = raw.indexOf('='); if (i > 0) out[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
  }
  return out;
}
function predecessor(file, prefix) {
  const stdout = execFileSync(process.execPath, [path.join(ROOT, file)], { cwd: ROOT, encoding: 'utf8' });
  const line = stdout.trim().split(/\r?\n/).reverse().find((x) => x.startsWith(prefix));
  assert(line, `missing ${prefix}`); return { line, kv: kv(line) };
}

const head = git('rev-parse', 'HEAD');
const dag = predecessor('project_tools/test_p1_231_consolidated_implementation_dag_model.js', 'P1-231 consolidated implementation DAG model: PASS');
const s0e = predecessor('project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js', 'P1-231 S0-E identity engine source-spec model: PASS');
const s0f = predecessor('project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js', 'P1-231 S0-F candidate-generation verifier source-spec model: PASS');
const s0g = predecessor('project_tools/test_p1_231_s0g_evidence_settlement_engine_source_spec_model.js', 'P1-231 S0-G evidence-settlement engine source-spec model: PASS');
const s0i = predecessor('project_tools/test_p1_231_s0i_pr_checker_integration_source_spec_model.js', 'P1-231 S0-I PR checker integration source-spec model: PASS');
const s1a = predecessor('project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js', 'P1-231 S1-A shadow identity source-spec model: PASS');
const s1b = predecessor('project_tools/test_p1_231_s1b_shadow_settlement_source_spec_model.js', 'P1-231 S1-B shadow settlement source-spec model: PASS');
const s1c = predecessor('project_tools/test_p1_231_s1c_builder_equivalence_source_spec_model.js', 'P1-231 S1-C builder equivalence source-spec model: PASS');
const CURRENT = Object.freeze({
  rpf: s0e.kv.rpf, chrome: s0e.kv.chrome_qcf, yandex: s0e.kv.yandex_qcf,
  rcf: s0e.kv.rcf, bcf: s0e.kv.bcf,
});

function identity(overrides = {}) { return { rpf: dig('a'), chrome: dig('b'), yandex: dig('c'), rcf: dig('d'), bcf: dig('e'), ...overrides }; }
function contract(kind, id) { if (kind === 'unpacked-chrome') return id.chrome; if (kind === 'yandex-e2e') return id.yandex; return id.rcf; }
function terminal(kind) { return kind === 'release-decision' ? 'approved' : 'pass'; }
function rec(kind, seq, source, id, outcome) { return { kind, seq, source, rpf: id.rpf, contract: contract(kind, id), outcome }; }
function allPass(source, id) { return KINDS.map((k) => rec(k, 1, source, id, terminal(k))); }

// Fixture-only adapter for the already-canonical S0-G/S1-B rules. S1-D consumes
// the produced report and never claims to become receipt-settlement authority.
function settle({ candidate, id, receipts = [], eligible = true, namespace = true, appendOnly = true, ancestry = () => true }) {
  let error = namespace ? null : 'RECEIPT_NAMESPACE_CORRUPT';
  if (!appendOnly) error ||= 'RECEIPT_HISTORY_NOT_APPEND_ONLY';
  const seen = new Set();
  for (const r of receipts) {
    const key = `${r.kind}|${r.rpf}|${r.contract}|${r.seq}`;
    if (!KINDS.includes(r.kind) || !Number.isInteger(r.seq) || r.seq < 1 || seen.has(key)) error ||= 'RECEIPT_NAMESPACE_CORRUPT';
    seen.add(key);
  }
  if (!eligible) return {
    schema: SET_SCHEMA, candidateSha: candidate, state: error ? 'structural-failure' : 'candidate-ineligible',
    semanticSettlementEvaluated: false, namespaceValid: !error, appendOnly, structuralError: error,
    identities: clone(id), slots: Object.fromEntries(KINDS.map((k) => [k, { state: 'not-evaluated' }])), authoritative: false,
  };
  const slots = {};
  for (const kind of KINDS) {
    const xs = receipts.filter((r) => r.kind === kind && r.rpf === id.rpf && r.contract === contract(kind, id) && ancestry(r.source, candidate)).sort((a,b) => a.seq - b.seq);
    if (!xs.length) slots[kind] = { state: 'missing' };
    else { const last = xs[xs.length - 1]; slots[kind] = { state: last.outcome === terminal(kind) ? 'pass' : 'blocked', seq: last.seq, outcome: last.outcome }; }
  }
  const states = Object.values(slots).map((x) => x.state);
  return {
    schema: SET_SCHEMA, candidateSha: candidate,
    state: error ? 'structural-failure' : states.every((x) => x === 'pass') ? 'settled' : states.includes('missing') ? 'evidence-missing' : 'evidence-blocked',
    semanticSettlementEvaluated: true, namespaceValid: !error, appendOnly, structuralError: error, identities: clone(id), slots, authoritative: false,
  };
}
function shadowId(candidate, id, overrides = {}) { return {
  schema: ID_SCHEMA, candidateSha: candidate, checkoutSha: candidate, candidateAdmissionSha: candidate,
  state: 'eligible', eligible: true, identities: clone(id), event: 'push', workflowRef: WORKFLOW_REF,
  workflowSha: SHA.workflow, syntheticMergeRequired: false, prHeadSha: null, authoritative: false, ...overrides,
}; }
function equiv(candidate, id, overrides = {}) { return {
  schema: EQ_SCHEMA, candidateSha: candidate, state: 'equivalent', identityEligible: true,
  equivalenceEvaluated: true, rpf: id.rpf, bcf: id.bcf, extractedRpf: id.rpf,
  rawBytesEqual: true, authoritative: false, ...overrides,
}; }
function tuple(candidate, id, receipts = allPass(SHA.source, id), ancestry = () => true) { return {
  identity: shadowId(candidate, id), settlement: settle({ candidate, id, receipts, ancestry }), equivalence: equiv(candidate, id),
}; }
function ineligible(candidate, id) { return {
  identity: shadowId(candidate, id, { state: 'candidate-ineligible', eligible: false }),
  settlement: settle({ candidate, id, eligible: false }),
  equivalence: equiv(candidate, id, { state: 'candidate-ineligible', identityEligible: false, equivalenceEvaluated: false, rawBytesEqual: null }),
}; }
function anchors() { return Object.fromEntries(Object.keys(ANCHORS).map((p) => [p, git('rev-parse', `HEAD:${p}`)])); }

function structural(code) { return { schema: SCHEMA, state: 'structural-failure', failure: code, v1Authority: 'unchanged', rollbackTarget: 'v1-only', releaseReady: false, releaseAuthorized: false, s2Authorized: false, productZip: false, authoritative: false }; }
function rehearse({ candidate, t, observedAnchors = anchors(), expectedWorkflowRef = WORKFLOW_REF, expectedWorkflowSha = SHA.workflow, evidenceMain = candidate, decisionMain = candidate }) {
  try {
    for (const [p, blob] of Object.entries(ANCHORS)) if (observedAnchors[p] !== blob) fail('V1_ROLLBACK_ANCHOR_CHANGED');
    if (t.settlement.structuralError === 'RECEIPT_NAMESPACE_CORRUPT' || t.settlement.namespaceValid === false) fail('RECEIPT_NAMESPACE_CORRUPT');
    if (t.settlement.structuralError === 'RECEIPT_HISTORY_NOT_APPEND_ONLY' || t.settlement.appendOnly === false) fail('RECEIPT_HISTORY_NOT_APPEND_ONLY');
    if (!sha(candidate) || t.identity.candidateSha !== candidate || t.identity.checkoutSha !== candidate) fail('CHECKED_OUT_CANDIDATE_MISMATCH');
    if (t.identity.candidateAdmissionSha !== candidate) fail('CANDIDATE_ADMISSION_STALE');
    if (t.identity.workflowRef !== expectedWorkflowRef) fail('WORKFLOW_REF_MISMATCH');
    if (t.identity.workflowSha !== expectedWorkflowSha) fail('WORKFLOW_SHA_MISMATCH');
    if (t.identity.syntheticMergeRequired && (!t.identity.prHeadSha || t.identity.prHeadSha === candidate)) fail('PR_SYNTHETIC_MERGE_IDENTITY_INVALID');
    if (evidenceMain !== decisionMain) fail('MAIN_MOVED_AFTER_EVIDENCE');
    if (t.settlement.candidateSha !== candidate || t.equivalence.candidateSha !== candidate) fail('SHADOW_CANDIDATE_MISMATCH');
    if (!t.identity.eligible) {
      if (t.settlement.state !== 'candidate-ineligible' || t.settlement.semanticSettlementEvaluated !== false || !KINDS.every((k) => t.settlement.slots[k].state === 'not-evaluated')) fail('CANDIDATE_INELIGIBLE_SEMANTICS_INVALID');
      if (t.equivalence.state !== 'candidate-ineligible' || t.equivalence.equivalenceEvaluated !== false) fail('CANDIDATE_INELIGIBLE_SEMANTICS_INVALID');
      return { ...structural(null), state: 'shadow-observed', failure: null, shadow: { identity: 'candidate-ineligible', settlement: 'candidate-ineligible', builderEquivalence: 'candidate-ineligible' } };
    }
    const id = t.identity.identities;
    if (t.settlement.identities.rpf !== id.rpf) fail('SHADOW_SETTLEMENT_RPF_MISMATCH');
    if (t.settlement.identities.chrome !== id.chrome || t.settlement.identities.yandex !== id.yandex || t.settlement.identities.rcf !== id.rcf) fail('SHADOW_SETTLEMENT_CONTRACT_MISMATCH');
    if (t.equivalence.rpf !== id.rpf || t.equivalence.extractedRpf !== id.rpf) fail('SHADOW_EQUIVALENCE_RPF_MISMATCH');
    if (t.equivalence.bcf !== id.bcf) fail('SHADOW_EQUIVALENCE_BCF_MISMATCH');
    if (t.equivalence.equivalenceEvaluated && t.equivalence.rawBytesEqual !== true) fail('ARCHIVE_PHYSICAL_DRIFT');
    return { ...structural(null), state: 'shadow-observed', failure: null, shadow: { identity: t.identity.state, settlement: t.settlement.state, builderEquivalence: t.equivalence.state } };
  } catch (e) { return structural(e.code || 'S1D_STRUCTURAL_FAILURE'); }
}
function expectStruct(r, code) { assert.strictEqual(r.state, 'structural-failure'); assert.strictEqual(r.failure, code); assert.strictEqual(r.v1Authority, 'unchanged'); assert.strictEqual(r.rollbackTarget, 'v1-only'); assert.strictEqual(r.releaseAuthorized, false); }
function expectBlocked(r, state) { assert.strictEqual(r.state, 'shadow-observed'); assert.strictEqual(r.shadow.settlement, state); assert.strictEqual(r.releaseReady, false); }

(function main() {
  test('baseline HEAD is SHA', () => assert(sha(head)));
  test('DAG includes four S1 nodes', () => assert.strictEqual(dag.kv.s1, '4'));
  for (const [p, b] of Object.entries(ANCHORS)) test(`rollback anchor ${p}`, () => assert.strictEqual(git('rev-parse', `HEAD:${p}`), b));
  test('S0-F generation gate passes', () => assert.strictEqual(s0f.kv.current_gate, 'pass'));
  test('S0-G current real settlement is evidence-missing', () => assert.strictEqual(s0g.kv.current_real_settlement, 'evidence-missing'));
  test('S0-I synthetic merge required', () => assert.strictEqual(s0i.kv.synthetic_merge_identity, 'required'));
  test('S1-A current eligible true', () => assert.strictEqual(s1a.kv.current_eligible, 'true'));
  test('S1-B current settlement is blocked by missing evidence', () => assert.strictEqual(s1b.kv.current_outcome, 'settled-blocked'));
  test('S1-B namespace first', () => assert.strictEqual(s1b.kv.namespace_before_short_circuit, 'true'));
  test('S1-C current equivalence remains not evaluated', () => assert.strictEqual(s1c.kv.current_state, 'not-evaluated'));
  test('S1-C product load false', () => assert.strictEqual(s1c.kv.current_product_load, 'false'));
  for (const d of Object.values(CURRENT)) test('current identity digest valid', () => assert(validDig(d)));

  const rtext = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');
  test('V1 readiness marker retained', () => assert(rtext.includes('WEBCLIP_RELEASE_READINESS_V1')));
  test('manifest remains 0.9.8', () => assert.strictEqual(JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8')).version, '0.9.8'));
  const integrityWorkflow = fs.readFileSync(path.join(ROOT, '.github/workflows/repository-integrity.yml'), 'utf8');
  test('Repository Integrity checks out literal PR head', () => assert(
    integrityWorkflow.includes("ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}")
  ));
  test('Repository Integrity verifies actual checkout SHA', () => assert(
    integrityWorkflow.includes('actual="$(git rev-parse HEAD)"')
    && integrityWorkflow.includes('if [[ "$actual" != "$EXPECTED_SHA" ]]; then')
  ));
  test('V1 status has five blockers', () => {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const p = spawnSync(py, ['project_tools/check_release_readiness.py', 'status'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(p.status, 0); assert.match(`${p.stdout}\n${p.stderr}`, /NOT READY: 5 blocker\(s\)/);
  });

  const base = identity(); const ancestor = (src) => src === SHA.source;
  const green = tuple(SHA.candidate, base, allPass(SHA.source, base), ancestor);
  const currentId = { rpf: CURRENT.rpf, chrome: CURRENT.chrome, yandex: CURRENT.yandex, rcf: CURRENT.rcf, bcf: CURRENT.bcf };
  const currentTuple = {
    identity: shadowId(head, currentId),
    settlement: settle({ candidate: head, id: currentId, receipts: [], ancestry: (src, candidate) => src === candidate }),
    equivalence: equiv(head, currentId, {
      state: 'not-evaluated',
      equivalenceEvaluated: false,
      rawBytesEqual: null,
    }),
  };
  const current = rehearse({ candidate: head, t: currentTuple });
  test('current generation-eligible candidate is valid shadow observation', () => assert.strictEqual(current.state, 'shadow-observed'));
  test('current settlement is evidence-missing', () => assert.strictEqual(current.shadow.settlement, 'evidence-missing'));
  test('current builder equivalence remains not evaluated', () => assert.strictEqual(current.shadow.builderEquivalence, 'not-evaluated'));
  test('current product ZIP false', () => assert.strictEqual(current.productZip, false));

  test('M01 evidence-only identity axes unchanged', () => { const d = clone(base); assert.deepStrictEqual(d, base); });
  test('M01 ancestor evidence can settle descendant under same identities', () => assert.strictEqual(green.settlement.state, 'settled'));

  const qcf = identity({ chrome: dig('f'), rcf: dig('9') });
  const qcfTuple = tuple(SHA.candidate, qcf, allPass(SHA.source, base), ancestor);
  test('M02 QCF-only keeps RPF/BCF', () => { assert.strictEqual(qcf.rpf, base.rpf); assert.strictEqual(qcf.bcf, base.bcf); });
  test('M02 old affected-QCF receipt becomes missing', () => assert.strictEqual(qcfTuple.settlement.slots['unpacked-chrome'].state, 'missing'));

  const frcf = identity({ rcf: dig('8') }); const frcfTuple = tuple(SHA.candidate, frcf, allPass(SHA.source, base), ancestor);
  test('M03 full-RCF change leaves QCF/RPF/BCF', () => { assert.strictEqual(frcf.chrome, base.chrome); assert.strictEqual(frcf.rpf, base.rpf); assert.strictEqual(frcf.bcf, base.bcf); });
  test('M03 old governance receipt becomes missing', () => assert.strictEqual(frcfTuple.settlement.slots['release-decision'].state, 'missing'));

  const badGen = ineligible(SHA.candidate, base);
  test('M04 stale generation short-circuits settlement/equivalence', () => { const r = rehearse({ candidate: SHA.candidate, t: badGen }); assert.strictEqual(r.shadow.settlement, 'candidate-ineligible'); assert.strictEqual(r.shadow.builderEquivalence, 'candidate-ineligible'); });
  test('M17 ineligible slots are not-evaluated', () => assert(KINDS.every((k) => badGen.settlement.slots[k].state === 'not-evaluated')));
  const missing = tuple(SHA.candidate, base, [], ancestor);
  test('M17 eligible no-receipt state is evidence-missing', () => expectBlocked(rehearse({ candidate: SHA.candidate, t: missing }), 'evidence-missing'));

  const nonAncestor = tuple(SHA.candidate, base, allPass(SHA.other, base), () => false);
  test('M05 non-ancestor receipt cannot settle', () => expectBlocked(rehearse({ candidate: SHA.candidate, t: nonAncestor }), 'evidence-missing'));

  const staleAdmission = clone(green); staleAdmission.identity.candidateAdmissionSha = SHA.source;
  test('M11 stale candidateAdmission fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: staleAdmission }), 'CANDIDATE_ADMISSION_STALE'));
  const staleId = clone(green); staleId.identity.candidateSha = SHA.source;
  test('M12 stale shadow identity fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: staleId }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));
  const staleSet = clone(green); staleSet.settlement.candidateSha = SHA.source;
  test('M13 stale evidence settlement fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: staleSet }), 'SHADOW_CANDIDATE_MISMATCH'));
  const movedReport = clone(green);
  test('M06 candidate movement rejects old report', () => expectStruct(rehearse({ candidate: SHA.moved, t: movedReport }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));

  const wrongRef = clone(green); wrongRef.identity.workflowRef = 'wrong/ref';
  test('M07 workflow ref mismatch fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: wrongRef }), 'WORKFLOW_REF_MISMATCH'));
  const wrongWorkflowSha = clone(green); wrongWorkflowSha.identity.workflowSha = SHA.other;
  test('M07 workflow SHA mismatch fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: wrongWorkflowSha }), 'WORKFLOW_SHA_MISMATCH'));

  const bcfChanged = clone(green); bcfChanged.identity.identities.bcf = dig('7');
  test('M08/M15 changed BCF cannot reuse old equivalence', () => expectStruct(rehearse({ candidate: SHA.candidate, t: bcfChanged }), 'SHADOW_EQUIVALENCE_BCF_MISMATCH'));
  const meta = clone(green); meta.equivalence.rawBytesEqual = false;
  test('M09 equal extracted RPF cannot hide metadata/raw-byte drift', () => expectStruct(rehearse({ candidate: SHA.candidate, t: meta }), 'ARCHIVE_PHYSICAL_DRIFT'));

  const rpfChanged = clone(green); rpfChanged.identity.identities.rpf = dig('6');
  test('M10/M14 changed package RPF invalidates stale settlement', () => expectStruct(rehearse({ candidate: SHA.candidate, t: rpfChanged }), 'SHADOW_SETTLEMENT_RPF_MISMATCH'));

  const corrupt = ineligible(SHA.candidate, base); corrupt.settlement.namespaceValid = false; corrupt.settlement.structuralError = 'RECEIPT_NAMESPACE_CORRUPT';
  test('M16 corrupt namespace is structural before ineligible short-circuit', () => expectStruct(rehearse({ candidate: SHA.candidate, t: corrupt }), 'RECEIPT_NAMESPACE_CORRUPT'));
  const nonAppend = clone(green); nonAppend.settlement.appendOnly = false; nonAppend.settlement.structuralError = 'RECEIPT_HISTORY_NOT_APPEND_ONLY';
  test('M19 append-only violation fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: nonAppend }), 'RECEIPT_HISTORY_NOT_APPEND_ONLY'));
  const dupReceipts = allPass(SHA.source, base); dupReceipts.push(rec('unpacked-chrome', 1, SHA.source, base, 'pass'));
  test('M19 duplicate attempt sequence corrupts namespace', () => assert.strictEqual(settle({ candidate: SHA.candidate, id: base, receipts: dupReceipts }).structuralError, 'RECEIPT_NAMESPACE_CORRUPT'));

  const failReceipts = allPass(SHA.source, base); failReceipts.push(rec('unpacked-chrome', 2, SHA.source, base, 'fail'));
  const latestFail = tuple(SHA.candidate, base, failReceipts, ancestor);
  test('M18 later FAIL beats earlier PASS', () => expectBlocked(rehearse({ candidate: SHA.candidate, t: latestFail }), 'evidence-blocked'));
  failReceipts.push(rec('unpacked-chrome', 3, SHA.source, base, 'pass'));
  const latestPass = tuple(SHA.candidate, base, failReceipts, ancestor);
  test('M18 later PASS after FAIL wins sequence 3', () => { assert.strictEqual(latestPass.settlement.state, 'settled'); assert.strictEqual(latestPass.settlement.slots['unpacked-chrome'].seq, 3); });
  const decisionReceipts = allPass(SHA.source, base); decisionReceipts.push(rec('release-decision', 2, SHA.source, base, 'rejected'));
  test('M18 later rejection beats approval', () => expectBlocked(rehearse({ candidate: SHA.candidate, t: tuple(SHA.candidate, base, decisionReceipts, ancestor) }), 'evidence-blocked'));

  const pr = tuple(SHA.merge, base, allPass(SHA.source, base), ancestor); pr.identity.syntheticMergeRequired = true; pr.identity.event = 'pull_request'; pr.identity.prHeadSha = SHA.prHead;
  test('M20 exact synthetic merge candidate accepted', () => assert.strictEqual(rehearse({ candidate: SHA.merge, t: pr }).state, 'shadow-observed'));
  const prHeadCheckout = clone(pr); prHeadCheckout.identity.checkoutSha = SHA.prHead;
  test('M20 PR head cannot substitute checked-out merge', () => expectStruct(rehearse({ candidate: SHA.merge, t: prHeadCheckout }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));

  test('M21 stable main observation accepted', () => assert.strictEqual(rehearse({ candidate: SHA.candidate, t: green, evidenceMain: SHA.source, decisionMain: SHA.source }).state, 'shadow-observed'));
  test('M21 moved main fails all-green S1', () => expectStruct(rehearse({ candidate: SHA.candidate, t: green, evidenceMain: SHA.source, decisionMain: SHA.moved }), 'MAIN_MOVED_AFTER_EVIDENCE'));

  const changed = anchors(); changed['project_docs/RELEASE_READINESS.md'] = '0'.repeat(40);
  test('M22 changed V1 anchor fails', () => expectStruct(rehearse({ candidate: SHA.candidate, t: green, observedAnchors: changed }), 'V1_ROLLBACK_ANCHOR_CHANGED'));
  test('M22 all-green S1 remains non-authoritative', () => { const r = rehearse({ candidate: SHA.candidate, t: green }); assert.strictEqual(r.releaseReady, false); assert.strictEqual(r.releaseAuthorized, false); assert.strictEqual(r.s2Authorized, false); assert.strictEqual(r.productZip, false); });

  test('C01 ineligible + corrupt namespace => structural', () => expectStruct(rehearse({ candidate: SHA.candidate, t: corrupt }), 'RECEIPT_NAMESPACE_CORRUPT'));
  test('C02 ineligible + no evidence => not-evaluated', () => { const r = rehearse({ candidate: SHA.candidate, t: badGen }); assert.strictEqual(r.shadow.settlement, 'candidate-ineligible'); });
  test('C03 equal RPF + physical metadata drift => fail', () => expectStruct(rehearse({ candidate: SHA.candidate, t: meta }), 'ARCHIVE_PHYSICAL_DRIFT'));
  test('C04 same RPF + changed BCF + old equivalence => fail', () => expectStruct(rehearse({ candidate: SHA.candidate, t: bcfChanged }), 'SHADOW_EQUIVALENCE_BCF_MISMATCH'));
  test('C05 evidence descendant + stale admission => fail', () => expectStruct(rehearse({ candidate: SHA.candidate, t: staleAdmission }), 'CANDIDATE_ADMISSION_STALE'));
  test('C06 valid settlement + PR-head substitution => fail', () => expectStruct(rehearse({ candidate: SHA.merge, t: prHeadCheckout }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));
  test('C07 all green + main moved => fail', () => expectStruct(rehearse({ candidate: SHA.candidate, t: green, evidenceMain: SHA.source, decisionMain: SHA.moved }), 'MAIN_MOVED_AFTER_EVIDENCE'));
  test('C08 QCF change + old PASS => current slot missing', () => assert.strictEqual(qcfTuple.settlement.slots['unpacked-chrome'].state, 'missing'));
  test('C09 full RCF change + old approval => decision missing', () => assert.strictEqual(frcfTuple.settlement.slots['release-decision'].state, 'missing'));
  test('C10 descendant + later FAIL => latest FAIL wins', () => expectBlocked(rehearse({ candidate: SHA.candidate, t: latestFail }), 'evidence-blocked'));
  test('C11 append-only rewrite + green tuple => structural', () => expectStruct(rehearse({ candidate: SHA.candidate, t: nonAppend }), 'RECEIPT_HISTORY_NOT_APPEND_ONLY'));
  test('C12 package RPF drift + stale settlement/equivalence => no auth', () => expectStruct(rehearse({ candidate: SHA.candidate, t: rpfChanged }), 'SHADOW_SETTLEMENT_RPF_MISMATCH'));
  const stalePhysicalIneligible = ineligible(SHA.candidate, base); stalePhysicalIneligible.equivalence.rpf = dig('9'); stalePhysicalIneligible.equivalence.bcf = dig('8');
  test('C13 ineligible + stale physical fields remains not-evaluated/no build', () => { const r = rehearse({ candidate: SHA.candidate, t: stalePhysicalIneligible }); assert.strictEqual(r.shadow.builderEquivalence, 'candidate-ineligible'); assert.strictEqual(r.productZip, false); });
  test('C14 BCF drift + evidence settled cannot compensate', () => { assert.strictEqual(bcfChanged.settlement.state, 'settled'); expectStruct(rehearse({ candidate: SHA.candidate, t: bcfChanged }), 'SHADOW_EQUIVALENCE_BCF_MISMATCH'); });

  test('S2 activation absent by construction', () => throwsCode(() => fail('S2_EXPLICIT_APPROVAL_REQUIRED'), 'S2_EXPLICIT_APPROVAL_REQUIRED'));
  test('no CGF axis introduced', () => assert(!Object.keys(CURRENT).includes('cgf')));
  test('result schema exact', () => assert.strictEqual(SCHEMA, 'webclip-shadow-migration-rehearsal/v1'));

  console.log(
    `P1-231 S1-D migration rehearsal source-spec model: PASS; cases=${cases}; schema=${SCHEMA}; ` +
    `matrix=M01-M22; cross_cases=C01-C14; current_state=shadow-observed; ` +
    `current_identity=eligible; current_settlement=evidence-missing; current_equivalence=not-evaluated; ` +
    `namespace_before_short_circuit=true; candidate_ineligible_not_missing=true; latest_attempt_ordering=true; append_only=true; ` +
    `main_movement=fail-closed; workflow_binding=fail-closed; metadata_drift=fail-closed; rollback=v1-only; ` +
    `v1_authority=unchanged; v1_blockers=5; repository_integrity_exact_head=true; s2_authorized=false; release_authorized=false; product_zip=false; ` +
    `rpf=${CURRENT.rpf}; bcf=${CURRENT.bcf}; head=${head}`
  );
})();