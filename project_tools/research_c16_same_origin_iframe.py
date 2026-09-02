#!/usr/bin/env python3
"""C16 managed-Chrome L4 probe: same-origin iframe selection -> physical PDF.

The harness loads the repository's actual content.js from the checkout, drives real
WebClip Include/Exclude and download preparation, holds the mocked worker PDF reply,
prints the exact prepared document with Chromium, and inspects physical PDF text.
Raw JSON is printed before interpretation assertions so browser-version differences
remain observable.
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

CHROME_MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c16={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c16.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c16Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c16ResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'c16.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = """
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif}
#top-shell{padding:12px;background:#eee}.host{padding:12px}
iframe{display:block;width:760px;height:320px;border:2px solid #555;margin:12px 0}
article{display:block;box-sizing:border-box;width:100%;padding:8px}
.row{box-sizing:border-box;height:34px;line-height:28px;border-bottom:1px solid #bbb;padding:3px 6px}
.omit{height:52px;padding:12px;background:#fee}
</style>
"""


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    return text, len(reader.pages)


def rows_html(count: int, row_height: int = 34, prefix: str = "C16_ROW") -> str:
    parts=[]
    for i in range(1, count + 1):
        token = f"{prefix}_{i:04d}"
        sentinel = ""
        if i == 1: sentinel = " C16_FIRST_SENTINEL"
        elif i == (count + 1)//2: sentinel = " C16_MIDDLE_SENTINEL"
        elif i == count: sentinel = " C16_LAST_SENTINEL"
        parts.append(f"<div class='row' style='height:{row_height}px'>{token}{sentinel}</div>")
        if i == 3:
            parts.append("<div class='omit'>C16_EXCLUDE_TOKEN</div>")
    return "".join(parts)


def child_html(count: int, *, body_target: bool, row_height: int = 34, prefix: str = "C16_ROW") -> str:
    rows=rows_html(count,row_height,prefix)
    if body_target:
        return f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}<body>{rows}</body>"
    return f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}<body><article id='target'>{rows}</article><div>CHILD_UNSELECTED_TOKEN</div></body>"


def top_html() -> str:
    return f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}<div id='top-shell'>C16_TOP_SHELL_TOKEN</div><div class='host'><iframe id='f1'></iframe></div>"


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__c16Command(payload)", payload)


def inject_content(page) -> None:
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def wait_frame(page, chain: list[str]) -> None:
    expr = """(chain)=>{let d=document;for(const id of chain){const f=d.getElementById(id);if(!f?.contentDocument?.documentElement)return false;d=f.contentDocument;}return d.readyState==='complete'}"""
    page.wait_for_function(expr, arg=chain, timeout=10000)


def set_frame_srcdoc(page, chain_to_parent: list[str], frame_id: str, html: str) -> None:
    page.evaluate(
        """({chain,id,html})=>{let d=document;for(const p of chain)d=d.getElementById(p).contentDocument;d.getElementById(id).srcdoc=html;}""",
        {"chain":chain_to_parent,"id":frame_id,"html":html},
    )
    wait_frame(page, chain_to_parent + [frame_id])


def start(page) -> None:
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"start"})
    assert result.get("ok") is True, result


def click_in_doc(page, chain: list[str], selector: str) -> None:
    ok=page.evaluate(
        """({chain,selector})=>{let d=document;for(const id of chain)d=d.getElementById(id).contentDocument;const el=selector==='body'?d.body:d.querySelector(selector);if(!el)return false;el.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true;}""",
        {"chain":chain,"selector":selector},
    )
    assert ok, (chain,selector)


def select_scope(page, chain: list[str], selector: str) -> None:
    start(page)
    click_in_doc(page,chain,selector)
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"mode-exclude"})
    assert result.get("ok") is True, result
    click_in_doc(page,chain,".omit")
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"mode-include"})
    assert result.get("ok") is True, result


def live_marks(page) -> dict:
    return page.evaluate(
        """()=>{const out={includes:[],excludes:[]};const seen=new Set();const visit=(d,path)=>{if(!d||seen.has(d))return;seen.add(d);for(const e of d.querySelectorAll('[data-webclip-pdf-include]'))out.includes.push({path,tag:e.localName,id:e.id||''});for(const e of d.querySelectorAll('[data-webclip-pdf-exclude]'))out.excludes.push({path,tag:e.localName,id:e.id||'',cls:e.className||''});for(const f of d.querySelectorAll('iframe,frame')){try{if(f.contentDocument?.documentElement)visit(f.contentDocument,`${path}/${f.id||f.localName}`)}catch(_){}}};visit(document,'top');return out;}"""
    )


def modal_click(page) -> None:
    clicked=page.evaluate(
        """()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}"""
    )
    assert clicked


def begin_prepare(page) -> dict:
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"download"})
    assert result.get("ok") is True, result
    modal_click(page)
    page.wait_for_function("()=>!!globalThis.__c16.lastPdfRequest",timeout=25000)
    return page.evaluate("()=>globalThis.__c16.lastPdfRequest")


def resolve_pdf(page) -> None:
    assert page.evaluate("()=>__c16ResolvePdf()") is True
    page.wait_for_timeout(30)


def extract_measurements(request: dict, diagnostics: dict) -> list[dict]:
    vals=[]
    for root in [request.get("meta",{}).get("pageAnalysis",{}), diagnostics.get("diagnostics",{}).get("beforePrint") or {}, diagnostics.get("diagnostics",{}).get("current") or {}]:
        items=(root.get("print") or {}).get("frameMeasurements") or []
        for item in items:
            if isinstance(item,dict): vals.append(item)
    return vals


def summarize_pdf(path: pathlib.Path, expected_rows: int, prefix: str = "C16_ROW") -> dict:
    text,pages=pdf_text(path)
    nums=[int(x) for x in re.findall(rf"{re.escape(prefix)}_(\d{{4}})",text)]
    return {
        "pages":pages,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
        "rowCount":len(set(nums)),"lastRow":max(nums) if nums else 0,
        "first":"C16_FIRST_SENTINEL" in text,"middle":"C16_MIDDLE_SENTINEL" in text,"last":"C16_LAST_SENTINEL" in text,
        "excludeOmitted":"C16_EXCLUDE_TOKEN" not in text,"topShellOmitted":"C16_TOP_SHELL_TOKEN" not in text,
        "expectedRows":expected_rows,
    }


def physical_case(ctx, out: pathlib.Path, name: str, count: int, *, body_target: bool, nested: bool=False, row_height: int=34, causal_top: bool=False) -> dict:
    page=ctx.new_page()
    page.set_viewport_size({"width":1100,"height":800})
    page.set_content(top_html(),wait_until="load")
    if nested:
        outer=f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}<body><div>OUTER_UNSELECTED_TOKEN</div><iframe id='f2'></iframe></body>"
        set_frame_srcdoc(page,[],"f1",outer)
        set_frame_srcdoc(page,["f1"],"f2",child_html(count,body_target=body_target,row_height=row_height))
        chain=["f1","f2"]
    else:
        set_frame_srcdoc(page,[],"f1",child_html(count,body_target=body_target,row_height=row_height))
        chain=["f1"]
    inject_content(page)
    select_scope(page,chain,"body" if body_target else "#target")
    marks=live_marks(page)
    assert len(marks["includes"])==1 and len(marks["excludes"])==1, marks
    request=begin_prepare(page)
    causal_info={}
    if causal_top:
        causal_info=page.evaluate(
            """({chain})=>{let d=document;for(const id of chain)d=d.getElementById(id).contentDocument;const src=d.querySelector('#target');const clone=src.cloneNode(true);clone.id='causal-top-target';clone.setAttribute('data-webclip-pdf-include','c16-causal');for(const e of clone.querySelectorAll('[data-webclip-pdf-exclude]'))e.remove();for(const e of clone.querySelectorAll('.omit'))e.remove();clone.style.setProperty('display','block','important');clone.style.setProperty('position','static','important');clone.style.setProperty('height','auto','important');clone.style.setProperty('max-height','none','important');clone.style.setProperty('overflow','visible','important');document.body.appendChild(clone);const f=document.getElementById(chain[0]);f.style.setProperty('display','none','important');return {cloneText:clone.textContent.length,rows:clone.querySelectorAll('.row').length};}""",
            {"chain":chain},
        )
    pdf_path=out/f"{name}.pdf"
    page.pdf(path=str(pdf_path),format="A4",print_background=True,prefer_css_page_size=True)
    diagnostics=command(page,{"type":"WEBCLIP_COLLECT_PRINT_DIAGNOSTICS"})
    summary=summarize_pdf(pdf_path,count)
    measurements=extract_measurements(request,diagnostics)
    summary.update({
        "marks":marks,"frameMeasurements":measurements[-24:],"causal":causal_info,
        "maxMeasuredHeight":max([float(x.get('measuredHeight') or 0) for x in measurements] or [0]),
        "maxAppliedHeight":max([float(x.get('appliedHeight') or 0) for x in measurements] or [0]),
    })
    resolve_pdf(page)
    page.close()
    return summary


def direct_control(ctx, out: pathlib.Path, count: int=180) -> dict:
    page=ctx.new_page();page.set_viewport_size({"width":760,"height":800})
    page.set_content(child_html(count,body_target=False),wait_until="load")
    page.evaluate("()=>document.querySelector('.omit')?.remove()")
    path=out/'direct_child.pdf';page.pdf(path=str(path),format='A4',print_background=True)
    result=summarize_pdf(path,count);result['excludeOmitted']=True;result['topShellOmitted']=True
    page.close();return result


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        ctx=browser.new_context()
        version=browser.version
        results={
            "browserVersion":version,
            "contentBlobSha":os.environ.get('CONTENT_BLOB_SHA',''),
            "directLongChild":direct_control(ctx,out,180),
            "oneLevelBody":physical_case(ctx,out,'one_level_body',180,body_target=True),
            "shortNonBody":physical_case(ctx,out,'short_nonbody',12,body_target=False),
            "longNonBody":physical_case(ctx,out,'long_nonbody',180,body_target=False),
            "nestedBody":physical_case(ctx,out,'nested_body',180,body_target=True,nested=True),
            "nestedNonBody":physical_case(ctx,out,'nested_nonbody',180,body_target=False,nested=True),
            "overCapNonBody":physical_case(ctx,out,'over_cap_nonbody',4200,body_target=False,row_height=50),
            "overCapCausalTop":physical_case(ctx,out,'over_cap_causal_top',4200,body_target=False,row_height=50,causal_top=True),
        }
        browser.close()
    payload=json.dumps(results,sort_keys=True,separators=(',',':'),ensure_ascii=False)
    results['resultSha256']=hashlib.sha256(payload.encode()).hexdigest()
    print('C16_RESULT_JSON='+json.dumps(results,sort_keys=True,separators=(',',':'),ensure_ascii=False),flush=True)

    # Harness-validity / positive-control assertions. The over-cap current-path
    # observation is deliberately not forced to PASS or FAIL in advance.
    for key in ['directLongChild','oneLevelBody','shortNonBody','longNonBody','nestedBody','nestedNonBody']:
        r=results[key]
        assert r['rowCount']==r['expectedRows'] and r['first'] and r['middle'] and r['last'], (key,r)
        assert r['excludeOmitted'] and r['topShellOmitted'], (key,r)
    c=results['overCapCausalTop']
    assert c['rowCount']==c['expectedRows'] and c['first'] and c['middle'] and c['last'], c
    assert c['excludeOmitted'] and c['topShellOmitted'], c
    return results


def main() -> None:
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='')
    a=p.parse_args()
    if not a.chrome: raise SystemExit('Chrome/Chromium binary not found')
    out=pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c16-'))
    run(a.chrome,out)

if __name__=='__main__': main()
