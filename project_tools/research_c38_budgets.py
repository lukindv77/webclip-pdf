#!/usr/bin/env python3
"""Fresh C38 exact-source Chrome probe: node/string/time/resource preparation budgets."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or "")

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c38 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c38.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c38Message = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c38ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf; resolvePdf = null; fn({ ok: true, filename: 'c38.pdf' }); return true;
  };
})();
"""
STYLE = """<style>html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:12px;background:#eee}#scope{padding:12px;border:2px solid #555}.omit{padding:8px;background:#fee}.hidden-node{display:none}</style>"""

class AssetHandler(BaseHTTPRequestHandler):
    request_count = 0
    lock = threading.Lock()
    def do_GET(self):
        if self.path.startswith("/img/"):
            with self.lock:
                type(self).request_count += 1
            payload = b"<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'><rect width='2' height='2' fill='#008000'/></svg>"
            self.send_response(200); self.send_header("Content-Type","image/svg+xml"); self.send_header("Content-Length",str(len(payload))); self.send_header("Cache-Control","no-store"); self.end_headers(); self.wfile.write(payload); return
        self.send_response(404); self.end_headers()
    def log_message(self, *_args): pass

def source_contract():
    return {
        "resourceScanTreeWalkerBounded": "PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5_000" in CONTENT and "createTreeWalker(include, showElement)" in CONTENT and "if (!add(node)) break outer;" in CONTENT,
        "collectorUsesFullQuerySelectorAll": "include.querySelectorAll?.(selector).forEach" in CONTENT,
        "diagnosticsReadsFullBodyText": "String(body?.innerText || body?.textContent || '').length" in CONTENT,
        "disclosureSerialWait": "await delay(40);" in CONTENT,
        "snapshotPosthoc250": "includes: includes.slice(0, 250)" in CONTENT and "excludes: excludes.slice(0, 250)" in CONTENT,
        "resourceTaskLimit500": "PDF_RESOURCE_PREFETCH_MAX_RESOURCES = 500" in CONTENT,
        "resourcePromotionBeforeTaskEnumeration": "First promote common lazy source attributes synchronously" in CONTENT,
        "workerUsesScreenMedia": "Emulation.setEmulatedMedia" in WORKER and "media: 'screen'" in WORKER,
    }

def cmd(page, command): return page.evaluate("c=>__c38Message({type:'WEBCLIP_COMMAND',command:c})", command)
def dispatch(page, selector):
    ok=page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",selector); assert ok,selector
def inject(page, instrument_queries=False):
    page.evaluate(MOCK)
    if instrument_queries:
        page.evaluate("""()=>{const raw=Element.prototype.querySelectorAll;globalThis.__c38Q={calls:0,maxResult:0,records:[]};Element.prototype.querySelectorAll=function(sel){const result=raw.call(this,sel);const n=Number(result?.length||0);__c38Q.calls++;__c38Q.maxResult=Math.max(__c38Q.maxResult,n);if(__c38Q.records.length<32)__c38Q.records.push({selector:String(sel).slice(0,200),length:n});return result;};}""")
    page.add_script_tag(content=BUDGET_GUARD); page.add_script_tag(content=INERT_GUARD); page.add_script_tag(content=HOST_GUARD); page.add_script_tag(content=CONTENT)
def select_scope(page):
    assert cmd(page,"start").get("ok") is True; dispatch(page,"#scope")
    if page.query_selector(".omit"):
        assert cmd(page,"mode-exclude").get("ok") is True; dispatch(page,".omit"); assert cmd(page,"mode-include").get("ok") is True
def begin_prepare(page):
    page.evaluate("()=>{__c38.lastPdfRequest=null}"); assert cmd(page,"download").get("ok") is True; started=time.perf_counter()
    ok=page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}"""); assert ok
    page.wait_for_function("()=>!!globalThis.__c38.lastPdfRequest",timeout=120000)
    return time.perf_counter()-started, page.evaluate("()=>globalThis.__c38.lastPdfRequest")
def finish(page): assert page.evaluate("()=>__c38ResolvePdf()") is True; page.wait_for_timeout(50)
def pdf_summary(path):
    reader=PdfReader(str(path)); text="\n".join((p.extract_text() or "") for p in reader.pages)
    return {"pages":len(reader.pages),"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"selected":"C38_SELECTED" in text,"excludePresent":"C38_EXCLUDE" in text,"outsidePresent":"C38_OUTSIDE" in text}
def print_pdf(page,path): page.emulate_media(media="screen"); page.pdf(path=str(path),format="A4",print_background=True); return pdf_summary(path)
def base_page(ctx,inner,instrument_queries=False):
    p=ctx.new_page(); p.set_viewport_size({"width":1100,"height":800}); p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C38_OUTSIDE</div><main id='scope'><p>C38_SELECTED</p>{inner}<div class='omit'>C38_EXCLUDE</div></main>",wait_until="load"); inject(p,instrument_queries); select_scope(p); return p

def frame_budget_positive(ctx):
    p=ctx.new_page(); p.set_content("<!doctype html><body></body>",wait_until="load"); inject(p)
    result=p.evaluate("""()=>{const root=document.createElement('body');for(let i=0;i<5001;i++)root.appendChild(document.createElement('span'));const r=WebClipFrameProxyBudgetGuard.preflightFlattenedBody(root);return {ok:r.ok,reason:r.reason,nodes:r.nodes,limits:r.limits};}"""); p.close(); return result
def resource_scan_cap(ctx,out):
    p=base_page(ctx,"".join("<span class='hidden-node'></span>" for _ in range(12000))); elapsed,req=begin_prepare(p); report=(req or {}).get("meta",{}).get("resourceReport",{}); count=p.evaluate("()=>document.querySelectorAll('#scope *').length"); pdf=print_pdf(p,out/"scan_cap.pdf"); finish(p); p.close(); return {"selectedDescendants":count,"prepareSeconds":elapsed,"resourceReport":report,"pdf":pdf}
def link_collector(ctx,out):
    p=base_page(ctx,"".join(f"<a class='hidden-node' href='/item/{i}'></a>" for i in range(12000)),True); elapsed,req=begin_prepare(p); report=(req or {}).get("meta",{}).get("resourceReport",{}); markers=p.evaluate("()=>document.querySelectorAll('[data-webclip-original-href]').length"); q=p.evaluate("()=>globalThis.__c38Q"); pdf=print_pdf(p,out/"links_12k.pdf"); finish(p); cleaned=p.evaluate("()=>document.querySelectorAll('[data-webclip-original-href]').length"); p.close(); return {"prepareSeconds":elapsed,"markerCountPrepared":markers,"markerCountAfterCleanup":cleaned,"queryStats":q,"resourceReport":report,"pdf":pdf}
def find_key(v,key):
    if isinstance(v,dict):
        if key in v:return v[key]
        for x in v.values():
            y=find_key(x,key)
            if y is not None:return y
    elif isinstance(v,list):
        for x in v:
            y=find_key(x,key)
            if y is not None:return y
    return None
def diagnostics_large_text(ctx):
    p=ctx.new_page(); big="X"*(2*1024*1024); p.set_viewport_size({"width":1100,"height":800}); p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<main id='scope'><div style='position:absolute;left:-100000px;white-space:nowrap'>{big}</div></main>",wait_until="load"); inject(p); t=time.perf_counter(); resp=p.evaluate("()=>__c38Message({type:'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS'})"); elapsed=time.perf_counter()-t; chars=find_key(resp,"bodyTextChars"); p.close(); return {"elapsedSeconds":elapsed,"bodyTextChars":chars,"payloadChars":len(big)}
def disclosure_serial(ctx,out):
    inner="".join(f"<button aria-expanded='false' aria-controls='p{i}'>b{i}</button><div id='p{i}' hidden>panel {i}</div>" for i in range(400)); p=base_page(ctx,inner); elapsed,req=begin_prepare(p); report=(req or {}).get("meta",{}).get("resourceReport",{}); expanded=p.evaluate("()=>document.querySelectorAll('[aria-expanded=\"true\"]').length"); guard=p.evaluate("()=>({...WebClipHostControlActivationGuard.stats})"); pdf=print_pdf(p,out/"disclosures_400.pdf"); finish(p); p.close(); return {"controls":400,"prepareSeconds":elapsed,"expandedCount":expanded,"guardStats":guard,"resourceReport":report,"pdf":pdf}
def resource_promotion(ctx,out,server):
    AssetHandler.request_count=0; port=server.server_address[1]; inner="".join(f"<img class='hidden-node' data-src='http://127.0.0.1:{port}/img/{i}.svg' alt='i{i}'>" for i in range(800)); p=base_page(ctx,inner); before=AssetHandler.request_count; elapsed,req=begin_prepare(p); p.wait_for_timeout(1000); after=AssetHandler.request_count; report=(req or {}).get("meta",{}).get("resourceReport",{}); promoted=p.evaluate("()=>document.querySelectorAll('#scope img[src]').length"); pdf=print_pdf(p,out/"resource_promotion.pdf"); finish(p); p.close(); return {"images":800,"requestsBefore":before,"requestsAfter":after,"promotedCount":promoted,"prepareSeconds":elapsed,"resourceReport":report,"pdf":pdf}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True); server=ThreadingHTTPServer(("127.0.0.1",0),AssetHandler); thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=chrome,headless=True,args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"]); ctx=browser.new_context()
            result={"browserVersion":browser.version,"contentBlobSha":os.environ.get("CONTENT_BLOB_SHA",""),"sourceContract":source_contract(),"frameBudgetPositive":frame_budget_positive(ctx),"resourceScanCap":resource_scan_cap(ctx,out),"linkCollector12k":link_collector(ctx,out),"diagnostics2MiB":diagnostics_large_text(ctx),"disclosureSerial400":disclosure_serial(ctx,out),"resourcePromotion800":resource_promotion(ctx,out,server)}; browser.close()
    finally:
        server.shutdown(); server.server_close()
    payload=json.dumps(result,sort_keys=True,separators=(",",":")); result["resultSha256"]=hashlib.sha256(payload.encode()).hexdigest(); print("C38_RESULT_JSON="+json.dumps(result,sort_keys=True,separators=(",",":")),flush=True)
    assert all(result["sourceContract"].values()),result["sourceContract"]
    fp=result["frameBudgetPositive"]; assert not fp["ok"] and fp["reason"]=="nodes" and fp["nodes"]==5001,fp
    s=result["resourceScanCap"]; assert s["resourceReport"].get("scanTruncated") is True,s; assert s["pdf"]["selected"] and not s["pdf"]["excludePresent"] and not s["pdf"]["outsidePresent"],s
    l=result["linkCollector12k"]; assert l["markerCountPrepared"]==12000 and l["queryStats"]["maxResult"]>=12000,l; assert l["resourceReport"].get("scanTruncated") is True and l["markerCountAfterCleanup"]==0,l
    d=result["diagnostics2MiB"]; assert int(d["bodyTextChars"] or 0)>=d["payloadChars"],d
    ds=result["disclosureSerial400"]; assert ds["expandedCount"]==400 and ds["guardStats"].get("blockedPageClicks",0)>=400,ds; assert ds["prepareSeconds"]>=15.0,ds
    rp=result["resourcePromotion800"]; assert rp["requestsBefore"]==0 and rp["promotedCount"]==800,rp; assert rp["resourceReport"].get("limit")==500 and rp["resourceReport"].get("attempted",0)<=500,rp; assert rp["resourceReport"].get("omittedByLimit",0)>=1 and rp["requestsAfter"]>500,rp; assert rp["pdf"]["selected"] and not rp["pdf"]["excludePresent"] and not rp["pdf"]["outsidePresent"],rp
    return result

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--chrome",default=CHROME_DEFAULT); ap.add_argument("--out",default=""); a=ap.parse_args()
    if not a.chrome: raise SystemExit("Chrome unavailable")
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c38-")))
if __name__=="__main__": main()
