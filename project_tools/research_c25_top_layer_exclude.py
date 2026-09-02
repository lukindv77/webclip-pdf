#!/usr/bin/env python3
"""Focused C25 control: Exclude semantics inside browser top-layer elements."""
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


def red_pixels(path: pathlib.Path) -> int:
    doc = fitz.open(path)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False)
    s, n, count = pix.samples, pix.n, 0
    for i in range(0, len(s), n):
        r, g, b = s[i], s[i+1], s[i+2]
        if r >= 180 and g <= 100 and b <= 100:
            count += 1
    doc.close()
    return count


def marks(page):
    return page.evaluate("""()=>{const x=document.querySelector('.omit');return {includeCount:document.querySelectorAll('[data-webclip-pdf-include]').length,excludeCount:document.querySelectorAll('[data-webclip-pdf-exclude]').length,excludeMarked:x?.hasAttribute('data-webclip-pdf-exclude')||false,display:x?getComputedStyle(x).display:'',visibility:x?getComputedStyle(x).visibility:''}}""")


def style_omit(page):
    page.evaluate("""()=>{const x=document.querySelector('.omit');x.style.setProperty('background','rgb(255,0,0)','important');x.style.setProperty('color','white','important');x.style.setProperty('min-height','70px','important')}""")


def top_layer_case(ctx, out: pathlib.Path, *, causal_inline=False):
    p = ctx.new_page()
    c25.setup_popover(p, 'manual', 'C25_EXCLUDE_TOP_LAYER_SELECTED')
    style_omit(p)
    before = marks(p)
    request = c25.begin_prepare(p)
    after_prepare = marks(p)
    if causal_inline:
        p.evaluate("()=>document.querySelector('.omit').style.setProperty('display','none','important')")
    before_print = marks(p)
    path = out / ('top_layer_causal_inline.pdf' if causal_inline else 'top_layer_current.pdf')
    c25.print_pdf(p, path)
    pdf = c25.summary(path, 'C25_EXCLUDE_TOP_LAYER_SELECTED')
    pdf['redPixels'] = red_pixels(path)
    c25.finish_pdf(p)
    p.close()
    return {'before':before,'afterPrepare':after_prepare,'beforePrint':before_print,'requestOk':bool(request),'pdf':pdf}


def plain_control(ctx, out: pathlib.Path):
    html = f"<!doctype html><meta charset='utf-8'>{c25.STYLE}<article id='target' class='target'>C25_PLAIN_SELECTED<div class='omit'>C25_EXCLUDE_TOKEN</div></article><div class='outside'>C25_OUTSIDE_TOKEN</div>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(html,wait_until='load');c25.inject(p);assert c25.cmd(p,'start').get('ok') is True
    p.evaluate("()=>document.querySelector('#target').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    assert c25.cmd(p,'mode-exclude').get('ok') is True
    p.evaluate("()=>document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    assert c25.cmd(p,'mode-include').get('ok') is True
    style_omit(p);before=marks(p);request=c25.begin_prepare(p);after_prepare=marks(p);path=out/'plain_control.pdf';c25.print_pdf(p,path);pdf=c25.summary(path,'C25_PLAIN_SELECTED');pdf['redPixels']=red_pixels(path);c25.finish_pdf(p);p.close();return {'before':before,'afterPrepare':after_prepare,'requestOk':bool(request),'pdf':pdf}


def run(chrome: str, out: pathlib.Path):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'plain':plain_control(ctx,out),'topLayerCurrent':top_layer_case(ctx,out),'topLayerCausalInline':top_layer_case(ctx,out,causal_inline=True)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C25_EXCLUDE_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c25-exclude-')))

if __name__=='__main__':main()
