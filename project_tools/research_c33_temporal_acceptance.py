#!/usr/bin/env python3
"""Accepted C33 runner using the raw temporal matrix with proxy-relative causal assertions."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile
from playwright.sync_api import sync_playwright
import research_c33_temporal_matrix as m

CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')

def run(ch,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=ch,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);c=b.new_context()
        r={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'cssCurrent':m.temporal(c,out,'css'),'cssFrozen':m.temporal(c,out,'css',freeze=True),'cssPaused':m.temporal(c,out,'css',paused=True),'waapiCurrent':m.temporal(c,out,'waapi'),'transitionCurrent':m.temporal(c,out,'transition'),'frameCurrent':m.frame(c,out),'frameCausal':m.frame(c,out,True)};b.close()
    payload=json.dumps(r,sort_keys=True,separators=(',',':'),allow_nan=True);r['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C33_RESULT_JSON='+json.dumps(r,sort_keys=True,separators=(',',':'),allow_nan=True),flush=True)
    for k in ['cssCurrent','cssFrozen','cssPaused','waapiCurrent','transitionCurrent','frameCurrent','frameCausal']:
        x=r[k]['pdf'];assert x['ratio'] is not None and not x['excludePresent'] and not x['outsidePresent'],(k,x)
    f=r['cssFrozen'];assert abs(f['prePrint']['ratio']-f['admission']['ratio'])<.08 and abs(f['pdf']['ratio']-f['admission']['ratio'])<.25,f
    q=r['cssPaused'];assert abs(q['prePrint']['ratio']-q['admission']['ratio'])<.08 and abs(q['pdf']['ratio']-q['admission']['ratio'])<.25,q
    for k in ['cssCurrent','waapiCurrent','transitionCurrent']:
        assert r[k]['prePrint']['ratio']-r[k]['admission']['ratio']>.35,(k,r[k])
    fc=r['frameCausal'];assert fc['proxyAfter'] and fc['proxy']
    assert fc['proxyAfter']['ratio']-fc['proxy']['ratio']>.5,fc
    assert abs(fc['pdf']['ratio']-fc['proxyAfter']['ratio'])<.15,fc
    cur=r['frameCurrent'];assert cur['proxy'] and cur['proxy']['animationCount']==0 and abs(cur['pdf']['ratio']-cur['proxy']['ratio'])<.15,cur
    return r

def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome:raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c33-accepted-')))
if __name__=='__main__':main()
