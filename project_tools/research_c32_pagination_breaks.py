#!/usr/bin/env python3
"""Fresh C32 exact-source Chrome probe: pagination / physical page-break semantics."""
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
CONTENT = (ROOT / 'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK = r"""
(()=>{const ls=[];let resolvePdf=null;globalThis.__c32={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c32.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];if(!f)return j(new Error('content listener missing'));let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c32.pdf'});return true}})();
"""

STYLE = r"""<style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:60px;padding:14px;background:#eee;box-sizing:border-box}
.scope{width:820px;margin:10px auto;border:1px solid #aaa;box-sizing:border-box}.row{height:50px;padding:14px 10px;border-bottom:1px solid #ccc;box-sizing:border-box}
.lead{height:650px;padding:20px;background:#eef;box-sizing:border-box}.avoid-root{break-inside:avoid-page;background:#f7f7ff}.avoid-child{break-inside:avoid-page;background:#f7fff7}
.force{break-before:page}.omit{height:50px;padding:14px;background:#fee;box-sizing:border-box}.para{font-size:16px;line-height:32px;orphans:6;widows:6;margin:0;padding:0}
</style>"""


def page_texts(path: pathlib.Path) -> list[str]:
    return [(p.extract_text() or '') for p in PdfReader(str(path)).pages]


def token_pages(path: pathlib.Path, token_re: str) -> dict:
    texts = page_texts(path)
    found: dict[str, list[int]] = {}
    rx = re.compile(token_re)
    for idx, text in enumerate(texts, start=1):
        for token in rx.findall(text):
            key = token if isinstance(token, str) else ''.join(token)
            found.setdefault(key, []).append(idx)
    return {'pages': len(texts), 'tokens': found}


def general_summary(path: pathlib.Path) -> dict:
    texts = page_texts(path)
    text = '\n'.join(texts)
    return {
        'pages': len(texts),
        'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'excludePresent': 'C32_EXCLUDE_TOKEN' in text,
        'outsidePresent': 'C32_OUTSIDE_TOKEN' in text,
    }


def cmd(page, command: str) -> dict:
    return page.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})', command)


def dispatch(page, expr: str) -> None:
    ok = page.evaluate(f"()=>{{const e={expr};if(!e)return false;e.dispatchEvent(new MouseEvent('click',{{bubbles:true,cancelable:true}}));return true}}")
    assert ok, expr


def inject(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=CONTENT)


def begin(page) -> None:
    assert cmd(page, 'download').get('ok') is True
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""")
    page.wait_for_function('()=>!!globalThis.__c32.lastPdfRequest', timeout=30000)


def finish(page) -> None:
    assert page.evaluate('()=>__resolve()') is True
    page.wait_for_timeout(30)


def print_pdf(page, path: pathlib.Path) -> None:
    page.emulate_media(media='screen')
    page.pdf(path=str(path), format='A4', print_background=True)


def select_many(page, includes: list[str], exclude: str | None = None) -> None:
    assert cmd(page, 'start').get('ok') is True
    for expr in includes:
        dispatch(page, expr)
    if exclude:
        assert cmd(page, 'mode-exclude').get('ok') is True
        dispatch(page, exclude)
        assert cmd(page, 'mode-include').get('ok') is True


def forced_descendant(ctx, out: pathlib.Path) -> dict:
    html = f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C32_OUTSIDE_TOKEN</div><article id='scope' class='scope'><section id='before'><div class='row'>C32_FORCE_BEFORE</div><div class='omit'>C32_EXCLUDE_TOKEN</div></section><section id='forced' class='force'><div class='row'>C32_FORCE_AFTER</div><div class='row'>C32_FORCE_TAIL</div></section></article>"
    p = ctx.new_page(); p.set_viewport_size({'width':1100,'height':800}); p.set_content(html, wait_until='load'); inject(p); select_many(p,["document.querySelector('#scope')"],"document.querySelector('.omit')"); begin(p)
    computed = p.evaluate("()=>({root:getComputedStyle(document.querySelector('#scope')).breakInside,forced:getComputedStyle(document.querySelector('#forced')).breakBefore})")
    path = out/'forced_descendant.pdf'; print_pdf(p,path); s=general_summary(path); m=token_pages(path,r'(C32_FORCE_(?:BEFORE|AFTER|TAIL))'); finish(p); p.close()
    s.update({'computed':computed,'tokenPages':m['tokens']}); return s


def root_avoid(ctx, out: pathlib.Path, causal: bool) -> dict:
    rows = ''.join(f"<div class='row'>C32_ROOT_{i:02d}</div>" for i in range(1,13))
    html = f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C32_OUTSIDE_TOKEN</div><section id='lead' class='lead'>C32_LEAD</section><article id='avoidRoot' class='scope avoid-root'>{rows}<div class='omit'>C32_EXCLUDE_TOKEN</div></article>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(html,wait_until='load');inject(p);select_many(p,["document.querySelector('#lead')","document.querySelector('#avoidRoot')"],"document.querySelector('.omit')")
    before=p.evaluate("()=>getComputedStyle(document.querySelector('#avoidRoot')).breakInside");begin(p);after=p.evaluate("()=>getComputedStyle(document.querySelector('#avoidRoot')).breakInside")
    if causal:
        p.evaluate("()=>document.querySelector('#avoidRoot').style.setProperty('break-inside','avoid-page','important')")
    final=p.evaluate("()=>getComputedStyle(document.querySelector('#avoidRoot')).breakInside")
    path=out/('root_avoid_causal.pdf' if causal else 'root_avoid_current.pdf');print_pdf(p,path);s=general_summary(path);m=token_pages(path,r'(C32_ROOT_\d{2})');finish(p);p.close()
    pages=sorted({pg for arr in m['tokens'].values() for pg in arr});s.update({'breakInsideBefore':before,'breakInsideAfterPrepare':after,'breakInsideAtPrint':final,'blockPages':pages,'tokenCount':len(m['tokens'])});return s


def descendant_avoid(ctx,out:pathlib.Path)->dict:
    rows=''.join(f"<div class='row'>C32_CHILD_{i:02d}</div>" for i in range(1,13))
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C32_OUTSIDE_TOKEN</div><article id='scope' class='scope'><section class='lead'>C32_CHILD_LEAD</section><section id='avoidChild' class='avoid-child'>{rows}</section><div class='omit'>C32_EXCLUDE_TOKEN</div></article>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(html,wait_until='load');inject(p);select_many(p,["document.querySelector('#scope')"],"document.querySelector('.omit')");begin(p);computed=p.evaluate("()=>({root:getComputedStyle(document.querySelector('#scope')).breakInside,child:getComputedStyle(document.querySelector('#avoidChild')).breakInside})");path=out/'descendant_avoid.pdf';print_pdf(p,path);s=general_summary(path);m=token_pages(path,r'(C32_CHILD_\d{2})');finish(p);p.close();pages=sorted({pg for arr in m['tokens'].values() for pg in arr});s.update({'computed':computed,'blockPages':pages,'tokenCount':len(m['tokens'])});return s


def oversized_avoid(ctx,out:pathlib.Path)->dict:
    rows=''.join(f"<div class='row'>C32_BIG_{i:03d}</div>" for i in range(1,81))
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<article id='scope' class='scope'><section id='big' class='avoid-child'>{rows}</section><div class='omit'>C32_EXCLUDE_TOKEN</div></article><div class='outside'>C32_OUTSIDE_TOKEN</div>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(html,wait_until='load');inject(p);select_many(p,["document.querySelector('#scope')"],"document.querySelector('.omit')");begin(p);computed=p.evaluate("()=>getComputedStyle(document.querySelector('#big')).breakInside");path=out/'oversized_avoid.pdf';print_pdf(p,path);s=general_summary(path);m=token_pages(path,r'(C32_BIG_\d{3})');finish(p);p.close();pages=sorted({pg for arr in m['tokens'].values() for pg in arr});s.update({'computed':computed,'blockPages':pages,'tokenCount':len(m['tokens']),'first':bool(m['tokens'].get('C32_BIG_001')),'last':bool(m['tokens'].get('C32_BIG_080'))});return s


def widows_orphans(ctx,out:pathlib.Path)->dict:
    lines='<br>'.join(f"<span>C32_LINE_{i:02d}</span>" for i in range(1,19))
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<article id='scope' class='scope'><section class='lead'>C32_PARA_LEAD</section><p id='para' class='para'>{lines}</p><div class='omit'>C32_EXCLUDE_TOKEN</div></article><div class='outside'>C32_OUTSIDE_TOKEN</div>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(html,wait_until='load');inject(p);select_many(p,["document.querySelector('#scope')"],"document.querySelector('.omit')");begin(p);computed=p.evaluate("()=>({orphans:getComputedStyle(document.querySelector('#para')).orphans,widows:getComputedStyle(document.querySelector('#para')).widows})");path=out/'widows_orphans.pdf';print_pdf(p,path);s=general_summary(path);texts=page_texts(path);counts=[]
    for idx,t in enumerate(texts,start=1):
        n=len(set(re.findall(r'C32_LINE_(\d{2})',t)))
        if n:counts.append({'page':idx,'lines':n})
    finish(p);p.close();s.update({'computed':computed,'linePages':counts,'lineCount':sum(x['lines'] for x in counts)});return s


def direct_frame_source(ctx,out:pathlib.Path)->dict:
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<style>.frame-force{{break-before:page}}.frame-avoid{{break-inside:avoid-page}}</style><body><div>C32_FRAME_BEFORE</div><section class='frame-force'><div>C32_FRAME_FORCED</div></section><section class='frame-avoid'><div>C32_FRAME_AVOID</div></section></body>"
    p=ctx.new_page();p.set_viewport_size({'width':900,'height':700});p.set_content(html,wait_until='load');computed=p.evaluate("()=>({forced:getComputedStyle(document.querySelector('.frame-force')).breakBefore,avoid:getComputedStyle(document.querySelector('.frame-avoid')).breakInside})");path=out/'direct_frame_source.pdf';print_pdf(p,path);s=general_summary(path);m=token_pages(path,r'(C32_FRAME_(?:BEFORE|FORCED|AVOID))');p.close();s.update({'computed':computed,'tokenPages':m['tokens']});return s


def frame_proxy(ctx,out:pathlib.Path)->dict:
    child=f"<!doctype html><meta charset='utf-8'>{STYLE}<style>.frame-force{{break-before:page}}.frame-avoid{{break-inside:avoid-page}}</style><body><div>C32_FRAME_BEFORE</div><section class='frame-force'><div>C32_FRAME_FORCED</div></section><section class='frame-avoid'><div>C32_FRAME_AVOID</div></section></body>"
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content("<!doctype html><meta charset='utf-8'><iframe id='f' style='width:850px;height:500px'></iframe>",wait_until='load');p.locator('#f').evaluate('(f,h)=>{f.srcdoc=h}',child);p.wait_for_function("()=>document.querySelector('#f').contentDocument?.querySelector('.frame-force')");inject(p);assert cmd(p,'start').get('ok') is True;dispatch(p,"document.querySelector('#f').contentDocument.body");begin(p)
    prepared=p.evaluate("""()=>{const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');const forced=proxy?.querySelector('.frame-force');const avoid=proxy?.querySelector('.frame-avoid');return {proxy:!!proxy,iframeDisplay:getComputedStyle(document.querySelector('#f')).display,proxyRootBreakInside:proxy?getComputedStyle(proxy).breakInside:'',forcedBreakBefore:forced?getComputedStyle(forced).breakBefore:'',avoidBreakInside:avoid?getComputedStyle(avoid).breakInside:''}}""")
    path=out/'frame_proxy.pdf';print_pdf(p,path);s=general_summary(path);m=token_pages(path,r'(C32_FRAME_(?:BEFORE|FORCED|AVOID))');finish(p);p.close();s.update({'prepared':prepared,'tokenPages':m['tokens']});return s


def run(chrome:str,out:pathlib.Path)->dict:
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'forcedDescendant':forced_descendant(ctx,out),'rootAvoidCurrent':root_avoid(ctx,out,False),'rootAvoidCausal':root_avoid(ctx,out,True),'descendantAvoid':descendant_avoid(ctx,out),'oversizedAvoid':oversized_avoid(ctx,out),'widowsOrphans':widows_orphans(ctx,out),'directFrameSource':direct_frame_source(ctx,out),'frameProxy':frame_proxy(ctx,out)}
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C32_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    # Stable positive/harness controls; observations that may become findings are not baked into pass/fail.
    f=result['forcedDescendant'];assert f['computed']['forced'] in ('page','always') and f['tokenPages']['C32_FORCE_AFTER'][0] > f['tokenPages']['C32_FORCE_BEFORE'][0],f
    for key in ['forcedDescendant','rootAvoidCurrent','rootAvoidCausal','descendantAvoid','oversizedAvoid','widowsOrphans','frameProxy']:
        r=result[key];assert not r['excludePresent'] and not r['outsidePresent'],(key,r)
    big=result['oversizedAvoid'];assert big['tokenCount']==80 and big['first'] and big['last'] and len(big['blockPages'])>1,big
    wo=result['widowsOrphans'];assert wo['lineCount']==18 and wo['computed']['orphans']=='6' and wo['computed']['widows']=='6',wo
    src=result['directFrameSource'];assert src['computed']['forced'] in ('page','always') and src['tokenPages']['C32_FRAME_FORCED'][0] > src['tokenPages']['C32_FRAME_BEFORE'][0],src
    return result


def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c32-')))

if __name__=='__main__':main()
