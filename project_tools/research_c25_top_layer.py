#!/usr/bin/env python3
"""Fresh C25 exact-source Chrome probe: dialog/popover/top-layer admission -> PDF.

Synthetic local fixtures only. Actual repository guard prefix + content.js are loaded and
real WebClip selection/download preparation is driven. Trusted pointer clicks are used for
the WebClip Finish control so browser popover light-dismiss and modal inertness remain real.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

import fitz
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = (ROOT / 'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT = (ROOT / 'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST_GUARD = (ROOT / 'host-control-activation-guard.js').read_text(encoding='utf-8')
CONTENT = (ROOT / 'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK = r"""
(()=>{const ls=[];let resolvePdf=null;globalThis.__c25={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c25.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c25Command=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c25Resolve=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c25.pdf'});return true}})();
"""

STYLE = r"""<style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:18px;background:#eee}
[popover]{width:420px;padding:22px;border:4px solid #222;background:white;inset:auto 24px 24px auto}
[popover]::backdrop{background:rgb(0 0 255 / 1)}
dialog{width:460px;padding:24px;border:4px solid #222;background:white}
dialog::backdrop{background:rgb(0 0 255 / 1)}
.target{padding:18px;background:#fff}.omit{padding:10px;background:#fee}
</style>"""


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    r = PdfReader(str(path))
    return '\n'.join((p.extract_text() or '') for p in r.pages), len(r.pages)


def blue_pixels(path: pathlib.Path) -> int:
    doc = fitz.open(path)
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False)
    samples = pix.samples
    n = pix.n
    count = 0
    for i in range(0, len(samples), n):
        r, g, b = samples[i], samples[i + 1], samples[i + 2]
        if b >= 180 and r <= 80 and g <= 80:
            count += 1
    doc.close()
    return count


def summary(path: pathlib.Path, token: str) -> dict:
    text, pages = pdf_text(path)
    return {
        'pages': pages,
        'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'token': token in text,
        'excludePresent': 'C25_EXCLUDE_TOKEN' in text,
        'outsidePresent': 'C25_OUTSIDE_TOKEN' in text,
        'closedDialogPresent': 'C25_CLOSED_DIALOG' in text,
        'closedPopoverPresent': 'C25_CLOSED_POPOVER' in text,
        'bluePixels': blue_pixels(path),
    }


def cmd(page, command: str) -> dict:
    return page.evaluate("c=>__c25Command({type:'WEBCLIP_COMMAND',command:c})", command)


def inject(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET)
    page.add_script_tag(content=INERT)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)


def ui_state(page) -> dict:
    return page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const finish=s?.querySelector('button[data-action="finish"]');const modal=s?.querySelector('.backdrop');return {finish:!!finish,finishDisabled:!!finish?.disabled,modalDisplay:modal?getComputedStyle(modal).display:''}}""")


def trusted_finish(page, timeout_ms: int = 1800) -> dict:
    box = page.evaluate("""()=>{const b=document.getElementById('webclip-pdf-extension-root')?.shadowRoot?.querySelector('button[data-action="finish"]');if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:b.disabled}}""")
    if not box or box['disabled']:
        return {'attempted': False, 'clicked': False, 'box': box}
    before = ui_state(page)
    page.mouse.click(box['x'], box['y'])
    page.wait_for_timeout(150)
    after = ui_state(page)
    clicked = before.get('modalDisplay') != 'flex' and after.get('modalDisplay') == 'flex'
    return {'attempted': True, 'clicked': clicked, 'box': box, 'before': before, 'after': after}


def select_target(page, selector: str) -> None:
    assert cmd(page, 'start').get('ok') is True
    page.locator(selector).click(timeout=3000)
    page.wait_for_timeout(80)
    count = page.evaluate("()=>document.querySelectorAll('[data-webclip-pdf-include]').length")
    assert count == 1, count


def begin_prepare(page, *, forced_dispatch: bool = False) -> dict:
    assert cmd(page, 'download').get('ok') is True
    page.wait_for_timeout(40)
    if forced_dispatch:
        ok = page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true}));return true}""")
    else:
        ok = page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    assert ok
    page.wait_for_function("()=>!!globalThis.__c25.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c25.lastPdfRequest")


def finish_pdf(page) -> None:
    assert page.evaluate("()=>__c25Resolve()") is True
    page.wait_for_timeout(30)


def print_pdf(page, path: pathlib.Path) -> None:
    page.emulate_media(media='screen')
    page.pdf(path=str(path), format='A4', print_background=True)


def popover_fixture(kind: str, token: str) -> str:
    return f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C25_OUTSIDE_TOKEN</div><div id='pop' popover='{kind}'><article id='target' class='target'>{token}<div class='omit'>C25_EXCLUDE_TOKEN</div></article></div>"


def setup_popover(page, kind: str, token: str) -> None:
    page.set_viewport_size({'width':1100,'height':850})
    page.set_content(popover_fixture(kind, token), wait_until='load')
    page.evaluate("()=>document.querySelector('#pop').showPopover()")
    inject(page)
    select_target(page, '#target')
    assert cmd(page, 'mode-exclude').get('ok') is True
    page.locator('.omit').click(timeout=3000)
    assert cmd(page, 'mode-include').get('ok') is True


def auto_direct(ctx, out: pathlib.Path) -> dict:
    p = ctx.new_page(); setup_popover(p, 'auto', 'C25_AUTO_DIRECT')
    before = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    request = begin_prepare(p)
    after_prepare = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    path = out/'auto_direct.pdf'; print_pdf(p, path); pdf = summary(path, 'C25_AUTO_DIRECT'); finish_pdf(p); p.close()
    return {'before': before, 'afterPrepare': after_prepare, 'pdf': pdf, 'requestOk': bool(request)}


def auto_after_finish(ctx, out: pathlib.Path) -> dict:
    p = ctx.new_page(); setup_popover(p, 'auto', 'C25_AUTO_AFTER_FINISH')
    before = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    finish = trusted_finish(p)
    after_finish = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    request = begin_prepare(p)
    after_prepare = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    path = out/'auto_after_finish.pdf'; print_pdf(p, path); pdf = summary(path, 'C25_AUTO_AFTER_FINISH'); finish_pdf(p); p.close()
    return {'before': before, 'finish': finish, 'afterFinish': after_finish, 'afterPrepare': after_prepare, 'pdf': pdf, 'requestOk': bool(request)}


def manual_after_finish(ctx, out: pathlib.Path) -> dict:
    p = ctx.new_page(); setup_popover(p, 'manual', 'C25_MANUAL_AFTER_FINISH')
    before = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    finish = trusted_finish(p)
    after_finish = p.evaluate("()=>document.querySelector('#pop').matches(':popover-open')")
    request = begin_prepare(p)
    path = out/'manual_after_finish.pdf'; print_pdf(p, path); pdf = summary(path, 'C25_MANUAL_AFTER_FINISH'); finish_pdf(p); p.close()
    return {'before': before, 'finish': finish, 'afterFinish': after_finish, 'pdf': pdf, 'requestOk': bool(request)}


def modal_fixture() -> str:
    return f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C25_OUTSIDE_TOKEN</div><dialog id='dlg'><article id='target' class='target'>C25_MODAL_TARGET<div class='omit'>C25_EXCLUDE_TOKEN</div></article></dialog>"


def modal_case(ctx, out: pathlib.Path) -> dict:
    p = ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(modal_fixture(),wait_until='load');p.evaluate("()=>document.querySelector('#dlg').showModal()");inject(p);select_target(p,'#target');assert cmd(p,'mode-exclude').get('ok') is True;p.locator('.omit').click(timeout=3000);assert cmd(p,'mode-include').get('ok') is True
    before = {'open': p.evaluate("()=>document.querySelector('#dlg').open"), 'modal': p.evaluate("()=>document.querySelector('#dlg').matches(':modal')"), 'ui': ui_state(p)}
    finish = trusted_finish(p)
    after_finish = {'open': p.evaluate("()=>document.querySelector('#dlg').open"), 'modal': p.evaluate("()=>document.querySelector('#dlg').matches(':modal')"), 'ui': ui_state(p)}
    request = begin_prepare(p, forced_dispatch=True)
    path = out/'modal_forced.pdf'; print_pdf(p,path); pdf=summary(path,'C25_MODAL_TARGET'); finish_pdf(p);p.close()
    return {'before':before,'finish':finish,'afterFinish':after_finish,'pdf':pdf,'requestOk':bool(request)}


def closed_negative(ctx, out: pathlib.Path) -> dict:
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<main id='scope' class='target'>C25_VISIBLE_SCOPE<div id='closedPop' popover='auto'>C25_CLOSED_POPOVER</div><dialog id='closedDlg'>C25_CLOSED_DIALOG</dialog><div class='omit'>C25_EXCLUDE_TOKEN</div></main><div class='outside'>C25_OUTSIDE_TOKEN</div>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(html,wait_until='load');inject(p);assert cmd(p,'start').get('ok') is True;p.locator('#scope').click();assert cmd(p,'mode-exclude').get('ok') is True;p.locator('.omit').click();assert cmd(p,'mode-include').get('ok') is True;request=begin_prepare(p);path=out/'closed_negative.pdf';print_pdf(p,path);pdf=summary(path,'C25_VISIBLE_SCOPE');finish_pdf(p);p.close();return {'pdf':pdf,'requestOk':bool(request)}


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'autoDirect':auto_direct(ctx,out),'autoAfterFinish':auto_after_finish(ctx,out),'manualAfterFinish':manual_after_finish(ctx,out),'modal':modal_case(ctx,out),'closedNegative':closed_negative(ctx,out)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C25_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)

    a=result['autoDirect'];assert a['before'] and a['afterPrepare'] and a['pdf']['token'] and a['pdf']['bluePixels']>1000,a
    af=result['autoAfterFinish'];assert af['before'] and af['finish']['clicked'] and not af['afterFinish'] and not af['afterPrepare'] and not af['pdf']['token'],af
    m=result['manualAfterFinish'];assert m['before'] and m['finish']['clicked'] and m['afterFinish'] and m['pdf']['token'] and m['pdf']['bluePixels']>1000,m
    d=result['modal'];assert d['before']['open'] and d['before']['modal'] and not d['finish']['clicked'] and d['afterFinish']['open'] and d['afterFinish']['modal'] and d['pdf']['token'] and d['pdf']['bluePixels']>1000,d
    n=result['closedNegative'];assert n['pdf']['token'] and not n['pdf']['closedDialogPresent'] and not n['pdf']['closedPopoverPresent'] and not n['pdf']['excludePresent'] and not n['pdf']['outsidePresent'],n
    for key in ['autoDirect','autoAfterFinish','manualAfterFinish','modal']:
        assert not result[key]['pdf']['excludePresent'] and not result[key]['pdf']['outsidePresent'], (key,result[key])
    return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c25-')))

if __name__=='__main__':main()
