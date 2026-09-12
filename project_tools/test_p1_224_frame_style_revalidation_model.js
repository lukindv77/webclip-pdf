'use strict';
// P1-224 source-executed research and a proposed declaration/marker model.
function runFrameStyleResearch(source, log = () => {}) {
  const checks = [];
  const ok=(v,m='assertion failed')=>{if(!v)throw Error(m);};
  const eq=(a,b)=>ok(a===b,'expected '+String(b)+', got '+String(a));
  const same=(a,b)=>a.present===b.present&&a.value===b.value&&a.priority===b.priority;
  const check=(name,fn)=>{fn();checks.push(name);log('PASS '+name);};
  const cut=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i+a.length);ok(i>=0&&j>i,'source anchor '+a);return source.slice(i,j);};
  const include='data-webclip-pdf-frame-include',chain='data-webclip-pdf-frame-chain';
  // Synthetic declaration storage: no claim to implement a browser CSS parser.
  class Element {
    constructor(){this.attrs=new Map();this.decls=new Map();this.stylePresent=false;this.writes=0;this.isConnected=true;this.ownerDocument={defaultView:{getComputedStyle:()=>({display:'block',opacity:'1'})}};
      this.style={setProperty:(p,v,q='')=>{if(this.failCSS===p)throw Error('controlled CSS failure');if(this.ignoreCSS===p)return;this.decls.set(p,{value:String(v),priority:q});this.stylePresent=true;this.writes++;this.afterCSS?.(p);if(this.failAfterCSS===p)throw Error('controlled post-effect failure');},
        removeProperty:p=>{if(this.failCSS===p)throw Error('controlled CSS failure');this.decls.delete(p);this.writes++;},
        getPropertyValue:p=>{if(this.failRead===p)throw Error('controlled read failure');return this.decls.get(p)?.value||'';},
        getPropertyPriority:p=>this.decls.get(p)?.priority||''};
    }
    getAttribute(n){if(n==='style')return this.stylePresent?JSON.stringify([...this.decls]):null;return this.attrs.get(n)??null;}
    hasAttribute(n){return n==='style'?this.stylePresent:this.attrs.has(n);}
    setAttribute(n,v){if(this.failAttr===n)throw Error('controlled attribute failure');if(n==='style'){this.decls=new Map(JSON.parse(v));this.stylePresent=true;}else this.attrs.set(n,String(v));this.writes++;}
    removeAttribute(n){if(this.failAttr===n)throw Error('controlled attribute failure');if(n==='style'){this.decls.clear();this.stylePresent=false;}else this.attrs.delete(n);this.writes++;}
    getBoundingClientRect(){return {width:800,height:100};}
  }
  function harness(){
    const state={changedFrameStyles:[]};
    const helpers=cut("  function rememberFramePrintMutation(", "  function markFrameChainsForPrint()");
    const cleanup=cut("    for (const item of [...(state.changedFrameStyles || [])].reverse()) {","    if (state.host?.isConnected)");
    const measure=cut("  function measureSelectedFrameHeightAtPrintWidth(", "  function frameDepthForPrintProxy(");
    return new Function('state','FRAME_INCLUDE_ATTR','FRAME_CHAIN_ATTR','SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX',
      helpers+measure+'\nreturn {state,remember:rememberFramePrintMutation,apply:applySelectedFramePrintFlow,restore:restoreFramePrintMutation,measure:measureSelectedFrameHeightAtPrintWidth,clean(){'+cleanup+'}};'
    )(state,include,chain,794);
  }
  const css=(e,p)=>e.style.getPropertyValue(p);
  function current(kind='frame'){const e=new Element(),h=harness();e.style.setProperty('position','relative');e.style.setProperty('color','black');h.remember(e,kind);h.apply(e,kind,100);return {e,h};}
  check('current: whole-style restoration erases unrelated host property',()=>{for(const kind of ['frame','chain']){const {e,h}=current(kind);e.style.setProperty('color','red');h.clean();eq(css(e,'color'),'black');}});
  check('current: touched value and priority supersession are overwritten',()=>{for(const priority of ['','important']){const {e,h}=current();e.style.setProperty('position','fixed',priority);h.clean();eq(css(e,'position'),'relative');eq(e.style.getPropertyPriority('position'),'');}});
  check('current: originally absent style causes deletion of new host style',()=>{const e=new Element(),h=harness();h.remember(e);h.apply(e);e.style.setProperty('color','red');h.clean();eq(e.hasAttribute('style'),false);});
  check('current: changed or removed frame markers are overwritten',()=>{for(const name of [include,chain]){const e=new Element(),h=harness();e.setAttribute(name,'host-old');h.remember(e);e.setAttribute(name,'1');e.removeAttribute(name);h.clean();eq(e.getAttribute(name),'host-old');}});
  check('current: style exception suppresses marker restore then loses receipt',()=>{const e=new Element(),h=harness();h.remember(e);h.apply(e);e.setAttribute(include,'1');e.failAttr='style';h.clean();eq(e.getAttribute(include),'1');eq(h.state.changedFrameStyles.length,0);ok(e.decls.size>0);});
  check('current: resetting preparation ledger rebases the temporary style',()=>{const {e,h}=current();h.state.changedFrameStyles=[];h.remember(e,'frame');h.apply(e,'frame',200);h.clean();eq(css(e,'position'),'static');eq(css(e,'height'),'104px');});
  check('current: measurement reset overwrites a host width observed during measurement',()=>{const e=new Element(),h=harness();e.style.setProperty('width','60%');const root={offsetHeight:0};Object.defineProperty(root,'scrollHeight',{get(){e.style.setProperty('width','75%');return 400;}});e.contentDocument={documentElement:root,body:{scrollHeight:0,offsetHeight:0}};h.measure(e);eq(css(e,'width'),'100%');eq(e.style.getPropertyPriority('width'),'important');});
  check('current control: intact frame and ancestor snapshot restore',()=>{for(const kind of ['frame','chain']){const {e,h}=current(kind);h.clean();eq(css(e,'position'),'relative');eq(css(e,'color'),'black');eq(css(e,'height'),'');}});
  const read=(e,key)=>key.startsWith('css:')?{present:e.decls.has(key.slice(4)),value:e.style.getPropertyValue(key.slice(4)),priority:e.style.getPropertyPriority(key.slice(4))}:{present:e.hasAttribute(key),value:e.getAttribute(key),priority:''};
  const write=(e,key,v)=>key.startsWith('css:')?(v.present?e.style.setProperty(key.slice(4),v.value,v.priority):e.style.removeProperty(key.slice(4))):(v.present?e.setAttribute(key,v.value):e.removeAttribute(key));
  const done=r=>['restored','superseded','no-effect'].includes(r.status);
  class Ledger {
    constructor(limit=32){this.limit=limit;this.rows=[];this.current=null;}
    begin(scope){if(this.rows.some(r=>!done(r)))return null;this.rows=[];this.current=Object.freeze({scope});this.active=true;return this.current;}
    close(t){if(t===this.current)this.active=false;}
    set(t,e,key,value,priority=''){
      if(t!==this.current||!this.active)return {status:'stale'};
      if(['css:overflow','css:inset','css:all'].includes(key))return {status:'footprint-required'};
      let r=this.rows.find(r=>r.element===e&&r.key===key),live;
      try{live=read(e,key);}catch(_){return {status:'read-failed'};}
      if(r){if(r.status!=='installed')return {status:'blocked'};if(!same(live,r.temporary)){r.status='superseded';return r;}}
      const target={present:true,value:String(value),priority:key.startsWith('css:')?priority:''};
      if(same(live,target))return r||{status:'noop'};
      if(!e.isConnected||(r&&r.doc!==e.ownerDocument))return {status:'scope-mismatch'};
      if(!r){if(this.rows.length>=this.limit)return {status:'budget'};r={token:t,element:e,key,doc:e.ownerDocument,original:live,temporary:live,status:'unknown'};this.rows.push(r);}
      // Keep the previous successful temporary value across a failed repeat write.
      r.pending=target;r.status='unknown';
      try{write(e,key,target);const after=read(e,key);if(same(after,target)){r.temporary=after;r.pending=null;r.status='installed';}
        else if(same(after,r.temporary)){r.pending=null;r.status=same(after,r.original)?'no-effect':'installed';}
        else r.status='superseded';
      }catch(_){}
      return r;
    }
    clean(r,t){
      if(t!==this.current||r?.token!==t||!this.rows.includes(r))return 'stale';
      if(done(r))return r.status;
      try{const e=r.element;if(!e.isConnected||e.ownerDocument!==r.doc)return r.status='unknown';
        const live=read(e,r.key);if(same(live,r.original))return r.status='restored';
        if(!same(live,r.temporary)&&!(r.pending&&same(live,r.pending)))return r.status='superseded';
        write(e,r.key,r.original);const after=read(e,r.key);
        return r.status=same(after,r.original)?'restored':same(after,live)?'unknown':'superseded';
      }catch(_){return r.status='unknown';}
    }
    cleanAll(t){return this.rows.map(r=>this.clean(r,t));}
  }
  function target(){const e=new Element();e.style.setProperty('position','relative');const l=new Ledger(),t=l.begin('document-G'),r=l.set(t,e,'css:position','static','important');return {e,l,t,r};}
  check('target: unrelated host property survives exact restoration',()=>{const f=target();f.e.style.setProperty('color','red');eq(f.l.clean(f.r,f.t),'restored');eq(css(f.e,'color'),'red');eq(css(f.e,'position'),'relative');});
  check('target: priority-only host change is supersession',()=>{const f=target();f.e.style.setProperty('position','static','');eq(f.l.clean(f.r,f.t),'superseded');eq(css(f.e,'position'),'static');});
  check('target: removed touched property stays absent',()=>{const f=target();f.e.style.removeProperty('position');eq(f.l.clean(f.r,f.t),'superseded');eq(css(f.e,'position'),'');});
  check('target: removal of own absent-original property preserves host declaration',()=>{const e=new Element(),l=new Ledger(),t=l.begin('G'),r=l.set(t,e,'css:height','104px','important');e.style.setProperty('color','red');l.clean(r,t);eq(css(e,'height'),'');eq(css(e,'color'),'red');eq(e.hasAttribute('style'),true);});
  check('target: include and chain markers preserve absence empty and supersession',()=>{for(const key of [include,chain]){for(const initial of [null,'','host-before']){const e=new Element();if(initial!==null)e.setAttribute(key,initial);const l=new Ledger(),t=l.begin('G'),r=l.set(t,e,key,'1');l.clean(r,t);eq(e.getAttribute(key),initial);}const e=new Element(),l=new Ledger(),t=l.begin('G'),r=l.set(t,e,key,'1');e.setAttribute(key,'host-new');eq(l.clean(r,t),'superseded');eq(e.getAttribute(key),'host-new');}});
  check('target: repeated height writes retain original baseline',()=>{const e=new Element();e.style.setProperty('height','80px');const l=new Ledger(),t=l.begin('G'),r=l.set(t,e,'css:height','104px','important');eq(l.set(t,e,'css:height','204px','important'),r);l.clean(r,t);eq(css(e,'height'),'80px');});
  check('target: failed repeated height write retains previous temporary authority',()=>{for(const after of [false,true]){const e=new Element();e.style.setProperty('height','80px');const l=new Ledger(),t=l.begin('G'),r=l.set(t,e,'css:height','104px','important');e[after?'failAfterCSS':'failCSS']='height';l.set(t,e,'css:height','204px','important');eq(r.status,'unknown');eq(l.begin('B'),null);e.failCSS=e.failAfterCSS=null;l.clean(r,t);eq(css(e,'height'),'80px');}});
  check('target: failed first write retains pending record before effect',()=>{for(const after of [false,true]){const e=new Element(),l=new Ledger(),t=l.begin('G');e[after?'failAfterCSS':'failCSS']='height';const r=l.set(t,e,'css:height','104px','important');eq(l.rows[0],r);eq(r.status,'unknown');e.failCSS=e.failAfterCSS=null;l.clean(r,t);eq(css(e,'height'),'');}});
  check('target: failed property cleanup does not suppress marker or other property',()=>{const f=target(),h=f.l.set(f.t,f.e,'css:height','104px','important'),m=f.l.set(f.t,f.e,include,'1');f.e.failCSS='position';f.l.cleanAll(f.t);eq(f.r.status,'unknown');eq(h.status,'restored');eq(m.status,'restored');eq(f.l.begin('B'),null);f.e.failCSS=null;eq(f.l.clean(f.r,f.t),'restored');});
  check('target: shorthand footprint is represented by distinct longhand receipts',()=>{const e=new Element();e.style.setProperty('overflow-x','hidden');e.style.setProperty('overflow-y','scroll','important');const l=new Ledger(),t=l.begin('G');eq(l.set(t,e,'css:overflow','visible').status,'footprint-required');const x=l.set(t,e,'css:overflow-x','visible','important'),y=l.set(t,e,'css:overflow-y','visible','important');e.style.setProperty('overflow-y','auto');l.cleanAll(t);eq(x.status,'restored');eq(y.status,'superseded');eq(css(e,'overflow-x'),'hidden');eq(css(e,'overflow-y'),'auto');});
  check('target: no-op and budget rejection produce no effect',()=>{const e=new Element(),l=new Ledger(0),t=l.begin('G');e.style.setProperty('position','static','important');const w=e.writes;eq(l.set(t,e,'css:position','static','important').status,'noop');eq(l.set(t,e,'css:height','100px').status,'budget');eq(e.writes,w);});
  check('target: ignored CSS assignment is not reported installed',()=>{const e=new Element(),l=new Ledger(),t=l.begin('G');e.ignoreCSS='height';const r=l.set(t,e,'css:height','104px','important');eq(r.status,'no-effect');eq(css(e,'height'),'');});
  check('target: closed and stale generations cannot add or undo new writes',()=>{const f=target();f.l.close(f.t);eq(f.l.set(f.t,f.e,'css:height','100px').status,'stale');f.l.clean(f.r,f.t);const b=f.l.begin('B'),r=f.l.set(b,f.e,'css:position','fixed','important');eq(f.l.clean(f.r,f.t),'stale');eq(f.l.clean(r,f.t),'stale');eq(css(f.e,'position'),'fixed');});
  check('target: disconnected document mismatch and read failure retain debt',()=>{const f=target();f.e.isConnected=false;eq(f.l.clean(f.r,f.t),'unknown');f.e.isConnected=true;const doc=f.e.ownerDocument;f.e.ownerDocument={};eq(f.l.clean(f.r,f.t),'unknown');f.e.ownerDocument=doc;f.e.failRead='position';eq(f.l.clean(f.r,f.t),'unknown');f.e.failRead=null;eq(f.l.clean(f.r,f.t),'restored');});
  check('target: terminal cleanup does not overwrite a subsequent host edit',()=>{const f=target();f.l.clean(f.r,f.t);f.e.style.setProperty('position','fixed');const w=f.e.writes;f.l.clean(f.r,f.t);eq(f.e.writes,w);eq(css(f.e,'position'),'fixed');});
  check('limit: equal value and priority after ABA still passes snapshot comparison',()=>{const f=target();f.e.style.setProperty('position','fixed');f.e.style.setProperty('position','static','important');eq(f.l.clean(f.r,f.t),'restored');});
  return {count:checks.length,checks};
}
if (typeof module !== 'undefined') {
  module.exports = runFrameStyleResearch;
  if (require.main === module) {
    const fs = require('node:fs'), path = require('node:path');
    const root = path.resolve(__dirname, '..');
    if (!/\| P1-224 \| ACTIVE \|/.test(fs.readFileSync(path.join(root, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8'))) throw Error('P1-224 status drift');
    const result = runFrameStyleResearch(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), console.log);
    console.log('P1-224 research: '+result.count+' checks PASS; browser/CSSOM/PDF closure not established.');
  }
}
