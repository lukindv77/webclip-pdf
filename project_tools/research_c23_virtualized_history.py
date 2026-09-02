#!/usr/bin/env python3
"""Fresh C23 exact-source Chrome probe: virtualized user-reached history -> PDF.

A window-scrolling virtualizer reuses eight DOM rows. Browser wheel input gradually
materializes every logical item 1..57 and then returns to the top, leaving only the
current 1..8 DOM window mounted. The probe drives current content.js selection/save,
prints the prepared artifact, and compares it with a test-only static materialization
of the exact seen history. No nested scrollport is used, avoiding the independent C20
retained-overflow clipping mechanism.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or "")

MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null;
  globalThis.__c23={lastPdfRequest:null};
  globalThis.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(message){
    if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
    if(message?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c23.lastPdfRequest=message;return new Promise(r=>{resolvePdf=r});}
    return Promise.resolve({ok:true});
  }}};
  globalThis.__c23Command=(message)=>new Promise((resolve,reject)=>{const fn=listeners[0];if(!fn)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true});}catch(e){reject(e)}});
  globalThis.__c23ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c23.pdf'});return true;};
})();
"""

FIXTURE = r"""<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}#virtual{height:6400px;position:relative;width:760px;margin:0 auto;border-left:2px solid #555;border-right:2px solid #555}.vrow{position:absolute;left:0;right:0;height:64px;padding:20px 12px;border-bottom:1px solid #bbb;box-sizing:border-box;background:#fff}.static-row{height:64px;padding:20px 12px;border-bottom:1px solid #bbb;box-sizing:border-box}.omit{position:absolute;top:6200px;height:64px;padding:20px 12px;background:#fee;box-sizing:border-box}.outside{height:70px;padding:16px;background:#eee;box-sizing:border-box}
</style><article id="virtual"><div id="pool"></div><div class="omit">C23_EXCLUDE_TOKEN</div></article><div class="outside">C23_OUTSIDE_BOTTOM</div>
<script>
window.c23Page={seen:new Set(),renders:0,maxLogical:0,scrollEvents:0,trustedScrollEvents:0};
const host=document.querySelector('#virtual'),poolHost=document.querySelector('#pool'),pool=[];
for(let i=0;i<8;i++){const d=document.createElement('div');d.className='vrow';poolHost.appendChild(d);pool.push(d);}
function render(){c23Page.renders++;const start=Math.max(0,Math.min(92,Math.floor(scrollY/64)));pool.forEach((d,i)=>{const logical=start+i+1;d.style.top=(logical-1)*64+'px';d.textContent='C23_HIST_'+String(logical).padStart(3,'0');if(logical===1)d.textContent+=' C23_FIRST_SENTINEL';if(logical===57)d.textContent+=' C23_REACHED_LAST';c23Page.seen.add(logical);c23Page.maxLogical=Math.max(c23Page.maxLogical,logical);});}
addEventListener('scroll',e=>{c23Page.scrollEvents++;if(e.isTrusted)c23Page.trustedScrollEvents++;render();},{passive:true});render();
window.c23Metrics=()=>({seen:[...c23Page.seen].sort((a,b)=>a-b),renders:c23Page.renders,maxLogical:c23Page.maxLogical,scrollEvents:c23Page.scrollEvents,trustedScrollEvents:c23Page.trustedScrollEvents,scrollY,current:pool.map(x=>x.textContent.match(/C23_HIST_\d{3}/)?.[0]||'')});
window.c23MaterializeSeen=()=>{const seen=[...c23Page.seen].sort((a,b)=>a-b);poolHost.style.display='none';host.style.height='auto';host.style.position='static';const wrap=document.createElement('div');wrap.id='c23-static-history';for(const logical of seen){const d=document.createElement('div');d.className='static-row';d.textContent='C23_HIST_'+String(logical).padStart(3,'0');if(logical===1)d.textContent+=' C23_FIRST_SENTINEL';if(logical===57)d.textContent+=' C23_REACHED_LAST';wrap.appendChild(d);}host.insertBefore(wrap,host.firstChild);return {count:seen.length,first:seen[0]||0,last:seen[seen.length-1]||0};};
</script>"""


def pdf_summary(path:pathlib.Path)->dict:
    rd=PdfReader(str(path));text='\n'.join((p.extract_text() or '') for p in rd.pages)
    nums=[int(x) for x in re.findall(r'C23_HIST_(\d{3})',text)]
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'ids':sorted(set(nums)),'itemCount':len(set(nums)),'first': 'C23_FIRST_SENTINEL' in text,'reachedLast':'C23_REACHED_LAST' in text,
            'excludePresent':'C23_EXCLUDE_TOKEN' in text,'outsidePresent':'C23_OUTSIDE_BOTTOM' in text}


def cmd(p,c): return p.evaluate("c=>__c23Command({type:'WEBCLIP_COMMAND',command:c})",c)
def click(p,sel):
    ok=p.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true;}""",sel);assert ok,sel

def setup(ctx):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':720});p.set_content(FIXTURE,wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start').get('ok') is True;click(p,'#virtual');assert cmd(p,'mode-exclude').get('ok') is True;click(p,'.omit');assert cmd(p,'mode-include').get('ok') is True;return p

def journey(p):
    p.mouse.move(900,600)
    for _ in range(6): p.mouse.wheel(0,512);p.wait_for_timeout(90)
    p.mouse.wheel(0,64);p.wait_for_timeout(120)
    reached=p.evaluate('()=>c23Metrics()')
    for _ in range(8):
        if p.evaluate('()=>scrollY')<=2: break
        p.mouse.wheel(0,-5000);p.wait_for_timeout(80)
    p.wait_for_timeout(100)
    return reached,p.evaluate('()=>c23Metrics()')

def prepare(p):
    assert cmd(p,'download').get('ok') is True
    p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click();}""")
    p.wait_for_function('()=>!!globalThis.__c23.lastPdfRequest',timeout=30000)
    return p.evaluate('()=>globalThis.__c23.lastPdfRequest')

def finish(p): assert p.evaluate('()=>__c23ResolvePdf()') is True;p.wait_for_timeout(30)
def print_pdf(p,path): p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);return pdf_summary(path)

def current_after_back(ctx,out):
    p=setup(ctx);initial=p.evaluate('()=>c23Metrics()');reached,back=journey(p);req=prepare(p);after_prepare=p.evaluate('()=>c23Metrics()');pdf=print_pdf(p,out/'current_after_back.pdf');after_print=p.evaluate('()=>c23Metrics()');finish(p);p.close();return {'initial':initial,'reached':reached,'back':back,'afterPrepare':after_prepare,'afterPrint':after_print,'pdf':pdf,'selectionIncludes':len(((req or {}).get('meta',{}).get('selectionSnapshot') or {}).get('includes') or [])}

def causal_static_history(ctx,out):
    p=setup(ctx);reached,back=journey(p);prepare(p);materialized=p.evaluate('()=>c23MaterializeSeen()');pdf=print_pdf(p,out/'causal_static_history.pdf');after=p.evaluate('()=>c23Metrics()');finish(p);p.close();return {'reached':reached,'back':back,'materialized':materialized,'afterPrint':after,'pdf':pdf}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'currentAfterBack':current_after_back(ctx,out),'causalStaticHistory':causal_static_history(ctx,out)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C23_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    expected=list(range(1,58));a=result['currentAfterBack'];assert a['reached']['seen']==expected and a['back']['seen']==expected,a;assert a['back']['scrollY']<=2,a;assert a['pdf']['ids']==list(range(1,9)) and a['pdf']['first'] and not a['pdf']['reachedLast'],a;assert not a['pdf']['excludePresent'] and not a['pdf']['outsidePresent'],a
    c=result['causalStaticHistory'];assert c['materialized']['count']==57 and c['pdf']['ids']==expected and c['pdf']['first'] and c['pdf']['reachedLast'],c;assert not c['pdf']['excludePresent'] and not c['pdf']['outsidePresent'],c
    return result

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--chrome',default=CHROME_DEFAULT);ap.add_argument('--out',default='');a=ap.parse_args();
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c23-')))
if __name__=='__main__': main()
