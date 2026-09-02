#!/usr/bin/env python3
"""Fresh C25 final controls: closed top-layer negative, real Exclude, same-origin flatten parity."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

import fitz
from playwright.sync_api import sync_playwright
import research_c25_top_layer as c25

CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')


def blue_pixels(path: pathlib.Path) -> int:
    doc=fitz.open(path);pix=doc[0].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);s,n,count=pix.samples,pix.n,0
    for i in range(0,len(s),n):
        r,g,b=s[i],s[i+1],s[i+2]
        if b>=180 and r<=80 and g<=80: count+=1
    doc.close();return count


def dispatch(page, expr: str):
    ok=page.evaluate(expr);assert ok


def marked_top_layer_exclude(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(c25.popover_fixture('manual','C25_MARKED_TOP_LAYER'),wait_until='load');p.evaluate("()=>document.querySelector('#pop').showPopover()");c25.inject(p)
    assert c25.cmd(p,'start').get('ok') is True
    dispatch(p,"()=>{const e=document.querySelector('#target');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}")
    assert c25.cmd(p,'mode-exclude').get('ok') is True
    dispatch(p,"()=>{const e=document.querySelector('.omit');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}")
    assert c25.cmd(p,'mode-include').get('ok') is True
    before=p.evaluate("()=>({inc:document.querySelectorAll('[data-webclip-pdf-include]').length,exc:document.querySelectorAll('[data-webclip-pdf-exclude]').length,marked:document.querySelector('.omit').hasAttribute('data-webclip-pdf-exclude')})")
    request=c25.begin_prepare(p);after=p.evaluate("()=>({open:document.querySelector('#pop').matches(':popover-open'),display:getComputedStyle(document.querySelector('.omit')).display})")
    path=out/'marked_top_layer_exclude.pdf';c25.print_pdf(p,path);pdf=c25.summary(path,'C25_MARKED_TOP_LAYER');pdf['bluePixels']=blue_pixels(path);c25.finish_pdf(p);p.close()
    return {'before':before,'afterPrepare':after,'requestOk':bool(request),'pdf':pdf}


def closed_negative(ctx,out):
    html=f"<!doctype html><meta charset='utf-8'>{c25.STYLE}<main id='scope' class='target'>C25_VISIBLE_SCOPE<div id='closedPop' popover='auto'>C25_CLOSED_POPOVER</div><dialog id='closedDlg'>C25_CLOSED_DIALOG</dialog><div class='omit'>C25_EXCLUDE_TOKEN</div></main><div class='outside'>C25_OUTSIDE_TOKEN</div>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(html,wait_until='load');c25.inject(p);assert c25.cmd(p,'start').get('ok') is True
    dispatch(p,"()=>{document.querySelector('#scope').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}")
    assert c25.cmd(p,'mode-exclude').get('ok') is True
    dispatch(p,"()=>{document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}")
    assert c25.cmd(p,'mode-include').get('ok') is True
    request=c25.begin_prepare(p);state=p.evaluate("()=>({popOpen:document.querySelector('#closedPop').matches(':popover-open'),dlgOpen:document.querySelector('#closedDlg').open})")
    path=out/'closed_negative_fixed.pdf';c25.print_pdf(p,path);pdf=c25.summary(path,'C25_VISIBLE_SCOPE');c25.finish_pdf(p);p.close();return {'state':state,'requestOk':bool(request),'pdf':pdf}


CHILD=f"""<!doctype html><meta charset='utf-8'>{c25.STYLE}<body><div id='ordinary'>C25_FRAME_ORDINARY</div><div id='pop' popover='manual'><article>C25_FRAME_POPOVER<div class='omit'>C25_EXCLUDE_TOKEN</div></article></div></body>"""
TOP=f"<!doctype html><meta charset='utf-8'>{c25.STYLE}<div class='outside'>C25_OUTSIDE_TOKEN</div><iframe id='f' style='width:760px;height:500px'></iframe>"


def direct_child(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':760,'height':700});p.set_content(CHILD,wait_until='load');p.evaluate("()=>document.querySelector('#pop').showPopover()");path=out/'direct_child_popover.pdf';c25.print_pdf(p,path);pdf=c25.summary(path,'C25_FRAME_POPOVER');pdf['bluePixels']=blue_pixels(path);p.close();return pdf


def frame_setup(p):
    p.set_viewport_size({'width':1100,'height':850});p.set_content(TOP,wait_until='load');p.evaluate("html=>document.querySelector('#f').srcdoc=html",CHILD);p.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'");p.evaluate("()=>document.querySelector('#f').contentDocument.querySelector('#pop').showPopover()");c25.inject(p);assert c25.cmd(p,'start').get('ok') is True
    dispatch(p,"()=>{const d=document.querySelector('#f').contentDocument;d.body.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}")
    assert c25.cmd(p,'mode-exclude').get('ok') is True
    dispatch(p,"()=>{const d=document.querySelector('#f').contentDocument;d.querySelector('.omit').dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}")
    assert c25.cmd(p,'mode-include').get('ok') is True


def frame_case(ctx,out,causal=False):
    p=ctx.new_page();frame_setup(p)
    pre=p.evaluate("()=>{const d=document.querySelector('#f').contentDocument;return {sourceOpen:d.querySelector('#pop').matches(':popover-open'),sourceInclude:d.body.hasAttribute('data-webclip-pdf-include'),sourceExclude:d.querySelector('.omit').hasAttribute('data-webclip-pdf-exclude')}}")
    request=c25.begin_prepare(p)
    prepared=p.evaluate("()=>{const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');const pop=proxy?.querySelector('[popover]');return {proxy:!!proxy,proxyPop:!!pop,proxyOpen:!!pop?.matches(':popover-open'),proxyDisplay:pop?getComputedStyle(pop).display:'',iframeDisplay:getComputedStyle(document.querySelector('#f')).display}}")
    causal_state=None
    if causal:
        causal_state=p.evaluate("()=>{const proxy=document.querySelector('section[data-webclip-pdf-flattened-frame]');const pop=proxy?.querySelector('[popover]');if(!pop)return {ok:false};try{pop.showPopover()}catch(e){return {ok:false,error:String(e)}}return {ok:true,open:pop.matches(':popover-open')}}")
    path=out/('frame_causal_top_layer.pdf' if causal else 'frame_current_flatten.pdf');c25.print_pdf(p,path);pdf=c25.summary(path,'C25_FRAME_POPOVER');pdf['ordinary']=c25.pdf_text(path)[0].find('C25_FRAME_ORDINARY')>=0;pdf['bluePixels']=blue_pixels(path);c25.finish_pdf(p);p.close();return {'pre':pre,'prepared':prepared,'causal':causal_state,'requestOk':bool(request),'pdf':pdf}


def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'markedTopLayerExclude':marked_top_layer_exclude(ctx,out),'closedNegative':closed_negative(ctx,out),'directChild':direct_child(ctx,out),'frameCurrent':frame_case(ctx,out,False),'frameCausal':frame_case(ctx,out,True)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C25_FINAL_CONTROLS_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True);return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c25-final-')))

if __name__=='__main__':main()
