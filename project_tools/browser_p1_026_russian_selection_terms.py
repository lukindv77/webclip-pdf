#!/opt/pyvenv/bin/python
"""P1-026 browser regression: Journal has one selection counter surface and Russian terminology."""
import json, os, pathlib, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
CONTENT = (ROOT/'content.js').read_text()

MOCK = r'''
(() => {
  const event=()=>({addListener(){},removeListener(){}});
  const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
  const entry={
    id:'p1026',createdAt:100,destination:'download',readingMode:'read',hostname:'example.com',
    url:'https://example.com/article',urlKey:'https://example.com/article',siteKey:'example.com',
    title:'P1-026 terminology',filename:'sample.pdf',includeCount:2,excludeCount:1,journalComments:[],
    selectionSnapshot:{version:3,includes:[{cssPath:'#a'},{cssPath:'#b'}],excludes:[{cssPath:'#x'}]}
  };
  globalThis.chrome={
    runtime:{id:'p1026managedmockp1026managedmock',lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:p=>'chrome-extension://p1026managedmockp1026managedmock/'+p,onMessage:event(),connect:()=>port(),sendMessage:async(m)=>{
      if(m?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
      if(m?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_META') return {ok:true,counts:{current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:1,read:1,later:0}},domains:{totalEntries:1,groups:[]}};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') return {ok:true,total:1,entries:[{id:entry.id,createdAt:entry.createdAt,destination:entry.destination,readingMode:entry.readingMode,hostname:entry.hostname,url:entry.url,urlKey:entry.urlKey,siteKey:entry.siteKey}]};
      if(m?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:[entry]};
      if(m?.type==='WEBCLIP_JOURNAL_REVISION'||m?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-026'};
      return {ok:true};
    }},
    storage:{local:{get:async()=>({webclipJournalGroupByUrl:false}),set:async()=>{}},session:{get:async()=>({})},onChanged:event()},
    tabs:{get:async()=>({id:1,url:'https://example.com/article'}),update:async()=>({}),sendMessage:async()=>({ok:true})},scripting:{executeScript:async()=>[]}
  };
})();
'''

CONTENT_MOCK = r'''
(() => {
  const listeners=[];
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage:async()=>({ok:true})
  }};
  globalThis.__p1026cmd=(m)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn)return reject(new Error('content listener missing'));
    let done=false; const send=v=>{if(!done){done=true;resolve(v)}};
    try{const ret=fn(m,{},send);if(ret!==true&&!done)send({ok:true});}catch(e){reject(e)}
  });
})();
'''

def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    html=(ROOT/'journal.html').read_text()
    html=re.sub(r'<script\s+src="(?:public-suffix|journal-text-filter|journal)\.js"></script>', '', html)
    psl=(ROOT/'public-suffix.js').read_text(); tf=(ROOT/'journal-text-filter.js').read_text(); js=(ROOT/'journal.js').read_text()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        # Top-page selection toolbar must expose the same Russian terminology.
        content_page=browser.new_page(); content_page.evaluate(CONTENT_MOCK); content_page.set_content('<!doctype html><html><body><main><section id=pick>Text</section></main></body></html>',wait_until='load'); content_page.add_script_tag(content=CONTENT)
        assert content_page.evaluate("__p1026cmd({type:'WEBCLIP_COMMAND',command:'start'})").get('ok') is True
        toolbar_count=content_page.evaluate("() => document.getElementById('webclip-pdf-extension-root').shadowRoot.querySelector('.count').textContent")
        assert toolbar_count=='Включены: 0 · Исключены: 0', toolbar_count
        content_page.evaluate("() => document.getElementById('pick').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))")
        toolbar_count_after=content_page.evaluate("() => document.getElementById('webclip-pdf-extension-root').shadowRoot.querySelector('.count').textContent")
        assert toolbar_count_after=='Включены: 1 · Исключены: 0', toolbar_count_after
        content_page.close()

        page=browser.new_page(); page.evaluate(MOCK); page.set_content(html,wait_until='load'); page.add_script_tag(content=psl); page.add_script_tag(content=tf); page.add_script_tag(content=js)
        page.wait_for_function("() => document.querySelectorAll('.entry').length===1")
        card=page.locator('.entry')
        text=card.inner_text()
        assert 'Сохранено областей: 2 · Исключено: 1' not in text
        assert 'Include' not in text and 'Exclude' not in text
        summary=card.locator('.selection-details > summary')
        assert summary.inner_text()=='Области страницы Включены/Исключены (2/1)'
        summary.click()
        headings=card.locator('.locator-group h3').all_inner_texts()
        assert headings==['Включены: 2','Исключены: 1'], headings
        assert card.get_by_role('button', name='Применить Включены/Исключены').count()==1
        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'toolbar':['Включены: 0 · Исключены: 0','Включены: 1 · Исключены: 0'],'duplicateCounterRemoved':True,'summary':'Области страницы Включены/Исключены (2/1)','locatorHeadings':headings},ensure_ascii=False))

if __name__=='__main__': main()
