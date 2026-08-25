#!/opt/pyvenv/bin/python
"""P1-027 browser regression: destination/reading badges are the only current mode indicators."""
import json, os, pathlib, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')

MOCK = r'''
(() => {
  const event=()=>({addListener(){},removeListener(){}});
  const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
  const entries=[
    {id:'y-read',createdAt:400,destination:'yandex',readingMode:'read',movedToReadAt:350,hostname:'example.com',url:'https://example.com/a',urlKey:'https://example.com/a',siteKey:'example.com',title:'Yandex read',filename:'a.pdf',publicUrl:'https://disk.yandex.ru/d/good',remotePath:'/WebClip/Upload/a.pdf',journalComments:[]},
    {id:'y-later',createdAt:300,destination:'yandex',readingMode:'later',hostname:'example.com',url:'https://example.com/b',urlKey:'https://example.com/b',siteKey:'example.com',title:'Yandex later',filename:'b.pdf',publicUrl:'',remotePath:'/WebClip/ReadmeLater/b.pdf',journalComments:[]},
    {id:'local-read',createdAt:200,destination:'download',readingMode:'read',hostname:'example.com',url:'https://example.com/c',urlKey:'https://example.com/c',siteKey:'example.com',title:'Local read',filename:'c.pdf',journalComments:[]},
    {id:'local-legacy',createdAt:100,destination:'download',readingMode:'later',hostname:'example.com',url:'https://example.com/d',urlKey:'https://example.com/d',siteKey:'example.com',title:'Local legacy later',filename:'d.pdf',journalComments:[]}
  ];
  const byId=new Map(entries.map(e=>[e.id,e]));
  globalThis.chrome={
    runtime:{id:'p1027managedmockp1027managedmock',lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:p=>'chrome-extension://p1027managedmockp1027managedmock/'+p,onMessage:event(),connect:()=>port(),sendMessage:async(m)=>{
      if(m?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
      if(m?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_META') return {ok:true,counts:{current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:4,read:2,later:2}},domains:{totalEntries:4,groups:[]}};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') return {ok:true,total:4,entries:entries.map(e=>({id:e.id,createdAt:e.createdAt,destination:e.destination,readingMode:e.readingMode,hostname:e.hostname,url:e.url,urlKey:e.urlKey,siteKey:e.siteKey}))};
      if(m?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:(m.ids||[]).map(id=>byId.get(id)).filter(Boolean)};
      if(m?.type==='WEBCLIP_JOURNAL_REVISION'||m?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-027'};
      if(m?.type==='WEBCLIP_OPEN_JOURNAL_SAVED_FILE') return {ok:true,tabId:77};
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
    psl=(ROOT/'public-suffix.js').read_text(); tf=(ROOT/'journal-text-filter.js').read_text(); js=(ROOT/'journal.js').read_text(); css_text=(ROOT/'journal.css').read_text()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={"width":1180,"height":900}); page.evaluate(MOCK); page.set_content(html,wait_until='load'); page.add_style_tag(content=css_text); page.add_script_tag(content=psl); page.add_script_tag(content=tf); page.add_script_tag(content=js)
        page.wait_for_function("() => document.querySelectorAll('.entry').length===4")
        cards=page.locator('.entry')

        for title, destination, reading in [
            ('Yandex read','Яндекс Диск','Прочитано'),
            ('Yandex later','Яндекс Диск','Прочитать позже'),
            ('Local read','Скачан локально','Прочитано'),
            ('Local legacy later','Скачан локально','Прочитано'),
        ]:
            card=cards.filter(has_text=title)
            assert card.count()==1
            badge_texts=card.locator('.entry-badges .badge').all_inner_texts()
            assert badge_texts==[destination,reading], (title,badge_texts)
            assert 'Режим выгрузки:' not in card.inner_text()
            assert 'Статус чтения:' not in card.inner_text()
            assert card.locator('.entry-mode-row').count()==0
            assert card.locator('.entry-mode-summary').count()==0

        local=cards.filter(has_text='Local read')
        local_badge=local.locator('.entry-badges .badge.download')
        assert local_badge.evaluate('(el)=>el.tagName')=='SPAN'
        style=local_badge.evaluate("el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,border:getComputedStyle(el).borderTopColor})")
        assert style['bg'] in ('rgb(241, 243, 244)','rgba(241, 243, 244, 1)'), style
        assert style['color'] in ('rgb(60, 64, 67)','rgba(60, 64, 67, 1)'), style
        assert local.locator('button.badge').count()==0

        group=local.locator('.entry-badges')
        css=group.evaluate("el=>({wrap:getComputedStyle(el).flexWrap,display:getComputedStyle(el).display})")
        assert css['display']=='flex' and css['wrap']=='nowrap', css
        boxes=local.locator('.entry-badges .badge').evaluate_all("els=>els.map(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}))")
        assert abs(boxes[0]['top']-boxes[1]['top']) < 1.0, boxes

        yread=cards.filter(has_text='Yandex read')
        assert 'Переведено в «Прочитано»:' in yread.inner_text()
        assert yread.locator('.entry-badges .badge.yandex').evaluate('(el)=>el.tagName')=='BUTTON'

        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'modeSummaryRemoved':True,'localBadge':'Скачан локально','neutralLocalBadge':True,'horizontalBadges':True,'movedHistoryPreserved':True},ensure_ascii=False))

if __name__=='__main__': main()
