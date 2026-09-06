'use strict';

const assert = require('assert');

function siblingReceipt(tags, index, maxVisits) {
  let visits = 0;
  let siblingIndex = -1;
  let sameTagIndex = -1;
  let sameTagSeen = 0;
  const targetTag = tags[index];

  for (let current = 0; current < tags.length; current += 1) {
    visits += 1;
    if (visits > maxVisits) {
      return { complete: false, visits, siblingIndex: -1, sameTagIndex: -1 };
    }

    if (tags[current] === targetTag) {
      if (current === index) sameTagIndex = sameTagSeen;
      sameTagSeen += 1;
    }

    if (current === index) {
      siblingIndex = current;
      return { complete: true, visits, siblingIndex, sameTagIndex };
    }
  }

  return { complete: false, visits, siblingIndex: -1, sameTagIndex: -1 };
}

function boundedClasses(tokens, maxTokens, maxChars) {
  const out = [];
  let chars = 0;
  let visits = 0;
  let truncated = false;

  for (const token of tokens) {
    visits += 1;
    const value = String(token);
    if (out.length >= maxTokens || chars + value.length > maxChars) {
      truncated = true;
      break;
    }
    chars += value.length;
    out.push(value);
  }

  return { out, chars, visits, truncated };
}

function boundedText(chunks, maxInputChars, maxOutputChars) {
  let consumed = 0;
  let raw = '';
  let truncated = false;

  for (const chunk of chunks) {
    const value = String(chunk);
    const room = maxInputChars - consumed;
    if (room <= 0) {
      truncated = true;
      break;
    }
    const prefix = value.slice(0, room);
    raw += prefix;
    consumed += prefix.length;
    if (prefix.length < value.length) {
      truncated = true;
      break;
    }
  }

  return {
    value: raw.replace(/\s+/g, ' ').trim().slice(0, maxOutputChars),
    consumed,
    truncated
  };
}

function selectorId(id, maxChars) {
  const value = String(id || '');
  if (value.length > maxChars) return { usable: false, value: '' };
  return { usable: true, value };
}

let result = siblingReceipt(new Array(1000).fill('div'), 900, 64);
assert.equal(result.complete, false);
assert.equal(result.siblingIndex, -1,
  'an over-budget sibling position must become unknown, not a false clamped index');
assert.ok(result.visits <= 65);

result = siblingReceipt(['a', 'div', 'div', 'p'], 2, 64);
assert.equal(result.complete, true);
assert.equal(result.siblingIndex, 2);
assert.equal(result.sameTagIndex, 1);

const classes = boundedClasses(new Array(10000).fill('x'), 8, 64);
assert.equal(classes.out.length, 8);
assert.ok(classes.visits <= 9,
  'class extraction must stop near the output bound rather than spread all page-controlled tokens');

const text = boundedText(['a'.repeat(10000)], 200, 120);
assert.equal(text.consumed, 200);
assert.equal(text.value.length, 120);
assert.equal(text.truncated, true,
  'locator text must bound input work before output slicing');

assert.equal(selectorId('x'.repeat(1000), 180).usable, false,
  'oversized page-controlled id must not reach selector escaping/parsing');
assert.equal(selectorId('short', 180).usable, true);

console.log('P1-168 bounded locator creation/scoring model: PASS');
