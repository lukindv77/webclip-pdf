#!/usr/bin/env python3
"""Current-Chrome closure harness for P0-045 Incognito contextual authority."""
from __future__ import annotations

import argparse
import contextlib
import json
import pathlib
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PRIVATE_BACKUP_TEXT = "Приватный режим · статус резервной копии скрыт."
NORMAL_HISTORY_MARKER = "P0_045_NORMAL_HISTORY_MARKER"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, _format: str, *args: object) -> None:
        return

    def do_GET(self) -> None:  # noqa: N802
        body = b"<!doctype html><meta charset='utf-8'><title>P0-045 fixture</title><main><h1>P0-045 fixture</h1><p>Incognito contextual authority physical control.</p></main>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


@contextlib.contextmanager
def fixture_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/page"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def wait_until(fn, label: str, timeout: float = 20.0, interval: float = 0.1):
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            value = fn()
            if value:
                return value
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(interval)
    if last_error:
        raise AssertionError(f"{label} timed out: {last_error}") from last_error
    raise AssertionError(f"{label} timed out")


def launch_chrome(chrome: pathlib.Path, profile: pathlib.Path) -> subprocess.Popen:
    args = [
        str(chrome),
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--enable-unsafe-extension-debugging",
        "--remote-debugging-port=0",
        f"--user-data-dir={profile}",
        "about:blank",
    ]
    return subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def devtools_endpoint(profile: pathlib.Path) -> str:
    active = profile / "DevToolsActivePort"
    wait_until(active.exists, "DevToolsActivePort", timeout=15)
    lines = active.read_text(encoding="utf-8").splitlines()
    assert lines and lines[0].isdigit(), f"unexpected DevToolsActivePort: {lines!r}"
    return f"http://127.0.0.1:{lines[0]}"


def page_target_id(cdp, url: str) -> str:
    def find():
        for info in cdp.send("Target.getTargets").get("targetInfos", []):
            if info.get("type") == "page" and info.get("url") == url:
                return info.get("targetId")
        return ""
    return wait_until(find, f"target id for {url}")


def popup_page(context, extension_id: str):
    prefix = f"chrome-extension://{extension_id}/popup.html"
    return wait_until(
        lambda: next((page for page in context.pages if page.url.startswith(prefix)), None),
        "extension action popup",
        timeout=15,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    chrome = pathlib.Path(args.chrome).resolve()
    output = pathlib.Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    assert chrome.is_file(), chrome
    assert (ROOT / "manifest.json").is_file(), ROOT

    with fixture_server() as base_url, tempfile.TemporaryDirectory(prefix="webclip-p0-045-profile-") as td:
        profile = pathlib.Path(td)
        proc = launch_chrome(chrome, profile)
        try:
            endpoint = devtools_endpoint(profile)
            with sync_playwright() as pw:
                browser = pw.chromium.connect_over_cdp(endpoint)
                assert browser.contexts, "default Chrome context missing"
                normal_context = browser.contexts[0]
                cdp = browser.new_browser_cdp_session()
                loaded = cdp.send("Extensions.loadUnpacked", {
                    "path": str(ROOT),
                    "enableInIncognito": True,
                })
                extension_id = str(loaded.get("id") or "")
                assert len(extension_id) == 32, loaded

                normal_url = base_url + "?ctx=normal"
                private_url = base_url + "?ctx=private"
                normal_page = normal_context.new_page()
                normal_page.goto(normal_url, wait_until="load")

                worker = wait_until(
                    lambda: next((w for w in normal_context.service_workers if w.url.startswith(f"chrome-extension://{extension_id}/")), None),
                    "production extension service worker",
                    timeout=20,
                )
                allowed_incognito = worker.evaluate("async () => await chrome.extension.isAllowedIncognitoAccess()")
                assert allowed_incognito is True, "extension must be physically enabled in Incognito"

                private_created = worker.evaluate("""async (url) => {
                  const win = await chrome.windows.create({url, incognito:true, focused:true});
                  const tabs = await chrome.tabs.query({windowId:win.id});
                  const tab = tabs.find((item) => item.url === url) || tabs[0] || null;
                  return {windowId:win.id, tab};
                }""", private_url)
                private_tab = private_created.get("tab") if isinstance(private_created, dict) else None
                assert private_tab and private_tab.get("incognito") is True, private_created

                private_page = wait_until(
                    lambda: next((page for ctx in browser.contexts for page in ctx.pages if page.url == private_url), None),
                    "real Chrome Incognito page target",
                    timeout=20,
                )
                private_context = private_page.context

                tabs = worker.evaluate("async () => await chrome.tabs.query({})")
                regular_tab = next((tab for tab in tabs if tab.get("url") == normal_url), None)
                assert regular_tab and regular_tab.get("incognito") is False, tabs
                private_fresh = worker.evaluate("async (id) => await chrome.tabs.get(id)", private_tab["id"])
                assert private_fresh.get("incognito") is True and private_fresh.get("url") == private_url, private_fresh
                private_tab = private_fresh

                worker.evaluate(f"""() => {{
                  globalThis.__p0045 = {{ journalReads: 0, backupReads: 0, frameExecs: 0, actionColors: [] }};
                  const originalIconFactory = makeActionIconImageData;
                  makeActionIconImageData = function(size, color) {{
                    globalThis.__p0045.actionColors.push(String(color));
                    return originalIconFactory(size, color);
                  }};
                  getJournalSummaryForUrl = async function(_url) {{
                    globalThis.__p0045.journalReads += 1;
                    return {{ uniqueDays: 7, lastSavedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 }};
                  }};
                  getJournalBackupStatus = async function() {{
                    globalThis.__p0045.backupReads += 1;
                    return {{
                      ok: true,
                      enabled: true,
                      intervalMinutes: 60,
                      retryMinutes: 15,
                      lastBackgroundSuccessAt: Date.now() - 1000,
                      lastBackgroundFailureAt: Date.now() - 2000,
                      lastBackgroundError: {json.dumps(NORMAL_HISTORY_MARKER)},
                      hasCurrentProblem: true,
                      rootPath: '/P0_045_NORMAL_ROOT',
                      folderPath: '/P0_045_NORMAL_ROOT/Backup',
                      remotePath: '/P0_045_NORMAL_ROOT/Backup/history.json'
                    }};
                  }};
                  const originalExecute = executeScriptSingletonBounded;
                  executeScriptSingletonBounded = async function(details, options) {{
                    if (String(options?.requestKey || '').startsWith('frame-agent:')) {{
                      globalThis.__p0045.frameExecs += 1;
                      return [];
                    }}
                    return originalExecute(details, options);
                  }};
                  return true;
                }}""")

                regular_action = worker.evaluate("""async (tabId) => {
                  globalThis.__p0045.actionColors = [];
                  await updateActionForTab(tabId, 'https://stale.invalid/');
                  return {
                    badge: await chrome.action.getBadgeText({tabId}),
                    title: await chrome.action.getTitle({tabId}),
                    colors: [...globalThis.__p0045.actionColors],
                    journalReads: globalThis.__p0045.journalReads
                  };
                }""", regular_tab["id"])
                assert regular_action["badge"] == "7", regular_action
                assert "Дней с записями журнала: 7" in regular_action["title"], regular_action
                assert regular_action["journalReads"] == 1, regular_action
                assert any(color != "#5f6368" for color in regular_action["colors"]), regular_action

                private_action = worker.evaluate("""async (tabId) => {
                  globalThis.__p0045.actionColors = [];
                  const before = globalThis.__p0045.journalReads;
                  await updateActionForTab(tabId, 'https://must-not-be-used.invalid/');
                  return {
                    badge: await chrome.action.getBadgeText({tabId}),
                    title: await chrome.action.getTitle({tabId}),
                    colors: [...globalThis.__p0045.actionColors],
                    journalReadsBefore: before,
                    journalReadsAfter: globalThis.__p0045.journalReads
                  };
                }""", private_tab["id"])
                assert private_action["badge"] == "", private_action
                assert private_action["title"] == "WebClip PDF", private_action
                assert private_action["journalReadsAfter"] == private_action["journalReadsBefore"], private_action
                assert private_action["colors"] == ["#5f6368", "#5f6368"], private_action

                private_frame = worker.evaluate("""async (tabId) => {
                  const before = globalThis.__p0045.frameExecs;
                  try {
                    await enableFrameAgentsForTab(tabId);
                    return {ok:true,before,after:globalThis.__p0045.frameExecs};
                  } catch (error) {
                    return {ok:false,code:error?.code || '',message:error?.message || '',before,after:globalThis.__p0045.frameExecs};
                  }
                }""", private_tab["id"])
                assert private_frame["ok"] is False, private_frame
                assert private_frame["code"] == "WEBCLIP_PRIVATE_CONTEXT_BLOCKED", private_frame
                assert private_frame["after"] == private_frame["before"], private_frame

                regular_frame = worker.evaluate("""async (tabId) => {
                  const before = globalThis.__p0045.frameExecs;
                  const result = await enableFrameAgentsForTab(tabId);
                  return {result,before,after:globalThis.__p0045.frameExecs};
                }""", regular_tab["id"])
                assert regular_frame["after"] == regular_frame["before"] + 1, regular_frame

                private_target = page_target_id(cdp, private_url)
                cdp.send("Extensions.triggerAction", {"id": extension_id, "targetId": private_target})
                private_popup = popup_page(private_context, extension_id)
                private_popup.wait_for_load_state("domcontentloaded")
                private_popup.wait_for_function(
                    f"document.getElementById('backupState')?.textContent === {json.dumps(PRIVATE_BACKUP_TEXT)}"
                )
                private_popup_state = private_popup.evaluate("""() => ({
                  backupState: document.getElementById('backupState')?.textContent || '',
                  lastSuccess: document.getElementById('backupLastSuccess')?.textContent || '',
                  lastFailure: document.getElementById('backupLastFailure')?.textContent || '',
                  error: document.getElementById('backupError')?.textContent || ''
                })""")
                assert private_popup_state == {
                    "backupState": PRIVATE_BACKUP_TEXT,
                    "lastSuccess": "скрыто",
                    "lastFailure": "скрыто",
                    "error": "",
                }, private_popup_state
                backup_reads_after_private = worker.evaluate("() => globalThis.__p0045.backupReads")
                assert backup_reads_after_private == 0, backup_reads_after_private

                permission_hooked = private_popup.evaluate("""() => {
                  globalThis.__p0045PermissionCalls = 0;
                  const wrapped = async () => { globalThis.__p0045PermissionCalls += 1; return false; };
                  try { chrome.permissions.request = wrapped; } catch (_) { return false; }
                  return chrome.permissions.request === wrapped;
                }""")
                assert permission_hooked is True, "permission observation hook unavailable"
                private_popup.locator("#grantFrameAccess").click()
                private_popup.wait_for_function("document.getElementById('status')?.textContent.includes('инкогнито')")
                assert private_popup.evaluate("() => globalThis.__p0045PermissionCalls") == 0

                frame_before_start = worker.evaluate("() => globalThis.__p0045.frameExecs")
                private_popup.locator("#start").click()
                wait_until(lambda: private_page.locator("#webclip-pdf-extension-root").count() == 1, "private top-page selection UI", timeout=15)
                frame_after_start = worker.evaluate("() => globalThis.__p0045.frameExecs")
                assert frame_after_start == frame_before_start, (frame_before_start, frame_after_start)

                normal_target = page_target_id(cdp, normal_url)
                cdp.send("Extensions.triggerAction", {"id": extension_id, "targetId": normal_target})
                normal_popup = popup_page(normal_context, extension_id)
                normal_popup.wait_for_load_state("domcontentloaded")
                normal_popup.wait_for_function(
                    f"document.getElementById('backupError')?.textContent === {json.dumps(NORMAL_HISTORY_MARKER)}"
                )
                backup_reads_after_normal = worker.evaluate("() => globalThis.__p0045.backupReads")
                assert backup_reads_after_normal == 1, backup_reads_after_normal

                result = {
                    "ok": True,
                    "chrome": subprocess.check_output([str(chrome), "--version"], text=True).strip(),
                    "extensionId": extension_id,
                    "incognitoAllowed": allowed_incognito,
                    "regularTab": {"id": regular_tab["id"], "incognito": regular_tab["incognito"]},
                    "privateTab": {"id": private_tab["id"], "incognito": private_tab["incognito"]},
                    "regularAction": regular_action,
                    "privateAction": private_action,
                    "privateFrame": private_frame,
                    "regularFrame": regular_frame,
                    "privatePopup": private_popup_state,
                    "backupReadsAfterPrivate": backup_reads_after_private,
                    "backupReadsAfterNormal": backup_reads_after_normal,
                    "privateStartFrameExecsBefore": frame_before_start,
                    "privateStartFrameExecsAfter": frame_after_start,
                }
                (output / "p0-045-result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(json.dumps(result, ensure_ascii=False))
                browser.close()
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
            stderr = proc.stderr.read() if proc.stderr else ""
            if proc.returncode not in (0, None, -15) and stderr:
                print(stderr[-4000:])


if __name__ == "__main__":
    main()
