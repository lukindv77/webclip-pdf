#!/usr/bin/env python3
"""Temporary focused C08 raster image / crop / object-fit physical-PDF audit."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import pathlib
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
ACTIVATION_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null;
  globalThis.__c08={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c08.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c08Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn) return reject(new Error('content listener missing'));
    let done=false; const send=(v)=>{if(!done){done=true;resolve(v)}};
    try { const ret=fn(message,{},send); if(ret!==true&&!done) send({ok:true}); }
    catch(error){reject(error)}
  });
  globalThis.__c08ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c08.pdf'});return true};
})();
"""

BASE_STYLE = """
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;background:white;padding:24px}
#scope{box-sizing:border-box;width:720px;padding:20px;background:white;color:#111}
</style>
"""

TARGETS = {
    "red": ((235, 35, 35), 45),
    "blue": ((35, 70, 235), 45),
    "green": ((35, 190, 80), 45),
    "magenta": ((220, 35, 190), 45),
}


def png_bytes_split() -> bytes:
    im = Image.new("RGB", (400, 200), (235, 35, 35))
    for x in range(200, 400):
        for y in range(200):
            im.putpixel((x, y), (35, 70, 235))
    out = io.BytesIO(); im.save(out, format="PNG"); return out.getvalue()


def png_bytes_solid(rgb) -> bytes:
    im = Image.new("RGB", (320, 180), rgb)
    out = io.BytesIO(); im.save(out, format="PNG"); return out.getvalue()


class ImageHandler(BaseHTTPRequestHandler):
    split = png_bytes_split()
    magenta = png_bytes_solid((220, 35, 190))
    slow_delay = 4.0
    def log_message(self, *_): pass
    def do_GET(self):
        if self.path.startswith('/split.png'):
            body = self.split
        elif self.path.startswith('/slow.png'):
            time.sleep(self.slow_delay); body = self.magenta
        elif self.path.startswith('/missing.png'):
            self.send_response(404); self.end_headers(); return
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header('Content-Type', 'image/png')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)


def image_server():
    server = ThreadingHTTPServer(('127.0.0.1', 0), ImageHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def sha256_path(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(page, payload):
    return page.evaluate("p=>__c08Command(p)", payload)


def load_runtime(page, html: str, extra_head: str = "") -> None:
    page.set_viewport_size({"width": 1100, "height": 900})
    page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}{extra_head}</head><body>{html}</body></html>", wait_until="domcontentloaded")
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET_GUARD)
    page.add_script_tag(content=INERT_GUARD)
    page.add_script_tag(content=ACTIVATION_GUARD)
    page.add_script_tag(content=CONTENT)
    page.emulate_media(media="screen")


def start(page):
    result = command(page, {"type":"WEBCLIP_COMMAND", "command":"start"})
    assert result.get("ok") is True, result


def select_top(page, selector="#scope"):
    start(page)
    page.locator(selector).click(position={"x": 8, "y": 8})
    assert page.locator('[data-webclip-pdf-include]').count() == 1


def select_frame_body(page, frame_selector="#child"):
    start(page)
    page.frame_locator(frame_selector).locator("body").click(position={"x": 8, "y": 8})
    live = page.evaluate("""()=>{let n=0;const seen=new Set();const visit=d=>{if(!d||seen.has(d))return;seen.add(d);n+=d.querySelectorAll('[data-webclip-pdf-include]').length;for(const f of d.querySelectorAll('iframe,frame')){try{visit(f.contentDocument)}catch(_){}}};visit(document);return n}""")
    assert live == 1, live


def modal_click(page):
    ok = page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    assert ok


def begin_prepare(page):
    result = command(page, {"type":"WEBCLIP_COMMAND", "command":"download"})
    assert result.get("ok") is True, result
    modal_click(page)
    page.wait_for_function("()=>!!globalThis.__c08.lastPdfRequest", timeout=25000)
    return page.evaluate("()=>globalThis.__c08.lastPdfRequest")


def resolve_prepare(page):
    assert page.evaluate("()=>__c08ResolvePdf()") is True
    page.wait_for_timeout(30)


def color_counts_png(path: pathlib.Path):
    counts = {name: 0 for name in TARGETS}
    with Image.open(path).convert("RGB") as im:
        for rgb in im.getdata():
            for name, (target, tol) in TARGETS.items():
                if all(abs(rgb[j] - target[j]) <= tol for j in range(3)):
                    counts[name] += 1
    return counts


def color_counts_pdf(path: pathlib.Path):
    counts = {name: 0 for name in TARGETS}
    with fitz.open(path) as doc:
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            data = pix.samples; n = pix.n
            for i in range(0, len(data), n):
                rgb = (data[i], data[i+1], data[i+2])
                for name, (target, tol) in TARGETS.items():
                    if all(abs(rgb[j] - target[j]) <= tol for j in range(3)):
                        counts[name] += 1
    return counts


def print_pdf(page, path: pathlib.Path):
    page.pdf(path=str(path), format="A4", print_background=True)
    return {"bytes": path.stat().st_size, "sha256": sha256_path(path), "colors": color_counts_pdf(path)}


def run_object_fit_case(ctx, out, port, name, css, expectation):
    page = ctx.new_page()
    html = f"<article id='scope'><img id='hero' src='http://127.0.0.1:{port}/split.png' style='{css}'></article>"
    load_runtime(page, html)
    page.wait_for_function("()=>hero.complete && hero.naturalWidth===400")
    src = page.locator('#hero').evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,fit:s.objectFit,pos:s.objectPosition}}""")
    shot = out / f"{name}_source.png"; page.locator('#hero').screenshot(path=str(shot)); source_colors = color_counts_png(shot)
    select_top(page); request = begin_prepare(page)
    pdf = out / f"{name}.pdf"; artifact = print_pdf(page, pdf)
    colors = artifact['colors']
    if expectation == 'red-dominant':
        assert source_colors['red'] > source_colors['blue'] * 4, source_colors
        assert colors['red'] > colors['blue'] * 4, colors
    elif expectation == 'blue-dominant':
        assert source_colors['blue'] > source_colors['red'] * 4, source_colors
        assert colors['blue'] > colors['red'] * 4, colors
    elif expectation == 'contain':
        assert source_colors['green'] > 1000 and source_colors['red'] > 1000 and source_colors['blue'] > 1000, source_colors
        assert colors['green'] > 1000 and colors['red'] > 1000 and colors['blue'] > 1000, colors
    else:
        raise AssertionError(expectation)
    result = {"sourceStyle": src, "sourceColors": source_colors, "resourceReport": request.get('meta',{}).get('resourceReport',{}), "artifact": artifact}
    resolve_prepare(page); page.close(); return result


def run_delayed_image(ctx, out, port):
    page = ctx.new_page(); load_runtime(page, "<article id='scope'><img id='hero' style='width:320px;height:180px;object-fit:cover'></article>")
    select_top(page)
    page.evaluate("p=>{hero.src=p}", f"http://127.0.0.1:{port}/slow.png?{time.time_ns()}")
    t0 = time.monotonic(); request = begin_prepare(page); elapsed = time.monotonic() - t0
    artifact = print_pdf(page, out / 'delayed_image.pdf'); report = request.get('meta',{}).get('resourceReport',{})
    assert elapsed > 2.5, (elapsed, report)
    assert artifact['colors']['magenta'] > 1000, artifact
    assert int(report.get('failed',0)) == 0, report
    result = {"prepareElapsedSec": elapsed, "resourceReport": report, "artifact": artifact}
    resolve_prepare(page); page.close(); return result


def run_broken_image(ctx, out, port):
    page = ctx.new_page(); load_runtime(page, "<article id='scope'><img id='hero' alt='C08_BROKEN' style='width:320px;height:180px;object-fit:cover'></article>")
    select_top(page)
    page.evaluate("p=>{hero.src=p}", f"http://127.0.0.1:{port}/missing.png?{time.time_ns()}")
    request = begin_prepare(page); report = request.get('meta',{}).get('resourceReport',{})
    artifact = print_pdf(page, out / 'broken_image.pdf')
    assert int(report.get('failed',0)) >= 1, report
    failures = report.get('failures') or []
    assert any(str(x.get('kind','')) == 'image' for x in failures if isinstance(x, dict)), failures
    result = {"resourceReport": report, "artifact": artifact}
    resolve_prepare(page); page.close(); return result


def run_flattened_object_fit(ctx, out, port):
    child = f"""<!doctype html><meta charset='utf-8'><style>
      html,body{{margin:0;padding:0;background:white}}body{{padding:20px}}
      .hero{{display:block;width:220px;height:220px;object-fit:cover;object-position:left center;background:#23be50}}
    </style><img class='hero' src='http://127.0.0.1:{port}/split.png'>"""
    page = ctx.new_page(); load_runtime(page, "<div>TOP_UNSELECTED</div><iframe id='child' style='width:520px;height:340px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}', child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.querySelector('.hero')?.complete===true")
    source_style = page.frame_locator('#child').locator('.hero').evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,fit:s.objectFit,pos:s.objectPosition}}""")
    source_png = out / 'flattened_source.png'; page.frame_locator('#child').locator('.hero').screenshot(path=str(source_png)); source_colors = color_counts_png(source_png)
    assert source_colors['red'] > source_colors['blue'] * 4, (source_style, source_colors)

    select_frame_body(page); request = begin_prepare(page)
    command(page, {"type":"WEBCLIP_PRINT_RENDER_STATE", "hidden":True})
    proxy = page.locator('section[data-webclip-pdf-flattened-frame]').first.locator('.hero')
    proxy.wait_for(state='attached', timeout=5000)
    proxy_style = proxy.evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,fit:s.objectFit,pos:s.objectPosition}}""")
    proxy_png = out / 'flattened_proxy.png'; proxy.screenshot(path=str(proxy_png)); proxy_colors = color_counts_png(proxy_png)
    artifact = print_pdf(page, out / 'flattened_object_fit.pdf')

    assert source_style['width'] == 220 and source_style['height'] == 220, source_style
    assert source_style['fit'] == 'cover' and source_style['pos'].startswith('0%'), source_style
    assert abs(proxy_style['width'] - 400) < 3 and abs(proxy_style['height'] - 200) < 3, proxy_style
    assert proxy_style['fit'] == 'fill' and proxy_style['pos'].startswith('50%'), proxy_style
    assert proxy_colors['red'] > 1000 and proxy_colors['blue'] > 1000, proxy_colors
    assert artifact['colors']['red'] > 1000 and artifact['colors']['blue'] > 1000, artifact

    result = {
      "sourceStyle": source_style, "proxyStyle": proxy_style,
      "sourceColors": source_colors, "proxyColors": proxy_colors,
      "resourceReport": request.get('meta',{}).get('resourceReport',{}),
      "artifact": artifact,
    }
    resolve_prepare(page); page.close(); return result


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument('--out-dir', required=True); args = ap.parse_args()
    out = pathlib.Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
    assert CHROMIUM_DEFAULT and pathlib.Path(CHROMIUM_DEFAULT).exists(), CHROMIUM_DEFAULT
    server = image_server(); port = server.server_address[1]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROMIUM_DEFAULT, headless=True, args=['--no-sandbox'])
            ctx = browser.new_context(viewport={"width":1100,"height":900})
            result = {
              "browser": browser.version,
              "contentSha256": hashlib.sha256(CONTENT.encode('utf-8')).hexdigest(),
              "coverLeft": run_object_fit_case(ctx,out,port,'cover_left','display:block;width:220px;height:220px;object-fit:cover;object-position:left center;background:#23be50','red-dominant'),
              "coverRight": run_object_fit_case(ctx,out,port,'cover_right','display:block;width:220px;height:220px;object-fit:cover;object-position:right center;background:#23be50','blue-dominant'),
              "contain": run_object_fit_case(ctx,out,port,'contain','display:block;width:220px;height:220px;object-fit:contain;object-position:center;background:#23be50','contain'),
              "delayed": run_delayed_image(ctx,out,port),
              "broken": run_broken_image(ctx,out,port),
              "flattened": run_flattened_object_fit(ctx,out,port),
            }
            result['accepted'] = True
            browser.close()
    finally:
        server.shutdown(); server.server_close()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    (out / 'summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
