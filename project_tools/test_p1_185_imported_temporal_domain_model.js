'use strict';

const assert = require('assert');

const FUTURE_SKEW_MS = 24 * 60 * 60 * 1000; // model constant; runtime must expose an explicit bounded policy.

function normalizeTimestamp(value, { referenceNow, allowZero = true, fallback = 0 } = {}) {
  const n = Number(value);
  if (allowZero && (value === '' || value == null || n === 0)) return 0;
  if (!Number.isSafeInteger(n) || n < 0 || n > referenceNow + FUTURE_SKEW_MS) return fallback;
  const d = new Date(n);
  if (!Number.isFinite(d.getTime())) return fallback;
  return n;
}

function dayKey(timestamp) {
  const d = new Date(timestamp);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeComment(raw, entryCreatedAt, referenceNow) {
  const createdAt = normalizeTimestamp(raw?.createdAt, {
    referenceNow,
    allowZero: false,
    fallback: entryCreatedAt
  });
  let updatedAt = normalizeTimestamp(raw?.updatedAt, {
    referenceNow,
    allowZero: false,
    fallback: createdAt
  });
  if (updatedAt < createdAt) updatedAt = createdAt;
  let deletedAt = normalizeTimestamp(raw?.deletedAt, {
    referenceNow,
    allowZero: true,
    fallback: 0
  });
  if (deletedAt > 0 && deletedAt < createdAt) deletedAt = 0;
  return { createdAt, updatedAt, deletedAt };
}

function normalizeImportedTemporal(raw, referenceNow) {
  const createdAt = normalizeTimestamp(raw?.createdAt, {
    referenceNow,
    allowZero: false,
    fallback: referenceNow
  });
  return {
    createdAt,
    localDayKey: dayKey(createdAt),
    journalCommentUpdatedAt: normalizeTimestamp(raw?.journalCommentUpdatedAt, { referenceNow, fallback: 0 }),
    movedToReadAt: normalizeTimestamp(raw?.movedToReadAt, { referenceNow, fallback: 0 }),
    readMovePendingAt: normalizeTimestamp(raw?.readMovePendingAt, { referenceNow, fallback: 0 }),
    comments: (Array.isArray(raw?.journalComments) ? raw.journalComments : [])
      .map((comment) => normalizeComment(comment, createdAt, referenceNow))
  };
}

const now = Date.UTC(2026, 8, 7, 0, 0, 0);
let out = normalizeImportedTemporal({
  createdAt: Date.UTC(2026, 8, 1, 12),
  localDayKey: '2099-99-99',
  movedToReadAt: Infinity,
  readMovePendingAt: 1e100,
  journalCommentUpdatedAt: -5,
  journalComments: [{ createdAt: NaN, updatedAt: Infinity, deletedAt: -1 }]
}, now);
assert.equal(out.localDayKey, '2026-09-01', 'day key must be derived from canonical createdAt, never copied by regex');
assert.equal(out.movedToReadAt, 0);
assert.equal(out.readMovePendingAt, 0);
assert.equal(out.journalCommentUpdatedAt, 0);
assert.equal(out.comments[0].createdAt, out.createdAt);
assert.equal(out.comments[0].updatedAt, out.createdAt);
assert.equal(out.comments[0].deletedAt, 0);

out = normalizeImportedTemporal({ createdAt: now + FUTURE_SKEW_MS + 1 }, now);
assert.equal(out.createdAt, now, 'far-future core timestamp must not poison ordering');
assert.equal(out.localDayKey, '2026-09-07');

out = normalizeImportedTemporal({ createdAt: now + FUTURE_SKEW_MS }, now);
assert.equal(out.createdAt, now + FUTURE_SKEW_MS, 'explicit bounded clock-skew window remains accepted');

out = normalizeImportedTemporal({
  createdAt: now - 1000,
  journalComments: [{ createdAt: now - 900, updatedAt: now - 950, deletedAt: now - 950 }]
}, now);
assert.equal(out.comments[0].updatedAt, now - 900, 'updatedAt cannot precede createdAt');
assert.equal(out.comments[0].deletedAt, 0, 'deletedAt before createdAt is not a valid tombstone');

console.log('P1-185 imported temporal domain model: PASS');
