#!/usr/bin/env python3
"""Cycle-2 T4 / PD4 physical probe for scoped custom-element registries.

The probe loads the repository's actual content.js and exercises current WebClip
selection restore, Main Content, top-level Shadow DOM, and same-origin frame
flattening on Chrome 146+ scoped CustomElementRegistry semantics.

All fixtures are synthetic/local. Physical claims use actual PDF bytes/text and
96-dpi raster color receipts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
from typing import Any

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")

CHROME_MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__t4={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__t4.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__t4Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__t4ResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'t4.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = r"""
<style>
html,body{margin:0;padding:0;background:white;color:#111}
body{font-family:Arial,sans-serif;padding:24px}
.box{box-sizing:border-box;width:680px;min-height:90px;margin:12px 0;padding:12px;border:2px solid #222}
.shell{width:680px;padding:10px;margin:10px 0;border:1px solid #999}
</style>
"""

REGISTRY_HELPERS = r"""
() => {
  globalThis.__registrySupport = {
    constructible: typeof CustomElementRegistry === 'function',
    shadowOption: false,
    individualOption: false,
    initialize: typeof CustomElementRegistry === 'function' && typeof CustomElementRegistry.prototype.initialize === 'function'
  };
  const probeReg = new CustomElementRegistry();
  const probeHost = document.createElement('div');
  document.body.append(probeHost);
  try {
    const sr = probeHost.attachShadow({mode:'open', customElementRegistry:probeReg});
    globalThis.__registrySupport.shadowOption = !!sr;
  } catch (_) {}
  probeHost.remove();
  try {
    const el = document.createElement('x-registry-probe', {customElementRegistry:probeReg});
    globalThis.__registrySupport.individualOption = !!el;
  } catch (_) {}

  globalThis.__makeRegistry = (label, color, visibleText='SCOPED_CARD_TEXT') => {
    const registry = new CustomElementRegistry();
    registry.define('audit-card', class extends HTMLElement {
      connectedCallback(){
        if(this.shadowRoot) return;
        const s=this.attachShadow({mode:'open'});
        s.innerHTML=`<style>:host{display:block}.visual{display:block;box-sizing:border-box;width:520px;height:120px;padding:24px;background:${color};color:white;font:700 24px Arial,sans-serif;border:4px solid black}</style><div class="visual">${visibleText}</div>`;
      }
    });
    registry.__auditLabel=label;
    return registry;
  };

  globalThis.__makeIndividualCard = (registry, before=null) => {
    const el=document.createElement('audit-card',{customElementRegistry:registry});
    el.className='box scoped-card';
    el.setAttribute('role','article');
    el.setAttribute('aria-label','Scoped article');
    el.setAttribute('title','Scoped title');
    el.append(document.createTextNode('LOCATOR_SAME_MARKER'));
    if(before) document.body.insertBefore(el,before); else document.body.append(el);
    return el;
  };
}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--chrome', required=True)
    parser.add_argument('--out', type=pathlib.Path, required=True)
    return parser.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_text(pdf: bytes) -> str:
    doc = fitz.open(stream=pdf, filetype='pdf')
    return '\n'.join(page.get_text() for page in doc)


def render_pdf(pdf: bytes, path: pathlib.Path) -> None:
    doc = fitz.open(stream=pdf, filetype='pdf')
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(96/72, 96/72), alpha=False)
    pix.save(str(path))


def color_counts(path: pathlib.Path) -> dict[str, int]:
    image = Image.open(path).convert('RGB')
    red=blue=green=0
    for r,g,b in image.getdata():
        if r > 180 and g < 90 and b < 90: red += 1
        if b > 180 and r < 90 and g < 90: blue += 1
        if g > 140 and r < 100 and b < 100: green += 1
    return {'red': red, 'blue': blue, 'green': green}


def load_content(page, html: str = '') -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until='load')
    page.evaluate(REGISTRY_HELPERS)
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def command(page, payload: dict[str, Any]) -> dict[str, Any]:
    return page.evaluate('(payload)=>__t4Command(payload)', payload)


def start(page) -> None:
    result=command(page, {'type':'WEBCLIP_COMMAND','command':'start'})
    assert result.get('ok') is True, result


def click_selector(page, selector: str) -> None:
    result=page.evaluate("(s)=>document.querySelector(s).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}))", selector)
    assert result is False, (selector,result)


def click_frame_selector(page, frame_selector: str, target_selector: str) -> None:
    result=page.evaluate("""([fsel,tsel])=>{const f=document.querySelector(fsel),d=f.contentDocument,t=d.querySelector(tsel);return t.dispatchEvent(new f.contentWindow.MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:f.contentWindow}))}""", [frame_selector,target_selector])
    assert result is False, result


def modal_click(page, label: str='Сформировать PDF') -> None:
    clicked=page.evaluate("""(label)=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);if(!b)return false;b.click();return true;}""",label)
    assert clicked, label


def wait_prepared(page) -> dict[str, Any]:
    page.wait_for_function('()=>!!globalThis.__t4.lastPdfRequest', timeout=20000)
    return page.evaluate('()=>globalThis.__t4.lastPdfRequest')


def resolve_pdf(page) -> None:
    assert page.evaluate('()=>__t4ResolvePdf()') is True
    page.wait_for_timeout(60)


def physical_save(page, out: pathlib.Path, name: str) -> dict[str, Any]:
    result=command(page, {'type':'WEBCLIP_COMMAND','command':'download'})
    assert result.get('ok') is True, result
    modal_click(page)
    request=wait_prepared(page)
    pdf=page.pdf(format='A4', print_background=True)
    pdf_path=out/f'{name}.pdf'; pdf_path.write_bytes(pdf)
    png_path=out/f'{name}-page1.png'; render_pdf(pdf,png_path)
    text=pdf_text(pdf)
    artifact={
      'bytes':len(pdf), 'sha256':sha256(pdf), 'text':text,
      'rasterSha256':sha256(png_path.read_bytes()), 'colors':color_counts(png_path),
      'selectionSnapshot':request.get('meta',{}).get('selectionSnapshot'),
      'flattenedDiagnostics':request.get('meta',{}).get('pageDiagnostics',{}).get('flattenedFrames') if isinstance(request.get('meta'),dict) else None,
    }
    resolve_pdf(page)
    return artifact


def selected_top(page) -> list[dict[str, Any]]:
    return page.evaluate("""()=>[...document.querySelectorAll('[data-webclip-pdf-include]')].map((e,i)=>({i,tag:e.localName,id:e.id||'',text:e.textContent||'',shadowText:e.shadowRoot?.innerText||''}))""")


def capture_individual_snapshot(ctx, out: pathlib.Path) -> dict[str, Any]:
    page=ctx.new_page(viewport={'width':1100,'height':800})
    load_content(page)
    page.evaluate("""()=>{const a=__makeRegistry('A','rgb(220,0,0)');globalThis.__a=a;__makeIndividualCard(a)}""")
    start(page); click_selector(page,'audit-card')
    artifact=physical_save(page,out,'snapshot_source_registry_a')
    snap=artifact['selectionSnapshot']
    assert snap and len(snap.get('includes',[]))==1, snap
    assert artifact['colors']['red'] > artifact['colors']['blue']*5 + 1000, artifact['colors']
    page.close()
    return snap


def run(args: argparse.Namespace) -> dict[str, Any]:
    args.out.mkdir(parents=True,exist_ok=True)
    results: dict[str,Any]={}
    strong=('Deep composed article content with enough meaningful readable words to dominate main content discovery when the rendered composed tree is respected. '*12)
    decoy=('Light DOM article candidate with ordinary readable words for deterministic automatic selection. '*9)

    with sync_playwright() as pw:
      browser=pw.chromium.launch(executable_path=args.chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
      results['browserVersion']=browser.version
      ctx=browser.new_context()

      # Feature support + two independent registries for the same local name.
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p)
      support=p.evaluate('()=>__registrySupport')
      pair=p.evaluate("""()=>{const a=__makeRegistry('A','rgb(220,0,0)'),b=__makeRegistry('B','rgb(0,0,220)');const ea=__makeIndividualCard(a),eb=__makeIndividualCard(b);return {support:__registrySupport,aText:ea.innerText,aLight:ea.textContent,aShadow:ea.shadowRoot?.innerText||'',bText:eb.innerText,bLight:eb.textContent,bShadow:eb.shadowRoot?.innerText||'',sameTag:ea.localName===eb.localName}}""")
      assert support['constructible'] and support['shadowOption'] and support['individualOption'], support
      assert pair['sameTag'] is True
      results['featureSupport']=pair
      p.close()

      # C18 positive: selecting a top-level host whose shadow uses a scoped registry preserves rendered output.
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p,"<div id='top-host' class='box'></div><div class='shell'>TOP_UNSELECTED_SHELL</div>")
      p.evaluate("""()=>{const r=__makeRegistry('A','rgb(220,0,0)','TOP_SCOPED_RENDER');const h=document.querySelector('#top-host');const s=h.attachShadow({mode:'open',customElementRegistry:r});s.innerHTML='<audit-card></audit-card>'}""")
      start(p); click_selector(p,'#top-host'); art=physical_save(p,args.out,'top_shadow_scoped_positive')
      assert 'TOP_SCOPED_RENDER' in art['text'], art['text']
      assert 'TOP_UNSELECTED_SHELL' not in art['text'], art['text']
      assert art['colors']['red'] > art['colors']['blue']*5 + 1000, art['colors']
      results['topShadowPositive']={'selected':selected_top(p),'colors':art['colors'],'sha256':art['sha256'],'rasterSha256':art['rasterSha256']}
      p.close()

      # C02 finding: snapshot has no scoped-registry identity. Restore follows the same structural/tag slot now occupied by registry B.
      snap=capture_individual_snapshot(ctx,args.out)
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p)
      p.evaluate("""()=>{const b=__makeRegistry('B','rgb(0,0,220)'),a=__makeRegistry('A','rgb(220,0,0)');__makeIndividualCard(b);__makeIndividualCard(a)}""")
      before=p.evaluate("""()=>[...document.querySelectorAll('audit-card')].map((e,i)=>({i,light:e.textContent,inner:e.innerText,shadow:e.shadowRoot?.innerText||''}))""")
      restore=command(p,{'type':'WEBCLIP_APPLY_SELECTION_SNAPSHOT','snapshot':snap})
      assert restore.get('ok') is True, restore
      chosen=selected_top(p)
      art=physical_save(p,args.out,'selection_registry_identity_swap')
      assert restore.get('restoredIncludes')==1, restore
      assert len(chosen)==1 and chosen[0]['i']==0, chosen
      assert art['colors']['blue'] > art['colors']['red']*5 + 1000, art['colors']
      results['selectionRegistrySwap']={'restore':restore,'candidates':before,'chosen':chosen,'colors':art['colors'],'sha256':art['sha256'],'rasterSha256':art['rasterSha256']}
      p.close()

      # C03 finding: a strong semantic article produced inside a scoped ShadowRoot is not in ownerDoc querySelectorAll discovery.
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p,"<div id='xroot' class='box'></div><article id='light-decoy' class='box'><p>"+decoy+"</p><p>LIGHT_DECOY_MARKER</p></article>")
      p.evaluate("""(strong)=>{const r=new CustomElementRegistry();r.define('audit-main',class extends HTMLElement{connectedCallback(){if(this.childNodes.length)return;this.innerHTML=`<article role="main" style="display:block;width:650px;padding:20px;background:rgb(0,150,0);color:white"><h1>Scoped main</h1><p>${strong}</p><p>SCOPED_SHADOW_MAIN_MARKER</p></article>`}});const h=document.querySelector('#xroot');const s=h.attachShadow({mode:'open',customElementRegistry:r});s.innerHTML='<audit-main></audit-main>'}""",strong)
      composed=p.evaluate("""()=>({shadowText:document.querySelector('#xroot').shadowRoot.innerText,shadowArticle:!!document.querySelector('#xroot').shadowRoot.querySelector('audit-main article'),docSeesShadowArticle:!!document.querySelector('article[role=main]')})""")
      start(p); auto=command(p,{'type':'WEBCLIP_COMMAND','command':'auto-content'}); assert auto.get('ok') is True,auto
      chosen=selected_top(p); art=physical_save(p,args.out,'main_content_scoped_shadow')
      assert len(chosen)==1 and chosen[0]['id']=='light-decoy', chosen
      assert 'LIGHT_DECOY_MARKER' in art['text'] and 'SCOPED_SHADOW_MAIN_MARKER' not in art['text'], art['text']
      results['mainContentShadowBlind']={'composed':composed,'chosen':chosen,'colors':art['colors'],'sha256':art['sha256']}
      p.close()

      # C16 positive control: ordinary selected same-origin frame DOM survives current flattening.
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p,"<div class='shell'>TOP_FRAME_SHELL</div><iframe id='plain-frame' style='width:760px;height:280px'></iframe>")
      p.locator('#plain-frame').evaluate("(el)=>{el.srcdoc='<!doctype html><style>body{margin:0}.plain{width:600px;height:120px;background:rgb(0,150,0);color:white;font:24px Arial}</style><article id="+json.dumps('plain-target')+" class="+json.dumps('plain')+">PLAIN_FRAME_POSITIVE</article>'}")
      p.wait_for_function("()=>document.querySelector('#plain-frame')?.contentDocument?.readyState==='complete'")
      # start again after frame load so listeners cover child document
      start(p); click_frame_selector(p,'#plain-frame','#plain-target'); art=physical_save(p,args.out,'same_origin_plain_frame_positive')
      assert 'PLAIN_FRAME_POSITIVE' in art['text'] and 'TOP_FRAME_SHELL' not in art['text'], art['text']
      results['plainFramePositive']={'colors':art['colors'],'sha256':art['sha256'],'rasterSha256':art['rasterSha256']}
      p.close()

      # C16/C18 finding: scoped-registry Shadow rendering in a same-origin frame is lost by inert body clone flattening.
      frame_html="""<!doctype html><meta charset='utf-8'><style>body{margin:0}#frame-host{display:block;width:620px;height:150px}</style><div id='frame-host'></div><script>const r=new CustomElementRegistry();r.define('audit-card',class extends HTMLElement{connectedCallback(){this.innerHTML='<div style=\"display:block;width:520px;height:120px;padding:20px;box-sizing:border-box;background:rgb(220,0,0);color:white;font:24px Arial\">FRAME_SCOPED_REGISTRY_RENDER</div>'}});const h=document.querySelector('#frame-host');const s=h.attachShadow({mode:'open',customElementRegistry:r});s.innerHTML='<audit-card></audit-card>';<\/script>"""
      p=ctx.new_page(viewport={'width':1100,'height':800}); load_content(p,"<div class='shell'>TOP_SCOPED_FRAME_SHELL</div><iframe id='scoped-frame' style='width:760px;height:280px'></iframe>")
      p.locator('#scoped-frame').evaluate('(el,html)=>{el.srcdoc=html}',frame_html)
      p.wait_for_function("()=>document.querySelector('#scoped-frame')?.contentDocument?.readyState==='complete'")
      frame_before=p.evaluate("""()=>{const f=document.querySelector('#scoped-frame'),h=f.contentDocument.querySelector('#frame-host');return {shadowText:h.shadowRoot?.innerText||'',hasScoped:!!h.shadowRoot?.querySelector('audit-card'),bodyText:f.contentDocument.body.innerText}}""")
      assert 'FRAME_SCOPED_REGISTRY_RENDER' in frame_before['shadowText'], frame_before
      start(p); click_frame_selector(p,'#scoped-frame','#frame-host'); art=physical_save(p,args.out,'same_origin_scoped_registry_frame')
      assert 'TOP_SCOPED_FRAME_SHELL' not in art['text'], art['text']
      scoped_present='FRAME_SCOPED_REGISTRY_RENDER' in art['text']
      results['scopedFrameFlatten']={'before':frame_before,'pdfContainsScopedRender':scoped_present,'colors':art['colors'],'sha256':art['sha256'],'rasterSha256':art['rasterSha256'],'flattenedDiagnostics':art['flattenedDiagnostics']}
      # This is the expected current finding: cloneNode/body flattening has no shadow root/registry association.
      assert scoped_present is False, art['text']
      p.close()

      browser.close()

    return results


def main() -> int:
    args=parse_args()
    results=run(args)
    out=args.out/'results.json'; out.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=False,indent=2))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
