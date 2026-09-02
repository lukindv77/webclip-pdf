#!/usr/bin/env python3
"""C17 supplementary causal control for cross-origin selected-frame print geometry.

Runs the same real two-origin/current-source preparation as the primary C17 probe,
then switches CDP to print media, measures the child after the frame-agent's selected-
only @media print filter becomes effective, resizes the top iframe to that effective
height, and physically prints again. Raw JSON is emitted before assertions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

from playwright.sync_api import sync_playwright

import research_c17_cross_origin_iframe as c17

CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    selected_rows = 120
    with c17.serve({"/child": c17.child_html(selected_rows, 160)}) as child_origin:
        child_url = f"{child_origin}/child"
        with c17.serve({
            "/top": "<!doctype html><meta charset='utf-8'>" + c17.BASE_STYLE
                    + "<body><div id='top-shell'>C17_TOP_SHELL_TOKEN</div>"
                    + f"<iframe id='f1' src='{child_url}'></iframe></body>"
        }) as top_origin:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(
                    executable_path=chrome,
                    headless=True,
                    args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"],
                )
                ctx = browser.new_context()
                page = ctx.new_page()
                page.set_viewport_size({"width": 1100, "height": 800})
                page.goto(f"{top_origin}/top", wait_until="load")
                child = c17.install_one_level(page, child_url)
                c17.select_remote(page, child)
                c17.begin_prepare(page)

                prepared_height = page.evaluate(
                    "()=>document.getElementById('f1').getBoundingClientRect().height"
                )
                session = ctx.new_cdp_session(page)
                session.send("Emulation.setEmulatedMedia", {"media": "print"})
                page.wait_for_timeout(50)
                effective = child.evaluate("""()=>({
                    documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
                    targetHeight: document.getElementById('target').getBoundingClientRect().height,
                    excludeDisplay: getComputedStyle(document.querySelector('.omit')).display,
                    unselectedDisplay: getComputedStyle(document.getElementById('unselected-tail')).display
                })""")
                applied_height = max(1, int(effective["documentHeight"])) + 4
                page.evaluate(
                    """(h)=>document.getElementById('f1').style.setProperty('height', `${h}px`, 'important')""",
                    applied_height,
                )
                pdf_path = out / "print_media_effective_geometry_causal.pdf"
                c17.cdp_pdf(ctx, page, pdf_path, "print")
                summary = c17.pdf_summary(pdf_path, selected_rows)
                result = {
                    "browserVersion": browser.version,
                    "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
                    "frameAgentBlobSha": os.environ.get("FRAME_AGENT_BLOB_SHA", ""),
                    "topOrigin": top_origin,
                    "childOrigin": child_origin,
                    "preparedScreenMeasuredHeight": prepared_height,
                    "effectivePrintDocumentHeight": effective["documentHeight"],
                    "effectiveTargetHeight": effective["targetHeight"],
                    "effectiveExcludeDisplay": effective["excludeDisplay"],
                    "effectiveUnselectedDisplay": effective["unselectedDisplay"],
                    "appliedCausalHeight": applied_height,
                    "pdf": summary,
                }
                payload = json.dumps(result, sort_keys=True, separators=(",",":"), ensure_ascii=False)
                result["resultSha256"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()
                print("C17_GEOMETRY_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",",":"), ensure_ascii=False), flush=True)

                c17.resolve_pdf(page)
                page.close()
                ctx.close()
                browser.close()

    # Physical causal assertions after raw JSON.
    assert result["effectiveExcludeDisplay"] == "none", result
    assert result["effectiveUnselectedDisplay"] == "none", result
    assert result["effectivePrintDocumentHeight"] < result["preparedScreenMeasuredHeight"] * 0.6, result
    pdf = result["pdf"]
    assert pdf["rowCount"] == selected_rows and pdf["lastRow"] == selected_rows, pdf
    assert pdf["first"] and pdf["middle"] and pdf["last"], pdf
    assert not pdf["excludePresent"] and not pdf["unselectedPresent"] and not pdf["topShellPresent"], pdf
    assert pdf["pages"] <= 6, pdf
    return result


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", default=CHROME_DEFAULT)
    p.add_argument("--out", default="")
    a = p.parse_args()
    if not a.chrome:
        raise SystemExit("Chrome/Chromium binary not found")
    out = pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c17-geometry-"))
    run(a.chrome, out)


if __name__ == "__main__":
    main()
