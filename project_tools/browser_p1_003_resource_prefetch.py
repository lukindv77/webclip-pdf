#!/opt/pyvenv/bin/python
"""P1-003 policy-safe browser regression for bounded PDF resource prefetch/report."""
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
  globalThis.__p1003={listeners,lastPdfRequest:null,atSend:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__p1003.lastPdfRequest=structuredClone(message);
        const shadow=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
        globalThis.__p1003.atSend={
          okSrc:document.getElementById('lazy-ok')?.getAttribute('src'),
          okLoading:document.getElementById('lazy-ok')?.getAttribute('loading'),
          failSrc:document.getElementById('lazy-fail')?.getAttribute('src'),
          headerText:document.getElementById('webclip-pdf-header')?.innerText || '',
          modalVisible:shadow ? getComputedStyle(document.getElementById('webclip-pdf-extension-root')).display !== 'none' : false
        };
        return Promise.resolve({ok:true,filename:'p1-003.pdf'});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__p1003Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn)return reject(new Error('content listener missing'));
    let done=false; const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{const ret=fn(message,{},send);if(ret!==true&&!done)send({ok:true});}catch(e){reject(e)}
  });
})();
'''

OK_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJncmVlbiIvPjwvc3ZnPg=='
BG_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibHVlIi8+PC9zdmc+'

HTML = f'''<!doctype html><html><head><style>
@font-face{{font-family:"WebClipMissingP1003";src:url("http://127.0.0.1:9/private-font.woff2?access_token=SECRET") format("woff2");font-display:block;}}
#target{{background-image:url("{BG_SVG}");font-family:"WebClipMissingP1003";font-size:16px;}}
</style></head><body>
<section id="target"><h1>P1-003 resources</h1>
<img id="lazy-ok" loading="lazy" data-src="{OK_SVG}" alt="ok lazy">
<img id="lazy-fail" loading="lazy" data-src="http://127.0.0.1:9/private-image.png?access_token=SECRET#fragment" alt="failed lazy">
<p>Font probe text.</p></section>
</body></html>'''


def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page = browser.new_page()
        page.evaluate(CHROME_MOCK)
        page.set_content(HTML, wait_until='load')
        page.add_script_tag(content=CONTENT)
        result = page.evaluate("__p1003Command({type:'WEBCLIP_COMMAND',command:'start'})")
        assert result.get('ok') is True
        clicked = page.evaluate("() => document.getElementById('target').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))")
        assert clicked is False
        result = page.evaluate("__p1003Command({type:'WEBCLIP_COMMAND',command:'download'})")
        assert result.get('ok') is True
        clicked = page.evaluate("""() => {const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}""")
        assert clicked
        page.wait_for_function("() => !!globalThis.__p1003.lastPdfRequest", timeout=20000)
        payload = page.evaluate("__p1003")
        report = payload['lastPdfRequest']['meta']['resourceReport']
        assert report['version'] == 1, report
        assert report['limit'] == 500, report
        assert report['deadlineMs'] == 15000, report
        assert report['attempted'] >= 3, report
        assert report['loaded'] >= 2, report
        assert report['failed'] >= 1, report
        assert len(report['failures']) <= 40, report
        serialized = json.dumps(report, ensure_ascii=False)
        assert 'access_token=SECRET' not in serialized, serialized
        assert '?access_token' not in serialized, serialized
        assert 'Ресурсы PDF' in payload['atSend']['headerText'], payload['atSend']
        assert payload['atSend']['okSrc'] == OK_SVG, payload['atSend']
        assert payload['atSend']['okLoading'] == 'eager', payload['atSend']
        assert payload['atSend']['modalVisible'] is True, payload['atSend']

        page.wait_for_function("() => document.getElementById('lazy-ok')?.getAttribute('loading') === 'lazy' && !document.getElementById('lazy-ok')?.hasAttribute('src')", timeout=5000)
        restored = page.evaluate("() => ({okSrc:document.getElementById('lazy-ok').getAttribute('src'),okLoading:document.getElementById('lazy-ok').getAttribute('loading'),failSrc:document.getElementById('lazy-fail').getAttribute('src')})")
        assert restored == {'okSrc': None, 'okLoading': 'lazy', 'failSrc': None}, restored
        browser.close()
        print(json.dumps({
            'ok': True,
            'browser': subprocess.check_output([CHROMIUM,'--version'], text=True).strip(),
            'attempted': report['attempted'],
            'loaded': report['loaded'],
            'failed': report['failed'],
            'deadlineExceeded': report['deadlineExceeded'],
            'redactedFailureReport': True,
            'temporaryLazyAttrsRestored': True
        }, ensure_ascii=False))

if __name__ == '__main__':
    main()
