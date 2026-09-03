#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURRENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const CHILD = 'http://127.0.0.2/*';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (stage, data = {}) => console.log('C46_SEED_STAGE=' + JSON.stringify({ stage, at: Date.now(), ...data }));

async function bounded(promise, ms, label) {
  return Promise.race([
    Promise.resolve(promise),
    sleep(ms).then(() => { throw new Error(label + ' timeout'); })
  ]);
}

async function closeBrowser(browser, label) {
  if (!browser) return;
  const proc = browser.process();
  try {
    await bounded(browser.close(), 10000, label + ' browser.close');
    log(label + '-closed');
  } catch (error) {
    log(label + '-close-timeout', { error: String(error?.message || error) });
    try { proc?.kill('SIGKILL'); } catch {}
    await sleep(500);
  }
}

function makeTemp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c46-permission-seed-'));
  const ext = path.join(root, 'extension');
  const profile = path.join(root, 'profile');
  fs.cpSync(ROOT, ext, {
    recursive: true,
    filter(src) {
      const rel = path.relative(ROOT, src);
      if (!rel) return true;
      return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
    }
  });
  fs.mkdirSync(profile, { recursive: true });
  fs.writeFileSync(path.join(ext, 'probe.html'), '<!doctype html><meta charset="utf-8"><title>C46 permission probe</title>\n');
  return { root, ext, profile };
}

function writeManifest(ext, seed) {
  const manifest = structuredClone(CURRENT);
  if (seed) {
    manifest.version = '0.9.7';
    manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), CHILD])];
  }
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function launch(ext, profile, label) {
  log(label + '-launch-start');
  const browser = await bounded(puppeteer.launch({
    headless: false,
    pipe: false,
    userDataDir: profile,
    enableExtensions: [ext],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
  }), 40000, label + ' launch');
  log(label + '-launch-done', { version: await browser.version() });
  return browser;
}

async function extensionId(browser, label) {
  const target = await bounded(browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'), { timeout: 30000 }), 35000, label + ' worker');
  const id = new URL(target.url()).host;
  log(label + '-worker', { id });
  return id;
}

async function openProbe(browser, id, label) {
  const page = await bounded(browser.newPage(), 10000, label + ' newPage');
  await bounded(page.goto(`chrome-extension://${id}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 20000 }), 25000, label + ' goto probe');
  log(label + '-probe-open');
  return page;
}

async function contains(page) {
  return bounded(page.evaluate((p) => chrome.permissions.contains({ origins: [p] }), CHILD), 5000, 'permissions.contains');
}

async function openManager(browser) {
  const page = await bounded(browser.newPage(), 10000, 'manager newPage');
  await bounded(page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 20000 }), 25000, 'manager goto');
  const shape = await bounded(page.evaluate(() => ({
    remove: typeof chrome?.developerPrivate?.removeHostPermission,
    add: typeof chrome?.developerPrivate?.addHostPermission
  })), 5000, 'developerPrivate shape');
  log('manager-shape', shape);
  assert.equal(shape.remove, 'function');
  assert.equal(shape.add, 'function');
  return page;
}

async function hostPermission(manager, method, id) {
  await bounded(manager.evaluate(async ({ method, id, child }) => {
    await chrome.developerPrivate[method](id, child);
  }, { method, id, child: CHILD }), 10000, 'developerPrivate.' + method);
  log('manager-' + method + '-done');
}

async function waitContains(probe, expected, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      if (Boolean(await contains(probe)) === Boolean(expected)) return true;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await sleep(100);
  }
  throw new Error('permission did not become ' + expected + '; lastError=' + lastError);
}

const temp = makeTemp();
let browser = null;
try {
  writeManifest(temp.ext, true);
  browser = await launch(temp.ext, temp.profile, 'seed');
  const seedId = await extensionId(browser, 'seed');
  const seedProbe = await openProbe(browser, seedId, 'seed');
  const seedVersion = await seedProbe.evaluate(() => chrome.runtime.getManifest().version);
  const seedContains = await contains(seedProbe);
  log('seed-state', { seedVersion, seedContains });
  assert.equal(seedVersion, '0.9.7');
  assert.equal(seedContains, true);
  await closeBrowser(browser, 'seed');
  browser = null;

  writeManifest(temp.ext, false);
  browser = await launch(temp.ext, temp.profile, 'production');
  const id = await extensionId(browser, 'production');
  assert.equal(id, seedId);
  let probe = await openProbe(browser, id, 'production');
  const version = await probe.evaluate(() => chrome.runtime.getManifest().version);
  const beforeGrant = await contains(probe);
  log('production-state', { version, beforeGrant });
  assert.equal(version, CURRENT.version);
  assert.equal(beforeGrant, false);

  const manager = await openManager(browser);
  await hostPermission(manager, 'addHostPermission', id);
  await waitContains(probe, true);
  const afterManagerAdd = await contains(probe);
  log('after-manager-add', { afterManagerAdd });
  assert.equal(afterManagerAdd, true);

  await hostPermission(manager, 'removeHostPermission', id);
  await waitContains(probe, false);
  const afterManagerRemove = await contains(probe);
  log('after-manager-remove', { afterManagerRemove });
  assert.equal(afterManagerRemove, false);

  await hostPermission(manager, 'addHostPermission', id);
  await waitContains(probe, true);
  const afterManagerReAdd = await contains(probe);
  log('after-manager-readd', { afterManagerReAdd });
  assert.equal(afterManagerReAdd, true);

  console.log('C46_PERMISSION_SEED_JSON=' + JSON.stringify({
    browserVersion: await browser.version(),
    seedId,
    id,
    seedVersion,
    seedContains,
    version,
    beforeGrant,
    afterManagerAdd,
    afterManagerRemove,
    afterManagerReAdd
  }));
} finally {
  await closeBrowser(browser, 'final');
  try { fs.rmSync(temp.root, { recursive: true, force: true }); } catch {}
}
