#!/usr/bin/env python3
"""Cycle-2 T4 / PD4 physical probe for scoped custom-element registries.

Loads the real content.js and exercises four current-Chrome 146+ cases:
1) scoped registry positive rendering inside a selected top-level ShadowRoot;
2) SelectionSnapshot restore when two visually different scoped registries share
   the same ordinary locator-visible host identity;
3) Main Content discovery when the semantically strongest article lives inside
   a scoped ShadowRoot;
4) same-origin iframe flattening when selected content is rendered only through
   a scoped ShadowRoot registry.

The probe writes physical PDFs and first-page rasters; verdicts are based on
actual artifact text/colors, not screenshots alone.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
from typing import Any

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")

CHROME_MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__t4 = { listeners, lastPdfRequest: null };
  globalThis.chrome = {
    runtime: {
      onMessage: { addListener(fn) { listeners.push(fn); } },
      sendMessage(message) {
        if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') {
          return Promise.resolve({ ok: true, frames: [] });
        }
        if (message?.type === 'WEBCLIP_GENERATE_PDF') {
          globalThis.__t4.lastPdfRequest = message;
          return new Promise(resolve => { resolvePdf = resolve; });
        }
        return Promise.resolve({ ok: true });
      }
    }
  };
  globalThis.__t4Command = message => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = value => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__t4ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 't4.pdf' });
    return true;
  };
})();
"""

BASE_STYLE = r"""
<style>
html,body{margin:0;padding:0;background:white;color:#111}
body{font-family:Arial,sans-serif;padding:24px}
.box{box-sizing:border-box;width:680px;min-height:90px;margin:12px 0;padding:12px;border:2px solid #222}
.shell{box-sizing:border-box;width:680px;padding:10px;margin:10px 0;border:1px solid #999}
</style>
"""

REGISTRY_HELPERS = r"""
() => {
  globalThis.__registrySupport = {
    constructible: typeof CustomElementRegistry === 'function',
    shadowOption: false,
    individualOption: false,
    initialize: typeof CustomElementRegistry === 'function' &&
      typeof CustomElementRegistry.prototype.initialize === 'function'
  };
  const probeReg = new CustomElementRegistry();
  const probeHost = document.createElement('div');
  document.body.append(probeHost);
  try {
    globalThis.__registrySupport.shadowOption =
      !!probeHost.attachShadow({mode:'open', customElementRegistry:probeReg});
  } catch (_) {}
  probeHost.remove();
  try {
    globalThis.__registrySupport.individualOption =
      !!document.createElement('section', {customElementRegistry:probeReg});
  } catch (_) {}

  globalThis.__makeRegistry = (color, visibleText) => {
    const registry = new CustomElementRegistry();
    registry.define('audit-card', class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        const s = this.attachShadow({mode:'open'});
        s.innerHTML = `<style>
          :host{display:block}
          .visual{display:block;box-sizing:border-box;width:520px;height:120px;
            padding:24px;background:${color};color:white;font:700 24px Arial,sans-serif;
            border:4px solid black}
        </style><div class="visual">${visibleText}</div>`;
      }
    });
    return registry;
  };

  globalThis.__makeScopedHost = (registry, marker) => {
    const host = document.createElement('section', {customElementRegistry: registry});
    host.className = 'box scoped-host';
    host.setAttribute('role', 'article');
    host.setAttribute('aria-label', 'Scoped article');
    host.setAttribute('title', 'Scoped title');
    host.innerHTML = `<audit-card></audit-card><span>${marker}</span>`;
    document.body.append(host);
    return host;
  };
};
"""


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", required=True)
    p.add_argument("--out", type=pathlib.Path, required=True)
    return p.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_text(pdf: bytes) -> str:
    doc = fitz.open(stream=pdf, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def render_pdf(pdf: bytes, path: pathlib.Path) -> None:
    doc = fitz.open(stream=pdf, filetype="pdf")
    doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False).save(str(path))


def color_counts(path: pathlib.Path) -> dict[str, int]:
    red = blue = green = 0
    for r, g, b in Image.open(path).convert("RGB").getdata():
        if r > 180 and g < 90 and b < 90:
            red += 1
        if b > 180 and r < 90 and g < 90:
            blue += 1
        if g > 120 and r < 110 and b < 110:
            green += 1
    return {"red": red, "blue": blue, "green": green}


def load_content(page, html: str = "") -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until="load")
    page.evaluate(REGISTRY_HELPERS)
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def command(page, payload: dict[str, Any]) -> dict[str, Any]:
    return page.evaluate("payload => __t4Command(payload)", payload)


def start(page) -> None:
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "start"})
    assert result.get("ok") is True, result


def click_selector(page, selector: str) -> None:
    result = page.evaluate(
        "s => document.querySelector(s).dispatchEvent(new MouseEvent('click',"
        "{bubbles:true,cancelable:true,composed:true,view:window}))",
        selector,
    )
    assert result is False, (selector, result)


def click_frame_selector(page, frame_selector: str, target_selector: str) -> None:
    result = page.evaluate(
        """([fs,ts]) => {
          const f=document.querySelector(fs), t=f.contentDocument.querySelector(ts);
          return t.dispatchEvent(new f.contentWindow.MouseEvent('click',
            {bubbles:true,cancelable:true,composed:true,view:f.contentWindow}));
        }""",
        [frame_selector, target_selector],
    )
    assert result is False, result


def modal_click(page, label: str = "Сформировать PDF") -> None:
    ok = page.evaluate(
        """label => {
          const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          const b=[...(s?.querySelectorAll('.modal-actions button')||[])]
            .find(x=>x.textContent.trim()===label);
          if(!b) return false;
          b.click();
          return true;
        }""",
        label,
    )
    assert ok, label


def wait_prepared(page) -> dict[str, Any]:
    page.wait_for_function("() => !!globalThis.__t4.lastPdfRequest", timeout=20000)
    return page.evaluate("() => globalThis.__t4.lastPdfRequest")


def resolve_pdf(page) -> None:
    assert page.evaluate("() => __t4ResolvePdf()") is True
    page.wait_for_timeout(60)


def physical_save(page, out: pathlib.Path, name: str) -> dict[str, Any]:
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "download"})
    assert result.get("ok") is True, result
    modal_click(page)
    request = wait_prepared(page)
    pdf = page.pdf(format="A4", print_background=True)
    pdf_path = out / f"{name}.pdf"
    pdf_path.write_bytes(pdf)
    png_path = out / f"{name}-page1.png"
    render_pdf(pdf, png_path)
    artifact = {
        "bytes": len(pdf),
        "sha256": sha256(pdf),
        "text": pdf_text(pdf),
        "rasterSha256": sha256(png_path.read_bytes()),
        "colors": color_counts(png_path),
        "selectionSnapshot": request.get("meta", {}).get("selectionSnapshot"),
    }
    resolve_pdf(page)
    return artifact


def top_includes(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('[data-webclip-pdf-include]')].map(e => ({
          tag:e.localName,id:e.id||'',text:e.textContent||'',
          shadowText:e.shadowRoot?.textContent||''
        }))"""
    )


def scoped_hosts(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('.scoped-host')].map((e,i) => ({
          i, selected:e.hasAttribute('data-webclip-pdf-include'),
          light:e.textContent||'', visual:e.querySelector('audit-card')?.shadowRoot?.textContent||''
        }))"""
    )


def capture_snapshot(ctx, out: pathlib.Path) -> dict[str, Any]:
    page = ctx.new_page()
    load_content(page, "<div id='registry-guard' class='box'>REGISTRY_GUARD_MARKER</div>")
    page.evaluate(
        """() => {
          const a=__makeRegistry('rgb(220,0,0)','REGISTRY_A_RENDER');
          __makeScopedHost(a,'LOCATOR_SAME_MARKER');
        }"""
    )
    start(page)
    click_selector(page, "#registry-guard")
    click_selector(page, ".scoped-host")
    artifact = physical_save(page, out, "snapshot_source_registry_a")
    snapshot = artifact["selectionSnapshot"]
    assert snapshot and len(snapshot.get("includes", [])) == 2, snapshot
    assert "REGISTRY_GUARD_MARKER" in artifact["text"]
    assert artifact["colors"]["red"] > artifact["colors"]["blue"] * 5 + 1000, artifact["colors"]
    page.close()
    return snapshot


def run(args) -> dict[str, Any]:
    args.out.mkdir(parents=True, exist_ok=True)
    results: dict[str, Any] = {}
    strong = (
        "Deep composed article content with enough meaningful readable words to dominate "
        "main content discovery when the rendered composed tree is respected. " * 14
    )
    decoy = (
        "Light DOM article candidate with ordinary readable words for deterministic automatic selection. " * 12
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=args.chrome,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )
        results["browserVersion"] = browser.version
        ctx = browser.new_context(viewport={"width": 1100, "height": 800})

        # Feature support + independent registries on individual element scopes.
        page = ctx.new_page()
        load_content(page)
        support = page.evaluate(
            """() => {
              const a=__makeRegistry('rgb(220,0,0)','REGISTRY_A_RENDER');
              const b=__makeRegistry('rgb(0,0,220)','REGISTRY_B_RENDER');
              const ea=__makeScopedHost(a,'LOCATOR_SAME_MARKER');
              const eb=__makeScopedHost(b,'LOCATOR_SAME_MARKER');
              return {
                support:__registrySupport,
                aVisual:ea.querySelector('audit-card')?.shadowRoot?.textContent||'',
                bVisual:eb.querySelector('audit-card')?.shadowRoot?.textContent||'',
                sameTag:ea.localName===eb.localName,
                sameLight:ea.textContent===eb.textContent
              };
            }"""
        )
        assert support["support"]["constructible"]
        assert support["support"]["shadowOption"]
        assert support["support"]["individualOption"]
        assert support["sameTag"] and support["sameLight"], support
        assert "REGISTRY_A_RENDER" in support["aVisual"] and "REGISTRY_B_RENDER" in support["bVisual"], support
        results["featureSupport"] = support
        page.close()

        # Positive control: scoped registry in selected top-level ShadowRoot is physically printable.
        page = ctx.new_page()
        load_content(page, "<div id='top-host' class='box'></div><div class='shell'>TOP_UNSELECTED_SHELL</div>")
        page.evaluate(
            """() => {
              const r=__makeRegistry('rgb(220,0,0)','TOP_SCOPED_RENDER');
              const h=document.querySelector('#top-host');
              const s=h.attachShadow({mode:'open',customElementRegistry:r});
              s.innerHTML='<audit-card></audit-card>';
            }"""
        )
        start(page)
        click_selector(page, "#top-host")
        artifact = physical_save(page, args.out, "top_shadow_scoped_positive")
        assert "TOP_SCOPED_RENDER" in artifact["text"]
        assert "TOP_UNSELECTED_SHELL" not in artifact["text"]
        assert artifact["colors"]["red"] > artifact["colors"]["blue"] * 5 + 1000, artifact["colors"]
        results["topShadowPositive"] = {
            "includes": top_includes(page),
            "colors": artifact["colors"],
            "sha256": artifact["sha256"],
            "rasterSha256": artifact["rasterSha256"],
        }
        page.close()

        # SelectionSnapshot ambiguity: same ordinary host identity, different scoped registry visual semantics.
        snapshot = capture_snapshot(ctx, args.out)
        page = ctx.new_page()
        load_content(page, "<div id='registry-guard' class='box'>REGISTRY_GUARD_MARKER</div>")
        page.evaluate(
            """() => {
              const b=__makeRegistry('rgb(0,0,220)','REGISTRY_B_RENDER');
              const a=__makeRegistry('rgb(220,0,0)','REGISTRY_A_RENDER');
              __makeScopedHost(b,'LOCATOR_SAME_MARKER');
              __makeScopedHost(a,'LOCATOR_SAME_MARKER');
            }"""
        )
        before = scoped_hosts(page)
        restore = command(page, {"type": "WEBCLIP_APPLY_SELECTION_SNAPSHOT", "snapshot": snapshot})
        assert restore.get("ok") is True, restore
        after = scoped_hosts(page)
        artifact = physical_save(page, args.out, "selection_registry_identity_swap")
        assert "REGISTRY_GUARD_MARKER" in artifact["text"]
        results["selectionRegistrySwap"] = {
            "restore": restore,
            "before": before,
            "after": after,
            "includes": top_includes(page),
            "pdfContainsA": "REGISTRY_A_RENDER" in artifact["text"],
            "pdfContainsB": "REGISTRY_B_RENDER" in artifact["text"],
            "colors": artifact["colors"],
            "sha256": artifact["sha256"],
            "rasterSha256": artifact["rasterSha256"],
        }
        page.close()

        # Main Content: semantically strongest scoped-shadow article is invisible to document-level discovery.
        page = ctx.new_page()
        load_content(
            page,
            "<div id='xroot' class='box'></div>"
            "<article id='light-decoy' class='box'><p>" + decoy + "</p><p>LIGHT_DECOY_MARKER</p></article>",
        )
        page.evaluate(
            """strong => {
              const r=new CustomElementRegistry();
              r.define('audit-main',class extends HTMLElement{
                connectedCallback(){
                  if(this.shadowRoot)return;
                  const s=this.attachShadow({mode:'open'});
                  s.innerHTML=`<article role="main" style="display:block;box-sizing:border-box;width:650px;
                    padding:20px;background:rgb(0,150,0);color:white"><h1>Scoped main</h1>
                    <p>${strong}</p><p>SCOPED_SHADOW_MAIN_MARKER</p></article>`;
                }
              });
              const h=document.querySelector('#xroot');
              const s=h.attachShadow({mode:'open',customElementRegistry:r});
              s.innerHTML='<audit-main></audit-main>';
            }""",
            strong,
        )
        composed = page.evaluate(
            """() => ({
              shadowMarker:document.querySelector('#xroot').shadowRoot.textContent,
              shadowArticle:!!document.querySelector('#xroot').shadowRoot
                .querySelector('audit-main').shadowRoot.querySelector('article[role=main]'),
              docSeesShadowArticle:!!document.querySelector('article[role=main]')
            })"""
        )
        assert composed["shadowArticle"] and not composed["docSeesShadowArticle"], composed
        start(page)
        auto = command(page, {"type": "WEBCLIP_COMMAND", "command": "auto-content"})
        assert auto.get("ok") is True, auto
        chosen = top_includes(page)
        artifact = physical_save(page, args.out, "main_content_scoped_shadow")
        assert len(chosen) == 1 and chosen[0]["id"] == "light-decoy", chosen
        assert "LIGHT_DECOY_MARKER" in artifact["text"]
        assert "SCOPED_SHADOW_MAIN_MARKER" not in artifact["text"]
        results["mainContentShadowBlind"] = {
            "composed": composed,
            "chosen": chosen,
            "colors": artifact["colors"],
            "sha256": artifact["sha256"],
        }
        page.close()

        # Same-origin iframe positive control.
        plain_html = """<!doctype html><meta charset='utf-8'><style>
          body{margin:0}.plain{box-sizing:border-box;width:600px;height:120px;padding:20px;
          background:rgb(0,150,0);color:white;font:24px Arial}</style>
          <article id='plain-target' class='plain'>PLAIN_FRAME_POSITIVE</article>"""
        page = ctx.new_page()
        load_content(page, "<div class='shell'>TOP_FRAME_SHELL</div><iframe id='plain-frame' style='width:760px;height:280px'></iframe>")
        page.locator("#plain-frame").evaluate("(el,html)=>{el.srcdoc=html}", plain_html)
        page.wait_for_function("()=>document.querySelector('#plain-frame')?.contentDocument?.readyState==='complete'")
        start(page)
        click_frame_selector(page, "#plain-frame", "#plain-target")
        artifact = physical_save(page, args.out, "same_origin_plain_frame_positive")
        assert "PLAIN_FRAME_POSITIVE" in artifact["text"]
        assert "TOP_FRAME_SHELL" not in artifact["text"]
        results["plainFramePositive"] = {
            "colors": artifact["colors"],
            "sha256": artifact["sha256"],
            "rasterSha256": artifact["rasterSha256"],
        }
        page.close()

        # Same-origin iframe scoped-registry case. The selected frame host has no light-DOM
        # representation of the custom element's visual state; flattening must not be credited
        # unless the physical PDF actually contains it.
        frame_html = """<!doctype html><meta charset='utf-8'><style>
          body{margin:0}#frame-host{display:block;width:620px;height:150px}</style>
          <div id='frame-host'></div>"""
        page = ctx.new_page()
        load_content(page, "<div class='shell'>TOP_SCOPED_FRAME_SHELL</div><iframe id='scoped-frame' style='width:760px;height:280px'></iframe>")
        page.locator("#scoped-frame").evaluate("(el,html)=>{el.srcdoc=html}", frame_html)
        page.wait_for_function("()=>document.querySelector('#scoped-frame')?.contentDocument?.readyState==='complete'")
        before = page.evaluate(
            """() => {
              const f=document.querySelector('#scoped-frame'), w=f.contentWindow, d=f.contentDocument;
              const h=d.querySelector('#frame-host'), r=new w.CustomElementRegistry();
              r.define('audit-card',class extends w.HTMLElement{
                connectedCallback(){
                  if(this.shadowRoot)return;
                  const s=this.attachShadow({mode:'open'});
                  s.innerHTML='<div style="display:block;box-sizing:border-box;width:520px;height:120px;'
                    +'padding:20px;background:rgb(220,0,0);color:white;font:24px Arial">'
                    +'FRAME_SCOPED_REGISTRY_RENDER</div>';
                }
              });
              const s=h.attachShadow({mode:'open',customElementRegistry:r});
              s.innerHTML='<audit-card></audit-card>';
              const card=s.querySelector('audit-card');
              return {
                upgraded:!!card.shadowRoot,
                scopedText:card.shadowRoot?.textContent||'',
                bodyText:d.body.innerText,
                hostLightText:h.textContent||''
              };
            }"""
        )
        assert before["upgraded"] and "FRAME_SCOPED_REGISTRY_RENDER" in before["scopedText"], before
        start(page)
        click_frame_selector(page, "#scoped-frame", "#frame-host")
        artifact = physical_save(page, args.out, "same_origin_scoped_registry_frame")
        assert "TOP_SCOPED_FRAME_SHELL" not in artifact["text"]
        results["scopedFrameFlatten"] = {
            "before": before,
            "pdfContainsScopedRender": "FRAME_SCOPED_REGISTRY_RENDER" in artifact["text"],
            "colors": artifact["colors"],
            "sha256": artifact["sha256"],
            "rasterSha256": artifact["rasterSha256"],
        }
        page.close()

        browser.close()
    return results


def main() -> int:
    args = parse_args()
    results = run(args)
    path = args.out / "results.json"
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
