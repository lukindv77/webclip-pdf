'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
let cases = 0;
const pass = (name) => { cases += 1; console.log(`PASS ${name}`); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const exact = Buffer.from('%PDF-1.7\ncontrolled-c0-c1-fixture\n%%EOF\n');
const wrongSameSize = Buffer.from(exact);
wrongSameSize[12] ^= 1;
const remotePath = '/WebClip/Upload/site/file.pdf';
const server = http.createServer((req,res) => {
  if (req.url === '/meta-exact') {
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({type:'file',path:remotePath,size:exact.length,sha256:sha256(exact),resource_id:'rid-fixture',revision:7}));
    return;
  }
  if (req.url === '/meta-wronghash') {
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({type:'file',path:remotePath,size:exact.length,sha256:sha256(wrongSameSize),resource_id:'rid-fixture',revision:8}));
    return;
  }
  if (req.url === '/download-exact') { res.end(exact); return; }
  if (req.url === '/download-wrong-same-size') { res.end(wrongSameSize); return; }
  if (req.url === '/download-over') { res.end(Buffer.concat([exact, Buffer.from('X')])); return; }
  if (req.url === '/download-short') { res.end(exact.subarray(0, exact.length-1)); return; }
  res.statusCode=404; res.end('missing');
});
async function readJson(url){ const r=await fetch(url); assert.equal(r.status,200); return r.json(); }
async function verifyDownload(url, expectedN, expectedH) {
  const r = await fetch(url);
  assert.equal(r.status,200);
  assert.ok(r.body);
  const h = crypto.createHash('sha256');
  let n = 0;
  for await (const chunk of r.body) {
    n += chunk.length;
    if (n > expectedN) throw Object.assign(new Error('OVER_BOUND'),{code:'OVER_BOUND'});
    h.update(chunk);
  }
  if (n !== expectedN) throw Object.assign(new Error('SIZE_MISMATCH'),{code:'SIZE_MISMATCH'});
  const got = h.digest('hex');
  if (got !== expectedH) throw Object.assign(new Error('HASH_MISMATCH'),{code:'HASH_MISMATCH'});
  return {n,sha256:got};
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const base=`http://127.0.0.1:${port}`;
  try {
    const m=await readJson(`${base}/meta-exact`);
    assert.equal(m.type,'file'); assert.equal(m.path,remotePath); assert.equal(m.size,exact.length); pass('metadata-shape');
    assert.equal(m.sha256,sha256(exact)); pass('metadata-sha-observed-not-promoted');
    const ok=await verifyDownload(`${base}/download-exact`, exact.length, sha256(exact));
    assert.equal(ok.n,exact.length); pass('exact-download-hash');
    let wrong=false; try { await verifyDownload(`${base}/download-wrong-same-size`, exact.length, sha256(exact)); } catch(e){ wrong=e.code==='HASH_MISMATCH'; }
    assert.ok(wrong); pass('same-size-wrong-bytes-rejected');
    let over=false; try { await verifyDownload(`${base}/download-over`, exact.length, sha256(exact)); } catch(e){ over=e.code==='OVER_BOUND'; }
    assert.ok(over); pass('over-bound-stops-stream');
    let short=false; try { await verifyDownload(`${base}/download-short`, exact.length, sha256(exact)); } catch(e){ short=e.code==='SIZE_MISMATCH'; }
    assert.ok(short); pass('short-stream-rejected');
    const mw=await readJson(`${base}/meta-wronghash`);
    assert.equal(mw.size,exact.length); assert.notEqual(mw.sha256,sha256(exact)); pass('size-alone-not-content-identity');
    console.log(`C0/C1 controlled HTTP verification fixture: PASS; cases=${cases}`);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
