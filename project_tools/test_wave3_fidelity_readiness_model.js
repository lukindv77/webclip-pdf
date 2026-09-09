'use strict';
const assert = require('assert/strict');
let cases = 0;
function ok(value, message) { cases += 1; assert.ok(value, message); }
function eq(actual, expected, message) { cases += 1; assert.deepEqual(actual, expected, message); }

function normalizeAttr(v) {
  return v == null ? { present: false, value: null } : { present: true, value: String(v) };
}

function restoreScalar(current, applied, before) {
  if (JSON.stringify(current) !== JSON.stringify(applied)) {
    return { action: 'preserve-host', value: current, conflict: true };
  }
  return { action: 'restore', value: before, conflict: false };
}

function restoreWrapper({ wrapperOwned, imageParent, expectedWrapper, originalParentLive, originalNextSiblingLive }) {
  if (!wrapperOwned) return { action: 'preserve-host', reason: 'wrapper-not-owned' };
  if (imageParent !== expectedWrapper) return { action: 'preserve-host', reason: 'topology-superseded' };
  if (!originalParentLive) return { action: 'preserve-host', reason: 'original-parent-gone' };
  return { action: originalNextSiblingLive ? 'insert-before-original-next' : 'append-original-parent' };
}

function visibilityAdmission({ hasBox = true, visibility = 'visible', opacity = 1, contentVisible = true }) {
  if (!hasBox || visibility !== 'visible' || Number(opacity) === 0 || !contentVisible) return 'not-admissible';
  return 'potentially-visible';
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function regionRelation(a, b) {
  if (a.precision === 'ambiguous' || b.precision === 'ambiguous') return 'ambiguous';
  for (const ra of a.fragments) for (const rb of b.fragments) if (rectsOverlap(ra, rb)) return 'definite-overlap';
  return 'definite-disjoint';
}

function candidateRank(c) {
  let score = 0;
  if (c.visible === true) score += 100;
  if (c.opacity === 0) score -= 200;
  if (c.pointerInert) score += 3;
  if (c.semantic) score += 10;
  if (c.rawTarget) score += 1;
  if (c.fragmentContainsPoint) score += 20;
  return score;
}

class SelectionCapacity {
  constructor({ maxIncludes, maxExcludes, maxBytes }) {
    this.maxIncludes = maxIncludes; this.maxExcludes = maxExcludes; this.maxBytes = maxBytes;
    this.includes = 0; this.excludes = 0; this.bytes = 0;
  }
  admit({ kind, bytes }) {
    const nextI = this.includes + (kind === 'include' ? 1 : 0);
    const nextE = this.excludes + (kind === 'exclude' ? 1 : 0);
    const nextB = this.bytes + bytes;
    if (nextI > this.maxIncludes || nextE > this.maxExcludes || nextB > this.maxBytes) return false;
    this.includes = nextI; this.excludes = nextE; this.bytes = nextB; return true;
  }
}

class UserReachedHistory {
  constructor(limit) { this.limit = limit; this.maxBoundary = 0; this.items = []; this.degraded = false; }
  observe({ userIntent, boundary, logicalIdentity, snapshot }) {
    if (!userIntent) return false;
    this.maxBoundary = Math.max(this.maxBoundary, boundary);
    if (this.items.length >= this.limit) { this.degraded = true; return false; }
    const last = this.items[this.items.length - 1];
    if (last && last.logicalIdentity === logicalIdentity && last.snapshot === snapshot) return true;
    this.items.push({ boundary, logicalIdentity, snapshot });
    return true;
  }
}

function iframeOutcome({ measuredHeight, maxLiveHeight, staticMaterialization }) {
  if (measuredHeight <= maxLiveHeight) return { status: 'full', mode: 'live-expanded', appliedHeight: measuredHeight };
  if (staticMaterialization === 'complete') return { status: 'full', mode: 'static-materialized', appliedHeight: null };
  return { status: 'degraded', mode: 'over-bound', appliedHeight: null };
}

function remoteRepresentation({ workerMedia, filterScope, uiSuppressed, measuredAfterFilter, selectedHeight }) {
  const filterEffective = filterScope === 'media-independent' || filterScope === workerMedia;
  const heightExact = measuredAfterFilter && selectedHeight > 0;
  return {
    filterEffective,
    uiSuppressed: Boolean(uiSuppressed),
    heightExact,
    full: filterEffective && uiSuppressed && heightExact
  };
}

function resourceGraphOutcome(resources) {
  const rendered = resources.filter(r => r.rendered);
  const failed = rendered.filter(r => r.state !== 'ready');
  return { rendered: rendered.length, failed: failed.length, status: failed.length ? 'degraded' : 'full' };
}

function fidelityOutcome(parts) {
  const degraded = Object.entries(parts).filter(([,v]) => v !== 'full').map(([k]) => k);
  return { status: degraded.length ? 'degraded' : 'full', degraded };
}

// A. Reversible mutation ledger semantics.
eq(restoreScalar(normalizeAttr('/old'), normalizeAttr('/temp'), normalizeAttr('/old')).action, 'preserve-host', 'wrong current must not restore');
eq(restoreScalar(normalizeAttr('/temp'), normalizeAttr('/temp'), normalizeAttr('/old')).action, 'restore', 'exact applied value may restore');
eq(restoreScalar(normalizeAttr('/host-new'), normalizeAttr('/temp'), normalizeAttr('/old')).value.value, '/host-new', 'new host href preserved');
ok(restoreScalar({value:'2px', priority:'important'}, {value:'4px', priority:'important'}, {value:'1px', priority:''}).conflict, 'changed style property conflicts');
eq(restoreWrapper({wrapperOwned:true,imageParent:'W',expectedWrapper:'W',originalParentLive:true,originalNextSiblingLive:true}).action,'insert-before-original-next');
eq(restoreWrapper({wrapperOwned:true,imageParent:'HOST',expectedWrapper:'W',originalParentLive:true,originalNextSiblingLive:true}).action,'preserve-host');
eq(restoreWrapper({wrapperOwned:false,imageParent:'W',expectedWrapper:'W',originalParentLive:true,originalNextSiblingLive:false}).reason,'wrapper-not-owned');

const headerA = { node: 'A', owner: 'M1' }, headerB = { node: 'B', owner: 'host' };
eq(headerA.owner === 'M1' ? 'remove-A' : 'keep', 'remove-A');
eq(headerB.owner === 'M1' ? 'remove-B' : 'keep', 'keep');

// B. Rendered-target admission / geometry.
eq(visibilityAdmission({hasBox:true,visibility:'hidden',opacity:1,contentVisible:true}),'not-admissible');
eq(visibilityAdmission({hasBox:true,visibility:'visible',opacity:0,contentVisible:true}),'not-admissible');
eq(visibilityAdmission({hasBox:true,visibility:'visible',opacity:1,contentVisible:true}),'potentially-visible');
const overlay = {visible:false,opacity:0,rawTarget:true,semantic:false,fragmentContainsPoint:true};
const article = {visible:true,opacity:1,rawTarget:false,semantic:true,fragmentContainsPoint:true};
ok(candidateRank(article) > candidateRank(overlay), 'invisible raw target must not outrank visible article');
const pointerInertChild = {visible:true,opacity:1,pointerInert:true,rawTarget:false,semantic:true,fragmentContainsPoint:true};
ok(candidateRank(pointerInertChild) > 0, 'pointer-inert visible child can be a candidate');

const fragmented = {precision:'exact',fragments:[{left:0,top:0,right:100,bottom:20},{left:0,top:40,right:100,bottom:60}]};
const gap = {precision:'exact',fragments:[{left:10,top:25,right:90,bottom:35}]};
eq(regionRelation(fragmented,gap),'definite-disjoint','fragment gap must not be false overlap');
const overlap = {precision:'exact',fragments:[{left:10,top:10,right:30,bottom:30}]};
eq(regionRelation(fragmented,overlap),'definite-overlap');
const clipAmbiguous = {precision:'ambiguous',fragments:[{left:0,top:0,right:100,bottom:100}]};
eq(regionRelation(clipAmbiguous,gap),'ambiguous','complex clipping cannot be hard overlap authority');

// C. One aggregate selection capacity before local/remote materialization and snapshot.
const cap = new SelectionCapacity({maxIncludes:2,maxExcludes:2,maxBytes:100});
ok(cap.admit({kind:'include',bytes:30}));
ok(cap.admit({kind:'include',bytes:30}));
ok(!cap.admit({kind:'include',bytes:1}),'third include rejected before commit');
ok(cap.admit({kind:'exclude',bytes:20}));
ok(!cap.admit({kind:'exclude',bytes:30}),'byte budget is global');
eq({includes:cap.includes,excludes:cap.excludes,bytes:cap.bytes},{includes:2,excludes:1,bytes:80});

// D. User-reached history semantics.
const hist = new UserReachedHistory(5);
ok(!hist.observe({userIntent:false,boundary:999,logicalIdentity:'forged',snapshot:'X'}),'script-only scroll does not enlarge authority');
ok(hist.observe({userIntent:true,boundary:8,logicalIdentity:'row-1-8',snapshot:'1-8'}));
ok(hist.observe({userIntent:true,boundary:57,logicalIdentity:'row-50-57',snapshot:'50-57'}));
ok(hist.observe({userIntent:true,boundary:8,logicalIdentity:'row-1-8',snapshot:'1-8'}));
eq(hist.maxBoundary,57,'scroll-back does not shrink max boundary');
ok(hist.items.some(x=>x.logicalIdentity==='row-50-57'),'previously materialized deeper history retained');
const recycled = new UserReachedHistory(5);
ok(recycled.observe({userIntent:true,boundary:3,logicalIdentity:'VR-003',snapshot:'nodeA=VR-003'}));
ok(recycled.observe({userIntent:true,boundary:52,logicalIdentity:'VR-052',snapshot:'nodeA=VR-052'}));
eq(recycled.items.length,2,'same DOM node with new logical identity is separate history');
const overflowHist = new UserReachedHistory(1);
ok(overflowHist.observe({userIntent:true,boundary:8,logicalIdentity:'a',snapshot:'a'}));
ok(!overflowHist.observe({userIntent:true,boundary:16,logicalIdentity:'b',snapshot:'b'}));
ok(overflowHist.degraded,'history overflow becomes degraded, not silent full');

// E. Same-origin frame > live bound must never be clamped and called full.
eq(iframeOutcome({measuredHeight:180000,maxLiveHeight:200000,staticMaterialization:'none'}),{status:'full',mode:'live-expanded',appliedHeight:180000});
eq(iframeOutcome({measuredHeight:210016,maxLiveHeight:200000,staticMaterialization:'complete'}).mode,'static-materialized');
eq(iframeOutcome({measuredHeight:210016,maxLiveHeight:200000,staticMaterialization:'failed'}).status,'degraded');
ok(iframeOutcome({measuredHeight:210016,maxLiveHeight:200000,staticMaterialization:'failed'}).appliedHeight === null,'no clipped 200000 full-success height');

// F. Remote frame selected representation must use same effective representation for filter/resources/height.
ok(!remoteRepresentation({workerMedia:'screen',filterScope:'print',uiSuppressed:false,measuredAfterFilter:false,selectedHeight:5100}).full,'current-like media mismatch cannot be full');
ok(remoteRepresentation({workerMedia:'screen',filterScope:'media-independent',uiSuppressed:true,measuredAfterFilter:true,selectedHeight:720}).full,'media-independent selected filter + suppressed UI + post-filter height can be full');
ok(!remoteRepresentation({workerMedia:'screen',filterScope:'media-independent',uiSuppressed:true,measuredAfterFilter:false,selectedHeight:5100}).full,'pre-filter height blocks full');

// G. Resource graph is derived from actual representation, including visual CSS/pseudo resources.
const rg1 = resourceGraphOutcome([
  {kind:'img-currentSrc',rendered:true,state:'ready'},
  {kind:'border-image',rendered:true,state:'ready'},
  {kind:'pseudo-content-url',rendered:true,state:'ready'},
  {kind:'font',rendered:true,state:'ready'}
]);
eq(rg1.status,'full');
const rg2 = resourceGraphOutcome([
  {kind:'img-currentSrc',rendered:true,state:'ready'},
  {kind:'border-image',rendered:true,state:'failed'},
  {kind:'unselected-image',rendered:false,state:'failed'}
]);
eq(rg2.failed,1,'only resources in physical representation affect fidelity');
eq(rg2.status,'degraded');

// H. Truthful final fidelity receipt.
eq(fidelityOutcome({mutation:'full',selection:'full',history:'full',representation:'full',resources:'full'}).status,'full');
eq(fidelityOutcome({mutation:'full',selection:'full',history:'degraded',representation:'full',resources:'full'}).status,'degraded');
eq(fidelityOutcome({mutation:'full',selection:'ambiguous',history:'full',representation:'full',resources:'full'}).degraded,['selection']);

// I. Cross-wave lineage: W3 receipt binds exact W1/W2 authority without replacing domain generations.
const receipt = {
  physicalOperationId:'P', sourceGeneration:'S', selectionRevision:'SR7', mutationGeneration:'M9',
  frameSessions:[{frameId:4,frameSession:'FS2',permissionGeneration:'PG3',printGeneration:'R4'}],
  fidelityStatus:'full'
};
eq(receipt.physicalOperationId,'P');
eq(receipt.sourceGeneration,'S');
eq(receipt.frameSessions[0].frameSession,'FS2');
eq(receipt.frameSessions[0].permissionGeneration,'PG3');
eq(receipt.frameSessions[0].printGeneration,'R4');
ok(receipt.mutationGeneration !== receipt.frameSessions[0].printGeneration,'domain generations remain distinct');

console.log(`Wave 3 fidelity readiness model: PASS; cases=${cases}`);
