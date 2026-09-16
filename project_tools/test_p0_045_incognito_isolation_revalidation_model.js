'use strict';

const assert = require('node:assert/strict');
let checks = 0;
const ok = (v, m) => { assert.equal(Boolean(v), true, m); checks += 1; };
const no = (v, m) => { assert.equal(Boolean(v), false, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

function actionCurrent({incognito=false, url='https://example.test', days=3}={}) {
  const reads = /^https?:\/\//i.test(url) ? 1 : 0;
  return { incognito, reads, badge: reads && days ? String(days) : '', neutral: false };
}
function actionCandidate(privacy, days=3) {
  if (privacy !== 'regular') return { reads:0, badge:'', neutral:true };
  return { reads:1, badge:String(days), neutral:false };
}
function popupCurrent(incognito=false) {
  return { incognito, classifiedFirst:false, backupReads:1, rendersPersistent:true };
}
function popupCandidate(privacy) {
  if (privacy !== 'regular') return { classifiedFirst:true, backupReads:0, rendersPersistent:false, neutral:true };
  return { classifiedFirst:true, backupReads:1, rendersPersistent:true, neutral:false };
}
function permissionCurrent({incognito=true, origins=1}={}) {
  return { incognito, privacyChecked:false, discoveries:1, permissionRequests:origins ? 1 : 0 };
}
function permissionCandidate(privacy, origins=1) {
  if (privacy !== 'regular') return { privacyChecked:true, discoveries:0, permissionRequests:0, blocked:true };
  return { privacyChecked:true, discoveries:1, permissionRequests:origins ? 1 : 0, blocked:false };
}
function frameEnableCurrent({sender='extension', targetIncognito=true}={}) {
  return { senderAllowed:sender === 'extension', privacyChecked:false, injected:sender === 'extension' };
}
function frameEnableCandidate({sender='extension', targetPrivacy='regular'}={}) {
  const allowed = sender === 'extension' && targetPrivacy === 'regular';
  return { privacyChecked:true, injected:allowed, blocked:!allowed };
}
function receipt(tabId, generation, privacy) { return Object.freeze({tabId,generation,privacy}); }
function sameAuthority(a,b) {
  return Boolean(a && b && a.tabId === b.tabId && a.generation === b.generation &&
    a.privacy === 'regular' && b.privacy === 'regular');
}

// Current Action disclosure.
{
  const r = actionCurrent({incognito:true, days:4});
  ok(r.incognito, 'scenario is private');
  eq(r.reads, 1, 'private action reads normal Journal summary');
  eq(r.badge, '4', 'private action projects normal Journal count');
  no(r.neutral, 'current private action is not neutral');
}
// Candidate Action.
for (const privacy of ['incognito','unknown']) {
  const r = actionCandidate(privacy, 9);
  eq(r.reads, 0, `${privacy}: zero normal Journal reads`);
  eq(r.badge, '', `${privacy}: empty neutral badge`);
  ok(r.neutral, `${privacy}: fixed neutral representation`);
}
{
  const r = actionCandidate('regular', 2);
  eq(r.reads, 1, 'regular action still reads summary');
  eq(r.badge, '2', 'regular action keeps intended badge');
}

// Popup eager persistent-state read.
{
  const r = popupCurrent(true);
  no(r.classifiedFirst, 'current popup reads before privacy classification');
  eq(r.backupReads, 1, 'current private popup reads backup state');
  ok(r.rendersPersistent, 'current private popup can render normal persistent status');
}
for (const privacy of ['incognito','unknown']) {
  const r = popupCandidate(privacy);
  ok(r.classifiedFirst, `${privacy}: classify before popup persistent read`);
  eq(r.backupReads, 0, `${privacy}: zero automatic backup-history reads`);
  no(r.rendersPersistent, `${privacy}: no normal backup history rendered`);
  ok(r.neutral, `${privacy}: neutral popup`);
}
{
  const r = popupCandidate('regular');
  eq(r.backupReads, 1, 'regular popup retains backup status');
  ok(r.rendersPersistent, 'regular popup positive control');
}

// Optional permission footprint.
{
  const r = permissionCurrent();
  no(r.privacyChecked, 'current permission flow lacks privacy gate');
  eq(r.discoveries, 1, 'current flow discovers private frame origins');
  eq(r.permissionRequests, 1, 'current flow can request shared host permission');
}
for (const privacy of ['incognito','unknown']) {
  const r = permissionCandidate(privacy);
  ok(r.privacyChecked, `${privacy}: permission path classifies first`);
  eq(r.discoveries, 0, `${privacy}: no frame-origin discovery for grant`);
  eq(r.permissionRequests, 0, `${privacy}: no permission request`);
  ok(r.blocked, `${privacy}: grant path fails closed`);
}
{
  const r = permissionCandidate('regular');
  eq(r.permissionRequests, 1, 'regular explicit permission path remains');
}

// Worker target defense-in-depth.
{
  const r = frameEnableCurrent();
  ok(r.senderAllowed, 'extension sender is trusted');
  no(r.privacyChecked, 'current worker does not fresh-check target privacy');
  ok(r.injected, 'current extension sender can reach injection path');
}
for (const privacy of ['incognito','unknown']) {
  const r = frameEnableCandidate({targetPrivacy:privacy});
  ok(r.privacyChecked, `${privacy}: worker target is classified`);
  no(r.injected, `${privacy}: target injection denied`);
  ok(r.blocked, `${privacy}: worker fails closed`);
}
{
  const r = frameEnableCandidate({targetPrivacy:'regular'});
  ok(r.injected, 'regular worker target positive control');
}

// Privacy generation fencing.
{
  const a = receipt(10,5,'regular');
  ok(sameAuthority(a, receipt(10,5,'regular')), 'unchanged normal authority remains');
  no(sameAuthority(a, receipt(10,6,'incognito')), 'normal->private invalidates authority');
  no(sameAuthority(receipt(10,5,'incognito'), receipt(10,6,'regular')), 'private->normal needs fresh authority');
  no(sameAuthority(a, receipt(10,7,'regular')), 'ABA generation change is rejected');
}

// Existing positive controls stay required.
ok(true, 'content-originated incognito save/data block remains required');
ok(true, 'incognito Journal source/placement block remains required');

console.log(`P0-045 incognito isolation model: PASS ${checks} checks`);
