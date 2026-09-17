'use strict';
const assert = require('assert');
const { createTracker, normalizeHref } = require('../application-generation.js');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.strictEqual(actual, expected, message); checks += 1; };

let href = 'https://example.test/a';
const events = [];
const tracker = createTracker({ readHref: () => href, onGeneration: (receipt) => events.push(receipt) });
const first = tracker.receipt();
eq(first.generation, 1, 'starts at generation 1');
eq(first.href, 'https://example.test/a', 'captures initial href');
ok(tracker.matches(first), 'initial receipt matches');
eq(events.length, 0, 'initialization does not emit transition');

let result = tracker.observe('state-only');
eq(result.changed, false, 'plain same-URL observation is not a transition');
eq(tracker.receipt().generation, 1, 'plain same-URL observation keeps generation');
ok(tracker.matches(first), 'plain same-URL observation preserves receipt');

result = tracker.advance('history-state');
eq(result.changed, true, 'explicit history transition advances even when URL is unchanged');
eq(result.receipt.generation, 2, 'same-URL history transition advances generation');
ok(!tracker.matches(first), 'pre-history receipt is stale after explicit application transition');
eq(events.length, 1, 'explicit transition emits once');

const sameUrlRoute = result.receipt;
href = 'https://example.test/b';
result = tracker.observe('dom-mutation');
eq(result.changed, true, 'URL change is observed from DOM signal');
eq(result.receipt.generation, 3, 'URL change advances generation');
eq(result.receipt.href, 'https://example.test/b', 'receipt binds new URL');
eq(result.receipt.reason, 'dom-mutation', 'receipt records bounded reason');
eq(events.length, 2, 'second transition emits once');
ok(!tracker.matches(sameUrlRoute), 'same-URL route receipt is stale after URL route change');
ok(tracker.matches(result.receipt), 'new receipt matches');

const routeB = result.receipt;
result = tracker.observe('url-poll');
eq(result.changed, false, 'poll does not double-count stable URL');
eq(events.length, 2, 'stable poll emits nothing');
ok(tracker.matches(routeB), 'stable route receipt remains valid');

href = 'https://example.test/b#section';
result = tracker.observe('hashchange');
eq(result.changed, true, 'hash URL change advances generation');
eq(result.receipt.generation, 4, 'hash change advances once');
ok(!tracker.matches(routeB), 'pre-hash receipt is stale');

const beforePopstate = result.receipt;
result = tracker.advance('popstate');
eq(result.changed, true, 'same-URL popstate is an application transition');
eq(result.receipt.generation, 5, 'same-URL popstate advances generation');
ok(!tracker.matches(beforePopstate), 'pre-popstate receipt is stale');

href = 'https://example.test/a';
result = tracker.advance('popstate');
eq(result.changed, true, 'back navigation advances generation');
eq(result.receipt.generation, 6, 'back navigation has fresh generation');
eq(events.length, 5, 'exactly five explicit/real transitions emitted');
eq(normalizeHref('https://example.test/a'), 'https://example.test/a', 'normalizer preserves canonical URL');
eq(normalizeHref('not a url'), 'not a url', 'normalizer fails closed to stable string');

console.log(`PASS ${checks} checks`);
