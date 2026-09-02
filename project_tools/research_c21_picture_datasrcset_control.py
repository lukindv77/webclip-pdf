#!/usr/bin/env python3
"""C21 focused control for offscreen picture/source[data-srcset] materialization."""
from __future__ import annotations
import argparse, hashlib, json, pathlib, tempfile, time
from playwright.sync_api import sync_playwright
from research_c21_lazy_offscreen_resources import (
    AssetServer, CHROME_DEFAULT, COLORS, setup_top, prepare, finish, img_state, summary, report
)

def run(chrome: str, out: pathlib.Path):
    out.mkdir(parents=True, exist_ok=True)
    server=AssetServer().start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
            ctx=browser.new_context();page=ctx.new_page()
            transparent='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
            orange=server.url('orange')
            markup=f"<picture><source id='source' data-srcset='{orange} 1x'><img id='asset' class='asset' loading='lazy' width='220' height='140' src='{transparent}'></picture>"
            setup_top(page,f"<article id='target'><div class='omit'>C21_EXCLUDE_TOKEN</div><div class='spacer'></div>{markup}</article>")
            before=img_state(page)
            t=time.monotonic();req=prepare(page);prepare_seconds=time.monotonic()-t
            after_prepare=img_state(page)
            page.wait_for_timeout(2500)
            after_settle=img_state(page)
            settled_path=out/'picture_settled.pdf';page.emulate_media(media='screen');page.pdf(path=str(settled_path),format='A4',print_background=True)
            settled=summary(settled_path,COLORS['orange'])
            causal_state=page.evaluate("""async expected=>{const s=document.querySelector('#source');const i=document.querySelector('#asset');s?.remove();i.removeAttribute('srcset');i.setAttribute('src',expected);i.setAttribute('loading','eager');try{await i.decode()}catch(_){}return {complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,currentSrc:i.currentSrc||'',src:i.getAttribute('src')||''}}""",orange)
            causal_path=out/'picture_causal_final_img.pdf';page.pdf(path=str(causal_path),format='A4',print_background=True)
            causal=summary(causal_path,COLORS['orange'])
            result={'browserVersion':browser.version,'before':before,'afterPrepare':after_prepare,'afterSettle':after_settle,'causalState':causal_state,'prepareSeconds':prepare_seconds,'resourceReport':report(req),'requests':server.counts['/asset/orange.svg'],'settled':settled,'causal':causal}
            browser.close()
    finally:server.stop()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C21_PICTURE_CONTROL_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    assert settled['colorPixels']==0 and after_settle['currentSrc'].startswith('data:image/gif'), result
    assert causal['colorPixels']>500 and causal_state['naturalWidth']>0 and causal_state['currentSrc'].startswith('http://127.0.0.1:'), result
    assert not causal['excludePresent'] and not causal['outsidePresent'], result
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome:raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='c21-picture-')))
if __name__=='__main__':main()
