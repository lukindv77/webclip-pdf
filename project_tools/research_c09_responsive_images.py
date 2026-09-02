#!/usr/bin/env python3
"""Local-first L3/L4 C09 responsive-image fidelity harness.

Research-only: verifies current source invariants, reproduces frame-width and
flattened-<picture> responsive candidate drift in managed Chromium, and prints
physical PDFs with WebClip's screen-media CDP policy. It does not modify runtime.
"""
from __future__ import annotations

import argparse, base64, hashlib, html, io, json, os, pathlib, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
RED = b'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#f00"/></svg>'
BLUE = b'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800"><rect width="1600" height="800" fill="#00f"/></svg>'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_contract() -> dict[str, object]:
    content = (ROOT / 'content.js').read_text(encoding='utf-8')
    worker = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
    required = [
        'meta.resourceReport = await prefetchIncludedResources();',
        "stabilizeSelectedFramePrintHeights('prepared');",
        'flattenSelectedSameOriginBodyFramesForPrint();',
        "const src = source.currentSrc || source.src || '';",
        "target.removeAttribute('srcset');",
        "frame.style.setProperty('width', '100%', 'important');",
    ]
    for marker in required:
        assert marker in content, f'C09 source contract drift: {marker}'
    assert content.index(required[0]) < content.index(required[1]) < content.index(required[2])
    assert "'Emulation.setEmulatedMedia'" in worker and "media: 'screen'" in worker and "'Page.printToPDF'" in worker
    start = content.index('function copyFrameCloneUrlState(source, target)')
    helper = content[start:start + 5000]
    assert "source.currentSrc || source.src" in helper and "target.removeAttribute('srcset');" in helper
    assert "querySelectorAll('source')" not in helper and 'querySelectorAll("source")' not in helper
    return {'content_js_sha256': sha(content.encode()), 'service_worker_js_sha256': sha(worker.encode())}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/red.svg'):
            body = RED
        elif self.path.startswith('/blue-delay.svg'):
            time.sleep(2.5); body = BLUE
        elif self.path.startswith('/blue.svg'):
            body = BLUE
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200); self.send_header('Content-Type', 'image/svg+xml'); self.send_header('Content-Length', str(len(body))); self.end_headers()
        try: self.wfile.write(body)
        except BrokenPipeError: pass
    def log_message(self, *_): pass


def server():
    s = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def esc(s: str) -> str: return html.escape(s, quote=True)


def inspect(pdf: bytes) -> dict[str, object]:
    doc = fitz.open(stream=pdf, filetype='pdf'); red = blue = 0; raster = hashlib.sha256()
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False); png = pix.tobytes('png'); raster.update(png)
        for r, g, b in Image.open(io.BytesIO(png)).convert('RGB').getdata():
            red += int(r >= 220 and g <= 80 and b <= 80); blue += int(b >= 220 and r <= 80 and g <= 80)
    return {'pages': len(doc), 'red_pixels': red, 'blue_pixels': blue, 'raster_sha256': raster.hexdigest()}


def pdf(page, out: pathlib.Path, name: str) -> dict[str, object]:
    cdp = page.context.new_cdp_session(page); cdp.send('Page.enable'); cdp.send('Emulation.setEmulatedMedia', {'media':'screen'})
    t = time.perf_counter(); result = cdp.send('Page.printToPDF', {'displayHeaderFooter':False,'printBackground':True,'scale':1,'preferCSSPageSize':True}); ms = (time.perf_counter()-t)*1000; cdp.detach()
    raw = base64.b64decode(result['data']); (out / f'{name}.pdf').write_bytes(raw)
    return {'pdf_sha256':sha(raw), 'print_ms':round(ms,2), **inspect(raw)}


HELPER = r"""(s,t)=>{const src=s.currentSrc||s.src||'';if(src)t.setAttribute('src',src);t.removeAttribute('srcset');t.removeAttribute('loading');t.style.setProperty('max-width','100%','important');t.style.setProperty('height','auto','important')}"""


def ready(frame): frame.wait_for_function("document.querySelector('img')?.complete && document.querySelector('img')?.naturalWidth>0")


def run(browser, base: str, out: pathlib.Path) -> dict[str, object]:
    tests = {}
    p = browser.new_page(viewport={'width':420,'height':800}, device_scale_factor=1)
    p.set_content(f'<style>@page{{size:A4;margin:0}}body{{margin:0}}img{{width:400px;height:200px}}</style><img id=i src={base}/red.svg srcset="{base}/red.svg 600w, {base}/blue.svg 1600w" sizes=400px>'); ready(p)
    before=p.eval_on_selector('#i','i=>i.currentSrc'); artifact=pdf(p,out,'top_plain_srcset'); after=p.eval_on_selector('#i','i=>i.currentSrc'); p.close()
    assert 'red.svg' in before and 'red.svg' in after and artifact['red_pixels']>10000 and artifact['blue_pixels']<100
    tests['top_plain_srcset_positive']={'before':before,'after':after,'pdf':artifact}

    p=browser.new_page(viewport={'width':1200,'height':800}, device_scale_factor=1)
    child=f'<style>html,body{{margin:0}}img{{display:block;width:100%;height:auto}}</style><img id=i src={base}/red.svg srcset="{base}/red.svg 600w, {base}/blue.svg 1600w" sizes=100vw>'
    p.set_content(f'<style>@page{{size:A4;margin:0}}body{{margin:0}}iframe{{width:420px;height:260px;border:0}}</style><iframe id=f srcdoc="{esc(child)}"></iframe>'); f=p.frames[1]; ready(f)
    admitted=f.eval_on_selector('#i','i=>({src:i.currentSrc,iw:innerWidth,dpr:devicePixelRatio})'); p.eval_on_selector('#f',"f=>{f.style.setProperty('width','100%','important');f.style.setProperty('max-width','100%','important');void f.getBoundingClientRect().width}"); f.wait_for_function("document.querySelector('#i').currentSrc.includes('blue.svg') && document.querySelector('#i').complete")
    mutated=f.eval_on_selector('#i','i=>({src:i.currentSrc,iw:innerWidth,dpr:devicePixelRatio})'); artifact=pdf(p,out,'live_frame_width_mutation'); p.close()
    assert 'red.svg' in admitted['src'] and 'blue.svg' in mutated['src'] and artifact['blue_pixels']>10000
    tests['live_frame_width_mutation_finding']={'admitted':admitted,'mutated':mutated,'pdf':artifact}

    p=browser.new_page(viewport={'width':1200,'height':800}, device_scale_factor=1)
    child=f'<style>html,body{{margin:0}}img{{display:block;width:100%;height:auto}}</style><img id=i src={base}/red.svg srcset="{base}/red.svg 1x, {base}/blue.svg 2x">'
    p.set_content(f'<style>@page{{size:A4;margin:0}}body{{margin:0}}iframe{{width:420px;height:260px;border:0}}</style><iframe id=f srcdoc="{esc(child)}"></iframe>'); f=p.frames[1]; ready(f); before=f.eval_on_selector('#i','i=>({src:i.currentSrc,iw:innerWidth,dpr:devicePixelRatio})'); p.eval_on_selector('#f',"f=>{f.style.setProperty('width','100%','important');f.style.setProperty('max-width','100%','important')}"); p.wait_for_timeout(250); after=f.eval_on_selector('#i','i=>({src:i.currentSrc,iw:innerWidth,dpr:devicePixelRatio})'); artifact=pdf(p,out,'density_1x_negative'); p.close()
    assert 'red.svg' in before['src'] and 'red.svg' in after['src'] and artifact['red_pixels']>10000 and artifact['blue_pixels']<100
    tests['density_1x_width_negative']={'before':before,'after':after,'pdf':artifact}

    for name, picture, freeze, expect_blue in [('plain_img_flatten_positive',False,False,False),('picture_flatten_reselection',True,False,True),('picture_test_only_frozen',True,True,False)]:
        p=browser.new_page(viewport={'width':1200,'height':800}, device_scale_factor=1)
        inner=f'<picture id=p><source media="(min-width:600px)" srcset="{base}/blue.svg"><img id=i src="{base}/red.svg"></picture>' if picture else f'<img id=i src="{base}/red.svg" srcset="{base}/red.svg 600w, {base}/blue.svg 1600w" sizes="400px">'
        child=f'<style>html,body{{margin:0}}img{{width:400px;height:200px}}</style>{inner}'
        p.set_content(f'<style>@page{{size:A4;margin:0}}body{{margin:0}}</style><iframe id=f style="width:420px;height:260px;border:0" srcdoc="{esc(child)}"></iframe><div id=m></div>'); f=p.frames[1]; ready(f); admitted=f.eval_on_selector('#i','i=>i.currentSrc')
        p.evaluate("""([helper,picture,freeze])=>{const f=document.querySelector('#f');const s=f.contentDocument.querySelector(picture?'#p':'#i');const t=s.cloneNode(true);const si=picture?s.querySelector('img'):s;const ti=picture?t.querySelector('img'):t;eval(helper)(si,ti);if(freeze&&picture)t.querySelectorAll('source').forEach(x=>x.remove());document.querySelector('#m').appendChild(t);f.remove()}""", [HELPER,picture,freeze])
        p.wait_for_function("document.querySelector('#m img').complete && document.querySelector('#m img').naturalWidth>0"); proxy=p.eval_on_selector('#m img',"i=>({src:i.currentSrc,srcset:i.getAttribute('srcset'),sources:i.parentElement.querySelectorAll('source').length})"); artifact=pdf(p,out,name); p.close()
        assert 'red.svg' in admitted
        if expect_blue: assert 'blue.svg' in proxy['src'] and proxy['sources']>0 and artifact['blue_pixels']>10000
        else: assert 'red.svg' in proxy['src'] and artifact['red_pixels']>10000 and artifact['blue_pixels']<100
        tests[name]={'admitted':admitted,'proxy':proxy,'pdf':artifact}

    p=browser.new_page(viewport={'width':1200,'height':800}, device_scale_factor=1)
    child=f'<style>html,body{{margin:0}}img{{width:400px;height:200px}}</style><picture id=p><source media="(min-width:600px)" srcset="{base}/blue-delay.svg"><img id=i src="{base}/red.svg"></picture>'
    p.set_content(f'<style>@page{{size:A4;margin:0}}body{{margin:0}}</style><iframe id=f style="width:420px;height:260px;border:0" srcdoc="{esc(child)}"></iframe><div id=m></div>'); f=p.frames[1]; ready(f); admitted=f.eval_on_selector('#i','i=>({src:i.currentSrc,complete:i.complete,nw:i.naturalWidth})')
    p.evaluate("""helper=>{const f=document.querySelector('#f'),s=f.contentDocument.querySelector('#p'),t=s.cloneNode(true);eval(helper)(s.querySelector('img'),t.querySelector('img'));document.querySelector('#m').appendChild(t);f.remove()}""",HELPER); immediate=p.eval_on_selector('#m img','i=>({src:i.currentSrc,complete:i.complete,nw:i.naturalWidth})'); first=pdf(p,out,'delayed_proxy_immediate'); p.wait_for_function("document.querySelector('#m img').currentSrc.includes('blue-delay.svg') && document.querySelector('#m img').complete && document.querySelector('#m img').naturalWidth>0",timeout=6000); settled=p.eval_on_selector('#m img','i=>({src:i.currentSrc,complete:i.complete,nw:i.naturalWidth})'); second=pdf(p,out,'delayed_proxy_settled'); p.close()
    assert 'red.svg' in admitted['src'] and admitted['complete']
    assert 'blue-delay.svg' not in immediate['src'] or not immediate['complete']
    assert first['blue_pixels'] < 10000 and first['print_ms'] < 1000
    assert 'blue-delay.svg' in settled['src'] and second['blue_pixels'] > 10000
    tests['delayed_proxy_readiness_finding']={'admitted':admitted,'immediate_state':immediate,'immediate_pdf':first,'settled_state':settled,'settled_pdf':second}
    return tests


def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('--chrome',default=os.environ.get('CHROME_BIN','')); ap.add_argument('--output',type=pathlib.Path); args=ap.parse_args()
    assert args.chrome and pathlib.Path(args.chrome).exists(), 'Chrome/Chromium required via --chrome or CHROME_BIN'
    contract=source_contract(); out=args.output or pathlib.Path(tempfile.mkdtemp(prefix='webclip-c09-responsive-')); out.mkdir(parents=True,exist_ok=True); s=server(); base=f'http://127.0.0.1:{s.server_address[1]}'
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=args.chrome,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); version=browser.version; tests=run(browser,base,out); browser.close()
    finally: s.shutdown(); s.server_close()
    result={'schema':1,'coordinate':'C09','verdict':'ARTIFACT-COVERED / FINDING + POSITIVE/NEGATIVE/FAILURE CONTROLS','owners':['P0-004','P0-070','P0-075','P1-003','P1-187'],'browser':version,'source_contract':contract,'tests':tests}
    (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2)); return 0

if __name__=='__main__': raise SystemExit(main())
