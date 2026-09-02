#!/usr/bin/env python3
"""Fresh C24 exact-source control for mutually-exclusive named <details> groups."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or "")

MOCK = r"""
(()=>{const listeners=[];let resolvePdf=null;globalThis.__c24n={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c24n.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c24nCommand=(m)=>new Promise((resolve,reject)=>{const fn=listeners[0];if(!fn)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=fn(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c24nResolve=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c24n.pdf'});return true}})();
"""

FIXTURE = r"""<!doctype html><meta charset='utf-8'><style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:18px;background:#eee}#scope{width:760px;margin:14px auto;padding:12px;border:2px solid #555}.omit{padding:12px;background:#fee}
</style><div class='outside'>C24N_OUTSIDE_TOP</div><main id='scope'>
<details id='g1' name='faq'><summary>GROUP_ONE_SUMMARY</summary><p>C24_GROUP_ONE_CONTENT</p></details>
<details id='g2' name='faq'><summary>GROUP_TWO_SUMMARY</summary><p>C24_GROUP_TWO_CONTENT</p></details>
<div class='omit'>C24N_EXCLUDE_TOKEN</div></main><div class='outside'>C24N_OUTSIDE_BOTTOM</div>
<script>window.c24n=()=>({g1:document.querySelector('#g1').open,g2:document.querySelector('#g2').open});</script>"""


def text(path: pathlib.Path) -> tuple[str, int]:
    r=PdfReader(str(path));return "\n".join((p.extract_text() or "") for p in r.pages),len(r.pages)

def pdf_summary(path: pathlib.Path) -> dict:
    t,pages=text(path)
    return {"pages":pages,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"groupOne":"C24_GROUP_ONE_CONTENT" in t,"groupTwo":"C24_GROUP_TWO_CONTENT" in t,"excludePresent":"C24N_EXCLUDE_TOKEN" in t,"outsideTopPresent":"C24N_OUTSIDE_TOP" in t,"outsideBottomPresent":"C24N_OUTSIDE_BOTTOM" in t}

def cmd(page,c): return page.evaluate("c=>__c24nCommand({type:'WEBCLIP_COMMAND',command:c})",c)
def click(page,sel):
    ok=page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",sel);assert ok,sel

def inject(page):
    page.evaluate(MOCK);page.add_script_tag(content=BUDGET);page.add_script_tag(content=INERT);page.add_script_tag(content=HOST_GUARD);page.add_script_tag(content=CONTENT)

def begin_prepare(page):
    assert cmd(page,'download').get('ok') is True
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""")
    page.wait_for_function("()=>!!globalThis.__c24n.lastPdfRequest",timeout=30000)

def current(ctx,out):
    page=ctx.new_page();page.set_viewport_size({'width':1100,'height':850});page.set_content(FIXTURE,wait_until='load');inject(page);assert cmd(page,'start').get('ok') is True;click(page,'#scope');assert cmd(page,'mode-exclude').get('ok') is True;click(page,'.omit');assert cmd(page,'mode-include').get('ok') is True
    before=page.evaluate('()=>c24n()');begin_prepare(page);page.wait_for_timeout(250);prepared=page.evaluate('()=>c24n()');path=out/'named_current.pdf';page.emulate_media(media='screen');page.pdf(path=str(path),format='A4',print_background=True);pdf=pdf_summary(path);assert page.evaluate('()=>__c24nResolve()') is True;page.close();return {'before':before,'prepared':prepared,'pdf':pdf}

def causal(ctx,out):
    page=ctx.new_page();page.set_viewport_size({'width':1100,'height':850});page.set_content(FIXTURE,wait_until='load');before=page.evaluate('()=>c24n()');state=page.evaluate("""()=>{const source=document.querySelector('#scope');const clone=source.cloneNode(true);clone.id='c24n-static';clone.querySelectorAll('.omit').forEach(e=>e.remove());clone.querySelectorAll('details').forEach(d=>d.removeAttribute('name'));clone.querySelectorAll('details').forEach(d=>d.open=true);source.style.display='none';document.querySelectorAll('.outside').forEach(e=>e.style.display='none');document.body.appendChild(clone);return [...clone.querySelectorAll('details')].map(d=>({id:d.id,open:d.open,name:d.getAttribute('name')}))}""");page.wait_for_timeout(100);path=out/'named_causal.pdf';page.emulate_media(media='screen');page.pdf(path=str(path),format='A4',print_background=True);pdf=pdf_summary(path);source_after=page.evaluate('()=>c24n()');page.close();return {'before':before,'staticDetails':state,'sourceAfter':source_after,'pdf':pdf}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'current':current(ctx,out),'causal':causal(ctx,out)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C24_NAMED_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    c=result['current'];assert c['before']=={'g1':False,'g2':False},c;assert c['prepared']['g1'] != c['prepared']['g2'],c;assert c['pdf']['groupOne'] != c['pdf']['groupTwo'],c;assert not c['pdf']['excludePresent'] and not c['pdf']['outsideTopPresent'] and not c['pdf']['outsideBottomPresent'],c
    s=result['causal'];assert all(x['open'] and x['name'] is None for x in s['staticDetails']),s;assert s['sourceAfter']=={'g1':False,'g2':False},s;assert s['pdf']['groupOne'] and s['pdf']['groupTwo'] and not s['pdf']['excludePresent'] and not s['pdf']['outsideTopPresent'] and not s['pdf']['outsideBottomPresent'],s
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args();
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c24n-')))
if __name__=='__main__':main()
