#!/usr/bin/env python3
"""Browser-level functional Closure Sweep for P0-067.

Loads the exact checked-out content.js into a Chrome page with a minimal MV3
runtime stub, uses WebClip's own external command path to select main content and
start PDF preparation, and records whether disclosure preparation invokes a real
host-page submit/button side effect.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import tempfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT_JS = ROOT / "content.js"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_source_invariants(source: str) -> None:
    required = [
        "await expandSpoilersInIncludedContent();",
        "const clicked = triggerInternalClick(control);",
        "control.click();",
        "if (tag === 'BUTTON' && (control.getAttribute('type') || '').toLowerCase() === 'submit')",
        "const semanticToggle = control.hasAttribute('aria-controls')",
        "return looksLikeDisclosureControl(control);",
    ]
    for fragment in required:
        if fragment not in source:
            raise AssertionError(f"current content.js no longer contains expected P0-067 invariant: {fragment}")
    if not re.search(r"function\s+triggerInternalClick\s*\(control\)\s*\{[\s\S]*?control\.click\(\);", source):
        raise AssertionError("triggerInternalClick no longer calls the real host control click()")


HTML = r"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>P0-067 host activation fixture</title>
<style>
  body { margin: 0; font-family: Arial, sans-serif; }
  main { width: 760px; min-height: 520px; padding: 30px; }
  #panel { display: none; min-height: 180px; padding: 20px; background: #e6f4ea; }
  #panel.open { display: block; }
</style>
</head>
<body>
<main id="selected-root">
  <h1>P0-067 selected article</h1>
  <p>This selected content intentionally contains enough ordinary text for Main Content detection. The disclosure button below looks semantically like an accordion toggle but is also a real submit button owned by the host page.</p>
  <form id="danger-form">
    <button id="danger-toggle" class="accordion-button collapsed" type="submit" aria-expanded="false" aria-controls="panel">Open details</button>
    <section id="panel" role="region" aria-hidden="true">P0_067_DISCLOSURE_CONTENT</section>
  </form>
  <p>Additional selected article text ensures the main element remains the strongest semantic candidate for WebClip automatic selection.</p>
</main>
<script>
  window.__host = { clicks: 0, submits: 0, navigations: 0 };
  document.getElementById('danger-toggle').addEventListener('click', () => {
    window.__host.clicks += 1;
    const button = document.getElementById('danger-toggle');
    const panel = document.getElementById('panel');
    button.setAttribute('aria-expanded', 'true');
    button.classList.remove('collapsed');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  });
  document.getElementById('danger-form').addEventListener('submit', (event) => {
    window.__host.submits += 1;
    event.preventDefault();
  });
</script>
</body>
</html>"""


RUNTIME_STUB = r"""
(() => {
  const listeners = [];
  const runtimeMessages = [];
  globalThis.chrome = {
    runtime: {
      id: 'webclip-research-extension',
      getURL: (path='') => `chrome-extension://webclip-research-extension/${path}`,
      onMessage: { addListener(fn) { listeners.push(fn); } },
      sendMessage(message) {
        runtimeMessages.push(JSON.parse(JSON.stringify(message || {})));
        const type = String(message?.type || '');
        if (type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
        if (type === 'WEBCLIP_GENERATE_PDF') return Promise.resolve({ ok: true, filename: 'p0-067-research.pdf', operationId: message.operationId || 'research-op', journalWarning: '' });
        if (type === 'WEBCLIP_INVALIDATE_PDF_CACHE') return Promise.resolve({ ok: true });
        if (type === 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS') return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true });
      }
    }
  };
  globalThis.__webclipRuntimeMessages = runtimeMessages;
  globalThis.__dispatchWebClipMessage = (message) => new Promise((resolve, reject) => {
    let settled = false;
    let asynchronous = false;
    const sendResponse = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      for (const listener of listeners) {
        const result = listener(message, { id: chrome.runtime.id, url: location.href }, sendResponse);
        if (result === true) asynchronous = true;
        if (settled) return;
      }
      if (!asynchronous && !settled) { settled = true; resolve(undefined); }
      if (asynchronous) setTimeout(() => { if (!settled) reject(new Error('WebClip test message did not settle')); }, 5000);
    } catch (error) { reject(error); }
  });
})();
"""


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

    source = CONTENT_JS.read_text(encoding="utf-8")
    assert_source_invariants(source)
    output = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-067-"))
    output.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(chrome), headless=True, args=["--no-sandbox"])
        version = browser.version
        page = browser.new_page(viewport={"width": 1200, "height": 900})
        page.set_content(HTML, wait_until="load")
        page.add_script_tag(content=RUNTIME_STUB)
        page.add_script_tag(content=source)

        start = page.evaluate("__dispatchWebClipMessage({type:'WEBCLIP_START_SELECTION'})")
        if not start or not start.get("ok"):
            raise AssertionError(f"WebClip start-selection failed: {start}")

        auto = page.evaluate("__dispatchWebClipMessage({type:'WEBCLIP_COMMAND', command:'auto-content'})")
        if not auto or not auto.get("ok"):
            raise AssertionError(f"WebClip auto-content failed: {auto}")
        included = page.locator("#selected-root").get_attribute("data-webclip-pdf-include")
        if not included:
            raise AssertionError("WebClip did not include the fixture main content")

        before = page.evaluate("JSON.parse(JSON.stringify(__host))")
        if before != {"clicks": 0, "submits": 0, "navigations": 0}:
            raise AssertionError(f"host fixture side effects already occurred before PDF preparation: {before}")

        download = page.evaluate("__dispatchWebClipMessage({type:'WEBCLIP_COMMAND', command:'download'})")
        if not download or not download.get("ok"):
            raise AssertionError(f"WebClip download command failed: {download}")

        # This is WebClip UI, not the host control. Its handler enters the real
        # downloadPdf() -> prepareForPrint() path in the exact content.js. The
        # UI event handler intentionally does not await downloadPdf(), so the
        # harness waits independently for both the host side effect and the
        # later runtime generate message before evaluating the completed path.
        page.get_by_role("button", name="Сформировать PDF").click()
        page.wait_for_function("window.__host.submits > 0", timeout=5000)
        page.wait_for_function(
            "window.__webclipRuntimeMessages.some((m) => m && m.type === 'WEBCLIP_GENERATE_PDF')",
            timeout=15000,
        )
        page.wait_for_timeout(100)

        after = page.evaluate("JSON.parse(JSON.stringify(__host))")
        panel = page.evaluate("({expanded: document.querySelector('#danger-toggle').getAttribute('aria-expanded'), visible: getComputedStyle(document.querySelector('#panel')).display !== 'none'})")
        messages = page.evaluate("JSON.parse(JSON.stringify(__webclipRuntimeMessages))")
        browser.close()

    generated = [m for m in messages if m.get("type") == "WEBCLIP_GENERATE_PDF"]
    if not generated:
        raise AssertionError("fixture did not reach WEBCLIP_GENERATE_PDF after preparation")
    if after["clicks"] < 1 or after["submits"] < 1:
        raise AssertionError(f"expected real host click+submit side effects; got {after}")
    if panel["expanded"] != "true" or not panel["visible"]:
        raise AssertionError(f"disclosure fixture did not open: {panel}")

    result = {
        "schema": 1,
        "owner": "P0-067",
        "browser": version,
        "content_js_sha256": sha256(source.encode("utf-8")),
        "verdict": "RENDERER-COVERED / FINDING",
        "selected_root": "#selected-root",
        "before_prepare": before,
        "after_prepare": after,
        "panel": panel,
        "generate_pdf_message_count": len(generated),
        "finding": "Exact WebClip PDF preparation invoked a real host-page submit control through control.click().",
    }
    (output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("P0-067 host control activation research: FINDING reproduced")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
