'use strict';

const assert = require('assert');

class Budget {
  constructor({ maxNodes, maxCandidates, maxTicks }) {
    this.maxNodes = maxNodes;
    this.maxCandidates = maxCandidates;
    this.maxTicks = maxTicks;
    this.nodes = 0;
    this.candidates = 0;
    this.ticks = 0;
    this.exhausted = '';
  }

  node(count = 1) {
    if (this.exhausted) return false;
    this.nodes += count;
    if (this.nodes > this.maxNodes) {
      this.exhausted = 'nodes';
      return false;
    }
    return true;
  }

  candidate(count = 1) {
    if (this.exhausted) return false;
    this.candidates += count;
    if (this.candidates > this.maxCandidates) {
      this.exhausted = 'candidates';
      return false;
    }
    return true;
  }

  tick(count = 1) {
    if (this.exhausted) return false;
    this.ticks += count;
    if (this.ticks > this.maxTicks) {
      this.exhausted = 'time';
      return false;
    }
    return true;
  }
}

function discoverMain(treeSize, candidateEvery, budget) {
  let best = null;
  for (let index = 0; index < treeSize; index += 1) {
    if (!budget.node() || !budget.tick()) {
      return { status: 'budget-exhausted', best: null, reason: budget.exhausted };
    }
    if (index % candidateEvery === 0) {
      if (!budget.candidate()) {
        return { status: 'budget-exhausted', best: null, reason: budget.exhausted };
      }
      best = index;
    }
  }
  return { status: 'complete', best };
}

function discoverFrames(frameSizes, budget) {
  let frames = 0;
  for (const size of frameSizes) {
    frames += 1;
    for (let index = 0; index < size; index += 1) {
      if (!budget.node() || !budget.tick()) {
        return { status: 'budget-exhausted', frames: 0, reason: budget.exhausted };
      }
    }
  }
  return { status: 'complete', frames };
}

function discoverAds(includeSizes, budget) {
  let suggestions = 0;
  for (const size of includeSizes) {
    for (let index = 0; index < size; index += 1) {
      if (!budget.node() || !budget.tick()) {
        return { status: 'budget-exhausted', suggestions, reason: budget.exhausted };
      }
      if (index % 7 === 0) {
        if (!budget.candidate()) {
          return { status: 'budget-exhausted', suggestions, reason: budget.exhausted };
        }
        suggestions += 1;
      }
    }
  }
  return { status: 'complete', suggestions };
}

function coalescedHover(events, ancestorDepth, maxDepth) {
  const resolutions = events.length ? 1 : 0;
  let steps = 0;
  let matched = false;
  if (resolutions) {
    for (let depth = 0; depth < ancestorDepth && depth < maxDepth; depth += 1) {
      steps += 1;
      if (depth === 3) {
        matched = true;
        break;
      }
    }
  }
  return {
    resolutions,
    steps,
    matched,
    truncated: ancestorDepth > maxDepth && !matched
  };
}

function publishDiscovery(result, startGeneration, currentGeneration) {
  if (startGeneration !== currentGeneration) return { status: 'stale', published: false };
  if (result.status !== 'complete') return { status: result.status, published: false };
  return { status: 'complete', published: true };
}

let result = discoverMain(
  20,
  5,
  new Budget({ maxNodes: 100, maxCandidates: 20, maxTicks: 100 })
);
assert.equal(result.status, 'complete');
assert.notEqual(result.best, null);

result = discoverMain(
  1000,
  1,
  new Budget({ maxNodes: 50, maxCandidates: 100, maxTicks: 1000 })
);
assert.equal(result.status, 'budget-exhausted');
assert.equal(result.best, null,
  'a best candidate from an incomplete prefix must not become authoritative auto-selection');

result = discoverFrames(
  [10, 10, 100],
  new Budget({ maxNodes: 30, maxCandidates: 10, maxTicks: 30 })
);
assert.equal(result.status, 'budget-exhausted');
assert.equal(result.frames, 0,
  'partial frame discovery must not claim a complete frame set');

result = discoverAds(
  [20, 20],
  new Budget({ maxNodes: 100, maxCandidates: 3, maxTicks: 100 })
);
assert.equal(result.status, 'budget-exhausted');
assert.equal(result.reason, 'candidates');

const hover = coalescedHover(new Array(100).fill({}), 200, 32);
assert.equal(hover.resolutions, 1,
  'a burst of pointer events must be coalesced into one interactive resolution pass');
assert.ok(hover.steps <= 32,
  'interactive suggestion resolution must be bounded by ancestor depth, not suggestion count');

let publication = publishDiscovery({ status: 'complete' }, 7, 8);
assert.equal(publication.status, 'stale');
assert.equal(publication.published, false);

publication = publishDiscovery({ status: 'budget-exhausted' }, 7, 7);
assert.equal(publication.published, false,
  'budget-exhausted auto discovery must fall back instead of publishing partial authority');

console.log('P1-160 bounded discovery and interactive resolution model: PASS');
