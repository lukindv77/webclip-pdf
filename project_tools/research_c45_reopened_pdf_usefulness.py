#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / 'content.js').read_text(encoding='utf-8')
BUDGET_GUARD = (ROOT / 'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT_GUARD = (ROOT / 'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST_GUARD = (ROOT / 'host-control-activation-guard.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')

IN_SCOPE = 'C45_SELECTED_SEARCHABLE_MARKER_7C1A'
OUT_SCOPE = 'C45_OUTSIDE_SCOPE_MARKER_9B2D'
TARGET = 'C45_INTERNAL_TARGET_4E3F'
EXTERNAL = 'https://example.com/c45-external?marker=keep-path'

MOCK = r'''(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c45 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c45.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c45Message = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c45ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf; resolvePdf = null; fn({ ok: true, filename: 'c45.pdf' }); return true;
  };
})();'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/article'):
            body = f'''<!doctype html><meta charset="utf-8"><title>C45 Reader Metadata Title</title>
<style>body{{font:18px Arial;margin:32px}} article{{border:2px solid #333;padding:20px}} .spacer{{height:900px}}</style>
<p id="outside">{OUT_SCOPE}</p>
<article id="scope">
<h1>{IN_SCOPE}</h1>
<p>Search phrase: independent reopened reader verification.</p>
<p><a id="external" href="{EXTERNAL}">external C45 link</a></p>
<p><a id="internal" href="#target">jump to internal C45 target</a></p>
<div class="spacer"></div><h2 id="target">{TARGET}</h2>
</article>'''.encode()
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        self.send_response(404); self.end_headers()
    def log_message(self, *_): pass

def cmd(page, command):
    return page.evaluate("c=>__c45Message({type:'WEBCLIP_COMMAND',command:c})", command)

def run(chrome: str):
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='webclip-c45-'))
    pdf_path = tmp / 'c45.pdf'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=chrome, headless=True, args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
            ctx = browser.new_context(); page = ctx.new_page(); page.set_viewport_size({'width':1100,'height':800})
            url = f'http://127.0.0.1:{server.server_address[1]}/article'
            page.goto(url, wait_until='load'); page.evaluate(MOCK)
            page.add_script_tag(content=BUDGET_GUARD); page.add_script_tag(content=INERT_GUARD); page.add_script_tag(content=HOST_GUARD); page.add_script_tag(content=CONTENT)
            assert cmd(page,'start').get('ok') is True
            assert page.evaluate("()=>{const e=document.querySelector('#scope');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return e.hasAttribute('data-webclip-pdf-include')}")
            assert cmd(page,'download').get('ok') is True
            assert page.evaluate("()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}")
            page.wait_for_function("()=>!!globalThis.__c45.lastPdfRequest", timeout=120000)
            request = page.evaluate("()=>globalThis.__c45.lastPdfRequest")
            page.emulate_media(media='screen'); page.pdf(path=str(pdf_path), format='A4', print_background=True)
            assert page.evaluate("()=>__c45ResolvePdf()") is True
            browser_version = browser.version; browser.close()

        data = pdf_path.read_bytes(); digest = hashlib.sha256(data).hexdigest()
        reader = PdfReader(str(pdf_path))
        pypdf_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
        pypdf_meta = {str(k): str(v) for k,v in (reader.metadata or {}).items()}
        pypdf_uris = []
        pypdf_internal = 0
        for p in reader.pages:
            for ref in (p.get('/Annots') or []):
                obj = ref.get_object(); action = obj.get('/A'); dest = obj.get('/Dest')
                if action and action.get('/URI'): pypdf_uris.append(str(action.get('/URI')))
                if dest is not None or (action and action.get('/S') == '/GoTo'): pypdf_internal += 1

        doc = fitz.open(str(pdf_path)); fitz_text = ''.join(p.get_text() for p in doc)
        fitz_links = [link for p in doc for link in p.get_links()]
        fitz_uris = [x.get('uri') for x in fitz_links if x.get('uri')]
        fitz_internal = sum(1 for x in fitz_links if isinstance(x.get('page'), int) and x.get('page') >= 0)
        fitz_meta = dict(doc.metadata or {}); doc.close()

        report_text = json.dumps(request, ensure_ascii=False, sort_keys=True)
        degraded_signal = any(tok in report_text.lower() for tok in ('degraded','missingresource','missing_resource','resourcefail','resource_fail','resourceerror','resource_error'))
        result = {
            'browserVersion': browser_version,
            'sourceBaseline': os.environ.get('C45_SOURCE_BASELINE',''),
            'contentBlobSha': os.environ.get('C45_CONTENT_BLOB_SHA',''),
            'pdf': {'bytes': len(data), 'sha256': digest},
            'requestMeta': request.get('meta', {}),
            'pypdf': {
                'selectedPresent': IN_SCOPE in pypdf_text,
                'outsideAbsent': OUT_SCOPE not in pypdf_text,
                'targetPresent': TARGET in pypdf_text,
                'searchPhrasePresent': 'independent reopened reader verification' in pypdf_text,
                'externalUris': pypdf_uris,
                'internalLinkCount': pypdf_internal,
                'metadata': pypdf_meta,
            },
            'pymupdf': {
                'selectedPresent': IN_SCOPE in fitz_text,
                'outsideAbsent': OUT_SCOPE not in fitz_text,
                'targetPresent': TARGET in fitz_text,
                'searchPhrasePresent': 'independent reopened reader verification' in fitz_text,
                'externalUris': fitz_uris,
                'internalLinkCount': fitz_internal,
                'metadata': fitz_meta,
            },
            'degradedResourceSignalPresentInRequest': degraded_signal,
            'evidenceBoundary': 'L4 physical PDF reopened by two independent PDF parsers; no manual GUI reader and no synthetic degraded-resource claim',
        }
        payload = json.dumps(result, sort_keys=True, separators=(',',':'))
        result['resultSha256'] = hashlib.sha256(payload.encode()).hexdigest()
        print('C45_RESULT_JSON=' + json.dumps(result, sort_keys=True, separators=(',',':')), flush=True)

        assert len(data) > 1000
        for key in ('pypdf','pymupdf'):
            r = result[key]
            assert r['selectedPresent'] and r['outsideAbsent'] and r['targetPresent'] and r['searchPhrasePresent'], r
            assert EXTERNAL in r['externalUris'], r
            assert r['internalLinkCount'] >= 1, r
        return result
    finally:
        server.shutdown(); server.server_close()

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--chrome', default=CHROME_DEFAULT); args = ap.parse_args()
    if not args.chrome: raise SystemExit('Chrome unavailable')
    run(args.chrome)
