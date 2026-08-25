'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const manifest = JSON.parse(read('manifest.json'));
assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '0.9.8');
assert.deepStrictEqual(manifest.optional_host_permissions, ['http://*/*', 'https://*/*']);

const popup = read('popup.js');
assert.match(popup, /MAX_FRAME_PERMISSION_ORIGINS_PER_REQUEST\s*=\s*16/);
assert.match(popup, /chrome\.permissions\.request\(\{ origins: permissionOrigins \}\)/);
assert.match(popup, /frameHostPermissionPattern/);
assert.match(popup, /WEBCLIP_ENABLE_FRAME_AGENTS/);
assert.match(popup, /frame-access-candidates/);

const sw = read('service-worker.js');
assert.match(sw, /FRAME_AGENT_MAX_PER_TAB\s*=\s*64/);
assert.match(sw, /chrome\.permissions\.contains\(\{ origins: \[pattern\] \}\)/);
assert.match(sw, /target:\s*\{ tabId: id, allFrames: true \}, files: \['frame-agent\.js'\]/);
assert.match(sw, /Number\(sender\?\.frameId \|\| 0\) <= 0/);
assert.match(sw, /Number\(sender\?\.frameId \|\| 0\) !== 0/);
assert.match(sw, /record\.documentId && senderDocumentId && record\.documentId !== senderDocumentId/);
assert.match(sw, /frameAgentsByTab\.delete\(Number\(tabId \|\| 0\)\)/);

const content = read('content.js');
assert.match(content, /collectCrossOriginFrameCandidates/);
assert.match(content, /if \(pool\.length !== 1\) return \{ remote: null, ambiguous: pool\.length > 1 \}/);
assert.match(content, /framePath: \[\.\.\.\(Array\.isArray\(remote\?\.prefix\)/);
assert.match(content, /prepareRemoteFramesForPrint/);
assert.match(content, /remoteBoundaryForLocator/);
assert.match(content, /WEBCLIP_REMOTE_FRAME_EVENT/);
assert.match(content, /WEBCLIP_FRAME_AGENT_TARGET/);

const agent = read('frame-agent.js');
assert.match(agent, /if \(window\.top === window\) return/);
assert.match(agent, /sender\?\.id!==chrome\.runtime\.id/);
assert.match(agent, /MAX_SELECTIONS = 250/);
assert.match(agent, /version:3/);
assert.match(agent, /prepare-print/);
assert.match(agent, /restore-print/);
assert.match(agent, /WEBCLIP_FRAME_AGENT_REGISTER/);

console.log('P1-004 cross-origin iframe permission/frame-agent source contract PASS');
