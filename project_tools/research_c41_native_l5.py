#!/usr/bin/env python3
"""C41 physical native Save As probe in a real unpacked Chrome under X11.

Research-only harness. It never patches production source and it refuses to call
this evidence L5 unless an actual native browser file chooser is observed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import time
from typing import Any

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser") or "",
)


def sh(*args: str, check: bool = True) -> str:
    proc = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
    if check and proc.returncode != 0:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stdout}")
    return proc.stdout.strip()


def window_snapshot() -> list[str]:
    text = sh("wmctrl", "-l", "-x", check=False)
    return [line.strip() for line in text.splitlines() if line.strip()]


def active_window() -> dict[str, str]:
    wid = sh("xdotool", "getactivewindow", check=False).strip()
    if not wid:
        return {"id": "", "name": "", "class": ""}
    name = sh("xdotool", "getwindowname", wid, check=False)
    klass = sh("xdotool", "getwindowclassname", wid, check=False)
    return {"id": wid, "name": name, "class": klass}


def wait_native_dialog(before: list[str], timeout: float = 12.0) -> dict[str, Any]:
    deadline = time.time() + timeout
    before_set = set(before)
    last = {"active": active_window(), "windows": window_snapshot(), "new": []}
    while time.time() < deadline:
        windows = window_snapshot()
        active = active_window()
        new = [line for line in windows if line not in before_set]
        blob = "\n".join(new + windows + [active.get("name", ""), active.get("class", "")]).lower()
        # Chromium/GTK titles vary by channel and locale. Require either a new
        # top-level window or a save/file-chooser semantic marker; do not infer
        # native UI merely from a pending extension promise.
        semantic = any(token in blob for token in ("save", "file chooser", "file picker", "сохран"))
        if new or semantic:
            return {"active": active, "windows": windows, "new": new, "semantic": semantic}
        last = {"active": active, "windows": windows, "new": new, "semantic": semantic}
        time.sleep(0.15)
    raise AssertionError(f"native Save As dialog was not observed; last={last}")


def press_key(key: str) -> None:
    sh("xdotool", "key", "--clearmodifiers", key)


def dialog_still_present(observed: dict[str, Any]) -> bool:
    current = window_snapshot()
    observed_new = set(observed.get("new") or [])
    if observed_new and observed_new.intersection(current):
        return True
    active = active_window()
    blob = (active.get("name", "") + " " + active.get("class", "")).lower()
    return any(token in blob for token in ("save", "file chooser", "file picker", "сохран"))


def wait_until(fn, timeout: float = 15.0, interval: float = 0.1, label: str = "condition"):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            last = fn()
            if last:
                return last
        except Exception as exc:  # evidence probe: preserve transient browser transitions
            last = repr(exc)
        time.sleep(interval)
    raise AssertionError(f"{label} timed out; last={last}")


def storage_snapshot(page) -> dict[str, Any]:
    return page.evaluate("""async () => await chrome.storage.session.get(null)""")


def save_as_rows(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in snapshot.items() if k.startswith('webclipPreparedSaveAs')}


def read_operation(page, operation_id: str):
    return page.evaluate(
        """async (operationId) => await new Promise((resolve, reject) => {
          const req = indexedDB.open('WebClipOperationLogs', 2);
          req.onerror = () => reject(req.error || new Error('oplog open failed'));
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('operations', 'readonly');
            const get = tx.objectStore('operations').get(operationId);
            get.onsuccess = () => resolve(get.result || null);
            get.onerror = () => reject(get.error || new Error('oplog get failed'));
            tx.oncomplete = () => db.close();
          };
        })""",
        operation_id,
    )


def download_rows(page):
    return page.evaluate("""async () => await chrome.downloads.search({})""")


def wait_journal_ready(page):
    page.wait_for_function("() => document.readyState === 'complete' && !!document.getElementById('exportFile')", timeout=20000)
    page.wait_for_timeout(300)


def launch_case(pw, chrome: str, label: str):
    profile = pathlib.Path(tempfile.mkdtemp(prefix=f"webclip-c41-{label}-profile-"))
    downloads = profile / "Downloads"
    downloads.mkdir(parents=True, exist_ok=True)
    context = pw.chromium.launch_persistent_context(
        str(profile),
        executable_path=chrome,
        headless=False,
        accept_downloads=True,
        downloads_path=str(downloads),
        args=[
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--enable-unsafe-extension-debugging",
            "--window-size=1280,900",
        ],
    )
    browser = context.browser
    if browser is None:
        raise AssertionError("persistent Chromium browser handle unavailable")
    cdp = browser.new_browser_cdp_session()
    loaded = cdp.send("Extensions.loadUnpacked", {"path": str(ROOT)})
    extension_id = str(loaded.get("id") or "")
    if len(extension_id) != 32:
        raise AssertionError(f"Extensions.loadUnpacked returned invalid id: {extension_id!r}")
    page = context.new_page()
    page.goto(f"chrome-extension://{extension_id}/journal.html", wait_until="load")
    wait_journal_ready(page)
    return {
        "profile": profile,
        "downloads": downloads,
        "context": context,
        "browser": browser,
        "cdp": cdp,
        "page": page,
        "extensionId": extension_id,
    }


def close_case(case):
    try:
        case["context"].close()
    finally:
        shutil.rmtree(case["profile"], ignore_errors=True)


def begin_export(page):
    before = window_snapshot()
    page.evaluate("document.getElementById('exportFile').click()")
    operation_id = wait_until(
        lambda: page.locator("#lastOperationId").inner_text().strip() or None,
        timeout=10,
        label="journal operationId",
    )
    observed = wait_native_dialog(before)
    return operation_id, observed


def wait_busy_finished(page, timeout: float = 15.0):
    return wait_until(
        lambda: page.evaluate("!document.getElementById('exportFile').disabled") or None,
        timeout=timeout,
        label="journal export busy reset",
    )


def case_cancel(pw, chrome: str) -> dict[str, Any]:
    case = launch_case(pw, chrome, "cancel")
    try:
        page = case["page"]
        operation_id, observed = begin_export(page)
        during = save_as_rows(storage_snapshot(page))
        press_key("Escape")
        wait_busy_finished(page)
        after = save_as_rows(storage_snapshot(page))
        downloads = download_rows(page)
        operation = read_operation(page, operation_id)
        status_text = page.locator("#status").inner_text().strip()
        return {
            "operationId": operation_id,
            "nativeDialog": observed,
            "duringSessionRows": during,
            "afterSessionRows": after,
            "downloads": [{k: row.get(k) for k in ("id", "state", "filename", "error", "exists", "bytesReceived", "totalBytes")} for row in downloads],
            "operation": operation,
            "statusText": status_text,
            "dialogRemaining": dialog_still_present(observed),
        }
    finally:
        close_case(case)


def stop_extension_worker(case) -> dict[str, Any]:
    context = case["context"]
    extension_id = case["extensionId"]
    worker = wait_until(
        lambda: next((w for w in context.service_workers if w.url.startswith(f"chrome-extension://{extension_id}/") and w.url.endswith("service-worker.js")), None),
        timeout=10,
        label="extension service worker",
    )
    old_url = worker.url
    result = worker.evaluate("() => { self.close(); return 'close-called'; }")
    # A later extension message should start a fresh worker. The old Worker
    # object may linger briefly, so evidence is the explicit close plus a
    # subsequently usable runtime path, not object identity alone.
    time.sleep(0.5)
    return {"oldUrl": old_url, "closeResult": result}


def accept_native_dialog(observed: dict[str, Any]) -> list[str]:
    actions = []
    for key in ("Return", "Return", "alt+s", "Return"):
        press_key(key)
        actions.append(key)
        time.sleep(0.5)
        if not dialog_still_present(observed):
            return actions
    raise AssertionError(f"native Save As dialog did not close after accept keys; active={active_window()}")


def case_worker_restart_success(pw, chrome: str) -> dict[str, Any]:
    case = launch_case(pw, chrome, "worker-restart-success")
    try:
        page = case["page"]
        operation_id, observed = begin_export(page)
        during = save_as_rows(storage_snapshot(page))
        worker_stop = stop_extension_worker(case)
        accept_keys = accept_native_dialog(observed)
        wait_busy_finished(page, timeout=20)
        downloads = download_rows(page)
        # The product's current contract may report OperationLog success at
        # DownloadItem start. Independently wait for physical terminality so the
        # evidence can compare the two truths.
        terminal = wait_until(
            lambda: next((row for row in download_rows(page) if row.get("state") in ("complete", "interrupted")), None),
            timeout=20,
            label="native Save As DownloadItem terminality",
        )
        operation = read_operation(page, operation_id)
        after = save_as_rows(storage_snapshot(page))
        filename = pathlib.Path(str(terminal.get("filename") or ""))
        physical = {
            "path": str(filename),
            "exists": filename.is_file(),
            "bytes": filename.stat().st_size if filename.is_file() else 0,
            "sha256": hashlib.sha256(filename.read_bytes()).hexdigest() if filename.is_file() else "",
        }
        return {
            "operationId": operation_id,
            "nativeDialog": observed,
            "duringSessionRows": during,
            "workerStop": worker_stop,
            "acceptKeys": accept_keys,
            "downloads": [{k: row.get(k) for k in ("id", "state", "filename", "error", "exists", "bytesReceived", "totalBytes")} for row in downloads],
            "terminalDownload": {k: terminal.get(k) for k in ("id", "state", "filename", "error", "exists", "bytesReceived", "totalBytes")},
            "operation": operation,
            "afterSessionRows": after,
            "physicalFile": physical,
            "statusText": page.locator("#status").inner_text().strip(),
            "dialogRemaining": dialog_still_present(observed),
        }
    finally:
        close_case(case)


def run(chrome: str) -> dict[str, Any]:
    if not chrome:
        raise SystemExit("Chrome unavailable")
    for required in ("xdotool", "wmctrl"):
        if not shutil.which(required):
            raise SystemExit(f"{required} unavailable")
    if not os.environ.get("DISPLAY"):
        raise SystemExit("DISPLAY unavailable; native X11 evidence cannot run")

    with sync_playwright() as pw:
        cancel = case_cancel(pw, chrome)
        success = case_worker_restart_success(pw, chrome)

    result = {
        "chromeVersion": sh(chrome, "--version"),
        "display": os.environ.get("DISPLAY", ""),
        "source": {
            "manifestSha256": hashlib.sha256((ROOT / "manifest.json").read_bytes()).hexdigest(),
            "workerSha256": hashlib.sha256((ROOT / "service-worker.js").read_bytes()).hexdigest(),
            "preparedSaveAsSha256": hashlib.sha256((ROOT / "prepared-save-as.js").read_bytes()).hexdigest(),
            "journalSha256": hashlib.sha256((ROOT / "journal.js").read_bytes()).hexdigest(),
        },
        "cancelCase": cancel,
        "workerRestartSuccessCase": success,
        "evidenceBoundary": {
            "nativeChooser": "real Chrome/OS X11 file chooser; xdotool only supplies user-like keyboard input",
            "workerRestart": "real MV3 service worker self.close() while native chooser is pending",
            "browserRestart": False,
            "automaticResponseLoss": False,
            "ownerPageRestart": False,
        },
    }
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    result["resultSha256"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    print("C41_NATIVE_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=False), flush=True)

    assert cancel["nativeDialog"]["new"] or cancel["nativeDialog"]["semantic"], cancel
    assert not cancel["dialogRemaining"], cancel
    assert success["nativeDialog"]["new"] or success["nativeDialog"]["semantic"], success
    assert success["workerStop"]["closeResult"] == "close-called", success
    assert not success["dialogRemaining"], success
    assert success["terminalDownload"]["state"] == "complete", success
    assert success["physicalFile"]["exists"] and success["physicalFile"]["bytes"] > 0, success
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    args = parser.parse_args()
    run(args.chrome)


if __name__ == "__main__":
    main()
