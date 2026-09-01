#!/usr/bin/env python3
"""Fresh-restart C01 physical probe for live selection vs durable SelectionSnapshot cap.

Temporary managed-Chromium evidence harness. It executes the repository's actual
content.js, selects 251 independent live regions through WebClip's real selection
listener, enters the real download preparation path, physically prints the prepared
representation, and compares live/physical scope to the emitted durable snapshot.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

CHROME_MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c01={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c01.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c01Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c01ResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'c01.pdf'});
    return true;
  };
})();
"""


def pdf_text(path: pathlib.Path) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__c01Command(payload)", payload)


def run(chromium: str, out_dir: pathlib.Path) -> dict:
    items = "".join(
        f"<section class='pick' id='pick-{index:03d}'>C01_ITEM_{index:03d}</section>"
        for index in range(251)
    )
    html = f"""<!doctype html><meta charset='utf-8'>
    <style>
      html,body{{margin:0;padding:0}} body{{font-family:Arial,sans-serif;padding:12px}}
      .pick{{display:block;box-sizing:border-box;width:620px;height:12px;margin:2px 0;font-size:8px;line-height:10px;border:1px solid #ddd}}
    </style>{items}"""

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=chromium,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1000, "height": 800})
        page.set_content(html, wait_until="load")
        page.evaluate(CHROME_MOCK)
        page.add_script_tag(content=CONTENT)

        started = command(page, {"type": "WEBCLIP_COMMAND", "command": "start"})
        assert started.get("ok") is True, started
        clicked = page.evaluate(
            """() => {
              let count=0;
              for(const el of document.querySelectorAll('.pick')){
                const event=new MouseEvent('click',{bubbles:true,cancelable:true,view:window});
                el.dispatchEvent(event); count+=1;
              }
              return count;
            }"""
        )
        assert clicked == 251, clicked
        live_before = page.locator("[data-webclip-pdf-include]").count()
        assert live_before == 251, live_before

        opened = command(page, {"type": "WEBCLIP_COMMAND", "command": "download"})
        assert opened.get("ok") is True, opened
        modal_clicked = page.evaluate(
            """() => {
              const shadow=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
              const button=[...(shadow?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');
              if(!button) return false; button.click(); return true;
            }"""
        )
        assert modal_clicked is True
        page.wait_for_function("()=>!!globalThis.__c01.lastPdfRequest", timeout=20000)
        request = page.evaluate("()=>globalThis.__c01.lastPdfRequest")
        snapshot = request.get("meta", {}).get("selectionSnapshot") or {}
        analysis = request.get("meta", {}).get("pageAnalysis") or {}
        snapshot_count = len(snapshot.get("includes") or [])
        analysis_count = int(((analysis.get("selection") or {}).get("includeCount") or 0))

        assert snapshot_count == 250, snapshot_count
        assert analysis_count == 251, analysis_count
        assert page.locator("[data-webclip-pdf-include]").count() == 251

        pdf_path = out_dir / "c01_251_live_vs_snapshot.pdf"
        page.pdf(path=str(pdf_path), format="A4", print_background=True)
        text = pdf_text(pdf_path)
        assert "C01_ITEM_000" in text
        assert "C01_ITEM_250" in text

        resolved = page.evaluate("()=>__c01ResolvePdf()")
        assert resolved is True
        result = {
            "ok": True,
            "liveIncludeCount": live_before,
            "pageAnalysisIncludeCount": analysis_count,
            "selectionSnapshotIncludeCount": snapshot_count,
            "firstPhysicalMarker": "C01_ITEM_000" in text,
            "lastPhysicalMarker": "C01_ITEM_250" in text,
            "pdfBytes": pdf_path.stat().st_size,
            "pdfSha256": hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
            "verdict": "PHYSICAL / FINDING",
            "owner": "P1-154",
        }
        browser.close()
        return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chromium", default=CHROMIUM_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chromium or not pathlib.Path(args.chromium).exists():
        raise SystemExit("Chromium executable not found; use --chromium PATH")
    if args.out:
        out_dir = pathlib.Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        result = run(args.chromium, out_dir)
        (out_dir / "c01-result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        with tempfile.TemporaryDirectory(prefix="webclip-c01-") as tmp:
            result = run(args.chromium, pathlib.Path(tmp))
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
