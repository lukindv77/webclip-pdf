'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const top = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const remote = fs.readFileSync(path.join(__dirname, '..', 'frame-agent.js'), 'utf8');

const hasTop = (re) => re.test(top);
const hasRemote = (re) => re.test(remote);

// Existing source boundary / positive controls.
assert(hasTop(/function\s+normalizeCandidate\s*\(/), 'missing top normalizeCandidate');
assert(hasTop(/function\s+onMouseMove\s*\(/), 'missing top hover path');
assert(hasTop(/function\s+onPageClick\s*\(/), 'missing top commit path');
assert(hasTop(/function\s+isUsableCandidate\s*\(/), 'missing top usability path');
assert(hasTop(/function\s+elementsVisuallyOverlap\s*\(/), 'missing top overlap authority path');
assert(hasRemote(/function\s+usable\s*\(/), 'missing remote usability path');
assert(hasRemote(/ev\.target|event\.target/), 'missing remote event-target input');

// P1-228 top-document closure requirements.
assert(
  hasTop(/renderedCandidate|pickerCandidate|candidateStack|collect[A-Za-z]*Candidates|resolve[A-Za-z]*Candidate/),
  'P1-228: top picker lacks an explicit rendered candidate model'
);
assert(
  hasTop(/elementsFromPoint|getClientRects|getBoxQuads|composedPath|renderedGeometry|visualRegions/),
  'P1-228: top picker lacks bounded richer candidate/geometry inputs beyond one raw target/AABB'
);
assert(
  hasTop(/checkVisibility|renderedVisibility|visibility\s*===|opacity\s*===|isRendered[A-Za-z]*/),
  'P1-228: top picker does not visibly distinguish rendered visibility from hit-testability'
);
assert(
  hasTop(/pointerdown|pointerup|pickerSurface|selectionSurface|gestureCandidate/),
  'P1-228: commit authority still appears to depend only on a page click event'
);
assert(
  hasTop(/getClientRects|getBoxQuads|renderedGeometry|visualRegions|fragmentGeometry/),
  'P1-228: authority-bearing geometry remains one bounding rectangle'
);
assert(
  hasTop(/renderedOverlap|visualOverlap|geometryOverlap|regionsOverlap|fragmentsOverlap/),
  'P1-228: overlap authority lacks an explicit rendered-geometry comparison path'
);
assert(
  hasTop(/MAX_[A-Z_]*(PICKER|CANDIDATE|GEOMETRY)|PICKER_[A-Z_]*(MAX|BUDGET)|CANDIDATE_[A-Z_]*(MAX|BUDGET)/),
  'P1-228: candidate traversal/geometry work lacks an explicit bound'
);

// Remote-frame parity: same rendered-intent semantics, separate session/permission owners.
assert(
  hasRemote(/renderedCandidate|pickerCandidate|candidateStack|elementsFromPoint|collect[A-Za-z]*Candidates/),
  'P1-228: permitted remote-frame picker still lacks rendered candidate traversal'
);
assert(
  hasRemote(/checkVisibility|renderedVisibility|getClientRects|getBoxQuads|renderedGeometry|visualRegions/),
  'P1-228: permitted remote-frame picker still uses only raw target/nonzero AABB semantics'
);
assert(
  hasRemote(/pointerdown|pointerup|pickerSurface|gestureCandidate/),
  'P1-228: remote commit cannot cover visible click-suppressed targets'
);

console.log('P1-228 rendered picker candidate/geometry source gate: PASS');
