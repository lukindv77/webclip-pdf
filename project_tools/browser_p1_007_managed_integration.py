#!/opt/pyvenv/bin/python
"""P1-007 browser integration fallback for policy-managed Chromium.

This runner never bypasses browser policy. It uses about:blank + set_content(),
executes the real production content.js/journal.js/service-worker.js in Chromium,
and mocks only the chrome.* / network boundaries that cannot be reached in the
managed test browser. A separate JS runner covers the real unpacked-extension
path through Extensions.loadUnpacked for normal Chrome/Chrome-for-Testing.
"""
import json
import os
import pathlib
import re
import subprocess
import tempfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')

ARTICLE_HTML = '''<!doctype html><html><head><meta charset="utf-8"><title>P1-007 Browser Article</title>
<style>body{font-family:sans-serif;margin:40px}article{max-width:720px}aside{margin-top:30px}</style></head><body>
<article id="article"><h1>P1-007 Browser Article</h1><p>Browser integration selection target with enough text for a real PDF render.</p>
<img loading="lazy" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="fixture"></article>
<aside id="noise">P1-007 NOISE MUST NOT ENTER SELECTED PDF</aside></body></html>'''

CONTENT_CHROME_MOCK = r'''
(() => {
  const listeners=[];
  globalThis.__p1007 = { listeners, pdfRequest:null, pdfResolve:null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn){ listeners.push(fn); } },
    sendMessage(message) {
      if (message && message.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__p1007.pdfRequest = message;
        return new Promise((resolve) => { globalThis.__p1007.pdfResolve = () => resolve({ok:true, filename:'P1-007.pdf'}); });
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__p1007Command = (message) => new Promise((resolve, reject) => {
    const listener=listeners[0]; if (!listener) return reject(new Error('content runtime listener missing'));
    let settled=false; const done=(value)=>{ if(!settled){settled=true;resolve(value);} };
    try { const ret=listener(message, {}, done); if (ret !== true && !settled) done({ok:true}); } catch(e){ reject(e); }
  });
})();
'''

# Journal executes against its runtime fallback because native IndexedDB is
# intentionally unavailable on policy-safe about:blank. This still runs the
# real Journal rendering/filter/pagination code in Chromium.
JOURNAL_CHROME_MOCK = r'''
(() => {
 const event=()=>({addListener(){},removeListener(){}});
 const port=()=>({onMessage:event(),onDisconnect:event(),disconnect(){}});
 const entry={id:'p1-007-journal',createdAt:Date.now(),destination:'download',readingMode:'read',hostname:'example.test',url:'https://example.test/article',urlKey:'https://example.test/article',siteKey:'example.test',title:'P1-007 Journal Browser Entry',filename:'P1-007.pdf',fileComment:'browser integration',comments:[],selectionSnapshot:{includes:[{selector:'#article'}],excludes:[]}};
 const summary={id:entry.id,createdAt:entry.createdAt,destination:entry.destination,readingMode:entry.readingMode,hostname:entry.hostname,url:entry.url,urlKey:entry.urlKey,siteKey:entry.siteKey};
 const counts={current:{all:0,read:0,later:0},site:{all:0,read:0,later:0},all:{all:1,read:1,later:0}};
 const local={webclipJournalGroupByUrl:false};
 globalThis.chrome={
  runtime:{
   id:'p1007managedmockp1007managedmock', lastError:null,
   getManifest:()=>({version:'0.9.8'}), getURL:(p)=>'chrome-extension://p1007managedmockp1007managedmock/'+p,
   onMessage:event(), connect:()=>port(),
   sendMessage:async(msg)=>{
    if(msg?.type==='WEBCLIP_JOURNAL_BACKUP_STATUS') return {ok:true,folderPath:'',lastRemotePath:'',enabled:false,lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0,hasCurrentProblem:false};
    if(msg?.type==='WEBCLIP_JOURNAL_PING') return {ok:true,version:'0.9.8'};
    if(msg?.type==='WEBCLIP_JOURNAL_VIEW_META') return {ok:true,counts,domains:{totalEntries:1,groups:[{base:'example.test',count:1,latest:entry.createdAt,children:[]}]}};
    if(msg?.type==='WEBCLIP_JOURNAL_VIEW_PAGE') return {ok:true,total:1,entries:[summary]};
    if(msg?.type==='WEBCLIP_JOURNAL_GET_MANY') return {ok:true,entries:[entry]};
    if(msg?.type==='WEBCLIP_JOURNAL_REVISION'||msg?.type==='WEBCLIP_JOURNAL_GET_REVISION') return {ok:true,revision:'p1-007'};
    return {ok:true};
   }
  },
  storage:{local:{get:async(k)=>typeof k==='string'?{[k]:local[k]}:{...local},set:async(v)=>Object.assign(local,v)},session:{get:async()=>({})},onChanged:event()},
  tabs:{get:async()=>({}),update:async()=>({}),sendMessage:async()=>({ok:true})},
  scripting:{executeScript:async()=>[]}
 };
})();
'''

SW_HARNESS = r'''
(() => {
 const EXT='p1007managedmockp1007managedmock';
 const listeners={message:[]}; const mkEvent=()=>({addListener(fn){},removeListener(fn){}});
 const stores={local:{},session:{}};
 const dirs=new Set(['/']); const requests=[];
 function area(name){return {
  async get(keys){const s=stores[name]; if(keys==null)return {...s}; if(typeof keys==='string')return {[keys]:s[keys]}; if(Array.isArray(keys)){const o={};for(const k of keys)o[k]=s[k];return o;} if(typeof keys==='object'){const o={};for(const [k,d] of Object.entries(keys))o[k in s?k:k]=k in s?s[k]:d;return o;} return {};},
  async set(values){Object.assign(stores[name],values||{});}, async remove(keys){for(const k of (Array.isArray(keys)?keys:[keys]))delete stores[name][k];}, async clear(){for(const k of Object.keys(stores[name]))delete stores[name][k];}, async setAccessLevel(){}
 };}
 function norm(p){const a=String(p||'').split('/').filter(Boolean);return a.length?'/'+a.join('/'):'/';}
 function response(status,obj){const text=JSON.stringify(obj);return new Response(text,{status,headers:{'content-type':'application/json','content-length':String(new TextEncoder().encode(text).byteLength)}});}
 self.fetch=async(input,options={})=>{
   const url=new URL(String(input)); const method=String(options.method||'GET').toUpperCase(); const auth=String(options.headers?.Authorization||options.headers?.authorization||'');
   requests.push({method,url:url.toString(),auth});
   if(url.hostname==='cloud-api.yandex.net' && url.pathname==='/v1/disk' && method==='GET') return response(200,{total_space:1073741824,used_space:1234,trash_size:0,user:{uid:'p1-007-mock-uid',login:'p1-007-mock',display_name:'P1-007 Mock Account'}});
   if(url.hostname==='cloud-api.yandex.net' && url.pathname==='/v1/disk/resources'){
     const p=norm(url.searchParams.get('path')||'/');
     if(method==='PUT'){if(dirs.has(p))return response(409,{error:'DiskPathPointsToExistentDirectoryError'});dirs.add(p);return response(201,{type:'dir',path:p,name:p.split('/').pop()||'Disk'});}
     if(method==='GET'){if(!dirs.has(p))return response(404,{error:'DiskNotFoundError'});const prefix=p==='/'?'/':p+'/';const items=[...dirs].filter(d=>d!==p&&d!=='/'&&d.startsWith(prefix)&&!d.slice(prefix.length).includes('/')).sort().map(d=>({type:'dir',path:d,name:d.split('/').pop()}));return response(200,{type:'dir',path:p,name:p==='/'?'Disk':p.split('/').pop(),_embedded:{items,total:items.length,limit:100,offset:0}});}
   }
   return response(404,{error:'FixtureNotFound'});
 };
 self.chrome={
  runtime:{id:EXT,lastError:null,getManifest:()=>({version:'0.9.8'}),getURL:(p)=>'chrome-extension://'+EXT+'/'+p,getContexts:async()=>[],sendMessage:async()=>({ok:true}),
   onMessage:{addListener(fn){listeners.message.push(fn)}},onConnect:mkEvent(),onInstalled:mkEvent(),onStartup:mkEvent()},
  storage:{local:area('local'),session:area('session'),onChanged:mkEvent()},
  alarms:{get:async()=>null,create:async()=>{},clear:async()=>true,onAlarm:mkEvent()},
  contextMenus:{create:()=>{},removeAll:async()=>{},onClicked:mkEvent()},
  action:{setBadgeBackgroundColor:async()=>{},setBadgeText:async()=>{},setIcon:async()=>{},setTitle:async()=>{}},
  downloads:{download:async()=>1,search:async()=>[],cancel:async()=>{},onChanged:mkEvent()},
  offscreen:{createDocument:async()=>{},closeDocument:async()=>{}}, scripting:{executeScript:async()=>[]},
  debugger:{attach:async()=>{},detach:async()=>{},sendCommand:async()=>({})},
  tabs:{create:async(o)=>({id:1,...o}),get:async(id)=>({id,url:'https://example.test/'}),query:async()=>[],reload:async()=>{},sendMessage:async()=>({ok:true}),onActivated:mkEvent(),onRemoved:mkEvent(),onUpdated:mkEvent()}
 };
 self.__p1007Invoke=(message)=>new Promise((resolve,reject)=>{
   const fn=listeners.message[0]; if(!fn)return reject(new Error('service-worker runtime listener missing'));
   const sender={id:EXT,url:'chrome-extension://'+EXT+'/options.html',origin:'chrome-extension://'+EXT};
   let done=false; const send=(v)=>{if(!done){done=true;resolve(v)}};
   try {const ret=fn(message,sender,send); if(ret!==true&&!done)send(undefined);}catch(e){reject(e)}
 });
 self.__p1007State={stores,dirs,requests};
})();
'''

def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    content=(ROOT/'content.js').read_text()
    journal_html=(ROOT/'journal.html').read_text()
    journal_html=re.sub(r'<script\s+src="(?:public-suffix|journal-text-filter|journal)\.js"></script>', '', journal_html)
    public_suffix=(ROOT/'public-suffix.js').read_text()
    journal_text_filter=(ROOT/'journal-text-filter.js').read_text()
    journal_js=(ROOT/'journal.js').read_text()
    import_stream=(ROOT/'journal-import-stream.js').read_text()
    sw=(ROOT/'service-worker.js').read_text()
    sw=re.sub(r"^importScripts\('public-suffix\.js', 'journal-import-stream\.js', 'journal-text-filter\.js'\);\s*", '', sw, count=1)

    with sync_playwright() as pw, tempfile.TemporaryDirectory(prefix='webclip-p1007-') as td:
        browser=pw.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        ctx=browser.new_context()

        # Selection + PDF: actual content.js + actual Chromium PDF renderer.
        page=ctx.new_page(); page.evaluate(CONTENT_CHROME_MOCK); page.set_content(ARTICLE_HTML,wait_until='load'); page.add_script_tag(content=content)
        started=page.evaluate("__p1007Command({type:'WEBCLIP_COMMAND',command:'start'})"); assert started.get('ok') is True
        page.locator('#article').click(force=True); assert page.locator('#article').get_attribute('data-webclip-pdf-include')
        opened=page.evaluate("__p1007Command({type:'WEBCLIP_COMMAND',command:'download'})"); assert opened.get('ok') is True
        clicked=page.evaluate("""() => {const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot; const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF'); if(!b)return false;b.click();return true;}"""); assert clicked
        page.wait_for_function("() => !!globalThis.__p1007.pdfRequest",timeout=15000)
        pdf=page.pdf(print_background=True,prefer_css_page_size=True); assert pdf.startswith(b'%PDF-') and len(pdf)>1000
        pdf_path=pathlib.Path(td)/'p1-007.pdf'; pdf_path.write_bytes(pdf)
        text=subprocess.check_output(['pdftotext',str(pdf_path),'-'],text=True,timeout=10)
        assert 'P1-007 Browser Article' in text
        assert 'P1-007 NOISE MUST NOT ENTER SELECTED PDF' not in text
        page.evaluate("__p1007.pdfResolve()")

        # Journal: actual journal.js rendering through its documented service-worker fallback boundary.
        journal=ctx.new_page(); journal.evaluate(JOURNAL_CHROME_MOCK); journal.set_content(journal_html,wait_until='load'); journal.add_script_tag(content=public_suffix); journal.add_script_tag(content=journal_text_filter); journal.add_script_tag(content=journal_js)
        journal.wait_for_function("() => document.body.innerText.includes('P1-007 Journal Browser Entry')",timeout=15000)
        assert 'P1-007 Journal Browser Entry' in journal.locator('body').inner_text()
        assert 'Полный (1)' in journal.locator('body').inner_text()

        # Yandex: actual service-worker.js inside a browser Worker; only chrome.* and fetch are mocked.
        worker_page=ctx.new_page(); worker_page.set_content('<!doctype html><title>P1-007 worker host</title>')
        worker_src=SW_HARNESS+'\n'+public_suffix+'\n'+import_stream+'\n'+journal_text_filter+'\n'+sw+"\nself.onmessage=async(e)=>{try{const r=await self.__p1007Invoke(e.data);self.postMessage({ok:true,result:r,state:{stores:self.__p1007State.stores,dirs:[...self.__p1007State.dirs],requests:self.__p1007State.requests}});}catch(err){self.postMessage({ok:false,error:err?.stack||String(err)});}};"
        result=worker_page.evaluate("""async ({src})=>{const blob=new Blob([src],{type:'text/javascript'});const url=URL.createObjectURL(blob);const w=new Worker(url);const call=(m)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('worker timeout')),30000);w.onmessage=(e)=>{clearTimeout(t);e.data.ok?resolve(e.data):reject(new Error(e.data.error))};w.postMessage(m)});try{const auth=await call({type:'WEBCLIP_YANDEX_SET_MANUAL_TOKEN',token:'p1-007-browser-token'});const root=await call({type:'WEBCLIP_YANDEX_SAVE_ROOT',rootPath:'/WebClipP1007'});const test=await call({type:'WEBCLIP_YANDEX_TEST'});const list=await call({type:'WEBCLIP_YANDEX_LIST_FOLDERS',path:'/WebClipP1007'});return {auth,root,test,list};}finally{w.terminate();URL.revokeObjectURL(url)}}""",{'src':worker_src})
        assert result['auth']['result']['ok'] is True
        assert result['test']['result']['ok'] is True
        assert result['test']['result']['account']['uid']=='p1-007-mock-uid'
        stores=result['test']['state']['stores']; assert stores['session']['yandexAuth']['accessToken']=='p1-007-browser-token'; assert not stores['local'].get('yandexAuth',{}).get('accessToken')
        folders={x.get('name') for x in result['list']['result'].get('folders',[])}; assert {'Upload','ReadmeLater','Backup'}.issubset(folders)
        requests=result['list']['state']['requests']; assert any('/v1/disk' in r['url'] and r['auth']=='OAuth p1-007-browser-token' for r in requests)

        browser.close()
        print(json.dumps({'ok':True,'browser':subprocess.check_output([CHROMIUM,'--version'],text=True).strip(),'selection':True,'pdfBytes':len(pdf),'pdfSelectedOnly':True,'journalRendered':True,'yandexWorker':True,'yandexAccount':'p1-007-mock-uid','yandexFolders':sorted(folders),'mockedYandexRequests':len(requests)},ensure_ascii=False))

if __name__=='__main__': main()
