#!/usr/bin/env python3
"""C17 managed-Chrome L4 probe: cross-origin iframe selection -> physical PDF.

The probe uses the repository's exact content.js and frame-agent.js, two real HTTP
origins, a SOP-respecting postMessage shim for the extension runtime channel, and
CDP Page.printToPDF. It deliberately prints the same prepared document under the
production worker's `screen` media and under a causal `print` media control.

A second browser case proves current nested reachability across the first opaque
cross-origin boundary. Raw JSON is emitted before interpretation assertions.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import http.server
import json
import os
import pathlib
import re
import shutil
import socketserver
import tempfile
import threading
from contextlib import contextmanager

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
FRAME_AGENT = (ROOT / "frame-agent.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)

BASE_STYLE = """
<style>
html,body{margin:0;padding:0;font-family:Arial,sans-serif}
body{background:white}
#top-shell{padding:12px;background:#ddd}
iframe{display:block;width:760px;height:320px;border:2px solid #555;margin:12px}
article{display:block;box-sizing:border-box;width:100%;padding:8px}
.row{box-sizing:border-box;height:34px;line-height:28px;border-bottom:1px solid #bbb;padding:3px 6px}
.omit{height:52px;padding:12px;background:#fee}
.unselected{height:34px;line-height:30px;padding:2px 6px;background:#eef}
</style>
"""


def rows_html(count: int, prefix: str = "C17_ROW") -> str:
    parts = []
    for i in range(1, count + 1):
        sentinel = ""
        if i == 1:
            sentinel = " C17_FIRST_SENTINEL"
        elif i == (count + 1) // 2:
            sentinel = " C17_MIDDLE_SENTINEL"
        elif i == count:
            sentinel = " C17_LAST_SENTINEL"
        parts.append(f"<div class='row'>{prefix}_{i:04d}{sentinel}</div>")
        if i == 3:
            parts.append("<div class='omit'>C17_EXCLUDE_TOKEN</div>")
    return "".join(parts)


def child_html(selected_rows: int = 120, unselected_rows: int = 160) -> str:
    extra = "".join(
        f"<div class='unselected'>C17_UNSELECTED_{i:04d}</div>"
        for i in range(1, unselected_rows + 1)
    )
    return (
        "<!doctype html><meta charset='utf-8'>"
        + BASE_STYLE
        + "<body>"
        + f"<article id='target'>{rows_html(selected_rows)}</article>"
        + "<div id='unselected-tail'>C17_CHILD_UNSELECTED_TOKEN"
        + extra
        + "</div></body>"
    )


def nested_outer_html(inner_url: str) -> str:
    return (
        "<!doctype html><meta charset='utf-8'>"
        + BASE_STYLE
        + "<body><article id='outer-target'>C17_OUTER_POSITIVE_TOKEN</article>"
        + f"<iframe id='inner' src='{inner_url}'></iframe></body>"
    )


def nested_inner_html() -> str:
    return (
        "<!doctype html><meta charset='utf-8'>"
        + BASE_STYLE
        + "<body><article id='nested-target'>C17_NESTED_TARGET_TOKEN</article></body>"
    )


class QuietHandler(http.server.BaseHTTPRequestHandler):
    routes: dict[str, str] = {}

    def do_GET(self):
        body = self.routes.get(self.path)
        if body is None:
            self.send_response(404)
            self.end_headers()
            return
        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


@contextmanager
def serve(routes: dict[str, str]):
    handler = type("BoundHandler", (QuietHandler,), {"routes": dict(routes)})
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


TOP_MOCK_TEMPLATE = r"""
(() => {
  const childUrl = __CHILD_URL__;
  const listeners = [];
  const pending = new Map();
  let nextCommand = 1;
  let resolvePdf = null;
  const record = {frameId:1,documentId:'c17-child-doc-1',url:childUrl,registeredAt:Date.now()};
  const state = {
    registered:false,
    remoteSnapshot:{version:3,includes:[],excludes:[]},
    remotePhase:'idle',
    lastPdfRequest:null,
    commandCount:0,
    remoteEvents:[]
  };
  globalThis.__c17 = state;

  const deliverToContent = (message) => {
    const fn = listeners[0];
    if (!fn) return;
    try {
      fn(message, {}, () => {});
    } catch (_) {}
  };

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.__c17Agent === 'register') {
      state.registered = true;
      state.remoteEvents.push('register');
      deliverToContent({type:'WEBCLIP_REMOTE_FRAME_EVENT',event:'register',frame:record});
      return;
    }
    if (data.__c17Agent === 'state') {
      state.remoteSnapshot = data.snapshot || {version:3,includes:[],excludes:[]};
      state.remotePhase = String(data.phase || '');
      state.remoteEvents.push('state');
      deliverToContent({
        type:'WEBCLIP_REMOTE_FRAME_EVENT',
        event:'state',
        frame:record,
        snapshot:state.remoteSnapshot,
        phase:state.remotePhase
      });
      return;
    }
    if (data.__c17Response && pending.has(data.__c17Response)) {
      const p = pending.get(data.__c17Response);
      pending.delete(data.__c17Response);
      if (data.ok === false) p.reject(new Error(data.error || 'remote command failed'));
      else p.resolve(data.value);
    }
  });

  function target(message) {
    const id = String(nextCommand++);
    state.commandCount++;
    const frame = document.getElementById('f1');
    if (!frame?.contentWindow) return Promise.reject(new Error('child frame unavailable'));
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('remote command timeout'));
      }, 5000);
      pending.set(id, {
        resolve(value){clearTimeout(timer);resolve(value)},
        reject(error){clearTimeout(timer);reject(error)}
      });
      frame.contentWindow.postMessage({
        __c17Command:id,
        command:String(message.command || ''),
        mode:message.mode,
        clear:Boolean(message.clear),
        kind:message.kind,
        locator:message.locator
      }, '*');
    });
  }

  globalThis.chrome = {runtime:{
    id:'c17-extension',
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') {
        return Promise.resolve({ok:true,frames:state.registered ? [record] : []});
      }
      if (message?.type === 'WEBCLIP_FRAME_AGENT_TARGET') {
        return target(message);
      }
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        state.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ok:true});
    }
  }};

  globalThis.__c17Command = (message) => new Promise((resolve,reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ok:true});
    } catch (error) {
      reject(error);
    }
  });
  globalThis.__c17ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ok:true,filename:'c17.pdf'});
    return true;
  };
})();
"""


CHILD_MOCK = r"""
(() => {
  const listeners = [];
  globalThis.__c17Child = {listenerCount:0,sentStates:0};
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (!data.__c17Command) return;
    const fn = listeners[0];
    if (!fn) {
      parent.postMessage({__c17Response:data.__c17Command,ok:false,error:'frame-agent listener missing'}, '*');
      return;
    }
    let done = false;
    const send = (value) => {
      if (done) return;
      done = true;
      parent.postMessage({__c17Response:data.__c17Command,ok:true,value}, '*');
    };
    try {
      const msg = {
        type:'WEBCLIP_FRAME_AGENT_COMMAND',
        command:data.command,
        mode:data.mode,
        clear:data.clear,
        kind:data.kind,
        locator:data.locator
      };
      const ret = fn(msg, {id:'c17-extension'}, send);
      if (ret !== true && !done) send({ok:true});
    } catch (error) {
      parent.postMessage({__c17Response:data.__c17Command,ok:false,error:error?.message || String(error)}, '*');
    }
  });

  globalThis.chrome = {runtime:{
    id:'c17-extension',
    onMessage:{addListener(fn){listeners.push(fn);globalThis.__c17Child.listenerCount=listeners.length}},
    sendMessage(message){
      if (message?.type === 'WEBCLIP_FRAME_AGENT_REGISTER') {
        parent.postMessage({__c17Agent:'register'}, '*');
        return Promise.resolve({ok:true,frameId:1});
      }
      if (message?.type === 'WEBCLIP_FRAME_AGENT_STATE') {
        globalThis.__c17Child.sentStates++;
        parent.postMessage({
          __c17Agent:'state',
          snapshot:message.snapshot,
          phase:message.phase
        }, '*');
        return Promise.resolve({ok:true});
      }
      return Promise.resolve({ok:true});
    }
  }};
})();
"""


def pdf_summary(path: pathlib.Path, expected_rows: int) -> dict:
    reader = PdfReader(str(path))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    nums = [int(x) for x in re.findall(r"C17_ROW_(\d{4})", text)]
    return {
        "pages": len(reader.pages),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "rowCount": len(set(nums)),
        "lastRow": max(nums) if nums else 0,
        "first": "C17_FIRST_SENTINEL" in text,
        "middle": "C17_MIDDLE_SENTINEL" in text,
        "last": "C17_LAST_SENTINEL" in text,
        "excludePresent": "C17_EXCLUDE_TOKEN" in text,
        "unselectedPresent": "C17_CHILD_UNSELECTED_TOKEN" in text,
        "unselectedRowCount": len(set(re.findall(r"C17_UNSELECTED_(\d{4})", text))),
        "topShellPresent": "C17_TOP_SHELL_TOKEN" in text,
        "expectedRows": expected_rows,
    }


def cdp_pdf(ctx, page, path: pathlib.Path, media: str) -> dict:
    session = ctx.new_cdp_session(page)
    session.send("Emulation.setEmulatedMedia", {"media": media})
    result = session.send("Page.printToPDF", {
        "printBackground": True,
        "preferCSSPageSize": True,
        "paperWidth": 8.27,
        "paperHeight": 11.69,
        "marginTop": 0.25,
        "marginBottom": 0.25,
        "marginLeft": 0.25,
        "marginRight": 0.25,
    })
    data = base64.b64decode(result["data"])
    path.write_bytes(data)
    return {"media": media}


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__c17Command(payload)", payload)


def modal_click(page) -> None:
    clicked = page.evaluate(
        """()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
        const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');
        if(!b)return false;b.click();return true;}"""
    )
    assert clicked


def resolve_pdf(page) -> None:
    assert page.evaluate("()=>__c17ResolvePdf()") is True
    page.wait_for_timeout(30)


def wait_child_frame(page):
    page.wait_for_selector("#f1")
    for _ in range(100):
        frames = [f for f in page.frames if f != page.main_frame]
        if frames and frames[0].url.startswith("http://"):
            return frames[0]
        page.wait_for_timeout(50)
    raise AssertionError("child frame missing")


def install_one_level(page, child_url: str):
    top_mock = TOP_MOCK_TEMPLATE.replace("__CHILD_URL__", json.dumps(child_url))
    page.evaluate(top_mock)
    child = wait_child_frame(page)
    child.evaluate(CHILD_MOCK)
    child.add_script_tag(content=FRAME_AGENT)
    page.wait_for_function("()=>globalThis.__c17?.registered===true", timeout=5000)
    page.add_script_tag(content=CONTENT)
    result = command(page, {"type":"WEBCLIP_COMMAND","command":"start"})
    assert result.get("ok") is True, result
    child.wait_for_function("()=>globalThis.__c17Child?.listenerCount===1", timeout=5000)
    page.wait_for_function("()=>globalThis.__c17.remotePhase==='selecting'", timeout=5000)
    return child


def select_remote(page, child) -> dict:
    child.evaluate(
        """()=>document.getElementById('target').dispatchEvent(
        new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))"""
    )
    page.wait_for_function("()=>globalThis.__c17.remoteSnapshot?.includes?.length===1", timeout=5000)
    result = command(page, {"type":"WEBCLIP_COMMAND","command":"mode-exclude"})
    assert result.get("ok") is True, result
    page.wait_for_timeout(100)
    child.evaluate(
        """()=>document.querySelector('.omit').dispatchEvent(
        new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))"""
    )
    page.wait_for_function("()=>globalThis.__c17.remoteSnapshot?.excludes?.length===1", timeout=5000)
    result = command(page, {"type":"WEBCLIP_COMMAND","command":"mode-include"})
    assert result.get("ok") is True, result
    return page.evaluate("()=>structuredClone(globalThis.__c17.remoteSnapshot)")


def begin_prepare(page) -> dict:
    result = command(page, {"type":"WEBCLIP_COMMAND","command":"download"})
    assert result.get("ok") is True, result
    modal_click(page)
    page.wait_for_function("()=>!!globalThis.__c17.lastPdfRequest", timeout=25000)
    return page.evaluate("()=>structuredClone(globalThis.__c17.lastPdfRequest)")


def one_level_case(browser, out: pathlib.Path) -> dict:
    selected_rows = 120
    with serve({"/child": child_html(selected_rows, 160)}) as child_origin:
        child_url = f"{child_origin}/child"
        with serve({
            "/top": "<!doctype html><meta charset='utf-8'>" + BASE_STYLE
                    + "<body><div id='top-shell'>C17_TOP_SHELL_TOKEN</div>"
                    + f"<iframe id='f1' src='{child_url}'></iframe></body>"
        }) as top_origin:
            ctx = browser.new_context()
            page = ctx.new_page()
            page.set_viewport_size({"width":1100,"height":800})
            page.goto(f"{top_origin}/top", wait_until="load")
            child = install_one_level(page, child_url)
            snapshot = select_remote(page, child)
            request = begin_prepare(page)
            prepared = page.evaluate("""()=>({
              remote: structuredClone(globalThis.__c17),
              frameStyle: document.getElementById('f1').getAttribute('style') || '',
              frameHeight: document.getElementById('f1').getBoundingClientRect().height
            })""")
            screen_path = out / "one_level_screen_media.pdf"
            print_path = out / "one_level_print_media_causal.pdf"
            cdp_pdf(ctx, page, screen_path, "screen")
            screen = pdf_summary(screen_path, selected_rows)
            cdp_pdf(ctx, page, print_path, "print")
            causal = pdf_summary(print_path, selected_rows)
            resolve_pdf(page)
            page.close()
            ctx.close()
            return {
                "topOrigin": top_origin,
                "childOrigin": child_origin,
                "snapshot": snapshot,
                "requestResourceReport": (request.get("meta") or {}).get("resourceReport"),
                "preparedFrameStyle": prepared["frameStyle"],
                "preparedFrameHeight": prepared["frameHeight"],
                "remoteCommandCount": prepared["remote"]["commandCount"],
                "screenMedia": screen,
                "printMediaCausal": causal,
            }


def nested_case(browser) -> dict:
    # Outer and inner share one origin. The top page is a different origin
    # (different port), so only the outer frame crosses the first opaque boundary.
    outer_body = (
        "<!doctype html><meta charset='utf-8'>" + BASE_STYLE
        + "<body><article id='outer-target'>C17_OUTER_POSITIVE_TOKEN</article>"
        + "<iframe id='inner' src='/inner'></iframe></body>"
    )
    with serve({"/outer": outer_body, "/inner": nested_inner_html()}) as child_origin:
        outer_url = f"{child_origin}/outer"
        with serve({
            "/top": "<!doctype html><meta charset='utf-8'>" + BASE_STYLE
                    + "<body><div id='top-shell'>C17_TOP_SHELL_TOKEN</div>"
                    + f"<iframe id='f1' src='{outer_url}'></iframe></body>"
        }) as top_origin:
            ctx = browser.new_context()
            page = ctx.new_page()
            page.goto(f"{top_origin}/top", wait_until="load")
            top_mock = TOP_MOCK_TEMPLATE.replace("__CHILD_URL__", json.dumps(outer_url))
            page.evaluate(top_mock)
            outer = next(f for f in page.frames if f.url == outer_url)
            inner = next(f for f in page.frames if f.url == f"{child_origin}/inner")
            outer.evaluate(CHILD_MOCK)
            inner.evaluate(CHILD_MOCK)
            outer.add_script_tag(content=FRAME_AGENT)
            inner.add_script_tag(content=FRAME_AGENT)
            page.wait_for_function("()=>globalThis.__c17?.registered===true", timeout=5000)
            outer_active = outer.evaluate("()=>Boolean(globalThis.__WEBCLIP_FRAME_AGENT_LOADED__)")
            inner_active = inner.evaluate("()=>Boolean(globalThis.__WEBCLIP_FRAME_AGENT_LOADED__)")
            outer_listeners = outer.evaluate("()=>globalThis.__c17Child?.listenerCount || 0")
            inner_listeners = inner.evaluate("()=>globalThis.__c17Child?.listenerCount || 0")
            page.add_script_tag(content=CONTENT)
            result = command(page, {"type":"WEBCLIP_COMMAND","command":"start"})
            assert result.get("ok") is True, result
            page.wait_for_function("()=>globalThis.__c17.remotePhase==='selecting'", timeout=5000)
            before = page.evaluate("()=>structuredClone(globalThis.__c17.remoteSnapshot)")
            inner.evaluate(
                """()=>document.getElementById('nested-target').dispatchEvent(
                new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))"""
            )
            page.wait_for_timeout(150)
            after_inner = page.evaluate("()=>structuredClone(globalThis.__c17.remoteSnapshot)")
            outer.evaluate(
                """()=>document.getElementById('outer-target').dispatchEvent(
                new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))"""
            )
            page.wait_for_function("()=>globalThis.__c17.remoteSnapshot?.includes?.length===1", timeout=5000)
            after_outer = page.evaluate("()=>structuredClone(globalThis.__c17.remoteSnapshot)")
            result = {
                "topOrigin": top_origin,
                "childOrigin": child_origin,
                "outerAgentActive": outer_active,
                "innerAgentActive": inner_active,
                "outerListenerCount": outer_listeners,
                "innerListenerCount": inner_listeners,
                "beforeIncludes": len(before.get("includes") or []),
                "afterInnerIncludes": len(after_inner.get("includes") or []),
                "afterOuterIncludes": len(after_outer.get("includes") or []),
                "afterOuterText": ((after_outer.get("includes") or [{}])[0].get("text") or ""),
            }
            page.close()
            ctx.close()
            return result


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=chrome,
            headless=True,
            args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"],
        )
        results = {
            "browserVersion": browser.version,
            "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
            "frameAgentBlobSha": os.environ.get("FRAME_AGENT_BLOB_SHA", ""),
            "oneLevel": one_level_case(browser, out),
            "nestedSameOriginBehindCrossOrigin": nested_case(browser),
        }
        browser.close()

    payload = json.dumps(results, sort_keys=True, separators=(",",":"), ensure_ascii=False)
    results["resultSha256"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    print("C17_RESULT_JSON=" + json.dumps(results, sort_keys=True, separators=(",",":"), ensure_ascii=False), flush=True)

    one = results["oneLevel"]
    assert len(one["snapshot"].get("includes") or []) == 1, one
    assert len(one["snapshot"].get("excludes") or []) == 1, one

    # The selected content itself must be printable in both observations. The
    # current-vs-causal difference in scope is deliberately asserted because it
    # is the bounded hypothesis under test: production screen media disables the
    # child agent's @media print selected-only filter.
    current = one["screenMedia"]
    causal = one["printMediaCausal"]
    assert current["first"] and current["middle"] and current["last"], current
    assert causal["first"] and causal["middle"] and causal["last"], causal
    assert current["excludePresent"] and current["unselectedPresent"], current
    assert not causal["excludePresent"] and not causal["unselectedPresent"], causal
    assert not causal["topShellPresent"], causal

    nested = results["nestedSameOriginBehindCrossOrigin"]
    assert nested["outerAgentActive"] and nested["outerListenerCount"] == 1, nested
    assert not nested["innerAgentActive"] and nested["innerListenerCount"] == 0, nested
    assert nested["beforeIncludes"] == 0 and nested["afterInnerIncludes"] == 0, nested
    assert nested["afterOuterIncludes"] == 1 and "C17_OUTER_POSITIVE_TOKEN" in nested["afterOuterText"], nested
    return results


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", default=CHROME_DEFAULT)
    p.add_argument("--out", default="")
    a = p.parse_args()
    if not a.chrome:
        raise SystemExit("Chrome/Chromium binary not found")
    out = pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c17-"))
    run(a.chrome, out)


if __name__ == "__main__":
    main()
