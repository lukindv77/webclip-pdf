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
eq(result.changed, false, 'same URL state-only activity is not a transition');
eq(tracker.receipt().generation, 1, 'same URL keeps generation');
ok(tracker.matches(first), 'same URL preserves receipt');

href = 'https://example.test/b';
result = tracker.observe('dom-mutation');
eq(result.changed, true, 'URL change is observed from DOM signal');
eq(result.receipt.generation, 2, 'URL change advances generation');
eq(result.receipt.href, 'https://example.test/b', 'receipt binds new URL');
eq(result.receipt.reason, 'dom-mutation', 'receipt records bounded reason');
eq(events.length, 1, 'transition emits once');
ok(!tracker.matches(first), 'old receipt is stale after route change');
ok(tracker.matches(result.receipt), 'new receipt matches');

const routeB = result.receipt;
result = tracker.observe('url-poll');
eq(result.changed, false, 'poll does not double-count stable URL');
eq(events.length, 1, 'stable poll emits nothing');
ok(tracker.matches(routeB), 'stable route receipt remains valid');

href = 'https://example.test/b#section';
result = tracker.observe('hashchange');
eq(result.changed, true, 'hash/history URL change advances generation');
eq(result.receipt.generation, 3, 'hash change advances once');
ok(!tracker.matches(routeB), 'pre-hash receipt is stale');

href = 'https://example.test/b#section';
result = tracker.observe('popstate');
eq(result.changed, false, 'history event with unchanged URL is not destructive');
eq(tracker.receipt().generation, 3, 'unchanged popstate does not advance');

href = 'https://example.test/a';
result = tracker.observe('popstate');
eq(result.changed, true, 'back navigation advances generation');
eq(result.receipt.generation, 4, 'back navigation has fresh generation');
eq(events.length, 3, 'exactly three real transitions emitted');
eq(normalizeHref('https://example.test/a'), 'https://example.test/a', 'normalizer preserves canonical URL');
eq(normalizeHref('not a url'), 'not a url', 'normalizer fails closed to stable string');

console.log(`PASS ${checks} checks`);
