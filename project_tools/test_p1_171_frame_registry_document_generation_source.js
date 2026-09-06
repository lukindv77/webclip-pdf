'use strict';
const fs = require('fs');
const assert = require('assert');

const worker = fs.readFileSync('service-worker.js', 'utf8');
const content = fs.readFileSync('content.js', 'utf8');

function must(text, rx, label) {
  assert(rx.test(text), `P1-171 source gate: missing ${label}`);
}

// Existing positive controls must remain.
must(worker, /frameAgentsByTab/, 'worker frame-agent registry');
must(worker, /registerFrameAgent\s*\(/, 'frame-agent registration');
must(worker, /sender[^\n]{0,120}documentId|documentId[^\n]{0,120}sender/, 'child sender.documentId capture');
must(worker, /forwardFrameAgentState\s*\(/, 'document-bound inbound state forwarding');
must(content, /remoteFrames/, 'top remote-frame registry');
must(content, /documentId/, 'top content child document identity');

// Caller must carry the exact child document observed by top content.
must(
  content,
  /WEBCLIP_FRAME_AGENT_TARGET[\s\S]{0,1200}(documentId|childDocumentId)[\s\S]{0,200}(remote\.?documentId|remote\?\.documentId|receipt)/,
  'TARGET request carrying expected child document identity'
);

// Worker TARGET admission must consume browser top sender.documentId and expected child identity.
must(
  worker,
  /WEBCLIP_FRAME_AGENT_TARGET[\s\S]{0,1800}sender[^\n]{0,160}documentId/,
  'TARGET top sender.documentId admission'
);
must(
  worker,
  /WEBCLIP_FRAME_AGENT_TARGET[\s\S]{0,1800}message[^\n]{0,160}(documentId|childDocumentId|frameAgentReceipt)/,
  'TARGET expected child document receipt'
);

// LIST must also be scoped to the exact top document/session, not tabId alone.
must(
  worker,
  /WEBCLIP_FRAME_AGENT_LIST[\s\S]{0,1800}sender[^\n]{0,160}documentId/,
  'LIST top sender.documentId admission'
);
must(
  worker,
  /(topDocumentId|topSessionId|frameAgentSession|frameSessionReceipt)/,
  'worker-owned top-document frame session authority'
);

// The worker must compare expected child document identity before transport.
must(
  worker,
  /(expectedChildDocumentId|childDocumentId|frameAgentReceipt)[\s\S]{0,1600}(record|registered)[\s\S]{0,800}documentId/,
  'pre-transport expected-vs-registered child document comparison'
);

// Actual Chrome delivery must be document-targeted. FrameId-only transport is not sufficient.
must(
  worker,
  /(tabs\.sendMessage|sendTabMessageBounded)[\s\S]{0,1400}\{[\s\S]{0,300}(documentId|documentIds)[\s\S]{0,300}\}/,
  'document-targeted child transport'
);

// Stale/missing document must fail closed and require resync, with no silent frameId fallback.
must(
  worker,
  /(FRAME_AGENT_(STALE|DOCUMENT|SESSION)|stale[-_ ]?(child|frame|document)|document[-_ ]?mismatch|resync)/i,
  'explicit stale-document/session failure path'
);

console.log('P1-171 frame registry document-generation source gate: PASS');
