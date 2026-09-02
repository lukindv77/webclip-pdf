#!/usr/bin/env python3
"""Fresh-restart C13 managed-Chromium / physical-PDF form-control probe.

Research-only harness. It validates the current WebClip same-origin flattened-frame
clone contract, distinguishes native Chromium clone semantics from WebClip's inert
mirror, and proves whether runtime form-control state survives into a physical PDF.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import shutil
from pathlib import Path

import fitz
from playwright.async_api import async_playwright

CHROMIUM = shutil.which("chromium") or "/usr/bin/chromium"

STYLE_PROPS = [
    "display", "float", "clear", "box-sizing",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-radius", "font-family", "font-size", "font-weight", "font-style", "line-height",
    "color", "text-align", "text-decoration-line", "text-decoration-color", "text-decoration-style",
    "text-indent", "text-transform", "white-space", "word-break", "overflow-wrap", "letter-spacing",
    "vertical-align", "list-style-type", "list-style-position", "background-color", "background-image",
    "background-repeat", "background-position", "background-size", "border-collapse", "border-spacing",
    "table-layout", "caption-side",
]

ACTIVE_HTML = [
    "script", "iframe", "frame", "object", "embed", "applet", "portal",
    "fencedframe", "audio", "video", "link", "style", "meta", "base",
]
FORM_CONTROL = ["button", "input", "select", "textarea", "fieldset", "option", "optgroup"]
IDREF = [
    "for", "form", "list", "headers", "aria-controls", "aria-owns",
    "aria-activedescendant", "aria-labelledby", "aria-describedby",
    "aria-details", "aria-errormessage",
]
ACTION = [
    "action", "formaction", "formenctype", "formmethod", "formtarget",
    "target", "download", "ping", "autofocus", "autoplay", "contenteditable",
]

COMMON_STYLE = """
<style>
@page{size:A4;margin:10mm}
body{font-family:Arial,sans-serif;font-size:18px;margin:20px;color:#111}
.row{margin:12px 0}
input[type=text],textarea,select{font:20px Arial;width:360px;min-height:40px;border:2px solid #111;padding:4px;background:white;color:black}
textarea{height:80px}
select[multiple]{height:110px}
input[type=range]{width:360px}
</style>
"""

FORM_BODY = """
<div class=row>TEXT INPUT <input data-role=text type=text value="DEFAULT_INPUT"></div>
<div class=row>TEXTAREA <textarea data-role=ta>DEFAULT_TEXTAREA</textarea></div>
<div class=row>SINGLE SELECT <select data-role=sel>
  <option value=a selected>DEFAULT_A</option><option value=b>RUNTIME_B</option>
</select></div>
<div class=row>MULTI SELECT <select data-role=multi multiple size=3>
  <option value=a selected>DEFAULT_MA</option><option value=b>RUNTIME_MB</option><option value=c>RUNTIME_MC</option>
</select></div>
<div class=row>CHECKBOX <input data-role=cb type=checkbox> checked runtime</div>
<div class=row>RADIO
  <input data-role=r1 type=radio name=rg value=a checked> default A
  <input data-role=r2 type=radio name=rg value=b> runtime B
</div>
<div class=row>RANGE <input data-role=range type=range min=0 max=100 value=10></div>
"""

MUTATE = """
() => {
  const q=r=>document.querySelector(`[data-role="${r}"]`);
  q('text').value='RUNTIME_INPUT';
  q('ta').value='RUNTIME_TEXTAREA';
  q('sel').value='b';
  const m=q('multi');
  m.options[0].selected=false; m.options[1].selected=true; m.options[2].selected=true;
  q('cb').checked=true; q('cb').indeterminate=true;
  q('r1').checked=false; q('r2').checked=true;
  q('range').value='80';
}
"""

STATE = """
() => {
  const q=r=>document.querySelector(`[data-role="${r}"]`);
  return {
    text:q('text').value,
    ta:q('ta').value,
    sel:{value:q('sel').value,index:q('sel').selectedIndex,selected:[...q('sel').options].map(o=>o.selected)},
    multi:[...q('multi').options].map(o=>o.selected),
    cb:{checked:q('cb').checked,indeterminate:q('cb').indeterminate,disabled:q('cb').disabled},
    radio:[q('r1').checked,q('r2').checked],
    range:q('range').value
  };
}
"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_text(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text("text") for page in doc)


def validate_current_source(repo_root: Path) -> dict[str, object]:
    content = (repo_root / "content.js").read_text(encoding="utf-8")
    guard = (repo_root / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")

    flatten_start = content.find("function createFlattenedBodyFramePrintProxy(frame, sourceBody) {")
    flatten_end = content.find("function removeFlattenedFramePrintProxies", flatten_start)
    assert flatten_start >= 0 and flatten_end > flatten_start
    flatten = content[flatten_start:flatten_end]
    assert "node.cloneNode(true)" in flatten
    assert "copyComputedFrameCloneStyle(sourceElements[index], target)" in flatten

    url_start = content.find("function copyFrameCloneUrlState(source, target) {")
    url_end = content.find("function copyComputedFrameCloneStyle", url_start)
    assert url_start >= 0 and url_end > url_start
    url_state = content[url_start:url_end]
    for token in ("selectedIndex", "indeterminate", ".checked", ".value"):
        assert token not in url_state, f"current URL-state helper unexpectedly materializes {token}"

    for required in (
        "const FORM_CONTROL_TAGS = new Set",
        "target = ownerDoc.createElement(localName)",
        "copySafeAttributes(source, target, neutralized)",
        "target.setAttribute('disabled', '')",
        "return cloneNodeInert(this, true)",
    ):
        assert required in guard, f"current inert guard contract changed: missing {required}"

    return {
        "content_sha256": sha256(content.encode("utf-8")),
        "guard_sha256": sha256(guard.encode("utf-8")),
        "flatten_segment_sha256": sha256(flatten.encode("utf-8")),
        "url_state_segment_sha256": sha256(url_state.encode("utf-8")),
    }


async def save_pdf(page) -> dict[str, object]:
    data = await page.pdf(print_background=True)
    return {"sha256": sha256(data), "bytes": len(data), "text": pdf_text(data)}


async def run(repo_root: Path) -> dict[str, object]:
    result: dict[str, object] = {"source_contract": validate_current_source(repo_root)}

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROMIUM, headless=True)
        result["chromium"] = browser.version

        # Positive control: ordinary top-document current control state is printable.
        top = await browser.new_page(viewport={"width": 1000, "height": 900})
        await top.set_content("<!doctype html>" + COMMON_STYLE + FORM_BODY)
        await top.evaluate(MUTATE)
        result["top_state"] = await top.evaluate(STATE)
        result["top_pdf"] = await save_pdf(top)
        await top.close()

        page = await browser.new_page(viewport={"width": 1000, "height": 900})
        await page.set_content('<style>@page{size:A4;margin:10mm}body{margin:0}</style><iframe id=f style="width:850px;height:700px;border:0"></iframe>')
        srcdoc = "<!doctype html><html><head>" + COMMON_STYLE + "</head><body>" + FORM_BODY + "</body></html>"
        await page.eval_on_selector("#f", "(f,h)=>f.srcdoc=h", srcdoc)
        await page.wait_for_timeout(250)
        frame = page.frames[-1]
        await frame.evaluate(MUTATE)
        result["frame_source_state"] = await frame.evaluate(STATE)
        result["frame_direct_pdf"] = await save_pdf(page)

        # Browser discriminator: native clone preserves several runtime fields,
        # but current runtime select selectedness falls back to content defaults.
        result["native_clone_state"] = await frame.evaluate("""
        () => {
          const clone=document.body.cloneNode(true);
          const q=r=>clone.querySelector(`[data-role="${r}"]`);
          return {
            text:q('text').value, ta:q('ta').value,
            sel:{value:q('sel').value,index:q('sel').selectedIndex,selected:[...q('sel').options].map(o=>o.selected)},
            multi:[...q('multi').options].map(o=>o.selected),
            cb:{checked:q('cb').checked,indeterminate:q('cb').indeterminate},
            radio:[q('r1').checked,q('r2').checked], range:q('range').value
          };
        }
        """)

        # Production-shaped inert mirror: exact relevant current guard semantics
        # (fresh elements + safe attributes + inert/disabled) followed by the
        # current flattened computed-style allowlist.
        result["proxy_state"] = await page.evaluate(
            """
        ({styleProps, activeList, controlList, idrefList, actionList}) => {
          const active=new Set(activeList), controls=new Set(controlList), idrefs=new Set(idrefList), actions=new Set(actionList);
          const f=document.querySelector('#f'), sourceBody=f.contentDocument.body;
          const lower=v=>String(v||'').toLowerCase();
          function attrDisp(n){
            n=lower(n); if(!n)return'strip'; if(n.startsWith('on'))return'event';
            if(n==='id'||n==='name'||n==='is')return'identity';
            if(idrefs.has(n))return'relationship'; if(actions.has(n)||n==='srcdoc')return'action'; return'keep';
          }
          function cloneInert(source,deep=false){
            const d=source.ownerDocument, nt=source.nodeType;
            if(nt===1){
              const tag=lower(source.localName||source.tagName), custom=tag.includes('-')||!!source.getAttribute?.('is');
              const neutral=active.has(tag)||custom;
              const local=neutral?(/^(script|style|link|meta|base)$/.test(tag)?'span':'div'):tag;
              const t=d.createElement(local);
              for(const a of Array.from(source.attributes||[])) if(attrDisp(a.name)==='keep') t.setAttribute(a.name,a.value);
              if(neutral)t.setAttribute('data-webclip-neutralized-tag',tag);
              t.setAttribute('inert','');
              if(controls.has(tag))t.setAttribute('disabled','');
              if(deep)for(const c of Array.from(source.childNodes||[])){
                if((tag==='script'||tag==='style')&&c.nodeType===3)continue;
                try{t.appendChild(cloneInert(c,true))}catch(e){}
              }
              return t;
            }
            if(nt===3)return d.createTextNode(String(source.data??source.nodeValue??''));
            if(nt===8)return d.createComment(String(source.data??source.nodeValue??''));
            return source.cloneNode(!!deep);
          }
          const proxy=document.createElement('section'); proxy.dataset.webclipPdfFlattenedFrame='1';
          for(const n of [...sourceBody.childNodes])proxy.appendChild(cloneInert(n,true));
          const src=[sourceBody,...sourceBody.querySelectorAll('*')], dst=[proxy,...proxy.querySelectorAll('*')];
          const lim=Math.min(src.length,dst.length,2500);
          for(let i=0;i<lim;i++){
            const s=src[i],t=dst[i]; if(!t.style)continue; const cs=s.ownerDocument.defaultView.getComputedStyle(s);
            for(const prop of styleProps){const v=cs.getPropertyValue(prop); if(v)t.style.setProperty(prop,v,'important');}
          }
          document.body.appendChild(proxy); f.style.display='none';
          const q=r=>proxy.querySelector(`[data-role="${r}"]`);
          return {
            text:q('text').value, ta:q('ta').value,
            sel:{value:q('sel').value,index:q('sel').selectedIndex,selected:[...q('sel').options].map(o=>o.selected)},
            multi:[...q('multi').options].map(o=>o.selected),
            cb:{checked:q('cb').checked,indeterminate:q('cb').indeterminate,disabled:q('cb').disabled},
            radio:[q('r1').checked,q('r2').checked], range:q('range').value
          };
        }
            """,
            {
                "styleProps": STYLE_PROPS,
                "activeList": ACTIVE_HTML,
                "controlList": FORM_CONTROL,
                "idrefList": IDREF,
                "actionList": ACTION,
            },
        )
        result["proxy_pdf"] = await save_pdf(page)

        # Causal control: materialize only visible form state onto the already
        # inert/disabled final representation. No control is re-enabled.
        result["causal_state"] = await page.evaluate("""
        () => {
          const sdoc=document.querySelector('#f').contentDocument;
          const proxy=document.querySelector('section[data-webclip-pdf-flattened-frame]');
          const sq=r=>sdoc.querySelector(`[data-role="${r}"]`), tq=r=>proxy.querySelector(`[data-role="${r}"]`);
          tq('text').value=sq('text').value; tq('ta').value=sq('ta').value;
          [...tq('sel').options].forEach((o,i)=>o.selected=sq('sel').options[i].selected);
          [...tq('multi').options].forEach((o,i)=>o.selected=sq('multi').options[i].selected);
          tq('cb').checked=sq('cb').checked; tq('cb').indeterminate=sq('cb').indeterminate;
          tq('r1').checked=sq('r1').checked; tq('r2').checked=sq('r2').checked;
          tq('range').value=sq('range').value;
          return {
            text:tq('text').value, ta:tq('ta').value,
            sel:{value:tq('sel').value,index:tq('sel').selectedIndex,selected:[...tq('sel').options].map(o=>o.selected)},
            multi:[...tq('multi').options].map(o=>o.selected),
            cb:{checked:tq('cb').checked,indeterminate:tq('cb').indeterminate,disabled:tq('cb').disabled},
            radio:[tq('r1').checked,tq('r2').checked], range:tq('range').value
          };
        }
        """)
        result["causal_pdf"] = await save_pdf(page)
        await page.close()
        await browser.close()

    assert result["top_state"]["text"] == "RUNTIME_INPUT"
    assert "RUNTIME_INPUT" in result["top_pdf"]["text"] and "RUNTIME_B" in result["top_pdf"]["text"]
    assert "RUNTIME_INPUT" in result["frame_direct_pdf"]["text"] and "RUNTIME_B" in result["frame_direct_pdf"]["text"]
    assert result["native_clone_state"]["text"] == "RUNTIME_INPUT"
    assert result["native_clone_state"]["ta"] == "RUNTIME_TEXTAREA"
    assert result["native_clone_state"]["cb"] == {"checked": True, "indeterminate": True}
    assert result["native_clone_state"]["radio"] == [False, True]
    assert result["native_clone_state"]["range"] == "80"
    assert result["native_clone_state"]["sel"]["value"] == "a"

    assert result["proxy_state"]["text"] == "DEFAULT_INPUT"
    assert result["proxy_state"]["ta"] == "DEFAULT_TEXTAREA"
    assert result["proxy_state"]["sel"]["value"] == "a"
    assert result["proxy_state"]["multi"] == [True, False, False]
    assert result["proxy_state"]["cb"] == {"checked": False, "indeterminate": False, "disabled": True}
    assert result["proxy_state"]["radio"] == [True, False]
    assert result["proxy_state"]["range"] == "10"
    assert "DEFAULT_INPUT" in result["proxy_pdf"]["text"] and "RUNTIME_INPUT" not in result["proxy_pdf"]["text"]
    assert "DEFAULT_A" in result["proxy_pdf"]["text"] and "RUNTIME_B" not in result["proxy_pdf"]["text"]

    assert result["causal_state"]["text"] == "RUNTIME_INPUT"
    assert result["causal_state"]["sel"]["value"] == "b"
    assert result["causal_state"]["cb"]["disabled"] is True
    assert "RUNTIME_INPUT" in result["causal_pdf"]["text"] and "RUNTIME_B" in result["causal_pdf"]["text"]
    return result


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    result = asyncio.run(run(repo_root))
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
    print(encoded.decode("utf-8"))
    print("RESULT_SHA256", sha256(encoded))
