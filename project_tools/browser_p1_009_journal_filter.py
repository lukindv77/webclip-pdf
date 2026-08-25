#!/opt/pyvenv/bin/python
"""P1-009 policy-safe browser regression for universal Journal filter UI."""
import json, os, pathlib, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')

MOCK = r'''
(() => {
  const event=()=>({addListener(){},removeListener(){}});
  const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
  const entries=[];
  for(let i=1;i<=25;i++) entries.push({
    id:'noise-'+i,createdAt:100000-i,destination:'download',readingMode:'read',hostname:'noise.example.net',
    url:'https://noise.example.net/item/'+i,urlKey:'https://noise.example.net/item/'+i,siteKey:'example.net',
    title:'Обычная запись '+i,filename:'noise-'+i+'.pdf',journalComments:[]
  });
  entries[2].title='Needle Title First'; entries[2].journalComments=[{text:'blue note'}];
  entries[21].title='Needle Title Beyond Page'; entries[21].journalComments=[{text:'green note'}];
  entries[23].title='Different title'; entries[23].journalComments=[{text:'blue needle comment'}];
  entries[24].title='Portal item'; entries[24].hostname='portal.special.example.org'; entries[24].url='https://portal.special.example.org/deep/needle-url'; entries[24].urlKey=entries[24].url; entries[24].siteKey='example.org';
  const byId=new Map(entries.map(e=>[e.id,e]));
  const local={webclipJournalGroupByUrl:false};
  const messages=[];
  const normalized=(m)=>globalThis.WebClipJournalTextFilter.normalize(m?.textFilter||null);
  function filtered(m){
    const f=normalized(m);
    return entries.filter(e=>{
      if(m?.reading && m.reading!=='all' && e.readingMode!==m.reading) return false;
      return globalThis.WebClipJournalTextFilter.matches(e,f);
    });
  }
  function counts(list){return {current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:list.length,read:list.length,later:0}};}
  globalThis.__p1009={entries,messages};
  globalThis.chrome={
    runtime:{id:'p1009managedmockp1009managedmock',lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:p=>'chrome-extension://p1009managedmockp1009managedmock/'+p,onMessage:event(),connect:()=>port(),sendMessage:async(m)=>{
      messages.push(structuredClone(m));
      if(m?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
      if(m?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_META') {const list=filtered({textFilter:m.textFilter,reading:m.readingFilter});return {ok:true,counts:counts(list),domains:{totalEntries:list.length,groups:[]}};}
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') {const list=filtered(m);const page=Math.max(1,Number(m.page)||1),size=Math.max(1,Number(m.pageSize)||20);const slice=list.slice((page-1)*size,page*size).map(e=>({id:e.id,createdAt:e.createdAt,destination:e.destination,readingMode:e.readingMode,hostname:e.hostname,url:e.url,urlKey:e.urlKey,siteKey:e.siteKey}));return {ok:true,total:list.length,entries:slice};}
      if(m?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:(m.ids||[]).map(id=>byId.get(id)).filter(Boolean)};
      if(m?.type==='WEBCLIP_JOURNAL_REVISION'||m?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-009'};
      return {ok:true};
    }},
    storage:{local:{get:async k=>typeof k==='string'?{[k]:local[k]}:{...local},set:async v=>Object.assign(local,v)},session:{get:async()=>({})},onChanged:event()},
    tabs:{get:async()=>({}),update:async()=>({}),sendMessage:async()=>({ok:true})},scripting:{executeScript:async()=>[]}
  };
})();
'''

def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    html=(ROOT/'journal.html').read_text()
    html=re.sub(r'<script\s+src="(?:public-suffix|journal-text-filter|journal)\.js"></script>', '', html)
    psl=(ROOT/'public-suffix.js').read_text(); tf=(ROOT/'journal-text-filter.js').read_text(); js=(ROOT/'journal.js').read_text()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page=browser.new_page(); page.evaluate(MOCK); page.set_content(html,wait_until='load'); page.add_script_tag(content=psl); page.add_script_tag(content=tf); page.add_script_tag(content=js)
        page.wait_for_function("() => document.querySelectorAll('.entry').length===20")
        assert 'Записи 1–20 из 25' in page.locator('#pageInfo').inner_text()
        page.locator('#textFilterPanel > summary').click()
        rows=page.locator('.text-filter-row'); assert rows.count()==1
        first=rows.nth(0); assert first.locator('input[data-field="title"]').is_checked()
        assert not first.locator('input[data-field="comments"]').is_checked()

        first.locator('.text-filter-query').fill('needle title')
        page.wait_for_function("() => document.querySelectorAll('.entry').length===2")
        body=page.locator('#entries').inner_text()
        assert 'Needle Title First' in body and 'Needle Title Beyond Page' in body, body
        assert 'Записи 1–2 из 2' in page.locator('#pageInfo').inner_text()

        page.click('#addTextFilterRow'); assert rows.count()==2
        second=rows.nth(1); second.locator('.text-filter-query').fill('blue')
        second.locator('input[data-field="comments"]').check(); second.locator('input[data-field="title"]').uncheck()
        page.wait_for_function("() => document.querySelectorAll('.entry').length===1")
        assert 'Needle Title First' in page.locator('#entries').inner_text()

        page.locator('input[name="journalTextFilterLogic"][value="or"]').check()
        page.wait_for_function("() => document.querySelectorAll('.entry').length===3")
        or_text=page.locator('#entries').inner_text(); assert 'Different title' in or_text and 'Needle Title Beyond Page' in or_text

        page.click('#clearTextFilter'); page.wait_for_function("() => document.querySelectorAll('.entry').length===20")
        first=page.locator('.text-filter-row').nth(0)
        first.locator('.text-filter-query').fill('portal.special.example.org')
        first.locator('input[data-field="site"]').check(); first.locator('input[data-field="title"]').uncheck()
        page.wait_for_function("() => document.querySelectorAll('.entry').length===1")
        assert 'Portal item' in page.locator('#entries').inner_text()

        first.locator('.text-filter-query').fill('needle-url')
        first.locator('input[data-field="url"]').check(); first.locator('input[data-field="site"]').uncheck()
        page.wait_for_function("() => document.querySelectorAll('.entry').length===1")
        assert 'Portal item' in page.locator('#entries').inner_text()

        payloads=page.evaluate("() => __p1009.messages.filter(m=>m.type==='WEBCLIP_JOURNAL_VIEW_PAGE').map(m=>m.textFilter).filter(Boolean)")
        assert any(p.get('rows') and p['rows'][0].get('text')=='needle title' for p in payloads), payloads
        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'initialTotal':25,'prePaginationMatches':2,'andRows':True,'orRows':True,'titleDefault':True,'comments':True,'site':True,'url':True},ensure_ascii=False))

if __name__=='__main__': main()
