#!/usr/bin/env python3
"""Fresh C18 managed-Chrome probe: Shadow DOM / slots / composed-tree selection boundary."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c18={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c18.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c18.pdf'});return true}})();"""

def text(path):
    rd=PdfReader(str(path)); return '\n'.join((p.extract_text() or '') for p in rd.pages),len(rd.pages)

def command(page,command): return page.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',command)

def setup(page):
    page.set_content("""<!doctype html><meta charset='utf-8'><style>body{font:20px Arial}.box{padding:18px;border:2px solid #444;margin:12px}</style><div id='outside'>C18_OUTSIDE_TOKEN</div><div id='open-host' class='box'><span id='light-slot' slot='main'>C18_SLOTTED_TOKEN</span></div><div id='closed-host' class='box'></div>""",wait_until='load')
    page.evaluate("""()=>{const h=document.getElementById('open-host');const s=h.attachShadow({mode:'open'});s.innerHTML='<style>.inner{display:block;padding:8px}.omit{display:block}</style><div id="shadow-a" class="inner">C18_SHADOW_A</div><div id="shadow-b" class="omit">C18_SHADOW_B</div><slot name="main"></slot>';const c=document.getElementById('closed-host');const cs=c.attachShadow({mode:'closed'});cs.innerHTML='<div id="closed-inner">C18_CLOSED_INNER</div>';globalThis.__closedInner=cs.getElementById('closed-inner')}""")
    page.evaluate(MOCK);page.add_script_tag(content=CONTENT)

def snap(page):
    return page.evaluate("""()=>({includes:[...document.querySelectorAll('[data-webclip-pdf-include]')].map(e=>({id:e.id,tag:e.localName})),excludes:[...document.querySelectorAll('[data-webclip-pdf-exclude]')].map(e=>({id:e.id,tag:e.localName}))})""")

def click(page,expr): page.evaluate(f"()=>{{const e={expr};e.dispatchEvent(new MouseEvent('click',{{bubbles:true,composed:true,cancelable:true}}))}}")

def prepare(page):
    assert command(page,'download')['ok']
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;[...s.querySelectorAll('.modal-actions button')].find(b=>b.textContent.trim()==='Сформировать PDF').click()}""")
    page.wait_for_function("()=>!!globalThis.__c18.lastPdfRequest",timeout=25000)

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
      b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();p=ctx.new_page();setup(p)
      command(p,'start');click(p,"document.getElementById('open-host').shadowRoot.getElementById('shadow-a')");after_inner=snap(p)
      command(p,'mode-exclude');click(p,"document.getElementById('open-host').shadowRoot.getElementById('shadow-b')");after_exclude=snap(p)
      command(p,'clear');command(p,'mode-include');click(p,"document.getElementById('light-slot')");after_slot=snap(p)
      command(p,'clear');click(p,"globalThis.__closedInner");after_closed=snap(p)
      command(p,'clear');click(p,"document.getElementById('open-host')");prepare(p)
      pdf=out/'selected_host.pdf';p.pdf(path=str(pdf),format='A4',print_background=True);t,pages=text(pdf)
      result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'afterOpenShadowInnerClick':after_inner,'afterShadowExcludeClick':after_exclude,'afterSlottedLightClick':after_slot,'afterClosedShadowInnerClick':after_closed,'selectedHostPdf':{'pages':pages,'bytes':pdf.stat().st_size,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'shadowA':'C18_SHADOW_A' in t,'shadowB':'C18_SHADOW_B' in t,'slotted':'C18_SLOTTED_TOKEN' in t,'outside':'C18_OUTSIDE_TOKEN' in t}}
      payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C18_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
      p.evaluate('()=>__resolve()');b.close()
    assert after_inner['includes']==[{'id':'open-host','tag':'div'}],after_inner
    assert after_exclude=={'includes':[{'id':'open-host','tag':'div'}],'excludes':[]},after_exclude
    assert after_slot['includes']==[{'id':'light-slot','tag':'span'}],after_slot
    assert after_closed['includes']==[{'id':'closed-host','tag':'div'}],after_closed
    assert result['selectedHostPdf']['shadowA'] and result['selectedHostPdf']['shadowB'] and result['selectedHostPdf']['slotted'] and not result['selectedHostPdf']['outside'],result
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='c18-')))
if __name__=='__main__':main()
