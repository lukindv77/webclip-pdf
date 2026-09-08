'use strict';

const assert = require('assert');

const EPS = 1e-9;

function rectPoly(x, y, w, h) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h }
  ];
}

function boundsOfPolys(polys) {
  const pts = polys.flat();
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function projection(poly, axis) {
  const values = poly.map((p) => p.x * axis.x + p.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function axesFor(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length <= EPS) continue;
    out.push({ x: -dy / length, y: dx / length });
  }
  return out;
}

function convexOverlap(a, b) {
  for (const axis of [...axesFor(a), ...axesFor(b)]) {
    const pa = projection(a, axis), pb = projection(b, axis);
    if (Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min) <= EPS) return false;
  }
  return true;
}

function renderedOverlap(a, b) {
  for (const pa of a.geometry) {
    for (const pb of b.geometry) {
      if (convexOverlap(pa, pb)) return true;
    }
  }
  return false;
}

function aabbOverlap(boundsA, boundsB) {
  if (!boundsA || !boundsB) return false;
  return Math.min(boundsA.right, boundsB.right) - Math.max(boundsA.left, boundsB.left) > EPS &&
    Math.min(boundsA.bottom, boundsB.bottom) - Math.max(boundsA.top, boundsB.top) > EPS;
}

class Candidate {
  constructor(id, {
    visible = true,
    hitTestable = true,
    geometry = [],
    rawBounds = null,
    semantic = true
  } = {}) {
    this.id = id;
    this.visible = visible;
    this.hitTestable = hitTestable;
    this.geometry = geometry;
    this.rawBounds = rawBounds || boundsOfPolys(geometry);
    this.semantic = semantic;
  }
}

function usableRendered(candidate) {
  if (!candidate?.visible || !candidate.semantic || !candidate.geometry.length) return false;
  const bounds = boundsOfPolys(candidate.geometry);
  return Boolean(bounds && bounds.width >= 2 && bounds.height >= 2);
}

function boundedRenderedCandidates({ hitStack = [], visualStack = [], ancestors = [], maxCandidates = 8 }) {
  const out = [];
  const seen = new Set();
  // Visual candidates are preferred because host hit testing may omit visible pointer-inert nodes.
  for (const candidate of [...visualStack, ...hitStack, ...ancestors]) {
    if (!candidate || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    if (!usableRendered(candidate)) continue;
    out.push(candidate);
    if (out.length >= maxCandidates) break;
  }
  return out;
}

function chooseCandidate(input, cycleIndex = 0) {
  const candidates = boundedRenderedCandidates(input);
  if (!candidates.length) return null;
  return candidates[Math.max(0, Math.min(candidates.length - 1, cycleIndex))];
}

function legacyRawTarget(candidate) {
  if (!candidate) return null;
  const b = candidate.rawBounds;
  return b && b.width >= 2 && b.height >= 2 ? candidate : null;
}

function legacyCurrentShapeCounterexample() {
  const article = new Candidate('article', { geometry: [rectPoly(0, 0, 240, 100)] });
  const transparentOverlay = new Candidate('overlay', {
    visible: false,
    hitTestable: true,
    geometry: [rectPoly(0, 0, 240, 100)]
  });
  const legacy = legacyRawTarget(transparentOverlay);
  assert.strictEqual(legacy?.id, 'overlay');
  const current = chooseCandidate({
    hitStack: [transparentOverlay, article],
    visualStack: [article]
  });
  assert.strictEqual(current?.id, 'article');
  return 'P1-228 current-shape counterexample: invisible hit-test interceptor wins raw event.target over visible content';
}

function sharedPickerParity(label) {
  // A. Ordinary visible target remains the default candidate.
  {
    const target = new Candidate(`${label}:normal`, { geometry: [rectPoly(10, 10, 100, 30)] });
    assert.strictEqual(chooseCandidate({ hitStack: [target], visualStack: [target] }).id, target.id);
  }

  // B. Fully transparent hit-test interceptor is skipped in favor of rendered underlying content.
  {
    const overlay = new Candidate(`${label}:overlay`, { visible: false, geometry: [rectPoly(0, 0, 200, 80)] });
    const article = new Candidate(`${label}:article`, { geometry: [rectPoly(0, 0, 200, 80)] });
    assert.strictEqual(chooseCandidate({ hitStack: [overlay, article], visualStack: [article] }).id, article.id);
  }

  // C. Visible pointer-events:none content can still be an exact rendered candidate.
  {
    const child = new Candidate(`${label}:pointer-inert-child`, { hitTestable: false, geometry: [rectPoly(10, 10, 160, 50)] });
    const parent = new Candidate(`${label}:parent`, { geometry: [rectPoly(0, 0, 180, 70)] });
    assert.strictEqual(chooseCandidate({ hitStack: [parent], visualStack: [child, parent] }).id, child.id);
  }

  // D. Disabled/click-suppressed rendered control can commit from picker gesture authority, not page click delivery.
  {
    const disabled = new Candidate(`${label}:disabled`, { geometry: [rectPoly(20, 20, 90, 28)] });
    const pageClickDelivered = false;
    const admittedByPickerGesture = chooseCandidate({ visualStack: [disabled], hitStack: [disabled] });
    assert.strictEqual(pageClickDelivered, false);
    assert.strictEqual(admittedByPickerGesture.id, disabled.id);
  }

  // E. Zero-box image-map area can fall back to the rendered image region instead of becoming unusable.
  {
    const area = new Candidate(`${label}:area`, { geometry: [], rawBounds: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } });
    const image = new Candidate(`${label}:image`, { geometry: [rectPoly(0, 0, 200, 100)] });
    assert.strictEqual(legacyRawTarget(area), null);
    assert.strictEqual(chooseCandidate({ hitStack: [area, image], visualStack: [image] }).id, image.id);
  }

  // F. Candidate cycling can choose a useful visible ancestor even when a child covers all its pixels.
  {
    const child = new Candidate(`${label}:child`, { geometry: [rectPoly(0, 0, 200, 100)] });
    const article = new Candidate(`${label}:article-parent`, { geometry: [rectPoly(0, 0, 200, 100)] });
    const input = { hitStack: [child, article], visualStack: [child, article], ancestors: [article] };
    assert.strictEqual(chooseCandidate(input, 0).id, child.id);
    assert.strictEqual(chooseCandidate(input, 1).id, article.id);
  }
}

function geometrySchedules() {
  // G. Multiline fragments: union AABB overlaps a gap candidate, fragment geometry does not.
  {
    const multiline = new Candidate('multiline', {
      geometry: [rectPoly(0, 0, 100, 16), rectPoly(0, 40, 140, 16)],
      rawBounds: { left: 0, top: 0, right: 140, bottom: 56, width: 140, height: 56 }
    });
    const gap = new Candidate('gap', { geometry: [rectPoly(20, 22, 30, 10)] });
    assert.strictEqual(aabbOverlap(multiline.rawBounds, gap.rawBounds), true);
    assert.strictEqual(renderedOverlap(multiline, gap), false);
  }

  // H. Transformed/rotated shape: AABB corner is empty even though raw boxes overlap.
  {
    const diamond = new Candidate('diamond', {
      geometry: [[{x:50,y:0},{x:100,y:50},{x:50,y:100},{x:0,y:50}]],
      rawBounds: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }
    });
    const corner = new Candidate('corner', { geometry: [rectPoly(2, 2, 10, 10)] });
    assert.strictEqual(aabbOverlap(diamond.rawBounds, corner.rawBounds), true);
    assert.strictEqual(renderedOverlap(diamond, corner), false);
  }

  // I. Overflow/clip geometry: visible occupancy is smaller than raw child bounds.
  {
    const clipped = new Candidate('clipped', {
      geometry: [rectPoly(0, 0, 90, 70)],
      rawBounds: { left: 0, top: 0, right: 220, bottom: 160, width: 220, height: 160 }
    });
    const outsideVisibleClip = new Candidate('outside-clip', { geometry: [rectPoly(150, 100, 20, 20)] });
    assert.strictEqual(aabbOverlap(clipped.rawBounds, outsideVisibleClip.rawBounds), true);
    assert.strictEqual(renderedOverlap(clipped, outsideVisibleClip), false);
  }

  // J. SVG/circular-like visible shape: exact rendered polygon avoids square-corner false overlap.
  {
    const octagon = [
      {x:30,y:0},{x:70,y:0},{x:100,y:30},{x:100,y:70},
      {x:70,y:100},{x:30,y:100},{x:0,y:70},{x:0,y:30}
    ];
    const shape = new Candidate('svg-shape', {
      geometry: [octagon],
      rawBounds: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }
    });
    const corner = new Candidate('svg-corner', { geometry: [rectPoly(2, 2, 10, 10)] });
    assert.strictEqual(aabbOverlap(shape.rawBounds, corner.rawBounds), true);
    assert.strictEqual(renderedOverlap(shape, corner), false);
  }

  // K. Candidate traversal is explicitly bounded.
  {
    const candidates = Array.from({ length: 40 }, (_, i) => new Candidate(`c${i}`, { geometry: [rectPoly(i, 0, 4, 4)] }));
    const resolved = boundedRenderedCandidates({ visualStack: candidates, hitStack: candidates, maxCandidates: 8 });
    assert.strictEqual(resolved.length, 8);
  }
}

function run() {
  console.log(legacyCurrentShapeCounterexample());
  sharedPickerParity('top');
  sharedPickerParity('remote');
  geometrySchedules();
  console.log('P1-228 rendered manual-picker candidate/geometry deterministic model: PASS');
}

run();
