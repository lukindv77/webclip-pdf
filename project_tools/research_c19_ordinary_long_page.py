#!/usr/bin/env python3
"""Fresh C19 managed-Chrome L4 probe: ordinary long-page existing content."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c19={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c19.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c19.pdf'});return true}})();"""
STYLE="<style>html,body{margin:0;padding:0}body{font:16px Arial}.row{box-sizing:border-box;height:50px;padding:12px;border-bottom:1px solid #ccc}.omit{height:70px;padding:20px;background:#fee}.outside{height:80px;padding:20px}</style>"

def rows(n,prefix='C19_ROW'):
    out=[]
    for i in range(1,n+1):
        marks=''
        if i==1: marks+=' C19_FIRST_SENTINEL'
        if i==(n+1)//2: marks+=' C19_MIDDLE_SENTINEL'
        if i==n: marks+=' C19_LAST_SENTINEL'
        out.append(f"<div class='row'>{prefix}_{i:04d}{marks}</div>")
        if i==n//2: out.append("<div class='omit'>C19_EXCLUDE_TOKEN</div>")
    return ''.join(out)

def pdf_summary(path,n,prefix='C19_ROW'):
    rd=PdfReader(str(path));txt='\n'.join((p.extract_text() or '') for p in rd.pages);nums=[int(x) for x in re.findall(rf'{re.escape(prefix)}_(\d{{4}})',txt)]
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rowCount':len(set(nums)),'lastRow':max(nums) if nums else 0,'expectedRows':n,'first':'C19_FIRST_SENTINEL' in txt,'middle':'C19_MIDDLE_SENTINEL' in txt,'last':'C19_LAST_SENTINEL' in txt,'excludePresent':'C19_EXCLUDE_TOKEN' in txt,'outsideTopPresent':'C19_OUTSIDE_TOP' in txt,'outsideBottomPresent':'C19_OUTSIDE_BOTTOM' in txt}

def cmd(p,c): return p.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def click(p,sel):
    ok=p.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",sel);assert ok,sel

def prepare(p):
    assert cmd(p,'download')['ok'];p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;[...s.querySelectorAll('.modal-actions button')].find(b=>b.textContent.trim()==='Сформировать PDF').click()}""");p.wait_for_function('()=>!!globalThis.__c19.lastPdfRequest',timeout=30000)

def selected_long(ctx,out,n=4200):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C19_OUTSIDE_TOP</div><article id='target'>{rows(n)}</article><div class='outside'>C19_OUTSIDE_BOTTOM</div>",wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start')['ok'];click(p,'#target');assert cmd(p,'mode-exclude')['ok'];click(p,'.omit');prepare(p);height=p.evaluate('()=>document.documentElement.scrollHeight');path=out/'selected_long.pdf';p.pdf(path=str(path),format='A4',print_background=True);r=pdf_summary(path,n);r['preparedDocumentHeight']=height;p.evaluate('()=>__resolve()');p.close();return r

def separated_includes(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});blocks=[]
    for i in range(1,7):
        token=f'C19_BLOCK_{i}'
        blocks.append(f"<section id='b{i}' style='height:3200px;padding:20px'>{token}</section>")
    p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}"+''.join(blocks),wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert cmd(p,'start')['ok'];click(p,'#b1');click(p,'#b3');click(p,'#b6');prepare(p);path=out/'separated_includes.pdf';p.pdf(path=str(path),format='A4',print_background=True);rd=PdfReader(str(path));txt='\n'.join((q.extract_text() or '') for q in rd.pages);r={'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'present':[f'C19_BLOCK_{i}' in txt for i in range(1,7)]};p.evaluate('()=>__resolve()');p.close();return r

def direct_control(ctx,out,n=4200):
    p=ctx.new_page();p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<article>{rows(n)}</article>",wait_until='load');p.evaluate("()=>document.querySelector('.omit')?.remove()");path=out/'direct_long.pdf';p.pdf(path=str(path),format='A4',print_background=True);r=pdf_summary(path,n);r['excludePresent']=False;r['outsideTopPresent']=False;r['outsideBottomPresent']=False;p.close();return r

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'directLong':direct_control(ctx,out),'selectedLong':selected_long(ctx,out),'separatedIncludes':separated_includes(ctx,out)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C19_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    for k in ['directLong','selectedLong']:
        r=result[k];assert r['rowCount']==r['expectedRows'] and r['lastRow']==r['expectedRows'] and r['first'] and r['middle'] and r['last'],(k,r)
    s=result['selectedLong'];assert not s['excludePresent'] and not s['outsideTopPresent'] and not s['outsideBottomPresent'],s
    assert result['separatedIncludes']['present']==[True,False,True,False,False,True],result['separatedIncludes']
    assert result['selectedLong']['preparedDocumentHeight']>200000,result['selectedLong']
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='c19-')))
if __name__=='__main__':main()
