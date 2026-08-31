#!/usr/bin/env python3
"""Cycle-2 T2 physical probe for modern pseudo/top-layer state.

The probe is self-contained and uses synthetic local pages only. It asks a
renderer-boundary question needed by the audit: does Page.printToPDF preserve
an admitted ::backdrop / ::scroll-marker state, and what happens when page-owned
beforeprint code mutates that browser-owned pseudo state at the physical render
cut?
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

WIDTH = 800
HEIGHT = 600

BACKDROP_HTML = r'''<!doctype html><meta charset="utf-8"><style>
@page { size: 800px 600px; margin: 0; }
html, body { margin:0; width:800px; height:600px; background:white; }
body { font: 20px Arial, sans-serif; }
dialog { width:280px; height:120px; border:6px solid #000; color:#000; background:#fff; }
dialog::backdrop { background: var(--bd, rgb(0,0,255)); }
#excluded { display:none !important; }
#hover-source { position:absolute; left:700px; top:500px; width:20px; height:20px; }
#hover-only { display:none; }
#hover-source:hover + #hover-only { display:block; }
</style>
<dialog id="d">BACKDROP_CONTROL<span id="excluded">EXCLUDED_CONTROL</span></dialog>
<div id="hover-source"></div><div id="hover-only">HOVER_ONLY_MUST_BE_ABSENT</div>
<script>
const d = document.getElementById('d');
d.showModal();
window.__setMutation = (enabled) => {
  if (!enabled) return;
  addEventListener('beforeprint', () => {
    document.documentElement.style.setProperty('--bd', 'rgb(255,0,0)');
  }, {once:true});
};
window.__state = () => {
  let pseudo = null;
  let pseudoError = '';
  try {
    pseudo = typeof d.pseudo === 'function' ? d.pseudo('::backdrop') : null;
  } catch (e) { pseudoError = String(e && e.message || e); }
  return {
    open: d.open,
    backdropComputed: getComputedStyle(d, '::backdrop').backgroundColor,
    backdropPseudoApi: typeof d.pseudo,
    backdropPseudoObject: Boolean(pseudo),
    backdropPseudoType: pseudo ? String(pseudo.type || '') : '',
    backdropPseudoError: pseudoError,
    hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
  };
};
</script>'''

SCROLL_HTML = r'''<!doctype html><meta charset="utf-8"><style>
@page { size: 800px 600px; margin: 0; }
html, body { margin:0; width:800px; height:600px; background:white; }
body { font: 20px Arial, sans-serif; }
#label { position:absolute; left:30px; top:20px; color:#111; }
.carousel {
  position:absolute; left:40px; top:80px; width:300px; height:160px;
  display:flex; overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x mandatory; scroll-marker-group: after;
  scrollbar-width:none; border:2px solid #111;
}
.item { flex:0 0 300px; height:160px; box-sizing:border-box; scroll-snap-align:start; padding:55px 20px; font-size:28px; }
.item::scroll-marker { content:""; width:30px; height:30px; border-radius:0; background:rgb(0,0,0); }
.item::scroll-marker:target-current { background:rgb(0,0,255); }
.carousel::scroll-marker-group {
  position:fixed; left:50px; top:300px; display:flex; gap:20px;
  padding:10px; background:rgb(0,255,0); z-index:20;
}
#excluded { display:none !important; }
#hover-source { position:absolute; left:700px; top:500px; width:20px; height:20px; }
#hover-only { display:none; position:absolute; left:400px; top:300px; color:#111; }
#hover-source:hover + #hover-only { display:block; }
</style>
<div id="label">SCROLL_MARKER_PHYSICAL_CONTROL</div>
<div id="car" class="carousel">
  <div id="i1" class="item">ONE</div>
  <div id="i2" class="item">TWO</div>
  <div id="i3" class="item">THREE</div>
</div>
<div id="excluded">EXCLUDED_CONTROL</div>
<div id="hover-source"></div><div id="hover-only">HOVER_ONLY_MUST_BE_ABSENT</div>
<script>
const car = document.getElementById('car');
const items = [i1,i2,i3];
window.__prepare = async (mutate) => {
  car.scrollLeft = 300;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (mutate) addEventListener('beforeprint', () => { car.scrollLeft = 600; }, {once:true});
};
window.__state = () => {
  const pseudo = [];
  for (const item of items) {
    let p = null, err = '';
    try { p = typeof item.pseudo === 'function' ? item.pseudo('::scroll-marker') : null; }
    catch (e) { err = String(e && e.message || e); }
    pseudo.push({
      id:item.id,
      pseudoApi:typeof item.pseudo,
      pseudoObject:Boolean(p),
      pseudoType:p ? String(p.type || '') : '',
      pseudoError:err,
      markerColor:getComputedStyle(item,'::scroll-marker').backgroundColor
    });
  }
  return {
    scrollLeft: car.scrollLeft,
    pseudo,
    hoverVisible:getComputedStyle(document.getElementById('hover-only')).display !== 'none'
  };
};
</script>'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--chrome', required=True)
    parser.add_argument('--out', type=Path, required=True)
    return parser.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def print_screen_pdf(page) -> bytes:
    cdp = page.context.new_cdp_session(page)
    cdp.send('Page.enable')
    cdp.send('Emulation.setEmulatedMedia', {'media': 'screen'})
    result = cdp.send('Page.printToPDF', {
        'displayHeaderFooter': False,
        'printBackground': True,
        'preferCSSPageSize': True,
        'marginTop': 0,
        'marginBottom': 0,
        'marginLeft': 0,
        'marginRight': 0,
    })
    return base64.b64decode(result['data'])


def render_pdf(pdf: bytes, png_path: Path) -> Image.Image:
    doc = fitz.open(stream=pdf, filetype='pdf')
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
    pix.save(str(png_path))
    return Image.open(png_path).convert('RGB')


def pdf_text(pdf: bytes) -> str:
    doc = fitz.open(stream=pdf, filetype='pdf')
    return ''.join(page.get_text() for page in doc)


def rgb(path: Path, x: int, y: int) -> list[int]:
    im = Image.open(path).convert('RGB')
    return list(im.getpixel((x, y)))


def image_rgb(im: Image.Image, x: int, y: int) -> list[int]:
    return list(im.getpixel((x, y)))


def marker_samples_from_path(path: Path) -> list[list[int]]:
    # Marker group is fixed at left=50/top=300, padding=10, markers 30x30,
    # gap=20. Sample centers are therefore x=75,125,175 and y=325.
    return [rgb(path, x, 325) for x in (75, 125, 175)]


def marker_samples_from_image(im: Image.Image) -> list[list[int]]:
    return [image_rgb(im, x, 325) for x in (75, 125, 175)]


def active_marker_index(samples: list[list[int]]) -> int | None:
    for idx, sample in enumerate(samples, start=1):
        r, g, b = sample
        if b > 180 and r < 80 and g < 80:
            return idx
    return None


def features(page) -> dict:
    return page.evaluate("""() => ({
      userAgent:navigator.userAgent,
      backdropSelector:CSS.supports('selector(dialog::backdrop)'),
      scrollMarkerGroup:CSS.supports('scroll-marker-group: after'),
      scrollMarkerSelector:CSS.supports('selector(.x::scroll-marker)'),
      elementPseudo:typeof Element.prototype.pseudo
    })""")


def run_backdrop(browser, out: Path, name: str, mutate: bool) -> dict:
    page = browser.new_page(viewport={'width': WIDTH, 'height': HEIGHT}, device_scale_factor=1)
    page.set_content(BACKDROP_HTML)
    page.evaluate('(mutate) => __setMutation(mutate)', mutate)
    page.mouse.move(799, 599)
    before = page.evaluate('__state()')
    screenshot = out / f'{name}-admission.png'
    page.screenshot(path=str(screenshot))
    admission_corner = rgb(screenshot, 10, 10)

    pdf = print_screen_pdf(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    pdf_png = out / f'{name}-pdf.png'
    pdf_image = render_pdf(pdf, pdf_png)
    physical_corner = image_rgb(pdf_image, 10, 10)
    after = page.evaluate('__state()')
    text = pdf_text(pdf)
    result = {
        'name': name,
        'features': features(page),
        'beforePrint': before,
        'admissionCornerRgb': admission_corner,
        'physicalPdfCornerRgb96dpi': physical_corner,
        'afterPrint': after,
        'pdfBytes': len(pdf),
        'pdfSha256': sha256(pdf),
        'admissionPngSha256': sha256(screenshot.read_bytes()),
        'pdfPngSha256': sha256(pdf_png.read_bytes()),
        'pdfContainsControlLabel': 'BACKDROP_CONTROL' in text,
        'pdfContainsExcludedControl': 'EXCLUDED_CONTROL' in text,
        'pdfContainsHoverOnly': 'HOVER_ONLY_MUST_BE_ABSENT' in text,
    }
    page.close()
    return result


def run_scroll(browser, out: Path, name: str, mutate: bool) -> dict:
    page = browser.new_page(viewport={'width': WIDTH, 'height': HEIGHT}, device_scale_factor=1)
    page.set_content(SCROLL_HTML)
    page.mouse.move(799, 599)
    page.evaluate('(mutate) => __prepare(mutate)', mutate)
    before = page.evaluate('__state()')
    screenshot = out / f'{name}-admission.png'
    page.screenshot(path=str(screenshot))
    admission_samples = marker_samples_from_path(screenshot)

    pdf = print_screen_pdf(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    pdf_png = out / f'{name}-pdf.png'
    pdf_image = render_pdf(pdf, pdf_png)
    physical_samples = marker_samples_from_image(pdf_image)
    after = page.evaluate('__state()')
    text = pdf_text(pdf)
    result = {
        'name': name,
        'features': features(page),
        'beforePrint': before,
        'admissionMarkerSamplesRgb': admission_samples,
        'admissionActiveMarkerIndex': active_marker_index(admission_samples),
        'physicalPdfMarkerSamplesRgb96dpi': physical_samples,
        'physicalPdfActiveMarkerIndex': active_marker_index(physical_samples),
        'afterPrint': after,
        'pdfText': text.strip(),
        'pdfBytes': len(pdf),
        'pdfSha256': sha256(pdf),
        'admissionPngSha256': sha256(screenshot.read_bytes()),
        'pdfPngSha256': sha256(pdf_png.read_bytes()),
        'pdfContainsControlLabel': 'SCROLL_MARKER_PHYSICAL_CONTROL' in text,
        'pdfContainsExcludedControl': 'EXCLUDED_CONTROL' in text,
        'pdfContainsHoverOnly': 'HOVER_ONLY_MUST_BE_ABSENT' in text,
    }
    page.close()
    return result


def main() -> int:
    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    result: dict = {'chromeExecutable': args.chrome, 'scenarios': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chrome, headless=True, args=['--no-sandbox'])
        result['browserVersion'] = browser.version
        result['scenarios'].append(run_backdrop(browser, args.out, 'backdrop-stable-blue', False))
        result['scenarios'].append(run_backdrop(browser, args.out, 'backdrop-beforeprint-red', True))
        result['scenarios'].append(run_scroll(browser, args.out, 'scroll-marker-stable-second', False))
        result['scenarios'].append(run_scroll(browser, args.out, 'scroll-marker-beforeprint-third', True))
        browser.close()

    path = args.out / 'results.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
