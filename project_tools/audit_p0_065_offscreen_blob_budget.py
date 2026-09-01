#!/usr/bin/env python3
"""Chrome-bound engineering closure harness for P0-065 Blob pre-allocation admission."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD = ROOT / "offscreen-blob-budget-guard.js"
HTML = ROOT / "offscreen.html"
OFFSCREEN = ROOT / "offscreen.js"


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    guard_source = GUARD.read_text(encoding="utf-8")
    html = HTML.read_text(encoding="utf-8")
    offscreen = OFFSCREEN.read_text(encoding="utf-8")
    required = [
        "MAX_SINGLE_BLOB_BYTES = 64 * 1024 * 1024",
        "MAX_ACTIVE_BLOB_MATERIALIZATIONS = 12",
        "MAX_ACTIVE_BLOB_MATERIALIZATION_BYTES = 256 * 1024 * 1024",
        "estimateParts(parts)",
        "Reflect.construct(NativeBlob",
        "guardedCreateObjectURL",
        "guardedFetch",
    ]
    for fragment in required:
        if fragment not in guard_source:
            raise AssertionError(f"P0-065 guard source drift: {fragment}")
    if html.index("offscreen-blob-budget-guard.js") > html.index("offscreen.js"):
        raise AssertionError("P0-065 bootstrap must precede offscreen.js")
    if "reserveSignedTransferAdmission(message)" not in offscreen or "registerBlobUrl(blob)" not in offscreen:
        raise AssertionError("existing transfer/Blob-URL ledgers must remain present")

    results: dict[str, object] = {
        "guard_sha256": sha256(GUARD),
        "offscreen_html_sha256": sha256(HTML),
        "offscreen_js_sha256": sha256(OFFSCREEN),
    }
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(args.chrome), headless=True, args=["--no-sandbox"])
        results["browser_version"] = browser.version
        page = browser.new_page()
        page.set_content("<!doctype html><meta charset='utf-8'><title>P0-065</title>")
        page.evaluate("""
        () => {
          window.__P0065RealBlob = window.Blob;
          window.__P0065NativeCalls = 0;
          function CountedBlob(parts = [], options = undefined) {
            window.__P0065NativeCalls += 1;
            return Reflect.construct(window.__P0065RealBlob, [parts, options], window.__P0065RealBlob);
          }
          CountedBlob.prototype = window.__P0065RealBlob.prototype;
          Object.setPrototypeOf(CountedBlob, window.__P0065RealBlob);
          window.Blob = CountedBlob;
          window.__P0065FetchResolvers = [];
          window.fetch = () => new Promise((resolve) => window.__P0065FetchResolvers.push(resolve));
        }
        """)
        page.add_script_tag(content=guard_source)

        compatibility = page.evaluate("""
        () => {
          const before = window.__P0065NativeCalls;
          const blob = new Blob(['abc', 'Ж', '😀']);
          return {
            before,
            after: window.__P0065NativeCalls,
            size: blob.size,
            guardedInstance: blob instanceof Blob,
            realInstance: blob instanceof window.__P0065RealBlob,
            errorCode: WebClipOffscreenBlobBudgetGuard.ERROR_CODE
          };
        }
        """)
        if compatibility["after"] != compatibility["before"] + 1 or compatibility["size"] != 9:
            raise AssertionError(f"normal Blob compatibility regressed: {compatibility}")
        if not compatibility["guardedInstance"] or not compatibility["realInstance"]:
            raise AssertionError(f"instanceof compatibility regressed: {compatibility}")
        results["compatibility"] = compatibility

        part_limit = page.evaluate("""
        () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          const before = window.__P0065NativeCalls;
          let error = null;
          try { new Blob(new Array(guard.MAX_BLOB_PARTS + 1).fill('x')); }
          catch (value) { error = {code:value.code, reason:value.reason}; }
          return {before, after:window.__P0065NativeCalls, error};
        }
        """)
        if part_limit["after"] != part_limit["before"] or part_limit["error"] != {"code": "OFFSCREEN_BLOB_MATERIALIZATION_BUDGET_EXCEEDED", "reason": "part-count"}:
            raise AssertionError(f"part-count did not fail before native Blob constructor: {part_limit}")
        results["part_count_preallocation"] = part_limit

        byte_limit = page.evaluate("""
        () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          const before = window.__P0065NativeCalls;
          let error = null;
          const payload = 'x'.repeat(guard.MAX_SINGLE_BLOB_BYTES + 1);
          try { new Blob([payload]); }
          catch (value) { error = {code:value.code, reason:value.reason, requestedBytes:value.requestedBytes}; }
          return {before, after:window.__P0065NativeCalls, error};
        }
        """)
        if byte_limit["after"] != byte_limit["before"] or byte_limit["error"].get("reason") != "single-bytes":
            raise AssertionError(f"byte cap did not fail before native Blob constructor: {byte_limit}")
        results["byte_preallocation"] = byte_limit

        url_lifetime = page.evaluate("""
        () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          const blob = new Blob(['u'.repeat(guard.TRACK_THRESHOLD_BYTES + 123)]);
          const beforeUrl = {...guard.stats};
          const url = URL.createObjectURL(blob);
          const owned = {...guard.stats};
          URL.revokeObjectURL(url);
          return {beforeUrl, owned, released:{...guard.stats}, urlPrefix:String(url).slice(0,5)};
        }
        """)
        if url_lifetime["owned"]["activeCount"] != 1 or url_lifetime["released"]["activeCount"] != 0:
            raise AssertionError(f"ObjectURL reservation lifetime mismatch: {url_lifetime}")
        results["object_url_lifetime"] = url_lifetime

        fetch_started = page.evaluate("""
        () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          const blob = new Blob(['f'.repeat(guard.TRACK_THRESHOLD_BYTES + 321)]);
          window.__P0065FetchPromise = fetch('https://disk.yandex.net/upload', {method:'PUT', body:blob});
          return {...guard.stats};
        }
        """)
        if fetch_started["activeCount"] != 1 or fetch_started["fetchAdoptions"] < 1:
            raise AssertionError(f"fetch did not retain Blob reservation: {fetch_started}")
        page.evaluate("window.__P0065FetchResolvers.shift()({ok:true, status:201})")
        page.evaluate("() => window.__P0065FetchPromise")
        fetch_done = page.evaluate("({...WebClipOffscreenBlobBudgetGuard.stats})")
        if fetch_done["activeCount"] != 0:
            raise AssertionError(f"fetch settlement did not release Blob reservation: {fetch_done}")
        results["fetch_lifetime"] = {"started": fetch_started, "settled": fetch_done}

        existing = page.evaluate("""
        () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          const nativeBlob = new window.__P0065RealBlob(['e'.repeat(guard.TRACK_THRESHOLD_BYTES + 77)]);
          const before = {...guard.stats};
          const url = URL.createObjectURL(nativeBlob);
          const admitted = {...guard.stats};
          URL.revokeObjectURL(url);
          return {before, admitted, released:{...guard.stats}, nativeIsGuardedInstance:nativeBlob instanceof Blob};
        }
        """)
        if existing["admitted"]["activeCount"] != 1 or existing["released"]["activeCount"] != 0 or not existing["nativeIsGuardedInstance"]:
            raise AssertionError(f"existing native Blob adoption mismatch: {existing}")
        results["existing_blob_admission"] = existing

        unadopted = page.evaluate("""
        async () => {
          const guard = WebClipOffscreenBlobBudgetGuard;
          new Blob(['z'.repeat(guard.TRACK_THRESHOLD_BYTES + 99)]);
          const immediate = {...guard.stats};
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {immediate, afterTimer:{...guard.stats}};
        }
        """)
        if unadopted["immediate"]["activeCount"] != 1 or unadopted["afterTimer"]["activeCount"] != 0:
            raise AssertionError(f"unadopted fail-safe release mismatch: {unadopted}")
        results["unadopted_release"] = unadopted
        page.close()
        browser.close()

    out = args.output / "p0-065-offscreen-blob-budget.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"P0-065 Chrome Blob admission: PASS; evidence={out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
