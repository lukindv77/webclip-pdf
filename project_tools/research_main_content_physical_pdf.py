#!/usr/bin/env python3
"""C03 managed-Chromium L3/L4 probe: Main Content -> physical PDF.

Safe local fixtures only. The probe loads the repository's actual content.js, drives the
current `auto-content` and download preparation paths, holds the mocked worker reply while
Chromium physically prints the exact prepared page, and inspects PDF text with pypdf.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("chromium") or shutil.which("google-chrome") or "",
)

CHROME_MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c03={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c03.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c03Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c03ResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'c03.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = """
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;padding:24px}
main,article,section,div,nav,footer{box-sizing:border-box;display:block}
.box{width:680px;min-height:72px;padding:12px;margin:12px 0;border:1px solid #999}
</style>
"""


def pdf_text(path: pathlib.Path) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)


def load_content(page, html: str) -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until="load")
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__c03Command(payload)", payload)


def begin_auto(page) -> dict:
    started = command(page, {"type": "WEBCLIP_COMMAND", "command": "start"})
    assert started.get("ok") is True, started
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "auto-content"})
    assert result.get("ok") is True, result
    return result


def live_includes(page) -> list[dict]:
    return page.evaluate(
        """() => {
          const out=[]; const seen=new Set();
          const visit=(doc,path)=>{
            if(!doc||seen.has(doc)) return; seen.add(doc);
            for(const el of doc.querySelectorAll('[data-webclip-pdf-include]')){
              out.push({
                id:el.id||'', tag:el.localName||'', path,
                text:String(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,180)
              });
            }
            for(const frame of doc.querySelectorAll('iframe,frame')){
              try{const child=frame.contentDocument;if(child?.documentElement)visit(child,`${path}/${frame.id||frame.localName}`)}catch(_){}
            }
          };
          visit(document,'top'); return out;
        }"""
    )


def modal_click(page, label: str = "Сформировать PDF") -> None:
    clicked = page.evaluate(
        """(label)=>{
          const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);
          if(!b)return false;b.click();return true;
        }""",
        label,
    )
    assert clicked, label


def wait_prepared(page) -> dict:
    page.wait_for_function("()=>!!globalThis.__c03.lastPdfRequest", timeout=20000)
    return page.evaluate("()=>globalThis.__c03.lastPdfRequest")


def resolve_mock_pdf(page) -> None:
    assert page.evaluate("()=>__c03ResolvePdf()") is True
    page.wait_for_timeout(50)


def physical_save(page, out_dir: pathlib.Path, name: str) -> dict:
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "download"})
    assert result.get("ok") is True, result
    modal_click(page)
    request = wait_prepared(page)
    path = out_dir / f"{name}.pdf"
    page.pdf(path=str(path), format="A4", print_background=True)
    text = pdf_text(path)
    artifact = {
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "text": text,
        "selectionSnapshot": request.get("meta", {}).get("selectionSnapshot"),
    }
    resolve_mock_pdf(page)
    return artifact


def new_page(ctx, html: str):
    page = ctx.new_page(viewport={"width": 1100, "height": 800})
    load_content(page, html)
    return page


def assert_one_include(page, *, id_value: str = "", path_contains: str = "") -> list[dict]:
    items = live_includes(page)
    assert len(items) == 1, items
    if id_value:
        assert items[0]["id"] == id_value, items
    if path_contains:
        assert path_contains in items[0]["path"], items
    return items


def run(chromium: str, out_dir: pathlib.Path) -> dict:
    results: dict = {}
    strong = (
        "Main article content sentence with enough meaningful readable words for the automatic "
        "content heuristic and later-reading physical artifact. " * 8
    )
    tied = (
        "Equal article readable content that is plausible as a main story with sufficient length "
        "and identical semantic evidence. " * 8
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=chromium,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )
        ctx = browser.new_context()

        # PASS: credible semantic article wins over unrelated shell.
        page = new_page(
            ctx,
            f"""
            <nav class='box'>{'NAV_SHELL ' * 30}</nav>
            <article id='main-good' class='box'><h1>Readable title</h1><p>{strong}</p><p>MAIN_GOOD_MARKER</p></article>
            <footer class='box'>{'FOOTER_SHELL ' * 24}</footer>
            """,
        )
        begin_auto(page)
        selected = assert_one_include(page, id_value="main-good")
        artifact = physical_save(page, out_dir, "main_good")
        assert "MAIN_GOOD_MARKER" in artifact["text"]
        assert "NAV_SHELL" not in artifact["text"] and "FOOTER_SHELL" not in artifact["text"]
        results["semanticArticle"] = {"selected": selected, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # PASS: hidden semantic competitor must not win over visible credible article.
        page = new_page(
            ctx,
            f"""
            <article id='hidden-competitor' class='box' style='display:none'><p>{strong}</p><p>HIDDEN_COMPETITOR_MARKER</p></article>
            <article id='visible-good' class='box'><p>{strong}</p><p>VISIBLE_GOOD_MARKER</p></article>
            """,
        )
        begin_auto(page)
        selected = assert_one_include(page, id_value="visible-good")
        artifact = physical_save(page, out_dir, "hidden_competitor")
        assert "VISIBLE_GOOD_MARKER" in artifact["text"]
        assert "HIDDEN_COMPETITOR_MARKER" not in artifact["text"]
        results["hiddenRejected"] = {"selected": selected, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # FINDING P1-160: no credible main element, but weak BODY is still returned after fallback.
        nav_text = "NAV_ONLY_MARKER navigation link account settings categories archive " * 12
        footer_text = "FOOTER_ONLY_MARKER legal privacy contact terms copyright " * 10
        page = new_page(ctx, f"<nav class='box'>{nav_text}</nav><footer class='box'>{footer_text}</footer>")
        begin_auto(page)
        selected = assert_one_include(page)
        assert selected[0]["tag"] == "body", selected
        artifact = physical_save(page, out_dir, "weak_body_fallback")
        assert "NAV_ONLY_MARKER" in artifact["text"] and "FOOTER_ONLY_MARKER" in artifact["text"]
        results["weakBodyFallback"] = {"selected": selected, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # FINDING P1-160: equal-score semantic candidates use DOM order, not ambiguity/manual fallback.
        page = new_page(
            ctx,
            f"""
            <article id='equal-a' class='box'><p>{tied}</p><p>AAAAA_EQUAL_MARKER</p></article>
            <article id='equal-b' class='box'><p>{tied}</p><p>BBBBB_EQUAL_MARKER</p></article>
            """,
        )
        begin_auto(page)
        selected = assert_one_include(page, id_value="equal-a")
        artifact = physical_save(page, out_dir, "equal_candidate_dom_order")
        assert "AAAAA_EQUAL_MARKER" in artifact["text"]
        assert "BBBBB_EQUAL_MARKER" not in artifact["text"]
        results["equalDomOrderWinner"] = {"selected": selected, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        # FINDING P0-080: replacement disconnects selected Element, but stale map still admits save.
        page = new_page(ctx, f"<article id='stale-auto' class='box'><p>{strong}</p><p>STALE_AUTO_MARKER</p></article>")
        begin_auto(page)
        before = assert_one_include(page, id_value="stale-auto")
        page.evaluate(
            """() => {
              const old=document.querySelector('#stale-auto');
              const replacement=old.cloneNode(true);
              replacement.removeAttribute('data-webclip-pdf-include');
              replacement.textContent='LIVE_REPLACEMENT_UNSELECTED ' + 'replacement '.repeat(60);
              old.replaceWith(replacement);
            }"""
        )
        after = live_includes(page)
        assert after == [], after
        artifact = physical_save(page, out_dir, "stale_replacement")
        assert "STALE_AUTO_MARKER" not in artifact["text"]
        assert "LIVE_REPLACEMENT_UNSELECTED" not in artifact["text"]
        results["staleReplacement"] = {
            "before": before,
            "afterLiveIncludes": after,
            "bytes": artifact["bytes"],
            "sha256": artifact["sha256"],
        }
        page.close()

        # FINDING P0-070/P0-075: same selected Element can change logical content after scoring.
        page = new_page(ctx, f"<article id='mutating-auto' class='box'><p>{strong}</p><p>ORIGINAL_AUTO_MARKER</p></article>")
        begin_auto(page)
        selected = assert_one_include(page, id_value="mutating-auto")
        page.evaluate(
            """() => {
              const target=document.querySelector('#mutating-auto');
              target.replaceChildren(document.createTextNode('MUTATED_AFTER_AUTO_MARKER ' + 'changed '.repeat(80)));
            }"""
        )
        still_selected = assert_one_include(page, id_value="mutating-auto")
        artifact = physical_save(page, out_dir, "in_place_mutation")
        assert "MUTATED_AFTER_AUTO_MARKER" in artifact["text"]
        assert "ORIGINAL_AUTO_MARKER" not in artifact["text"]
        results["inPlaceMutation"] = {
            "before": selected,
            "after": still_selected,
            "bytes": artifact["bytes"],
            "sha256": artifact["sha256"],
        }
        page.close()

        # PASS: a strong same-origin frame article can become the exact physical selected scope.
        child = (
            "<!doctype html><meta charset='utf-8'>"
            + BASE_STYLE
            + f"<article id='frame-main' class='box'><h1>Frame article</h1><p>{strong}</p><p>FRAME_MAIN_MARKER</p></article>"
        )
        page = ctx.new_page(viewport={"width": 1100, "height": 800})
        page.set_content(
            f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}"
            "<section class='box'>TOP_SHELL_MARKER " + ("shell " * 20) + "</section>"
            "<iframe id='main-frame' style='width:760px;height:360px'></iframe>",
            wait_until="load",
        )
        page.locator("#main-frame").evaluate("(el,html)=>{el.srcdoc=html}", child)
        page.wait_for_function("()=>document.querySelector('#main-frame')?.contentDocument?.readyState==='complete'")
        page.evaluate(CHROME_MOCK)
        page.add_script_tag(content=CONTENT)
        begin_auto(page)
        selected = assert_one_include(page, id_value="frame-main", path_contains="main-frame")
        artifact = physical_save(page, out_dir, "same_origin_frame")
        assert "FRAME_MAIN_MARKER" in artifact["text"]
        assert "TOP_SHELL_MARKER" not in artifact["text"]
        results["sameOriginFrame"] = {"selected": selected, "bytes": artifact["bytes"], "sha256": artifact["sha256"]}
        page.close()

        browser.close()

    return results


def compact(results: dict) -> dict:
    return {
        "ok": True,
        "semanticArticle": results["semanticArticle"]["selected"],
        "hiddenRejected": results["hiddenRejected"]["selected"],
        "weakBodyFallback": results["weakBodyFallback"]["selected"],
        "equalDomOrderWinner": results["equalDomOrderWinner"]["selected"],
        "staleReplacement": {
            "before": results["staleReplacement"]["before"],
            "afterLiveIncludes": results["staleReplacement"]["afterLiveIncludes"],
        },
        "inPlaceMutation": {
            "before": results["inPlaceMutation"]["before"],
            "after": results["inPlaceMutation"]["after"],
        },
        "sameOriginFrame": results["sameOriginFrame"]["selected"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chromium", default=CHROMIUM_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chromium or not pathlib.Path(args.chromium).exists():
        raise SystemExit("Chromium executable not found; use --chromium PATH")

    if args.out:
        out_dir = pathlib.Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        results = run(args.chromium, out_dir)
        (out_dir / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c03-physical-") as tmp:
            results = run(args.chromium, pathlib.Path(tmp))

    print(json.dumps(compact(results), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
