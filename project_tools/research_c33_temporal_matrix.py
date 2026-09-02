#!/usr/bin/env python3
"""Fresh C33 exact-source Chrome probe: CSS/WAAPI/transition temporal state -> PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile, time
import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
ROOT=pathlib.Path(__file__).resolve().parents[1]
BUDGET=(ROOT/'frame-proxy-budget-guard.js').read_text(encoding='utf-8');INERT=(ROOT/'frame-proxy-inert-guard.js').read_text(encoding='utf-8');HOST=(ROOT/'host-control-activation-guard.js').read_text(encoding='utf-8');CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c33={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c33.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c33Command=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c33Resolve=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c33.pdf'});return true}})();"""
STYLE="""<style>html,body{margin:0;padding:0}body{font:16px Arial}.outside{padding:14px;background:#eee}#scope{position:relative;width:620px;height:360px;margin:18px auto;border:2px solid #555;background:white}.ref{position:absolute;left:30px;top:150px;width:80px;height:60px;background:rgb(0,180,0)}.anim{position:absolute;left:150px;top:150px;width:80px;height:60px;background:rgb(220,0,220)}.omit{position:absolute;left:10px;top:300px}.frame{width:720px;height:430px;border:0}</style>"""
CSS="""<style>@keyframes c33move{from{transform:translateX(0)}to{transform:translateX(240px)}}#anim{animation:c33move 3s linear infinite}</style>""";TRANS="""<style>#anim{transition:transform 3s linear}</style>"""
def cmd(p,c):return p.evaluate("c=>__c33Command({type:'WEBCLIP_COMMAND',command:c})",c)
def inject(p):p.evaluate(MOCK);p.add_script_tag(content=BUDGET);p.add_script_tag(content=INERT);p.add_script_tag(content=HOST);p.add_script_tag(content=CONTENT)
def click(p,s):assert p.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}",s),s
def select(p,s='#scope'):
 assert cmd(p,'start').get('ok');click(p,s);assert cmd(p,'mode-exclude').get('ok');click(p,'.omit');assert cmd(p,'mode-include').get('ok')
def prepare(p):
 assert cmd(p,'download').get('ok');p.evaluate("()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot,b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');b.click()}");p.wait_for_function("()=>!!__c33.lastPdfRequest",timeout=30000);return p.evaluate("()=>__c33.lastPdfRequest")
def finish(p):assert p.evaluate("()=>__c33Resolve()") is True
def metric(p,frame=False):
 return p.evaluate("""f=>{const d=f?document.querySelector('#f').contentDocument:document,a=d.querySelector('.anim'),r=d.querySelector('.ref'),ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return{ratio:(ar.x-rr.x)/rr.width,transform:getComputedStyle(a).transform,animations:a.getAnimations().map(x=>({currentTime:x.currentTime,playState:x.playState}))}}""",frame)
def bbox(path,c):
 d=fitz.open(path);pix=d[0].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);s=pix.samples;n=pix.n;xs=[];ys=[]
 for i in range(0,len(s),n):
  r,g,b=s[i],s[i+1],s[i+2];m=(c=='g' and g>=130 and r<=80 and b<=80) or (c=='m' and r>=150 and b>=150 and g<=90)
  if m:q=i//n;xs.append(q%pix.width);ys.append(q//pix.width)
 d.close();return None if not xs else {'x0':min(xs),'x1':max(xs),'width':max(xs)-min(xs)+1,'pixels':len(xs)}
def pdfsum(path):
 rd=PdfReader(str(path));txt='\n'.join((x.extract_text() or '') for x in rd.pages);g=bbox(path,'g');m=bbox(path,'m');ratio=(m['x0']-g['x0'])/g['width'] if g and m else None;return{'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'ratio':ratio,'green':g,'magenta':m,'excludePresent':'C33_EXCLUDE_TOKEN' in txt,'outsidePresent':'C33_OUTSIDE_TOKEN' in txt}
def printpdf(p,o,n):p.emulate_media(media='screen');x=o/f'{n}.pdf';p.pdf(path=str(x),format='A4',print_background=True);return pdfsum(x)
def meta(req):
 hits=[]
 def v(x,p='meta'):
  if isinstance(x,dict):
   for k,z in x.items():
    q=f'{p}.{k}';low=str(k).lower()
    if any(t in low for t in ('animation','transition','temporal','currenttime','playstate','timeline')):hits.append(q)
    v(z,q)
  elif isinstance(x,list):
   for i,z in enumerate(x[:32]):v(z,f'{p}[{i}]')
 v((req or {}).get('meta',{}));return hits
def html(extra=''):return f"<!doctype html><meta charset='utf-8'>{STYLE}{extra}<div class='outside'>C33_OUTSIDE_TOKEN</div><main id='scope'><div id='ref' class='ref'></div><div id='anim' class='anim'></div><div class='omit'>C33_EXCLUDE_TOKEN</div></main>"
def temporal(ctx,o,k,freeze=False,paused=False):
 p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(html(CSS if k=='css' else TRANS if k=='transition' else ''),wait_until='load')
 if k=='waapi':p.evaluate("()=>{__wa=document.querySelector('.anim').animate([{transform:'translateX(0px)'},{transform:'translateX(240px)'}],{duration:3000,iterations:Infinity,easing:'linear'})}")
 if k=='transition':p.evaluate("()=>{const a=document.querySelector('.anim');getComputedStyle(a).transform;a.style.transform='translateX(240px)'}")
 inject(p);select(p);p.wait_for_timeout(80);p.evaluate("pause=>{const x=document.querySelector('.anim').getAnimations()[0];if(!x)throw Error('animation missing');x.currentTime=600;pause?x.pause():x.play()}",paused);p.wait_for_timeout(30);a=metric(p)
 if freeze:p.evaluate("()=>{const a=document.querySelector('.anim'),t=getComputedStyle(a).transform;a.getAnimations().forEach(x=>x.cancel());a.style.setProperty('animation','none','important');a.style.setProperty('transition','none','important');a.style.setProperty('transform',t,'important')}")
 t=time.perf_counter();req=prepare(p);prep=metric(p);ms=round((time.perf_counter()-t)*1000,1);p.wait_for_timeout(900);pre=metric(p);pdf=printpdf(p,o,f'{k}_{"freeze" if freeze else "paused" if paused else "current"}');finish(p);p.close();return{'admission':a,'prepared':prep,'prePrint':pre,'prepareMs':ms,'pdf':pdf,'temporalMetaPaths':meta(req)}
def frame_html():return """<!doctype html><meta charset='utf-8'><style>html,body{margin:0;padding:0}body{position:relative;width:620px;height:360px;font:16px Arial}.ref{position:absolute;left:30px;top:150px;width:80px;height:60px;background:rgb(0,180,0)}.anim{position:absolute;left:150px;top:150px;width:80px;height:60px;background:rgb(220,0,220)}.omit{position:absolute;left:10px;top:300px}</style><div class='ref'></div><div class='anim'></div><div class='omit'>C33_EXCLUDE_TOKEN</div><script>__wa=document.querySelector('.anim').animate([{transform:'translateX(0px)'},{transform:'translateX(240px)'}],{duration:3000,iterations:Infinity,easing:'linear'});__wa.currentTime=600</script>"""
def frame(ctx,o,causal=False):
 p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C33_OUTSIDE_TOKEN</div><iframe id='f' class='frame'></iframe>");p.locator('#f').evaluate('(f,h)=>f.srcdoc=h',frame_html());p.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.querySelector('.anim')");inject(p);assert cmd(p,'start').get('ok');p.evaluate("()=>document.querySelector('#f').contentDocument.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(p,'mode-exclude').get('ok');p.evaluate("()=>document.querySelector('#f').contentDocument.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(p,'mode-include').get('ok');p.evaluate("()=>{const x=document.querySelector('#f').contentDocument.querySelector('.anim').getAnimations()[0];x.currentTime=600;x.play()}");p.wait_for_timeout(30);adm=metric(p,True);t=adm['transform'];req=prepare(p);src=metric(p,True)
 prox=p.evaluate("""()=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),a=q?.querySelector('.anim'),r=q?.querySelector('.ref');if(!a||!r)return null;const ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return{ratio:(ar.x-rr.x)/rr.width,transform:getComputedStyle(a).transform,animationCount:a.getAnimations().length}}""")
 after=None
 if causal:after=p.evaluate("""t=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),a=q.querySelector('.anim'),r=q.querySelector('.ref');a.getAnimations().forEach(x=>x.cancel());a.style.setProperty('animation','none','important');a.style.setProperty('transition','none','important');a.style.setProperty('transform',t,'important');const ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return{ratio:(ar.x-rr.x)/rr.width,transform:getComputedStyle(a).transform,animationCount:a.getAnimations().length}}""",t)
 p.wait_for_timeout(900);pre=metric(p,True);pdf=printpdf(p,o,'frame_causal' if causal else 'frame_current');finish(p);p.close();return{'admission':adm,'preparedSource':src,'prePrintSource':pre,'proxy':prox,'proxyAfter':after,'pdf':pdf,'temporalMetaPaths':meta(req)}
def run(ch,o):
 o.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=ch,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);c=b.new_context();r={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'cssCurrent':temporal(c,o,'css'),'cssFrozen':temporal(c,o,'css',freeze=True),'cssPaused':temporal(c,o,'css',paused=True),'waapiCurrent':temporal(c,o,'waapi'),'transitionCurrent':temporal(c,o,'transition'),'frameCurrent':frame(c,o),'frameCausal':frame(c,o,True)};b.close()
 payload=json.dumps(r,sort_keys=True,separators=(',',':'));r['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C33_RESULT_JSON='+json.dumps(r,sort_keys=True,separators=(',',':')),flush=True)
 for k in ['cssCurrent','cssFrozen','cssPaused','waapiCurrent','transitionCurrent','frameCurrent','frameCausal']:
  x=r[k]['pdf'];assert x['ratio'] is not None and not x['excludePresent'] and not x['outsidePresent'],(k,x)
 f=r['cssFrozen'];assert abs(f['prePrint']['ratio']-f['admission']['ratio'])<.08 and abs(f['pdf']['ratio']-f['admission']['ratio'])<.25,f
 q=r['cssPaused'];assert abs(q['prePrint']['ratio']-q['admission']['ratio'])<.08 and abs(q['pdf']['ratio']-q['admission']['ratio'])<.25,q
 for k in ['cssCurrent','waapiCurrent','transitionCurrent']:assert r[k]['prePrint']['ratio']-r[k]['admission']['ratio']>.35,(k,r[k])
 fc=r['frameCausal'];assert fc['proxyAfter'] and abs(fc['proxyAfter']['ratio']-fc['admission']['ratio'])<.15 and abs(fc['pdf']['ratio']-fc['admission']['ratio'])<.3,fc
 return r
def main():
 p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args();assert a.chrome;run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c33-')))
if __name__=='__main__':main()
