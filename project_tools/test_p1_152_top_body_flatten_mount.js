const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes("ownerDoc.body.appendChild(proxy);"), 'flatten proxy must mount directly under top document body');
assert(!content.includes('frame.parentNode.insertBefore(proxy, frame);'), 'flatten proxy must not remain inside source iframe shell');
assert(content.includes("!ownerDoc?.body"), 'flattening must fail closed when top body is unavailable');
assert(content.includes("mount: 'top-document-body'"), 'content diagnostics must record top-body mount');
assert(content.includes("mount: String(item?.mount || '').slice(0, 48)"), 'content diagnostics must bound mount');
assert(worker.includes("mount: pageDiagnosticString(item?.mount, 48)"), 'worker must allowlist/bound mount diagnostic');
assert(content.includes("frame.style.setProperty('display', 'none', 'important');"), 'original iframe must remain hidden during flattened print');
assert(content.includes('item?.proxy?.remove()'), 'temporary top-level proxies must be removed on rollback');
assert(content.includes('restoreFramePrintMutation(item);'), 'exact frame/ancestor rollback must remain intact');

console.log('P1-152 top-document flattened iframe proxy mount regression PASS');
