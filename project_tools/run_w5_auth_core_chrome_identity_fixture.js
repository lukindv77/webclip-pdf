'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const chrome = process.env.CHROME_BIN;
if (!chrome || !fs.existsSync(chrome)) throw new Error('CHROME_BIN must point to Chrome for Testing');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let reportResolve;
  let reportReject;
  const reportPromise = new Promise((resolve, reject) => { reportResolve = resolve; reportReject = reject; });
  let server;
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/auth') {
      const redirect = url.searchParams.get('redirect') || '';
      const state = url.searchParams.get('state') || '';
      if (!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/w5-yandex-oauth$/.test(redirect)) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('bad redirect');
        return;
      }
      const finalUrl = new URL(redirect);
      finalUrl.searchParams.set('code', 'W5-CODE-153');
      finalUrl.searchParams.set('state', state);
      res.writeHead(302, { Location: finalUrl.toString(), 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    if (url.pathname === '/report' && req.method === 'POST') {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { body += chunk; if (body.length > 64 * 1024) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          reportResolve(parsed);
          res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
          res.end('{"ok":true}');
        } catch (error) {
          reportReject(error);
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end('bad report');
        }
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end('<!doctype html><title>W5 identity fixture</title>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-w5-identity-'));
  const ext = path.join(root, 'extension');
  const profile = path.join(root, 'profile');
  fs.mkdirSync(ext, { recursive: true });
  fs.mkdirSync(profile, { recursive: true });

  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'WebClip W5 identity fixture',
    version: '1.0.0',
    permissions: ['identity'],
    host_permissions: [`http://127.0.0.1:${port}/*`],
    background: { service_worker: 'worker.js' }
  }, null, 2));

  const worker = `
'use strict';
const PORT = ${port};
async function run() {
  const redirect = chrome.identity.getRedirectURL('w5-yandex-oauth');
  const state = 'w5-state-153';
  const start = new URL('http://127.0.0.1:' + PORT + '/auth');
  start.searchParams.set('redirect', redirect);
  start.searchParams.set('state', state);
  let finalUrl = '';
  let error = '';
  try {
    finalUrl = await chrome.identity.launchWebAuthFlow({ url: start.toString(), interactive: false });
  } catch (e) {
    error = String(e && e.message || e || 'launch failed');
  }
  let parsed = null;
  try {
    const u = new URL(finalUrl || 'about:blank');
    parsed = { origin: u.origin, pathname: u.pathname, code: u.searchParams.get('code') || '', state: u.searchParams.get('state') || '' };
  } catch (_) {}
  await fetch('http://127.0.0.1:' + PORT + '/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ redirect, finalUrl, parsed, state, error })
  });
}
chrome.runtime.onInstalled.addListener(() => { void run(); });
`;
  fs.writeFileSync(path.join(ext, 'worker.js'), worker);

  const args = [
    '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-default-apps',
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${ext}`,
    `--load-extension=${ext}`,
    'about:blank'
  ];
  const proc = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`identity fixture timeout; chrome stderr=${stderr.slice(-3000)}`)), 30000));
    const report = await Promise.race([reportPromise, timeout]);
    if (report.error) throw new Error(`launchWebAuthFlow failed: ${report.error}`);
    if (!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/w5-yandex-oauth$/.test(report.redirect || '')) throw new Error(`unexpected redirect URL: ${report.redirect}`);
    if (report.parsed?.origin !== new URL(report.redirect).origin) throw new Error('final origin mismatch');
    if (report.parsed?.pathname !== '/w5-yandex-oauth') throw new Error(`final path mismatch: ${report.parsed?.pathname}`);
    if (report.parsed?.code !== 'W5-CODE-153') throw new Error(`code mismatch: ${report.parsed?.code}`);
    if (report.parsed?.state !== report.state) throw new Error(`state mismatch: ${report.parsed?.state}`);
    console.log('W5 AUTH-CORE Chrome identity fixture: PASS; cases=5');
    console.log(`PASS redirect=${report.redirect}`);
    console.log('PASS launchWebAuthFlow captured provider redirect');
    console.log('PASS exact redirect origin/path');
    console.log('PASS code returned in final redirect');
    console.log('PASS state round-tripped in final redirect');
  } finally {
    try { proc.kill('SIGKILL'); } catch (_) {}
    try { server.close(); } catch (_) {}
    await sleep(100);
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exit(1); });
