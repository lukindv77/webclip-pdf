'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function functionSlice(name){
  const starts=[`function ${name}`,`async function ${name}`].map(m=>source.indexOf(m)).filter(x=>x>=0);
  assert.ok(starts.length,`Missing function ${name}`);
  const start=Math.min(...starts);
  const next=[source.indexOf('\n  function ',start+20),source.indexOf('\n  async function ',start+20)].filter(x=>x>start);
  return source.slice(start,next.length?Math.min(...next):source.length);
}
function must(text,re,message){ assert.match(text,re,message); }

const project=functionSlice('rectRelativeToTopViewport');
const getDoc=functionSlice('getDocumentRect');
const usable=functionSlice('isUsableCandidate');
const overlap=functionSlice('elementsVisuallyOverlap');
const outline=functionSlice('appendOutline');

// Positive controls: one projection helper remains shared by all authority-bearing consumers.
must(project,/getBoundingClientRect\s*\(/,'Projection must still start from rendered child geometry.');
must(getDoc,/rectRelativeToTopViewport\s*\(/,'Document geometry must share the top-space projection helper.');
must(usable,/getDocumentRect\s*\(/,'Candidate usability must consume shared projected geometry.');
must(overlap,/getDocumentRect\s*\(/,'Visual overlap must consume shared projected geometry.');
must(outline,/rectRelativeToTopViewport\s*\(/,'Selection outline must consume shared projected geometry.');

// P1-226 closure: the frame content-box origin must be represented explicitly.
assert.ok(
  /getBoxQuads\s*\(/.test(project)
    || /clientLeft|clientTop|contentBox|content-box|borderLeft|borderTop|paddingLeft|paddingTop/i.test(project),
  'Iframe projection must account for the child viewport/content-box origin inside the frame border box.'
);

// Transform/zoom/scaling must be composed, not ignored.
assert.ok(
  /getBoxQuads\s*\(/.test(project)
    || /DOMMatrix|DOMPoint|transformPoint|matrix|transform|zoom|scale/i.test(project),
  'Iframe projection must compose CSS transform/scale/zoom into the child->parent mapping.'
);

// Nested frames must continue walking every same-origin ancestor.
must(project,/while\s*\([^)]*currentDoc[^)]*document/,'Projection must walk nested frame ancestors to the top document.');
must(project,/getFrameElementForDocument\s*\(/,'Projection must bind each child document to its exact frame element.');

// A general affine/quad mapping must transform dimensions as well as origin.
assert.ok(
  /getBoxQuads\s*\(/.test(project)
    || /(?:corner|point|quad|right|bottom)[\s\S]{0,1200}(?:transform|matrix|project|scale)/i.test(project),
  'Projection must derive top-space bounds from transformed corners/quad or an equivalent visual mapping.'
);

// Explicitly reject the current simple-addition shape and untransformed dimensions.
assert.doesNotMatch(project,/left\s*\+=\s*frameRect\.left/,
  'Projection must not map nested frames by only adding frameRect.left.');
assert.doesNotMatch(project,/top\s*\+=\s*frameRect\.top/,
  'Projection must not map nested frames by only adding frameRect.top.');
assert.doesNotMatch(project,/right\s*:\s*left\s*\+\s*rect\.width[\s\S]{0,160}width\s*:\s*rect\.width/,
  'Projected width/right must not reuse the untransformed child width.');
assert.doesNotMatch(project,/bottom\s*:\s*top\s*\+\s*rect\.height[\s\S]{0,160}height\s*:\s*rect\.height/,
  'Projected height/bottom must not reuse the untransformed child height.');

// Top-document scroll conversion remains one final step after viewport projection.
must(getDoc,/window\.scrollX/,'Document-space conversion must retain top-window horizontal scroll.');
must(getDoc,/window\.scrollY/,'Document-space conversion must retain top-window vertical scroll.');

console.log('P1-226 same-origin iframe top-space geometry source gate: PASS');
