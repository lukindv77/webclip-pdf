#!/opt/pyvenv/bin/python
"""P1-004 policy-safe browser regression for granted cross-origin iframe frame-agent flow."""
import json
import os
import pathlib
import subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
CONTENT = (ROOT / 'content.js').read_text()
AGENT = (ROOT / 'frame-agent.js').read_text()

TOP_HTML = '''<!doctype html><html><body><h1>Top page</h1><iframe id="remote" sandbox="allow-scripts" style="width:700px;height:350px;border:1px solid #999"></iframe></body></html>'''

CHILD_HTML = '''<!doctype html><html><body>
<main><article id="inside" role="article" aria-label="Remote article" style="display:block;width:500px;height:900px;padding:12px">
<h2>Cross origin article</h2><p>Remote frame content selected through granted host access.</p>
</article></main>
</body></html>'''

TOP_MOCK = r'''
(() => {
  const runtimeListeners=[];
  const pending=new Map();
  let seq=0;
  const state={frame:null,lastPdfRequest:null,targetCommands:[],remoteEvents:[]};
  globalThis.__p1004=state;

  function deliver(message){
    state.remoteEvents.push(structuredClone(message));
    for(const fn of runtimeListeners){
      try{fn(message,{id:'ext'},()=>{});}catch(_){}
    }
  }

  window.addEventListener('message',(event)=>{
    const data=event.data||{};
    if(data.__p1004!=='agent')return;
    if(data.kind==='register'){
      state.frame={frameId:1,documentId:'doc-child-1',url:String(data.url||''),registeredAt:Date.now()};
      deliver({type:'WEBCLIP_REMOTE_FRAME_EVENT',event:'register',frame:state.frame});
      return;
    }
    if(data.kind==='state'){
      if(!state.frame)state.frame={frameId:1,documentId:'doc-child-1',url:String(data.url||''),registeredAt:Date.now()};
      deliver({type:'WEBCLIP_REMOTE_FRAME_EVENT',event:'state',frame:state.frame,snapshot:data.snapshot,phase:data.phase||''});
      return;
    }
    if(data.kind==='response'){
      const pair=pending.get(data.id); if(!pair)return;
      pending.delete(data.id); pair.resolve(data.response);
    }
  });

  globalThis.chrome={runtime:{
    id:'ext',
    onMessage:{addListener(fn){runtimeListeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:state.frame?[state.frame]:[]});
      if(message?.type==='WEBCLIP_FRAME_AGENT_TARGET'){
        const id=String(++seq); state.targetCommands.push({command:message.command,frameId:message.frameId});
        return new Promise((resolve,reject)=>{
          pending.set(id,{resolve,reject});
          const frame=document.getElementById('remote');
          if(!frame?.contentWindow){pending.delete(id);reject(new Error('remote frame missing'));return;}
          frame.contentWindow.postMessage({__p1004:'top',kind:'command',id,message:{type:'WEBCLIP_FRAME_AGENT_COMMAND',command:message.command,mode:message.mode,clear:message.clear,kind:message.kind,locator:message.locator}},'*');
          setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('frame command timeout'));}},3000);
        });
      }
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        state.lastPdfRequest=structuredClone(message);
        state.frameMarked=document.getElementById('remote')?.hasAttribute('data-webclip-pdf-frame-include')||false;
        state.frameHeightAtPdf=parseFloat(document.getElementById('remote')?.style?.height||'0')||0;
        return Promise.resolve({ok:true,filename:'p1-004.pdf'});
      }
      return Promise.resolve({ok:true});
    }
  }};

  globalThis.__p1004Command=(message)=>new Promise((resolve,reject)=>{
    const fn=runtimeListeners[0]; if(!fn)return reject(new Error('content listener missing'));
    let done=false; const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{const ret=fn(message,{id:'ext'},send);if(ret!==true&&!done)send({ok:true});}catch(e){reject(e)}
  });
})();
'''

CHILD_MOCK = r'''
(() => {
  const runtimeListeners=[];
  globalThis.__p1004child={commands:[],states:[]};
  globalThis.chrome={runtime:{
    id:'ext',
    onMessage:{addListener(fn){runtimeListeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_REGISTER'){
        window.parent.postMessage({__p1004:'agent',kind:'register',url:'https://frame.test/child'},'*');
        return Promise.resolve({ok:true,frameId:1});
      }
      if(message?.type==='WEBCLIP_FRAME_AGENT_STATE'){
        globalThis.__p1004child.states.push(structuredClone(message));
        window.parent.postMessage({__p1004:'agent',kind:'state',url:'https://frame.test/child',snapshot:message.snapshot,phase:message.phase||''},'*');
        return Promise.resolve({ok:true});
      }
      return Promise.resolve({ok:true});
    }
  }};
  window.addEventListener('message',(event)=>{
    const data=event.data||{};
    if(event.source!==window.parent||data.__p1004!=='top'||data.kind!=='command')return;
    const fn=runtimeListeners[0];
    if(!fn){window.parent.postMessage({__p1004:'agent',kind:'response',id:data.id,response:{ok:false,error:'agent listener missing'}},'*');return;}
    globalThis.__p1004child.commands.push(String(data.message?.command||''));
    let done=false;
    const send=(response)=>{if(done)return;done=true;window.parent.postMessage({__p1004:'agent',kind:'response',id:data.id,response},'*')};
    try{const ret=fn(data.message,{id:'ext'},send);if(ret!==true&&!done)send({ok:true});}catch(e){send({ok:false,error:e?.message||String(e)})}
  });
})();
'''



def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        ctx = browser.new_context()
        page = ctx.new_page()
        page.set_content(TOP_HTML, wait_until='load')
        # sandbox without allow-same-origin creates an opaque-origin child. The
        # parent cannot read its DOM, matching the SOP boundary of a real
        # cross-origin iframe without making network navigation that policy blocks.
        page.evaluate("(html) => { const f=document.getElementById('remote'); f.srcdoc=html; }", CHILD_HTML)
        page.wait_for_function("() => document.getElementById('remote')?.contentWindow")
        frame = next((f for f in page.frames if f != page.main_frame), None)
        assert frame is not None
        # Production receives an https frame URL from Chrome sender metadata.
        # In this policy-safe harness, expose the same identity to content.js
        # while the actual child remains opaque-origin/sandboxed.
        page.evaluate("""() => {
          const nativeGet=HTMLIFrameElement.prototype.getAttribute;
          HTMLIFrameElement.prototype.getAttribute=function(name){
            if(this.id==='remote' && String(name).toLowerCase()==='src') return 'https://frame.test/child';
            return nativeGet.call(this,name);
          };
        }""")

        page.evaluate(TOP_MOCK)
        frame.evaluate(CHILD_MOCK)
        frame.add_script_tag(content=AGENT)
        page.wait_for_function('() => !!globalThis.__p1004.frame')
        page.add_script_tag(content=CONTENT)

        result = page.evaluate("__p1004Command({type:'WEBCLIP_COMMAND',command:'start'})")
        assert result.get('ok') is True, result
        frame.wait_for_function("() => globalThis.__p1004child.commands.includes('start')")

        frame.locator('#inside').click()
        page.wait_for_function("() => document.getElementById('webclip-pdf-extension-root')?.shadowRoot?.querySelector('.count')?.textContent.includes('Включены: 1')")
        assert frame.locator('#inside').get_attribute('data-webclip-remote-include') is not None

        result = page.evaluate("__p1004Command({type:'WEBCLIP_COMMAND',command:'download'})")
        assert result.get('ok') is True, result
        clicked = page.evaluate("""() => {const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true;}""")
        assert clicked
        page.wait_for_function('() => !!globalThis.__p1004.lastPdfRequest', timeout=10000)
        payload = page.evaluate('__p1004')
        snap = payload['lastPdfRequest']['meta']['selectionSnapshot']
        assert snap['version'] == 3, snap
        assert len(snap['includes']) == 1, snap
        loc = snap['includes'][0]
        assert loc['id'] == 'inside', loc
        assert len(loc['framePath']) == 1, loc
        assert loc['framePath'][0]['id'] == 'remote', loc
        assert payload['frameMarked'] is True, payload
        assert payload['frameHeightAtPdf'] > 350, payload
        child_commands = frame.evaluate('__p1004child.commands')
        assert 'prepare-print' in child_commands, child_commands
        assert 'restore-print' in child_commands, child_commands

        # Reapply the persisted cross-origin locator after clearing the remote frame.
        result = page.evaluate("([snapshot]) => __p1004Command({type:'WEBCLIP_APPLY_SELECTION_SNAPSHOT',snapshot})", [snap])
        assert result['restoredIncludes'] == 1, result
        assert result['failedIncludes'] == 0, result
        page.wait_for_function("() => document.getElementById('webclip-pdf-extension-root')?.shadowRoot?.querySelector('.count')?.textContent.includes('Включены: 1')")
        assert frame.locator('#inside').get_attribute('data-webclip-remote-include') is not None

        # The top page cannot read child DOM directly: this proves the tested frame is genuinely cross-origin.
        cross_origin_blocked = page.evaluate("""() => {try{return document.getElementById('remote').contentDocument===null}catch(e){return true}}""")
        assert cross_origin_blocked is True

        browser.close()
        print(json.dumps({
            'ok': True,
            'browser': subprocess.check_output([CHROMIUM,'--version'], text=True).strip(),
            'crossOriginBlockedDirectDom': True,
            'remoteIncludeCount': 1,
            'snapshotFramePathLength': len(loc['framePath']),
            'restoreIncludes': result['restoredIncludes'],
            'preparePrint': 'prepare-print' in child_commands,
            'restorePrint': 'restore-print' in child_commands,
            'expandedFrameHeightPx': payload['frameHeightAtPdf']
        }, ensure_ascii=False))


if __name__ == '__main__':
    main()
