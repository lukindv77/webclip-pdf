#!/usr/bin/env python3
"""Fresh C24 exact-source Chrome probe: disclosure preparation -> physical PDF.

Safe synthetic local fixtures only. The current repository guard prefix and content.js
are loaded, actual Include/Exclude + download preparation is driven, the worker reply is
held, and the prepared document is physically printed. A separate test-only disconnected
static-clone case is the causal representation control.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c24 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c24.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c24Command = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c24ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c24.pdf' });
    return true;
  };
})();
"""

FIXTURE = r"""<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:18px;background:#eee}
#scope{width:760px;margin:14px auto;padding:12px;border:2px solid #555}.panel{padding:10px;margin:6px 0;border:1px solid #888}.omit{padding:12px;background:#fee}
button,a,summary{font:inherit}.row{margin:8px 0}
</style>
<div class="outside">C24_OUTSIDE_TOP</div>
<main id="scope">
  <details id="nativeClosed"><summary>NATIVE_SUMMARY</summary><p>NATIVE_CLOSED_CONTENT</p></details>
  <details id="nativeOpen" open><summary>OPEN_SUMMARY</summary><p>NATIVE_ALREADY_OPEN</p></details>
  <div class="omit">C24_EXCLUDE_TOKEN</div>
  <div class="row"><button id="aria" aria-expanded="false" aria-controls="ariaPanel">ARIA_DISCLOSURE</button><div id="ariaPanel" hidden class="panel">ARIA_EXISTING_PANEL</div></div>
  <div class="row"><button id="stateful" aria-expanded="false" aria-controls="statefulPanel">STATEFUL_DISCLOSURE</button><div id="statefulPanel" hidden class="panel">STATEFUL_EXISTING_PANEL</div></div>
  <form id="form" class="row"><button id="submitCtrl" type="submit" aria-expanded="false" aria-controls="submitPanel">SUBMIT_DISCLOSURE</button><div id="submitPanel" hidden class="panel">SUBMIT_EXISTING_PANEL</div></form>
  <div class="row"><a id="anchorCtrl" href="/would-navigate" aria-expanded="false" aria-controls="anchorPanel">ANCHOR_DISCLOSURE</a><div id="anchorPanel" hidden class="panel">ANCHOR_EXISTING_PANEL</div></div>
</main>
<div class="outside">C24_OUTSIDE_BOTTOM</div>
<script>
window.c24Page={clicks:[],submits:0,toggles:[],nativeCreated:0,statefulCreated:0,mutations:0};
const ids=new Set(['aria','stateful','submitCtrl','anchorCtrl']);
document.addEventListener('click',e=>{if(ids.has(e.target?.id)){c24Page.clicks.push(e.target.id);if(e.target.id==='anchorCtrl')e.preventDefault()}},true);
document.querySelector('#form').addEventListener('submit',e=>{c24Page.submits++;e.preventDefault()});
for(const d of document.querySelectorAll('details')) d.addEventListener('toggle',()=>c24Page.toggles.push(d.id));
document.querySelector('#nativeClosed').addEventListener('toggle',()=>{
  const d=document.querySelector('#nativeClosed');
  if(d.open&&!document.querySelector('#nativeCreated')){const p=document.createElement('p');p.id='nativeCreated';p.textContent='NATIVE_TOGGLE_CREATED_CONTENT';d.appendChild(p);c24Page.nativeCreated++}
});
document.querySelector('#aria').addEventListener('click',()=>{const p=document.querySelector('#ariaPanel');p.hidden=false;document.querySelector('#aria').setAttribute('aria-expanded','true')});
document.querySelector('#stateful').addEventListener('click',()=>{const p=document.querySelector('#statefulPanel');p.hidden=false;document.querySelector('#stateful').setAttribute('aria-expanded','true');if(!document.querySelector('#statefulCreated')){const x=document.createElement('div');x.id='statefulCreated';x.textContent='STATEFUL_CREATED_BY_PAGE_CLICK';p.appendChild(x);c24Page.statefulCreated++}});
new MutationObserver(ms=>{c24Page.mutations+=ms.length}).observe(document.querySelector('#scope'),{subtree:true,attributes:true,childList:true});
window.c24Metrics=()=>({
  page:JSON.parse(JSON.stringify(c24Page)),
  nativeClosed:document.querySelector('#nativeClosed').open,
  nativeOpen:document.querySelector('#nativeOpen').open,
  ariaExpanded:document.querySelector('#aria').getAttribute('aria-expanded'),
  ariaHidden:document.querySelector('#ariaPanel').hidden,
  statefulExpanded:document.querySelector('#stateful').getAttribute('aria-expanded'),
  statefulHidden:document.querySelector('#statefulPanel').hidden,
  submitExpanded:document.querySelector('#submitCtrl').getAttribute('aria-expanded'),
  submitHidden:document.querySelector('#submitPanel').hidden,
  anchorExpanded:document.querySelector('#anchorCtrl').getAttribute('aria-expanded'),
  anchorHidden:document.querySelector('#anchorPanel').hidden,
  nativeCreated:!!document.querySelector('#nativeCreated'),
  statefulCreated:!!document.querySelector('#statefulCreated')
});
</script>"""


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages), len(reader.pages)


def pdf_summary(path: pathlib.Path) -> dict:
    text, pages = pdf_text(path)
    return {
        "pages": pages,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "nativeClosed": "NATIVE_CLOSED_CONTENT" in text,
        "nativeOpen": "NATIVE_ALREADY_OPEN" in text,
        "nativeCreated": "NATIVE_TOGGLE_CREATED_CONTENT" in text,
        "ariaPanel": "ARIA_EXISTING_PANEL" in text,
        "statefulPanel": "STATEFUL_EXISTING_PANEL" in text,
        "statefulCreated": "STATEFUL_CREATED_BY_PAGE_CLICK" in text,
        "submitPanel": "SUBMIT_EXISTING_PANEL" in text,
        "anchorPanel": "ANCHOR_EXISTING_PANEL" in text,
        "excludePresent": "C24_EXCLUDE_TOKEN" in text,
        "outsideTopPresent": "C24_OUTSIDE_TOP" in text,
        "outsideBottomPresent": "C24_OUTSIDE_BOTTOM" in text,
    }


def cmd(page, command: str) -> dict:
    return page.evaluate("c=>__c24Command({type:'WEBCLIP_COMMAND',command:c})", command)


def click(page, selector: str) -> None:
    ok = page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true;}""", selector)
    assert ok, selector


def inject_current_prefix(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET)
    page.add_script_tag(content=INERT)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)


def start_and_select(page) -> None:
    inject_current_prefix(page)
    assert cmd(page, "start").get("ok") is True
    click(page, "#scope")
    assert cmd(page, "mode-exclude").get("ok") is True
    click(page, ".omit")
    assert cmd(page, "mode-include").get("ok") is True


def begin_prepare(page) -> dict:
    assert cmd(page, "download").get("ok") is True
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click();}""")
    page.wait_for_function("()=>!!globalThis.__c24.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c24.lastPdfRequest")


def finish(page) -> None:
    assert page.evaluate("()=>__c24ResolvePdf()") is True
    page.wait_for_timeout(30)


def suspicious_disclosure_meta_paths(value, prefix="meta") -> list[str]:
    hits: list[str] = []
    def visit(v, path):
        if isinstance(v, dict):
            for k, item in v.items():
                p = f"{path}.{k}"
                low = str(k).lower()
                if any(token in low for token in ("disclosure", "spoiler", "sourcestate", "staticrepresentation", "expandedfrom")):
                    hits.append(p)
                visit(item, p)
        elif isinstance(v, list):
            for i, item in enumerate(v[:32]):
                visit(item, f"{path}[{i}]")
    visit(value, prefix)
    return hits


def current_path(ctx, out: pathlib.Path) -> dict:
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(FIXTURE, wait_until="load")
    start_and_select(page)
    before = page.evaluate("()=>c24Metrics()")
    request = begin_prepare(page)
    page.wait_for_timeout(250)
    prepared = page.evaluate("()=>c24Metrics()")
    guard = page.evaluate("()=>({...(globalThis.WebClipHostControlActivationGuard?.stats||{})})")
    path = out / "current_path.pdf"
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    after_print = page.evaluate("()=>c24Metrics()")
    pdf = pdf_summary(path)
    result = {
        "before": before,
        "prepared": prepared,
        "afterPrint": after_print,
        "guardStats": guard,
        "pdf": pdf,
        "disclosureMetaPaths": suspicious_disclosure_meta_paths((request or {}).get("meta", {})),
    }
    finish(page)
    page.close()
    return result


def causal_static(ctx, out: pathlib.Path) -> dict:
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(FIXTURE, wait_until="load")
    before = page.evaluate("()=>c24Metrics()")
    materialized = page.evaluate("""()=>{
      const source=document.querySelector('#scope');
      const clone=source.cloneNode(true);
      clone.id='c24-causal-static';
      clone.setAttribute('data-webclip-pdf-include','c24-causal');
      clone.querySelectorAll('.omit').forEach(e=>e.remove());
      clone.querySelectorAll('details').forEach(d=>{d.open=true});
      for(const control of clone.querySelectorAll('[aria-controls]')){
        const id=control.getAttribute('aria-controls');const panel=id?clone.querySelector('#'+CSS.escape(id)):null;
        if(panel){panel.hidden=false;panel.setAttribute('aria-hidden','false');panel.style.setProperty('display','block','important');panel.style.setProperty('visibility','visible','important');panel.style.setProperty('opacity','1','important');panel.style.setProperty('max-height','none','important');panel.style.setProperty('height','auto','important');panel.style.setProperty('overflow','visible','important');control.setAttribute('aria-expanded','true')}
      }
      document.querySelector('#scope').style.display='none';
      document.querySelectorAll('.outside').forEach(e=>e.style.display='none');
      document.body.appendChild(clone);
      return {details:[...clone.querySelectorAll('details')].map(d=>({id:d.id,open:d.open})),panels:[...clone.querySelectorAll('[aria-controls]')].map(c=>({id:c.id,expanded:c.getAttribute('aria-expanded')}))};
    }""")
    page.wait_for_timeout(250)
    after_materialize = page.evaluate("()=>c24Metrics()")
    path = out / "causal_static.pdf"
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    pdf = pdf_summary(path)
    after_print = page.evaluate("()=>c24Metrics()")
    result = {"before": before, "materialized": materialized, "sourceAfterMaterialize": after_materialize, "sourceAfterPrint": after_print, "pdf": pdf}
    page.close()
    return result


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        ctx = browser.new_context()
        result = {
            "browserVersion": browser.version,
            "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
            "hostGuardBlobSha": os.environ.get("HOST_GUARD_BLOB_SHA", ""),
            "currentPath": current_path(ctx, out),
            "causalStatic": causal_static(ctx, out),
        }
        browser.close()
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C24_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    # Raw result above is emitted before assertions. Assertions validate current-source
    # behavior and the causal representation control without hiding a changed browser result.
    c = result["currentPath"]
    assert c["before"]["nativeClosed"] is False and c["prepared"]["nativeClosed"] is True, c
    assert c["guardStats"].get("blockedPageClicks", 0) >= 4, c
    assert c["prepared"]["page"]["clicks"] == [] and c["prepared"]["page"]["submits"] == 0, c
    assert c["prepared"]["statefulCreated"] is False and c["pdf"]["statefulCreated"] is False, c
    assert c["prepared"]["nativeCreated"] is True and c["pdf"]["nativeCreated"] is True, c
    assert c["pdf"]["nativeClosed"] and c["pdf"]["nativeOpen"] and c["pdf"]["ariaPanel"] and c["pdf"]["statefulPanel"] and c["pdf"]["submitPanel"] and c["pdf"]["anchorPanel"], c
    assert not c["pdf"]["excludePresent"] and not c["pdf"]["outsideTopPresent"] and not c["pdf"]["outsideBottomPresent"], c
    assert c["afterPrint"]["nativeClosed"] is True and c["afterPrint"]["ariaExpanded"] == "true", c

    s = result["causalStatic"]
    assert s["before"]["nativeClosed"] is False and s["sourceAfterPrint"]["nativeClosed"] is False, s
    assert s["sourceAfterPrint"]["page"]["clicks"] == [] and s["sourceAfterPrint"]["page"]["submits"] == 0 and s["sourceAfterPrint"]["page"]["nativeCreated"] == 0 and s["sourceAfterPrint"]["page"]["statefulCreated"] == 0, s
    assert s["pdf"]["nativeClosed"] and s["pdf"]["ariaPanel"] and s["pdf"]["statefulPanel"] and s["pdf"]["submitPanel"] and s["pdf"]["anchorPanel"], s
    assert not s["pdf"]["nativeCreated"] and not s["pdf"]["statefulCreated"] and not s["pdf"]["excludePresent"] and not s["pdf"]["outsideTopPresent"] and not s["pdf"]["outsideBottomPresent"], s
    return result


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", default=CHROME_DEFAULT)
    p.add_argument("--out", default="")
    args = p.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c24-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
