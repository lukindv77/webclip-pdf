#!/usr/bin/env python3
"""Fresh-restart C11 managed-Chromium / physical-PDF canvas probe.

This harness is research-only. It does not modify extension runtime.
It intentionally avoids cross-origin/tainted-canvas readback as an acceptance
fixture: origin-clean restrictions are a security boundary and are documented
from the HTML Standard instead of being bypassed.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
from pathlib import Path

import fitz
from playwright.async_api import async_playwright

CHROMIUM = "/usr/bin/chromium"
RED_MIN = 180
OTHER_MAX = 90


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def raster_stats(pdf_bytes: bytes) -> dict[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    red = blue = black = 0
    text = []
    for page in doc:
        text.append(page.get_text())
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        samples = pix.samples
        for i in range(0, len(samples), pix.n):
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            if r >= RED_MIN and g <= OTHER_MAX and b <= OTHER_MAX:
                red += 1
            if b >= RED_MIN and r <= OTHER_MAX and g <= OTHER_MAX:
                blue += 1
            if r <= 45 and g <= 45 and b <= 45:
                black += 1
    return {"red": red, "blue": blue, "black": black, "text": "".join(text)}


async def pdf(page, name: str, out_dir: Path) -> dict:
    data = await page.pdf(print_background=True, prefer_css_page_size=True)
    (out_dir / f"{name}.pdf").write_bytes(data)
    stats = raster_stats(data)
    return {
        "sha256": sha256(data),
        "bytes": len(data),
        "red": stats["red"],
        "blue": stats["blue"],
        "black": stats["black"],
        "text": stats["text"].strip(),
    }


CANVAS_SCRIPT = """
(c, color) => {
  c.width = 240;
  c.height = 180;
  c.style.width = '240px';
  c.style.height = '180px';
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
}
"""


async def run() -> dict:
    results: dict[str, object] = {}
    with tempfile.TemporaryDirectory(prefix="webclip-c11-") as tmp:
        out_dir = Path(tmp)
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path=CHROMIUM, headless=True)
            version = browser.version
            page = await browser.new_page(viewport={"width": 900, "height": 700})
            await page.emulate_media(media="screen")

            # 1. Top-document current bitmap: browser/PDF positive control.
            await page.set_content("""
              <style>@page{size:A4;margin:12mm} body{margin:0}</style>
              <canvas id="c">CANVAS-FALLBACK</canvas>
            """)
            await page.eval_on_selector("#c", f"{CANVAS_SCRIPT}", "rgb(255,0,0)")
            results["top_static"] = await pdf(page, "top_static", out_dir)

            # 2. Direct same-origin iframe bitmap positive control.
            await page.set_content("""
              <style>@page{size:A4;margin:12mm} body{margin:0} iframe{border:0;width:260px;height:200px}</style>
              <iframe id="f" srcdoc='<canvas id="c">CANVAS-FALLBACK</canvas><script>const c=document.getElementById("c");c.width=240;c.height=180;const x=c.getContext("2d");x.fillStyle="rgb(255,0,0)";x.fillRect(0,0,240,180);<\/script>'></iframe>
            """)
            frame = page.frames[-1]
            await frame.wait_for_function("document.querySelector('canvas') && document.querySelector('canvas').getContext('2d').getImageData(1,1,1,1).data[0] === 255")
            source_state = await frame.eval_on_selector("canvas", "c => ({width:c.width,height:c.height,pixel:Array.from(c.getContext('2d').getImageData(1,1,1,1).data),fallback:c.textContent})")
            results["iframe_source_state"] = source_state
            results["iframe_direct"] = await pdf(page, "iframe_direct", out_dir)

            # 3. Current production-shaped deep clone: bitmap is not cloned.
            clone_state = await page.evaluate("""
              () => {
                const f = document.getElementById('f');
                const sourceBody = f.contentDocument.body;
                const clone = sourceBody.cloneNode(true);
                const proxy = document.createElement('div');
                proxy.id = 'proxy';
                while (clone.firstChild) proxy.appendChild(clone.firstChild);
                document.body.appendChild(proxy);
                f.style.display = 'none';
                const c = proxy.querySelector('canvas');
                return {width:c.width,height:c.height,fallback:c.textContent};
              }
            """)
            results["clone_before_context"] = clone_state
            results["flattened_clone"] = await pdf(page, "flattened_clone", out_dir)

            # 4. Causal control: materialize source bitmap into target canvas.
            await page.set_content("""
              <style>@page{size:A4;margin:12mm} body{margin:0} iframe{border:0;width:260px;height:200px}</style>
              <iframe id="f" srcdoc='<canvas id="c">CANVAS-FALLBACK</canvas><script>const c=document.getElementById("c");c.width=240;c.height=180;const x=c.getContext("2d");x.fillStyle="rgb(255,0,0)";x.fillRect(0,0,240,180);<\/script>'></iframe>
            """)
            frame = page.frames[-1]
            await frame.wait_for_function("document.querySelector('canvas') && document.querySelector('canvas').getContext('2d').getImageData(1,1,1,1).data[0] === 255")
            copied = await page.evaluate("""
              () => {
                const f = document.getElementById('f');
                const source = f.contentDocument.querySelector('canvas');
                const bodyClone = f.contentDocument.body.cloneNode(true);
                const target = bodyClone.querySelector('canvas');
                target.getContext('2d').drawImage(source, 0, 0);
                document.body.appendChild(bodyClone);
                f.style.display = 'none';
                return Array.from(target.getContext('2d').getImageData(1,1,1,1).data);
              }
            """)
            results["causal_copy_pixel"] = copied
            results["causal_bitmap_copy"] = await pdf(page, "causal_bitmap_copy", out_dir)

            # 5. Narrow generation boundary: a live canvas prints its latest
            # bitmap at render cut. This is supporting evidence for the existing
            # exact-generation/isolation owners, not a separate canvas owner.
            await page.set_content("""
              <style>@page{size:A4;margin:12mm} body{margin:0}</style>
              <canvas id="c">CANVAS-FALLBACK</canvas>
            """)
            await page.eval_on_selector("#c", f"{CANVAS_SCRIPT}", "rgb(255,0,0)")
            admitted_pixel = await page.eval_on_selector("#c", "c => Array.from(c.getContext('2d').getImageData(1,1,1,1).data)")
            await page.eval_on_selector("#c", "c => {const x=c.getContext('2d');x.fillStyle='rgb(0,0,255)';x.fillRect(0,0,c.width,c.height)}")
            results["mutation_admitted_pixel"] = admitted_pixel
            results["mutation_latest_cut"] = await pdf(page, "mutation_latest_cut", out_dir)

            await browser.close()

        results["chromium"] = version

    # Acceptance discriminators: avoid exact pixel counts so renderer raster
    # differences do not turn evidence into brittle product tests.
    assert results["top_static"]["red"] > 10_000
    assert results["iframe_direct"]["red"] > 10_000
    assert results["flattened_clone"]["red"] == 0
    assert results["causal_bitmap_copy"]["red"] > 10_000
    assert results["mutation_latest_cut"]["blue"] > 10_000
    return results


if __name__ == "__main__":
    result = asyncio.run(run())
    encoded = json.dumps(result, sort_keys=True, ensure_ascii=False, indent=2).encode("utf-8")
    print(encoded.decode("utf-8"))
    print("RESULT_SHA256", sha256(encoded))
