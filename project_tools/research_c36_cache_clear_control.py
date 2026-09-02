#!/usr/bin/env python3
"""Supplementary C36 control: evict browser cache after admission, before WebClip resource prep."""
import argparse, hashlib, json, pathlib, tempfile, threading
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import research_c36_resource_byte_generation as c36

def one(ctx,out,base,kind):
    c36.STATE.gen='red';c36.STATE.requests=[];url=f'{base}/asset-clear-{kind}.svg';p=ctx.new_page();c36.setup(p,c36.html_bg(url) if kind=='background' else c36.html_img(url,'srcset'));p.wait_for_timeout(100);admission=c36.snap(p);before=c36.state_img(p) if kind!='background' else None;req0=len(c36.STATE.requests);c36.STATE.gen='green';cdp=ctx.new_cdp_session(p);cdp.send('Network.enable');cdp.send('Network.clearBrowserCache');meta=c36.prepare(p);p.wait_for_timeout(150);after=c36.snap(p);afterstate=c36.state_img(p) if kind!='background' else None;path=out/f'cache_clear_{kind}.pdf';p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);r={'admission':admission,'afterPrepare':after,'beforeState':before,'afterState':afterstate,'requestsBefore':req0,'requests':list(c36.STATE.requests),'resourceReport':meta.get('resourceReport',{}),'pdf':{**c36.pdf_colors(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}};c36.finish(p);p.close();return r

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True);server=ThreadingHTTPServer(('127.0.0.1',0),c36.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_address[1]}'
    try:
      with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox']);ctx=b.new_context();res={'browserVersion':b.version,'backgroundCacheCleared':one(ctx,out,base,'background'),'srcsetCacheCleared':one(ctx,out,base,'srcset')};b.close()
    finally: server.shutdown();server.server_close()
    payload=json.dumps(res,sort_keys=True,separators=(',',':'));res['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C36_CACHE_RESULT_JSON='+json.dumps(res,sort_keys=True,separators=(',',':')),flush=True);return res

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=c36.CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args();
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='c36-clear-')))
if __name__=='__main__':main()
