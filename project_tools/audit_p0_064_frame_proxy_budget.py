#!/usr/bin/env python3
"""Chrome-bound closure harness for P0-064 flattened-frame preflight budgets."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD = ROOT / "frame-proxy-inert-guard.js"


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    return parser.parse_args()


def frame_fixture(direct_children: int = 0, text_chars: int = 0, attr_emojis: int = 0) -> str:
    spans = "<span>x</span>" * direct_children
    text = "x" * text_chars
    attr = "😀" * attr_emojis
    payload = f"<article data-payload='{attr}'>{text}</article>{spans}"
    return f"<!doctype html><meta charset='utf-8'><iframe id='f' srcdoc={json.dumps(payload)}></iframe>"


def wait_frame(page) -> None:
    page.wait_for_function("document.getElementById('f')?.contentDocument?.body")


def install_guard(page, guard_source: str) -> None:
    page.add_script_tag(content=guard_source)
    page.wait_for_function("window.WebClipFrameProxyInertGuard?.stats?.installedRealms >= 2")


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    guard_source = GUARD.read_text(encoding="utf-8")
    required = [
        "FRAME_PROXY_MAX_SOURCE_NODES = 5_000",
        "FRAME_PROXY_MAX_TEXT_CHARS = 2_000_000",
        "FRAME_PROXY_MAX_SOURCE_UTF8_BYTES = 8_000_000",
        "guardedFrameBodyChildNodesIterator",
        "ensureSourceBudget(body)",
    ]
    for fragment in required:
        if fragment not in guard_source:
            raise AssertionError(f"guard no longer matches P0-064 harness: {fragment}")

    results: dict[str, object] = {"guard_sha256": sha256(GUARD)}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(args.chrome), headless=True, args=["--no-sandbox"])
        results["browser_version"] = browser.version

        page = browser.new_page()
        page.set_content(frame_fixture(direct_children=5000), wait_until="load")
        wait_frame(page)
        baseline_count = page.evaluate("document.getElementById('f').contentDocument.body.childNodes.length")
        baseline_spread = page.evaluate("[...document.getElementById('f').contentDocument.body.childNodes].length")
        if baseline_count != 5001 or baseline_spread != 5001:
            raise AssertionError(f"native baseline invalid: count={baseline_count} spread={baseline_spread}")
        results["native_over_limit_control"] = {"child_nodes": baseline_count, "spread_length": baseline_spread}
        page.close()

        page = browser.new_page()
        page.set_content(frame_fixture(direct_children=5000), wait_until="load")
        wait_frame(page)
        install_guard(page, guard_source)
        guarded = page.evaluate("""
        () => {
          const doc = document.getElementById('f').contentDocument;
          const first = doc.body.firstElementChild;
          let spread = null;
          let clone = null;
          let createCalls = 0;
          const nativeCreate = doc.createElement.bind(doc);
          doc.createElement = (...args) => { createCalls += 1; return nativeCreate(...args); };
          try { [...doc.body.childNodes]; spread = {ok:true}; }
          catch (error) { spread = {ok:false, code:error.code, dimension:error.dimension}; }
          try { first.cloneNode(true); clone = {ok:true}; }
          catch (error) { clone = {ok:false, code:error.code, dimension:error.dimension}; }
          return {spread, clone, createCalls, stats: {...window.WebClipFrameProxyInertGuard.stats}};
        }
        """)
        if guarded["spread"]["ok"] or guarded["spread"].get("code") != "WEBCLIP_FRAME_PROXY_BUDGET_EXCEEDED":
            raise AssertionError(f"guarded spread did not fail closed: {guarded}")
        if guarded["clone"]["ok"] or guarded["clone"].get("code") != "WEBCLIP_FRAME_PROXY_BUDGET_EXCEEDED":
            raise AssertionError(f"guarded clone did not fail closed: {guarded}")
        if guarded["createCalls"] != 0:
            raise AssertionError(f"oversized clone allocated target elements before rejection: {guarded}")
        results["node_budget"] = guarded
        page.close()

        page = browser.new_page()
        page.set_content(frame_fixture(text_chars=2_000_001), wait_until="load")
        wait_frame(page)
        install_guard(page, guard_source)
        text_case = page.evaluate("""
        () => {
          const doc = document.getElementById('f').contentDocument;
          let createCalls = 0;
          const nativeCreate = doc.createElement.bind(doc);
          doc.createElement = (...args) => { createCalls += 1; return nativeCreate(...args); };
          try { doc.body.firstElementChild.cloneNode(true); return {ok:true, createCalls}; }
          catch (error) { return {ok:false, code:error.code, dimension:error.dimension, createCalls}; }
        }
        """)
        if text_case.get("ok") or text_case.get("dimension") != "textChars" or text_case.get("createCalls") != 0:
            raise AssertionError(f"text budget did not reject before allocation: {text_case}")
        results["text_budget"] = text_case
        page.close()

        page = browser.new_page()
        page.set_content(frame_fixture(attr_emojis=2_000_010), wait_until="load")
        wait_frame(page)
        install_guard(page, guard_source)
        byte_case = page.evaluate("""
        () => {
          const doc = document.getElementById('f').contentDocument;
          let createCalls = 0;
          const nativeCreate = doc.createElement.bind(doc);
          doc.createElement = (...args) => { createCalls += 1; return nativeCreate(...args); };
          try { doc.body.firstElementChild.cloneNode(true); return {ok:true, createCalls}; }
          catch (error) { return {ok:false, code:error.code, dimension:error.dimension, createCalls}; }
        }
        """)
        if byte_case.get("ok") or byte_case.get("dimension") != "bytes" or byte_case.get("createCalls") != 0:
            raise AssertionError(f"byte budget did not reject before allocation: {byte_case}")
        results["byte_budget"] = byte_case
        page.close()

        page = browser.new_page()
        page.set_content(frame_fixture(direct_children=100, text_chars=2000), wait_until="load")
        wait_frame(page)
        install_guard(page, guard_source)
        positive = page.evaluate("""
        () => {
          const doc = document.getElementById('f').contentDocument;
          const spreadLength = [...doc.body.childNodes].length;
          const clone = doc.body.firstElementChild.cloneNode(true);
          return {
            spreadLength,
            cloneTag: clone.localName,
            cloneTextChars: clone.textContent.length,
            stats: {...window.WebClipFrameProxyInertGuard.stats}
          };
        }
        """)
        if positive["spreadLength"] != 101 or positive["cloneTag"] != "article" or positive["cloneTextChars"] != 2000:
            raise AssertionError(f"normal bounded source regressed: {positive}")
        results["bounded_positive"] = positive
        page.close()
        browser.close()

    output = args.output / "p0-064-frame-proxy-budget.json"
    output.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"P0-064 Chrome preflight budget: PASS; evidence={output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
