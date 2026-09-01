#!/usr/bin/env python3
"""Cycle-2 T1 Shadow/composed-tree View Transition physical PDF control."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

HTML = r'''<!doctype html><meta charset="utf-8">
<style>
@page { size:A4; margin:0; }
html,body { margin:0; background:white; }
#label { position:absolute;left:40px;top:24px;font:20px Arial;color:#111; }
#host { position:absolute;left:0;top:80px;width:760px;height:220px; }
</style>
<div id="label">SHADOW_VIEW_TRANSITION_CONTROL</div><div id="host"></div>
<script>
const root = host.attachShadow({mode:'open'});
root.innerHTML = `<style>
#scope { position:relative;width:760px;height:220px;contain:layout;overflow:visible; }
#box { position:absolute;left:40px;top:40px;width:120px;height:120px;background:#000;view-transition-name:shadowbox; }
::view-transition-group(shadowbox),::view-transition-old(shadowbox),::view-transition-new(shadowbox) {
  animation-duration:8s !important; animation-timing-function:linear !important;
}
</style><div id="scope"><div id="box"></div></div>`;
const scope = root.getElementById('scope');
const box = root.getElementById('box');
window.transitionAnimations = () => scope.getAnimations({subtree:true}).filter(a => String(a.effect?.pseudoElement || '').includes('view-transition'));
window.snapshot = () => ({
  box:box.getBoundingClientRect().toJSON(),
  styleLeft:box.style.left || getComputedStyle(box).left,
  animations:transitionAnimations().map(a => ({pseudo:String(a.effect?.pseudoElement || ''),currentTime:Number(a.currentTime||0),duration:Number(a.effect?.getTiming?.().duration||0),playState:String(a.playState||'')}))
});
window.startShadowTransition = async () => {
  if (typeof scope.startViewTransition !== 'function') return {unsupported:true};
  box.style.left='40px';
  const vt=scope.startViewTransition(() => { box.style.left='440px'; });
  await vt.ready;
  for (const a of transitionAnimations()) {
    const d=Number(a.effect?.getTiming?.().duration||0);
    if (d>0) { a.pause(); a.currentTime=d>=1000?d/2:d; }
  }
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await vt.updateCallbackDone;
  return snapshot();
};
</script>'''


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--chrome', required=True)
    p.add_argument('--out', type=Path, required=True)
    return p.parse_args()


def black_bbox(path: Path) -> list[int] | None:
    im = Image.open(path).convert('RGB')
    xs: list[int] = []
    ys: list[int] = []
    for y in range(80, min(im.height, 320)):
        for x in range(im.width):
            r,g,b = im.getpixel((x,y))
            if r < 25 and g < 25 and b < 25:
                xs.append(x); ys.append(y)
    return [min(xs),min(ys),max(xs)+1,max(ys)+1] if xs else None


def print_pdf(page) -> bytes:
    cdp=page.context.new_cdp_session(page)
    cdp.send('Page.enable')
    cdp.send('Emulation.setEmulatedMedia', {'media':'screen'})
    result=cdp.send('Page.printToPDF', {
        'landscape':False,'displayHeaderFooter':False,'printBackground':True,'scale':1,
        'preferCSSPageSize':True,'paperWidth':8.27,'paperHeight':11.69,
        'marginTop':0,'marginBottom':0,'marginLeft':0,'marginRight':0,
    })
    return base64.b64decode(result['data'])


def main() -> int:
    args=parse_args(); args.out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chrome,headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':800,'height':500},device_scale_factor=1)
        page.set_content(HTML)
        feature=page.evaluate("() => ({elementStart:typeof host.shadowRoot.getElementById('scope').startViewTransition, ua:navigator.userAgent})")
        admission=page.evaluate('startShadowTransition()')
        before=page.evaluate('snapshot()')
        screen_path=args.out/'shadow-active-mid-admission.png'; page.screenshot(path=str(screen_path))
        screen_bbox=black_bbox(screen_path)
        pdf=print_pdf(page); pdf_path=args.out/'shadow-active-mid.pdf'; pdf_path.write_bytes(pdf)
        doc=fitz.open(stream=pdf,filetype='pdf'); pix=doc[0].get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False)
        raster_path=args.out/'shadow-active-mid-pdf.png'; pix.save(str(raster_path))
        pdf_bbox=black_bbox(raster_path)
        after=page.evaluate('snapshot()')
        text=''.join(doc[i].get_text() for i in range(len(doc)))
        result={
          'browserVersion':browser.version,'features':feature,'admission':admission,'beforePrint':before,
          'admissionScreenshotBlackBBox':screen_bbox,'physicalPdfBlackBBox96dpi':pdf_bbox,'afterPrint':after,
          'pdfBytes':len(pdf),'pdfSha256':hashlib.sha256(pdf).hexdigest(),
          'pdfContainsControlLabel':'SHADOW_VIEW_TRANSITION_CONTROL' in text,
        }
        browser.close()
    (args.out/'shadow-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
