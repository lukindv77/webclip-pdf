'use strict';const a=require('assert');let c=0;const ok=(v,m)=>{a.ok(v,m);c++};const eq=(x,y,m)=>{a.deepStrictEqual(x,y,m);c++};
const V={
 local:{P:1,F:1,pub:0,move:0,local:'delete'},
 yKeepPrivate:{P:1,F:1,pub:0,move:0,local:'delete'},
 yKeepPublic:{P:1,F:1,pub:1,move:0,local:'delete'},
 yTrashPrivate:{P:1,F:1,pub:0,move:1,local:'delete'},
 yTrashPublic:{P:1,F:1,pub:1,move:1,local:'delete'},
 markRead:{P:1,F:1,pub:0,move:1,local:'update'}
};
function project(v,s){const q=V[v]; if(!q)return null; if(s.admitted===false)return ['not-admitted','new-attempt-allowed']; if(s.preEffectFail)return ['failed-before-effect','new-attempt-allowed']; if(q.pub&&s.pub==='unknown')return ['effect-unknown','reconcile-only']; if(q.pub&&s.pub!=='verified')return ['domain-pending','same-operation-only']; if(q.move&&s.move==='unknown')return ['effect-unknown','reconcile-only']; if(q.move&&s.move==='manual')return ['evidence-limited','manual-resolution']; if(q.move&&s.move!=='verified')return ['domain-pending','same-operation-only']; if(s.local==='stale'&&(q.pub||q.move))return ['settled-partial','none']; if(s.local==='stale')return ['failed-before-effect','new-attempt-allowed']; if(s.local==='done')return ['succeeded','none']; return ['domain-pending','same-operation-only'];}
for(const [k,q] of Object.entries(V)){ok(q.P===1&&q.F===1,`${k} P/F`);eq(project(k,{local:'done',pub:q.pub?'verified':undefined,move:q.move?'verified':undefined}),['succeeded','none'],`${k} success`);}
eq(project('yTrashPublic',{pub:'unknown',move:'none',local:'none'}),['effect-unknown','reconcile-only'],'public unknown blocks move');
eq(project('yTrashPublic',{pub:'verified',move:'unknown',local:'none'}),['effect-unknown','reconcile-only'],'move unknown');
eq(project('yTrashPublic',{pub:'verified',move:'verified',local:'stale'}),['settled-partial','none'],'both effects exact local stale');
eq(project('yKeepPublic',{pub:'verified',local:'stale'}),['settled-partial','none'],'unpublish exact local stale');
eq(project('yTrashPrivate',{move:'manual',local:'none'}),['evidence-limited','manual-resolution'],'move manual');
eq(project('markRead',{move:'verified',local:'stale'}),['settled-partial','none'],'mark read remote exact local stale');
eq(project('local',{local:'stale'}),['failed-before-effect','new-attempt-allowed'],'local stale no external effect');
eq(project('yKeepPrivate',{local:'stale'}),['failed-before-effect','new-attempt-allowed'],'keep private stale no external effect');
eq(project('yTrashPublic',{preEffectFail:true}),['failed-before-effect','new-attempt-allowed'],'pre effect failure');
eq(project('yTrashPublic',{admitted:false}),['not-admitted','new-attempt-allowed'],'not admitted');
function sequence(v){const q=V[v];return ['P','F',...(q.pub?['Epub-prepare','Epub-start','Epub-verify']:[]),...(q.move?['Emove-prepare','Emove-start','Emove-verify']:[]),q.local==='delete'?'Journal-delete-CAS':'Journal-update-CAS','Terminal-archive'];}
eq(sequence('yTrashPublic'),['P','F','Epub-prepare','Epub-start','Epub-verify','Emove-prepare','Emove-start','Emove-verify','Journal-delete-CAS','Terminal-archive'],'public trash exact order');
eq(sequence('yKeepPublic'),['P','F','Epub-prepare','Epub-start','Epub-verify','Journal-delete-CAS','Terminal-archive'],'public keep order');
eq(sequence('markRead'),['P','F','Emove-prepare','Emove-start','Emove-verify','Journal-update-CAS','Terminal-archive'],'mark read order');
console.log(`Wave 1 destructive composition matrix: PASS cases=${c}`);
