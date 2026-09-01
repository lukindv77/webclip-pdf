#!/usr/bin/env python3
"""Temporary C04 physical probe: ordinary selected DOM/text -> WebClip preparation -> Chromium PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")
CHROME_MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null; globalThis.__c04={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(message){
    if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
    if(message?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c04.lastPdfRequest=message;return new Promise((resolve)=>{resolvePdf=resolve});}
    return Promise.resolve({ok:true});
  }}};
  globalThis.__c04Command=(message)=>new Promise((resolve,reject)=>{const fn=listeners[0];if(!fn)return reject(new Error('content listener missing'));let done=false;const send=(value)=>{if(!done){done=true;resolve(value)}};try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true});}catch(error){reject(error)}});
  globalThis.__c04ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c04.pdf'});return true;};
})();
"""
BASE_STYLE = """<style>body{font-family:Arial,sans-serif;margin:24px;font-size:16px;line-height:1.45}.scope{display:block;width:760px;padding:14px;margin:12px 0;border:1px solid #999;box-sizing:border-box}.cut{display:block;padding:8px;margin:8px 0;border:1px solid #bbb}table{border-collapse:collapse}td,th{padding:3px 8px}</style>"""

def pdf_text(path): return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
def normalized(value): return re.sub(r"\s+", " ", str(value or "")).strip()
def assert_in_order(text, markers):
    hay=normalized(text); cursor=-1
    for marker in markers:
        index=hay.find(marker,cursor+1); assert index>=0,{"missing":marker,"text":hay}; assert index>cursor,{"outOfOrder":marker,"text":hay}; cursor=index

def load_content(page, html):
    page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}</head><body>{html}</body></html>",wait_until="load"); page.evaluate(CHROME_MOCK); page.add_script_tag(content=CONTENT)
def command(page,payload): return page.evaluate("(payload)=>__c04Command(payload)",payload)
def click(page,selector):
    result=page.evaluate("""(selector)=>document.querySelector(selector).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))""",selector); assert result is False,(selector,result)
def modal_click(page,label="Сформировать PDF"):
    clicked=page.evaluate("""(label)=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);if(!b)return false;b.click();return true;}""",label); assert clicked,label
def wait_prepared(page): page.wait_for_function("()=>!!globalThis.__c04.lastPdfRequest",timeout=15000); return page.evaluate("()=>globalThis.__c04.lastPdfRequest")
def resolve_mock_pdf(page): assert page.evaluate("()=>__c04ResolvePdf()") is True; page.wait_for_timeout(40)

def physical_case(ctx,out_dir,name,html,include,exclude=""):
    page=ctx.new_page(); page.set_viewport_size({"width":1100,"height":800}); load_content(page,html)
    assert command(page,{"type":"WEBCLIP_COMMAND","command":"start"}).get("ok") is True
    selectors=[include] if isinstance(include,str) else list(include)
    for selector in selectors: click(page,selector)
    if exclude:
        assert command(page,{"type":"WEBCLIP_COMMAND","command":"mode-exclude"}).get("ok") is True
        cuts=[exclude] if isinstance(exclude,str) else list(exclude)
        for selector in cuts: click(page,selector)
    assert command(page,{"type":"WEBCLIP_COMMAND","command":"download"}).get("ok") is True; modal_click(page); request=wait_prepared(page)
    snapshot=request.get("meta",{}).get("selectionSnapshot",{}); assert len(snapshot.get("includes",[]))==len(selectors),request
    path=out_dir/f"{name}.pdf"; page.pdf(path=str(path),format="A4",print_background=True); text=pdf_text(path)
    result={"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"text":text,"pageAnalysis":request.get("meta",{}).get("pageAnalysis")}
    resolve_mock_pdf(page); page.close(); return result

def pack(a, **extra): return {"bytes":a["bytes"],"sha256":a["sha256"],"pageAnalysis":a["pageAnalysis"],**extra}

def run(chromium,out_dir):
    results={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=chromium,headless=True,args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"]); ctx=browser.new_context()

        basic="""<div>C04_OUTSIDE_NOISE</div><article id='basic' class='scope'><h1>C04_BASIC_HEADING</h1><p>C04_PARA_A <strong>C04_STRONG</strong> <em>C04_EMPHASIS</em> <span>C04_INLINE</span></p><section><p>C04_NESTED_PARA</p></section><p>C04_CYR Привет мир</p><p>C04_PARA_B</p></article><footer>C04_OUTSIDE_FOOTER</footer>"""
        a=physical_case(ctx,out_dir,"basic_nested",basic,"#basic"); markers=["C04_BASIC_HEADING","C04_PARA_A","C04_STRONG","C04_EMPHASIS","C04_INLINE","C04_NESTED_PARA","C04_CYR","Привет мир","C04_PARA_B"]; assert_in_order(a["text"],markers); assert "C04_OUTSIDE_NOISE" not in a["text"] and "C04_OUTSIDE_FOOTER" not in a["text"]; results["basicNested"]=pack(a,markers=markers)

        ex="""<section id='outer' class='scope'><p>C04_KEEP_BEFORE</p><aside id='cut' class='cut'><p>C04_EXCLUDE_PARENT</p><div><span>C04_EXCLUDE_NESTED</span></div></aside><p>C04_KEEP_AFTER</p></section><p>C04_EXCLUDE_OUTSIDE_NOISE</p>"""
        a=physical_case(ctx,out_dir,"nested_exclude",ex,"#outer","#cut"); assert_in_order(a["text"],["C04_KEEP_BEFORE","C04_KEEP_AFTER"]); assert "C04_EXCLUDE_PARENT" not in a["text"] and "C04_EXCLUDE_NESTED" not in a["text"] and "C04_EXCLUDE_OUTSIDE_NOISE" not in a["text"]; results["nestedExclude"]=pack(a)

        inline_ex="""<p id='inlineOuter' class='scope'>C04_INLINE_KEEP_A <span id='inlineCut'>C04_INLINE_CUT</span> C04_INLINE_KEEP_B</p>"""
        a=physical_case(ctx,out_dir,"inline_exclude",inline_ex,"#inlineOuter","#inlineCut"); assert_in_order(a["text"],["C04_INLINE_KEEP_A","C04_INLINE_KEEP_B"]); assert "C04_INLINE_CUT" not in a["text"]; results["inlineExclude"]=pack(a)

        br="""<div id='breaks' class='scope'><p>C04_BR_ALPHA<br>C04_BR_BETA<br><span>C04_BR_GAMMA</span></p><pre>C04_PRE_ALPHA    C04_PRE_BETA\nC04_PRE_GAMMA</pre><p>C04_ENTITY_AMP &amp; C04_ENTITY_LITERAL</p></div>"""
        a=physical_case(ctx,out_dir,"breaks_pre",br,"#breaks"); assert_in_order(a["text"],["C04_BR_ALPHA","C04_BR_BETA","C04_BR_GAMMA","C04_PRE_ALPHA","C04_PRE_BETA","C04_PRE_GAMMA","C04_ENTITY_AMP","&","C04_ENTITY_LITERAL"]); results["breaksPre"]=pack(a,rawTextLines=[x for x in a["text"].splitlines() if x.strip()][:24])

        sem="""<main id='semantic' class='scope'><h2>C04_SECTION_HEADING</h2><ul><li>C04_UL_ONE</li><li><span>C04_UL_TWO</span></li></ul><ol><li>C04_OL_ONE</li><li>C04_OL_TWO</li></ol><table><thead><tr><th>C04_TH_A</th><th>C04_TH_B</th></tr></thead><tbody><tr><td>C04_R1_A</td><td>C04_R1_B</td></tr><tr><td>C04_R2_A</td><td>C04_R2_B</td></tr></tbody></table><p>C04_SECTION_END</p></main>"""
        a=physical_case(ctx,out_dir,"semantic_text",sem,"#semantic"); markers=["C04_SECTION_HEADING","C04_UL_ONE","C04_UL_TWO","C04_OL_ONE","C04_OL_TWO","C04_TH_A","C04_TH_B","C04_R1_A","C04_R1_B","C04_R2_A","C04_R2_B","C04_SECTION_END"]; assert_in_order(a["text"],markers); results["semanticText"]=pack(a,markers=markers)

        multi="""<section id='one' class='scope'><p>C04_MULTI_ONE_A</p><p>C04_MULTI_ONE_B</p></section><div>C04_MULTI_MIDDLE_NOISE</div><section id='two' class='scope'><p>C04_MULTI_TWO_A</p><p>C04_MULTI_TWO_B</p></section><div>C04_MULTI_TAIL_NOISE</div>"""
        a=physical_case(ctx,out_dir,"multiple_includes",multi,["#one","#two"]); markers=["C04_MULTI_ONE_A","C04_MULTI_ONE_B","C04_MULTI_TWO_A","C04_MULTI_TWO_B"]; assert_in_order(a["text"],markers); assert "C04_MULTI_MIDDLE_NOISE" not in a["text"] and "C04_MULTI_TAIL_NOISE" not in a["text"]; assert a["pageAnalysis"]["selection"]["includeCount"]==2,a["pageAnalysis"]; results["multipleIncludes"]=pack(a,markers=markers)

        ctx.close(); browser.close()
    return results

def main():
    p=argparse.ArgumentParser(); p.add_argument("--chromium",default=CHROMIUM_DEFAULT); p.add_argument("--out-dir",default=""); args=p.parse_args()
    if not args.chromium: raise SystemExit("Chromium/Chrome binary not found")
    if args.out_dir: out=pathlib.Path(args.out_dir); out.mkdir(parents=True,exist_ok=True); result=run(args.chromium,out)
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c04-") as tmp: result=run(args.chromium,pathlib.Path(tmp))
    print(json.dumps({"audit":"C04 ordinary DOM/text physical baseline","result":result},ensure_ascii=False,indent=2)); return 0
if __name__=="__main__": raise SystemExit(main())
