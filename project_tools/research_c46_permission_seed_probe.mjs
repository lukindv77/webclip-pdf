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

async function getId(browser) {
  const target = await bounded(browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/service-worker.js'), { timeout: 30000 }), 35000, 'worker');
  return new URL(target.url()).host;
}

async function freshContains(browser, id) {
  const page = await browser.newPage();
  try {
    await page.goto(`chrome-extension://${id}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return await page.evaluate((p) => chrome.permissions.contains({ origins: [p] }), CHILD);
  } finally {
    try { await page.close(); } catch {}
  }
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

async function attempt(browser, id, keys, attempt) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${id}/probe.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.bringToFront();
  log('request-click', { attempt, keys });
  await page.click('#grant');
  await sleep(800);
  const active = xdotool(['getactivewindow'], true);
  if (active) {
    xdotool(['getwindowname', active], true);
    xdotool(['getwindowgeometry', '--shell', active], true);
  }
  xdotool(['key', '--clearmodifiers', ...keys]);
  await sleep(1800);
  const granted = await freshContains(browser, id);
  log('request-result', { attempt, keys, granted });
  try { await page.close(); } catch {}
  return granted;
}

const temp = makeTemp();
let browser = null;
try {
  browser = await launch(temp);
  const id = await getId(browser);
  const browserVersion = await browser.version();
  const version = MANIFEST.version;
  assert.equal(await freshContains(browser, id), false);
  log('ready', { id, browserVersion, version });

  const sequences = [
    ['Return'],
    ['Tab', 'Return'],
    ['Tab', 'Tab', 'Return'],
    ['Right', 'Return'],
    ['Left', 'Return']
  ];
  let accepted = false;
  let acceptedSequence = null;
  for (let i = 0; i < sequences.length && !accepted; i += 1) {
    accepted = await attempt(browser, id, sequences[i], i + 1);
    if (accepted) acceptedSequence = sequences[i];
  }

  console.log('C46_PERMISSION_PROMPT_SEED_JSON=' + JSON.stringify({
    browserVersion,
    manifestVersion: version,
    extensionId: id,
    accepted,
    acceptedSequence
  }));
  assert.equal(accepted, true, 'Could not seed first optional host grant through native prompt keyboard driver');
} finally {
  try { if (browser) await bounded(browser.close(), 10000, 'close'); } catch { try { browser?.process()?.kill('SIGKILL'); } catch {} }
  try { fs.rmSync(temp.root, { recursive: true, force: true }); } catch {}
}
