'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const frame = fs.readFileSync(path.join(__dirname, '..', 'frame-agent.js'), 'utf8');
const top = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');

const hasFrame = (re) => re.test(frame);
const hasTop = (re) => re.test(top);
const hasWorker = (re) => re.test(worker);

// Current positive/source-bound controls.
assert(hasFrame(/async function preparePrint\s*\(/), 'missing remote preparePrint');
assert(hasFrame(/resourceReport\s*=\s*await\s+prefetchSelected/), 'missing selected remote resource prefetch');
assert(hasTop(/prepareRemoteFramesForPrint\s*\(/), 'missing top remote prepare path');
assert(hasTop(/remote\.printHeight/), 'missing remote printHeight consumption');
assert(hasWorker(/Emulation\.setEmulatedMedia/), 'missing explicit PDF media policy');

// P1-229: a screen-emulated physical PDF must not depend on @media print-only
// WebClip filtering, and interactive screen selection decoration must be suppressed.
const prepareStart = frame.indexOf('async function preparePrint');
const restoreStart = frame.indexOf('function restorePrint', prepareStart);
assert(prepareStart >= 0 && restoreStart > prepareStart, 'cannot isolate remote preparePrint');
const prepareBody = frame.slice(prepareStart, restoreStart);

assert(
  /printRepresentation|PRINTING_ATTR|PRINT_REPRESENTATION|data-webclip-.*print|selectedOnly/.test(prepareBody),
  'P1-229: remote prepare lacks an explicit WebClip-owned selected-only representation state'
);
assert(
  !/@media\s+print\s*\{[\s\S]*body\s+\*:not\(/.test(prepareBody),
  'P1-229: remote selected-only filtering is still gated only by @media print'
);
assert(
  /decorationSuppressed|suppressSelectionDecoration|PRINTING_ATTR|printRepresentation/.test(frame),
  'P1-229: remote interactive selection decoration has no explicit physical-print suppression'
);

// Height must be read only after the selected-only representation has been installed/effective.
const heightIndex = prepareBody.search(/documentHeight\s*=/);
const representationInstallIndex = Math.max(
  prepareBody.search(/appendChild\(s\)/),
  prepareBody.search(/install[A-Za-z]*Print[A-Za-z]*Representation/),
  prepareBody.search(/apply[A-Za-z]*Selected[A-Za-z]*Representation/)
);
assert(heightIndex >= 0, 'P1-229: remote prepare does not return selected representation height');
assert(representationInstallIndex >= 0 && representationInstallIndex < heightIndex,
  'P1-229: remote documentHeight is still measured before selected-only representation is effective');

// Child response needs one explicit representation receipt rather than a naked height.
assert(
  /representationGeneration|printRepresentationGeneration|representationReceipt/.test(prepareBody),
  'P1-229: remote prepare response lacks a generation-bound representation receipt'
);
assert(
  /filterEffective|selectedOnlyEffective|representationEffective/.test(prepareBody),
  'P1-229: child receipt does not prove selected-only filtering is effective'
);
assert(
  /decorationSuppressed|selectionDecorationSuppressed/.test(prepareBody),
  'P1-229: child receipt does not prove interactive decoration is suppressed'
);
assert(
  /geometryFrom|selectedGeometry|representationHeight|documentHeight/.test(prepareBody),
  'P1-229: child receipt does not bind geometry to the effective representation'
);

// Top must validate/bind the child representation receipt instead of copying documentHeight blindly.
assert(
  /representationGeneration|printRepresentationGeneration|representationReceipt/.test(top),
  'P1-229: top has no remote representation generation/receipt binding'
);
assert(
  /filterEffective|selectedOnlyEffective|representationEffective/.test(top),
  'P1-229: top does not verify child selected-only representation effectiveness'
);
assert(
  /decorationSuppressed|selectionDecorationSuppressed/.test(top),
  'P1-229: top does not verify remote selection decoration suppression'
);

// Preserve the intentional anti-site-print positive control unless replaced by an explicit
// equivalent media contract. Merely dropping screen emulation is not accepted by this gate.
assert(
  /Emulation\.setEmulatedMedia[\s\S]{0,300}media\s*:\s*['"]screen['"]/.test(worker) ||
  /WEBCLIP_[A-Z_]*MEDIA_CONTRACT|pdfMediaContract|printMediaContract/.test(worker),
  'P1-229: worker lost the explicit anti-site-print media contract'
);

console.log('P1-229 remote-frame media/selected-geometry source gate: PASS');
