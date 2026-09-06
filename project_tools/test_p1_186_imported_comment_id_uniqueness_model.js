'use strict';

const assert = require('assert');

const MAX_ID_CHARS = 180;

function boundedId(value) {
  return String(value || '').trim().slice(0, MAX_ID_CHARS);
}

function uniqueCommentIds(rawComments) {
  const seen = new Set();
  const out = [];
  let rewrites = 0;

  for (let index = 0; index < rawComments.length; index += 1) {
    const raw = rawComments[index] || {};
    let base = boundedId(raw.id);
    if (!base) base = `comment-${index + 1}`;
    let candidate = base;
    let suffixIndex = 2;
    while (seen.has(candidate)) {
      const suffix = `~${suffixIndex++}`;
      candidate = `${base.slice(0, Math.max(0, MAX_ID_CHARS - suffix.length))}${suffix}`;
    }
    if (candidate !== boundedId(raw.id)) rewrites += 1;
    seen.add(candidate);
    out.push({ ...raw, id: candidate });
  }

  return { comments: out, rewrites };
}

let result = uniqueCommentIds([
  { id: 'a', text: 'first' },
  { id: 'a', text: 'second' },
  { id: 'a~2', text: 'third' },
  { id: 'a', text: 'fourth' }
]);
assert.deepEqual(result.comments.map((item) => item.id), ['a', 'a~2', 'a~2~2', 'a~3']);
assert.equal(new Set(result.comments.map((item) => item.id)).size, result.comments.length);
assert.equal(result.rewrites, 3);

// Missing ids become deterministic and remain collision-safe.
result = uniqueCommentIds([
  { id: '', text: 'one' },
  { id: 'comment-1', text: 'two' },
  { text: 'three' }
]);
assert.deepEqual(result.comments.map((item) => item.id), ['comment-1', 'comment-1~2', 'comment-3']);

// Extremely long ids stay within the durable envelope even after suffixing.
const long = 'x'.repeat(MAX_ID_CHARS);
result = uniqueCommentIds([{ id: long }, { id: long }]);
assert.equal(result.comments[0].id.length, MAX_ID_CHARS);
assert.equal(result.comments[1].id.length, MAX_ID_CHARS);
assert.notEqual(result.comments[0].id, result.comments[1].id);

// Addressing by id now names exactly one comment.
const comments = result.comments;
for (const id of comments.map((item) => item.id)) {
  assert.equal(comments.filter((item) => item.id === id).length, 1);
}

// Same payload/order normalizes deterministically across retry/restart.
const input = [{ id: 'dup' }, { id: 'dup' }, { id: 'dup' }];
assert.deepEqual(uniqueCommentIds(input), uniqueCommentIds(input));

console.log('P1-186 imported comment id uniqueness model: PASS');
