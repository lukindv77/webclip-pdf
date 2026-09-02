#!/usr/bin/env python3
"""Fresh-restart C14 managed-Chromium / physical-PDF pseudo/generated-content probe.

Research-only harness. It validates the current element-only resource scan and
flattened-frame style-materialization boundaries, then physically separates:
- direct Chromium generated-content support;
- selection-dependent counter semantics;
- pseudo-only resource readiness;
- same-origin flattened pseudo-state loss.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import shutil
from pathlib import Path

import fitz
from playwright.async_api import async_playwright

CHROMIUM = shutil.which("chromium") or "/usr/bin/chromium"

STYLE_PROPERTIES = [
    "display", "float", "clear", "box-sizing",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-radius", "font-family", "font-size", "font-weight", "font-style", "line-height",
    "color", "text-align", "text-decoration-line", "text-decoration-color", "text-decoration-style",
    "text-indent", "text-transform", "white-space", "word-break", "overflow-wrap", "letter-spacing",
    "vertical-align", "list-style-type", "list-style-position", "background-color", "background-image",
    "background-repeat", "background-position", "background-size", "border-collapse", "border-spacing",
    "table-layout", "caption-side",
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_text(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text("text") for page in doc)


def red_pixels(data: bytes) -> int:
    doc = fitz.open(stream=data, filetype="pdf")
    total = 0
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        samples = pix.samples
        for i in range(0, len(samples), pix.n):
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            if r >= 180 and g <= 100 and b <= 100:
                total += 1
    return total


def validate_current_source(repo_root: Path) -> dict[str, object]:
    path = repo_root / "content.js"
    source = path.read_text(encoding="utf-8")

    prefetch_start = source.find("async function prefetchIncludedResources() {")
    prefetch_end = source.find("function restoreTemporaryResourceAttributes", prefetch_start)
    assert prefetch_start >= 0 and prefetch_end > prefetch_start
    prefetch = source[prefetch_start:prefetch_end]
    assert "getComputedStyle?.(element)" in prefetch
    assert "style.backgroundImage" in prefetch
    assert "getComputedStyle?.(element, '::before')" not in prefetch
    assert 'getComputedStyle?.(element, "::before")' not in prefetch
    assert "getComputedStyle?.(element, '::after')" not in prefetch
    assert 'getComputedStyle?.(element, "::after")' not in prefetch

    flatten_start = source.find("function createFlattenedBodyFramePrintProxy(frame, sourceBody) {")
    flatten_end = source.find("function removeFlattenedFramePrintProxies", flatten_start)
    assert flatten_start >= 0 and flatten_end > flatten_start
    flatten = source[flatten_start:flatten_end]
    assert "node.cloneNode(true)" in flatten
    assert "copyComputedFrameCloneStyle(sourceElements[index], target)" in flatten
    assert "::before" not in flatten and "::after" not in flatten and "::marker" not in flatten

    return {
        "content_sha256": sha256(path.read_bytes()),
        "prefetch_segment_sha256": sha256(prefetch.encode("utf-8")),
        "flatten_segment_sha256": sha256(flatten.encode("utf-8")),
        "pseudo_resource_scan": False,
        "pseudo_flatten_materialization": False,
    }


async def save_pdf(page) -> dict[str, object]:
    data = await page.pdf(print_background=True)
    return {
        "sha256": sha256(data),
        "bytes": len(data),
        "text": pdf_text(data),
        "red_pixels": red_pixels(data),
    }


async def run(repo_root: Path) -> dict[str, object]:
    result: dict[str, object] = {"source_contract": validate_current_source(repo_root)}

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROMIUM, headless=True)
        result["chromium"] = browser.version

        # Positive control: direct Chromium PDF renders ordinary generated text.
        page = await browser.new_page(viewport={"width": 900, "height": 700})
        await page.set_content("""
          <style>@page{size:A4;margin:10mm}body{font:24px Arial}
          #x::before{content:'BEFORE_TOKEN '}
          #x::after{content:' AFTER_TOKEN'}</style>
          <div id=x>BODY_TOKEN</div>
        """)
        result["top_generated_text"] = await save_pdf(page)
        await page.close()

        # Fresh P0-004 discriminator: generated counter value depends on hidden
        # unselected counter-incrementing siblings.
        page = await browser.new_page(viewport={"width": 900, "height": 700})
        await page.set_content("""
          <style>@page{size:A4;margin:10mm}body{font:24px Arial}
          ol{counter-reset:item}li{counter-increment:item;list-style:none}
          li::before{content:counter(item) '. '}</style>
          <ol><li>ALPHA</li><li>BETA</li><li id=g>GAMMA</li></ol>
        """)
        result["counter_full"] = await save_pdf(page)
        await page.add_style_tag(content="li:not(#g){display:none!important}")
        result["counter_selected_only"] = await save_pdf(page)
        await page.close()

        # Fresh P1-187 discriminator: child-head pseudo rules are not represented
        # when body DOM and the current real-element computed-style allowlist are
        # flattened into the top document.
        page = await browser.new_page(viewport={"width": 900, "height": 700})
        await page.set_content("<style>@page{size:A4;margin:10mm}body{font:24px Arial}</style><iframe id=f style='width:700px;height:250px;border:0'></iframe>")
        srcdoc = """<!doctype html><style>body{font:24px Arial}.x::before{content:'FRAME_BEFORE '}.x::after{content:' FRAME_AFTER'}</style><div class=x>FRAME_BODY</div>"""
        await page.eval_on_selector("#f", "(f,h)=>f.srcdoc=h", srcdoc)
        await page.wait_for_timeout(200)
        result["frame_direct"] = await save_pdf(page)

        result["frame_flatten_state"] = await page.evaluate(
            """
            (styleProps) => {
              const f=document.querySelector('#f'), d=f.contentDocument, body=d.body;
              const proxy=document.createElement('section');
              proxy.setAttribute('data-webclip-pdf-flattened-frame','1');
              for(const n of [...body.childNodes]) proxy.appendChild(n.cloneNode(true));
              const source=[body,...body.querySelectorAll('*')];
              const target=[proxy,...proxy.querySelectorAll('*')];
              for(let i=0;i<Math.min(source.length,target.length,2500);i++){
                const cs=d.defaultView.getComputedStyle(source[i]);
                for(const prop of styleProps){
                  const value=cs.getPropertyValue(prop);
                  if(value) target[i].style.setProperty(prop,value,'important');
                }
              }
              const sx=d.querySelector('.x'), tx=proxy.querySelector('.x');
              const admittedBefore=d.defaultView.getComputedStyle(sx,'::before').content;
              const admittedAfter=d.defaultView.getComputedStyle(sx,'::after').content;
              document.body.appendChild(proxy); f.style.display='none';
              return {
                admittedBefore, admittedAfter,
                proxyBefore:getComputedStyle(tx,'::before').content,
                proxyAfter:getComputedStyle(tx,'::after').content
              };
            }
            """,
            STYLE_PROPERTIES,
        )
        result["frame_flattened"] = await save_pdf(page)

        # Causal control: materialize just the admitted generated text into the
        # already static representation. This does not recreate child CSS/live JS.
        await page.evaluate("""
          () => {
            const f=document.querySelector('#f'), d=f.contentDocument, sx=d.querySelector('.x');
            const tx=document.querySelector('section[data-webclip-pdf-flattened-frame] .x');
            const clean = value => {
              const v=String(value||'');
              if(!v || v==='none' || v==='normal') return '';
              return v.replace(/^["']|["']$/g,'');
            };
            const before=clean(f.contentWindow.getComputedStyle(sx,'::before').content);
            const after=clean(f.contentWindow.getComputedStyle(sx,'::after').content);
            if(before){const span=document.createElement('span');span.textContent=before;tx.prepend(span)}
            if(after){const span=document.createElement('span');span.textContent=after;tx.append(span)}
          }
        """)
        result["frame_causal_materialized"] = await save_pdf(page)
        await page.close()

        # Fresh P1-003 discriminator: pseudo-only background dependency is not
        # visible to the current element-only scanner; Page.printToPDF completes
        # before the delayed resource settles.
        page = await browser.new_page(viewport={"width": 900, "height": 700})

        async def slow_red(route):
            await asyncio.sleep(2.5)
            await route.fulfill(
                status=200,
                content_type="image/svg+xml",
                body="<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><rect width='300' height='100' fill='red'/></svg>",
            )

        await page.route("https://slow.test/red.svg", slow_red)
        await page.set_content("""
          <style>@page{size:A4;margin:10mm}body{margin:0}#x{width:350px;height:150px}
          #x::before{content:'';display:block;width:300px;height:100px;
          background:url('https://slow.test/red.svg') no-repeat 0 0/300px 100px}</style>
          <div id=x></div>
        """, wait_until="domcontentloaded")
        result["pseudo_resource_styles"] = await page.evaluate("""
          () => {const x=document.querySelector('#x');return {
            elementBackground:getComputedStyle(x).backgroundImage,
            beforeBackground:getComputedStyle(x,'::before').backgroundImage
          }}
        """)
        result["pseudo_resource_immediate"] = await save_pdf(page)
        await page.wait_for_timeout(2800)
        result["pseudo_resource_settled"] = await save_pdf(page)
        await page.close()
        await browser.close()

    assert "BEFORE_TOKEN BODY_TOKEN AFTER_TOKEN" in result["top_generated_text"]["text"].replace("\n", " ")
    assert "3. GAMMA" in result["counter_full"]["text"]
    assert "1. GAMMA" in result["counter_selected_only"]["text"]
    assert "FRAME_BEFORE FRAME_BODY FRAME_AFTER" in result["frame_direct"]["text"].replace("\n", " ")
    assert result["frame_flatten_state"]["proxyBefore"] == "none"
    assert result["frame_flatten_state"]["proxyAfter"] == "none"
    assert "FRAME_BEFORE" not in result["frame_flattened"]["text"]
    assert "FRAME_AFTER" not in result["frame_flattened"]["text"]
    assert "FRAME_BEFORE FRAME_BODY FRAME_AFTER" in result["frame_causal_materialized"]["text"].replace("\n", " ")
    assert result["pseudo_resource_styles"]["elementBackground"] == "none"
    assert "slow.test/red.svg" in result["pseudo_resource_styles"]["beforeBackground"]
    assert result["pseudo_resource_immediate"]["red_pixels"] == 0
    assert result["pseudo_resource_settled"]["red_pixels"] > 20_000
    return result


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    data = asyncio.run(run(repo_root))
    encoded = json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
    print(encoded.decode("utf-8"))
    print("RESULT_SHA256", sha256(encoded))
