'use strict';
// P1-225 research: current editor source plus proposed draft/mutation state separation.
async function runCommentDraftResearch(source, log=()=>{}) {
  const ok=(v,m='assertion failed')=>{if(!v)throw Error(m);};
  const eq=(a,b)=>ok(a===b,'expected '+String(b)+' got '+String(a));
  const cut=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i+a.length);ok(i>=0&&j>i,'source anchor '+a);return source.slice(i,j);};
  const checks=[];const check=async(name,fn)=>{await fn();checks.push(name);log('PASS '+name);};
  class Node {
    constructor(tag){this.tagName=tag;this.children=[];this.parent=null;this.value='';this.disabled=false;this.readOnly=false;this.textContent='';this.className='';this.classList={add:(...names)=>{this.className+=' '+names.join(' ');}};}
    append(...nodes){for(const n of nodes)this.appendChild(n);}
    appendChild(n){this.children.push(n);n.parent=this;return n;}
    replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes);}
    focus(){this.focused=true;}
  }
  const all=(n)=>[n,...n.children.flatMap(all)];
  function harness(initial=[]){
    const page=new Node('page'),statuses=[],pending=[],entry={id:'entry-1',journalComments:initial.map(x=>({...x}))};
    const document={createElement:tag=>new Node(tag)};
    const makeButton=(text,disabled,handler)=>{const n=new Node('button');n.textContent=text;n.disabled=disabled;n.handler=handler;return n;};
    const chrome={runtime:{sendMessage:message=>new Promise((resolve,reject)=>pending.push({message:{...message},resolve,reject}))}};
    const code=cut('function normalizeEntryJournalComments(', 'function buildLinkedOperationLog(')+
      cut('function renderEntries(entries) {','function renderEmptyState() {')+
      '\nfunction buildEntryCard(e){return buildJournalComments(e);} function renderEmptyState(){} return {build:buildJournalComments,render:renderEntries};';
    const api=new Function('document','makeButton','formatDate','setStatus','requireOk','chrome','queueMicrotask','window','entriesEl',code)(
      document,makeButton,String,(text,kind)=>statuses.push({text,kind}),r=>{if(!r?.ok)throw Error(r?.error||'RPC failure');},
      chrome,()=>{}, {confirm:()=>true},page);
    api.render([entry]);
    const buttons=text=>all(page).filter(n=>n.tagName==='button'&&n.textContent===text);
    const input=()=>all(page).find(n=>n.tagName==='textarea');
    const click=(text,index=0)=>{const b=buttons(text)[index];ok(b,'missing button '+text);if(b.disabled)return undefined;return b.handler();};
    const reply=(i,text,commentId='c1')=>pending[i].resolve({ok:true,entry:{id:entry.id,journalComments:[{id:commentId,text,createdAt:1,updatedAt:2,deletedAt:0}]}});
    return {page,entry,pending,statuses,buttons,input,click,reply,reload:comments=>api.render([{id:entry.id,journalComments:comments}])};
  }
  const old=()=>[{id:'c1',text:'old-1',createdAt:1},{id:'c2',text:'old-2',createdAt:2}];
  await check('current: Add success removes newer editable draft',async()=>{const h=harness();h.click('Добавить комментарий к записи журнала');h.input().value='A';const p=h.click('Сохранить комментарий');eq(h.pending[0].message.comment,'A');eq(h.input().readOnly,false);h.input().value='B';h.reply(0,'A');await p;eq(h.input(),undefined);eq(h.entry.journalComments[0].text,'A');});
  await check('current: Edit success removes newer editable draft',async()=>{const h=harness(old());h.click('Редактировать');h.input().value='A';const p=h.click('Сохранить комментарий');eq(h.pending[0].message.commentId,'c1');h.input().value='B';h.reply(0,'A');await p;eq(h.input(),undefined);});
  await check('current: late save closes another comment editor opened meanwhile',async()=>{const h=harness(old());h.click('Редактировать',0);h.input().value='A';const p=h.click('Сохранить комментарий');eq(h.buttons('Редактировать')[1].disabled,false);h.click('Редактировать',1);h.input().value='B for c2';h.reply(0,'A');await p;eq(h.input(),undefined);});
  await check('current: reopening editor allows a second pending save and stale entry repaint',async()=>{const h=harness(old());h.click('Редактировать');h.input().value='A';const a=h.click('Сохранить комментарий');h.click('Редактировать');h.input().value='B';const b=h.click('Сохранить комментарий');eq(h.pending.length,2);h.reply(1,'B');await b;h.reply(0,'A');await a;eq(h.entry.journalComments[0].text,'A');});
  await check('current: list rerender removes submitted draft before rejection returns',async()=>{const h=harness(old());h.click('Редактировать');h.input().value='A';const p=h.click('Сохранить комментарий');h.reload(old());eq(h.input(),undefined);h.pending[0].reject(Error('response unavailable'));await p;eq(h.input(),undefined);});
  await check('current: detached old failure changes global status of newer editor',async()=>{const h=harness(old());h.click('Редактировать');h.input().value='A';const p=h.click('Сохранить комментарий');h.reload(old());h.click('Редактировать',1);h.input().value='B';h.pending[0].reject(Error('old failure'));await p;eq(h.input().value,'B');eq(h.statuses.at(-1).text,'old failure');});
  await check('current control: ordinary failure preserves newer text in intact editor',async()=>{const h=harness();h.click('Добавить комментарий к записи журнала');h.input().value='A';const p=h.click('Сохранить комментарий');h.input().value='B';h.pending[0].resolve({ok:false,error:'rejected'});await p;eq(h.input().value,'B');eq(h.buttons('Сохранить комментарий')[0].disabled,false);});
  await check('current control: blank input emits no mutation and focuses editor',()=>{const h=harness();h.click('Добавить комментарий к записи журнала');h.input().value='  ';h.click('Сохранить комментарий');eq(h.pending.length,0);eq(h.input().focused,true);});
  class DraftStore {
    constructor(strategy='editable',limit=4,maxChars=100){this.strategy=strategy;this.limit=limit;this.maxChars=maxChars;this.rows=new Map();this.ops=new Set();this.active=null;this.serial=0;this.currentEpoch={};this.notifications=0;this.status='';}
    open(commentId,text=''){
      if(this.rows.size>=this.limit||text.length>this.maxChars)return null;
      const d={id:++this.serial,epoch:this.currentEpoch,commentId:commentId||null,text,revision:0,pending:null,open:true,orphaned:false,identityUnknown:false};
      this.rows.set(d.id,d);this.active=d.id;return d;
    }
    activate(d){if(!this.rows.has(d.id))return false;this.active=d.id;return true;}
    type(d,text){if(d.orphaned||text.length>this.maxChars||(this.strategy==='freeze'&&d.pending))return false;d.text=text;d.revision++;return true;}
    save(d){
      if(!d.open||d.orphaned||d.identityUnknown||d.pending||!d.text.trim())return null;
      // One local admitted mutation per entry epoch; remote CAS remains required.
      if([...this.rows.values()].some(x=>x.epoch===d.epoch&&x.pending))return null;
      const r=Object.freeze({id:++this.serial,draft:d,epoch:d.epoch,commentId:d.commentId,text:d.text,revision:d.revision});
      d.pending=r;this.ops.add(r);return r;
    }
    settle(r,outcome,{createdId=null,matched=true}={}){
      if(!this.ops.has(r))return 'duplicate';
      const d=r.draft;
      if(outcome==='unknown'){if(d.pending===r)d.uncertain=true;return 'unknown';}
      if (outcome==='success' && d.epoch===this.currentEpoch && !d.orphaned && (!matched || (r.commentId===null && !createdId))) {
        d.identityUnknown=true;return 'identity-unknown';
      }
      this.ops.delete(r);
      if(d.pending===r)d.pending=null;
      if(d.epoch!==this.currentEpoch||d.orphaned)return 'stale-ui';
      if(outcome==='rejected'){if(this.active===d.id)this.status='rejected';return 'preserved';}
      if(!matched){d.identityUnknown=true;return 'identity-unknown';}
      if(r.commentId===null){if(!createdId){d.identityUnknown=true;return 'identity-unknown';}d.commentId=createdId;}
      d.savedText=r.text;d.uncertain=false;d.identityUnknown=false;
      if(d.revision===r.revision&&d.text===r.text)d.open=false;
      if(this.active===d.id)this.status=d.open?'saved; unsaved changes remain':'saved';
      return d.open?'preserved':'closed';
    }
    notify(revision){this.notifications=Math.max(this.notifications,revision);return 'invalidate-only';}
    render(){const d=this.rows.get(this.active);return d&&d.open?{draftId:d.id,text:d.text,pending:Boolean(d.pending),readOnly:this.strategy==='freeze'&&Boolean(d.pending)}:null;}
    replaceEpoch(){this.currentEpoch={};for(const d of this.rows.values()){d.orphaned=true;}this.active=null;}
  }
  const setup=(strategy='editable',commentId='c1')=>{const s=new DraftStore(strategy),d=s.open(commentId,'A'),r=s.save(d);return {s,d,r};};
  await check('target: unchanged submitted revision can close on confirmed success',()=>{const f=setup();eq(f.s.settle(f.r,'success'),'closed');eq(f.s.render(),null);});
  await check('target: Add newer draft survives and becomes Edit of exact created comment',()=>{const f=setup('editable',null);f.s.type(f.d,'B');eq(f.s.settle(f.r,'success',{createdId:'created-1'}),'preserved');eq(f.s.render().text,'B');const next=f.s.save(f.d);eq(next.commentId,'created-1');eq(next.text,'B');ok(next!==f.r);});
  await check('target: ambiguous Add identity never guesses a comment or resubmits Add',()=>{const f=setup('editable',null);f.s.type(f.d,'B');eq(f.s.settle(f.r,'success'),'identity-unknown');eq(f.s.save(f.d),null);ok(f.s.ops.has(f.r));eq(f.d.pending,f.r);eq(f.s.render().text,'B');});
  await check('target: Edit newer revision survives both notification and completion orders',()=>{for(const order of ['notify-first','reply-first']){const f=setup();f.s.type(f.d,'B');if(order==='notify-first')f.s.notify(2);eq(f.s.settle(f.r,'success'),'preserved');if(order==='reply-first')f.s.notify(2);eq(f.s.render().text,'B');eq(f.d.savedText,'A');}});
  await check('target: unchanged text after editing away and back remains a newer revision',()=>{const f=setup();f.s.type(f.d,'B');f.s.type(f.d,'A');eq(f.s.settle(f.r,'success'),'preserved');eq(f.d.open,true);});
  await check('target: another editor and its status survive older completion',()=>{const f=setup(),other=f.s.open('c2','B');f.s.status='editing c2';eq(f.s.save(other),null);f.s.settle(f.r,'success');eq(f.s.render().draftId,other.id);eq(f.s.render().text,'B');eq(f.s.status,'editing c2');});
  await check('target: rerender reads draft from stable store while RPC stays pending',()=>{const f=setup();f.s.type(f.d,'B');const view=f.s.render();f.s.notify(2);const rebuilt=f.s.render();ok(view!==rebuilt);eq(rebuilt.text,'B');eq(rebuilt.pending,true);eq(f.s.save(f.d),null);});
  await check('target: definitive rejection preserves latest draft and permits explicit retry',()=>{const f=setup();f.s.type(f.d,'B');eq(f.s.settle(f.r,'rejected'),'preserved');const next=f.s.save(f.d);eq(next.text,'B');ok(next!==f.r);});
  await check('target: uncertain settlement preserves receipt and blocks blind Add retry',()=>{const f=setup('editable',null);f.s.type(f.d,'B');eq(f.s.settle(f.r,'unknown'),'unknown');eq(f.s.save(f.d),null);ok(f.s.ops.has(f.r));eq(f.s.render().text,'B');});
  await check('target: duplicate old completion cannot close a later pending save',()=>{const f=setup();f.s.type(f.d,'B');f.s.settle(f.r,'success');const next=f.s.save(f.d);eq(f.s.settle(f.r,'success'),'duplicate');eq(f.d.pending,next);eq(f.d.open,true);});
  await check('target: epoch replacement preserves orphan text without authority to save',()=>{const f=setup();f.s.type(f.d,'B');f.s.replaceEpoch();const next=f.s.open('c1','replacement');eq(f.s.settle(f.r,'success'),'stale-ui');eq(f.d.text,'B');eq(f.s.save(f.d),null);eq(f.s.render().draftId,next.id);});
  await check('target: response identity mismatch preserves text without retargeting',()=>{const f=setup();f.s.type(f.d,'B');eq(f.s.settle(f.r,'success',{matched:false}),'identity-unknown');eq(f.s.save(f.d),null);eq(f.d.text,'B');});
  await check('target: freeze rejects edits and survives view rebuild until rejection',()=>{const f=setup('freeze');eq(f.s.type(f.d,'B'),false);eq(f.s.render().readOnly,true);f.s.notify(2);eq(f.s.render().text,'A');f.s.settle(f.r,'rejected');eq(f.s.render().readOnly,false);eq(f.s.type(f.d,'B'),true);});
  await check('target: freeze success closes only the submitted editor',()=>{const f=setup('freeze'),other=f.s.open('c2','B');eq(f.s.settle(f.r,'success'),'closed');eq(f.s.render().draftId,other.id);eq(f.s.render().text,'B');});
  await check('target: bounded draft admission never evicts existing unsaved text',()=>{const s=new DraftStore('editable',1,3),d=s.open('c1','ABC');eq(s.open('c2','B'),null);eq(s.type(d,'ABCD'),false);eq(s.render().text,'ABC');});
  await check('target: notification bursts coalesce without replacing drafts',()=>{const f=setup();f.s.type(f.d,'B');for(const n of [3,1,3,2,4])f.s.notify(n);eq(f.s.notifications,4);eq(f.s.render().text,'B');eq(f.d.pending,f.r);});
  return {count:checks.length,checks};
}
if (typeof module !== 'undefined') {
  module.exports = runCommentDraftResearch;
  if (require.main === module) {
    const fs = require('node:fs'), path = require('node:path');
    const root = path.resolve(__dirname, '..');
    if (!/\| P1-225 \| ACTIVE \|/.test(fs.readFileSync(path.join(root, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8'))) throw Error('P1-225 status drift');
    runCommentDraftResearch(fs.readFileSync(path.join(root, 'journal.js'), 'utf8'), console.log).then(r => console.log('P1-225 research: '+r.count+' checks PASS; browser and storage closure not established.')).catch(error => {console.error(error);process.exitCode=1;});
  }
}
