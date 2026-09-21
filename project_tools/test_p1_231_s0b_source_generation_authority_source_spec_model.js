'use strict';

// Research-only deterministic model for P1-231 S0-B source-generation authority.
// It does not modify the current generator, create production authority files,
// or activate release/build policy.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-source-generation/v1';
const PROFILE = 'cpython-3.12.10-v1';
const MAX_RELATIONS = 256;
const MAX_PATHS = 256;
const PACKAGE_FILES = new Set([
  'content-injection-guard.js','content.js','frame-agent.js','frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js','host-control-activation-guard.js','journal-import-digest.js',
  'journal-import-stream.js','journal-restore-envelope-guard.js','journal-text-filter.js','journal.css',
  'journal.html','journal.js','local-download-identity.js','manifest.json','offscreen-blob-admission-guard.js',
  'offscreen-bootstrap.js','offscreen.html','offscreen.js','operation-log-redaction-guard.js','options.css',
  'options.html','options.js','pdf-print-guard.js','popup.css','popup.html','popup.js','prepared-save-as.js',
  'public-suffix.js','service-worker.js','yandex-auth-help.css','yandex-auth-help.html','yandex-auth-help.js',
]);
const RESERVED = new Set(['con','prn','aux','nul', ...Array.from({length:9},(_,i)=>`com${i+1}`), ...Array.from({length:9},(_,i)=>`lpt${i+1}`)]);

let cases = 0;
function check(v,m){cases+=1;assert(v,m);}
function eq(a,b,m){cases+=1;assert.strictEqual(a,b,m);}
function deepEq(a,b,m){cases+=1;assert.deepStrictEqual(a,b,m);}
function fail(code,msg){const e=new Error(msg||code);e.code=code;throw e;}
function throwsCode(fn,code,msg){cases+=1;assert.throws(fn,(e)=>e&&e.code===code,msg||code);}
function git(...args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();}
function lowerAscii(s){return s.replace(/[A-Z]/g,c=>c.toLowerCase());}
function u32(n){const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;}

function validatePath(p){
  if(typeof p!=='string'||!p||!/^[\x00-\x7f]+$/.test(p)||p.startsWith('/')||p.endsWith('/')||p.includes('//')||p.includes('\\')||/[\x00-\x1f\x7f]/.test(p)) fail('SOURCE_GENERATION_PATH_INVALID');
  const segs=p.split('/');
  for(const s of segs){
    if(!s||!/^[A-Za-z0-9._-]+$/.test(s)||s==='.'||s==='..'||s.endsWith('.')) fail('SOURCE_GENERATION_PATH_INVALID');
    if(RESERVED.has(lowerAscii(s.split('.')[0]))) fail('SOURCE_GENERATION_PATH_RESERVED');
  }
  return p;
}

function canonicalizeRelation(r){
  const keys=Object.keys(r).sort();
  deepEq(keys,['generator','id','inputs','outputs','runtime_profile'],'relation keys');
  if(typeof r.id!=='string'||! /^[a-z0-9][a-z0-9-]{0,63}$/.test(r.id)) fail('SOURCE_GENERATION_RELATION_INVALID');
  if(r.runtime_profile!==PROFILE) fail('SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  validatePath(r.generator);
  for(const field of ['inputs','outputs']){
    if(!Array.isArray(r[field])||r[field].length===0||r[field].length>MAX_PATHS||r[field].some(x=>typeof x!=='string')) fail('SOURCE_GENERATION_RELATION_INVALID');
    const exact=new Set(); const folded=new Set();
    for(const p of r[field]){
      validatePath(p);
      if(exact.has(p)||folded.has(lowerAscii(p))) fail('SOURCE_GENERATION_RELATION_INVALID');
      exact.add(p); folded.add(lowerAscii(p));
    }
  }
  for(const out of r.outputs) if(!PACKAGE_FILES.has(out)) fail('SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER');
  return Object.freeze({
    id:r.id,
    runtime_profile:r.runtime_profile,
    generator:r.generator,
    inputs:Object.freeze([...r.inputs].sort((a,b)=>Buffer.from(a).compare(Buffer.from(b)))),
    outputs:Object.freeze([...r.outputs].sort((a,b)=>Buffer.from(a).compare(Buffer.from(b)))),
  });
}

function validateAuthority(value){
  if(!value||Array.isArray(value)||typeof value!=='object') fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  deepEq(Object.keys(value).sort(),['relations','schema'],'top-level keys');
  if(value.schema!==SCHEMA) fail('SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
  if(!Array.isArray(value.relations)||value.relations.length===0||value.relations.length>MAX_RELATIONS) fail('SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  const ids=new Set(); const owners=new Map(); const rels=[];
  for(const raw of value.relations){
    const r=canonicalizeRelation(raw);
    if(ids.has(r.id)) fail('SOURCE_GENERATION_RELATION_DUPLICATE');
    ids.add(r.id);
    for(const out of r.outputs){
      const f=lowerAscii(out);
      if(owners.has(f)) fail('SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT');
      owners.set(f,r.id);
    }
    rels.push(r);
  }
  rels.sort((a,b)=>Buffer.from(a.id).compare(Buffer.from(b.id)));
  return Object.freeze({schema:SCHEMA,relations:Object.freeze(rels)});
}

function topologyDigest(auth){
  const h=crypto.createHash('sha256');
  h.update(Buffer.from('WEBCLIP_SOURCE_GENERATION_TOPOLOGY_V1\0'));
  const sb=Buffer.from(auth.schema);h.update(u32(sb.length));h.update(sb);h.update(u32(auth.relations.length));
  for(const r of auth.relations){
    for(const s of [r.id,r.runtime_profile,r.generator]){const b=Buffer.from(s);h.update(u32(b.length));h.update(b);}
    for(const list of [r.inputs,r.outputs]){h.update(u32(list.length));for(const p of list){const b=Buffer.from(p);h.update(u32(b.length));h.update(b);}}
  }
  return h.digest('hex');
}

function gitEntry(commit,rel){
  const raw=execFileSync('git',['ls-tree',commit,'--',rel],{cwd:ROOT,encoding:'utf8'}).trim();
  if(!raw)return null;
  const tab=raw.indexOf('\t');
  const [mode,type,oid]=raw.slice(0,tab).split(/\s+/);
  return {mode,type,oid,path:raw.slice(tab+1)};
}

(function main(){
  const bootstrap={schema:SCHEMA,relations:[{id:'public-suffix-js',runtime_profile:PROFILE,generator:'project_tools/build_public_suffix_js.py',inputs:['public_suffix_list.dat'],outputs:['public-suffix.js']}]};
  const auth=validateAuthority(bootstrap);
  eq(auth.relations.length,1,'bootstrap relation count');
  eq(auth.relations[0].id,'public-suffix-js');
  eq(auth.relations[0].generator,'project_tools/build_public_suffix_js.py');
  deepEq(auth.relations[0].inputs,['public_suffix_list.dat']);
  deepEq(auth.relations[0].outputs,['public-suffix.js']);

  // Schema/relation negative matrix.
  throwsCode(()=>validateAuthority(null),'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  throwsCode(()=>validateAuthority({schema:'x',relations:bootstrap.relations}),'SOURCE_GENERATION_SCHEMA_UNSUPPORTED');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[] }),'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:new Array(MAX_RELATIONS+1).fill(bootstrap.relations[0])}),'SOURCE_GENERATION_MANIFEST_SHAPE_INVALID');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],id:'Bad_ID'}]}),'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],runtime_profile:'cpython-any'}]}),'SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],generator:'../tool.py'}]}),'SOURCE_GENERATION_PATH_INVALID');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],inputs:['CON']}]}),'SOURCE_GENERATION_PATH_RESERVED');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],inputs:['x.dat','X.dat']}]}),'SOURCE_GENERATION_RELATION_INVALID');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],outputs:['not-package.js']}]}),'SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[bootstrap.relations[0],bootstrap.relations[0]]}),'SOURCE_GENERATION_RELATION_DUPLICATE');
  throwsCode(()=>validateAuthority({schema:SCHEMA,relations:[bootstrap.relations[0],{...bootstrap.relations[0],id:'other'}]}),'SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT');

  // Semantic ordering/format-independent projection.
  const reorder=validateAuthority({relations:[{...bootstrap.relations[0],inputs:[...bootstrap.relations[0].inputs].reverse(),outputs:[...bootstrap.relations[0].outputs].reverse()}],schema:SCHEMA});
  eq(topologyDigest(reorder),topologyDigest(auth),'representation reorder must preserve topology digest');
  const profileChanged={schema:SCHEMA,relations:[{...bootstrap.relations[0],runtime_profile:'cpython-3.12.11-v1'}]};
  throwsCode(()=>validateAuthority(profileChanged),'SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED');
  const changedGenerator=validateAuthority({schema:SCHEMA,relations:[{...bootstrap.relations[0],generator:'project_tools/test_public_suffix.js'}]});
  check(topologyDigest(changedGenerator)!==topologyDigest(auth),'generator change must change topology');

  // Exact Git-object census for bootstrap relation.
  const head=git('rev-parse','HEAD');
  eq(git('cat-file','-t',head),'commit','HEAD must be commit');
  for(const rel of ['project_tools/build_public_suffix_js.py','public_suffix_list.dat','public-suffix.js']){
    const e=gitEntry(head,rel);check(Boolean(e),`missing ${rel}`);eq(e.type,'blob',`${rel} type`);eq(e.mode,'100644',`${rel} mode`);check(/^[0-9a-f]{40}$/.test(e.oid),`${rel} oid`);
  }
  check(PACKAGE_FILES.has('public-suffix.js'),'bootstrap output must be package member');
  check(!PACKAGE_FILES.has('public_suffix_list.dat'),'source data must not be package member');
  check(!PACKAGE_FILES.has('project_tools/build_public_suffix_js.py'),'generator must not be package member');

  // The generator now emits exact UTF-8 bytes, but prior Windows failure remains the current physical baseline until re-proved.
  const generator=fs.readFileSync(path.join(ROOT,'project_tools','build_public_suffix_js.py'),'utf8');
  const portabilityProof=fs.readFileSync(path.join(ROOT,'project_docs','RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md'),'utf8');
  check(!generator.includes("OUT.write_text(code, encoding='utf-8')"),'text-mode generator must remain retired');
  check(!generator.includes("newline='\\n'"),'binary output must not depend on text newline policy');
  check(generator.includes("OUT.write_bytes(code.encode('utf-8'))") && portabilityProof.includes('PHYSICAL PORTABILITY PASS') && portabilityProof.includes('35566109810') && portabilityProof.includes('72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26'),'current generator exact-byte portability proof');

  // Behavioral PSL test is complementary, not source-generation proof.
  const pslTest=fs.readFileSync(path.join(ROOT,'project_tools','test_public_suffix.js'),'utf8');
  check(!pslTest.includes('public_suffix_list.dat'),'behavior test must not be mistaken for source regeneration');
  const recovery=fs.readFileSync(path.join(ROOT,'project_tools','build_recovery_archive.py'),'utf8');
  check(recovery.includes('recovery'),'recovery builder census expected');
  check(!auth.relations.some(r=>r.generator==='project_tools/build_recovery_archive.py'),'recovery archive builder must not be auto-enrolled');

  const digest=topologyDigest(auth);
  check(/^[0-9a-f]{64}$/.test(digest),'topology digest shape');
  console.log(`P1-231 S0-B source-generation authority source-spec model: PASS; cases=${cases}; relations=${auth.relations.length}; topology_sha256=${digest}; current_psl_windows_portable=true; head=${head}`);
})();
