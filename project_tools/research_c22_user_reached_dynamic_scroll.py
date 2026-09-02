#!/usr/bin/env python3
"""Fresh C22 exact-source Chrome probe: user-reached dynamic growth -> physical PDF.

The fixture contains additive logical content that is created only when the browser
actually scrolls near the bottom. The probe drives the repository's current
content.js selection/download preparation, uses Playwright wheel input for the
user-reached control, and verifies that WebClip preparation/print does not itself
extend the feed beyond the user-reached boundary.
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
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c22 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c22.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c22Command = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c22ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c22.pdf' });
    return true;
  };
})();
"""

FIXTURE = r"""<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:70px;padding:16px;background:#eee;box-sizing:border-box}
#feed{width:760px;margin:12px auto;border:2px solid #555}.item{height:72px;padding:22px 12px;border-bottom:1px solid #bbb;box-sizing:border-box}
.omit{height:72px;padding:22px 12px;background:#fee;box-sizing:border-box}
</style>
<div class="outside">C22_OUTSIDE_TOP</div><article id="feed"></article><div class="outside">C22_OUTSIDE_BOTTOM</div>
<script>
window.c22Page={count:0,batches:0,scrollEvents:0,trustedScrollEvents:0,maxObservedBottom:0,maxCountObserved:0};
const feed=document.querySelector('#feed');
function appendBatch(n=10){c22Page.batches++;for(let i=0;i<n;i++){c22Page.count++;const d=document.createElement('div');d.className='item';d.textContent='C22_ITEM_'+String(c22Page.count).padStart(3,'0');if(c22Page.count===1)d.textContent+=' C22_FIRST_SENTINEL';if(c22Page.count===20)d.textContent+=' C22_INITIAL_LAST';if(c22Page.count===40)d.textContent+=' C22_USER_LAST';feed.appendChild(d);if(c22Page.count===4){const x=document.createElement('div');x.className='omit';x.textContent='C22_EXCLUDE_TOKEN';feed.appendChild(x)}}c22Page.maxCountObserved=Math.max(c22Page.maxCountObserved,c22Page.count)}
appendBatch();appendBatch();
addEventListener('scroll',e=>{c22Page.scrollEvents++;if(e.isTrusted)c22Page.trustedScrollEvents++;c22Page.maxObservedBottom=Math.max(c22Page.maxObservedBottom,scrollY+innerHeight);if(scrollY+innerHeight>=document.documentElement.scrollHeight-24&&c22Page.count<60)appendBatch()},{passive:true});
window.c22Metrics=()=>({...c22Page,scrollY,innerHeight,scrollHeight:document.documentElement.scrollHeight});
</script>"""


def pdf_summary(path: pathlib.Path) -> dict:
    reader = PdfReader(str(path))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    nums = [int(x) for x in re.findall(r"C22_ITEM_(\d{3})", text)]
    return {
        "pages": len(reader.pages),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "itemCount": len(set(nums)),
        "firstItem": min(nums) if nums else 0,
        "lastItem": max(nums) if nums else 0,
        "first": "C22_FIRST_SENTINEL" in text,
        "initialLast": "C22_INITIAL_LAST" in text,
        "userLast": "C22_USER_LAST" in text,
        "excludePresent": "C22_EXCLUDE_TOKEN" in text,
        "outsideTopPresent": "C22_OUTSIDE_TOP" in text,
        "outsideBottomPresent": "C22_OUTSIDE_BOTTOM" in text,
    }


def cmd(page, command: str) -> dict:
    return page.evaluate("c=>__c22Command({type:'WEBCLIP_COMMAND',command:c})", command)


def click(page, selector: str) -> None:
    ok = page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true;}""", selector)
    assert ok, selector


def start_and_select(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=CONTENT)
    assert cmd(page, "start").get("ok") is True
    click(page, "#feed")
    assert cmd(page, "mode-exclude").get("ok") is True
    click(page, ".omit")
    assert cmd(page, "mode-include").get("ok") is True


def begin_prepare(page) -> dict:
    assert cmd(page, "download").get("ok") is True
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click();}""")
    page.wait_for_function("()=>!!globalThis.__c22.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c22.lastPdfRequest")


def finish(page) -> None:
    assert page.evaluate("()=>__c22ResolvePdf()") is True
    page.wait_for_timeout(30)


def suspicious_meta_paths(value, prefix="meta") -> list[str]:
    hits: list[str] = []
    def visit(v, path):
        if isinstance(v, dict):
            for k, item in v.items():
                p = f"{path}.{k}"
                low = str(k).lower()
                if any(token in low for token in ("userreach", "user_reach", "maxreach", "max_reach", "scrollboundary", "scroll_boundary", "scrollhistory", "scroll_history")):
                    hits.append(p)
                visit(item, p)
        elif isinstance(v, list):
            for i, item in enumerate(v[:32]):
                visit(item, f"{path}[{i}]")
    visit(value, prefix)
    return hits


def print_pdf(page, path: pathlib.Path) -> dict:
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    return pdf_summary(path)


def setup_page(ctx):
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 720})
    page.set_content(FIXTURE, wait_until="load")
    start_and_select(page)
    return page


def no_user_scroll(ctx, out: pathlib.Path) -> dict:
    page = setup_page(ctx)
    before = page.evaluate("()=>c22Metrics()")
    request = begin_prepare(page)
    after_prepare = page.evaluate("()=>c22Metrics()")
    path = out / "no_user_scroll.pdf"
    pdf = print_pdf(page, path)
    after_print = page.evaluate("()=>c22Metrics()")
    result = {
        "before": before,
        "afterPrepare": after_prepare,
        "afterPrint": after_print,
        "pdf": pdf,
        "userBoundaryMetaPaths": suspicious_meta_paths((request or {}).get("meta", {})),
    }
    finish(page)
    page.close()
    return result


def wheel_to_count(page, target: int) -> dict:
    page.mouse.move(900, 600)
    for _ in range(12):
        if page.evaluate("()=>c22Metrics().count") >= target:
            break
        page.mouse.wheel(0, 5000)
        page.wait_for_timeout(120)
    reached = page.evaluate("()=>c22Metrics()")
    assert reached["count"] >= target, reached
    for _ in range(8):
        if page.evaluate("()=>window.scrollY") <= 2:
            break
        page.mouse.wheel(0, -5000)
        page.wait_for_timeout(80)
    page.wait_for_timeout(100)
    return reached


def user_reach_then_back(ctx, out: pathlib.Path) -> dict:
    page = setup_page(ctx)
    initial = page.evaluate("()=>c22Metrics()")
    reached = wheel_to_count(page, 40)
    back = page.evaluate("()=>c22Metrics()")
    request = begin_prepare(page)
    after_prepare = page.evaluate("()=>c22Metrics()")
    path = out / "user_reach_then_back.pdf"
    pdf = print_pdf(page, path)
    after_print = page.evaluate("()=>c22Metrics()")
    result = {
        "initial": initial,
        "reached": reached,
        "back": back,
        "afterPrepare": after_prepare,
        "afterPrint": after_print,
        "pdf": pdf,
        "userBoundaryMetaPaths": suspicious_meta_paths((request or {}).get("meta", {})),
    }
    finish(page)
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
            "noUserScroll": no_user_scroll(ctx, out),
            "userReachThenBack": user_reach_then_back(ctx, out),
        }
        browser.close()
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C22_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    # Hypothesis-safe assertions: prove the native/no-autoscroll and retained-additive
    # controls. Absence of a user-boundary receipt is an observation, not baked into
    # the harness pass/fail result.
    a = result["noUserScroll"]
    assert a["before"]["count"] == 20 and a["afterPrepare"]["count"] == 20 and a["afterPrint"]["count"] == 20, a
    assert a["pdf"]["itemCount"] == 20 and a["pdf"]["lastItem"] == 20 and a["pdf"]["initialLast"], a
    assert not a["pdf"]["excludePresent"] and not a["pdf"]["outsideTopPresent"] and not a["pdf"]["outsideBottomPresent"], a

    b = result["userReachThenBack"]
    assert b["reached"]["count"] >= 40 and b["back"]["scrollY"] <= 2, b
    assert b["afterPrepare"]["count"] == b["back"]["count"] and b["afterPrint"]["count"] == b["back"]["count"], b
    assert b["pdf"]["itemCount"] == b["back"]["count"] and b["pdf"]["lastItem"] == b["back"]["count"], b
    assert b["pdf"]["userLast"] and not b["pdf"]["excludePresent"] and not b["pdf"]["outsideTopPresent"] and not b["pdf"]["outsideBottomPresent"], b
    return result


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", default=CHROME_DEFAULT)
    p.add_argument("--out", default="")
    args = p.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c22-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
