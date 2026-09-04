'use strict';

const assert = require('node:assert/strict');

function makeStage({ state = 'prepared', reset = false } = {}) {
  return {
    state,
    resetDisposition: reset ? { version: 1, resetId: 'reset-1' } : null
  };
}

function admitMutationStage(stage) {
  if (!stage) return { ok: false, reason: 'missing' };
  if (stage.resetDisposition) return { ok: false, reason: 'reset-detached' };
  if (stage.state === 'admitted') return { ok: false, reason: 'already-admitted' };
  if (stage.state !== 'prepared') return { ok: false, reason: 'not-prepared' };
  stage.state = 'admitted';
  return { ok: true, reason: 'admitted-now' };
}

async function ensurePublicUrlModel({ existingUrl = '', publishStage, onPublish }) {
  // Current runtime shape: read-only metadata lookup happens before the mutation.
  if (existingUrl) return { url: existingUrl, mutationAttempted: false };

  // P0-072 target: admission is the last authority check before /resources/publish.
  const gate = admitMutationStage(publishStage);
  if (!gate.ok) return { url: '', mutationAttempted: false, blocked: gate.reason };
  await onPublish();
  return { url: 'https://public.example/x', mutationAttempted: true };
}

async function startAutomaticDownloadModel({ downloadStage, onStart }) {
  // P0-072 target: no stale caller snapshot may authorize chrome.downloads.download().
  const gate = admitMutationStage(downloadStage);
  if (!gate.ok) return { started: false, blocked: gate.reason };
  await onStart();
  return { started: true };
}

(async () => {
  {
    const stage = makeStage();
    let publishCalls = 0;
    const result = await ensurePublicUrlModel({
      existingUrl: 'https://already-public.example/x',
      publishStage: stage,
      onPublish: async () => { publishCalls += 1; }
    });
    assert.equal(result.mutationAttempted, false);
    assert.equal(publishCalls, 0);
    assert.equal(stage.state, 'prepared',
      'read-only discovery of an existing public URL must not fabricate publish admission');
  }

  {
    const stage = makeStage({ reset: true });
    let publishCalls = 0;
    const result = await ensurePublicUrlModel({
      publishStage: stage,
      onPublish: async () => { publishCalls += 1; }
    });
    assert.equal(result.blocked, 'reset-detached');
    assert.equal(publishCalls, 0,
      'reset between metadata read and publish boundary must prevent /resources/publish');
  }

  {
    const stage = makeStage();
    let publishCalls = 0;
    const result = await ensurePublicUrlModel({
      publishStage: stage,
      onPublish: async () => { publishCalls += 1; }
    });
    assert.equal(result.mutationAttempted, true);
    assert.equal(publishCalls, 1);
    assert.equal(stage.state, 'admitted');
  }

  {
    const stage = makeStage({ state: 'admitted' });
    let publishCalls = 0;
    const result = await ensurePublicUrlModel({
      publishStage: stage,
      onPublish: async () => { publishCalls += 1; }
    });
    assert.equal(result.blocked, 'already-admitted');
    assert.equal(publishCalls, 0,
      'already-admitted/unknown publish must be reconciled read-only, never blindly repeated');
  }

  {
    const stage = makeStage({ reset: true });
    let starts = 0;
    const result = await startAutomaticDownloadModel({
      downloadStage: stage,
      onStart: async () => { starts += 1; }
    });
    assert.equal(result.started, false);
    assert.equal(starts, 0);
  }

  {
    const stage = makeStage({ state: 'admitted' });
    let starts = 0;
    const result = await startAutomaticDownloadModel({
      downloadStage: stage,
      onStart: async () => { starts += 1; }
    });
    assert.equal(result.blocked, 'already-admitted');
    assert.equal(starts, 0,
      'already-admitted download start cannot authorize a duplicate chrome.downloads.download() call');
  }

  console.log('P0-072 mutation boundary placement model: PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
