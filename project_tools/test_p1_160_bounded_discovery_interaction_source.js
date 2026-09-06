'use strict';

const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '..', 'content.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 12000) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) return '';
  return content.slice(start, start + maxChars);
}

const detectMain = functionSlice('detectMainContent');
const collectMain = functionSlice('collectMainContentCandidates');
const collectAds = functionSlice('collectAdvertisingCandidates');
const resolveAds = functionSlice('resolveSuggestedExcludeTarget');
const mouseMove = functionSlice('onMouseMove', 5000);
const refreshFrames = functionSlice('refreshFrameDocuments');

requireSource(/DISCOVERY_MAX_NODES/.test(content),
  'missing explicit shared discovery node budget');
requireSource(/DISCOVERY_MAX_CANDIDATES/.test(content),
  'missing explicit shared discovery candidate budget');
requireSource(/DISCOVERY_DEADLINE_MS/.test(content),
  'missing explicit discovery deadline/time budget');
requireSource(/INTERACTIVE_RESOLUTION_MAX_DEPTH/.test(content),
  'missing bounded ancestor-depth limit for interactive suggestion resolution');
requireSource(/createDiscoveryBudget|DiscoveryBudget/.test(content),
  'missing shared per-command discovery budget object');
requireSource(/budget-exhausted|budgetExhausted/.test(content),
  'discovery pipeline does not expose truthful budget-exhausted outcome');
requireSource(/discoveryGeneration|discoveryToken|generation.*discovery/i.test(content),
  'discovery result lacks a visible stale-generation publication fence');

requireSource(Boolean(detectMain), 'cannot locate detectMainContent()');
requireSource(/budget/.test(detectMain),
  'auto-content detection does not consume a shared budget');
requireSource(!/querySelectorAll\(semanticSelectors\.join/.test(collectMain),
  'main-content candidate collection still performs unbounded semantic querySelectorAll materialization');
requireSource(!/querySelectorAll\(['"]body div, body section['"]\)/.test(collectMain),
  'main-content candidate collection still scans all body div/section nodes eagerly');
requireSource(/TreeWalker|NodeIterator|firstElementChild|firstChild/.test(collectMain + detectMain),
  'main-content discovery lacks a visibly incremental bounded traversal');

requireSource(Boolean(collectAds), 'cannot locate collectAdvertisingCandidates()');
requireSource(!/\[root,\s*\.\.\.root\.querySelectorAll\(['"]\*['"]\)\]/.test(collectAds),
  'advertising discovery still materializes the complete Include subtree');
requireSource(/budget/.test(collectAds),
  'advertising discovery does not consume the shared discovery budget');

requireSource(Boolean(refreshFrames), 'cannot locate refreshFrameDocuments()');
requireSource(/budget/.test(refreshFrames),
  'same-origin frame discovery is not visibly budget-bound');

requireSource(Boolean(resolveAds), 'cannot locate resolveSuggestedExcludeTarget()');
requireSource(!/for\s*\([^)]*state\.adSuggestions/.test(resolveAds),
  'interactive hover resolution still scales linearly with adSuggestions');
requireSource(/WeakSet|ancestor|parentElement|parentNode|frameElement/.test(resolveAds),
  'interactive suggestion resolution lacks bounded ancestor-walk/index semantics');

requireSource(Boolean(mouseMove), 'cannot locate onMouseMove()');
requireSource(/requestAnimationFrame|schedule.*Hover|queue.*Hover/i.test(mouseMove + content),
  'pointer-move suggestion resolution is not visibly coalesced');

if (failures.length) {
  console.error('P1-160 bounded discovery and interactive resolution source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-160 bounded discovery and interactive resolution source gate: PASS');
