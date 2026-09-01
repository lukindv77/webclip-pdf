#!/usr/bin/env python3
"""Temporary acceptance-grade C05 probe: source geometry -> WebClip prepared screen geometry -> physical PDF."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

import fitz
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")
TOL = 0.08

CHROME_MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null; globalThis.__c05={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(message){
    if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
    if(message?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c05.lastPdfRequest=message;return new Promise((resolve)=>{resolvePdf=resolve});}
    return Promise.resolve({ok:true});
  }}};
  globalThis.__c05Command=(message)=>new Promise((resolve,reject)=>{const fn=listeners[0];if(!fn)return reject(new Error('content listener missing'));let done=false;const send=(v)=>{if(!done){done=true;resolve(v)}};try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true});}catch(error){reject(error)}});
  globalThis.__c05ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c05.pdf'});return true;};
})();
"""

BASE_STYLE = """<style>
html{background:white}
body{font-family:Arial,sans-serif;font-size:16px;line-height:1.3;margin:24px}
.scope{box-sizing:border-box;border:1px solid #999;padding:12px;margin:10px 0}
.marker{display:inline-block;padding:2px}
</style>"""


def approx(a,b,tol=TOL): return abs(float(a)-float(b)) <= tol

def command(page,payload): return page.evaluate("(payload)=>__c05Command(payload)",payload)
def click(page,selector):
    result=page.evaluate("""(selector)=>document.querySelector(selector).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))""",selector)
    assert result is False,(selector,result)
def modal_click(page,label="Сформировать PDF"):
    clicked=page.evaluate("""(label)=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);if(!b)return false;b.click();return true;}""",label)
    assert clicked,label
def wait_prepared(page): page.wait_for_function("()=>!!globalThis.__c05.lastPdfRequest",timeout=20000); return page.evaluate("()=>globalThis.__c05.lastPdfRequest")
def resolve_mock_pdf(page): assert page.evaluate("()=>__c05ResolvePdf()") is True; page.wait_for_timeout(40)


def rects(page,selectors,fragment_selectors=()):
    return page.evaluate("""({selectors,fragments})=>{
      const out={};
      for(const selector of selectors){
        const el=document.querySelector(selector); if(!el){out[selector]=null;continue;}
        const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
        out[selector]={x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,display:cs.display,position:cs.position,transform:cs.transform,writingMode:cs.writingMode,overflowX:cs.overflowX,overflowY:cs.overflowY};
      }
      for(const selector of fragments){const el=document.querySelector(selector);if(!el)continue;const range=document.createRange();range.selectNodeContents(el);out[selector+'::fragments']=[...range.getClientRects()].map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}));}
      const hr=document.documentElement.getBoundingClientRect(), br=document.body.getBoundingClientRect();
      out.__root={viewport:{width:innerWidth,height:innerHeight},html:{x:hr.x,y:hr.y,width:hr.width,height:hr.height,style:{position:getComputedStyle(document.documentElement).position,transform:getComputedStyle(document.documentElement).transform,width:getComputedStyle(document.documentElement).width}},body:{x:br.x,y:br.y,width:br.width,height:br.height,style:{position:getComputedStyle(document.body).position,transform:getComputedStyle(document.body).transform,width:getComputedStyle(document.body).width,marginLeft:getComputedStyle(document.body).marginLeft}}};
      return out;
    }""",{"selectors":list(selectors),"fragments":list(fragment_selectors)})


def pdf_words(path):
    doc=fitz.open(str(path)); pages=[]
    for pno,page in enumerate(doc):
        words=[]
        for item in page.get_text("words"):
            x0,y0,x1,y1,text,block,line,word=item[:8]; words.append({"text":text,"x0":x0,"y0":y0,"x1":x1,"y1":y1,"page":pno,"block":block,"line":line,"word":word})
        pages.append(words)
    doc.close(); return pages

def marker_boxes(word_pages,markers):
    out={}
    for marker in markers:
        hits=[]
        for words in word_pages:
            for w in words:
                if marker in w["text"].strip(): hits.append(w)
        out[marker]=hits
    return out

def first_box(r,marker): return r["pdfMarkers"][marker][0]
def dx(rects_,a,b): return rects_[b]["x"]-rects_[a]["x"]
def dy(rects_,a,b): return rects_[b]["y"]-rects_[a]["y"]
def pdx(r,a,b): return first_box(r,b)["x0"]-first_box(r,a)["x0"]
def pdy(r,a,b): return first_box(r,b)["y0"]-first_box(r,a)["y0"]


def assert_rect_stable(r,selectors,xy=False):
    s,p=r["source"],r["preparedScreen"]
    for selector in selectors:
        assert approx(s[selector]["width"],p[selector]["width"]),(selector,"width",s[selector],p[selector])
        assert approx(s[selector]["height"],p[selector]["height"]),(selector,"height",s[selector],p[selector])
        if xy:
            assert approx(s[selector]["x"],p[selector]["x"]),(selector,"x",s[selector],p[selector])
            assert approx(s[selector]["y"],p[selector]["y"]),(selector,"y",s[selector],p[selector])


def validate(name,r):
    s,p=r["source"],r["preparedScreen"]
    if name=="normal_flow":
        assert_rect_stable(r,["#scope","#a","#b"]); assert approx(dx(s,"#scope","#a"),dx(p,"#scope","#a")); assert approx(dx(s,"#scope","#b"),dx(p,"#scope","#b")); assert approx(dy(s,"#a","#b"),dy(p,"#a","#b")); assert pdy(r,"C05_FLOW_A","C05_FLOW_B")>20
    elif name=="flex_row":
        assert_rect_stable(r,["#scope","#a","#b"]); assert approx(dx(s,"#a","#b"),dx(p,"#a","#b")); assert pdx(r,"C05_FLEX_A","C05_FLEX_B")>100; assert abs(pdy(r,"C05_FLEX_A","C05_FLEX_B"))<3
    elif name=="grid_2x2":
        assert_rect_stable(r,["#scope","#a","#b","#c","#d"]); assert approx(dx(s,"#a","#b"),dx(p,"#a","#b")); assert approx(dy(s,"#a","#c"),dy(p,"#a","#c")); assert pdx(r,"C05_GRID_A","C05_GRID_B")>100; assert pdy(r,"C05_GRID_A","C05_GRID_C")>25
    elif name=="inline_fragmentation":
        assert_rect_stable(r,["#scope","#frag"]); sf,pf=s["#frag::fragments"],p["#frag::fragments"]; assert len(sf)==len(pf)>=3,(sf,pf); assert all(approx(a["width"],b["width"]) and approx(a["height"],b["height"]) for a,b in zip(sf,pf)); assert pdy(r,"C05_FRAG_A","C05_FRAG_B")>25
    elif name=="relative_absolute":
        assert_rect_stable(r,["#scope","#anchor","#abs"]); assert approx(dx(s,"#scope","#anchor"),dx(p,"#scope","#anchor")); assert approx(dx(s,"#scope","#abs"),dx(p,"#scope","#abs")); assert pdx(r,"C05_REL_A","C05_ABS_B")>100; assert pdy(r,"C05_REL_A","C05_ABS_B")>30
    elif name=="transform_child":
        assert_rect_stable(r,["#scope","#origin","#moved"]); assert s["#moved"]["transform"]==p["#moved"]["transform"]!="none"; assert approx(dx(s,"#origin","#moved"),dx(p,"#origin","#moved")); assert pdx(r,"C05_TRANSFORM_ORIGIN","C05_TRANSFORM_MOVED")>70; a,b=first_box(r,"C05_TRANSFORM_ORIGIN"),first_box(r,"C05_TRANSFORM_MOVED"); assert (b["y1"]-b["y0"])>(a["y1"]-a["y0"])*1.1
    elif name=="fixed_position":
        assert s["#scope"]["position"]==p["#scope"]["position"]=="fixed"; assert_rect_stable(r,["#scope"],xy=True); b=first_box(r,"C05_FIXED"); assert b["x0"]>150 and b["y0"]>90,b
    elif name=="minmax_sizing":
        assert_rect_stable(r,["#scope","#clamp","#minbox"]); assert 275<s["#clamp"]["width"]<285,s["#clamp"]; assert approx(s["#clamp"]["width"],p["#clamp"]["width"]); assert pdy(r,"C05_CLAMP","C05_MINBOX")>15
    elif name=="body_width_context":
        # Fresh P0-004 discriminator: WebClip root normalization overrides page-owned body width,
        # which changes a percentage-sized selected target before physical rendering.
        assert 695<s["__root"]["body"]["width"]<705,s["__root"]
        assert p["__root"]["body"]["width"]-s["__root"]["body"]["width"]>150,(s["__root"],p["__root"])
        assert p["#scope"]["width"]-s["#scope"]["width"]>100,(s["#scope"],p["#scope"])
        assert p["#inner"]["width"]-s["#inner"]["width"]>100,(s["#inner"],p["#inner"])
        assert pdx(r,"C05_BODY_LEFT","C05_BODY_RIGHT")>120,pdx(r,"C05_BODY_LEFT","C05_BODY_RIGHT")
    elif name=="body_transform_context":
        # Fresh P0-004 discriminator: page-owned ancestor transform is intentionally reset by
        # current print preparation, changing selected rendered geometry before Page.printToPDF.
        assert s["__root"]["body"]["style"]["transform"]!="none",s["__root"]
        assert p["__root"]["body"]["style"]["transform"]=="none",p["__root"]
        assert abs(p["#scope"]["x"]-s["#scope"]["x"])>100,(s["#scope"],p["#scope"])
        assert p["#scope"]["width"]-s["#scope"]["width"]>90,(s["#scope"],p["#scope"])
        assert first_box(r,"C05_BODY_TRANSFORM_LEFT")["x0"]<100,first_box(r,"C05_BODY_TRANSFORM_LEFT")
        assert pdx(r,"C05_BODY_TRANSFORM_LEFT","C05_BODY_TRANSFORM_RIGHT")>100
    elif name=="nested_percentages":
        assert_rect_stable(r,["#scope","#outer","#mid","#inner"]); assert approx(s["#mid"]["width"]/s["#outer"]["width"],.75,.002); assert approx(s["#inner"]["width"]/s["#mid"]["width"],.5,.002)
    elif name=="table_fixed":
        assert_rect_stable(r,["#scope","#table","#a","#b"]); assert approx(s["#a"]["width"]/s["#table"]["width"],.30,.01); assert approx(s["#b"]["width"]/s["#table"]["width"],.70,.01); assert pdx(r,"C05_TABLE_A","C05_TABLE_B")>100
    elif name=="vertical_writing":
        assert_rect_stable(r,["#scope","#a","#b"]); assert s["#scope"]["writingMode"]==p["#scope"]["writingMode"]=="vertical-rl"; a,b=first_box(r,"C05_VERTICAL_A"),first_box(r,"C05_VERTICAL_B"); assert abs(b["x0"]-a["x0"])>20; assert (a["y1"]-a["y0"])>(a["x1"]-a["x0"])
    elif name=="multicolumn":
        assert_rect_stable(r,["#scope","#a","#b"]); assert approx(dx(s,"#a","#b"),dx(p,"#a","#b")); assert pdx(r,"C05_COLUMN_A","C05_COLUMN_B")>150; assert abs(pdy(r,"C05_COLUMN_A","C05_COLUMN_B"))<5
    elif name=="exclude_flex_reflow":
        assert s["#cut"]["display"]!="none" and p["#cut"]["display"]=="none"; assert p["#cut"]["width"]==0; assert p["#c"]["x"]<s["#c"]["x"]-150; assert approx(p["#c"]["x"],s["#cut"]["x"]); assert pdx(r,"C05_EX_A","C05_EX_C")>80; assert not r["pdfMarkers"].get("C05_EX_CUT")
    else: raise AssertionError(f"No validator for {name}")
    return {"classification":"P0-004 finding" if name in {"body_width_context","body_transform_context"} else "positive-control"}


def physical_case(ctx,out_dir,spec):
    page=ctx.new_page(); page.set_viewport_size({"width":1100,"height":820})
    page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}{spec.get('style','')}</head><body>{spec['html']}</body></html>",wait_until="load")
    page.evaluate(CHROME_MOCK); page.add_script_tag(content=CONTENT); page.wait_for_timeout(80)
    source=rects(page,spec["selectors"],spec.get("fragments",()))
    assert command(page,{"type":"WEBCLIP_COMMAND","command":"start"}).get("ok") is True
    includes=spec["include"] if isinstance(spec["include"],list) else [spec["include"]]
    for selector in includes: click(page,selector)
    excludes=spec.get("exclude",[]); excludes=excludes if isinstance(excludes,list) else ([excludes] if excludes else [])
    if excludes:
        assert command(page,{"type":"WEBCLIP_COMMAND","command":"mode-exclude"}).get("ok") is True
        for selector in excludes: click(page,selector)
    assert command(page,{"type":"WEBCLIP_COMMAND","command":"download"}).get("ok") is True; modal_click(page); request=wait_prepared(page)
    snapshot=request.get("meta",{}).get("selectionSnapshot",{}); assert len(snapshot.get("includes",[]))==len(includes),request

    # Production service-worker selects screen media immediately before Page.printToPDF.
    page.emulate_media(media="screen"); page.wait_for_timeout(80)
    prepared=rects(page,spec["selectors"],spec.get("fragments",()))
    path=out_dir/f"{spec['name']}.pdf"
    # Match the production Page.printToPDF envelope: A4 comes from injected @page,
    # screen media is already selected, scale=1, background enabled, prefer CSS page size.
    page.pdf(path=str(path),landscape=False,display_header_footer=False,print_background=True,scale=1,prefer_css_page_size=True)
    markers=marker_boxes(pdf_words(path),spec["markers"])
    result={"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"source":source,"preparedScreen":prepared,"pdfMarkers":markers,"selection":request.get("meta",{}).get("pageAnalysis",{}).get("selection")}
    for marker in spec["requiredMarkers"]:
        assert markers.get(marker),{"case":spec["name"],"missingPdfMarker":marker,"markers":markers}
    result["verdict"]=validate(spec["name"],result)
    resolve_mock_pdf(page); page.close(); return result


def S(name,html,include,selectors,markers,style="",exclude=None,fragments=(),required=None):
    return {"name":name,"html":html,"include":include,"selectors":selectors,"markers":markers,"requiredMarkers":required if required is not None else markers,"style":style,"exclude":exclude or [],"fragments":fragments}


def specs():
    return [
      S("normal_flow","<section id='scope' class='scope' style='width:680px'><div id='a' style='width:300px;height:54px'>C05_FLOW_A</div><div id='b' style='width:510px;height:70px;margin-top:22px'>C05_FLOW_B</div></section>","#scope",["#scope","#a","#b"],["C05_FLOW_A","C05_FLOW_B"]),
      S("flex_row","<section id='scope' class='scope' style='display:flex;width:720px;gap:34px;align-items:flex-start'><div id='a' style='flex:0 0 180px;height:72px'>C05_FLEX_A</div><div id='b' style='flex:0 0 260px;height:96px'>C05_FLEX_B</div></section>","#scope",["#scope","#a","#b"],["C05_FLEX_A","C05_FLEX_B"]),
      S("grid_2x2","<section id='scope' class='scope' style='display:grid;width:720px;grid-template-columns:2fr 1fr;grid-template-rows:80px 110px;gap:20px'><div id='a'>C05_GRID_A</div><div id='b'>C05_GRID_B</div><div id='c'>C05_GRID_C</div><div id='d'>C05_GRID_D</div></section>","#scope",["#scope","#a","#b","#c","#d"],["C05_GRID_A","C05_GRID_B","C05_GRID_C","C05_GRID_D"]),
      S("inline_fragmentation","<section id='scope' class='scope' style='width:270px'><p id='frag' style='margin:0'>C05_FRAG_A alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron C05_FRAG_B</p></section>","#scope",["#scope","#frag"],["C05_FRAG_A","C05_FRAG_B"],fragments=["#frag"]),
      S("relative_absolute","<section id='scope' class='scope' style='position:relative;width:650px;height:230px'><div id='anchor' style='position:relative;left:45px;top:18px;width:180px'>C05_REL_A</div><div id='abs' style='position:absolute;left:310px;top:120px;width:190px'>C05_ABS_B</div></section>","#scope",["#scope","#anchor","#abs"],["C05_REL_A","C05_ABS_B"]),
      S("transform_child","<section id='scope' class='scope' style='position:relative;width:650px;height:250px'><div id='origin' style='width:180px'>C05_TRANSFORM_ORIGIN</div><div id='moved' style='width:180px;transform:translate(150px,45px) scale(1.2);transform-origin:0 0'>C05_TRANSFORM_MOVED</div></section>","#scope",["#scope","#origin","#moved"],["C05_TRANSFORM_ORIGIN","C05_TRANSFORM_MOVED"]),
      S("fixed_position","<section id='scope' class='scope' style='position:fixed;left:280px;top:180px;width:320px;height:90px'>C05_FIXED</section>","#scope",["#scope"],["C05_FIXED"]),
      S("minmax_sizing","<section id='scope' class='scope' style='width:700px'><div id='clamp' style='width:clamp(220px,40%,360px);height:46px'>C05_CLAMP</div><div id='minbox' style='min-width:240px;max-width:330px;width:80%;height:46px;margin-top:12px'>C05_MINBOX</div></section>","#scope",["#scope","#clamp","#minbox"],["C05_CLAMP","C05_MINBOX"]),
      S("body_width_context","<section id='scope' class='scope'><div id='inner' style='width:100%;display:flex;justify-content:space-between'><span>C05_BODY_LEFT</span><span>C05_BODY_RIGHT</span></div></section>","#scope",["#scope","#inner"],["C05_BODY_LEFT","C05_BODY_RIGHT"],style="<style>body{width:700px;margin-left:150px;margin-right:0}#scope{width:50%;margin-left:0}</style>"),
      S("body_transform_context","<section id='scope' class='scope'><div id='inner' style='width:420px;display:flex;justify-content:space-between'><span>C05_BODY_TRANSFORM_LEFT</span><span>C05_BODY_TRANSFORM_RIGHT</span></div></section>","#scope",["#scope","#inner"],["C05_BODY_TRANSFORM_LEFT","C05_BODY_TRANSFORM_RIGHT"],style="<style>body{transform:translateX(140px) scale(.82);transform-origin:0 0}#scope{width:620px;margin-left:0}</style>"),
      S("nested_percentages","<section id='scope' class='scope' style='width:700px'><div id='outer' style='width:600px'><div id='mid' style='width:75%'><div id='inner' style='width:50%'>C05_PERCENT_INNER</div></div></div></section>","#scope",["#scope","#outer","#mid","#inner"],["C05_PERCENT_INNER"]),
      S("table_fixed","<section id='scope' class='scope' style='width:760px'><table id='table' style='table-layout:fixed;width:720px;border-collapse:collapse'><col style='width:30%'><col style='width:70%'><tbody><tr><td id='a'>C05_TABLE_A</td><td id='b'>C05_TABLE_B</td></tr><tr><td>C05_TABLE_C</td><td>C05_TABLE_D</td></tr></tbody></table></section>","#scope",["#scope","#table","#a","#b"],["C05_TABLE_A","C05_TABLE_B","C05_TABLE_C","C05_TABLE_D"]),
      S("vertical_writing","<section id='scope' class='scope' style='width:320px;height:340px;writing-mode:vertical-rl'><div id='a' style='height:130px'>C05_VERTICAL_A</div><div id='b' style='height:150px;margin-right:24px'>C05_VERTICAL_B</div></section>","#scope",["#scope","#a","#b"],["C05_VERTICAL_A","C05_VERTICAL_B"]),
      S("multicolumn","<section id='scope' class='scope' style='width:720px;column-count:2;column-gap:48px;column-fill:auto;height:280px'><div id='a' style='break-after:column;height:220px'>C05_COLUMN_A<br>alpha<br>beta<br>gamma</div><div id='b' style='height:180px'>C05_COLUMN_B<br>delta<br>epsilon</div></section>","#scope",["#scope","#a","#b"],["C05_COLUMN_A","C05_COLUMN_B"]),
      S("exclude_flex_reflow","<section id='scope' class='scope' style='display:flex;width:700px;gap:30px'><div id='a' style='flex:0 0 150px'>C05_EX_A</div><div id='cut' style='flex:0 0 150px'>C05_EX_CUT</div><div id='c' style='flex:0 0 150px'>C05_EX_C</div></section>","#scope",["#scope","#a","#cut","#c"],["C05_EX_A","C05_EX_C","C05_EX_CUT"],exclude="#cut",required=["C05_EX_A","C05_EX_C"]),
    ]


def run(chromium,out_dir):
    results={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=chromium,headless=True,args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"]); ctx=browser.new_context()
        for spec in specs(): results[spec["name"]]=physical_case(ctx,out_dir,spec)
        ctx.close(); browser.close()
    findings=[name for name,row in results.items() if row["verdict"]["classification"]!="positive-control"]
    assert findings==["body_width_context","body_transform_context"],findings
    return {"cases":results,"findings":findings,"accepted":True}


def main():
    p=argparse.ArgumentParser(); p.add_argument("--chromium",default=CHROMIUM_DEFAULT); p.add_argument("--out-dir",default=""); args=p.parse_args()
    if not args.chromium: raise SystemExit("Chromium/Chrome binary not found")
    if args.out_dir:
        out=pathlib.Path(args.out_dir); out.mkdir(parents=True,exist_ok=True); result=run(args.chromium,out)
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c05-") as tmp: result=run(args.chromium,pathlib.Path(tmp))
    print(json.dumps({"audit":"C05 geometry/layout accepted probe","result":result},ensure_ascii=False,indent=2)); return 0

if __name__=="__main__": raise SystemExit(main())
