#!/usr/bin/env python3
"""Managed-browser physical probe for Cycle-2 T1 View Transition render-cut fidelity.

The probe is intentionally self-contained and uses only a local fixture. It does
not load the extension or touch a real user page. It asks the renderer the
narrow T1 question: when a document- or element-scoped View Transition is
visibly active at the admitted sample, what does Page.printToPDF serialize and
does the print call alter/finish the active transition?
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
.scope { position:absolute; left:0; width:760px; height:220px; contain:layout; overflow:visible; }
#scope { top:80px; }
#scope2 { top:320px; }
.box { position:absolute; left:40px; top:40px; width:120px; height:120px; background:#000; }
#box { view-transition-name:box; }
#box2 { view-transition-name:box2; }
#excluded { position:absolute; left:300px; top:180px; color:#111; }
#hover-only { display:none; position:absolute; left:40px; top:555px; color:#111; }
body:hover #hover-only { display:block; }
/* Long duration lets the probe pin the generated transition pseudo tree. */
::view-transition-group(box),
::view-transition-old(box),
::view-transition-new(box),
::view-transition-group(box2),
::view-transition-old(box2),
::view-transition-new(box2),
.scope::view-transition-group(box),
.scope::view-transition-old(box),
.scope::view-transition-new(box),
.scope::view-transition-group(box2),
.scope::view-transition-old(box2),
.scope::view-transition-new(box2) {
  animation-duration: 8s !important;
  animation-timing-function: linear !important;
}
</style>
<div id="label">VIEW_TRANSITION_PHYSICAL_CONTROL</div>
<div id="scope" class="scope"><div id="box" class="box"></div><div id="excluded">EXCLUDED_CONTROL</div></div>
<div id="scope2" class="scope"><div id="box2" class="box"></div></div>
<div id="hover-only">HOVER_ONLY_MUST_BE_ABSENT</div>
<script>
const scope = document.getElementById('scope');
const scope2 = document.getElementById('scope2');
const box = document.getElementById('box');
const box2 = document.getElementById('box2');
const excluded = document.getElementById('excluded');
window.__transitions = [];
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
function rectSnapshot() {
  return {
    box: box.getBoundingClientRect().toJSON(),
    box2: box2.getBoundingClientRect().toJSON(),
    boxStyleLeft: box.style.left || getComputedStyle(box).left,
    box2StyleLeft: box2.style.left || getComputedStyle(box2).left
  };
}
async function pinTransitionsAtMidpoint(vts) {
  await Promise.all(vts.map(vt => vt.ready));
  for (const a of transitionAnimations()) {
    const duration = Number(a.effect?.getTiming?.().duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    a.pause();
    a.currentTime = Math.min(duration, duration >= 1000 ? duration / 2 : duration);
  }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all(vts.map(vt => vt.updateCallbackDone.catch(() => null)));
  window.__admission = {
    ...rectSnapshot(),
    animations: animationSnapshot(),
    excludedVisible: getComputedStyle(excluded).display !== 'none',
    hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
  };
  return window.__admission;
}
window.startDocumentTransition = async () => {
  box.style.left = '40px';
  box2.style.display = 'none';
  const vt = document.startViewTransition(() => { box.style.left = '440px'; });
  window.__transitions = [vt];
  return pinTransitionsAtMidpoint([vt]);
};
window.startElementTransition = async () => {
  box.style.left = '40px';
  box2.style.display = 'none';
  if (typeof scope.startViewTransition !== 'function') return {unsupported:true};
  /* Function form is the normative updateCallback form. */
  const vt = scope.startViewTransition(() => { box.style.left = '440px'; });
  window.__transitions = [vt];
  return pinTransitionsAtMidpoint([vt]);
};
window.startConcurrentElementTransitions = async () => {
  box.style.left = '40px';
  box2.style.left = '40px';
  box2.style.display = 'block';
  if (typeof scope.startViewTransition !== 'function' || typeof scope2.startViewTransition !== 'function') return {unsupported:true};
  const vt1 = scope.startViewTransition(() => { box.style.left = '440px'; });
  const vt2 = scope2.startViewTransition(() => { box2.style.left = '440px'; });
  window.__transitions = [vt1, vt2];
  return pinTransitionsAtMidpoint([vt1, vt2]);
};
window.transitionState = () => ({
  ...rectSnapshot(),
  animations: animationSnapshot(),
  hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
});
window.applySelectedOnlyBoundary = () => { excluded.style.display = 'none'; };
</script>'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--chrome', required=True, help='Chrome/Chromium executable')
    parser.add_argument('--out', type=Path, required=True)
    return parser.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def black_components_image(im: Image.Image) -> list[list[int]]:
    im = im.convert('RGB')
    width, height = im.size
    # Only inspect the two fixture lanes; the textual label stays above y=80.
    mask: set[tuple[int, int]] = set()
    for y in range(80, min(height, 550)):
        for x in range(width):
            r, g, b = im.getpixel((x, y))
            if r < 25 and g < 25 and b < 25:
                mask.add((x, y))
    components: list[list[int]] = []
    while mask:
        start = mask.pop()
        stack = [start]
        xs = [start[0]]
        ys = [start[1]]
        while stack:
            x, y = stack.pop()
            for n in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if n in mask:
                    mask.remove(n)
                    stack.append(n)
                    xs.append(n[0])
                    ys.append(n[1])
        if len(xs) >= 100:  # ignore antialiased punctuation/noise
            components.append([min(xs), min(ys), max(xs) + 1, max(ys) + 1])
    return sorted(components, key=lambda b: (b[1], b[0]))


def screenshot_black_components(path: Path) -> list[list[int]]:
    return black_components_image(Image.open(path))


def pdf_black_components(pdf: bytes, png_path: Path) -> list[list[int]]:
    doc = fitz.open(stream=pdf, filetype='pdf')
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
    pix.save(str(png_path))
    return black_components_image(Image.open(png_path))


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
    page = browser.new_page(viewport={'width': 800, 'height': 650}, device_scale_factor=1)
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
        page.evaluate("box.style.left='440px'; box2.style.display='none'; applySelectedOnlyBoundary()")
        admission = page.evaluate("() => ({...rectSnapshot(),animations:[],excludedVisible:getComputedStyle(excluded).display!=='none',hoverVisible:getComputedStyle(document.getElementById('hover-only')).display!=='none'})")

    # Exclude is applied after transition admission to check that final selected-only
    # filtering remains authoritative even if a transition snapshot already exists.
    page.evaluate('applySelectedOnlyBoundary()')
    before = page.evaluate('transitionState()')
    screenshot = out / f'{name}-admission.png'
    page.screenshot(path=str(screenshot))
    ss_components = screenshot_black_components(screenshot)

    pdf = print_screen_media(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    pdf_components = pdf_black_components(pdf, out / f'{name}-pdf.png')
    after = page.evaluate('transitionState()')
    pdf_doc = fitz.open(stream=pdf, filetype='pdf')
    text = ''.join(pdf_doc[i].get_text() for i in range(len(pdf_doc)))

    result = {
        'name': name,
        'features': features,
        'admission': admission,
        'beforePrint': before,
        'admissionScreenshotBlackComponents': ss_components,
        'physicalPdfBlackComponents96dpi': pdf_components,
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
        results['scenarios'].append(run_scenario(browser, args.out, 'element-concurrent-mid', 'startConcurrentElementTransitions'))
        browser.close()

    path = args.out / 'results.json'
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
