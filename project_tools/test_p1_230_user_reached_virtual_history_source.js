'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const top = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const remote = fs.readFileSync(path.join(__dirname, '..', 'frame-agent.js'), 'utf8');
const hasTop = (re) => re.test(top);

assert(hasTop(/addListenersToDocument\s*\(/), 'missing document listener owner');
assert(hasTop(/addEventListener\(['"]scroll['"]/), 'missing current scroll observation surface');
assert(hasTop(/prepareForPrint\s*\(/), 'missing current print preparation');
assert(hasTop(/scrollIntoView/), 'missing known UI-only scroll positive control');

assert(hasTop(/userReached|reachedBoundary|maxUserScroll|scrollHistory|virtualHistory|materializedHistory/i),
  'P1-230: top has no explicit user-reached boundary/history state');
assert(hasTop(/captureSessionGeneration|selectionSessionGeneration|userReachedGeneration|historyGeneration/i),
  'P1-230: user-reached history is not bound to an explicit capture/selection generation');
assert(hasTop(/wheel|touchmove|pointer|PageDown|ArrowDown|isTrusted|userScrollGesture/i),
  'P1-230: source has no explicit user-scroll authority input distinct from arbitrary scroll movement');
assert(hasTop(/MutationObserver|materialized[A-Za-z]*History|capture[A-Za-z]*Materialized|observe[A-Za-z]*Materialized/i),
  'P1-230: source has no live materialization/history capture mechanism for recycled virtual content');
assert(hasTop(/MAX_[A-Z_]*(HISTORY|USER_REACHED|MATERIALIZED|VIRTUAL)|USER_REACHED_[A-Z_]*(MAX|BUDGET)|HISTORY_[A-Z_]*(MAX|BUDGET)/),
  'P1-230: retained dynamic history lacks explicit node/text/byte/time bounds');
assert(hasTop(/partial|degraded|unknown/),
  'P1-230: source lacks truthful incomplete-history outcome semantics');
assert(hasTop(/historyProxy|userReachedRepresentation|materializedRepresentation|restoreUserReached|buildUserReached/i),
  'P1-230: print preparation does not consume/reconstruct admitted user-reached history');

assert(!/maxUser[A-Za-z]*\s*=\s*(?:Math\.max\([^)]*,\s*)?(?:window\.|document\.[A-Za-z.]*|[A-Za-z0-9_]+)\.scrollTop\s*\)?\s*;/.test(top),
  'P1-230: user boundary appears to be inferred from current scrollTop alone');

assert(/userReached|scrollHistory|virtualHistory|materializedHistory|historyUnavailable|historyDegraded/i.test(remote),
  'P1-230: frame-agent has neither user-reached history parity nor explicit degraded/unavailable truth');
assert(/partial|degraded|unknown|historyUnavailable/i.test(remote),
  'P1-230: frame-agent cannot truthfully report incomplete user-reached history');

console.log('P1-230 user-reached dynamic/virtualized history source gate: PASS');
