'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'journal.css'), 'utf8');

assert(js.includes("titleMeta.className = 'entry-title-meta';"), 'entry title metadata row must exist');
assert(js.includes('titleWrap.append(title, titleMeta);'), 'metadata row must be placed under title');
assert(js.includes('titleMeta.append(when, badges);'), 'date/time and badges must share the metadata row');
assert(js.includes('head.appendChild(titleWrap);'), 'entry head must contain the unified title wrapper');
assert(!js.includes('head.append(titleWrap, badges);'), 'badges must no longer live in the right upper entry-head block');
assert(css.includes('.entry-title-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; min-width: 0; }'), 'metadata row must align date left and badges right');
assert(css.includes('overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'), 'date/time must degrade predictably without overlapping fixed-size badges at narrow widths');
assert(css.includes('.entry-badges { display: flex; flex: 0 0 auto; flex-wrap: nowrap;'), 'badge group must keep its size and horizontal nowrap behavior');
assert(css.includes('margin-left: auto;'), 'badge group must be pushed right of date/time');

// P1-028 moves badges only; their established P1-025/P1-027 sizing/visual rules stay byte-for-byte stable.
assert(css.includes('.badge { flex: none; border-radius: 999px; padding: 5px 8px; font-size: 11px; font-weight: 700; }'), 'base badge dimensions must remain unchanged');
assert(css.includes('.badge.yandex { background: #fff4df; color: #8a5200; }'), 'Yandex badge visual rule must remain unchanged');
assert(css.includes('.badge.download { background: #f1f3f4; color: #3c4043; border: 1px solid #dadce0; }'), 'download badge visual rule must remain unchanged');
assert(css.includes('.badge-action { border: 0; font: inherit; line-height: normal; }'), 'Yandex action badge sizing semantics must remain unchanged');
assert(css.includes('.badge.read-later { background: #fce8e6; color: #b3261e; }'), 'read-later badge visual rule must remain unchanged');
assert(css.includes('.badge.read { background: #e6f4ea; color: #0d652d; }'), 'read badge visual rule must remain unchanged');

console.log(JSON.stringify({ok:true,p1:'P1-028',underTitle:true,sameDateRow:true,badgesRight:true,sizingRulesPreserved:true}));
