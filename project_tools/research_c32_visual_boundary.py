#!/usr/bin/env python3
"""Supplementary C32 raster control for visible paint across forced page boundaries."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile
import fitz
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c32v={last:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c32v.last=m;return new Promise(r=>resolvePdf=r)}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let d=false;const s=x=>{if(!d){d=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!d)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c32v.pdf'});return true}})();"""
STYLE="""<style>html,body{margin:0;padding:0}body{font:18px Arial}.scope{width:800px;margin:10px auto}.row{height:54px;padding:14px;box-sizing:border-box}.force{break-before:page}.red{background:#ff0000;color:#000;height:120px;padding:32px;box-sizing:border-box}.green{background:#00ff00;color:#000;height:120px;padding:32px;box-sizing:border-box}.omit{height:50px;background:#fee}.outside{height:50px;background:#eee}</style>"""

def cmd(p,c):return p.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def dispatch(p,sel):assert p.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}",sel)
def begin(p):
    assert cmd(p,'download')['ok'];p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;[...s.querySelectorAll('.modal-actions button')].find(b=>b.textContent.trim()==='Сформировать PDF').click()}""");p.wait_for_function('()=>!!globalThis.__c32v.last',timeout=30000)
def raster_counts(path):
    doc=fitz.open(path);pages=[]
    for page in doc:
        pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);s=pix.samples;n=pix.n;red=green=0
        for i in range(0,len(s),n):
            r,g,b=s[i],s[i+1],s[i+2]
            if r>=220 and g<=50 and b<=50:red+=1
            if g>=220 and r<=50 and b<=50:green+=1
        pages.append({'redPixels':red,'greenPixels':green})
    doc.close();return pages

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C32V_OUTSIDE</div><article id='scope' class='scope'><div class='red'>C32V_RED_BEFORE</div><div class='omit'>C32V_EXCLUDE</div><section class='force'><div class='green'>C32V_GREEN_AFTER</div><div class='row'>C32V_TAIL</div></section></article>"
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);version=b.version;p=b.new_page(viewport={'width':1100,'height':800});p.set_content(html,wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start')['ok'];dispatch(p,'#scope');assert cmd(p,'mode-exclude')['ok'];dispatch(p,'.omit');assert cmd(p,'mode-include')['ok'];begin(p);computed=p.evaluate("()=>getComputedStyle(document.querySelector('.force')).breakBefore");path=out/'visual_boundary.pdf';p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);pages=raster_counts(path);assert p.evaluate('()=>__resolve()') is True;b.close()
    result={'browserVersion':version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'breakBefore':computed,'pages':pages,'pdfSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pdfBytes':path.stat().st_size}
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C32_VISUAL_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    assert computed in ('page','always'),result
    assert len(pages)>=2 and pages[0]['redPixels']>1000 and pages[0]['greenPixels']<100 and pages[1]['greenPixels']>1000,result
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c32v-')))
if __name__=='__main__':main()
