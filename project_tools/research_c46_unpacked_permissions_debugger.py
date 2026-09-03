#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
POPUP = (ROOT / 'popup.js').read_text(encoding='utf-8')
WORKER = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
FRAME_AGENT = (ROOT / 'frame-agent.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')

FIXTURE_TITLE = 'C46 real unpacked debugger fixture'
FIXTURE_MARKER = 'C46_REAL_UNPACKED_DEBUGGER_MARKER_4A7F'


def source_checks() -> dict:
    permissions = set(MANIFEST.get('permissions') or [])
    optional_hosts = set(MANIFEST.get('optional_host_permissions') or [])

    backup_call_idx = POPUP.find('loadBackupStatus();')
    active_tab_def_idx = POPUP.find('async function getActiveSourceTab')

    grant_idx = POPUP.find("grantFrameAccessButton?.addEventListener('click'")
    grant_block = POPUP[grant_idx:grant_idx + 12000] if grant_idx >= 0 else ''
    discovery_idx = grant_block.find('await collectCrossOriginFrameOrigins')
    permission_request_idx = grant_block.find('chrome.permissions.request')

    popup_timeout_match = re.search(r'POPUP_EXTENSION_API_TIMEOUT_MS\s*=\s*([0-9_]+)', POPUP)
    popup_timeout = int(popup_timeout_match.group(1).replace('_', '')) if popup_timeout_match else None

    checks = {
        'manifestDebuggerRequired': 'debugger' in permissions,
        'manifestOptionalHttpHost': 'http://*/*' in optional_hosts,
        'manifestOptionalHttpsHost': 'https://*/*' in optional_hosts,
        'manifestIncognitoKeyPresent': 'incognito' in MANIFEST,
        'popupBackupStatusBeforeActiveTabClassification': backup_call_idx >= 0 and active_tab_def_idx >= 0 and backup_call_idx < active_tab_def_idx,
        'popupPermissionRequestAfterAsyncDiscovery': discovery_idx >= 0 and permission_request_idx >= 0 and discovery_idx < permission_request_idx,
        'popupCallsChromePermissionsRequest': 'chrome.permissions.request' in POPUP,
        'popupExtensionApiTimeoutMs': popup_timeout,
        'contentSenderIncognitoGuardPresent': 'sender?.tab?.incognito' in WORKER,
        'permissionsOnRemovedListenerPresent': 'chrome.permissions.onRemoved' in WORKER,
        'frameAgentPermissionRecheckPresent': 'frameAgentHasGrantedHostPermission' in WORKER,
        'frameAgentMemoryRegistryPresent': 'frameAgentsByTab = new Map()' in WORKER,
        'frameAgentReinjectReregistersWithoutReset': '__WEBCLIP_FRAME_AGENT_LOADED__' in FRAME_AGENT and 'WEBCLIP_FRAME_AGENT_REGISTER' in FRAME_AGENT and FRAME_AGENT.find('__WEBCLIP_FRAME_AGENT_LOADED__') < FRAME_AGENT.find('const state ='),
        'debuggerActiveRegistryPresent': 'debuggerActiveTabs = new Set()' in WORKER,
        'debuggerLateAttachCleanupPresent': 'debuggerLateAttachCleanupByTab = new Map()' in WORKER,
        'debuggerPendingDetachPresent': 'debuggerPendingDetachByTab = new Map()' in WORKER,
        'debuggerActualSettlementTrackingPresent': 'debuggerPendingActualSettlements = new Set()' in WORKER,
        'boundedDebuggerAttachPresent': 'async function attachDebuggerBounded' in WORKER,
        'boundedDebuggerDetachPresent': 'async function detachDebuggerBounded' in WORKER,
        'physicalDebuggerPdfPathPresent': "chrome.debugger.sendCommand(debuggee, 'Page.printToPDF'" in WORKER,
        'debuggerFinallyDropsActiveTab': 'debuggerActiveTabs.delete(tabId)' in WORKER,
        'debuggerOnDetachHandlingPresent': 'debugger.onDetach' in WORKER,
    }

    required_true = [
        'manifestDebuggerRequired',
        'manifestOptionalHttpHost',
        'manifestOptionalHttpsHost',
        'popupBackupStatusBeforeActiveTabClassification',
        'popupPermissionRequestAfterAsyncDiscovery',
        'popupCallsChromePermissionsRequest',
        'contentSenderIncognitoGuardPresent',
        'frameAgentPermissionRecheckPresent',
        'frameAgentMemoryRegistryPresent',
        'frameAgentReinjectReregistersWithoutReset',
        'debuggerActiveRegistryPresent',
        'debuggerLateAttachCleanupPresent',
        'debuggerPendingDetachPresent',
        'debuggerActualSettlementTrackingPresent',
        'boundedDebuggerAttachPresent',
        'boundedDebuggerDetachPresent',
        'physicalDebuggerPdfPathPresent',
        'debuggerFinallyDropsActiveTab',
    ]
    for key in required_true:
        assert checks[key] is True, (key, checks)
    assert checks['manifestIncognitoKeyPresent'] is False, checks
    assert checks['permissionsOnRemovedListenerPresent'] is False, checks
    assert checks['debuggerOnDetachHandlingPresent'] is False, checks
    assert checks['popupExtensionApiTimeoutMs'] == 10_000, checks
    return checks


class C46Handler(BaseHTTPRequestHandler):
    report_event = threading.Event()
    report_payload: dict | None = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/fixture':
            body = (
                '<!doctype html><meta charset="utf-8">'
                f'<title>{FIXTURE_TITLE}</title>'
                f'<main><h1>{FIXTURE_MARKER}</h1><p>Production debugger path fixture.</p></main>'
            ).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == '/report':
            query = urllib.parse.parse_qs(parsed.query)
            raw = (query.get('data') or ['{}'])[0]
            try:
                type(self).report_payload = json.loads(raw)
            except Exception as exc:
                type(self).report_payload = {'ok': False, 'error': f'report-json:{exc}', 'raw': raw[:1000]}
            type(self).report_event.set()
            body = b'ok'
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_):
        pass


def browser_version(chrome: str) -> str:
    try:
        return subprocess.check_output([chrome, '--version'], text=True, stderr=subprocess.STDOUT, timeout=10).strip()
    except Exception:
        return ''


def js_driver(fixture_url: str, report_url: str) -> str:
    origin = urllib.parse.urlsplit(fixture_url)
    pattern = f'{origin.scheme}://{origin.hostname}:{origin.port}/*'
    return f'''

// C46 test-only driver appended to a temporary unpacked copy by the durable Python harness.
// It invokes production generatePdfBlob() unchanged and reports through a normal tab navigation.
(async () => {{
  const fixtureUrl = {json.dumps(fixture_url)};
  const reportBase = {json.dumps(report_url)};
  const optionalOrigin = {json.dumps(pattern)};
  const result = {{ ok: false, extensionId: chrome.runtime.id }};
  const report = async () => {{
    const data = encodeURIComponent(JSON.stringify(result));
    try {{
      const tabs = await chrome.tabs.query({{}});
      const tab = tabs.find((x) => Number(x.id) === Number(result.tabId)) || tabs[0];
      if (tab?.id) await chrome.tabs.update(tab.id, {{ url: `${{reportBase}}?data=${{data}}` }});
      else await chrome.tabs.create({{ url: `${{reportBase}}?data=${{data}}`, active: false }});
    }} catch (_) {{}}
  }};
  try {{
    result.incognitoAllowed = await chrome.extension.isAllowedIncognitoAccess();
    result.optionalOriginGrantedInitially = await chrome.permissions.contains({{ origins: [optionalOrigin] }});
    const tab = await chrome.tabs.create({{ url: fixtureUrl, active: false }});
    result.tabId = tab.id;
    await new Promise((resolve, reject) => {{
      const timer = setTimeout(() => {{ chrome.tabs.onUpdated.removeListener(listener); reject(new Error('fixture-load-timeout')); }}, 15000);
      const listener = (tabId, info) => {{
        if (tabId === tab.id && info.status === 'complete') {{ clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve(); }}
      }};
      chrome.tabs.onUpdated.addListener(listener);
    }});
    const before = (await chrome.debugger.getTargets()).find((x) => x.tabId === tab.id);
    result.debuggerAttachedBefore = Boolean(before?.attached);

    const pdfBlob = await generatePdfBlob(tab.id);
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    result.pdfBytes = bytes.byteLength;
    result.pdfSha256 = [...digest].map((x) => x.toString(16).padStart(2, '0')).join('');

    const after = (await chrome.debugger.getTargets()).find((x) => x.tabId === tab.id);
    result.debuggerAttachedAfter = Boolean(after?.attached);
    result.debuggerActiveSetAfter = debuggerActiveTabs.has(tab.id);
    result.debuggerLateAttachCleanupAfter = debuggerLateAttachCleanupByTab.has(tab.id);
    result.debuggerPendingDetachAfter = debuggerPendingDetachByTab.has(tab.id);
    result.debuggerPendingActualSettlementCountAfter = debuggerPendingActualSettlements.size;
    result.fixtureTitle = (await chrome.tabs.get(tab.id)).title || '';
    result.ok = true;
  }} catch (error) {{
    result.error = String(error?.stack || error?.message || error);
  }}
  await report();
}})();
'''


def run_real_unpacked(chrome: str, timeout_seconds: int = 45) -> dict:
    C46Handler.report_event.clear()
    C46Handler.report_payload = None
    server = ThreadingHTTPServer(('127.0.0.1', 0), C46Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    fixture_url = f'http://127.0.0.1:{port}/fixture'
    report_url = f'http://127.0.0.1:{port}/report'

    temp_root = pathlib.Path(tempfile.mkdtemp(prefix='webclip-c46-'))
    ext_root = temp_root / 'extension'
    profile = temp_root / 'profile'
    try:
        shutil.copytree(ROOT, ext_root, ignore=shutil.ignore_patterns('.git', '__pycache__', '*.pyc'))
        worker_path = ext_root / 'service-worker.js'
        worker_path.write_text(WORKER + js_driver(fixture_url, report_url), encoding='utf-8')

        cmd = [
            chrome,
            '--headless=new',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            f'--user-data-dir={profile}',
            f'--disable-extensions-except={ext_root}',
            f'--load-extension={ext_root}',
            'about:blank',
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            if not C46Handler.report_event.wait(timeout_seconds):
                stderr = ''
                if proc.poll() is not None:
                    try:
                        stderr = (proc.stderr.read() if proc.stderr else '')[-4000:]
                    except Exception:
                        pass
                raise AssertionError(f'C46 real-unpacked report timeout; chrome_rc={proc.poll()} stderr={stderr}')
            payload = C46Handler.report_payload or {}
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=5)

        assert payload.get('ok') is True, payload
        assert payload.get('debuggerAttachedBefore') is False, payload
        assert payload.get('debuggerAttachedAfter') is False, payload
        assert payload.get('debuggerActiveSetAfter') is False, payload
        assert payload.get('debuggerLateAttachCleanupAfter') is False, payload
        assert payload.get('debuggerPendingDetachAfter') is False, payload
        assert int(payload.get('debuggerPendingActualSettlementCountAfter') or 0) == 0, payload
        assert int(payload.get('pdfBytes') or 0) > 1000, payload
        assert re.fullmatch(r'[0-9a-f]{64}', str(payload.get('pdfSha256') or '')), payload
        assert payload.get('optionalOriginGrantedInitially') is False, payload
        return payload
    finally:
        server.shutdown()
        server.server_close()
        shutil.rmtree(temp_root, ignore_errors=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--chrome', default=CHROME_DEFAULT)
    ap.add_argument('--source-only', action='store_true')
    ap.add_argument('--source-baseline', default=os.environ.get('C46_SOURCE_BASELINE', ''))
    args = ap.parse_args()

    source = source_checks()
    browser = None
    if not args.source_only:
        if not args.chrome:
            raise SystemExit('Chrome unavailable; use --source-only for deterministic source checks')
        browser = run_real_unpacked(args.chrome)

    result = {
        'sourceBaseline': args.source_baseline,
        'browserVersion': browser_version(args.chrome) if args.chrome else '',
        'source': source,
        'realUnpacked': browser,
        'classification': (
            'L4 real-unpacked positive debugger/PDF lifecycle plus exact-source privacy/permission/revoke findings; '
            'interactive incognito toggle, native permission prompt, revoke/regrant UI and worker/browser restart remain L5 open'
            if browser else
            'L3 exact-source privacy/permission/revoke/debugger lifecycle evidence only'
        ),
    }
    canonical = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    result['resultSha256'] = hashlib.sha256(canonical).hexdigest()
    print('C46_RESULT_JSON=' + json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(',', ':')), flush=True)


if __name__ == '__main__':
    main()
