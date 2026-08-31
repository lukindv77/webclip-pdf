#!/usr/bin/env python3
"""Cycle-2 T3 physical probe for Chrome 150+ text-fit/page-margin-safety.

Self-contained synthetic pages. The probe asks two mission-specific questions:
1) does Page.printToPDF preserve an admitted CSS text-fit geometry, and can
   page-owned beforeprint code substitute a different fitted typography/layout
   at the physical render cut?
2) what does page-margin-safety do on the virtual PDF target used by
   Page.printToPDF, with an ordinary @page margin control proving the harness
   can observe page-geometry changes?
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

TEXT_FIT_HTML = r'''<!doctype html><meta charset="utf-8"><style>
@page { size: 800px 600px; margin: 0; }
html, body { margin:0; width:800px; background:white; color:#111; }
body { font-family: Arial, sans-serif; }
#hero-wrap { container-type:inline-size; width:var(--fit-width, 680px); margin:20px; }
#hero {
  width:100%; white-space:nowrap; text-fit:grow per-line-all;
  font-size:12px; line-height:1.1; border:2px solid rgb(0,0,0);
  box-sizing:border-box;
}
.fitline {
  width:var(--fit-width, 680px); margin:0 20px 4px 20px;
  white-space:nowrap; text-fit:grow per-line-all;
  font-size:10px; line-height:1.05;
}
#excluded { display:none !important; }
#hover-source { position:fixed; left:760px; top:560px; width:20px; height:20px; }
#hover-only { display:none; }
#hover-source:hover + #hover-only { display:block; }
</style>
<div id="hero-wrap"><div id="hero">TEXT_FIT_PHYSICAL_CONTROL</div></div>
<div id="lines"></div>
<div id="excluded">EXCLUDED_CONTROL</div>
<div id="hover-source"></div><div id="hover-only">HOVER_ONLY_MUST_BE_ABSENT</div>
<script>
const lines = document.getElementById('lines');
for (let i=1; i<=22; i++) {
  const d = document.createElement('div');
  d.className = 'fitline';
  d.textContent = `FIT_PAGE_${String(i).padStart(2,'0')}_ABCDEFGHIJKLMN`;
  lines.appendChild(d);
}
window.__setMutation = (enabled) => {
  if (!enabled) return;
  addEventListener('beforeprint', () => {
    document.documentElement.style.setProperty('--fit-width', '340px');
  }, {once:true});
};
window.__state = () => {
  const hero = document.getElementById('hero');
  const range = document.createRange();
  range.selectNodeContents(hero);
  const rr = range.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const first = document.querySelector('.fitline');
  const fr = first.getBoundingClientRect();
  return {
    supportsTextFit: CSS.supports('text-fit: grow per-line-all'),
    computedTextFit: getComputedStyle(hero).getPropertyValue('text-fit'),
    computedFontSize: getComputedStyle(hero).fontSize,
    heroBox: {x:hr.x,y:hr.y,width:hr.width,height:hr.height},
    heroTextRect: {x:rr.x,y:rr.y,width:rr.width,height:rr.height},
    firstLineBox: {x:fr.x,y:fr.y,width:fr.width,height:fr.height},
    scrollHeight: document.documentElement.scrollHeight,
    hoverVisible: getComputedStyle(document.getElementById('hover-only')).display !== 'none'
  };
};
</script>'''

PAGE_MARGIN_TEMPLATE = r'''<!doctype html><meta charset="utf-8"><style>
@page {{
  size: 800px 600px;
  margin: {margin};
  page-margin-safety: {safety};
  @top-left {{ content:"MARGIN_BOX_CONTROL"; font:20px Arial, sans-serif; }}
}}
html, body {{ margin:0; background:white; color:#111; }}
body {{ font:20px Arial, sans-serif; }}
#content {{ margin:0; padding:0; }}
</style>
<div id="content">PAGE_MARGIN_BODY_CONTROL</div>
<script>
window.__pageState = () => {{
  const rules = [...document.styleSheets[0].cssRules];
  const page = rules.find(r => String(r.cssText || '').startsWith('@page')) || null;
  const style = page && page.style ? page.style : null;
  return {{
    cssText: page ? page.cssText : '',
    parsedSafety: style ? style.getPropertyValue('page-margin-safety') : '',
    parsedMargin: style ? style.getPropertyValue('margin') : ''
  }};
}};
</script>'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--chrome', required=True)
    parser.add_argument('--out', type=Path, required=True)
    return parser.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def print_pdf(page) -> bytes:
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


def pdf_doc(pdf: bytes) -> fitz.Document:
    return fitz.open(stream=pdf, filetype='pdf')


def pdf_text(pdf: bytes) -> str:
    doc = pdf_doc(pdf)
    return ''.join(page.get_text() for page in doc)


def pdf_page_count(pdf: bytes) -> int:
    return pdf_doc(pdf).page_count


def first_text_bbox(pdf: bytes, needle: str) -> list[float] | None:
    doc = pdf_doc(pdf)
    for page in doc:
        rects = page.search_for(needle)
        if rects:
            r = rects[0]
            return [round(v * 96 / 72, 3) for v in (r.x0, r.y0, r.x1, r.y1)]
    return None


def render_first_page(pdf: bytes, path: Path) -> None:
    doc = pdf_doc(pdf)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
    pix.save(str(path))


def run_text_fit(browser, out: Path, name: str, mutate: bool) -> dict:
    page = browser.new_page(viewport={'width': WIDTH, 'height': HEIGHT}, device_scale_factor=1)
    page.set_content(TEXT_FIT_HTML)
    page.mouse.move(799, 599)
    page.evaluate('(enabled) => __setMutation(enabled)', mutate)
    before = page.evaluate('__state()')
    admission = out / f'{name}-admission.png'
    page.screenshot(path=str(admission), full_page=True)

    pdf = print_pdf(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    pdf_png = out / f'{name}-pdf-page1.png'
    render_first_page(pdf, pdf_png)
    after = page.evaluate('__state()')
    text = pdf_text(pdf)
    result = {
        'name': name,
        'beforePrint': before,
        'afterPrint': after,
        'pdfPageCount': pdf_page_count(pdf),
        'pdfHeroTextBBoxCssPx': first_text_bbox(pdf, 'TEXT_FIT_PHYSICAL_CONTROL'),
        'pdfFirstFitLineBBoxCssPx': first_text_bbox(pdf, 'FIT_PAGE_01_ABCDEFGHIJKLMN'),
        'pdfBytes': len(pdf),
        'pdfSha256': sha256(pdf),
        'admissionPngSha256': sha256(admission.read_bytes()),
        'pdfPngSha256': sha256(pdf_png.read_bytes()),
        'pdfContainsHero': 'TEXT_FIT_PHYSICAL_CONTROL' in text,
        'pdfContainsLastLine': 'FIT_PAGE_22_ABCDEFGHIJKLMN' in text,
        'pdfContainsExcluded': 'EXCLUDED_CONTROL' in text,
        'pdfContainsHoverOnly': 'HOVER_ONLY_MUST_BE_ABSENT' in text,
    }
    page.close()
    return result


def run_page_margin(browser, out: Path, safety: str, margin: str) -> dict:
    name = f'page-margin-{safety}-{margin.replace(" ", "_")}'
    page = browser.new_page(viewport={'width': WIDTH, 'height': HEIGHT}, device_scale_factor=1)
    page.set_content(PAGE_MARGIN_TEMPLATE.format(safety=safety, margin=margin))
    state = page.evaluate('__pageState()')
    pdf = print_pdf(page)
    pdf_path = out / f'{name}.pdf'
    pdf_path.write_bytes(pdf)
    png = out / f'{name}-pdf-page1.png'
    render_first_page(pdf, png)
    text = pdf_text(pdf)
    result = {
        'name': name,
        'safety': safety,
        'margin': margin,
        'cssom': state,
        'pdfPageCount': pdf_page_count(pdf),
        'pdfMarginBoxBBoxCssPx': first_text_bbox(pdf, 'MARGIN_BOX_CONTROL'),
        'pdfBodyBBoxCssPx': first_text_bbox(pdf, 'PAGE_MARGIN_BODY_CONTROL'),
        'pdfBytes': len(pdf),
        'pdfSha256': sha256(pdf),
        'pdfPngSha256': sha256(png.read_bytes()),
        'pdfContainsMarginBox': 'MARGIN_BOX_CONTROL' in text,
        'pdfContainsBody': 'PAGE_MARGIN_BODY_CONTROL' in text,
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
        ua_page = browser.new_page()
        result['userAgent'] = ua_page.evaluate('navigator.userAgent')
        ua_page.close()
        result['scenarios'].append(run_text_fit(browser, args.out, 'text-fit-stable-wide', False))
        result['scenarios'].append(run_text_fit(browser, args.out, 'text-fit-beforeprint-narrow', True))
        for safety in ('none', 'clamp', 'add'):
            result['scenarios'].append(run_page_margin(browser, args.out, safety, '0'))
        result['scenarios'].append(run_page_margin(browser, args.out, 'none', '40px'))
        browser.close()

    path = args.out / 'results.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
