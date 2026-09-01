#!/usr/bin/env python3
"""Current-Chrome engineering closure harness for P0-064.

Proves that the selected same-origin iframe BODY is preflighted before the
current content.js top-level childNodes spread/deep-clone/full descendant arrays,
with independent node/text/estimated-byte fail-closed controls and an
under-budget physical PDF positive control.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import json
import pathlib
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import fitz
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = ROOT / "frame-proxy-budget-guard.js"
INERT = ROOT / "frame-proxy-inert-guard.js"
INJECTION = ROOT / "content-injection-guard.js"
POPUP = ROOT / "popup.js"
CONTENT = ROOT / "content.js"


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_source_bound() -> dict[str, str]:
    budget = BUDGET.read_text(encoding="utf-8")
    injection = INJECTION.read_text(encoding="utf-8")
    popup = POPUP.read_text(encoding="utf-8")
    content = CONTENT.read_text(encoding="utf-8")
    required_budget = [
        "const MAX_NODES = 5_000;",
        "const MAX_TEXT_CHARS = 2_000_000;",
        "const MAX_ESTIMATED_BYTES = 8 * 1024 * 1024;",
        "WEBCLIP_FLATTENED_FRAME_BUDGET_EXCEEDED",
        "function preflightFlattenedBody(root)",
        "function guardedWebClipChildNodes()",
        "isFlattenedSourceBody(this)",
    ]
    for fragment in required_budget:
        if fragment not in budget:
            raise AssertionError(f"P0-064 budget guard source drift: {fragment}")
    expected = "['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'content.js']"
    if expected not in popup:
        raise AssertionError("popup injection order no longer loads budget -> inert -> content")
    for fragment in ("BUDGET_HELPER_FILE", "INERT_HELPER_FILE", "REQUIRED_PREFIX"):
        if fragment not in injection:
            raise AssertionError(f"worker injection guard source drift: {fragment}")
    if "for (const node of [...sourceBody.childNodes])" not in content:
        raise AssertionError("content.js no longer exposes the audited childNodes preflight boundary")
    if "proxy.appendChild(node.cloneNode(true))" not in content:
        raise AssertionError("content.js no longer exposes the audited deep clone boundary")
    if "[sourceBody, ...sourceBody.querySelectorAll('*')]" not in content:
        raise AssertionError("content.js no longer exposes the audited full source array boundary")
    return {name: sha256(path) for name, path in {
        "budget_guard": BUDGET,
        "inert_guard": INERT,
        "injection_guard": INJECTION,
        "popup": POPUP,
        "content": CONTENT,
    }.items()}


PAGE = b"""<!doctype html><meta charset='utf-8'><title>P0-064</title>
<style>body{font:14px Arial} iframe{width:900px;height:260px;border:1px solid #999;margin:8px 0}</style>
<h1>P0-064 frame budget</h1>
<iframe id='under' srcdoc='<body></body>'></iframe>
<iframe id='overNodes' srcdoc='<body></body>'></iframe>
<iframe id='overText' srcdoc='<body></body>'></iframe>
<iframe id='overBytes' srcdoc='<body></body>'></iframe>
<iframe id='unmarked' srcdoc='<body></body>'></iframe>
<div id='p0-result' style='display:none'></div>
"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] != "/":
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(PAGE)))
        self.end_headers(); self.wfile.write(PAGE)

    def log_message(self, *_args):
        pass


def test_content_script() -> str:
    return r"""
(async () => {
  const INCLUDE = 'data-webclip-pdf-include';
  const FRAME_INCLUDE = 'data-webclip-pdf-frame-include';
  const FLAT = 'data-webclip-pdf-flattened-frame';
  const budget = globalThis.WebClipFrameProxyBudgetGuard;
  const inert = globalThis.WebClipFrameProxyInertGuard;
  const waitFrames = async () => {
    for (let i = 0; i < 100; i += 1) {
      const ready = ['under','overNodes','overText','overBytes','unmarked'].every(id => document.getElementById(id)?.contentDocument?.body);
      if (ready) return;
      await new Promise(r => setTimeout(r, 20));
    }
    throw new Error('frame fixture not ready');
  };
  await waitFrames();

  function body(id) { return document.getElementById(id).contentDocument.body; }
  function mark(id, withFrame = true) {
    const frame = document.getElementById(id);
    const source = frame.contentDocument.body;
    source.setAttribute(INCLUDE, '1');
    if (withFrame) frame.setAttribute(FRAME_INCLUDE, '1');
    return { frame, source };
  }
  function cloneAttempt(id) {
    const { frame, source } = mark(id, true);
    const proxy = document.createElement('section');
    proxy.setAttribute(FLAT, '1');
    const cloneBefore = inert.stats.deepElementClones;
    const preflightBefore = budget.stats.preflightAttempts;
    try {
      for (const node of [...source.childNodes]) proxy.appendChild(node.cloneNode(true));
      const sourceElements = [source, ...source.querySelectorAll('*')];
      const targetElements = [proxy, ...proxy.querySelectorAll('*')];
      document.body.appendChild(proxy);
      frame.style.display = 'none';
      return {
        ok: true,
        cloneDelta: inert.stats.deepElementClones - cloneBefore,
        preflightDelta: budget.stats.preflightAttempts - preflightBefore,
        sourceElements: sourceElements.length,
        targetElements: targetElements.length,
        receipt: budget.stats.lastReceipt,
        proxyText: proxy.innerText || proxy.textContent || ''
      };
    } catch (error) {
      proxy.remove();
      return {
        ok: false,
        code: String(error?.code || ''),
        reason: String(error?.receipt?.reason || ''),
        cloneDelta: inert.stats.deepElementClones - cloneBefore,
        preflightDelta: budget.stats.preflightAttempts - preflightBefore,
        receipt: error?.receipt || budget.stats.lastReceipt,
        frameDisplay: getComputedStyle(frame).display,
        proxyConnected: proxy.isConnected
      };
    }
  }

  const under = body('under');
  for (let i = 0; i < 80; i += 1) {
    const p = under.ownerDocument.createElement('p');
    p.textContent = i === 0 ? 'P0_064_UNDER_SENTINEL' : `ordinary-${i}`;
    under.appendChild(p);
  }

  const nodes = body('overNodes');
  for (let i = 0; i < budget.MAX_NODES + 5; i += 1) {
    const span = nodes.ownerDocument.createElement('span');
    span.textContent = '';
    nodes.appendChild(span);
  }

  const textBody = body('overText');
  const textNode = textBody.ownerDocument.createElement('div');
  textNode.textContent = 'x'.repeat(budget.MAX_TEXT_CHARS + 1);
  textBody.appendChild(textNode);

  const byteBody = body('overBytes');
  const byteNode = byteBody.ownerDocument.createElement('div');
  byteNode.setAttribute('data-payload', 'x'.repeat(Math.ceil(budget.MAX_ESTIMATED_BYTES / 3)));
  byteBody.appendChild(byteNode);

  const topAttemptsBefore = budget.stats.preflightAttempts;
  const topChildren = document.body.childNodes.length;
  const topAttemptsAfter = budget.stats.preflightAttempts;

  const unmarked = mark('unmarked', false);
  const unmarkedBefore = budget.stats.preflightAttempts;
  const unmarkedChildren = unmarked.source.childNodes.length;
  const unmarkedAfter = budget.stats.preflightAttempts;

  const underResult = cloneAttempt('under');
  const nodesResult = cloneAttempt('overNodes');
  const textResult = cloneAttempt('overText');
  const bytesResult = cloneAttempt('overBytes');

  for (const id of ['overNodes','overText','overBytes','unmarked']) document.getElementById(id).style.display = 'none';

  const result = {
    budget: { maxNodes: budget.MAX_NODES, maxTextChars: budget.MAX_TEXT_CHARS, maxEstimatedBytes: budget.MAX_ESTIMATED_BYTES },
    negativeControls: {
      topChildren,
      topPreflightDelta: topAttemptsAfter - topAttemptsBefore,
      unmarkedChildren,
      unmarkedPreflightDelta: unmarkedAfter - unmarkedBefore
    },
    under: underResult,
    overNodes: nodesResult,
    overText: textResult,
    overBytes: bytesResult,
    stats: JSON.parse(JSON.stringify(budget.stats))
  };
  document.getElementById('p0-result').textContent = JSON.stringify(result);
  document.documentElement.setAttribute('data-p0-064-ready', '1');
})().catch((error) => {
  document.getElementById('p0-result').textContent = JSON.stringify({ fatal: String(error?.stack || error) });
  document.documentElement.setAttribute('data-p0-064-ready', '1');
});
"""


def print_pdf(page) -> bytes:
    session = page.context.new_cdp_session(page)
    result = session.send("Page.printToPDF", {"printBackground": True, "transferMode": "ReturnAsStream"})
    stream = result.get("stream")
    if not stream:
        return base64.b64decode(result["data"])
    chunks: list[bytes] = []
    try:
        while True:
            part = session.send("IO.read", {"handle": stream, "size": 1024 * 1024})
            raw = str(part.get("data") or "")
            chunks.append(base64.b64decode(raw) if part.get("base64Encoded") else raw.encode("latin-1"))
            if part.get("eof"):
                break
    finally:
        with contextlib.suppress(Exception):
            session.send("IO.close", {"handle": stream})
        session.detach()
    return b"".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    source_hashes = assert_source_bound()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"

    extension = args.output / "extension"
    extension.mkdir(parents=True, exist_ok=True)
    (extension / "frame-proxy-budget-guard.js").write_bytes(BUDGET.read_bytes())
    (extension / "frame-proxy-inert-guard.js").write_bytes(INERT.read_bytes())
    (extension / "test-content.js").write_text(test_content_script(), encoding="utf-8")
    (extension / "manifest.json").write_text(json.dumps({
        "manifest_version": 3,
        "name": "P0-064 evidence",
        "version": "1.0.0",
        "content_scripts": [{
            "matches": ["http://127.0.0.1/*"],
            "js": ["frame-proxy-budget-guard.js", "frame-proxy-inert-guard.js", "test-content.js"],
            "run_at": "document_idle"
        }]
    }), encoding="utf-8")

    context = None
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                str(args.output / "profile"),
                executable_path=str(args.chrome),
                headless=False,
                args=[
                    f"--disable-extensions-except={extension}",
                    f"--load-extension={extension}",
                    "--no-first-run",
                    "--disable-background-networking",
                ],
            )
            page = context.pages[0] if context.pages else context.new_page()
            page.goto(url, wait_until="load")
            page.wait_for_function("document.documentElement.getAttribute('data-p0-064-ready') === '1'", timeout=30_000)
            result = json.loads(page.locator("#p0-result").text_content() or "{}")
            if result.get("fatal"):
                raise AssertionError(result["fatal"])

            expected_code = "WEBCLIP_FLATTENED_FRAME_BUDGET_EXCEEDED"
            if result["negativeControls"]["topPreflightDelta"] != 0 or result["negativeControls"]["unmarkedPreflightDelta"] != 0:
                raise AssertionError(f"budget guard intercepted unrelated childNodes access: {result['negativeControls']}")
            if not result["under"]["ok"] or result["under"]["preflightDelta"] != 1 or result["under"]["cloneDelta"] <= 0:
                raise AssertionError(f"under-budget frame did not pass/clone: {result['under']}")
            for key, reason in (("overNodes", "nodes"), ("overText", "text-chars"), ("overBytes", "estimated-bytes")):
                case = result[key]
                if case["ok"] or case["code"] != expected_code or case["reason"] != reason:
                    raise AssertionError(f"{key} did not fail on expected budget: {case}")
                if case["cloneDelta"] != 0 or case["preflightDelta"] != 1 or case["proxyConnected"]:
                    raise AssertionError(f"{key} allocated clone/proxy before fail-closed admission: {case}")
                if case["frameDisplay"] == "none":
                    raise AssertionError(f"{key} hid the original frame despite budget rejection")

            pdf = print_pdf(page)
            (args.output / "p0-064-under-budget.pdf").write_bytes(pdf)
            doc = fitz.open(stream=pdf, filetype="pdf")
            text_value = "\n".join(page_obj.get_text("text") for page_obj in doc)
            if "P0_064_UNDER_SENTINEL" not in text_value:
                raise AssertionError("under-budget printable proxy sentinel missing from physical PDF")
            evidence: dict[str, Any] = {
                "verdict": "P0-064 ENGINEERING-CLOSURE-CANDIDATE",
                "source": source_hashes,
                "browser": context.browser.version if context.browser else "",
                "result": result,
                "pdf": {
                    "pages": len(doc),
                    "sha256": hashlib.sha256(pdf).hexdigest(),
                    "text_sha256": hashlib.sha256(text_value.encode("utf-8")).hexdigest(),
                    "sentinel_present": True,
                }
            }
            (args.output / "evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(evidence, ensure_ascii=False, indent=2))
    finally:
        if context:
            with contextlib.suppress(Exception):
                context.close()
        server.shutdown(); server.server_close(); thread.join(timeout=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
