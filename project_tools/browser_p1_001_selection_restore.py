#!/opt/pyvenv/bin/python
"""P1-001 policy-safe browser regression for resilient SelectionSnapshot v3 restore."""
import json
import os
import pathlib
import subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
CONTENT = (ROOT / 'content.js').read_text()

CHROME_MOCK = r'''
(() => {
  const listeners=[];
  globalThis.__p1001={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__p1001.lastPdfRequest=message;
        return Promise.resolve({ok:true,filename:'p1-001.pdf'});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__p1001Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn)return reject(new Error('content listener missing'));
    let done=false; const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true});}catch(e){reject(e)}
  });
})();
'''

INITIAL_HIGH='''<!doctype html><html><body><main id="container"><div class="lead">Stable lead context</div><section class="article-card" role="article" aria-label="Primary article"><h2>Alpha knowledge article</h2><p>Stable body text for resilient restore.</p></section><div class="tail">Stable tail context</div></main></body></html>'''
MUTATED_HIGH='''<!doctype html><html><body><main id="container"><div class="lead">Stable lead context</div><section class="promo" role="complementary" aria-label="Promotion"><h2>Promo block</h2><p>Unrelated inserted DOM.</p></section><section data-target="high" class="article-card" role="article" aria-label="Primary article"><h2>Alpha knowledge article</h2><p>Stable body text for resilient restore.</p></section><div class="tail">Stable tail context</div></main></body></html>'''

INITIAL_MEDIUM='''<!doctype html><html><body><div class="old-parent"><p class="copy body selected">Medium confidence fingerprint text remains unique on the page.</p></div></body></html>'''
MUTATED_MEDIUM='''<!doctype html><html><body><article class="new-parent"><p data-target="medium" class="copy body selected">Medium confidence fingerprint text remains unique on the page.</p></article><p>Different paragraph with unrelated text.</p></body></html>'''

INITIAL_AMBIG='''<!doctype html><html><body><main id="amb-parent"><div>Before stable context</div><section class="article-card" role="article"><p>Ambiguous duplicated article text.</p></section><div>After stable context</div></main></body></html>'''
MUTATED_AMBIG='''<!doctype html><html><body><main id="amb-parent"><div>Before stable context</div><section data-copy="one" class="article-card" role="article"><p>Ambiguous duplicated article text.</p></section><section data-copy="two" class="article-card" role="article"><p>Ambiguous duplicated article text.</p></section><div>After stable context</div></main></body></html>'''

INITIAL_IFRAME='<!doctype html><html><body><iframe id="docframe" srcdoc="<article><p class=\'inside selected\'>Iframe resilient selection text.</p></article>"></iframe></body></html>'
MUTATED_IFRAME='<!doctype html><html><body><iframe id="docframe" srcdoc="<article><p>Inserted iframe paragraph.</p><p data-target=\'iframe\' class=\'inside selected\'>Iframe resilient selection text.</p></article>"></iframe></body></html>'


def load_content(page, html):
    page.evaluate(CHROME_MOCK)
    page.set_content(html, wait_until='load')
    page.add_script_tag(content=CONTENT)


def capture_snapshot(ctx, html, selector):
    page=ctx.new_page()
    load_content(page, html)
    result=page.evaluate("__p1001Command({type:'WEBCLIP_COMMAND',command:'start'})")
    assert result.get('ok') is True
    clicked=page.evaluate("(selector) => document.querySelector(selector).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))", selector)
    assert clicked is False  # content.js preventDefault() makes dispatchEvent return false
    assert page.locator(selector).get_attribute('data-webclip-pdf-include') is not None
    result=page.evaluate("__p1001Command({type:'WEBCLIP_COMMAND',command:'download'})")
    assert result.get('ok') is True
    clicked=page.evaluate("""() => {const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}""")
    assert clicked
    page.wait_for_function("() => !!globalThis.__p1001.lastPdfRequest", timeout=10000)
    snapshot=page.evaluate("__p1001.lastPdfRequest.meta.selectionSnapshot")
    page.close()
    return snapshot




def capture_iframe_snapshot(ctx, html):
    page=ctx.new_page()
    load_content(page, html)
    page.wait_for_function("() => document.getElementById('docframe')?.contentDocument?.readyState === 'complete'")
    result=page.evaluate("__p1001Command({type:'WEBCLIP_COMMAND',command:'start'})")
    assert result.get('ok') is True
    clicked=page.evaluate("""() => { const frame=document.getElementById('docframe'); const target=frame.contentDocument.querySelector('p.selected'); return target.dispatchEvent(new frame.contentWindow.MouseEvent('click',{bubbles:true,cancelable:true,view:frame.contentWindow})); }""")
    assert clicked is False
    selected=page.evaluate("() => document.getElementById('docframe').contentDocument.querySelector('p.selected').hasAttribute('data-webclip-pdf-include')")
    assert selected
    result=page.evaluate("__p1001Command({type:'WEBCLIP_COMMAND',command:'download'})")
    assert result.get('ok') is True
    clicked=page.evaluate("""() => {const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}""")
    assert clicked
    page.wait_for_function("() => !!globalThis.__p1001.lastPdfRequest", timeout=10000)
    snapshot=page.evaluate("__p1001.lastPdfRequest.meta.selectionSnapshot")
    page.close()
    return snapshot

def restore(ctx, html, snapshot):
    page=ctx.new_page()
    load_content(page, html)
    result=page.evaluate("([snapshot]) => __p1001Command({type:'WEBCLIP_APPLY_SELECTION_SNAPSHOT',snapshot})", [snapshot])
    return page, result


def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        ctx=browser.new_context()

        high_snapshot=capture_snapshot(ctx, INITIAL_HIGH, 'section.article-card')
        assert high_snapshot['version']==3
        high_locator=high_snapshot['includes'][0]
        for field in ('role','parentTag','parentText','previousText','nextText','siblingIndex','sameTagIndex'):
            assert field in high_locator, f'missing v3 fingerprint field {field}'
        high_page, high_result=restore(ctx, MUTATED_HIGH, high_snapshot)
        assert high_result['restoredIncludes']==1, high_result
        assert high_result['ambiguousIncludes']==0, high_result
        assert high_result['confidenceHigh']==1, high_result
        assert high_page.locator('[data-target="high"]').get_attribute('data-webclip-pdf-include') is not None
        assert high_page.locator('.promo').get_attribute('data-webclip-pdf-include') is None
        high_page.close()

        medium_snapshot=capture_snapshot(ctx, INITIAL_MEDIUM, 'p.selected')
        medium_page, medium_result=restore(ctx, MUTATED_MEDIUM, medium_snapshot)
        assert medium_result['restoredIncludes']==1, medium_result
        assert medium_result['confidenceMedium']==1, medium_result
        assert medium_result['confidenceHigh']==0, medium_result
        assert medium_page.locator('[data-target="medium"]').get_attribute('data-webclip-pdf-include') is not None
        medium_page.close()

        amb_snapshot=capture_snapshot(ctx, INITIAL_AMBIG, 'section.article-card')
        amb_page, amb_result=restore(ctx, MUTATED_AMBIG, amb_snapshot)
        assert amb_result['restoredIncludes']==0, amb_result
        assert amb_result['ambiguousIncludes']==1, amb_result
        assert amb_page.locator('[data-copy="one"]').get_attribute('data-webclip-pdf-include') is None
        assert amb_page.locator('[data-copy="two"]').get_attribute('data-webclip-pdf-include') is None
        amb_page.close()

        iframe_snapshot=capture_iframe_snapshot(ctx, INITIAL_IFRAME)
        assert iframe_snapshot['version']==3, iframe_snapshot
        assert len(iframe_snapshot['includes'][0]['framePath'])==1, iframe_snapshot
        iframe_page=ctx.new_page()
        load_content(iframe_page, MUTATED_IFRAME)
        iframe_page.wait_for_function("() => document.getElementById('docframe')?.contentDocument?.readyState === 'complete'")
        iframe_result=iframe_page.evaluate("([snapshot]) => __p1001Command({type:'WEBCLIP_APPLY_SELECTION_SNAPSHOT',snapshot})", [iframe_snapshot])
        assert iframe_result['restoredIncludes']==1, iframe_result
        iframe_selected=iframe_page.evaluate("() => document.getElementById('docframe').contentDocument.querySelector('[data-target=iframe]').hasAttribute('data-webclip-pdf-include')")
        assert iframe_selected, iframe_result
        iframe_page.close()

        legacy=dict(high_snapshot)
        legacy['version']=2
        legacy_page, legacy_result=restore(ctx, INITIAL_HIGH, legacy)
        assert legacy_result['restoredIncludes']==1, legacy_result
        assert legacy_result['confidenceLegacy']==1, legacy_result
        legacy_page.close()

        browser.close()
        print(json.dumps({
            'ok':True,
            'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),
            'snapshotVersion':high_snapshot['version'],
            'highConfidence':high_result['confidenceHigh'],
            'mediumConfidence':medium_result['confidenceMedium'],
            'ambiguityFailClosed':amb_result['ambiguousIncludes'],
            'legacyCompatibility':legacy_result['confidenceLegacy'],
            'iframeFramePathRestore':iframe_result['restoredIncludes']
        },ensure_ascii=False))


if __name__=='__main__':
    main()
