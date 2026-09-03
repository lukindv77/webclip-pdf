#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, tempfile, traceback
from playwright.sync_api import sync_playwright
import research_c37_failure_retry_rollback as m

def capture(fn,*args):
    try:return {'ok':True,'value':fn(*args)}
    except Exception as e:return {'ok':False,'errorType':type(e).__name__,'error':str(e),'tracebackTail':traceback.format_exc().splitlines()[-14:]}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'sourceContract':m.source_contract()}
        result['cleanRetry']=capture(m.clean_retry,ctx,out)
        result['staleResourceRetry']=capture(m.stale_resource,ctx,out)
        result['disconnectedLinkRetry']=capture(m.disconnected_link,ctx,out)
        result['wrapperTopology']=capture(m.wrapper_topology,ctx)
        b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C37_CAPTURE_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True);return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',required=True);a.add_argument('--out',default='');x=a.parse_args();run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c37-cap-')))
if __name__=='__main__':main()
