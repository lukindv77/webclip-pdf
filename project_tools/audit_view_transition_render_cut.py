#!/usr/bin/env python3
"""Managed-browser physical probe for Cycle-2 T1 View Transition render-cut fidelity.

The probe is intentionally self-contained and uses a local data URL. It does not
load the extension or touch a real user page. It asks the renderer a narrow
question needed by the audit: when a View Transition is visibly active at an
admitted sample, what does Page.printToPDF serialize and does the print call
alter/finish the active transition?
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

HTML = r'''<!doctype html><meta charset="utf-8"><style>
@page { size: A4; margin: 0; }
html, body { margin: 0; width: 100%; min-height: 100%; background: white; }
body { font: 20px/1.3 Arial, sans-serif; }
#label { position:absolute; left:40px; top:24px; color:#111; }
.scope { position:absolute; left:0; top:80px; width:760px; height:260px; contain:layout; overflow:visible; }
.box { position:absolute; left:40px; top:40px; width:120px; height:120px; background:#000; view-transition-name:box; }
#excluded { position:absolute; left:300px; top:190px; color:#111; }
#hover-only { display:none; position:absolute; left:40px; top:350px; color:#111; }
body:hover #hover-only { display:block; }
/* Long duration lets the probe pin the generated transition pseudo tree. */
::view-transition-group(box),
::view-transition-old(box),
::view-transition-new(box),
.scope::view-transition-group(box),
.scope::view-transition-old(box),
.scope::view-transition-new(box) {
  animation-duration: 8s !important;
  animation-timing-function: linear !important;
}
</style>
<div id="label">VIEW_TRANSITION_PHYSICAL_CONTROL</div>
<div id="scope" class="scope"><div id="box" class="box"></div><div id="excluded">EXCLUDED_CONTROL</div></div>
<div id="hover-only">HOVER_ONLY_MUST_BE_ABSENT</div>
<script>
const scope = document.getElementById('scope');
const box = document.getElementById('box');
const excluded = document.getElementById('excluded');
window.__transition = null;
window.__admission = null;

function transitionAnimations() {
  return document.getAnimations({subtree:true}).filter(a => String(a.effect?.pseudoElement || '').includes('view-transition'));
}
function animationSnapshot() {
  return transitionAnimations().map(a => ({
    pseudo: String(a.effect?.pseudoElement || ''),
    currentTime: Number(a.currentTime || 0),
    duration: Number(a.effect?.getTiming?.().duration || 0),
    playState: String(a.playState || '')
  }));
}
async function pinMidpoint(vt) {
  await vt.ready;
  const animations = transitionAnimations();
  for (const a of animations) {
    const duration = Number(a.effect?.getTiming?.().duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    a.pause();
    a.currentTime = Math.min(duration, duration >= 1000 ? duration / 2 : duration);
  }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__admission = {
    boxRect: box.getBoundingClientRect().toJSON(),
    animations: animationSnapshot(),
    excludedVisible: getComputedStyle(excluded).display !== 'none',
    hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
  };
  return window.__admission;
}
window.startDocumentTransition = async () => {
  box.style.left = '40px';
  const vt = document.startViewTransition(() => { box.style.left = '440px'; });
  window.__transition = vt;
  return pinMidpoint(vt);
};
window.startElementTransition = async () => {
  box.style.left = '40px';
  if (typeof scope.startViewTransition !== 'function') return {unsupported:true};
  const vt = scope.startViewTransition({ callback: () => { box.style.left = '440px'; } });
  window.__transition = vt;
  return pinMidpoint(vt);
};
window.transitionState = () => ({
  boxRect: box.getBoundingClientRect().toJSON(),
  animations: animationSnapshot(),
  hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
});
window.applySelectedOnlyBoundary = () => {
  excluded.style.display = 'none';
};
</script>'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--chrome', required=True, help='Chrome/Chromium executable')
    parser.add_argument('--out', type=Path, required=True)
    return parser.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def screenshot_black_bbox(path: Path) -> list[int] | None:
    im = Image.open(path).convert('RGB')
    xs: list[int] = []
    ys: list[int] = []
    for y in range(80, min(im.height, 340)):
        for x in range(im.width):
            r, g, b = im.getpixel((x, y))
            if r < 25 and g < 25 and b < 25:
                xs.append(x); ys.append(y)
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1] if xs else None


def pdf_black_bbox(pdf: bytes, png_path: Path) -> list[int] | None:
    doc = fitz.open(stream=pdf, filetype='pdf')
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
    pix.save(str(png_path))
    n, w, h, data = pix.n, pix.width, pix.height, pix.samples
    xs: list[int] = []
    ys: list[int] = []
    for y in range(80, min(h, 340)):
        row = y * w * n
        for x in range(w):
            i = row + x * n
            if data[i] < 25 and data[i + 1] < 25 and data[i + 2] < 25:
                xs.append(x); ys.append(y)
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1] if xs else None


def print_screen_media(page) -> bytes:
    cdp = page.context.new_cdp_session(page)
    cdp.send('Page.enable')
    cdp.send('Emulation.setEmulatedMedia', {'media': 'screen'})
    result = cdp.send('Page.printToPDF', {
        'landscape': False,
        'displayHeaderFooter': False,
        'printBackground': True,
        'scale': 1,
        'preferCSSPageSize': True,
        'paperWidth': 8.27,
        'paperHeight': 11.69,
        'marginTop': 0,
        'marginBottom': 0,
        'marginLeft': 0,
        'marginRight': 0,
    })
    return base64.b64decode(result['data'])


def run_scenario(browser, out: Path, name: str, starter: str | None) -> dict:
    page = browser.new_page(viewport={'width': 800, 'height': 600}, device_scale_factor=1)
    page.set_content(HTML)
    features = page.evaluate("""() => ({
      userAgent:navigator.userAgent,
      documentStart:typeof document.startViewTransition,
      elementStart:typeof document.getElementById('scope').startViewTransition,
      viewTransitionCss:CSS.supports('view-transition-name: box')
    })""")
    if starter:
        admission = page.evaluate(f'{starter}()')
        if admission.get('unsupported'):
            page.close()
            return {'name': name, 'features': features, 'unsupported': True}
    else:
        page.evaluate("box.style.left='440px'; applySelectedOnlyBoundary()")
        admission = page.evaluate("() => ({boxRect:box.getBoundingClientRect().toJSON(),animations:[],excludedVisible:getComputedStyle(excluded).display!=='none',hoverVisible:getComputedStyle(document.getElementById('hover-only')).display!=='none'})")

    # Exclude is applied after transition admission to check that final selected-only
    # filtering remains authoritative even if a transition snapshot already exists.
    page.evaluate('applySelectedOnlyBoundary()')
    before = page.evaluate('transitionState()')
    screenshot = out / f'{name}-admission.png'
    page.screenshot(path=str(screenshot))
    ss_bbox = screenshot_black_bbox(screenshot)

    pdf = print_screen_media(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    pdf_bbox = pdf_black_bbox(pdf, out / f'{name}-pdf.png')
    after = page.evaluate('transitionState()')
    text = ''.join(fitz.open(stream=pdf, filetype='pdf')[i].get_text() for i in range(len(fitz.open(stream=pdf, filetype='pdf'))))

    result = {
        'name': name,
        'features': features,
        'admission': admission,
        'beforePrint': before,
        'admissionScreenshotBlackBBox': ss_bbox,
        'physicalPdfBlackBBox96dpi': pdf_bbox,
        'afterPrint': after,
        'pdfBytes': len(pdf),
        'pdfSha256': sha256(pdf),
        'pdfContainsControlLabel': 'VIEW_TRANSITION_PHYSICAL_CONTROL' in text,
        'pdfContainsExcludedControl': 'EXCLUDED_CONTROL' in text,
        'pdfContainsHoverOnly': 'HOVER_ONLY_MUST_BE_ABSENT' in text,
    }
    page.close()
    return result


def main() -> int:
    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    results: dict = {'chromeExecutable': args.chrome, 'scenarios': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chrome, headless=True, args=['--no-sandbox'])
        results['browserVersion'] = browser.version
        results['scenarios'].append(run_scenario(browser, args.out, 'baseline-final', None))
        results['scenarios'].append(run_scenario(browser, args.out, 'document-active-mid', 'startDocumentTransition'))
        results['scenarios'].append(run_scenario(browser, args.out, 'element-active-mid', 'startElementTransition'))
        browser.close()

    path = args.out / 'results.json'
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
