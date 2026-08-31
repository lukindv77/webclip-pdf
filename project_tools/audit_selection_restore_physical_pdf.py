#!/usr/bin/env python3
"""C02 managed-Chromium L3/L4 probe: SelectionSnapshot restore -> physical PDF.

Safe local fixtures only. The probe loads the repository's actual content.js, drives the
current WEBCLIP_APPLY_SELECTION_SNAPSHOT and download preparation paths, then holds the
mock worker reply while Chromium physically prints the prepared page.

Requires Python Playwright, pypdf, and a local Chromium binary.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
from typing import Iterable

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

CHROME_MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c02={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c02.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c02Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c02ResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'c02.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = """
<style>
body{font-family:Arial,sans-serif;margin:24px}.box{display:block;width:620px;min-height:72px;padding:12px;margin:12px 0;border:1px solid #999;box-sizing:border-box}.filler{width:20px;height:3px;overflow:hidden}
</style>
"""


def pdf_text(path: pathlib.Path) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)


def load_content(page, html: str) -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until="load")
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__c02Command(payload)", payload)


def page_click(page, selector: str) -> None:
    result = page.evaluate(
        """(selector)=>document.querySelector(selector).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))""",
        selector,
    )
    assert result is False, (selector, result)


def modal_click(page, label: str = "Сформировать PDF") -> None:
    clicked = page.evaluate(
        """(label)=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);if(!b)return false;b.click();return true;}""",
        label,
    )
    assert clicked, label


def wait_prepared(page) -> dict:
    page.wait_for_function("()=>!!globalThis.__c02.lastPdfRequest", timeout=15000)
    return page.evaluate("()=>globalThis.__c02.lastPdfRequest")


def resolve_mock_pdf(page) -> None:
    assert page.evaluate("()=>__c02ResolvePdf()") is True
    page.wait_for_timeout(40)


def capture_snapshot(ctx, html: str, includes: Iterable[str], excludes: Iterable[str] = ()) -> dict:
    page = ctx.new_page(viewport={"width": 1100, "height": 800})
    load_content(page, html)
    assert command(page, {"type": "WEBCLIP_COMMAND", "command": "start"}).get("ok") is True
    for selector in includes:
        page_click(page, selector)
    excludes = list(excludes)
    if excludes:
        assert command(page, {"type": "WEBCLIP_COMMAND", "command": "mode-exclude"}).get("ok") is True
        for selector in excludes:
            page_click(page, selector)
    assert command(page, {"type": "WEBCLIP_COMMAND", "command": "download"}).get("ok") is True
    modal_click(page)
    request = wait_prepared(page)
    snapshot = request["meta"]["selectionSnapshot"]
    resolve_mock_pdf(page)
    page.close()
    return snapshot


def capture_frame_snapshot(ctx, child_html: str) -> dict:
    page = ctx.new_page(viewport={"width": 1100, "height": 800})
    load_content(page, "<iframe id='f' style='width:760px;height:300px'></iframe>")
    page.locator("#f").evaluate("(el,html)=>{el.srcdoc=html}", f"<!doctype html>{BASE_STYLE}{child_html}")
    page.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'")
    assert command(page, {"type": "WEBCLIP_COMMAND", "command": "start"}).get("ok") is True
    result = page.evaluate(
        """()=>{const f=document.querySelector('#f'),t=f.contentDocument.querySelector('#frameTarget');return t.dispatchEvent(new f.contentWindow.MouseEvent('click',{bubbles:true,cancelable:true,view:f.contentWindow}))}"""
    )
    assert result is False
    assert command(page, {"type": "WEBCLIP_COMMAND", "command": "download"}).get("ok") is True
    modal_click(page)
    request = wait_prepared(page)
    snapshot = request["meta"]["selectionSnapshot"]
    resolve_mock_pdf(page)
    page.close()
    return snapshot


def restore_page(ctx, html: str, snapshot: dict):
    page = ctx.new_page(viewport={"width": 1100, "height": 800})
    load_content(page, html)
    result = command(page, {"type": "WEBCLIP_APPLY_SELECTION_SNAPSHOT", "snapshot": snapshot})
    assert result.get("ok") is True, result
    return page, result


def physical_save(page, out_dir: pathlib.Path, name: str) -> dict:
    download = command(page, {"type": "WEBCLIP_COMMAND", "command": "download"})
    assert download.get("ok") is True, download
    modal_click(page)
    wait_prepared(page)
    path = out_dir / f"{name}.pdf"
    page.pdf(path=str(path), format="A4", print_background=True)
    text = pdf_text(path)
    artifact = {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size, "text": text}
    resolve_mock_pdf(page)
    return artifact


def selected_ids(page) -> list[str]:
    return page.evaluate("()=>[...document.querySelectorAll('[data-webclip-pdf-include]')].map(x=>x.id||x.getAttribute('data-case')||x.localName)")


def run(chromium: str, out_dir: pathlib.Path) -> dict:
    result: dict = {}
    common = ("Stable semantic article sentence for bounded locator confidence and deterministic physical restore. " * 4)[:230]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chromium, headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        ctx = browser.new_context()

        # Positive: benign insertion still restores intended current node and physical text.
        stable_initial = "<article id='stable' class='box card' role='article' aria-label='Primary article'>STABLE_TARGET_MARKER</article>"
        stable_snapshot = capture_snapshot(ctx, stable_initial, ["#stable"])
        stable_mutated = "<section class='box'>UNSELECTED_INSERTION</section><article id='stable' class='box card' role='article' aria-label='Primary article'>STABLE_TARGET_MARKER</article>"
        page, restore = restore_page(ctx, stable_mutated, stable_snapshot)
        artifact = physical_save(page, out_dir, "stable_restore")
        assert restore["restoredIncludes"] == 1, restore
        assert "STABLE_TARGET_MARKER" in artifact["text"]
        assert "UNSELECTED_INSERTION" not in artifact["text"]
        result["stableRestore"] = {"restore": restore, "selected": selected_ids(page), "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Positive: restored Exclude remains absent from physical PDF.
        exclude_html = "<section id='outer' class='box'><p>KEEP_MARKER</p><aside id='cut' class='box'>EXCLUDE_MARKER</aside></section>"
        exclude_snapshot = capture_snapshot(ctx, exclude_html, ["#outer"], ["#cut"])
        page, restore = restore_page(ctx, exclude_html, exclude_snapshot)
        artifact = physical_save(page, out_dir, "exclude_restore")
        assert restore["restoredIncludes"] == 1 and restore["restoredExcludes"] == 1, restore
        assert "KEEP_MARKER" in artifact["text"] and "EXCLUDE_MARKER" not in artifact["text"]
        result["excludeRestore"] = {"restore": restore, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Positive: equal plausible targets remain fail-closed while another stable Include permits physical save.
        amb_initial = "<div id='guard' class='box'>AMBIG_GUARD_MARKER</div><section class='box amb' role='article' aria-label='Ambiguous'>AMBIG_MARKER</section>"
        amb_snapshot = capture_snapshot(ctx, amb_initial, ["#guard", ".amb"])
        amb_mutated = "<div id='guard' class='box'>AMBIG_GUARD_MARKER</div><section class='box amb' role='article' aria-label='Ambiguous'>AMBIG_MARKER</section><section class='box amb' role='article' aria-label='Ambiguous'>AMBIG_MARKER</section>"
        page, restore = restore_page(ctx, amb_mutated, amb_snapshot)
        artifact = physical_save(page, out_dir, "ambiguous_restore")
        assert restore["restoredIncludes"] == 1 and restore["ambiguousIncludes"] == 1, restore
        assert "AMBIG_GUARD_MARKER" in artifact["text"] and "AMBIG_MARKER" not in artifact["text"]
        result["ambiguityFailClosed"] = {"restore": restore, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Finding: non-zero geometry + visibility:hidden is accepted but physically absent.
        visible_initial = "<article id='hidden' class='box card' role='article' aria-label='Hidden test'>HIDDEN_TARGET_MARKER</article>"
        hidden_snapshot = capture_snapshot(ctx, visible_initial, ["#hidden"])
        hidden_mutated = "<article id='hidden' class='box card' role='article' aria-label='Hidden test' style='visibility:hidden'>HIDDEN_TARGET_MARKER</article>"
        page, restore = restore_page(ctx, hidden_mutated, hidden_snapshot)
        geom = page.locator("#hidden").bounding_box()
        artifact = physical_save(page, out_dir, "visibility_hidden_restore")
        assert restore["restoredIncludes"] == 1 and restore["confidenceHigh"] >= 1, restore
        assert geom and geom["width"] >= 2 and geom["height"] >= 2, geom
        assert "HIDDEN_TARGET_MARKER" not in artifact["text"]
        result["visibilityHidden"] = {"restore": restore, "geometry": geom, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Finding: non-zero geometry + opacity:0 is accepted but physically absent.
        opacity_initial = "<article id='transparent' class='box card' role='article' aria-label='Opacity test'>TRANSPARENT_TARGET_MARKER</article>"
        opacity_snapshot = capture_snapshot(ctx, opacity_initial, ["#transparent"])
        opacity_mutated = "<article id='transparent' class='box card' role='article' aria-label='Opacity test' style='opacity:0'>TRANSPARENT_TARGET_MARKER</article>"
        page, restore = restore_page(ctx, opacity_mutated, opacity_snapshot)
        geom = page.locator("#transparent").bounding_box()
        artifact = physical_save(page, out_dir, "opacity_zero_restore")
        assert restore["restoredIncludes"] == 1 and restore["confidenceHigh"] >= 1, restore
        assert geom and geom["width"] >= 2 and geom["height"] >= 2, geom
        assert "TRANSPARENT_TARGET_MARKER" not in artifact["text"]
        result["opacityZero"] = {"restore": restore, "geometry": geom, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Finding: exact target outside first-5000 tag prefix loses to a high-confidence in-prefix decoy.
        exact_initial = f"<div id='exact' class='box card selected' role='article' aria-label='Primary article' name='stable-name' title='Stable title'>{common}TARGET_ONLY_MARKER</div>"
        exact_snapshot = capture_snapshot(ctx, exact_initial, ["#exact"])
        decoy = f"<div id='decoy' class='box card selected' role='article' aria-label='Primary article' name='stable-name' title='Stable title'>{common}DECOY_ONLY_MARKER</div>"
        fillers = "".join(f"<div class='filler'>FILLER_{i}</div>" for i in range(4999))
        exact_tail = f"<div id='exact' class='box card selected' role='article' aria-label='Primary article' name='stable-name' title='Stable title'>{common}TARGET_ONLY_MARKER</div>"
        page, restore = restore_page(ctx, decoy + fillers + exact_tail, exact_snapshot)
        chosen = selected_ids(page)
        artifact = physical_save(page, out_dir, "prefix_decoy_restore")
        assert restore["restoredIncludes"] == 1 and restore["confidenceHigh"] >= 1, restore
        assert chosen == ["decoy"], chosen
        assert "DECOY_ONLY_MARKER" in artifact["text"] and "TARGET_ONLY_MARKER" not in artifact["text"]
        result["prefixDecoy"] = {"restore": restore, "selected": chosen, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Finding: restored selected Element can become disconnected while map count still authorizes save.
        stale_initial = "<article id='stale' class='box card' role='article' aria-label='Stale test'>STALE_SELECTED_MARKER</article>"
        stale_snapshot = capture_snapshot(ctx, stale_initial, ["#stale"])
        page, restore = restore_page(ctx, stale_initial, stale_snapshot)
        before = selected_ids(page)
        page.evaluate("""()=>{const old=document.querySelector('#stale');const replacement=old.cloneNode(true);replacement.removeAttribute('data-webclip-pdf-include');replacement.textContent='LIVE_REPLACEMENT_UNSELECTED';old.replaceWith(replacement)}""")
        after = selected_ids(page)
        artifact = physical_save(page, out_dir, "stale_disconnected_restore")
        assert restore["restoredIncludes"] == 1 and before == ["stale"] and after == [], (restore, before, after)
        assert "STALE_SELECTED_MARKER" not in artifact["text"] and "LIVE_REPLACEMENT_UNSELECTED" not in artifact["text"]
        result["staleDisconnected"] = {"restore": restore, "beforeLiveSelected": before, "afterLiveSelected": after, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # Positive: same-origin framePath restore reaches physical PDF after benign child insertion.
        frame_initial = "<article><p id='frameTarget' class='box inside'>FRAME_TARGET_MARKER</p></article>"
        frame_snapshot = capture_frame_snapshot(ctx, frame_initial)
        page = ctx.new_page(viewport={"width": 1100, "height": 800})
        load_content(page, "<iframe id='f' style='width:760px;height:340px'></iframe>")
        frame_mutated = "<article><p class='box'>FRAME_INSERTION_UNSELECTED</p><p id='frameTarget' class='box inside'>FRAME_TARGET_MARKER</p></article>"
        page.locator("#f").evaluate("(el,html)=>{el.srcdoc=html}", f"<!doctype html>{BASE_STYLE}{frame_mutated}")
        page.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'")
        restore = command(page, {"type": "WEBCLIP_APPLY_SELECTION_SNAPSHOT", "snapshot": frame_snapshot})
        assert restore.get("ok") is True and restore["restoredIncludes"] == 1, restore
        artifact = physical_save(page, out_dir, "same_origin_frame_restore")
        assert "FRAME_TARGET_MARKER" in artifact["text"] and "FRAME_INSERTION_UNSELECTED" not in artifact["text"]
        result["sameOriginFrame"] = {"restore": restore, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        browser.close()

    return result


def compact(result: dict) -> dict:
    return {
        "ok": True,
        "stableRestore": result["stableRestore"]["restore"],
        "excludeRestore": result["excludeRestore"]["restore"],
        "ambiguityFailClosed": result["ambiguityFailClosed"]["restore"],
        "visibilityHidden": {"restore": result["visibilityHidden"]["restore"], "geometry": result["visibilityHidden"]["geometry"]},
        "opacityZero": {"restore": result["opacityZero"]["restore"], "geometry": result["opacityZero"]["geometry"]},
        "prefixDecoy": {"restore": result["prefixDecoy"]["restore"], "selected": result["prefixDecoy"]["selected"]},
        "staleDisconnected": {"restore": result["staleDisconnected"]["restore"], "before": result["staleDisconnected"]["beforeLiveSelected"], "after": result["staleDisconnected"]["afterLiveSelected"]},
        "sameOriginFrame": result["sameOriginFrame"]["restore"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chromium", default=CHROMIUM_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chromium or not pathlib.Path(args.chromium).exists():
        raise SystemExit("Chromium executable not found; use --chromium PATH")

    if args.out:
        out_dir = pathlib.Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        result = run(args.chromium, out_dir)
        (out_dir / "results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c02-physical-") as tmp:
            result = run(args.chromium, pathlib.Path(tmp))

    print(json.dumps(compact(result), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
