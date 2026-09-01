#!/usr/bin/env python3
"""Chrome-152 engineering smoke for P0-065 offscreen pre-Blob admission.

This uses a real MV3 offscreen document with the product offscreen.js. It proves
that the fail-closed guard/bootstrap is operational, that the 13th Blob-URL
request is rejected by the pre-listener guard (distinguished by its error code),
and that real URL revocation restores admission. Deterministic source tests own
the exact byte-reservation and pre-materialization ordering proof.
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

from playwright.sync_api import BrowserContext, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "offscreen-blob-admission-guard.js",
    ROOT / "offscreen-bootstrap.js",
    ROOT / "offscreen.html",
    ROOT / "offscreen.js",
]


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_source() -> dict[str, str]:
    guard = (ROOT / "offscreen-blob-admission-guard.js").read_text(encoding="utf-8")
    bootstrap = (ROOT / "offscreen-bootstrap.js").read_text(encoding="utf-8")
    html = (ROOT / "offscreen.html").read_text(encoding="utf-8")
    offscreen = (ROOT / "offscreen.js").read_text(encoding="utf-8")
    required_guard = [
        "P0-065",
        "MAX_ACTIVE_BLOB_URLS = 12",
        "MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024",
        "WEBCLIP_CREATE_PDF_CACHE_BLOB_URL",
        "WEBCLIP_CREATE_TEXT_BLOB_URL",
        "WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL",
        "reserveForMessage(message)",
        "OFFSCREEN_BLOB_BUDGET_EXCEEDED",
        "releaseActiveUrl(url)",
    ]
    for fragment in required_guard:
        if fragment not in guard:
            raise AssertionError(f"guard missing P0-065 invariant: {fragment}")
    if "if (!result?.installed)" not in bootstrap or "script.src = 'offscreen.js'" not in bootstrap:
        raise AssertionError("offscreen bootstrap is not fail-closed")
    if html.index("offscreen-blob-admission-guard.js") < 0 or html.index("offscreen-bootstrap.js") <= html.index("offscreen-blob-admission-guard.js"):
        raise AssertionError("offscreen HTML does not load guard before bootstrap")
    if '<script src="offscreen.js"></script>' in html:
        raise AssertionError("offscreen.js bypasses fail-closed bootstrap")
    if "const MAX_ACTIVE_BLOB_URLS = 12;" not in offscreen or "const MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024;" not in offscreen:
        raise AssertionError("legacy offscreen post-check constants changed; re-research required")
    return {path.name: sha256(path) for path in FILES}


def build_extension(output: pathlib.Path) -> pathlib.Path:
    ext = output / "extension"
    ext.mkdir(parents=True, exist_ok=True)
    for path in FILES:
        shutil.copy2(path, ext / path.name)
    (ext / "sw.js").write_text(
        """
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST') {
    sendResponse({ closed: false });
    return false;
  }
  return false;
});
""".strip() + "\n",
        encoding="utf-8",
    )
    manifest = {
        "manifest_version": 3,
        "name": "WebClip P0-065 offscreen admission evidence",
        "version": "1.0.0",
        "permissions": ["offscreen"],
        "background": {"service_worker": "sw.js"},
    }
    (ext / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return ext


def wait_worker(context: BrowserContext):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        workers = context.service_workers
        if workers:
            return workers[0]
        time.sleep(0.1)
    raise AssertionError("MV3 worker did not start")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=os.environ.get("CHROME_BIN", ""))
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args()
    if not args.chrome:
        raise AssertionError("Chrome executable required via --chrome or CHROME_BIN")
    chrome = pathlib.Path(args.chrome)
    if not chrome.exists():
        raise AssertionError(f"Chrome executable missing: {chrome}")
    output = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-065-"))
    output.mkdir(parents=True, exist_ok=True)
    source = assert_source()
    ext = build_extension(output)
    chrome_version = subprocess.check_output([str(chrome), "--version"], text=True).strip()

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(output / "profile"),
            executable_path=str(chrome),
            headless=False,
            args=[
                f"--disable-extensions-except={ext}",
                f"--load-extension={ext}",
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )
        try:
            worker = wait_worker(context)
            result: dict[str, Any] = worker.evaluate(
                """async () => {
                  if (!(await chrome.offscreen.hasDocument())) {
                    await chrome.offscreen.createDocument({
                      url: 'offscreen.html',
                      reasons: ['BLOBS'],
                      justification: 'P0-065 Blob admission engineering evidence'
                    });
                  }
                  const urls = [];
                  const responses = [];
                  for (let i = 0; i < 12; i += 1) {
                    const response = await chrome.runtime.sendMessage({
                      target: 'offscreen',
                      type: 'WEBCLIP_CREATE_TEXT_BLOB_URL',
                      text: `P0_065_${i}`,
                      mimeType: 'text/plain;charset=utf-8'
                    });
                    responses.push(response);
                    if (!response?.ok || !response?.url) throw new Error(`Blob ${i} was not created: ${JSON.stringify(response)}`);
                    urls.push(response.url);
                  }
                  const overflow = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'WEBCLIP_CREATE_TEXT_BLOB_URL',
                    text: 'P0_065_OVERFLOW',
                    mimeType: 'text/plain;charset=utf-8'
                  });
                  for (const url of urls) {
                    const revoked = await chrome.runtime.sendMessage({
                      target: 'offscreen',
                      type: 'WEBCLIP_REVOKE_BLOB_URL',
                      url
                    });
                    if (!revoked?.ok) throw new Error(`revoke failed: ${JSON.stringify(revoked)}`);
                  }
                  const afterRevoke = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'WEBCLIP_CREATE_TEXT_BLOB_URL',
                    text: 'P0_065_AFTER_REVOKE',
                    mimeType: 'text/plain;charset=utf-8'
                  });
                  if (afterRevoke?.url) {
                    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'WEBCLIP_REVOKE_BLOB_URL', url: afterRevoke.url });
                  }
                  await chrome.offscreen.closeDocument();
                  return { responses, overflow, afterRevoke };
                }"""
            )
        finally:
            context.close()

    if len(result.get("responses") or []) != 12 or not all(item.get("ok") for item in result["responses"]):
        raise AssertionError(f"12 under-count Blob URLs were not created: {result}")
    overflow = result.get("overflow") or {}
    if overflow.get("ok") is not False or overflow.get("code") != "OFFSCREEN_BLOB_BUDGET_EXCEEDED":
        raise AssertionError(f"13th request was not rejected by pre-listener guard: {overflow}")
    after = result.get("afterRevoke") or {}
    if after.get("ok") is not True or not after.get("url"):
        raise AssertionError(f"real revoke did not restore admission: {after}")

    summary = {
        "verdict": "P0-065 ENGINEERING-CLOSURE-CANDIDATE",
        "chrome": chrome_version,
        "source": source,
        "createdBeforeCountLimit": 12,
        "overflow": overflow,
        "afterRevoke": {"ok": after.get("ok"), "size": after.get("size"), "hasUrl": bool(after.get("url"))},
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
