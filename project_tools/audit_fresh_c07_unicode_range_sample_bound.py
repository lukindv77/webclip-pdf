#!/usr/bin/env python3
"""Focused C07 control for bounded font sampleText + unicode-range readiness."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import audit_fresh_c07_fonts_typography as base


def font_file(name):
    p=pathlib.Path(subprocess.check_output(['fc-match','-f','%{file}',name],text=True).strip()); assert p.is_file(),(name,p); return p

class H(BaseHTTPRequestHandler):
    blobs={}; delays={}; hits=[]
    def log_message(self,*_): pass
    def do_GET(self):
        H.hits.append({'path':self.path,'at':time.time()}); time.sleep(H.delays.get(self.path,0)); data=H.blobs.get(self.path)
        if data is None: self.send_response(404); self.end_headers(); return
        self.send_response(200); self.send_header('Content-Type','font/ttf'); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)

def face_states(page):
    return page.evaluate("""()=>[...document.fonts].filter(f=>String(f.family).includes('C07Split')).map(f=>({family:f.family,status:f.status,unicodeRange:f.unicodeRange,style:f.style,weight:f.weight}))""")

def cyr_fonts(path):
    return sorted(set(s['font'] for s in base.pdf_spans(path) if ('ЖЖЖ' in s['text'] or 'КИРИЛЛИЦА' in s['text'])))

def artifact_text(path):
    return ' '.join(s['text'] for s in base.pdf_spans(path))

def is_cyrillic_face(face):
    # Chrome normalizes U+0400-04FF to U+400-4FF, so do not depend on leading zeroes.
    normalized=str(face.get('unicodeRange','')).upper().replace(' ','')
    return 'U+400-4FF' in normalized or 'U+0400-04FF' in normalized

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--chromium',default=os.environ.get('CHROMIUM_BIN','')); ap.add_argument('--out-dir',required=True); a=ap.parse_args(); out=pathlib.Path(a.out_dir); out.mkdir(parents=True,exist_ok=True)
    sans=font_file('DejaVu Sans Mono'); serif=font_file('DejaVu Serif')
    H.blobs={'/ascii.ttf':sans.read_bytes(),'/cyr.ttf':serif.read_bytes()}; H.delays={'/ascii.ttf':0.05,'/cyr.ttf':4.5}; H.hits=[]
    server=ThreadingHTTPServer(('127.0.0.1',0),H); threading.Thread(target=server.serve_forever,daemon=True).start(); port=server.server_address[1]
    try:
      with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); ctx=browser.new_context(); page=ctx.new_page()
        head=f"""<style>@font-face{{font-family:C07Split;src:url(http://127.0.0.1:{port}/ascii.ttf);unicode-range:U+0000-007F;font-display:block}}@font-face{{font-family:C07Split;src:url(http://127.0.0.1:{port}/cyr.ttf);unicode-range:U+0400-04FF;font-display:block}}#scope{{font-family:C07Split,sans-serif;font-size:34px}}</style>"""
        text='ASCII_C07_'+('A'*80)+' КИРИЛЛИЦА_ЖЖЖЖЖ_C07'
        base.load_runtime(page,f"<article id='scope'>{text}</article>",head)
        before=face_states(page); base.select_top(page); t=time.monotonic(); req=base.begin_prepare(page); elapsed=time.monotonic()-t; prepared=face_states(page)
        immediate_path=out/'unicode_range_immediate.pdf'; tpdf=time.monotonic(); immediate=base.print_pdf(page,immediate_path); pdf_elapsed=time.monotonic()-tpdf; after_pdf=face_states(page); immediate_fonts=cyr_fonts(immediate_path); immediate_text=artifact_text(immediate_path)
        page.wait_for_timeout(5000); settled_state=face_states(page); settled_path=out/'unicode_range_settled.pdf'; settled=base.print_pdf(page,settled_path); settled_fonts=cyr_fonts(settled_path); settled_text=artifact_text(settled_path)
        report=req.get('meta',{}).get('resourceReport',{})

        # The current font task is deduplicated by fontSpec and samples only the
        # first bounded direct text slice. The ASCII face is therefore admitted
        # while the later Cyrillic unicode-range face remains loading.
        assert elapsed<2.0,(elapsed,report,H.hits,prepared)
        assert any('/cyr.ttf'==h['path'] for h in H.hits),H.hits
        assert int(report.get('failed',0))==0 and int(report.get('loaded',0))==int(report.get('attempted',0))==1,report
        pending_after_prepare=any(is_cyrillic_face(x) and x['status']!='loaded' for x in prepared)
        assert pending_after_prepare,(prepared,report)
        assert any(is_cyrillic_face(x) and x['status']=='loaded' for x in settled_state),settled_state

        # Physical discriminator: with font-display:block, the selected logical
        # text is absent from the immediate PDF while the report says ready; the
        # same prepared page contains it after the delayed face settles.
        assert 'ASCII_C07_' not in immediate_text and 'КИРИЛЛИЦА' not in immediate_text,(immediate_text,immediate_fonts,prepared)
        assert 'ASCII_C07_' in settled_text and 'КИРИЛЛИЦА' in settled_text,(settled_text,settled_fonts,settled_state)
        assert settled_fonts and 'DejaVuSerif' in settled_fonts,settled_fonts
        assert immediate['sha256']!=settled['sha256'],(immediate,settled)

        result={'accepted':True,'sourceBaseline':'28afa1fe6f29b455574f1e2caf9865f1e957c625','contentSha256':hashlib.sha256(base.CONTENT.encode()).hexdigest(),'chrome':browser.version,'prepareElapsedSec':elapsed,'printElapsedSec':pdf_elapsed,'resourceReport':report,'faceStates':{'before':before,'afterPrepare':prepared,'afterImmediatePdf':after_pdf,'settled':settled_state},'immediate':{'artifact':{k:v for k,v in immediate.items() if k not in ('spans','words')},'cyrillicFonts':immediate_fonts,'selectedTextPresent':False},'settled':{'artifact':{k:v for k,v in settled.items() if k not in ('spans','words')},'cyrillicFonts':settled_fonts,'selectedTextPresent':True},'hits':H.hits,'classification':'P1-003'}
        print(json.dumps(result,ensure_ascii=False,indent=2)); base.resolve_prepare(page); ctx.close(); browser.close(); return 0
    finally: server.shutdown(); server.server_close()

if __name__=='__main__': raise SystemExit(main())
