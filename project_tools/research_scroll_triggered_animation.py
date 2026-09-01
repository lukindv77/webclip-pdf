#!/usr/bin/env python3
"""Cycle-2 T5 / PD1 physical probe for Chrome scroll-triggered animations."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import pathlib
from typing import Any

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")

CHROME_MOCK = r"""(()=>{const listeners=[];let resolvePdf=null;globalThis.__t5={listeners,lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(message){if(message?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(message?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__t5.lastPdfRequest=message;return new Promise(resolve=>{resolvePdf=resolve})}return Promise.resolve({ok:true})}}};globalThis.__t5Command=message=>new Promise((resolve,reject)=>{const fn=listeners[0];if(!fn)return reject(new Error('content listener missing'));let done=false;const send=value=>{if(!done){done=true;resolve(value)}};try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true})}catch(error){reject(error)}});globalThis.__t5ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'t5.pdf'});return true}})();"""

BASE_STYLE = r"""<style>
html,body{margin:0;padding:0;background:white;color:#111;font-family:Arial,sans-serif}
#excluded{width:240px;height:70px;background:rgb(0,0,220);color:white;padding:10px;box-sizing:border-box}
.hover-zone{width:180px;height:40px;margin-top:20px}.hover-only{display:none}.hover-zone:hover .hover-only{display:block}
.trigger-subject{width:560px;height:300px;trigger-scope:--research-trigger;timeline-trigger:--research-trigger view() contain / cover}
.trigger-visual{width:160px;height:120px;box-sizing:border-box;padding:18px;color:white;background:rgb(220,0,0);transform:translateX(0px);animation:research-reveal 220ms linear both;animation-trigger:--research-trigger play-forwards reset}
@keyframes research-reveal{from{background:rgb(220,0,0);transform:translateX(0px)}to{background:rgb(0,150,0);transform:translateX(260px)}}
</style>"""


def parse_args():
    p=argparse.ArgumentParser();p.add_argument('--chrome',required=True);p.add_argument('--out',type=pathlib.Path,required=True);return p.parse_args()

def sha256(data:bytes)->str:return hashlib.sha256(data).hexdigest()

def pdf_text(pdf:bytes)->str:
    doc=fitz.open(stream=pdf,filetype='pdf');return '\n'.join(page.get_text() for page in doc)

def raster_pdf(pdf:bytes,out:pathlib.Path,name:str)->dict[str,Any]:
    doc=fitz.open(stream=pdf,filetype='pdf');red=green=blue=0;digest=hashlib.sha256();page_hashes=[]
    for index,page in enumerate(doc):
        pix=page.get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False);png=pix.tobytes('png');digest.update(png);page_hashes.append(sha256(png));(out/f'{name}-page{index+1}.png').write_bytes(png)
        for r,g,b in Image.open(io.BytesIO(png)).convert('RGB').getdata():
            if r>180 and g<90 and b<90:red+=1
            if g>110 and r<100 and b<100:green+=1
            if b>180 and r<90 and g<90:blue+=1
    return {'pageCount':len(doc),'rasterSha256':digest.hexdigest(),'pageRasterSha256':page_hashes,'colors':{'red':red,'green':green,'blue':blue}}

def load_content(page,html:str)->None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}",wait_until='load');page.emulate_media(media='screen');page.evaluate(CHROME_MOCK);page.add_script_tag(content=CONTENT)

def command(page,payload):return page.evaluate('payload=>__t5Command(payload)',payload)

def start(page):
    r=command(page,{'type':'WEBCLIP_COMMAND','command':'start'});assert r.get('ok') is True,r

def click_selector(page,selector):
    r=page.evaluate("s=>document.querySelector(s).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}))",selector);assert r is False,(selector,r)

def select_include_exclude(page,include_selector,exclude_selector=None):
    start(page);click_selector(page,include_selector)
    if exclude_selector:
        r=command(page,{'type':'WEBCLIP_COMMAND','command':'mode-exclude'});assert r.get('ok') is True,r;click_selector(page,exclude_selector)

def modal_click(page,label='Сформировать PDF'):
    ok=page.evaluate("""label=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot,b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);if(!b)return false;b.click();return true}""",label);assert ok,label

def wait_prepared(page):page.wait_for_function('()=>!!globalThis.__t5.lastPdfRequest',timeout=20000);page.wait_for_timeout(120);return page.evaluate('()=>globalThis.__t5.lastPdfRequest')

def resolve_pdf(page):assert page.evaluate('()=>__t5ResolvePdf()') is True;page.wait_for_timeout(40)

def trigger_state(page,visual='#animated',subject='#subject'):
    return page.evaluate("""([visual,subject])=>{const el=document.querySelector(visual),sub=document.querySelector(subject),a=el?.getAnimations?.()[0]||null,r=el?.getBoundingClientRect?.(),sr=sub?.getBoundingClientRect?.(),cs=el?getComputedStyle(el):null,ss=sub?getComputedStyle(sub):null;return{scrollY:window.scrollY,visualRect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,subjectRect:sr?{x:sr.x,y:sr.y,width:sr.width,height:sr.height}:null,background:cs?.backgroundColor||'',transform:cs?.transform||'',playState:a?.playState||'',currentTime:a?.currentTime==null?null:Number(a.currentTime),timelineTrigger:ss?.getPropertyValue('timeline-trigger')||'',animationTrigger:cs?.getPropertyValue('animation-trigger')||''}}""",[visual,subject])

def physical_save(page,out,name,state_selectors=('#animated','#subject')):
    r=command(page,{'type':'WEBCLIP_COMMAND','command':'download'});assert r.get('ok') is True,r;modal_click(page);request=wait_prepared(page);prepared=trigger_state(page,*state_selectors) if state_selectors[0] else None
    pdf=page.pdf(format='A4',print_background=True,prefer_css_page_size=True);(out/f'{name}.pdf').write_bytes(pdf);raster=raster_pdf(pdf,out,name);text=pdf_text(pdf);post=trigger_state(page,*state_selectors) if state_selectors[0] else None;resolve_pdf(page)
    return {'prepared':prepared,'postPrint':post,'text':text,'bytes':len(pdf),'sha256':sha256(pdf),'pageAnalysis':request.get('meta',{}).get('pageAnalysis'),**raster}

def support_state(page):
    return page.evaluate("""()=>({timelineTrigger:CSS.supports('timeline-trigger: --research-trigger view() contain / cover'),animationTrigger:CSS.supports('animation-trigger: --research-trigger play-forwards reset'),animationTriggerBasic:CSS.supports('animation-trigger: --research-trigger play-forwards play-backwards')})""")

def make_top_fixture():
    return """<div id='pre' style='height:1000px;background:#eee'>UNSELECTED_PRE_GEOMETRY</div><main id='capture' style='height:1800px;padding:0 20px;box-sizing:border-box'><section id='subject' class='trigger-subject'><div id='animated' class='trigger-visual'>TRIGGER_TARGET</div></section><div id='excluded'>EXCLUDED_CONTROL</div><div class='hover-zone'>hover-zone<span class='hover-only'>HOVER_ONLY_MUST_BE_ABSENT</span></div><div style='height:1300px'>CAPTURE_TAIL</div></main>"""

def make_nested_fixture(dynamic=False):
    script="""<script>window.__generated=0;const sc=document.getElementById('scroller');sc.addEventListener('scroll',()=>{if(sc.scrollTop>0&&!document.getElementById('generated-sentinel')){window.__generated++;const x=document.createElement('div');x.id='generated-sentinel';x.textContent='AUTO_SCROLL_GENERATED_CONTENT';sc.append(x)}})</script>""" if dynamic else ''
    return f"""<main id='nested-wrap' style='padding:20px'><div id='scroller' style='height:500px;width:700px;overflow:auto;border:2px solid #111'><div style='height:620px'>NESTED_FILLER</div><section id='nested-subject' class='trigger-subject'><div id='nested-animated' class='trigger-visual'>NESTED_TRIGGER_TARGET</div></section><div id='nested-excluded'>NESTED_EXCLUDED_CONTROL</div><div style='height:700px'>NESTED_TAIL</div></div></main>{script}"""

def run(args)->dict[str,Any]:
    args.out.mkdir(parents=True,exist_ok=True);results={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);results['browserVersion']=browser.version;ctx=browser.new_context(viewport={'width':1100,'height':800})
        page=ctx.new_page();load_content(page,make_top_fixture());support=support_state(page);assert support['timelineTrigger'] and support['animationTrigger'],support;results['featureSupport']=support;page.close()

        page=ctx.new_page();load_content(page,make_top_fixture());page.evaluate('()=>scrollTo(0,950)');page.wait_for_timeout(500);admitted=trigger_state(page);assert admitted['background']=='rgb(0, 150, 0)',admitted;target=args.out/'stable_body_admission.png';page.locator('#animated').screenshot(path=str(target));select_include_exclude(page,'body','#excluded');art=physical_save(page,args.out,'stable_body_positive');assert art['prepared']['background']=='rgb(0, 150, 0)',art['prepared'];assert 'TRIGGER_TARGET' in art['text'] and 'EXCLUDED_CONTROL' not in art['text'] and 'HOVER_ONLY_MUST_BE_ABSENT' not in art['text'],art['text'];assert art['colors']['green']>1000,art['colors'];results['stableBodyPositive']={'admitted':admitted,'admissionSha256':sha256(target.read_bytes()),**{k:art[k] for k in ['prepared','postPrint','pageCount','colors','sha256','rasterSha256','pageRasterSha256']}};page.close()

        page=ctx.new_page();load_content(page,make_top_fixture());page.evaluate('()=>scrollTo(0,950)');page.wait_for_timeout(500);admitted=trigger_state(page);assert admitted['background']=='rgb(0, 150, 0)',admitted;target=args.out/'selection_shift_admission.png';page.locator('#animated').screenshot(path=str(target));select_include_exclude(page,'#capture','#excluded');art=physical_save(page,args.out,'selection_geometry_trigger_reset');assert art['prepared']['background']=='rgb(220, 0, 0)',art['prepared'];assert 'TRIGGER_TARGET' in art['text'] and 'UNSELECTED_PRE_GEOMETRY' not in art['text'] and 'EXCLUDED_CONTROL' not in art['text'] and 'HOVER_ONLY_MUST_BE_ABSENT' not in art['text'],art['text'];assert art['colors']['red']>art['colors']['green']*5+1000,art['colors'];results['selectionGeometryFinding']={'admitted':admitted,'admissionSha256':sha256(target.read_bytes()),**{k:art[k] for k in ['prepared','postPrint','pageCount','colors','sha256','rasterSha256','pageRasterSha256']}};page.close()

        page=ctx.new_page();load_content(page,make_nested_fixture(False));page.evaluate("()=>{document.querySelector('#scroller').scrollTop=560}");page.wait_for_timeout(500);admitted=trigger_state(page,'#nested-animated','#nested-subject');assert admitted['background']=='rgb(0, 150, 0)',admitted;select_include_exclude(page,'#scroller','#nested-excluded');art=physical_save(page,args.out,'nested_scroll_positive',('#nested-animated','#nested-subject'));assert art['prepared']['background']=='rgb(0, 150, 0)',art['prepared'];assert 'NESTED_TRIGGER_TARGET' in art['text'] and 'NESTED_EXCLUDED_CONTROL' not in art['text'],art['text'];results['nestedScrollPositive']={'admitted':admitted,**{k:art[k] for k in ['prepared','postPrint','pageCount','colors','sha256','rasterSha256','pageRasterSha256']}};page.close()

        page=ctx.new_page();load_content(page,make_nested_fixture(True));before=page.evaluate("()=>({scrollTop:document.querySelector('#scroller').scrollTop,generated:window.__generated})");assert before=={'scrollTop':0,'generated':0},before;select_include_exclude(page,'#scroller');art=physical_save(page,args.out,'no_user_scroll_boundary',(None,None));after=page.evaluate("()=>({scrollTop:document.querySelector('#scroller').scrollTop,generated:window.__generated,hasSentinel:!!document.querySelector('#generated-sentinel')})");assert after['scrollTop']==0 and after['generated']==0 and not after['hasSentinel'],after;assert 'AUTO_SCROLL_GENERATED_CONTENT' not in art['text'],art['text'];results['noUserScrollBoundary']={'before':before,'after':after,**{k:art[k] for k in ['pageCount','colors','sha256','rasterSha256','pageRasterSha256']}};page.close();browser.close()
    return results

def main():
    args=parse_args();results=run(args);(args.out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=False,indent=2));return 0

if __name__=='__main__':raise SystemExit(main())
