#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, tempfile
from playwright.sync_api import sync_playwright
import research_c37_failure_retry_rollback as m

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800})
        p.set_content(f"<!doctype html><meta charset='utf-8'><base href='https://example.test/base/'>{m.STYLE}<div class='outside'>C37_OUTSIDE</div><main id='scope'><p>C37_SELECTED</p><a id='link' href='relative/item'>C37_LINK</a><div class='spacer'></div><div class='omit'>C37_EXCLUDE</div></main>",wait_until='load');m.inject(p);m.select_scope(p)
        original=p.evaluate("()=>document.querySelector('#link').getAttribute('href')");m.begin(p);prepared=p.evaluate("()=>{const a=document.querySelector('#link');return {href:a.getAttribute('href'),marker:a.getAttribute('data-webclip-original-href')}}")
        p.evaluate("()=>{window.__saved=document.querySelector('#link');__saved.remove()}");m.reject(p);detached=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href'),connected:__saved.isConnected})")
        p.evaluate("()=>document.querySelector('#scope').appendChild(__saved)");reattached=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href'),connected:__saved.isConnected})")
        m.begin(p);retry=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href')})");pdf=m.print_pdf(p,out/'link_retry.pdf');m.resolve(p);final=p.evaluate("()=>({href:__saved.getAttribute('href'),marker:__saved.getAttribute('data-webclip-original-href')})");p.close();b.close()
    result={'original':original,'prepared':prepared,'detachedAfterFailure':detached,'reattached':reattached,'retryPrepared':retry,'final':final,'pdf':pdf};payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C37_LINK_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    assert original=='relative/item',result
    assert prepared['href']=='https://example.test/base/relative/item' and prepared['marker']=='relative/item',result
    assert not detached['connected'] and detached['href']=='https://example.test/base/relative/item' and detached['marker']=='relative/item',result
    assert reattached['connected'] and retry['marker']=='https://example.test/base/relative/item',result
    assert final['href']=='https://example.test/base/relative/item' and final['marker'] is None,result
    assert pdf['selected'] and not pdf['excludePresent'] and not pdf['outsidePresent'],result
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',required=True);a.add_argument('--out',default='');x=a.parse_args();run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c37-link-')))
if __name__=='__main__':main()
