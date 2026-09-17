'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

let checks = 0;
function ok(v, m) { checks += 1; assert.ok(v, m); }
function eq(a, b, m) { checks += 1; assert.equal(a, b, m); }

const content = fs.readFileSync('content.js', 'utf8');
const frame = fs.readFileSync('frame-agent.js', 'utf8');

function sliceFn(src, startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = src.indexOf(endNeedle, start + startNeedle.length);
  ok(start >= 0, `found ${startNeedle}`);
  ok(end > start, `bounded ${startNeedle}`);
  return src.slice(start, end);
}

const top = sliceFn(content, 'async function prefetchIncludedResources()', '\n  function getSelectionDocuments()');
const remote = sliceFn(frame, 'async function prefetchSelected()', '\n  async function preparePrint()');

ok(top.includes('includedElementsBounded()'), 'top scanner starts from bounded included elements');
ok(top.includes('PDF_RESOURCE_PREFETCH_MAX_RESOURCES'), 'top scanner has resource cap');
ok(top.includes('PDF_RESOURCE_PREFETCH_DEADLINE_MS'), 'top scanner has shared deadline');
ok(top.includes("tag === 'IMG'"), 'top scanner covers DOM img');
ok(top.includes('style.backgroundImage'), 'top scanner covers ordinary element background-image');
ok(top.includes('style.fontFamily'), 'top scanner covers ordinary element fonts');
ok(top.includes('ownerDoc.fonts?.load'), 'top scanner explicitly loads ordinary element fonts');

eq(top.includes("getComputedStyle?.(element, '::before')"), false, 'top scanner does not inspect ::before');
eq(top.includes("getComputedStyle?.(element, '::after')"), false, 'top scanner does not inspect ::after');
eq(top.includes('maskImage'), false, 'top scanner has no mask-image discovery');
eq(top.includes('webkitMaskImage'), false, 'top scanner has no webkit-mask-image discovery');
eq(top.includes('listStyleImage'), false, 'top scanner has no list-style-image discovery');
eq(top.includes('borderImageSource'), false, 'top scanner has no border-image-source discovery');
eq(top.includes('content:'), false, 'top scanner has no pseudo/content image discovery');

ok(remote.includes("root.matches?.('img')"), 'remote scanner covers selected img roots');
ok(remote.includes("querySelectorAll?.('img')"), 'remote scanner covers descendant img');
ok(remote.includes('imgs.length>=100'), 'remote scanner has 100-image cap');
ok(remote.includes('Date.now()+5000'), 'remote scanner has about 5s deadline');
ok(remote.includes("img.getAttribute('data-src')"), 'remote scanner promotes lazy data-src');
ok(remote.includes("img.setAttribute('loading','eager')"), 'remote scanner promotes eager loading');
eq(remote.includes('getComputedStyle'), false, 'remote scanner does not inspect computed CSS');
eq(remote.includes('backgroundImage'), false, 'remote scanner does not cover CSS background images');
eq(remote.includes('fonts'), false, 'remote scanner does not cover fonts');
eq(remote.includes('::before'), false, 'remote scanner does not cover pseudo elements');
eq(remote.includes('mask'), false, 'remote scanner does not cover masks');
eq(remote.includes('listStyleImage'), false, 'remote scanner does not cover list marker images');

function graphCoverage({ domImg=false, background=false, font=false, pseudoImage=false, pseudoFont=false, mask=false, marker=false, borderImage=false } = {}) {
  return { domImg, background, font, pseudoImage, pseudoFont, mask, marker, borderImage };
}
const topCurrent = graphCoverage({ domImg:true, background:true, font:true });
ok(topCurrent.domImg && topCurrent.background && topCurrent.font, 'top current positive controls remain covered');
eq(topCurrent.pseudoImage, false, 'top current graph omits pseudo image');
eq(topCurrent.pseudoFont, false, 'top current graph omits pseudo font');
eq(topCurrent.mask, false, 'top current graph omits mask');
eq(topCurrent.marker, false, 'top current graph omits marker image');
eq(topCurrent.borderImage, false, 'top current graph omits border image');

const remoteCurrent = graphCoverage({ domImg:true });
ok(remoteCurrent.domImg, 'remote current positive control covers DOM img');
eq(remoteCurrent.background, false, 'remote graph lacks ordinary background parity');
eq(remoteCurrent.font, false, 'remote graph lacks ordinary font parity');

function candidateOutcome({ required, observed, omissionsKnown, deadlineExceeded=false, scanTruncated=false }) {
  const missing = required.filter((x) => !observed.has(x));
  if (missing.length && !omissionsKnown) return { ok:false, status:'unknown-incomplete', missing };
  if (missing.length || deadlineExceeded || scanTruncated) return { ok:true, status:'degraded', missing };
  return { ok:true, status:'complete', missing:[] };
}

let out = candidateOutcome({
  required:['img','background','pseudo-image','font'],
  observed:new Set(['img','background','font']),
  omissionsKnown:false
});
eq(out.ok, false, 'unknown missing required graph cannot be called successful complete capture');
eq(out.status, 'unknown-incomplete', 'unknown omission has explicit failure classification');

out = candidateOutcome({
  required:['img','background','pseudo-image','font'],
  observed:new Set(['img','background','font']),
  omissionsKnown:true
});
ok(out.ok, 'known bounded omission can complete as truthful degraded result');
eq(out.status, 'degraded', 'known omission is degraded, not complete');
eq(out.missing[0], 'pseudo-image', 'degraded result identifies missing resource class');

out = candidateOutcome({
  required:['img','background','font'],
  observed:new Set(['img','background','font']),
  omissionsKnown:true
});
eq(out.status, 'complete', 'fully proven graph can report complete');

out = candidateOutcome({
  required:['img'],
  observed:new Set(['img']),
  omissionsKnown:true,
  scanTruncated:true
});
eq(out.status, 'degraded', 'scan truncation prevents complete classification');

out = candidateOutcome({
  required:['img'],
  observed:new Set(['img']),
  omissionsKnown:true,
  deadlineExceeded:true
});
eq(out.status, 'degraded', 'deadline exhaustion prevents complete classification');

function parity(topKinds, remoteKinds) {
  return [...topKinds].every((x) => remoteKinds.has(x));
}
eq(parity(new Set(['img','background','font']), new Set(['img'])), false,
  'remote scanner is not parity-complete with top ordinary resource classes');
eq(parity(new Set(['img','background','font']), new Set(['img','background','font'])), true,
  'candidate frame parity covers ordinary top classes');

console.log(`P1-003 renderer resource graph model: PASS ${checks} checks`);
