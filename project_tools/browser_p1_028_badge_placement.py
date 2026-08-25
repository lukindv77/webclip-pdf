#!/opt/pyvenv/bin/python
"""P1-028 browser regression: destination/reading badges live under title, right of date/time, with preserved sizes."""
import json, os, pathlib, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')

MOCK = r'''
(() => {
  const event=()=>({addListener(){},removeListener(){}});
  const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
  const entries=[
    {id:'y-read',createdAt:400,destination:'yandex',readingMode:'read',hostname:'example.com',url:'https://example.com/a',urlKey:'https://example.com/a',siteKey:'example.com',title:'Yandex read — очень длинное название страницы для проверки переноса заголовка без изменения строки метаданных',filename:'a.pdf',publicUrl:'https://disk.yandex.ru/d/good',remotePath:'/WebClip/Upload/a.pdf',journalComments:[]},
    {id:'local-read',createdAt:200,destination:'download',readingMode:'read',hostname:'example.com',url:'https://example.com/c',urlKey:'https://example.com/c',siteKey:'example.com',title:'Local read',filename:'c.pdf',journalComments:[]}
  ];
  const byId=new Map(entries.map(e=>[e.id,e]));
  globalThis.chrome={
    runtime:{id:'p1028managedmockp1028managedmock',lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:p=>'chrome-extension://p1028managedmockp1028managedmock/'+p,onMessage:event(),connect:()=>port(),sendMessage:async(m)=>{
      if(m?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
      if(m?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_META') return {ok:true,counts:{current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:2,read:2,later:0}},domains:{totalEntries:2,groups:[]}};
      if(m?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') return {ok:true,total:2,entries:entries.map(e=>({id:e.id,createdAt:e.createdAt,destination:e.destination,readingMode:e.readingMode,hostname:e.hostname,url:e.url,urlKey:e.urlKey,siteKey:e.siteKey}))};
      if(m?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:(m.ids||[]).map(id=>byId.get(id)).filter(Boolean)};
      if(m?.type==='WEBCLIP_JOURNAL_REVISION'||m?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-028'};
      if(m?.type==='WEBCLIP_OPEN_JOURNAL_SAVED_FILE') return {ok:true,tabId:78};
      return {ok:true};
    }},
    storage:{local:{get:async()=>({webclipJournalGroupByUrl:false}),set:async()=>{}},session:{get:async()=>({})},onChanged:event()},
    tabs:{get:async()=>({}),update:async()=>({}),sendMessage:async()=>({ok:true})},scripting:{executeScript:async()=>[]}
  };
})();
'''

BASELINE = {
    'Yandex read': [
        {'text':'Яндекс Диск','width':109.03125,'height':28.0},
        {'text':'Прочитано','width':75.09375,'height':28.0},
    ],
    'Local read': [
        {'text':'Скачан локально','width':111.796875,'height':24.0},
        {'text':'Прочитано','width':75.09375,'height':24.0},
    ],
}

def close(a,b,tol=0.6):
    return abs(float(a)-float(b)) <= tol

def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    html=(ROOT/'journal.html').read_text()
    html=re.sub(r'<script\s+src="(?:public-suffix|journal-text-filter|journal)\.js"></script>', '', html)
    psl=(ROOT/'public-suffix.js').read_text(); tf=(ROOT/'journal-text-filter.js').read_text(); js=(ROOT/'journal.js').read_text(); css=(ROOT/'journal.css').read_text()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1180,'height':900}); page.evaluate(MOCK); page.set_content(html,wait_until='load')
        page.add_style_tag(content=css); page.add_script_tag(content=psl); page.add_script_tag(content=tf); page.add_script_tag(content=js)
        page.wait_for_function("() => document.querySelectorAll('.entry').length===2")
        cards=page.locator('.entry')
        results={}
        for title in ('Yandex read','Local read'):
            card=cards.filter(has_text=title)
            assert card.count()==1
            assert card.locator(':scope > .entry-head > .entry-title > h2').count()==1
            assert card.locator(':scope > .entry-head > .entry-title > .entry-title-meta').count()==1
            assert card.locator(':scope > .entry-head > .entry-badges').count()==0, 'badges must not remain in upper-right head sibling'
            meta=card.locator('.entry-title-meta')
            when=meta.locator(':scope > .when')
            badges=meta.locator(':scope > .entry-badges')
            assert when.count()==1 and badges.count()==1
            assert badges.locator(':scope > .badge').count()==2

            layout=card.evaluate("""card=>{
              const h=card.querySelector('.entry-title h2').getBoundingClientRect();
              const m=card.querySelector('.entry-title-meta').getBoundingClientRect();
              const w=card.querySelector('.entry-title-meta > .when').getBoundingClientRect();
              const b=card.querySelector('.entry-title-meta > .entry-badges').getBoundingClientRect();
              return {h:{top:h.top,bottom:h.bottom},m:{top:m.top,left:m.left,right:m.right},w:{left:w.left,right:w.right,cy:(w.top+w.bottom)/2},b:{left:b.left,right:b.right,cy:(b.top+b.bottom)/2}};
            }""")
            assert layout['m']['top'] >= layout['h']['bottom'] - 0.5, layout
            assert layout['w']['left'] < layout['b']['left'], layout
            assert layout['b']['right'] <= layout['m']['right'] + 0.6, layout
            assert abs(layout['w']['cy']-layout['b']['cy']) < 1.0, layout

            sizes=badges.locator(':scope > .badge').evaluate_all("els=>els.map(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {text:el.textContent,width:r.width,height:r.height,padding:s.padding,fontSize:s.fontSize,fontWeight:s.fontWeight}})")
            expected=BASELINE[title]
            assert [x['text'] for x in sizes]==[x['text'] for x in expected], sizes
            for got,want in zip(sizes,expected):
                assert close(got['width'],want['width']), (title,'width',got,want)
                assert close(got['height'],want['height'],0.2), (title,'height',got,want)
                assert got['padding']=='5px 8px', (title,got)
            results[title]={'layout':layout,'sizes':sizes}

        # Narrow-card degradation: badge sizes remain fixed and date/time is clipped rather than overlapping them.
        page.set_viewport_size({'width':420,'height':900})
        narrow=cards.filter(has_text='Yandex read')
        n=narrow.evaluate("""card=>{const w=card.querySelector('.when').getBoundingClientRect();const b=card.querySelector('.entry-badges').getBoundingClientRect();const h=card.querySelector('.entry-head').getBoundingClientRect();const t=card.querySelector('.entry-title').getBoundingClientRect();const s=getComputedStyle(card.querySelector('.when'));return {whenRight:w.right,badgesLeft:b.left,badgesRight:b.right,headRight:h.right,titleRight:t.right,overflow:s.overflow,textOverflow:s.textOverflow,whiteSpace:s.whiteSpace};}""")
        assert n['whenRight'] <= n['badgesLeft'] + 0.6, n
        assert n['badgesRight'] <= n['titleRight'] + 0.6 and n['titleRight'] <= n['headRight'] + 0.6, n
        assert n['overflow']=='hidden' and n['textOverflow']=='ellipsis' and n['whiteSpace']=='nowrap', n
        narrow_sizes=narrow.locator('.entry-badges .badge').evaluate_all("els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}})")
        for got,want in zip(narrow_sizes,BASELINE['Yandex read']):
            assert close(got['width'],want['width']) and close(got['height'],want['height'],0.2), (got,want)

        y=cards.filter(has_text='Yandex read').locator('.entry-badges .badge.yandex')
        local=cards.filter(has_text='Local read').locator('.entry-badges .badge.download')
        assert y.evaluate('(el)=>el.tagName')=='BUTTON'
        assert local.evaluate('(el)=>el.tagName')=='SPAN'
        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'underTitle':True,'dateLeftBadgesRight':True,'sizesPreserved':True,'narrowNoOverlap':True,'results':results},ensure_ascii=False))

if __name__=='__main__': main()
