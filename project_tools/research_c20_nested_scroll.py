#!/usr/bin/env python3
"""Fresh C20 managed-Chrome L4 probe: nested retained scrollports -> physical PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / 'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK = r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c20={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c20.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c20.pdf'});return true}})();"""
STYLE = """<style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:70px;padding:16px;background:#eee}
.scroll{box-sizing:border-box;height:360px;overflow:auto;border:3px solid #555;padding:8px;margin:12px}.outer{height:440px}.inner{height:300px;margin:12px}
.row{box-sizing:border-box;height:42px;padding:10px;border-bottom:1px solid #bbb}.omit{height:64px;padding:16px;background:#fee}
article{display:block;box-sizing:border-box;width:100%}
</style>"""


def rows(n:int,prefix='C20_ROW') -> str:
    out=[]
    for i in range(1,n+1):
        mark=''
        if i==1: mark+=' C20_FIRST_SENTINEL'
        if i==(n+1)//2: mark+=' C20_MIDDLE_SENTINEL'
        if i==n: mark+=' C20_LAST_SENTINEL'
        out.append(f"<div class='row'>{prefix}_{i:04d}{mark}</div>")
        if i==4: out.append("<div class='omit'>C20_EXCLUDE_TOKEN</div>")
    return ''.join(out)


def pdf_summary(path:pathlib.Path,n:int,prefix='C20_ROW') -> dict:
    rd=PdfReader(str(path));txt='\n'.join((p.extract_text() or '') for p in rd.pages)
    nums=[int(x) for x in re.findall(rf'{re.escape(prefix)}_(\d{{4}})',txt)]
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'rowCount':len(set(nums)),'firstRow':min(nums) if nums else 0,'lastRow':max(nums) if nums else 0,'expectedRows':n,
            'first':'C20_FIRST_SENTINEL' in txt,'middle':'C20_MIDDLE_SENTINEL' in txt,'last':'C20_LAST_SENTINEL' in txt,
            'excludePresent':'C20_EXCLUDE_TOKEN' in txt,'outsideTopPresent':'C20_OUTSIDE_TOP' in txt,'outsideBottomPresent':'C20_OUTSIDE_BOTTOM' in txt}


def cmd(p,c): return p.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def click(p,sel):
    ok=p.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",sel)
    assert ok,sel

def prepare(p):
    assert cmd(p,'download')['ok']
    p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""")
    p.wait_for_function('()=>!!globalThis.__c20.lastPdfRequest',timeout=30000)

def finish(p):
    assert p.evaluate('()=>__resolve()') is True
    p.wait_for_timeout(30)

def geometry(p):
    return p.evaluate("""()=>[...document.querySelectorAll('[data-c20-scroll]')].map(e=>{const c=getComputedStyle(e);return {id:e.id,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,overflow:c.overflow,overflowY:c.overflowY,height:c.height,maxHeight:c.maxHeight}})""")

def print_pdf(p,path):
    p.emulate_media(media='screen')
    p.pdf(path=str(path),format='A4',print_background=True)

def setup(p,html):
    p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}{html}",wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start')['ok']

def direct_control(ctx,out,n=120):
    p=ctx.new_page();p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<article>{rows(n)}</article>",wait_until='load');p.evaluate("()=>document.querySelector('.omit')?.remove()");path=out/'direct_flow.pdf';print_pdf(p,path);r=pdf_summary(path,n);r.update({'excludePresent':False,'outsideTopPresent':False,'outsideBottomPresent':False});p.close();return r

def selected_scrollbox(ctx,out,n=120):
    p=ctx.new_page();setup(p,f"<div class='outside'>C20_OUTSIDE_TOP</div><section id='scroll' data-c20-scroll class='scroll'><article>{rows(n)}</article></section><div class='outside'>C20_OUTSIDE_BOTTOM</div>")
    click(p,'#scroll');assert cmd(p,'mode-exclude')['ok'];click(p,'.omit');prepare(p);before=geometry(p);path=out/'selected_scrollbox.pdf';print_pdf(p,path);r=pdf_summary(path,n);r['geometry']=before;finish(p);p.close();return r

def descendant_scroll_ancestor(ctx,out,n=120,scroll_top=0,name='descendant_scroll'):
    p=ctx.new_page();setup(p,f"<div class='outside'>C20_OUTSIDE_TOP</div><section id='outer' data-c20-scroll class='scroll'><article id='target'>{rows(n)}</article></section><div class='outside'>C20_OUTSIDE_BOTTOM</div>")
    if scroll_top: p.evaluate('(y)=>document.querySelector("#outer").scrollTop=y',scroll_top)
    click(p,'#target');assert cmd(p,'mode-exclude')['ok'];click(p,'.omit');prepare(p);before=geometry(p);path=out/f'{name}.pdf';print_pdf(p,path);r=pdf_summary(path,n);r['geometry']=before;finish(p);p.close();return r

def nested_scroll(ctx,out,n=120,causal=False):
    p=ctx.new_page();setup(p,f"<div class='outside'>C20_OUTSIDE_TOP</div><section id='outer' data-c20-scroll class='scroll outer'><div id='inner' data-c20-scroll class='scroll inner'><article id='target'>{rows(n)}</article></div></section><div class='outside'>C20_OUTSIDE_BOTTOM</div>")
    p.evaluate("()=>{document.querySelector('#outer').scrollTop=55;document.querySelector('#inner').scrollTop=1260}")
    click(p,'#target');assert cmd(p,'mode-exclude')['ok'];click(p,'.omit');prepare(p);before=geometry(p)
    after=None
    if causal:
        after=p.evaluate("""()=>{for(const e of document.querySelectorAll('[data-c20-scroll]')){e.style.setProperty('height','auto','important');e.style.setProperty('max-height','none','important');e.style.setProperty('overflow','visible','important');e.style.setProperty('overflow-x','visible','important');e.style.setProperty('overflow-y','visible','important');}return [...document.querySelectorAll('[data-c20-scroll]')].map(e=>({id:e.id,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,overflow:getComputedStyle(e).overflow,height:getComputedStyle(e).height}))}""")
    path=out/('nested_causal_expanded.pdf' if causal else 'nested_current.pdf');print_pdf(p,path);r=pdf_summary(path,n);r['geometryBefore']=before;r['geometryAfter']=after;finish(p);p.close();return r

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),
                'directFlow':direct_control(ctx,out),
                'selectedScrollbox':selected_scrollbox(ctx,out),
                'descendantScrollAncestor':descendant_scroll_ancestor(ctx,out),
                'descendantScrolledMiddle':descendant_scroll_ancestor(ctx,out,scroll_top=2500,name='descendant_scrolled_middle'),
                'nestedCurrent':nested_scroll(ctx,out,causal=False),
                'nestedCausalExpanded':nested_scroll(ctx,out,causal=True)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest()
    print('C20_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    # Only validate the harness and causal/native controls; current-path completeness is an observation, not pre-baked.
    d=result['directFlow'];assert d['rowCount']==120 and d['first'] and d['middle'] and d['last'],d
    c=result['nestedCausalExpanded'];assert c['rowCount']==120 and c['first'] and c['middle'] and c['last'] and not c['excludePresent'] and not c['outsideTopPresent'] and not c['outsideBottomPresent'],c
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='c20-')))
if __name__=='__main__':main()
