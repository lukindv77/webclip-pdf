#!/usr/bin/env python3
"""Temporary C05 diagnostic probe: source geometry -> WebClip prepared print geometry -> physical PDF boxes."""
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

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

CHROME_MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c05 = {listeners, lastPdfRequest: null};
  globalThis.chrome = {runtime: {
    onMessage: {addListener(fn) { listeners.push(fn); }},
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok: true, frames: []});
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c05.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ok: true});
    }
  }};
  globalThis.__c05Command = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ok: true});
    } catch (error) { reject(error); }
  });
  globalThis.__c05ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ok: true, filename: 'c05.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = """
<style>
html { background: white; }
body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.3; margin: 24px; }
.scope { box-sizing: border-box; border: 1px solid #999; padding: 12px; margin: 10px 0; }
.marker { display: inline-block; padding: 2px; }
</style>
"""


def command(page, payload):
    return page.evaluate("(payload) => __c05Command(payload)", payload)


def click(page, selector):
    result = page.evaluate(
        """(selector) => document.querySelector(selector).dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,view:window}))""",
        selector,
    )
    assert result is False, (selector, result)


def modal_click(page, label="Сформировать PDF"):
    clicked = page.evaluate(
        """(label) => {
          const s = document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          const b = [...(s?.querySelectorAll('.modal-actions button') || [])].find(x => x.textContent.trim() === label);
          if (!b) return false;
          b.click();
          return true;
        }""",
        label,
    )
    assert clicked, label


def wait_prepared(page):
    page.wait_for_function("() => !!globalThis.__c05.lastPdfRequest", timeout=20000)
    return page.evaluate("() => globalThis.__c05.lastPdfRequest")


def resolve_mock_pdf(page):
    assert page.evaluate("() => __c05ResolvePdf()") is True
    page.wait_for_timeout(40)


def rects(page, selectors, fragment_selectors=()):
    return page.evaluate(
        """({selectors, fragments}) => {
          const out = {};
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (!el) { out[selector] = null; continue; }
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            out[selector] = {
              x:r.x, y:r.y, width:r.width, height:r.height,
              left:r.left, top:r.top, right:r.right, bottom:r.bottom,
              display:cs.display, position:cs.position, transform:cs.transform,
              writingMode:cs.writingMode, overflowX:cs.overflowX, overflowY:cs.overflowY
            };
          }
          for (const selector of fragments) {
            const el = document.querySelector(selector);
            if (!el) continue;
            const range = document.createRange();
            range.selectNodeContents(el);
            out[selector + '::fragments'] = [...range.getClientRects()].map(r => ({x:r.x,y:r.y,width:r.width,height:r.height}));
          }
          const hr = document.documentElement.getBoundingClientRect();
          const br = document.body.getBoundingClientRect();
          out.__root = {
            viewport:{width:innerWidth,height:innerHeight},
            html:{x:hr.x,y:hr.y,width:hr.width,height:hr.height,style:{position:getComputedStyle(document.documentElement).position,transform:getComputedStyle(document.documentElement).transform,width:getComputedStyle(document.documentElement).width}},
            body:{x:br.x,y:br.y,width:br.width,height:br.height,style:{position:getComputedStyle(document.body).position,transform:getComputedStyle(document.body).transform,width:getComputedStyle(document.body).width,marginLeft:getComputedStyle(document.body).marginLeft}}
          };
          return out;
        }""",
        {"selectors": list(selectors), "fragments": list(fragment_selectors)},
    )


def pdf_words(path):
    doc = fitz.open(str(path))
    pages = []
    for pno, page in enumerate(doc):
        words = []
        for item in page.get_text("words"):
            x0, y0, x1, y1, text, block, line, word = item[:8]
            words.append({"text": text, "x0": x0, "y0": y0, "x1": x1, "y1": y1, "page": pno, "block": block, "line": line, "word": word})
        pages.append(words)
    doc.close()
    return pages


def marker_boxes(word_pages, markers):
    out = {}
    for marker in markers:
        hits = []
        for words in word_pages:
            for w in words:
                text = w["text"].strip()
                if text == marker or marker in text:
                    hits.append(w)
        out[marker] = hits
    return out


def physical_case(ctx, out_dir, spec):
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 820})
    page.set_content(
        f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}{spec.get('style','')}</head><body>{spec['html']}</body></html>",
        wait_until="load",
    )
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)
    page.wait_for_timeout(80)

    source = rects(page, spec["selectors"], spec.get("fragments", ()))
    assert command(page, {"type":"WEBCLIP_COMMAND","command":"start"}).get("ok") is True
    includes = spec["include"] if isinstance(spec["include"], list) else [spec["include"]]
    for selector in includes:
        click(page, selector)
    excludes = spec.get("exclude", [])
    excludes = excludes if isinstance(excludes, list) else ([excludes] if excludes else [])
    if excludes:
        assert command(page, {"type":"WEBCLIP_COMMAND","command":"mode-exclude"}).get("ok") is True
        for selector in excludes:
            click(page, selector)
    assert command(page, {"type":"WEBCLIP_COMMAND","command":"download"}).get("ok") is True
    modal_click(page)
    request = wait_prepared(page)
    snapshot = request.get("meta", {}).get("selectionSnapshot", {})
    assert len(snapshot.get("includes", [])) == len(includes), request

    # page.pdf() uses print media; emulate it explicitly first so prepared DOM geometry is measurable.
    page.emulate_media(media="print")
    page.wait_for_timeout(80)
    prepared = rects(page, spec["selectors"], spec.get("fragments", ()))

    path = out_dir / f"{spec['name']}.pdf"
    page.pdf(path=str(path), format="A4", print_background=True, prefer_css_page_size=False)
    words = pdf_words(path)
    markers = marker_boxes(words, spec["markers"])
    result = {
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "source": source,
        "preparedPrint": prepared,
        "pdfMarkers": markers,
        "selection": request.get("meta", {}).get("pageAnalysis", {}).get("selection"),
    }
    for marker in spec["markers"]:
        assert markers.get(marker), {"case": spec["name"], "missingPdfMarker": marker, "markers": markers}
    resolve_mock_pdf(page)
    page.close()
    return result


def specs():
    return [
        {
            "name":"normal_flow",
            "html":"<section id='scope' class='scope' style='width:680px'><div id='a' style='width:300px;height:54px'>C05_FLOW_A</div><div id='b' style='width:510px;height:70px;margin-top:22px'>C05_FLOW_B</div></section>",
            "include":"#scope", "selectors":["#scope","#a","#b"], "markers":["C05_FLOW_A","C05_FLOW_B"]
        },
        {
            "name":"flex_row",
            "html":"<section id='scope' class='scope' style='display:flex;width:720px;gap:34px;align-items:flex-start'><div id='a' style='flex:0 0 180px;height:72px'>C05_FLEX_A</div><div id='b' style='flex:0 0 260px;height:96px'>C05_FLEX_B</div></section>",
            "include":"#scope", "selectors":["#scope","#a","#b"], "markers":["C05_FLEX_A","C05_FLEX_B"]
        },
        {
            "name":"grid_2x2",
            "html":"<section id='scope' class='scope' style='display:grid;width:720px;grid-template-columns:2fr 1fr;grid-template-rows:80px 110px;gap:20px'><div id='a'>C05_GRID_A</div><div id='b'>C05_GRID_B</div><div id='c'>C05_GRID_C</div><div id='d'>C05_GRID_D</div></section>",
            "include":"#scope", "selectors":["#scope","#a","#b","#c","#d"], "markers":["C05_GRID_A","C05_GRID_B","C05_GRID_C","C05_GRID_D"]
        },
        {
            "name":"inline_fragmentation",
            "html":"<section id='scope' class='scope' style='width:270px'><p id='frag' style='margin:0'>C05_FRAG_A alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron C05_FRAG_B</p></section>",
            "include":"#scope", "selectors":["#scope","#frag"], "fragments":["#frag"], "markers":["C05_FRAG_A","C05_FRAG_B"]
        },
        {
            "name":"relative_absolute",
            "html":"<section id='scope' class='scope' style='position:relative;width:650px;height:230px'><div id='anchor' style='position:relative;left:45px;top:18px;width:180px'>C05_REL_A</div><div id='abs' style='position:absolute;left:310px;top:120px;width:190px'>C05_ABS_B</div></section>",
            "include":"#scope", "selectors":["#scope","#anchor","#abs"], "markers":["C05_REL_A","C05_ABS_B"]
        },
        {
            "name":"transform_child",
            "html":"<section id='scope' class='scope' style='position:relative;width:650px;height:250px'><div id='origin' style='width:180px'>C05_TRANSFORM_ORIGIN</div><div id='moved' style='width:180px;transform:translate(150px,45px) scale(1.2);transform-origin:0 0'>C05_TRANSFORM_MOVED</div></section>",
            "include":"#scope", "selectors":["#scope","#origin","#moved"], "markers":["C05_TRANSFORM_ORIGIN","C05_TRANSFORM_MOVED"]
        },
        {
            "name":"body_width_context",
            "style":"<style>body{width:700px;margin-left:150px;margin-right:0} #scope{width:50%;margin-left:0}</style>",
            "html":"<section id='scope' class='scope'><div id='inner' style='width:100%'>C05_BODY_WIDTH</div></section>",
            "include":"#scope", "selectors":["#scope","#inner"], "markers":["C05_BODY_WIDTH"]
        },
        {
            "name":"body_transform_context",
            "style":"<style>body{transform:translateX(140px) scale(.82);transform-origin:0 0} #scope{width:620px;margin-left:0}</style>",
            "html":"<section id='scope' class='scope'><div id='inner' style='width:420px'>C05_BODY_TRANSFORM</div></section>",
            "include":"#scope", "selectors":["#scope","#inner"], "markers":["C05_BODY_TRANSFORM"]
        },
        {
            "name":"nested_percentages",
            "html":"<section id='scope' class='scope' style='width:700px'><div id='outer' style='width:600px'><div id='mid' style='width:75%'><div id='inner' style='width:50%'>C05_PERCENT_INNER</div></div></div></section>",
            "include":"#scope", "selectors":["#scope","#outer","#mid","#inner"], "markers":["C05_PERCENT_INNER"]
        },
        {
            "name":"table_fixed",
            "html":"<section id='scope' class='scope' style='width:760px'><table id='table' style='table-layout:fixed;width:720px;border-collapse:collapse'><col style='width:30%'><col style='width:70%'><tbody><tr><td id='a'>C05_TABLE_A</td><td id='b'>C05_TABLE_B</td></tr><tr><td>C05_TABLE_C</td><td>C05_TABLE_D</td></tr></tbody></table></section>",
            "include":"#scope", "selectors":["#scope","#table","#a","#b"], "markers":["C05_TABLE_A","C05_TABLE_B","C05_TABLE_C","C05_TABLE_D"]
        },
        {
            "name":"vertical_writing",
            "html":"<section id='scope' class='scope' style='width:320px;height:340px;writing-mode:vertical-rl'><div id='a' style='height:130px'>C05_VERTICAL_A</div><div id='b' style='height:150px;margin-right:24px'>C05_VERTICAL_B</div></section>",
            "include":"#scope", "selectors":["#scope","#a","#b"], "markers":["C05_VERTICAL_A","C05_VERTICAL_B"]
        },
        {
            "name":"multicolumn",
            "html":"<section id='scope' class='scope' style='width:720px;column-count:2;column-gap:48px;column-fill:auto;height:280px'><div id='a' style='break-after:column;height:220px'>C05_COLUMN_A<br>alpha<br>beta<br>gamma</div><div id='b' style='height:180px'>C05_COLUMN_B<br>delta<br>epsilon</div></section>",
            "include":"#scope", "selectors":["#scope","#a","#b"], "markers":["C05_COLUMN_A","C05_COLUMN_B"]
        },
        {
            "name":"exclude_flex_reflow",
            "html":"<section id='scope' class='scope' style='display:flex;width:700px;gap:30px'><div id='a' style='flex:0 0 150px'>C05_EX_A</div><div id='cut' style='flex:0 0 150px'>C05_EX_CUT</div><div id='c' style='flex:0 0 150px'>C05_EX_C</div></section>",
            "include":"#scope", "exclude":"#cut", "selectors":["#scope","#a","#cut","#c"], "markers":["C05_EX_A","C05_EX_C"]
        },
    ]


def run(chromium, out_dir):
    results = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chromium, headless=True, args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"])
        ctx = browser.new_context()
        for spec in specs():
            results[spec["name"]] = physical_case(ctx, out_dir, spec)
        ctx.close()
        browser.close()
    return results


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--chromium", default=CHROMIUM_DEFAULT)
    p.add_argument("--out-dir", default="")
    args = p.parse_args()
    if not args.chromium:
        raise SystemExit("Chromium/Chrome binary not found")
    if args.out_dir:
        out = pathlib.Path(args.out_dir)
        out.mkdir(parents=True, exist_ok=True)
        result = run(args.chromium, out)
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c05-") as tmp:
            result = run(args.chromium, pathlib.Path(tmp))
    print(json.dumps({"audit":"C05 geometry/layout diagnostic", "result":result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
