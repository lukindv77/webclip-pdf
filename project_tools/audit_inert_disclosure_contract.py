#!/usr/bin/env python3
"""Managed-Chromium L3/L4 probe for C24 inert disclosure expansion.

Safe deterministic local fixtures only. Models the exact relevant current content.js
disclosure decision/activation shape and verifies physical PDF consequences.
"""
from __future__ import annotations
import argparse, asyncio, hashlib, json, shutil, tempfile, time
from pathlib import Path
from playwright.async_api import async_playwright
from pypdf import PdfReader

MODEL_JS = r'''
(() => {
  const EXCLUDE_ATTR = 'data-webclip-pdf-exclude';
  const includes = [];
  const excludes = [];
  function logicalContains(a,b){try{return a===b||a.contains(b)}catch(_){return false}}
  function findContainingInclude(el,allowSelf=false){for(const include of includes){if((allowSelf&&include===el)||logicalContains(include,el))return include}return null}
  function isInsideExcludedArea(el){for(const ex of excludes){if(ex===el||logicalContains(ex,el))return true}return false}
  function isWithinIncludedArea(el){return Boolean(findContainingInclude(el,true))}
  function collectIncludedElements(selector){const result=new Set();for(const include of includes){if(include.matches?.(selector)&&!isInsideExcludedArea(include))result.add(include);include.querySelectorAll?.(selector).forEach(el=>{if(!isInsideExcludedArea(el))result.add(el)})}return result}
  function safeQuerySelector(selector,ownerDoc=document){if(!selector||typeof selector!=='string')return null;try{return ownerDoc.querySelector(selector)}catch(_){return null}}
  function isPanelVisible(panel){if(!panel?.isConnected||panel.hidden||panel.getAttribute?.('aria-hidden')==='true')return false;const style=(panel.ownerDocument?.defaultView||window).getComputedStyle(panel);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;if(Number.parseFloat(style.opacity||'1')===0)return false;const rect=panel.getBoundingClientRect();return rect.width>0&&rect.height>0}
  function looksLikeDisclosureControl(control){const marker=`${control.id||''} ${control.className||''} ${control.getAttribute?.('role')||''}`;return /(^|[\\s_-])(sp-head|spoiler|collapse|accordion|collapsible|toggle|expand|fold|clickable)(?=$|[\\s_-])/i.test(marker)||control.hasAttribute?.('aria-expanded')||control.hasAttribute?.('aria-controls')||control.hasAttribute?.('data-bs-toggle')||control.hasAttribute?.('data-toggle')}
  function looksLikeDisclosurePanel(panel,control){const marker=`${panel.id||''} ${panel.className||''} ${control.className||''}`;if(/(sp-body|spoiler|collapse|accordion|collapsible|fold|expand)/i.test(marker))return true;return !isPanelVisible(panel)&&looksLikeDisclosureControl(control)}
  function resolveControlledPanel(control){const idList=control.getAttribute?.('aria-controls');if(idList){for(const id of idList.split(/\\s+/).filter(Boolean)){const panel=(control.ownerDocument||document).getElementById(id);if(panel&&isWithinIncludedArea(panel))return panel}}for(const attr of ['data-bs-target','data-target','data-spoiler-target']){const selector=control.getAttribute?.(attr);const panel=safeQuerySelector(selector,control.ownerDocument||document);if(panel&&isWithinIncludedArea(panel))return panel}const href=control.getAttribute?.('href');if(href&&/^#[A-Za-z][\\w:.-]*$/.test(href)){const panel=safeQuerySelector(href,control.ownerDocument||document);if(panel&&isWithinIncludedArea(panel))return panel}const next=control.nextElementSibling;if(next&&isWithinIncludedArea(next)&&looksLikeDisclosurePanel(next,control))return next;const container=control.closest?.('.sp-wrap, .spoiler, .spoiler-wrap, .spoiler-container, .accordion-item, .collapse-wrap, .collapsible');if(container&&isWithinIncludedArea(container)){const panel=container.querySelector?.('.sp-body, .spoiler-body, .spoiler-content, .spoiler__body, .spoiler__content, .accordion-collapse, .accordion-body, .collapse, [role="region"]');if(panel&&panel!==control&&!control.contains(panel))return panel}return null}
  function isLikelyCollapsed(control,panel){const expanded=control.getAttribute?.('aria-expanded');if(expanded==='false')return true;const marker=`${control.className||''} ${panel.className||''}`;if(/(^|[\\s_-])(collapsed|closed|folded|is-collapsed|is-closed)(?=$|[\\s_-])/i.test(marker))return true;return !isPanelVisible(panel)}
  function isSafeDisclosureControl(control,panel){if(!control||!panel||control===panel||control.contains(panel))return false;const tag=control.tagName;if(tag==='A'){const href=control.getAttribute('href')||'';const semanticToggle=control.hasAttribute('aria-controls')||control.hasAttribute('aria-expanded')||control.hasAttribute('data-bs-toggle')||control.hasAttribute('data-toggle')||looksLikeDisclosureControl(control);if(href&&!href.startsWith('#')&&!semanticToggle)return false}if(tag==='BUTTON'&&(control.getAttribute('type')||'').toLowerCase()==='submit'){const semanticToggle=control.hasAttribute('aria-controls')||control.hasAttribute('aria-expanded')||control.hasAttribute('data-bs-toggle')||control.hasAttribute('data-toggle');if(!semanticToggle)return false}return looksLikeDisclosureControl(control)}
  function triggerInternalClick(control){try{window.__internalInteraction=true;control.click();return true}catch(_){return false}finally{window.__internalInteraction=false}}
  function fallbackDisplay(element){const tag=element.tagName;if(tag==='TR')return'table-row';if(tag==='TBODY'||tag==='THEAD'||tag==='TFOOT')return'table-row-group';if(tag==='TD'||tag==='TH')return'table-cell';if(tag==='LI')return'list-item';if(tag==='SPAN'||tag==='A')return'inline';return'block'}
  function forcePanelVisible(panel,control){try{panel.hidden=false;panel.setAttribute('aria-hidden','false');panel.style.setProperty('display',fallbackDisplay(panel),'important');panel.style.setProperty('visibility','visible','important');panel.style.setProperty('opacity','1','important');panel.style.setProperty('max-height','none','important');panel.style.setProperty('height','auto','important');panel.style.setProperty('overflow','visible','important');control.setAttribute?.('aria-expanded','true')}catch(_){}}
  function findDisclosureContainer(control,panel){const common=control.closest?.('.sp-wrap, .spoiler, .spoiler-wrap, .spoiler-container, .accordion-item, .collapse-wrap, .collapsible');if(common&&common.contains(panel))return common;return null}
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function collectDisclosureControls(){const selector=['[aria-expanded="false"]','[aria-controls]','[data-bs-toggle="collapse"]','[data-toggle="collapse"]','[data-toggle="spoiler"]','[data-spoiler-toggle]','.sp-head','.spoiler-head','.spoiler-title','.spoiler-toggle','.spoiler__head','.spoiler__header','.spoiler__title','.accordion-button','.accordion-header button','.collapse-toggle','.collapsible-header'].join(',');const result=new Set();for(const include of includes){if(include.matches?.(selector)&&!isInsideExcludedArea(include))result.add(include);include.querySelectorAll?.(selector).forEach(el=>{if(!isInsideExcludedArea(el))result.add(el)})}return[...result]}
  async function expandSpoilersInIncludedContent(){const snapshotted=new Set();const attemptedControls=new Set();for(const details of collectIncludedElements('details')){if(!details.isConnected||isInsideExcludedArea(details)||details.open)continue;snapshotted.add(details);details.open=true}for(let pass=0;pass<3;pass+=1){const candidates=collectDisclosureControls();let changed=false;for(const control of candidates){if(!control?.isConnected||attemptedControls.has(control)||isInsideExcludedArea(control))continue;const panel=resolveControlledPanel(control);if(!panel||!panel.isConnected||isInsideExcludedArea(panel))continue;if(!isLikelyCollapsed(control,panel)){attemptedControls.add(control);continue}if(!isSafeDisclosureControl(control,panel)){attemptedControls.add(control);continue}attemptedControls.add(control);const related=[control,panel,findDisclosureContainer(control,panel)].filter(Boolean);related.forEach(el=>snapshotted.add(el));const clicked=triggerInternalClick(control);if(clicked)await delay(40);if(!isPanelVisible(panel))forcePanelVisible(panel,control);if(isPanelVisible(panel))changed=true}if(!changed)break;await delay(100)}await delay(180);return {snapshottedCount:snapshotted.size,attemptedCount:attemptedControls.size}}
  window.webclipModel={includes,excludes,expandSpoilersInIncludedContent};
})();
'''

FIXTURE = r'''<!doctype html><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}.hidden{display:none}.panel{border:1px solid #888;padding:6px;margin:4px}iframe{width:700px;height:300px}</style>
<main id="scope">
 <details id="nativeClosed"><summary>Native closed</summary><p>NATIVE_CLOSED_CONTENT</p><p id="excluded">EXCLUDED_DETAIL_CONTENT</p><details id="nested"><summary>Nested</summary><p>NESTED_CONTENT_ONCE</p></details></details>
 <details id="nativeOpen" open><summary>Native open</summary><p>NATIVE_ALREADY_OPEN</p></details>
 <button id="aria" aria-expanded="false" aria-controls="ariaPanel">ARIA</button><div id="ariaPanel" hidden class="panel">ARIA_EXISTING_PANEL</div>
 <button id="stateful" aria-expanded="false" aria-controls="statefulPanel">Stateful</button><div id="statefulPanel" hidden class="panel">STATEFUL_OLD</div>
 <form id="form"><button id="submitCtrl" type="submit" aria-expanded="false" aria-controls="submitPanel">Submit disclosure</button><div id="submitPanel" hidden class="panel">SUBMIT_PANEL</div></form>
 <a id="anchorCtrl" href="/navigation-side-effect" aria-expanded="false" aria-controls="anchorPanel">Anchor disclosure</a><div id="anchorPanel" hidden class="panel">ANCHOR_PANEL</div>
</main>
<section id="outside"><button id="outsideCtrl" aria-expanded="false" aria-controls="outsidePanel">Outside</button><div id="outsidePanel" hidden>OUTSIDE_PANEL</div></section>
<script>
window.audit={clicks:[],submits:0,toggles:[],mutations:[],statefulCreated:0,nativeToggleCreated:0};
document.addEventListener('click',e=>{if(['aria','stateful','submitCtrl','anchorCtrl','outsideCtrl'].includes(e.target.id)){audit.clicks.push(e.target.id);if(e.target.id==='anchorCtrl')e.preventDefault()}},true);
document.querySelector('#form').addEventListener('submit',e=>{audit.submits++;e.preventDefault()});
for(const d of document.querySelectorAll('details'))d.addEventListener('toggle',()=>audit.toggles.push(d.id));
document.querySelector('#nativeClosed').addEventListener('toggle',()=>{if(document.querySelector('#nativeClosed').open&&!document.querySelector('#nativeToggleCreated')){const x=document.createElement('p');x.id='nativeToggleCreated';x.textContent='NATIVE_TOGGLE_CREATED_CONTENT';document.querySelector('#nativeClosed').appendChild(x);audit.nativeToggleCreated++}});
document.querySelector('#stateful').addEventListener('click',()=>{const p=document.querySelector('#statefulPanel');p.hidden=false;document.querySelector('#stateful').setAttribute('aria-expanded','true');if(!document.querySelector('#created')){const x=document.createElement('div');x.id='created';x.textContent='STATEFUL_CREATED_BY_SYNTHETIC_CLICK';p.appendChild(x);audit.statefulCreated++}});
new MutationObserver(ms=>{audit.mutations.push(...ms.map(m=>({type:m.type,target:m.target.id||m.target.tagName,attr:m.attributeName||''})));}).observe(document.querySelector('#scope'),{subtree:true,attributes:true,childList:true});
window.auditState=()=>({audit:JSON.parse(JSON.stringify(audit)),closedOpen:document.querySelector('#nativeClosed').open,nestedOpen:document.querySelector('#nested').open,openOpen:document.querySelector('#nativeOpen').open,ariaExpanded:document.querySelector('#aria').getAttribute('aria-expanded'),statefulExpanded:document.querySelector('#stateful').getAttribute('aria-expanded'),submitExpanded:document.querySelector('#submitCtrl').getAttribute('aria-expanded'),anchorExpanded:document.querySelector('#anchorCtrl').getAttribute('aria-expanded'),outsideExpanded:document.querySelector('#outsideCtrl').getAttribute('aria-expanded'),created:!!document.querySelector('#created')});
</script>'''

FRAME_CHILD = r'''<!doctype html><meta charset="utf-8"><body style="font-family:Arial"><details id="fd"><summary>Frame closed</summary><p>SAME_ORIGIN_FRAME_DETAILS_CONTENT</p></details><script>window.frameState=()=>({open:document.querySelector('#fd').open})</script>'''

CROSS_CHILD = r'''<!doctype html><meta charset="utf-8"><body style="font-family:Arial"><h2>CROSS_FRAME_SUMMARY</h2><details><summary>Cross closed</summary><p>CROSS_ORIGIN_CLOSED_DETAILS_CONTENT</p></details></body>'''
def pdf_text(path): return '\n'.join((p.extract_text() or '') for p in PdfReader(str(path)).pages)
async def make_pdf(page,out,name):
    path=out/f'{name}.pdf'; await page.pdf(path=str(path),format='A4',print_background=True); text=pdf_text(path); return {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'text':text}

async def main_run(chromium,out):
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path=chromium,headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1100,'height':900}); await page.set_content(FIXTURE); await page.add_script_tag(content=MODEL_JS)
    await page.evaluate("webclipModel.includes.push(document.querySelector('#scope')); webclipModel.excludes.push(document.querySelector('#excluded')); document.querySelector('#excluded').setAttribute('data-webclip-pdf-exclude','1')")
    before=await page.evaluate('auditState()'); t0=time.perf_counter(); model=await page.evaluate('webclipModel.expandSpoilersInIncludedContent()'); elapsed_ms=(time.perf_counter()-t0)*1000; await page.wait_for_timeout(50); prepared=await page.evaluate('auditState()')
    await page.add_style_tag(content='[data-webclip-pdf-exclude],[data-webclip-pdf-exclude] *{display:none!important}')
    top_pdf=await make_pdf(page,out,'top_disclosures'); after_pdf=await page.evaluate('auditState()')
    top={'before':before,'prepared':prepared,'afterPdf':after_pdf,'model':model,'prepareMs':round(elapsed_ms,1),**top_pdf}
    assert before['closedOpen'] is False and prepared['closedOpen'] is True and prepared['nestedOpen'] is True
    assert before['openOpen'] is True and prepared['openOpen'] is True
    assert 'NATIVE_CLOSED_CONTENT' in top_pdf['text'] and 'NESTED_CONTENT_ONCE' in top_pdf['text'] and top_pdf['text'].count('NESTED_CONTENT_ONCE')==1 and 'NATIVE_TOGGLE_CREATED_CONTENT' in top_pdf['text']
    assert 'EXCLUDED_DETAIL_CONTENT' not in top_pdf['text']
    assert prepared['audit']['clicks'].count('aria')==1 and prepared['ariaExpanded']=='true'
    assert prepared['audit']['clicks'].count('stateful')==1 and prepared['created'] is True and 'STATEFUL_CREATED_BY_SYNTHETIC_CLICK' in top_pdf['text']
    assert prepared['audit']['submits']==1 and prepared['audit']['clicks'].count('submitCtrl')==1
    assert prepared['audit']['clicks'].count('anchorCtrl')==1
    assert prepared['audit']['clicks'].count('outsideCtrl')==0 and prepared['outsideExpanded']=='false' and 'OUTSIDE_PANEL' not in top_pdf['text']
    assert after_pdf['closedOpen'] is True and after_pdf['ariaExpanded']=='true' and after_pdf['created'] is True

    bench=await browser.new_page(viewport={'width':1000,'height':800}); n=24
    controls=''.join(f'<button aria-expanded="false" aria-controls="p{i}">b{i}</button><div id="p{i}" hidden>p{i}</div>' for i in range(n))
    await bench.set_content(f'<main id="scope">{controls}</main><script>for(const b of document.querySelectorAll("button"))b.addEventListener("click",()=>{{const p=document.getElementById(b.getAttribute("aria-controls"));p.hidden=false;b.setAttribute("aria-expanded","true")}})</script>'); await bench.add_script_tag(content=MODEL_JS); await bench.evaluate("webclipModel.includes.push(document.querySelector('#scope'))")
    b0=time.perf_counter(); bres=await bench.evaluate('webclipModel.expandSpoilersInIncludedContent()'); bms=(time.perf_counter()-b0)*1000
    benchmark={'controls':n,'attempted':bres['attemptedCount'],'elapsedMs':round(bms,1),'msPerControl':round(bms/n,1)}
    assert bres['attemptedCount']==n and bms >= n*35

    fpage=await browser.new_page(viewport={'width':1000,'height':700}); await fpage.set_content('<iframe id="f" style="width:800px;height:400px"></iframe>'); await fpage.locator('#f').evaluate('(el,html)=>el.srcdoc=html',FRAME_CHILD); await fpage.wait_for_timeout(150); await fpage.add_script_tag(content=MODEL_JS)
    await fpage.evaluate("webclipModel.includes.push(document.querySelector('#f').contentDocument.body)")
    f_before=await fpage.evaluate("document.querySelector('#f').contentWindow.frameState()")
    await fpage.evaluate('webclipModel.expandSpoilersInIncludedContent()'); await fpage.wait_for_timeout(50)
    f_prepared=await fpage.evaluate("document.querySelector('#f').contentWindow.frameState()")
    f_pdf=await make_pdf(fpage,out,'same_origin_frame_details'); same={'before':f_before,'prepared':f_prepared,**f_pdf}
    assert f_before['open'] is False and f_prepared['open'] is True and 'SAME_ORIGIN_FRAME_DETAILS_CONTENT' in f_pdf['text']

    cpage=await browser.new_page(viewport={'width':1000,'height':800})
    child_html=CROSS_CHILD.replace('`','\\`')
    await cpage.set_content(f'<h1>TOP</h1><iframe id="x" sandbox style="width:700px;height:400px"></iframe><script>document.querySelector("#x").srcdoc=`{child_html}`</script>')
    await cpage.wait_for_timeout(200)
    sop_blocked=await cpage.evaluate("() => { try { void document.querySelector('#x').contentDocument.body; return false } catch(e) { return true } }")
    c_pdf=await make_pdf(cpage,out,'cross_origin_closed_details_no_expansion')
    cross={'sopBlocked':sop_blocked,**c_pdf}
    assert sop_blocked is True and 'CROSS_FRAME_SUMMARY' in c_pdf['text'] and 'CROSS_ORIGIN_CLOSED_DETAILS_CONTENT' not in c_pdf['text']

    await browser.close()
    return {'topFrame':top,'boundedness':benchmark,'sameOriginFrame':same,'crossOriginNoExpansion':cross}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--chromium', default=shutil.which('chromium') or shutil.which('google-chrome') or '')
    parser.add_argument('--out', default='')
    args=parser.parse_args()
    if not args.chromium: raise SystemExit('Chromium not found; use --chromium PATH')
    if args.out:
        out=Path(args.out); out.mkdir(parents=True, exist_ok=True)
        result=asyncio.run(main_run(args.chromium,out))
        (out/'results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    else:
        with tempfile.TemporaryDirectory(prefix='webclip-c24-') as td:
            result=asyncio.run(main_run(args.chromium,Path(td)))
    print(json.dumps(result,indent=2,ensure_ascii=False))
if __name__=='__main__': main()
