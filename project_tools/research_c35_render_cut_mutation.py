#!/usr/bin/env python3
"""Fresh C35 managed-Chrome L4 probe: preparation/render-cut mutation windows.

Safe synthetic fixture only. Loads exact current WebClip guards/content.js, drives actual
selection/download preparation, then reproduces the current pdf-print-guard ordering:
render-state hide -> CDP script-disable -> Page.printToPDF -> script-enable -> render-state restore.
"""
from __future__ import annotations

import argparse, base64, hashlib, json, os, pathlib, shutil, tempfile
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
BUDGET=(ROOT/'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT=(ROOT/'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST=(ROOT/'host-control-activation-guard.js').read_text(encoding='utf-8')
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c35={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c35.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c35Deliver=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c35Resolve=()=>{if(!resolvePdf)return false;const f=resolvePdf;resolvePdf=null;f({ok:true,filename:'c35.pdf'});return true}})();"""

STYLE="""<style>@page{size:A4;margin:12mm}html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:16px;background:#eee}#scope{margin:30px;padding:18px;border:2px solid #333}.omit{padding:8px;background:#fee}</style>"""

FIXTURE=f"""<!doctype html><meta charset='utf-8'>{STYLE}
<div class='outside'>C35_OUTSIDE</div>
<main id='scope'><p>C35_ADMITTED_BASE</p><div class='omit'>C35_EXCLUDE</div></main>
<script>
window.c35Page={{prepObserver:0,renderStateObserver:0,beforeprint:0,beforeMicrotask:0,afterprint:0,postcut:0,mutations:0}};
const scope=document.querySelector('#scope');
function add(id,text){{if(document.getElementById(id))return;const p=document.createElement('p');p.id=id;p.textContent=text;scope.appendChild(p)}}
new MutationObserver(ms=>{{
  c35Page.mutations+=ms.length;
  for(const m of ms){{
    if(m.type==='childList') for(const n of m.addedNodes){{if(n?.id==='webclip-pdf-header'){{c35Page.prepObserver++;add('prepMutation','C35_PREP_OBSERVER_MUTATION')}}}}
    if(m.type==='attributes'&&m.attributeName==='style'&&m.target?.id==='webclip-pdf-extension-root'&&getComputedStyle(m.target).display==='none'){{c35Page.renderStateObserver++;add('renderStateMutation','C35_RENDERSTATE_OBSERVER_MUTATION')}}
  }}
}}).observe(document.documentElement,{{subtree:true,childList:true,attributes:true,attributeFilter:['style']}});
addEventListener('beforeprint',()=>{{c35Page.beforeprint++;add('beforePrintMutation','C35_BEFOREPRINT_MUTATION');queueMicrotask(()=>{{c35Page.beforeMicrotask++;add('beforeMicrotask','C35_BEFOREPRINT_MICROTASK')}})}});
addEventListener('afterprint',()=>{{c35Page.afterprint++;add('afterPrintMutation','C35_AFTERPRINT_MUTATION')}});
window.c35Metrics=()=>({{...c35Page,prepPresent:!!document.querySelector('#prepMutation'),renderStatePresent:!!document.querySelector('#renderStateMutation'),beforePresent:!!document.querySelector('#beforePrintMutation'),beforeMicrotaskPresent:!!document.querySelector('#beforeMicrotask'),afterPresent:!!document.querySelector('#afterPrintMutation'),postcutPresent:!!document.querySelector('#postcutMutation')}});
window.c35Postcut=()=>{{c35Page.postcut++;add('postcutMutation','C35_POSTCUT_MUTATION')}};
</script>"""

DIRECT=f"""<!doctype html><meta charset='utf-8'>{STYLE}<main id='scope'><p>C35_DIRECT_BASE</p></main><script>window.d={{before:0,micro:0,after:0}};addEventListener('beforeprint',()=>{{d.before++;const a=document.createElement('p');a.textContent='C35_DIRECT_BEFOREPRINT';scope.appendChild(a);queueMicrotask(()=>{{d.micro++;const b=document.createElement('p');b.textContent='C35_DIRECT_MICROTASK';scope.appendChild(b)}})}});addEventListener('afterprint',()=>d.after++);</script>"""

def pdf_text(path):
    return '\n'.join((p.extract_text() or '') for p in PdfReader(str(path)).pages)

def pdf_summary(path):
    text=pdf_text(path)
    keys=['C35_ADMITTED_BASE','C35_PREP_OBSERVER_MUTATION','C35_RENDERSTATE_OBSERVER_MUTATION','C35_BEFOREPRINT_MUTATION','C35_BEFOREPRINT_MICROTASK','C35_AFTERPRINT_MUTATION','C35_POSTCUT_MUTATION','C35_DIRECT_BASE','C35_DIRECT_BEFOREPRINT','C35_DIRECT_MICROTASK','C35_EXCLUDE','C35_OUTSIDE']
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'present':{k:(k in text) for k in keys}}

def cdp_pdf(page,path,disable_scripts=False):
    cdp=page.context.new_cdp_session(page);cdp.send('Page.enable');cdp.send('Emulation.setEmulatedMedia',{'media':'screen'})
    if disable_scripts:cdp.send('Emulation.setScriptExecutionDisabled',{'value':True})
    try:
        r=cdp.send('Page.printToPDF',{'printBackground':True,'displayHeaderFooter':False,'preferCSSPageSize':True,'transferMode':'ReturnAsBase64'});path.write_bytes(base64.b64decode(r['data']))
    finally:
        if disable_scripts:cdp.send('Emulation.setScriptExecutionDisabled',{'value':False})
        cdp.detach()

def inject(page):page.evaluate(MOCK);page.add_script_tag(content=BUDGET);page.add_script_tag(content=INERT);page.add_script_tag(content=HOST);page.add_script_tag(content=CONTENT)
def deliver(page,msg):return page.evaluate('(m)=>__c35Deliver(m)',msg)
def cmd(page,c):return deliver(page,{'type':'WEBCLIP_COMMAND','command':c})
def select(page):
    assert cmd(page,'start').get('ok');page.evaluate("()=>scope.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(page,'mode-exclude').get('ok');page.evaluate("()=>document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(page,'mode-include').get('ok')
def prepare(page):
    assert cmd(page,'download').get('ok');page.evaluate("()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot,b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');b.click()}");page.wait_for_function("()=>!!__c35.lastPdfRequest",timeout=30000);page.wait_for_timeout(0);return page.evaluate('()=>__c35.lastPdfRequest')
def finish(page):assert page.evaluate('()=>__c35Resolve()') is True

def direct_control(ctx,out):
    p=ctx.new_page();p.set_content(DIRECT,wait_until='load');path=out/'direct_beforeprint.pdf';cdp_pdf(p,path,False);state=p.evaluate('()=>({...d})');pdf=pdf_summary(path);p.close();return {'state':state,'pdf':pdf}

def current_guarded(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1000,'height':760});p.set_content(FIXTURE,wait_until='load');inject(p);select(p);admission=p.evaluate('()=>c35Metrics()');request=prepare(p);after_prepare=p.evaluate('()=>c35Metrics()')
    # Current pdf-print-guard order: send render-state hide before disabling page scripts.
    hide=deliver(p,{'type':'WEBCLIP_PRINT_RENDER_STATE','hidden':True});p.wait_for_timeout(0);after_hide=p.evaluate('()=>c35Metrics()')
    path=out/'current_guarded.pdf';cdp_pdf(p,path,True);after_cut_before_restore=p.evaluate('()=>c35Metrics()')
    show=deliver(p,{'type':'WEBCLIP_PRINT_RENDER_STATE','hidden':False});p.wait_for_timeout(0);after_restore=p.evaluate('()=>c35Metrics()')
    p.evaluate('()=>c35Postcut()');postcut=p.evaluate('()=>c35Metrics()');pdf=pdf_summary(path);meta=(request or {}).get('meta',{});finish(p);p.close()
    return {'admission':admission,'afterPrepare':after_prepare,'hideResponse':hide,'afterHide':after_hide,'afterCutBeforeRestore':after_cut_before_restore,'showResponse':show,'afterRestore':after_restore,'postcut':postcut,'metaHasDiagnostics':any('diagnostic' in str(k).lower() for k in meta.keys()),'pdf':pdf}

def frozen_causal(ctx,out):
    # Test-only admitted representation: only the exact admitted selected payload, no page scripts.
    p=ctx.new_page();p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<main id='scope'><p>C35_ADMITTED_BASE</p></main>",wait_until='load');path=out/'frozen_causal.pdf';cdp_pdf(p,path,True);pdf=pdf_summary(path);p.close();return pdf

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'pdfGuardBlobSha':os.environ.get('PDF_GUARD_BLOB_SHA',''),'directControl':direct_control(ctx,out),'currentGuarded':current_guarded(ctx,out),'frozenCausal':frozen_causal(ctx,out)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C35_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    d=result['directControl'];assert d['state']['before']>=1 and d['pdf']['present']['C35_DIRECT_BEFOREPRINT'],d
    g=result['currentGuarded'];assert g['pdf']['present']['C35_ADMITTED_BASE'] and not g['pdf']['present']['C35_EXCLUDE'] and not g['pdf']['present']['C35_OUTSIDE'],g
    assert g['afterPrepare']['prepPresent'] and g['pdf']['present']['C35_PREP_OBSERVER_MUTATION'],g
    assert g['afterCutBeforeRestore']['beforeprint']==0 and not g['pdf']['present']['C35_BEFOREPRINT_MUTATION'] and not g['pdf']['present']['C35_BEFOREPRINT_MICROTASK'],g
    assert g['postcut']['postcutPresent'] and not g['pdf']['present']['C35_POSTCUT_MUTATION'],g
    f=result['frozenCausal'];assert f['present']['C35_ADMITTED_BASE'] and not f['present']['C35_PREP_OBSERVER_MUTATION'] and not f['present']['C35_RENDERSTATE_OBSERVER_MUTATION'],f
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args();
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c35-')))
if __name__=='__main__':main()
