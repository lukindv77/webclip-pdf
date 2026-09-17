(() => {
  if (window.top === window) return;
  try {
    // Same-origin child frames are already handled recursively by top content.js.
    // A frame-agent is needed only where the immediate parent DOM is blocked by SOP.
    void window.parent.document;
    return;
  } catch (_) {}
  if (globalThis.__WEBCLIP_FRAME_AGENT_LOADED__) {
    try { chrome.runtime.sendMessage({ type: 'WEBCLIP_FRAME_AGENT_REGISTER' }).catch(() => {}); } catch (_) {}
    return;
  }
  globalThis.__WEBCLIP_FRAME_AGENT_LOADED__ = true;

  const INCLUDE_ATTR = 'data-webclip-remote-include';
  const EXCLUDE_ATTR = 'data-webclip-remote-exclude';
  const STYLE_ID = 'webclip-remote-frame-style';
  const PRINT_STYLE_ID = 'webclip-remote-frame-print-style';
  const MAX_SELECTIONS = 250;
  const state = { phase: 'idle', mode: 'include', includes: new Map(), excludes: new Map(), nextId: 1, printStyle: null, changedAttrs: [], selectionGeneration: null };

  function normalizeText(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function normalizeHref(v) { try { return new URL(String(v || '')).href; } catch (_) { return String(v || ''); } }
  function currentApplicationGeneration(reason='remote-frame-check') {
    const api=globalThis.WebClipApplicationGeneration;
    if(!api||typeof api.receipt!=='function'||typeof api.observe!=='function')return null;
    try{api.observe(reason);const r=api.receipt();return r&&Number(r.generation)>0?{generation:Number(r.generation),href:normalizeHref(r.href),reason:String(r.reason||'').slice(0,80)}:null}catch(_){return null}
  }
  function sameApplicationGeneration(a,b){return Boolean(a&&b)&&Number(a.generation)===Number(b.generation)&&normalizeHref(a.href)===normalizeHref(b.href)}
  function selectedCount(){return state.includes.size+state.excludes.size}
  function removeSelectionMarkers(){
    for(const el of state.includes.values())try{el.removeAttribute(INCLUDE_ATTR)}catch(_){}
    for(const el of state.excludes.values())try{el.removeAttribute(EXCLUDE_ATTR)}catch(_){}
    state.includes.clear();state.excludes.clear();state.selectionGeneration=null;
  }
  function staleGenerationFailure(code='WEBCLIP_SELECTION_STALE_GENERATION',reason='Remote-frame selection belongs to a stale application generation.'){
    removeSelectionMarkers();sendState({phase:state.phase,generationInvalidated:true,code});
    return{ok:false,code,error:reason};
  }
  function admitSelectionGeneration(reason='remote-frame-admission'){
    if(!selectedCount())return{ok:true,receipt:currentApplicationGeneration(reason)};
    const current=currentApplicationGeneration(reason);
    if(!current||!state.selectionGeneration)return staleGenerationFailure('WEBCLIP_SELECTION_UNTRACKED','Remote-frame selection has no current application-generation receipt.');
    if(!sameApplicationGeneration(state.selectionGeneration,current))return staleGenerationFailure();
    return{ok:true,receipt:current};
  }
  function prepareSelectionMutation(reason='remote-frame-selection'){
    const current=currentApplicationGeneration(reason);
    if(!current){
      if(selectedCount())staleGenerationFailure('WEBCLIP_SELECTION_UNTRACKED','Remote-frame application generation is unavailable.');
      return null;
    }
    if(selectedCount()&&state.selectionGeneration&&!sameApplicationGeneration(state.selectionGeneration,current))removeSelectionMarkers();
    if(selectedCount()&&!state.selectionGeneration)removeSelectionMarkers();
    state.selectionGeneration=current;
    return current;
  }
  function elementText(el, n=180) { return normalizeText(el?.innerText || el?.textContent || '').slice(0,n); }
  function domPath(el, doc=document) {
    if (!el || el.nodeType !== 1 || el === doc.body) return [];
    const out=[]; let cur=el;
    while (cur && cur !== doc.body && out.length < 128) {
      const p=cur.parentElement; if (!p) return [];
      const i=[...p.children].indexOf(cur); if (i < 0) return [];
      out.unshift(i); cur=p;
    }
    return cur === doc.body ? out : [];
  }
  function cssPath(el, doc=document) {
    if (!el || el.nodeType !== 1) return '';
    const parts=[]; let cur=el;
    while (cur && cur !== doc.documentElement && parts.length < 64) {
      if (cur === doc.body) { parts.unshift('body'); break; }
      if (cur.id) {
        try { const q=`#${CSS.escape(cur.id)}`; if (doc.querySelectorAll(q).length === 1) { parts.unshift(q); break; } } catch (_) {}
      }
      const tag=cur.localName || '*';
      const sib=cur.parentElement ? [...cur.parentElement.children].filter(x=>x.localName===cur.localName) : [];
      const idx=Math.max(1,sib.indexOf(cur)+1);
      parts.unshift(sib.length>1 ? `${tag}:nth-of-type(${idx})` : tag); cur=cur.parentElement;
    }
    return parts.join(' > ');
  }
  function locator(el) {
    const p=el?.parentElement || null; const siblings=p?[...p.children]:[];
    const same=p?siblings.filter(x=>x.localName===el?.localName):[];
    return {
      cssPath:cssPath(el), domPath:domPath(el), tag:String(el?.localName||'').toLowerCase(), id:String(el?.id||'').slice(0,512),
      classes:[...(el?.classList||[])].filter(x=>x&&!x.startsWith('webclip-')).slice(0,16).map(x=>String(x).slice(0,240)),
      text:elementText(el,240), ariaLabel:String(el?.getAttribute?.('aria-label')||'').slice(0,240), name:String(el?.getAttribute?.('name')||'').slice(0,240),
      title:String(el?.getAttribute?.('title')||'').slice(0,240), src:String(el?.getAttribute?.('src')||'').slice(0,2000), role:String(el?.getAttribute?.('role')||'').slice(0,120),
      href:String(el?.getAttribute?.('href')||'').slice(0,2000), parentTag:String(p?.localName||'').toLowerCase(), parentId:String(p?.id||'').slice(0,512),
      parentRole:String(p?.getAttribute?.('role')||'').slice(0,120), parentText:elementText(p,240), previousText:elementText(el?.previousElementSibling,180),
      nextText:elementText(el?.nextElementSibling,180), siblingIndex:Math.max(-1,siblings.indexOf(el)), sameTagIndex:Math.max(-1,same.indexOf(el)), framePath:[]
    };
  }
  function snapshot() { return { version:3, includes:[...state.includes.values()].map(locator), excludes:[...state.excludes.values()].map(locator) }; }
  function sendState(extra={}) { try { chrome.runtime.sendMessage({ type:'WEBCLIP_FRAME_AGENT_STATE', snapshot:snapshot(), ...extra }).catch(()=>{}); } catch (_) {} }
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`@media screen{[${INCLUDE_ATTR}]{outline:3px solid #188038!important;outline-offset:-2px!important}[${EXCLUDE_ATTR}]{outline:3px solid #d93025!important;outline-offset:-2px!important}}`;
    (document.head||document.documentElement).appendChild(s);
  }
  function usable(el) { if (!el || el.nodeType!==1) return false; const r=el.getBoundingClientRect(); return r.width>=2&&r.height>=2; }
  function contains(a,b) { try { return a===b || a.contains(b); } catch (_) { return false; } }
  function containing(map,el) { for (const v of map.values()) if (contains(v,el)) return v; return null; }
  function exact(map,el) { for (const [k,v] of map) if(v===el) return k; return ''; }
  function clear() { removeSelectionMarkers(); sendState(); }
  function addInclude(el) {
    if(!prepareSelectionMutation('remote-include'))return;
    const key=exact(state.includes,el); if(key){el.removeAttribute(INCLUDE_ATTR);state.includes.delete(key);cleanupExcludes();if(!selectedCount())state.selectionGeneration=null;sendState();return;}
    if(containing(state.includes,el)) return;
    if(state.includes.size>=MAX_SELECTIONS) return;
    for(const [k,v] of [...state.includes]) if(contains(el,v)){try{v.removeAttribute(INCLUDE_ATTR)}catch(_){} state.includes.delete(k)}
    const id=String(state.nextId++); el.setAttribute(INCLUDE_ATTR,id); state.includes.set(id,el); cleanupExcludes(); sendState();
  }
  function addExclude(el) {
    if(!prepareSelectionMutation('remote-exclude'))return;
    const key=exact(state.excludes,el); if(key){el.removeAttribute(EXCLUDE_ATTR);state.excludes.delete(key);if(!selectedCount())state.selectionGeneration=null;sendState();return;}
    if(!containing(state.includes,el)||containing(state.excludes,el)||state.excludes.size>=MAX_SELECTIONS) return;
    const id=String(state.nextId++); el.setAttribute(EXCLUDE_ATTR,id); state.excludes.set(id,el); sendState();
  }
  function cleanupExcludes(){for(const[k,v]of[...state.excludes])if(!containing(state.includes,v)){try{v.removeAttribute(EXCLUDE_ATTR)}catch(_){}state.excludes.delete(k)}}
  function click(ev){
    if(state.phase==='review'||state.phase==='printing'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();return}
    if(state.phase!=='selecting')return;
    const el=ev.target?.nodeType===1?ev.target:null; if(!usable(el))return;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation(); state.mode==='exclude'?addExclude(el):addInclude(el);
  }
  function key(ev){if(state.phase!=='idle'&&ev.key==='Escape'){state.phase='idle';document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);sendState({phase:'idle'})}}
  function start(mode='include'){ensureStyle();state.phase='selecting';state.mode=mode==='exclude'?'exclude':'include';document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);sendState({phase:'selecting'})}
  function stop(clearToo=false){document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);state.phase='idle';if(clearToo)clear();else sendState({phase:'idle'})}

  function resolveDom(path){let n=document.body;if(!Array.isArray(path))return null;for(const x of path){const i=Number(x);if(!Number.isInteger(i)||i<0||!n?.children?.[i])return null;n=n.children[i]}return n}
  function sim(a,b){a=normalizeText(a).toLowerCase().slice(0,240);b=normalizeText(b).toLowerCase().slice(0,240);if(!a||!b)return 0;if(a===b)return 24;if(a.length>=16&&b.length>=16&&(a.includes(b)||b.includes(a)))return 16;const A=new Set(a.split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>=2).slice(0,32)),B=new Set(b.split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>=2).slice(0,32));if(!A.size||!B.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;const r=inter/(A.size+B.size-inter);return r>=.8?14:r>=.6?10:r>=.4?6:0}
  function score(l,c,css,dom){if(l.tag&&String(c.localName||'').toLowerCase()!==String(l.tag).toLowerCase())return -999;let s=4;const ex=(f,a,w,p=0)=>{const q=String(l[f]||'');if(!q)return;const v=String(a==='id'?c.id||'':c.getAttribute?.(a)||'');s+=v===q?w:-p};ex('id','id',36,10);ex('ariaLabel','aria-label',14,3);ex('name','name',10,2);ex('title','title',6,1);ex('src','src',10,2);ex('role','role',9,2);ex('href','href',14,3);let cm=0;for(const x of (Array.isArray(l.classes)?l.classes.slice(0,8):[]))if(c.classList?.contains(x))cm++;s+=Math.min(16,cm*2);if(l.classes?.length&&!cm)s-=3;if(l.text){const z=sim(l.text,elementText(c,240));s+=z;if(!z)s-=6}const p=c.parentElement;if(l.parentTag)s+=String(p?.localName||'').toLowerCase()===String(l.parentTag).toLowerCase()?4:-3;if(l.parentId)s+=String(p?.id||'')===String(l.parentId)?8:-3;if(l.parentRole)s+=String(p?.getAttribute?.('role')||'')===String(l.parentRole)?5:-2;if(l.parentText)s+=Math.floor(sim(l.parentText,elementText(p,200))/4);if(l.previousText)s+=Math.floor(sim(l.previousText,elementText(c.previousElementSibling,160))/4);if(l.nextText)s+=Math.floor(sim(l.nextText,elementText(c.nextElementSibling,160))/4);const sib=p?[...p.children]:[],idx=sib.indexOf(c);if(Number.isInteger(l.siblingIndex)&&l.siblingIndex>=0&&idx>=0){const d=Math.abs(l.siblingIndex-idx);if(!d)s+=4;else if(d===1)s+=2}if(Number.isInteger(l.sameTagIndex)&&l.sameTagIndex>=0&&p){const same=sib.filter(x=>x.localName===c.localName),i=same.indexOf(c),d=Math.abs(l.sameTagIndex-i);if(!d)s+=3;else if(d===1)s+=1}if(css===c)s+=6;if(dom===c)s+=4;return s}
  function tagCandidatesBounded(tag,limit=5000){const out=[];const cap=Math.max(0,Math.min(5000,Math.floor(Number(limit)||0)));if(!cap)return out;let c=null;try{c=document.getElementsByTagName(String(tag||'*').toLowerCase()||'*')}catch(_){c=null}if(!c)return out;const n=Math.min(cap,Math.max(0,Number(c.length)||0));for(let i=0;i<n;i++){const el=c[i];if(el?.nodeType===1)out.push(el)}return out}
  function resolve(l){if(!l||typeof l!=='object'||(Array.isArray(l.framePath)&&l.framePath.length))return{element:null,confidence:'none',ambiguous:false};let css=null;try{if(l.cssPath)css=document.querySelector(l.cssPath)}catch(_){}const dom=resolveDom(l.domPath);let cand=[];try{cand=tagCandidatesBounded(String(l.tag||'*').toLowerCase()||'*',5000)}catch(_){}const ranked=cand.map(c=>({element:c,score:score(l,c,css,dom)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);const a=ranked[0],b=ranked[1];if(!a||a.score<34)return{element:null,confidence:'none',ambiguous:false};const m=b?a.score-b.score:Infinity;if(b&&b.score>=28&&m<18)return{element:null,confidence:'ambiguous',ambiguous:true};return{element:a.element,confidence:a.score>=60&&m>=22?'high':'medium',ambiguous:false}}
  function restoreOne(kind,l){if(!prepareSelectionMutation('remote-restore'))return{ok:false,ambiguous:false,confidence:'none'};const r=resolve(l);if(!r.element||r.ambiguous||!usable(r.element))return{ok:false,ambiguous:!!r.ambiguous,confidence:r.confidence};if(kind==='include')addInclude(r.element);else if(containing(state.includes,r.element))addExclude(r.element);else return{ok:false,ambiguous:false,confidence:r.confidence};return{ok:true,ambiguous:false,confidence:r.confidence}}

  function rememberAttr(el,name){state.changedAttrs.push({el,name,had:el.hasAttribute(name),value:el.getAttribute(name)})}
  async function prefetchSelected(){
    const imgs=[];for(const root of state.includes.values()){if(root.matches?.('img'))imgs.push(root);for(const x of root.querySelectorAll?.('img')||[])imgs.push(x);if(imgs.length>=100)break}
    let loaded=0,failed=0;const end=Date.now()+5000;
    for(const img of imgs.slice(0,100)){if(Date.now()>=end)break;try{const ds=img.getAttribute('data-src');if(!img.getAttribute('src')&&ds){rememberAttr(img,'src');img.setAttribute('src',ds.slice(0,8192))}if(img.getAttribute('loading')==='lazy'){rememberAttr(img,'loading');img.setAttribute('loading','eager')}if(img.complete&&img.naturalWidth>0){loaded++;continue}await Promise.race([img.decode?.()||Promise.resolve(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),Math.min(1200,Math.max(50,end-Date.now()))))]);loaded++}catch(_){failed++}}
    return{attempted:Math.min(imgs.length,100),loaded,failed};
  }
  async function preparePrint(){
    const admission=admitSelectionGeneration('remote-prepare-print');if(!admission.ok)return admission;
    state.phase='printing';const resourceReport=await prefetchSelected();
    const documentHeight=Math.max(0,Math.min(200000,Math.ceil(Math.max(document.documentElement?.scrollHeight||0,document.body?.scrollHeight||0))));
    const s=document.createElement('style');s.id=PRINT_STYLE_ID;s.textContent=`@media print{body *:not([${INCLUDE_ATTR}]):not([${INCLUDE_ATTR}] *):not(:has([${INCLUDE_ATTR}])){display:none!important}[${EXCLUDE_ATTR}],[${EXCLUDE_ATTR}] *{display:none!important}html,body{overflow:visible!important;height:auto!important;max-height:none!important}}`; (document.head||document.documentElement).appendChild(s);state.printStyle=s;return{ok:true,resourceReport,documentHeight};
  }
  function restorePrint(){try{state.printStyle?.remove()}catch(_){}state.printStyle=null;for(const x of state.changedAttrs.reverse()){try{x.had?x.el.setAttribute(x.name,x.value??''):x.el.removeAttribute(x.name)}catch(_){}}state.changedAttrs=[];if(state.phase==='printing')state.phase='selecting';return{ok:true}}

  chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
    if(sender?.id!==chrome.runtime.id||msg?.type!=='WEBCLIP_FRAME_AGENT_COMMAND')return false;
    Promise.resolve().then(async()=>{switch(String(msg.command||'')){
      case'start':start(msg.mode);return{ok:true,snapshot:snapshot()}; case'set-mode':state.mode=msg.mode==='exclude'?'exclude':'include';return{ok:true}; case'clear':clear();return{ok:true}; case'stop':stop(Boolean(msg.clear));return{ok:true}; case'get-state':{const a=admitSelectionGeneration('remote-get-state');return a.ok?{ok:true,snapshot:snapshot(),phase:state.phase}:a;} case'restore':return{ok:true,result:restoreOne(msg.kind,msg.locator)}; case'prepare-print':return preparePrint(); case'restore-print':return restorePrint(); default:return{ok:false,error:'Unknown frame-agent command'} }
    }).then(sendResponse).catch(e=>sendResponse({ok:false,error:e?.message||String(e)}));return true;
  });

  try { chrome.runtime.sendMessage({type:'WEBCLIP_FRAME_AGENT_REGISTER'}).catch(()=>{}); } catch (_) {}
})();
