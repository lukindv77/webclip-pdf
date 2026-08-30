#!/usr/bin/env python3
"""Managed-Chromium L3/L4 probe for the current PDF hover-exclusion contract.

Safe local fixtures only; no external pages or privileged extension APIs.

The probe models the exact relevant WebClip control-plane shape from current content.js:
- zero-size fixed Shadow host with pointer-events:none;
- full-screen backdrop with pointer-events:auto while review/save UI is shown;
- focused Shadow textarea;
- host hidden during beforeprint and restored afterprint.

It establishes four controls:
1. Chromium can physically serialize CSS :hover, hover pseudo-content and JS hover-mounted content.
2. The WebClip-shaped backdrop naturally clears ordinary CSS :hover and fires pointerleave.
3. A hover-opened JS flyout that remains mounted after pointerleave is still printed because current
   preparation has no provenance/normalization boundary that distinguishes it from ordinary DOM.
4. If the page itself closes the flyout on pointerleave, it is absent; an open non-hover dialog
   remains present. A same-origin frame repeats the sticky-JS result.

Requires Python Playwright, pypdf, and a local Chromium binary.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright
from pypdf import PdfReader

TOP_FIXTURE = r"""<!doctype html><meta charset="utf-8">
<style>
body{font-family:Arial;margin:0;padding:40px}
#target{width:360px;height:140px;background:rgb(20,80,210);position:relative;padding:20px;box-sizing:border-box}
#target:hover{background:rgb(220,30,30)}
#cssHover{display:none;background:rgb(20,180,80);padding:8px}
#target:hover #cssHover{display:block}
#target:hover::after{content:"PSEUDO_HOVER_ONLY";display:block;background:rgb(180,120,20);padding:4px}
dialog{position:fixed;left:450px;top:100px;width:260px;height:100px;background:rgb(255,240,170)}
#jsFly{background:rgb(40,180,220);padding:10px;margin-top:8px}
</style>
<div id="target">HOVER_TARGET<div id="cssHover">CSS_HOVER_ONLY</div></div>
<dialog id="dlg" open>OPEN_DIALOG_POSITIVE</dialog>
<div id="jsMount"></div>
<script>
const removeOnLeave=__REMOVE_ON_LEAVE__;
const target=document.querySelector('#target');
const log=[];
target.addEventListener('pointerenter',()=>{
  log.push('enter');
  if(!document.querySelector('#jsFly')){
    const d=document.createElement('div');d.id='jsFly';d.textContent='JS_HOVER_MOUNTED';
    document.querySelector('#jsMount').appendChild(d);
  }
});
target.addEventListener('pointerleave',()=>{
  log.push('leave');
  if(removeOnLeave) document.querySelector('#jsFly')?.remove();
});
window.metrics=()=>({
  hover:target.matches(':hover'),
  cssDisplay:getComputedStyle(document.querySelector('#cssHover')).display,
  log:[...log],jsPresent:!!document.querySelector('#jsFly'),dialogOpen:document.querySelector('#dlg').open
});
window.installWebclipShape=()=>{
  const host=document.createElement('div');host.id='wc-host';
  host.style.cssText='position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML=`<style>.backdrop{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(32,33,36,.38);pointer-events:auto}.modal{pointer-events:auto;background:white;padding:20px}</style><div class="backdrop"><div class="modal"><textarea id="t"></textarea></div></div>`;
  document.documentElement.appendChild(host);sh.querySelector('#t').focus();
  window._bp=[];
  window.addEventListener('beforeprint',()=>{
    window._bp.push({stage:'prehide',...metrics()});
    host.style.display='none';
    window._bp.push({stage:'posthide',...metrics()});
  });
  window.addEventListener('afterprint',()=>{host.style.display='';});
};
window.bp=()=>window._bp||[];
</script>"""

FRAME_CHILD = r"""<!doctype html><meta charset="utf-8">
<style>#t{width:320px;height:120px;background:blue;color:white;padding:15px}#t:hover{background:red}#h{display:none}#t:hover #h{display:block}</style>
<div id="t">FRAME_TARGET<div id="h">FRAME_CSS_HOVER</div></div><div id="m"></div>
<script>
const t=document.querySelector('#t'),log=[];
t.addEventListener('pointerenter',()=>{log.push('enter');if(!document.querySelector('#fly')){const d=document.createElement('div');d.id='fly';d.textContent='FRAME_JS_HOVER_MOUNTED';document.querySelector('#m').appendChild(d)}});
t.addEventListener('pointerleave',()=>log.push('leave'));
window.fm=()=>({hover:t.matches(':hover'),css:getComputedStyle(document.querySelector('#h')).display,js:!!document.querySelector('#fly'),log:[...log]});
</script>"""

FRAME_TOP = r"""<!doctype html><meta charset="utf-8">
<style>body{font-family:Arial;margin:0;padding:20px}dialog{position:fixed;left:500px;top:80px;width:250px;height:90px;background:#ffeaaa}iframe{margin-top:100px;width:420px;height:220px;border:2px solid #333}</style>
<dialog open>TOP_OPEN_DIALOG</dialog><iframe id="f"></iframe>
<script>
window.installWebclipShape=()=>{
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML='<style>.backdrop{position:fixed;inset:0;display:flex;pointer-events:auto;background:rgba(0,0,0,.1)}</style><div class="backdrop"><textarea></textarea></div>';
  document.documentElement.appendChild(host);sh.querySelector('textarea').focus();
  window.addEventListener('beforeprint',()=>host.style.display='none');
  window.addEventListener('afterprint',()=>host.style.display='');
};
</script>"""


def pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


async def physical_pdf(page, out_dir: Path, name: str) -> dict:
    await page.emulate_media(media="screen")
    path = out_dir / f"{name}.pdf"
    await page.pdf(path=str(path), format="A4", print_background=True)
    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "text": pdf_text(path),
    }


async def top_case(browser, out_dir: Path, *, remove_on_leave: bool, overlay: bool, name: str) -> dict:
    page = await browser.new_page(viewport={"width": 1000, "height": 700})
    html = TOP_FIXTURE.replace("__REMOVE_ON_LEAVE__", "true" if remove_on_leave else "false")
    await page.set_content(html)
    await page.mouse.move(100, 100)
    await page.wait_for_timeout(50)
    before = await page.evaluate("metrics()")
    if overlay:
        await page.evaluate("installWebclipShape()")
        await page.wait_for_timeout(100)
    before_print = await page.evaluate("metrics()")
    artifact = await physical_pdf(page, out_dir, name)
    result = {
        "before": before,
        "beforePrintState": before_print,
        "beforePrintLifecycle": await page.evaluate("bp()"),
        "after": await page.evaluate("metrics()"),
        **artifact,
    }
    await page.close()
    return result


async def frame_case(browser, out_dir: Path) -> dict:
    page = await browser.new_page(viewport={"width": 1000, "height": 700})
    await page.set_content(FRAME_TOP)
    await page.locator("#f").evaluate("(el, html) => { el.srcdoc = html; }", FRAME_CHILD)
    await page.wait_for_timeout(250)
    child = page.frames[1]
    rect = await page.locator("#f").bounding_box()
    await page.mouse.move(rect["x"] + 80, rect["y"] + 60)
    await page.wait_for_timeout(100)
    before = await child.evaluate("fm()")
    await page.evaluate("installWebclipShape()")
    await page.wait_for_timeout(100)
    before_print = await child.evaluate("fm()")
    artifact = await physical_pdf(page, out_dir, "same_origin_frame_sticky_js")
    result = {"before": before, "beforePrintState": before_print, "after": await child.evaluate("fm()"), **artifact}
    await page.close()
    return result


async def run(chromium: str, out_dir: Path) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=chromium, headless=True, args=["--no-sandbox"])
        result = {
            "directHover": await top_case(browser, out_dir, remove_on_leave=False, overlay=False, name="direct_hover"),
            "webclipStickyJs": await top_case(browser, out_dir, remove_on_leave=False, overlay=True, name="webclip_sticky_js"),
            "webclipLeaveCloses": await top_case(browser, out_dir, remove_on_leave=True, overlay=True, name="webclip_leave_closes"),
            "sameOriginFrameStickyJs": await frame_case(browser, out_dir),
        }
        await browser.close()

    direct = result["directHover"]
    assert direct["before"]["hover"] is True
    assert "CSS_HOVER_ONLY" in direct["text"] and "PSEUDO_HOVER_ONLY" in direct["text"] and "JS_HOVER_MOUNTED" in direct["text"]

    sticky = result["webclipStickyJs"]
    assert sticky["before"]["hover"] is True
    assert sticky["beforePrintState"]["hover"] is False
    assert sticky["beforePrintState"]["log"] == ["enter", "leave"]
    assert "CSS_HOVER_ONLY" not in sticky["text"] and "PSEUDO_HOVER_ONLY" not in sticky["text"]
    assert "JS_HOVER_MOUNTED" in sticky["text"]
    assert "OPEN_DIALOG_POSITIVE" in sticky["text"]

    closes = result["webclipLeaveCloses"]
    assert closes["beforePrintState"]["hover"] is False
    assert closes["beforePrintState"]["jsPresent"] is False
    assert "JS_HOVER_MOUNTED" not in closes["text"]
    assert "OPEN_DIALOG_POSITIVE" in closes["text"]

    frame = result["sameOriginFrameStickyJs"]
    assert frame["before"]["hover"] is True
    assert frame["beforePrintState"]["hover"] is False
    assert frame["beforePrintState"]["log"] == ["enter", "leave"]
    assert "FRAME_CSS_HOVER" not in frame["text"]
    assert "FRAME_JS_HOVER_MOUNTED" in frame["text"]
    assert "TOP_OPEN_DIALOG" in frame["text"]
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chromium", default=shutil.which("chromium") or shutil.which("google-chrome") or "")
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chromium:
        raise SystemExit("Chromium executable not found; use --chromium PATH")
    if args.out:
        out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)
        result = asyncio.run(run(args.chromium, out_dir))
        (out_dir / "results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-hover-exclusion-") as tmp:
            result = asyncio.run(run(args.chromium, Path(tmp)))
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
