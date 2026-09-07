'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

const generation = /selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration/i;
const commandSeq = /selectionCommandSeq|remoteCommandSeq|commandSequence|commandSeq/i;
const stateRevision = /selectionStateRevision|remoteStateRevision|stateRevision/i;

// Positive controls that should survive the implementation.
requireSource(/remoteFrames\s*:\s*new\s+Map/.test(content), 'missing remote frame registry positive control');
requireSource(/documentId/.test(content) && /documentId/.test(worker), 'missing exact child-document identity positive control');
requireSource(/WEBCLIP_FRAME_AGENT_TARGET/.test(content) && /WEBCLIP_FRAME_AGENT_TARGET/.test(worker), 'missing remote target routing positive control');
requireSource(/WEBCLIP_FRAME_AGENT_STATE/.test(agent) && /WEBCLIP_FRAME_AGENT_STATE/.test(worker), 'missing child state event positive control');
requireSource(/FRAME_AGENT_COMMAND_TIMEOUT_MS/.test(worker), 'missing bounded command timeout positive control');

// Target 1: trusted top content owns an explicit selection-session generation.
requireSource(generation.test(content), 'content.js has no explicit selection-session generation');
requireSource(
  /startSelection[\s\S]{0,5000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)/i.test(content),
  'startSelection() does not visibly advance/adopt a new selection session generation'
);

// Target 2: commands inside one session have monotonic ordering distinct from the session generation.
requireSource(commandSeq.test(content), 'content.js has no remote selection command sequence');
requireSource(
  /targetRemoteFrame[\s\S]{0,7000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)[\s\S]{0,2500}(?:commandSeq|commandSequence)|targetRemoteFrame[\s\S]{0,7000}(?:commandSeq|commandSequence)[\s\S]{0,2500}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)/i.test(content),
  'targetRemoteFrame() does not transport both session generation and command ordering'
);

// Target 3: worker routing preserves ordering metadata end-to-end.
requireSource(
  /WEBCLIP_FRAME_AGENT_TARGET[\s\S]{0,10000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)/i.test(worker),
  'worker target route drops selection-session generation'
);
requireSource(
  /WEBCLIP_FRAME_AGENT_TARGET[\s\S]{0,10000}(?:commandSeq|commandSequence)/i.test(worker),
  'worker target route drops selection command sequence'
);

// Target 4: child agent owns session, command and state revision state.
requireSource(generation.test(agent), 'frame-agent has no selection-session generation state');
requireSource(commandSeq.test(agent), 'frame-agent has no applied/highest command sequence state');
requireSource(stateRevision.test(agent), 'frame-agent has no monotonic state revision');

// Target 5: child dispatch rejects stale session/command before mutation.
requireSource(
  /(?:stale|older|generation)[\s\S]{0,2500}(?:commandSeq|commandSequence)|(?:commandSeq|commandSequence)[\s\S]{0,2500}(?:stale|older|generation)/i.test(agent),
  'frame-agent lacks explicit stale session/command rejection'
);

// Target 6: state events echo exact session generation and state revision.
requireSource(
  /WEBCLIP_FRAME_AGENT_STATE[\s\S]{0,3000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)/i.test(agent),
  'frame-agent state events do not carry selection-session generation'
);
requireSource(
  /WEBCLIP_FRAME_AGENT_STATE[\s\S]{0,3000}(?:stateRevision|selectionStateRevision|remoteStateRevision)/i.test(agent),
  'frame-agent state events do not carry monotonic state revision'
);

// Target 7: worker state forwarding preserves session/revision metadata.
requireSource(
  /forwardFrameAgentState[\s\S]{0,10000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)/i.test(worker),
  'worker state forwarding drops selection-session generation'
);
requireSource(
  /forwardFrameAgentState[\s\S]{0,10000}(?:stateRevision|selectionStateRevision|remoteStateRevision)/i.test(worker),
  'worker state forwarding drops state revision'
);

// Target 8: top event acceptance is generation/revision fenced before replacing remote.snapshot.
requireSource(
  /handleRemoteFrameEvent[\s\S]{0,10000}(?:selectionSessionGeneration|remoteSelectionGeneration|selectionGeneration)[\s\S]{0,5000}(?:stateRevision|selectionStateRevision|remoteStateRevision)/i.test(content),
  'handleRemoteFrameEvent() does not visibly validate generation and revision'
);
requireSource(
  /handleRemoteFrameEvent[\s\S]{0,12000}(?:stale|older|revision|generation)[\s\S]{0,3000}remote\.snapshot\s*=/i.test(content),
  'remote snapshot publication is not visibly ordered after stale checks'
);

// Target 9: command/get-state responses are also fenced; events alone are not enough.
requireSource(
  /syncRemoteFrameAgents[\s\S]{0,16000}(?:stateRevision|selectionStateRevision|remoteStateRevision)/i.test(content),
  'sync/start command responses are not state-revision fenced'
);
requireSource(
  /applySelectionSnapshot[\s\S]{0,22000}(?:stateRevision|selectionStateRevision|remoteStateRevision)/i.test(content),
  'restore/get-state responses are not state-revision fenced'
);

// Target 10: new-session start/reset is one ordered child transition, not an unfenced clear + start pair.
requireSource(
  /start-session|selection-session-start|resetSession|openSelectionSession|beginSelectionSession/i.test(content + '\n' + agent),
  'missing explicit atomic new-selection-session start/reset transition'
);

// Target 11: stop/close leaves a fence so old commands/events cannot revive the session.
requireSource(
  /closedThroughSelection|closedSelectionGeneration|closeSelectionSession|selectionSessionClosed/i.test(agent),
  'frame-agent has no closed-session fence'
);

// Target 12: source states the trust/order rule explicitly enough to resist regression.
requireSource(
  /stale[^\n]{0,180}(?:state|command|response)[^\n]{0,180}(?:newer|session|revision)|(?:state|command|response)[^\n]{0,180}(?:must not|cannot)[^\n]{0,180}(?:newer|session)/i.test(content + '\n' + agent),
  'missing explicit rule that stale remote selection traffic cannot overwrite newer session state'
);

if (failures.length) {
  console.error('P1-200 remote selection session ordering source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-200 remote selection session ordering source gate: PASS');
