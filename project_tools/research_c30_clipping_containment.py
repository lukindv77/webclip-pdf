#!/usr/bin/env python3
"""Fresh C30 exact-source Chrome probe: clipping/overflow/paint containment -> physical PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c30={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c30.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c30.pdf'});return true}})();"""
STYLE="""<style>html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:70px;padding:16px;background:#eee;box-sizing:border-box}.box{box-sizing:border-box;width:820px;margin:12px;border:3px solid #555;padding:8px}.row{box-sizing:border-box;height:42px;padding:10px;border-bottom:1px solid #bbb}.omit{height:62px;padding:16px;background:#fee;box-sizing:border-box}article{display:block;width:100%;box-sizing:border-box}</style>"""

def rows(n=120):
    out=[]
    for i in range(1,n+1):
        marks=''
        if i==1: marks+=' C30_FIRST_SENTINEL'
        if i==(n+1)//2: marks+=' C30_MIDDLE_SENTINEL'
        if i==n: marks+=' C30_LAST_SENTINEL'
        out.append(f"<div class='row'>C30_ROW_{i:04d}{marks}</div>")
        if i==4: out.append("<div class='omit'>C30_EXCLUDE_TOKEN</div>")
    return ''.join(out)

def pdf_summary(path,n=120):
    rd=PdfReader(str(path));txt='\n'.join((p.extract_text() or '') for p in rd.pages);nums=[int(x) for x in re.findall(r'C30_ROW_(\d{4})',txt)]
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rowCount':len(set(nums)),'firstRow':min(nums) if nums else 0,'lastRow':max(nums) if nums else 0,'expectedRows':n,'first':'C30_FIRST_SENTINEL' in txt,'middle':'C30_MIDDLE_SENTINEL' in txt,'last':'C30_LAST_SENTINEL' in txt,'excludePresent':'C30_EXCLUDE_TOKEN' in txt,'outsideTopPresent':'C30_OUTSIDE_TOP' in txt,'outsideBottomPresent':'C30_OUTSIDE_BOTTOM' in txt}

def cmd(p,c): return p.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def click(p,sel):
    ok=p.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",sel);assert ok,sel

def setup(p,html,select='#target'):
    p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}{html}",wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start')['ok'];click(p,select);assert cmd(p,'mode-exclude')['ok'];click(p,'.omit');assert cmd(p,'mode-include')['ok']

def prepare(p):
    assert cmd(p,'download')['ok'];p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""");p.wait_for_function('()=>!!globalThis.__c30.lastPdfRequest',timeout=30000)
def finish(p): assert p.evaluate('()=>__resolve()') is True

def geometry(p):
    return p.evaluate("""()=>[...document.querySelectorAll('[data-c30-clip]')].map(e=>{const c=getComputedStyle(e);return {id:e.id,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflow:c.overflow,overflowX:c.overflowX,overflowY:c.overflowY,contain:c.contain,clipPath:c.clipPath,height:c.height,maxHeight:c.maxHeight}})""")
def print_pdf(p,path): p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True)

def direct(ctx,out,n=120):
    p=ctx.new_page();p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<article>{rows(n)}</article>",wait_until='load');p.evaluate("()=>document.querySelector('.omit')?.remove()");path=out/'direct.pdf';print_pdf(p,path);r=pdf_summary(path,n);r.update(excludePresent=False,outsideTopPresent=False,outsideBottomPresent=False);p.close();return r

def case(ctx,out,name,style,select='#target',normalize=False,n=120):
    p=ctx.new_page();setup(p,f"<div class='outside'>C30_OUTSIDE_TOP</div><section id='clip' data-c30-clip class='box' style='{style}'><article id='target'>{rows(n)}</article></section><div class='outside'>C30_OUTSIDE_BOTTOM</div>",select)
    prepare(p);before=geometry(p);after=None
    if normalize:
        after=p.evaluate("""()=>{for(const e of document.querySelectorAll('[data-c30-clip]')){e.style.setProperty('height','auto','important');e.style.setProperty('max-height','none','important');e.style.setProperty('overflow','visible','important');e.style.setProperty('overflow-x','visible','important');e.style.setProperty('overflow-y','visible','important');e.style.setProperty('contain','none','important');e.style.setProperty('clip-path','none','important');}return [...document.querySelectorAll('[data-c30-clip]')].map(e=>({id:e.id,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflow:getComputedStyle(e).overflow,contain:getComputedStyle(e).contain,clipPath:getComputedStyle(e).clipPath,height:getComputedStyle(e).height}))}""")
    path=out/f'{name}.pdf';print_pdf(p,path);r=pdf_summary(path,n);r['geometryBefore']=before;r['geometryAfter']=after;finish(p);p.close();return r

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'direct':direct(ctx,out),'overflowHiddenAncestor':case(ctx,out,'overflow_hidden','height:360px;overflow:hidden'),'overflowClipAncestor':case(ctx,out,'overflow_clip','height:360px;overflow:clip'),'paintContainAncestor':case(ctx,out,'paint_contain','height:360px;overflow:visible;contain:paint'),'clipPathAncestor':case(ctx,out,'clip_path','height:360px;overflow:visible;clip-path:inset(0)'),'containLayoutPositive':case(ctx,out,'contain_layout','overflow:visible;contain:layout'),'maxHeightVisiblePositive':case(ctx,out,'maxheight_visible','max-height:360px;overflow:visible'),'paintCausalNormalized':case(ctx,out,'paint_causal','height:360px;overflow:visible;contain:paint',normalize=True),'hiddenCausalNormalized':case(ctx,out,'hidden_causal','height:360px;overflow:hidden',normalize=True)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C30_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    for k in ['direct','containLayoutPositive','maxHeightVisiblePositive','paintCausalNormalized','hiddenCausalNormalized']:
        r=result[k];assert r['rowCount']==120 and r['first'] and r['middle'] and r['last'],(k,r)
        assert not r['excludePresent'] and not r['outsideTopPresent'] and not r['outsideBottomPresent'],(k,r)
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c30-')))
if __name__=='__main__': main()
