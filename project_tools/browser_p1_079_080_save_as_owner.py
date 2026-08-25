#!/opt/pyvenv/bin/python
"""P1-079/P1-080 browser regression for page-owned native Save As semantics."""
import json
import os
import pathlib
import subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
HELPER = (ROOT / 'prepared-save-as.js').read_text()

MOCK = r'''
(() => {
  const messages=[];
  const downloads=[];
  const listeners=new Set();
  let resolveDownload=null;
  let rejectDownload=null;
  globalThis.__saveAsTest={messages,downloads,listeners,resolveDownload:null,rejectDownload:null};
  globalThis.chrome={
    runtime:{
      getURL(value=''){return `chrome-extension://browser-test/${value}`;},
      sendMessage(message){messages.push(structuredClone(message));return Promise.resolve({ok:true});}
    },
    downloads:{
      download(options){
        downloads.push(structuredClone(options));
        return new Promise((resolve,reject)=>{
          resolveDownload=resolve;rejectDownload=reject;
          __saveAsTest.resolveDownload=resolve;
          __saveAsTest.rejectDownload=reject;
        });
      },
      onChanged:{
        addListener(fn){listeners.add(fn);},
        removeListener(fn){listeners.delete(fn);}
      }
    }
  };
})();
'''


def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True,
            args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page = browser.new_page()
        page.set_content('<!doctype html><html><body></body></html>')
        page.evaluate(MOCK)
        page.add_script_tag(content=HELPER)
        page.evaluate("""() => {
          globalThis.__startPromise = WebClipPreparedSaveAs.start({
            blobUrl:'blob:chrome-extension://browser-test/journal', filename:'WebClip_Journal.json'
          });
        }""")
        page.wait_for_timeout(250)
        pending = page.evaluate("() => ({downloads:__saveAsTest.downloads,messages:__saveAsTest.messages,listenerCount:__saveAsTest.listeners.size})")
        assert len(pending['downloads']) == 1, pending
        assert pending['downloads'][0]['saveAs'] is True, pending
        assert pending['messages'] == [], pending
        assert pending['listenerCount'] == 0, pending

        page.evaluate("() => __saveAsTest.resolveDownload(73)")
        page.wait_for_function("() => __saveAsTest.messages.some(m => m.type === 'WEBCLIP_PREPARED_SAVE_AS_STARTED')")
        started = page.evaluate("async () => ({id:await __startPromise,messages:__saveAsTest.messages,listenerCount:__saveAsTest.listeners.size})")
        assert started['id'] == 73, started
        assert started['listenerCount'] == 1, started
        assert any(m.get('type') == 'WEBCLIP_PREPARED_SAVE_AS_STARTED' and m.get('downloadId') == 73 for m in started['messages']), started

        page.evaluate("""() => {
          for (const listener of [...__saveAsTest.listeners]) listener({id:73,state:{current:'complete'}});
        }""")
        page.wait_for_function("() => __saveAsTest.messages.some(m => m.type === 'WEBCLIP_PREPARED_SAVE_AS_RELEASE')")
        complete = page.evaluate("() => ({messages:__saveAsTest.messages,listenerCount:__saveAsTest.listeners.size})")
        assert complete['listenerCount'] == 0, complete

        browser.close()
        print(json.dumps({
            'ok': True,
            'browser': subprocess.check_output([CHROMIUM, '--version'], text=True).strip(),
            'pendingDialogSingleCall': True,
            'noCallerTimeoutOrReleaseWhilePending': True,
            'pageOwnedCleanup': True,
            'downloadId': 73,
        }, ensure_ascii=False))


if __name__ == '__main__':
    main()
