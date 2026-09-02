#!/usr/bin/env python3
"""Fresh C31 exact-source Chrome probe: fixed/sticky semantics -> physical PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c31={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c31.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c31.pdf'});return true}})();"""
STYLE="""<style>html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:70px;padding:16px;background:#eee;box-sizing:border-box}.scope{width:820px;margin:12px;border:2px solid #555;padding:8px;box-sizing:border-box}.row{height:58px;padding:18px 10px;border-bottom:1px solid #ccc;box-sizing:border-box}.omit{height:62px;padding:16px;background:#fee;box-sizing:border-box}.fixed{position:fixed;top:18px;left:18px;width:260px;height:44px;padding:10px;background:#ffd;border:2px solid #900;z-index:50;box-sizing:border-box}.sticky{position:sticky;top:8px;height:44px;padding:10px;background:#dfd;border:2px solid #090;box-sizing:border-box}.transform-shell{transform:translateZ(0);position:relative;padding-top:52px}</style>"""

def rows(n=120,prefix='C31_ROW'):
    out=[]
    for i in range(1,n+1):
        marks=''
        if i==1: marks+=' C31_FIRST_SENTINEL'
        if i==(n+1)//2: marks+=' C31_MIDDLE_SENTINEL'
        if i==n: marks+=' C31_LAST_SENTINEL'
        out.append(f"<div class='row'>{prefix}_{i:04d}{marks}</div>")
        if i==5: out.append("<div class='omit'>C31_EXCLUDE_TOKEN</div>")
    return ''.join(out)

def summary(path,n=120,prefix='C31_ROW',tokens=()):
    rd=PdfReader(str(path));txt='\n'.join((p.extract_text() or '') for p in rd.pages);nums=[int(x) for x in re.findall(rf'{re.escape(prefix)}_(\d{{4}})',txt)]
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rowCount':len(set(nums)),'first':'C31_FIRST_SENTINEL' in txt,'middle':'C31_MIDDLE_SENTINEL' in txt,'last':'C31_LAST_SENTINEL' in txt,'excludePresent':'C31_EXCLUDE_TOKEN' in txt,'outsidePresent':'C31_OUTSIDE_TOKEN' in txt,'tokenCounts':{t:txt.count(t) for t in tokens}}
def cmd(p,c):return p.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def dispatch(p,expr):
    ok=p.evaluate(f"()=>{{const e={expr};if(!e)return false;e.dispatchEvent(new MouseEvent('click',{{bubbles:true,cancelable:true}}));return true}}");assert ok,expr
def inject(p):p.evaluate(MOCK);p.add_script_tag(content=CONTENT)
def begin(p):
    assert cmd(p,'download')['ok'];p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('button');b.click()}""");p.wait_for_function('()=>!!globalThis.__c31.lastPdfRequest',timeout=30000)
def finish(p):assert p.evaluate('()=>__resolve()') is True
def print_pdf(p,path):p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True)
def select_top(p):
    assert cmd(p,'start')['ok'];dispatch(p,"document.querySelector('#scope')");assert cmd(p,'mode-exclude')['ok'];dispatch(p,"document.querySelector('.omit')");assert cmd(p,'mode-include')['ok']
def setup_top(ctx,inner):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C31_OUTSIDE_TOKEN</div><article id='scope' class='scope'>{inner}</article>",wait_until='load');inject(p);select_top(p);return p

def top_case(ctx,out,name,decor,token,causal=False):
    p=setup_top(ctx,decor+rows());begin(p)
    before=p.evaluate("""()=>{const e=document.querySelector('[data-c31-pos]');const c=getComputedStyle(e);return {position:c.position,top:c.top,transform:getComputedStyle(e.parentElement).transform}}""")
    if causal:p.evaluate("()=>{const e=document.querySelector('[data-c31-pos]');e.style.setProperty('position','static','important');e.style.setProperty('inset','auto','important')}")
    after=p.evaluate("""()=>{const e=document.querySelector('[data-c31-pos]');return {position:getComputedStyle(e).position,top:getComputedStyle(e).top}}""")
    path=out/f'{name}.pdf';print_pdf(p,path);r=summary(path,tokens=(token,));r['before']=before;r['after']=after;finish(p);p.close();return r

def unselected_fixed(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='fixed'>C31_UNSELECTED_FIXED</div><article id='scope' class='scope'>{rows()}</article>",wait_until='load');inject(p);select_top(p);begin(p);path=out/'unselected_fixed.pdf';print_pdf(p,path);r=summary(path,tokens=('C31_UNSELECTED_FIXED',));finish(p);p.close();return r

def frame_body(ctx,out):
    child=f"<!doctype html><meta charset='utf-8'>{STYLE}<body><div class='fixed' data-frame-fixed>C31_FRAME_FIXED</div><div class='sticky' data-frame-sticky>C31_FRAME_STICKY</div>{rows(prefix='C31F_ROW')}</body>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content("<!doctype html><meta charset='utf-8'><iframe id='f' style='width:850px;height:500px;border:2px solid #555'></iframe>",wait_until='load');p.locator('#f').evaluate('(f,h)=>{f.srcdoc=h}',child);p.wait_for_function("()=>document.querySelector('#f').contentDocument?.querySelector('[data-frame-fixed]')");inject(p);assert cmd(p,'start')['ok'];dispatch(p,"document.querySelector('#f').contentDocument.body");assert cmd(p,'mode-exclude')['ok'];dispatch(p,"document.querySelector('#f').contentDocument.querySelector('.omit')");assert cmd(p,'mode-include')['ok'];begin(p)
    prepared=p.evaluate("""()=>{const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');const f=proxy?.querySelector('[data-frame-fixed]'),s=proxy?.querySelector('[data-frame-sticky]');return {proxy:!!proxy,fixed:f?getComputedStyle(f).position:'',sticky:s?getComputedStyle(s).position:'',iframeDisplay:getComputedStyle(document.querySelector('#f')).display}}""")
    path=out/'frame_body.pdf';print_pdf(p,path);r=summary(path,prefix='C31F_ROW',tokens=('C31_FRAME_FIXED','C31_FRAME_STICKY'));r['prepared']=prepared;finish(p);p.close();return r

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'topFixed':top_case(ctx,out,'top_fixed',"<div class='fixed' data-c31-pos>C31_FIXED_TOKEN</div>",'C31_FIXED_TOKEN'),'topSticky':top_case(ctx,out,'top_sticky',"<div class='sticky' data-c31-pos>C31_STICKY_TOKEN</div>",'C31_STICKY_TOKEN'),'transformedFixed':top_case(ctx,out,'transformed_fixed',"<div class='transform-shell'><div class='fixed' data-c31-pos>C31_TRANSFORM_FIXED</div></div>",'C31_TRANSFORM_FIXED'),'topFixedCausalStatic':top_case(ctx,out,'top_fixed_causal',"<div class='fixed' data-c31-pos>C31_FIXED_CAUSAL</div>",'C31_FIXED_CAUSAL',causal=True),'unselectedFixed':unselected_fixed(ctx,out),'frameBody':frame_body(ctx,out)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C31_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    for key in ['topSticky','transformedFixed','topFixedCausalStatic','unselectedFixed','frameBody']:
        r=result[key];assert r['rowCount']==120 and r['first'] and r['middle'] and r['last'],(key,r)
        assert not r['excludePresent'] and not r['outsidePresent'],(key,r)
    assert result['topSticky']['tokenCounts']['C31_STICKY_TOKEN']==1,result['topSticky']
    assert result['topFixedCausalStatic']['tokenCounts']['C31_FIXED_CAUSAL']==1,result['topFixedCausalStatic']
    assert result['unselectedFixed']['tokenCounts']['C31_UNSELECTED_FIXED']==0,result['unselectedFixed']
    assert result['frameBody']['prepared']['fixed']=='static' and result['frameBody']['prepared']['sticky']=='static',result['frameBody']
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c31-')))
if __name__=='__main__':main()
