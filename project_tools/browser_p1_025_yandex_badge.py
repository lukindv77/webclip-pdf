#!/opt/pyvenv/bin/python
"""P1-025 browser regression: Yandex destination badge is the sole saved-file action."""
import json, os, pathlib, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')

MOCK = r'''
(() => {
  const event=()=>({addListener(){},removeListener(){}});
  const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
  const entries=[
    {id:'y-ok',createdAt:300,destination:'yandex',readingMode:'read',hostname:'example.com',url:'https://example.com/a',urlKey:'https://example.com/a',siteKey:'example.com',title:'Yandex openable',filename:'a.pdf',publicUrl:'https://disk.yandex.ru/d/good',remotePath:'/WebClip/Upload/a.pdf',journalComments:[]},
    {id:'y-none',createdAt:200,destination:'yandex',readingMode:'later',hostname:'example.com',url:'https://example.com/b',urlKey:'https://example.com/b',siteKey:'example.com',title:'Yandex unavailable',filename:'b.pdf',publicUrl:'',remotePath:'/WebClip/ReadmeLater/b.pdf',journalComments:[]},
    {id:'local',createdAt:100,destination:'download',readingMode:'read',hostname:'example.com',url:'https://example.com/c',urlKey:'https://example.com/c',siteKey:'example.com',title:'Local file',filename:'c.pdf',journalComments:[]}
  ];
  const byId=new Map(entries.map(e=>[e.id,e]));
  const opened=[];
  globalThis.__p1025={opened};
  globalThis.chrome={
    runtime:{id:'p1025managedmockp1025managedmock',lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:p=>'chrome-extension://p1025managedmockp1025managedmock/'+p,onMessage:event(),connect:()=>port(),sendMessage:async(m)=>{
      if(m?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
      if(m?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_META') return {ok:true,counts:{current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:3,read:2,later:1}},domains:{totalEntries:3,groups:[]}};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') return {ok:true,total:3,entries:entries.map(e=>({id:e.id,createdAt:e.createdAt,destination:e.destination,readingMode:e.readingMode,hostname:e.hostname,url:e.url,urlKey:e.urlKey,siteKey:e.siteKey}))};
      if(m?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:(m.ids||[]).map(id=>byId.get(id)).filter(Boolean)};
      if(m?.type==='WEBCLIP_OPEN_JOURNAL_SAVED_FILE'){opened.push(m.id);return {ok:true,tabId:77};}
      if(m?.type==='WEBCLIP_JOURNAL_REVISION'||m?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-025'};
      return {ok:true};
    }},
    storage:{local:{get:async()=>({webclipJournalGroupByUrl:false}),set:async()=>{}},session:{get:async()=>({})},onChanged:event()},
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
        page.wait_for_function("() => document.querySelectorAll('.entry').length===3")
        cards=page.locator('.entry')
        open_card=cards.filter(has_text='Yandex openable')
        unavailable_card=cards.filter(has_text='Yandex unavailable')
        local_card=cards.filter(has_text='Local file')
        assert open_card.count()==1 and unavailable_card.count()==1 and local_card.count()==1

        open_badge=open_card.locator('.entry-badges .badge.yandex')
        assert open_badge.evaluate('(el)=>el.tagName')=='BUTTON'
        assert not open_badge.is_disabled()
        assert open_badge.inner_text()=='Яндекс Диск'
        assert 'Открыть сохранённый файл' in (open_badge.get_attribute('title') or '')
        assert open_card.locator('.yandex-file-link').count()==0
        assert 'Открыть сохранённый файл на Яндекс Диске' not in open_card.locator('.meta').inner_text()
        open_badge.click()
        page.wait_for_function("() => __p1025.opened.length===1")
        assert page.evaluate('() => __p1025.opened')==['y-ok']

        unavailable_badge=unavailable_card.locator('.entry-badges .badge.yandex')
        assert unavailable_badge.evaluate('(el)=>el.tagName')=='BUTTON'
        assert unavailable_badge.is_disabled()
        assert 'недоступна' in (unavailable_badge.get_attribute('title') or '').lower()
        assert unavailable_badge.get_attribute('aria-label')==unavailable_badge.get_attribute('title')
        assert page.evaluate('() => __p1025.opened')==['y-ok']

        local_badge=local_card.locator('.entry-badges .badge.download')
        assert local_badge.evaluate('(el)=>el.tagName')=='SPAN'
        assert local_card.locator('button.badge').count()==0

        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'openableYandexBadge':True,'disabledUnavailableBadge':True,'standaloneLinkRemoved':True,'localBadgeNonAction':True},ensure_ascii=False))

if __name__=='__main__': main()
