#!/usr/bin/env python3
"""Managed-Chromium L3/L4 probe for WebClip's user-reached dynamic-scroll contract.

Safe local fixture only. It does not load external pages or exercise privileged extension APIs.
Requires Python Playwright, pypdf, and a local Chromium binary.

The probe establishes browser/physical-PDF controls that complement source inspection:
- printToPDF does not itself scroll an infinite-like feed to create new logical items;
- additive content materialized by user-like scrolling remains printable after scrolling back;
- a virtualized/windowed list exposes only the currently mounted row pool to physical PDF;
- after the user reaches a deeper virtual range and scrolls back, the physical PDF loses that
  previously reached history unless the capture layer preserved it separately;
- a selected reusable row can change logical identity while retaining the same DOM node.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright
from pypdf import PdfReader

FIXTURE = r"""<!doctype html><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:24px}.item{height:32px;border-bottom:1px solid #ccc;display:flex;align-items:center;padding:0 8px;box-sizing:border-box}
.box{height:192px;overflow:auto;border:2px solid #555;margin:16px 0}.vsp{height:3200px;position:relative}.vrow{position:absolute;left:0;right:0;height:32px;border-bottom:1px solid #ddd;background:white;padding:0 8px;box-sizing:border-box}
@media print{.box{height:auto!important;overflow:visible!important;max-height:none!important}}
</style><h1>WEBCLIP USER-REACHED DYNAMIC SCROLL PROBE</h1>
<h2>Additive feed</h2><div id="additiveBox" class="box"><div id="additive"></div></div>
<h2>Nested additive feed</h2><div class="box"><div id="nestedBox" class="box"><div id="nested"></div></div></div>
<h2>Virtual list</h2><div id="virtualBox" class="box"><div id="virtualSpacer" class="vsp"></div></div>
<div id="selectedNow"></div><div id="printMarker"></div>
<script>
window.probe={additiveLoads:0,nestedLoads:0,virtualRenders:0,beforePrint:0,afterPrint:0,additiveMax:0,nestedMax:0,virtualMax:0};
function appendBatch(host,prefix,key,countObj){probe[key]++;for(let i=0;i<10;i++){countObj.n++;const d=document.createElement('div');d.className='item';d.textContent=prefix+String(countObj.n).padStart(3,'0');host.appendChild(d)}}
const additive=document.querySelector('#additive'),ab=document.querySelector('#additiveBox'),ac={n:0};appendBatch(additive,'ADD-','additiveLoads',ac);appendBatch(additive,'ADD-','additiveLoads',ac);
ab.addEventListener('scroll',()=>{probe.additiveMax=Math.max(probe.additiveMax,Math.floor((ab.scrollTop+ab.clientHeight)/32));if(ab.scrollTop+ab.clientHeight>=ab.scrollHeight-8&&ac.n<60)appendBatch(additive,'ADD-','additiveLoads',ac)});
const nested=document.querySelector('#nested'),nb=document.querySelector('#nestedBox'),nc={n:0};appendBatch(nested,'NEST-','nestedLoads',nc);appendBatch(nested,'NEST-','nestedLoads',nc);
nb.addEventListener('scroll',()=>{probe.nestedMax=Math.max(probe.nestedMax,Math.floor((nb.scrollTop+nb.clientHeight)/32));if(nb.scrollTop+nb.clientHeight>=nb.scrollHeight-8&&nc.n<60)appendBatch(nested,'NEST-','nestedLoads',nc)});
const vb=document.querySelector('#virtualBox'),sp=document.querySelector('#virtualSpacer'),pool=[];for(let i=0;i<8;i++){const d=document.createElement('div');d.className='vrow';sp.appendChild(d);pool.push(d)}const selected=pool[2];selected.dataset.selected='true';
function renderVirtual(){probe.virtualRenders++;const start=Math.max(0,Math.min(92,Math.floor(vb.scrollTop/32)));probe.virtualMax=Math.max(probe.virtualMax,Math.min(100,Math.floor((vb.scrollTop+vb.clientHeight)/32)));pool.forEach((d,i)=>{const x=start+i;d.style.top=(x*32)+'px';d.textContent='VIRT-'+String(x+1).padStart(3,'0');d.dataset.logical=String(x+1)});document.querySelector('#selectedNow').textContent='SELECTED-NOW '+selected.textContent}
vb.addEventListener('scroll',renderVirtual);renderVirtual();
window.addEventListener('beforeprint',()=>{probe.beforePrint++;document.querySelector('#printMarker').textContent='PRINT-MARKER loads='+probe.additiveLoads+', nested='+probe.nestedLoads+', vmax='+probe.virtualMax});window.addEventListener('afterprint',()=>probe.afterPrint++);
window.actions={metrics:()=>({...probe,additiveCount:ac.n,nestedCount:nc.n,additiveScrollTop:ab.scrollTop,nestedScrollTop:nb.scrollTop,virtualScrollTop:vb.scrollTop,virtualLabels:pool.map(x=>x.textContent),selected:selected.textContent}),addBottom:()=>{ab.scrollTop=ab.scrollHeight;ab.dispatchEvent(new Event('scroll'))},addTop:()=>{ab.scrollTop=0;ab.dispatchEvent(new Event('scroll'))},nestedBottom:()=>{nb.scrollTop=nb.scrollHeight;nb.dispatchEvent(new Event('scroll'))},nestedTop:()=>{nb.scrollTop=0;nb.dispatchEvent(new Event('scroll'))},virtualTo:n=>{vb.scrollTop=(n-1)*32;vb.dispatchEvent(new Event('scroll'))},virtualTop:()=>{vb.scrollTop=0;vb.dispatchEvent(new Event('scroll'))}};
</script>"""


def pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def ids(text: str, prefix: str) -> list[int]:
    return sorted(set(int(x) for x in re.findall(re.escape(prefix) + r"(\d{3})", text)))


async def physical_pdf(page, out_dir: Path, name: str) -> dict:
    before = await page.evaluate("actions.metrics()")
    path = out_dir / f"{name}.pdf"
    await page.pdf(path=str(path), format="A4", print_background=True)
    after = await page.evaluate("actions.metrics()")
    text = pdf_text(path)
    return {
        "before": before,
        "after": after,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "additiveIds": ids(text, "ADD-"),
        "nestedIds": ids(text, "NEST-"),
        "virtualIds": ids(text, "VIRT-"),
        "selectedNow": re.findall(r"SELECTED-NOW\s+VIRT-\d{3}", text),
    }


async def run(chromium: str, out_dir: Path) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=chromium, headless=True, args=["--no-sandbox"])
        context = await browser.new_context(viewport={"width": 1000, "height": 700})
        result: dict[str, dict] = {}

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        result["no_user_scroll"] = await physical_pdf(page, out_dir, "no_user_scroll"); await page.close()

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        for _ in range(2): await page.evaluate("actions.addBottom()"); await page.wait_for_timeout(30)
        reached = await page.evaluate("actions.metrics()")
        await page.evaluate("actions.addTop()"); await page.wait_for_timeout(30)
        result["additive_reach_then_back"] = {"reached": reached, **await physical_pdf(page, out_dir, "additive_reach_then_back")}; await page.close()

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        for _ in range(2): await page.evaluate("actions.nestedBottom()"); await page.wait_for_timeout(30)
        reached = await page.evaluate("actions.metrics()")
        await page.evaluate("actions.nestedTop()"); await page.wait_for_timeout(30)
        result["nested_reach_then_back"] = {"reached": reached, **await physical_pdf(page, out_dir, "nested_reach_then_back")}; await page.close()

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        await page.evaluate("actions.virtualTo(50)"); await page.wait_for_timeout(50)
        result["virtual_at_50"] = await physical_pdf(page, out_dir, "virtual_at_50"); await page.close()

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        await page.evaluate("actions.virtualTo(50)"); await page.wait_for_timeout(50)
        reached = await page.evaluate("actions.metrics()")
        await page.evaluate("actions.virtualTop()"); await page.wait_for_timeout(50)
        result["virtual_reach_then_back"] = {"reached": reached, **await physical_pdf(page, out_dir, "virtual_reach_then_back")}; await page.close()

        page = await context.new_page(); await page.set_content(FIXTURE); await page.wait_for_timeout(50)
        initial = await page.evaluate("actions.metrics()")
        await page.evaluate("actions.virtualTo(50)"); await page.wait_for_timeout(50)
        changed = await page.evaluate("actions.metrics()")
        result["recycled_selected_row"] = {"initial": initial, "changed": changed, **await physical_pdf(page, out_dir, "recycled_selected_row")}; await page.close()

        await browser.close()

    # Contract controls.
    assert result["no_user_scroll"]["before"]["additiveCount"] == 20
    assert result["no_user_scroll"]["after"]["additiveCount"] == 20, "printToPDF must not create new additive items"
    assert result["no_user_scroll"]["additiveIds"] == list(range(1, 21))
    assert result["additive_reach_then_back"]["additiveIds"] == list(range(1, 41))
    assert result["nested_reach_then_back"]["nestedIds"] == list(range(1, 41))
    assert result["virtual_at_50"]["before"]["virtualMax"] >= 55
    assert result["virtual_at_50"]["virtualIds"] == list(range(50, 58))
    assert result["virtual_reach_then_back"]["reached"]["virtualMax"] >= 55
    assert result["virtual_reach_then_back"]["virtualIds"] == list(range(1, 9))
    assert result["recycled_selected_row"]["initial"]["selected"] == "VIRT-003"
    assert result["recycled_selected_row"]["changed"]["selected"] == "VIRT-052"
    assert result["recycled_selected_row"]["selectedNow"] == ["SELECTED-NOW VIRT-052"]
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chromium", default=shutil.which("chromium") or shutil.which("google-chrome") or "")
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chromium:
        raise SystemExit("Chromium executable not found; use --chromium PATH")
    if args.out:
        out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
        result = asyncio.run(run(args.chromium, out))
        (out / "results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-user-reached-") as tmp:
            result = asyncio.run(run(args.chromium, Path(tmp)))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
