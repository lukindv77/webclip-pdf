#!/usr/bin/env python3
"""Fresh C37 exact-source Chrome probe: failure/retry/rollback convergence."""
from __future__ import annotations
import argparse, base64, hashlib, json, os, pathlib, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
import fitz

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
def svg_data(color):
    s=f"<svg xmlns='http://www.w3.org/2000/svg' width='180' height='100'><rect width='180' height='100' fill='{color}'/></svg>"
    return 'data:image/svg+xml;base64,'+base64.b64encode(s.encode()).decode()
RED=svg_data('#ff0000');BLUE=svg_data('#0000ff')
MOCK=r"""(()=>{const ls=[],pending=[];globalThis.__c37={lastPdfRequest:null,pending};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){__c37.lastPdfRequest=m;return new Promise((resolve,reject)=>pending.push({resolve,reject}))}return Promise.resolve({ok:true})}}};globalThis.__cmd=m=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const r=f(m,{},send);if(r!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__reject=()=>{const x=pending.shift();if(!x)return false;x.reject(new Error('C37 synthetic failure'));return true};globalThis.__resolve=()=>{const x=pending.shift();if(!x)return false;x.resolve({ok:true,filename:'c37.pdf'});return true}})();"""
STYLE="""<style>html,body{margin:0;padding:0}body{font:16px Arial}.outside{padding:14px;background:#eee}#scope{width:760px;margin:14px auto;padding:14px;border:2px solid #555}.omit{padding:10px;background:#fee}img{width:180px;height:100px;display:block;margin:12px 0}.spacer{height:900px}</style>"""
def cmd(p,c):return p.evaluate("c=>__cmd({type:'WEBCLIP_COMMAND',command:c})",c)
def dispatch(p,s):
    ok=p.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}",s);assert ok,s
def inject(p):p.evaluate(MOCK);p.add_script_tag(content=CONTENT)
def select_scope(p):
    assert cmd(p,'start')['ok'];dispatch(p,'#scope');assert cmd(p,'mode-exclude')['ok'];dispatch(p,'.omit');assert cmd(p,'mode-include')['ok']
def begin(p):
    p.evaluate('()=>{__c37.lastPdfRequest=null}');assert cmd(p,'download')['ok']
    ok=p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""");assert ok
    p.wait_for_function('()=>!!__c37.lastPdfRequest&&__c37.pending.length>0',timeout=30000)
def reject(p):assert p.evaluate('()=>__reject()') is True;p.wait_for_timeout(250)
def resolve(p):assert p.evaluate('()=>__resolve()') is True;p.wait_for_timeout(120)
def page(ctx,inner):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'><base href='https://example.test/base/'>{STYLE}<div class='outside'>C37_OUTSIDE</div><main id='scope'>{inner}<div class='omit'>C37_EXCLUDE</div></main>",wait_until='load');inject(p);select_scope(p);return p
def cleanup(p):return p.evaluate("""()=>({header:document.querySelectorAll('#webclip-pdf-header').length,printStyles:document.querySelectorAll('[data-webclip-print-style]').length,imageWrappers:document.querySelectorAll('[data-webclip-image-link]').length,hrefMarkers:document.querySelectorAll('[data-webclip-original-href]').length})""")
def pdf_summary(path):
    r=PdfReader(str(path));text='\n'.join((x.extract_text() or '') for x in r.pages);doc=fitz.open(path);red=blue=0
    for pg in doc:
        pix=pg.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);s,n=pix.samples,pix.n
        for i in range(0,len(s),n):
            rr,g,b=s[i],s[i+1],s[i+2]
            if rr>180 and g<80 and b<80:red+=1
            if b>180 and rr<80 and g<80:blue+=1
    doc.close();return {'pages':len(r.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'selected':'C37_SELECTED' in text,'excludePresent':'C37_EXCLUDE' in text,'outsidePresent':'C37_OUTSIDE' in text,'red':red,'blue':blue}
def print_pdf(p,path):p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);return pdf_summary(path)
def clean_retry(ctx,out):
    p=page(ctx,"<p>C37_SELECTED</p><div class='spacer'></div>");begin(p);first=cleanup(p);reject(p);after=cleanup(p);begin(p);second=cleanup(p);pdf=print_pdf(p,out/'clean_retry.pdf');resolve(p);final=cleanup(p);p.close();return {'firstPrepared':first,'afterFailure':after,'secondPrepared':second,'afterSuccess':final,'pdf':pdf}
def stale_resource(ctx,out):
    p=page(ctx,f"<p>C37_SELECTED</p><a href='#image'><img id='img' data-src='{RED}'></a><div class='spacer'></div>");before=p.evaluate("()=>img.getAttribute('src')");begin(p);prepared=p.evaluate("()=>img.getAttribute('src')");p.evaluate('(v)=>img.setAttribute(\'src\',v)',BLUE);newer=p.evaluate("()=>img.getAttribute('src')");reject(p);after=p.evaluate("()=>img.getAttribute('src')");begin(p);retry=p.evaluate("()=>img.getAttribute('src')");pdf=print_pdf(p,out/'stale_resource_retry.pdf');resolve(p);final=p.evaluate("()=>img.getAttribute('src')");p.close();return {'before':before,'prepared':prepared,'hostNewer':newer,'afterFailure':after,'retryPrepared':retry,'final':final,'pdf':pdf}
def disconnected_link(ctx,out):
    p=page(ctx,"<p>C37_SELECTED</p><a id='link' href='relative/item'>C37_LINK</a><div class='spacer'></div>");original=p.evaluate("()=>link.getAttribute('href')");begin(p);prepared=p.evaluate("()=>({href:link.getAttribute('href'),marker:link.getAttribute('data-webclip-original-href')})");p.evaluate("()=>{window.__saved=link;__saved.remove()}");reject(p);detached=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href'),connected:__saved.isConnected})");p.evaluate("()=>scope.appendChild(__saved)");reattached=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href'),connected:__saved.isConnected})");begin(p);retry=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href')})");pdf=print_pdf(p,out/'link_retry.pdf');resolve(p);final=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href')})");p.close();return {'original':original,'prepared':prepared,'detachedAfterFailure':detached,'reattached':reattached,'retryPrepared':retry,'final':final,'pdf':pdf}
def wrapper_topology(ctx):
    p=page(ctx,f"<p>C37_SELECTED</p><img id='img' src='{RED}'><div class='spacer'></div>");begin(p);prepared=p.evaluate("()=>{const w=img.closest('[data-webclip-image-link]');return {wrapper:!!w,children:w?[...w.childNodes].length:0}}");p.evaluate("()=>{const w=img.closest('[data-webclip-image-link]');const e=document.createElement('em');e.textContent='C37_PAGE_CHILD';w.appendChild(e);window.__child=e}");reject(p);after=p.evaluate("()=>({imageConnected:img.isConnected,childConnected:__child.isConnected,wrapperConnected:__child.parentElement?.isConnected||false})");p.close();return {'prepared':prepared,'afterFailure':after}
def source_contract():return {'resourceRestoreUnconditional':"if (had) element.setAttribute(name, value ?? '');" in CONTENT and 'else element.removeAttribute(name);' in CONTENT,'linkSkipsDisconnected':'if (!link?.isConnected) continue;' in CONTENT,'wrapperRemovesNode':'link?.remove();' in CONTENT,'remoteRestoreFireAndForget':'restoreRemoteFramesAfterPrint().catch(() => {});' in CONTENT,'prepareAwaitsSecondRestore':'await restoreRemoteFramesAfterPrint();' in CONTENT}
def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'sourceContract':source_contract(),'cleanRetry':clean_retry(ctx,out),'staleResourceRetry':stale_resource(ctx,out),'disconnectedLinkRetry':disconnected_link(ctx,out),'wrapperTopology':wrapper_topology(ctx)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C37_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    assert all(result['sourceContract'].values())
    z={'header':0,'printStyles':0,'imageWrappers':0,'hrefMarkers':0};c=result['cleanRetry'];assert c['afterFailure']==z and c['afterSuccess']==z and c['pdf']['selected'] and not c['pdf']['excludePresent'] and not c['pdf']['outsidePresent']
    r=result['staleResourceRetry'];assert r['before'] is None and r['prepared']==RED and r['hostNewer']==BLUE and r['afterFailure'] is None and r['retryPrepared']==RED and r['pdf']['red']>1000 and r['pdf']['blue']<100
    l=result['disconnectedLinkRetry'];assert l['original']=='relative/item' and l['prepared']['href']=='https://example.test/base/relative/item' and l['prepared']['marker']=='relative/item' and not l['detachedAfterFailure']['connected'] and l['retryPrepared']['marker']=='https://example.test/base/relative/item' and l['final']=={'href':'https://example.test/base/relative/item','marker':None}
    w=result['wrapperTopology'];assert w['prepared']['wrapper'] and w['afterFailure']['imageConnected'] and not w['afterFailure']['childConnected'] and not w['afterFailure']['wrapperConnected']
    return result
def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args();
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c37-')))
if __name__=='__main__':main()
