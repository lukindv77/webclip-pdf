'use strict';
// P1-226 research: execute current source with numeric DOM doubles, then test a
// proposed projection boundary. No CSS layout, browser support or closure claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const registry = fs.readFileSync(path.join(__dirname, '..', 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
assert.match(registry, /\| P1-226 \| ACTIVE \|/);
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `missing source function ${name}`);
  const rest = source.slice(start + 2);
  const end = rest.search(/\n  (?:async )?function /);
  assert.ok(end > 0, `missing next function after ${name}`);
  return rest.slice(0, end);
}
const names = ['getFrameElementForDocument', 'rectRelativeToTopViewport', 'getDocumentRect',
  'isUsableCandidate', 'elementsVisuallyOverlap', 'positionFixedBox', 'appendOutline', 'updateHoverOutline'];
const document = {createElement: () => ({style: {}})};
const window = {scrollX: 0, scrollY: 0};
const state = {phase: 'selecting', hoverBox: {style: {}}, selectedLayer: {appendChild(box) { this.last = box; }}};
const current = new Function('document', 'window', 'state',
  names.map(extract).join('\n') + `\nreturn {${names.join(',')}};`)(document, window, state);
const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
const points = r => [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]];
const apply = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
function bounds(ps) {
  const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
  return rect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}
const identity = [1, 0, 0, 1, 0, 0];
function element(doc, r) { return {isConnected: true, ownerDocument: doc, getBoundingClientRect: () => r}; }
function frame(parent, m = identity, origin = [0, 0]) {
  const doc = {defaultView: {}};
  const node = element(parent, bounds(points(rect(0, 0, 200, 100)).map(p => apply(m, p))));
  doc.defaultView.frameElement = node;
  const offset = apply(m, origin);
  doc.edge = {child: doc, parent, node, epoch: 1, revision: 1, kind: 'affine',
    // Adapter input maps child API units to parent API units exactly once.
    matrix: [...m.slice(0, 4), ...offset]};
  return doc;
}
function near(actual, expected) {
  for (const key of ['left', 'top', 'width', 'height']) assert.ok(Math.abs(actual[key] - expected[key]) < 1e-8, `${key}: ${actual[key]} != ${expected[key]}`);
}
const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5;
const unknown = reason => ({status: 'unknown', reason});
// Illustrative model budgets, not new canonical product limits. Exact source
// geometry acquisition, clipping, hit testing and cache invalidation are absent.
function project(ps, doc, read = d => d.edge, token = {epoch: 1, revision: 1}) {
  const finitePoints = xs => xs.every(p => p.length === 2 && p.every(v => Number.isFinite(v) && Math.abs(v) <= 1e7));
  if (!ps.length || ps.length > 64 || !finitePoints(ps)) return unknown('points');
  let out = ps.map(p => [...p]);
  const seen = new Set();
  while (doc !== document) {
    if (!doc || seen.has(doc) || seen.size >= 32) return unknown('chain-budget');
    seen.add(doc);
    let edge;
    try {
      edge = read(doc);
      if (!edge || edge.child !== doc || !edge.node || !edge.node.isConnected ||
          edge.node.ownerDocument !== edge.parent || doc.defaultView?.frameElement !== edge.node) return unknown('identity');
    } catch (_) { return unknown('read'); }
    if (edge.epoch !== token.epoch || edge.revision !== token.revision) return unknown('stale');
    if (edge.kind !== 'affine' || !Array.isArray(edge.matrix) || edge.matrix.length !== 6 || !edge.matrix.every(Number.isFinite)) return unknown('mapping');
    const m = edge.matrix;
    if (Math.abs(m[0] * m[3] - m[1] * m[2]) < 1e-12) return unknown('degenerate');
    out = out.map(p => apply(m, p));
    if (!finitePoints(out)) return unknown('range');
    doc = edge.parent;
  }
  return {status: 'projected', points: out, envelope: bounds(out)};
}
const target = e => project(points(e.getBoundingClientRect()), e.ownerDocument);
let count = 0;
function check(name, fn) { fn(); count++; console.log(`P1-226 ${count}: ${name} PASS`); }
check('top-document identity and one final scroll conversion', () => {
  const e = element(document, rect(10, 20, 30, 40));
  near(current.rectRelativeToTopViewport(e), rect(10, 20, 30, 40));
  window.scrollX = 50; window.scrollY = 70;
  near(current.getDocumentRect(e), rect(60, 90, 30, 40));
  window.scrollX = 0; window.scrollY = 0;
});
check('unbordered nested translation is a positive control', () => {
  const outer = frame(document, [1, 0, 0, 1, 100, 200]);
  const inner = frame(outer, [1, 0, 0, 1, 30, 40]);
  const e = element(inner, rect(5, 7, 20, 10));
  near(current.rectRelativeToTopViewport(e), rect(135, 247, 20, 10));
  near(target(e).envelope, rect(135, 247, 20, 10));
});
check('border and padding origin are absent from current projection', () => {
  const e = element(frame(document, [1, 0, 0, 1, 100, 200], [13, 17]), rect(10, 20, 30, 40));
  near(current.rectRelativeToTopViewport(e), rect(110, 220, 30, 40));
  near(target(e).envelope, rect(123, 237, 30, 40));
});
check('scale changes offset and dimensions; both outline paths expose current gap', () => {
  const e = element(frame(document, [.5, 0, 0, .5, 100, 200], [10, 10]), rect(20, 30, 100, 40));
  near(current.rectRelativeToTopViewport(e), rect(120, 230, 100, 40));
  near(target(e).envelope, rect(115, 220, 50, 20));
  state.hoverElement = e; current.updateHoverOutline(); current.appendOutline(e, 'selected');
  assert.equal(state.hoverBox.style.width, '100px'); assert.equal(state.selectedLayer.last.style.left, '120px');
});
check('nonuniform scale requires separate axes', () => {
  const e = element(frame(document, [2, 0, 0, .5, 10, 20], [3, 4]), rect(5, 6, 10, 20));
  near(target(e).envelope, rect(26, 25, 20, 10));
  near(current.rectRelativeToTopViewport(e), rect(15, 26, 10, 20));
});
check('nested origin and scale compose in child-to-parent order', () => {
  const outer = frame(document, [.5, 0, 0, .5, 100, 200], [10, 20]);
  const inner = frame(outer, [2, 0, 0, 2, 30, 40], [3, 4]);
  const e = element(inner, rect(5, 7, 20, 10));
  near(target(e).envelope, rect(128, 241, 20, 10));
  near(current.rectRelativeToTopViewport(e), rect(135, 247, 20, 10));
});
check('rotation projects all corners rather than frame bbox origin', () => {
  const e = element(frame(document, [0, 1, -1, 0, 300, 100], [10, 5]), rect(20, 30, 40, 10));
  near(target(e).envelope, rect(255, 130, 10, 40));
  near(current.rectRelativeToTopViewport(e), rect(220, 130, 40, 10));
});
check('identical frame bboxes cannot distinguish reflected coordinate bases', () => {
  const plain = frame(document, [1, 0, 0, 1, 100, 200]);
  const mirror = frame(document, [-1, 0, 0, 1, 300, 200]);
  const a = element(plain, rect(10, 20, 20, 10)), b = element(mirror, rect(10, 20, 20, 10));
  near(current.rectRelativeToTopViewport(a), current.rectRelativeToTopViewport(b));
  near(target(b).envelope, rect(270, 220, 20, 10));
  assert.notEqual(target(a).envelope.left, target(b).envelope.left);
});
check('minimum-size admission uses wrong scale in current source', () => {
  const small = element(frame(document, [.5, 0, 0, .5, 0, 0]), rect(0, 0, 3, 3));
  assert.equal(current.isUsableCandidate(small), true); assert.equal(target(small).envelope.width, 1.5);
  const enlarged = element(frame(document, [2, 0, 0, 2, 0, 0]), rect(0, 0, 1.5, 1.5));
  assert.equal(current.isUsableCandidate(enlarged), false); assert.equal(target(enlarged).envelope.width, 3);
});
check('current projection causes false overlap', () => {
  const a = element(frame(document, [.5, 0, 0, .5, 100, 100]), rect(0, 0, 20, 20));
  const b = element(document, rect(115, 100, 5, 5));
  assert.equal(current.elementsVisuallyOverlap(a, b), true);
  assert.equal(overlap(target(a).envelope, target(b).envelope), false);
});
check('current projection also causes false separation', () => {
  const a = element(frame(document, identity, [20, 0]), rect(0, 0, 10, 10));
  const b = element(document, rect(25, 0, 5, 5));
  assert.equal(current.elementsVisuallyOverlap(a, b), false);
  assert.equal(overlap(target(a).envelope, target(b).envelope), true);
});
check('detached, inaccessible and cyclic current-chain controls return null', () => {
  const e = element(document, rect(0, 0, 5, 5)); e.isConnected = false;
  assert.equal(current.rectRelativeToTopViewport(e), null);
  const denied = {defaultView: {get frameElement() { throw Error('denied'); }}};
  assert.equal(current.rectRelativeToTopViewport(element(denied, rect(0, 0, 5, 5))), null);
  const cyclic = frame(document); cyclic.defaultView.frameElement.ownerDocument = cyclic;
  assert.equal(current.rectRelativeToTopViewport(element(cyclic, rect(0, 0, 5, 5))), null);
});
check('unknown current geometry is collapsed to no-overlap', () => {
  const a = element({defaultView: {}}, rect(0, 0, 5, 5)), b = element(document, rect(0, 0, 5, 5));
  assert.equal(current.elementsVisuallyOverlap(a, b), false);
  assert.equal(target(a).status, 'unknown');
});
check('frame rectangle read failure escapes current projection', () => {
  const doc = frame(document); doc.defaultView.frameElement.getBoundingClientRect = () => { throw Error('unavailable'); };
  assert.throws(() => current.rectRelativeToTopViewport(element(doc, rect(0, 0, 5, 5))), /unavailable/);
  assert.equal(project([[0, 0]], doc, () => { throw Error('unavailable'); }).reason, 'read');
});
check('child scroll is already in input; final top scroll is added once', () => {
  const e = element(frame(document, [.5, 0, 0, .5, 100, 200]), rect(20, -30, 40, 20));
  near(target(e).envelope, rect(110, 185, 20, 10));
  near(bounds(target(e).points.map(([x, y]) => [x + 50, y + 70])), rect(160, 255, 20, 10));
});
check('intermediate AABB conversion loses information under inverse rotations', () => {
  const c = Math.SQRT1_2, forward = [c, c, -c, c, 0, 0], inverse = [c, -c, c, c, 0, 0];
  const outer = frame(document, inverse), inner = frame(outer, forward);
  const ps = points(rect(0, 0, 20, 10));
  near(project(ps, inner).envelope, rect(0, 0, 20, 10));
  const lossy = bounds(points(bounds(ps.map(p => apply(forward, p)))).map(p => apply(inverse, p)));
  near(lossy, rect(-5, -10, 30, 30));
});
check('normalized zoom adapter must not multiply inherited scale twice', () => {
  const doc = frame(document, [2, 0, 0, 2, 100, 200]);
  // Synthetic already-normalized API units: the adapter establishes residual 1.
  doc.edge.matrix = [1, 0, 0, 1, 100, 200];
  const ps = points(rect(20, 40, 60, 80));
  near(project(ps, doc).envelope, rect(120, 240, 60, 80));
  assert.notEqual(bounds(ps.map(p => apply([2, 0, 0, 2, 100, 200], p))).width, 60);
});
check('geometry envelope alone cannot close fragmented-intent P1-228', () => {
  const fragments = [...points(rect(0, 0, 10, 10)), ...points(rect(30, 0, 10, 10))];
  const gap = rect(15, 0, 5, 5), r = project(fragments, document);
  assert.equal(overlap(r.envelope, gap), true);
  assert.equal(overlap(rect(0, 0, 10, 10), gap) || overlap(rect(30, 0, 10, 10), gap), false);
});
check('missing or unsupported perspective mapping has explicit unknown state', () => {
  const doc = frame(document); doc.edge.kind = 'perspective';
  assert.equal(project([[0, 0]], doc).reason, 'mapping');
  assert.equal(project([[0, 0]], {}).reason, 'identity');
});
check('wrong document, detached frame and changed epoch reject receipt', () => {
  const doc = frame(document); doc.edge.child = {};
  assert.equal(project([[0, 0]], doc).reason, 'identity'); doc.edge.child = doc;
  doc.edge.node.isConnected = false; assert.equal(project([[0, 0]], doc).reason, 'identity'); doc.edge.node.isConnected = true;
  const exact = doc.defaultView.frameElement; doc.defaultView.frameElement = {};
  assert.equal(project([[0, 0]], doc).reason, 'identity'); doc.defaultView.frameElement = exact;
  doc.edge.epoch = 2; assert.equal(project([[0, 0]], doc).reason, 'stale');
});
check('same node with stale geometry revision cannot reuse old mapping', () => {
  const doc = frame(document, [1, 0, 0, 1, 10, 20]);
  assert.equal(project([[0, 0]], doc, d => d.edge, {epoch: 1, revision: 2}).reason, 'stale');
  doc.edge.revision = 2; doc.edge.matrix[4] = 90;
  assert.equal(project([[0, 0]], doc, d => d.edge, {epoch: 1, revision: 2}).envelope.left, 90);
});
check('depth budget and cycles reject without publishing a partial projection', () => {
  let doc = document; for (let i = 0; i < 33; i++) doc = frame(doc);
  const r = project([[0, 0]], doc); assert.equal(r.reason, 'chain-budget'); assert.equal(r.points, undefined);
  const cyclic = frame(document); cyclic.edge.parent = cyclic; cyclic.edge.node.ownerDocument = cyclic;
  assert.equal(project([[0, 0]], cyclic).reason, 'chain-budget');
});
check('point-count, nonfinite and output-range budgets are all-or-unknown', () => {
  assert.equal(project(Array(65).fill([0, 0]), document).reason, 'points');
  assert.equal(project([[0, 0], [NaN, 0]], document).reason, 'points');
  const r = project([[0, 0], [1, 1]], frame(document, [1, 0, 0, 1, 1e8, 0]));
  assert.equal(r.reason, 'range'); assert.equal(r.points, undefined);
});
check('singular and nonfinite mappings are not interpreted as usable geometry', () => {
  assert.equal(project([[0, 0]], frame(document, [0, 0, 0, 0, 0, 0])).reason, 'degenerate');
  const doc = frame(document); doc.edge.matrix[0] = Infinity;
  assert.equal(project([[0, 0]], doc).reason, 'mapping');
});
console.log(`P1-226 source/model revalidation: ${count} checks PASS; runtime remains ACTIVE; no browser/PDF claim.`);
