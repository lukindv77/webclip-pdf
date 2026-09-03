#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const CHILD = 'http://127.0.0.2/*';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (stage, data = {}) => console.log('C46_PROMPT_STAGE=' + JSON.stringify({ stage, at: Date.now(), ...data }));

async function bounded(promise, ms, label) {
  return Promise.race([
    Promise.resolve(promise),
    sleep(ms).then(() => { throw new Error(label + ' timeout'); })
  ]);
}

function makeTemp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c46-permission-prompt-'));
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
  fs.writeFileSync(path.join(ext, 'probe.html'), '<!doctype html><meta charset="utf-8"><title>C46 permission probe</title><button id="grant">Grant</button><script src="probe.js"></script>\n');
  fs.writeFileSync(path.join(ext, 'probe.js'), `const P=${JSON.stringify(CHILD)};document.getElementById('grant').addEventListener('click',async()=>{document.body.dataset.started=String(Date.now());try{const granted=await chrome.permissions.request({origins:[P]});document.body.dataset.granted=String(Boolean(granted));}catch(e){document.body.dataset.granted='error';document.body.dataset.error=String(e?.message||e)}finally{document.body.dataset.settled=String(Date.now())}});\n`);
  return { root, ext, profile };
}

async function launch(temp) {
  return bounded(puppeteer.launch({
    headless: false,
    pipe: false,
    userDataDir: temp.profile,
    enableExtensions: [temp.ext],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']
  }), 40000, 'launch');
}

async function getWorkerTarget(browser) {
  const target = browser.targets().find(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'));
  if (target) return target;
  return bounded(browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'), { timeout: 10000 }), 12000, 'worker');
}

async function getId(browser) {
  return new URL((await getWorkerTarget(browser)).url()).host;
}

async function workerContains(browser) {
  const deadline = Date.now() + 5000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const target = await getWorkerTarget(browser);
      const worker = await bounded(target.worker(), 3000, 'worker object');
      if (!worker) throw new Error('worker object unavailable');
      return await bounded(worker.evaluate((p) => chrome.permissions.contains({ origins: [p] }), CHILD), 3000, 'worker permissions.contains');
    } catch (error) {
      lastError = String(error?.message || error);
      await sleep(100);
    }
  }
  throw new Error('workerContains failed: ' + lastError);
}

function xdotool(args, allowFail = false) {
  try {
    const out = execFileSync('xdotool', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    log('xdotool', { args, out });
    return out;
  } catch (error) {
    const info = { args, status: error?.status, stdout: String(error?.stdout || ''), stderr: String(error?.stderr || '') };
    log('xdotool-error', info);
    if (!allowFail) throw error;
    return '';
  }
}

async function waitPermission(browser, expected, timeoutMs = 2200) {
  const deadline = Date.now() + timeoutMs;
  let observed = null;
  while (Date.now() < deadline) {
    try {
      observed = Boolean(await workerContains(browser));
      if (observed === Boolean(expected)) return true;
    } catch {}
    await sleep(100);
  }
  return false;
}

async function closePageBounded(page) {
  try { await bounded(page.close(), 3000, 'page close'); } catch {}
}

async function attempt(browser, id, keys, attemptNumber) {
  const page = await bounded(browser.newPage(), 5000, 'newPage');
  await bounded(page.goto(`chrome-extension://${id}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 10000 }), 12000, 'goto probe');
  await bounded(page.bringToFront(), 3000, 'bringToFront');
  log('request-click', { attempt: attemptNumber, keys });
  await bounded(page.click('#grant'), 3000, 'click grant');
  await sleep(800);

  const active = xdotool(['getactivewindow'], true);
  if (active) {
    xdotool(['getwindowname', active], true);
    xdotool(['getwindowgeometry', '--shell', active], true);
  }
  xdotool(['key', '--clearmodifiers', ...keys]);

  const granted = await waitPermission(browser, true, 2200);
  log('request-result', { attempt: attemptNumber, keys, granted });
  if (!granted) {
    xdotool(['key', '--clearmodifiers', 'Escape'], true);
    await sleep(500);
  }
  await closePageBounded(page);
  return granted;
}

const temp = makeTemp();
let browser = null;
try {
  browser = await launch(temp);
  const id = await getId(browser);
  const browserVersion = await browser.version();
  assert.equal(await workerContains(browser), false);
  log('ready', { id, browserVersion, manifestVersion: MANIFEST.version });

  const sequences = [
    ['Return'],
    ['Tab', 'Return'],
    ['Tab', 'Tab', 'Return'],
    ['Right', 'Return'],
    ['Left', 'Return'],
    ['space']
  ];
  let accepted = false;
  let acceptedSequence = null;
  for (let i = 0; i < sequences.length && !accepted; i += 1) {
    accepted = await attempt(browser, id, sequences[i], i + 1);
    if (accepted) acceptedSequence = sequences[i];
  }

  console.log('C46_PERMISSION_PROMPT_SEED_JSON=' + JSON.stringify({
    browserVersion,
    manifestVersion: MANIFEST.version,
    extensionId: id,
    accepted,
    acceptedSequence
  }));
  assert.equal(accepted, true, 'Could not seed first optional host grant through native prompt keyboard driver');
} finally {
  try { if (browser) await bounded(browser.close(), 10000, 'close'); } catch { try { browser?.process()?.kill('SIGKILL'); } catch {} }
  try { fs.rmSync(temp.root, { recursive: true, force: true }); } catch {}
}
