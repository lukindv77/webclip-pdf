'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const has = (re) => re.test(source);

// Existing positive/current boundaries.
assert(has(/overflowX/), 'missing overflowX visibility/diagnostic surface');
assert(has(/overflowY/), 'missing overflowY visibility/diagnostic surface');
assert(has(/position[^\n]*static|setProperty\(['"]position['"],\s*['"]static['"]/), 'missing existing static-position print normalization surface');
assert(has(/overflow[^\n]*visible|setProperty\(['"]overflow['"],\s*['"]visible['"]/), 'missing existing overflow normalization surface');

// PD7/C20/P0-004 production closure requirements: selected scrollports must be
// classified per axis rather than by one generic "has scrolling ancestor" bit.
assert(
  has(/singleAxisScroll|scrollContainerAxes|scrollAxes|overflowAxes|isScrollContainerForAxis|scrollableAxis/i),
  'PD7: no explicit per-axis scroll-container classification in production source'
);
assert(
  has(/normalizeSelectedScroll|staticizeSelectedScroll|expandSelectedScroll|selectedScrollport|selectedScrollContainer/i),
  'PD7/C20: no explicit selected nested-scroll staticization path'
);
assert(
  has(/position\s*===\s*['"]sticky['"]|style\.position\s*===\s*['"]sticky['"]|normalize[A-Za-z]*Sticky|staticize[A-Za-z]*Sticky/i),
  'PD7/C31: no explicit sticky normalization/admission path for selected top-document content'
);
assert(
  has(/scrollAxis|axis\s*:\s*['"][xy]['"]|userReached.*[xy]|scrollContext.*axis/i),
  'PD7/P1-230: user-reached scroll-context identity is not visibly axis-qualified'
);
assert(
  has(/CSS\.supports\([^\n]*single-axis-scroll-container|named-feature\(single-axis-scroll-container\)|singleAxisScrollContainer/i),
  'PD7: source has no feature/semantic receipt for the stable single-axis scroll-container behavior'
);

console.log('PD7 single-axis scroll container source gate: PASS');
