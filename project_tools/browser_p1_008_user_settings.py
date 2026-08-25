#!/opt/pyvenv/bin/python
"""P1-008 policy-safe browser regression for Options settings export/import UI."""
import json
import os
import pathlib
import subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_BIN', '/usr/bin/chromium')
OPTIONS_HTML = (ROOT / 'options.html').read_text()
OPTIONS_JS = (ROOT / 'options.js').read_text()
OPTIONS_HTML = OPTIONS_HTML.replace('<script src="options.js"></script>', '')

EXPORT_DOC = {
    'schema': 'webclip-user-settings',
    'version': 1,
    'exportedAt': '2026-08-25T03:40:00.000Z',
    'extensionVersion': '0.9.8',
    'settings': {
        'yandex': {
            'clientId': 'browser-client',
            'rootPath': '/BrowserRoot',
            'createPublicLinks': False,
            'journalBackupEnabled': True,
            'journalBackupIntervalMinutes': 720,
            'journalBackupRetryMinutes': 30,
        },
        'journal': {'groupByUrl': True},
        'operationLog': {'retentionHours': 48},
    },
}

MOCK = r'''
(() => {
  const imported=[];
  globalThis.__p1008={imported,downloadBlob:null,downloadName:'',revoked:[]};
  const exportDoc=__EXPORT_DOC__;
  const status={
    ok:true,connected:false,clientId:'browser-client',rootPath:'/BrowserRoot',createPublicLinks:false,
    redirectUri:'https://oauth.yandex.ru/verification_code',authPending:false
  };
  const backup={ok:true,enabled:true,intervalMinutes:720,retryMinutes:30,folderPath:'/BrowserRoot/Backup/Journal',lastBackgroundSuccessAt:0,lastBackgroundFailureAt:0};
  const handlers={
    WEBCLIP_USER_SETTINGS_EXPORT:()=>({ok:true,document:structuredClone(exportDoc)}),
    WEBCLIP_USER_SETTINGS_IMPORT:(m)=>{imported.push(structuredClone(m.document));return {ok:true,appliedCount:8,oauthSessionChanged:false};},
    WEBCLIP_YANDEX_STATUS:()=>structuredClone(status),
    WEBCLIP_JOURNAL_BACKUP_STATUS:()=>structuredClone(backup),
    WEBCLIP_OPERATION_LOG_SETTINGS_GET:()=>({ok:true,retentionHours:48}),
    WEBCLIP_OPERATION_LOG_LIST:()=>({ok:true,operations:[]}),
    WEBCLIP_STORAGE_HEALTH:()=>({ok:true,supported:true,usage:1024,quota:1024*1024,free:1024*1024-1024,reserve:32*1024*1024,usagePercent:0.1,persisted:false})
  };
  globalThis.chrome={runtime:{
    id:'p1008-test',
    getManifest(){return {version:'0.9.8'}},
    sendMessage(message){const fn=handlers[message?.type];return Promise.resolve(fn?fn(message):{ok:true});},
    connect(){return {onMessage:{addListener(){}},onDisconnect:{addListener(){}},disconnect(){}};}
  }};
  const originalCreate=URL.createObjectURL.bind(URL);
  URL.createObjectURL=(blob)=>{globalThis.__p1008.downloadBlob=blob;return 'blob:p1-008-test';};
  URL.revokeObjectURL=(url)=>{globalThis.__p1008.revoked.push(url);};
  HTMLAnchorElement.prototype.click=function(){globalThis.__p1008.downloadName=this.download||'';};
})();
'''.replace('__EXPORT_DOC__', json.dumps(EXPORT_DOC, ensure_ascii=False))


def main():
    assert pathlib.Path(CHROMIUM).exists(), CHROMIUM
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        page = browser.new_page()
        page.set_content(OPTIONS_HTML, wait_until='domcontentloaded')
        page.evaluate(MOCK)
        page.add_script_tag(content=OPTIONS_JS)
        page.wait_for_function("() => document.getElementById('connectionStatus')?.textContent.includes('не подключён')")

        page.click('#exportUserSettings')
        page.wait_for_function("() => !!globalThis.__p1008.downloadBlob")
        exported = page.evaluate("async () => ({name:__p1008.downloadName,text:await __p1008.downloadBlob.text(),status:document.getElementById('userSettingsStatus').textContent})")
        doc = json.loads(exported['text'])
        assert doc == EXPORT_DOC, (doc, EXPORT_DOC)
        assert exported['name'].startswith('WebClip_Settings_') and exported['name'].endswith('.json'), exported['name']
        assert 'OAuth/PKCE' in exported['status'], exported['status']
        serialized = json.dumps(doc, ensure_ascii=False)
        assert 'accessToken' not in serialized and 'codeVerifier' not in serialized and 'refreshToken' not in serialized

        import_doc = json.loads(json.dumps(EXPORT_DOC))
        import_doc['settings']['yandex']['clientId'] = 'imported-browser-client'
        page.set_input_files('#importUserSettingsFile', {
            'name': 'settings.json',
            'mimeType': 'application/json',
            'buffer': json.dumps(import_doc, ensure_ascii=False).encode('utf-8')
        })
        page.wait_for_function("() => document.getElementById('userSettingsStatus')?.textContent.includes('Импортировано настроек: 8')")
        captured = page.evaluate("() => ({imported:__p1008.imported,status:document.getElementById('userSettingsStatus').textContent,message:document.getElementById('message').textContent})")
        assert captured['imported'] == [import_doc], captured
        assert 'OAuth-сессия не изменена' in captured['status'], captured['status']
        assert 'OAuth-сессия и журнал не изменялись' in captured['message'], captured['message']

        browser.close()
        print(json.dumps({
            'ok': True,
            'browser': subprocess.check_output([CHROMIUM, '--version'], text=True).strip(),
            'schema': doc['schema'],
            'version': doc['version'],
            'exportSecretFree': True,
            'importFileUi': True,
            'oauthSessionUnchangedMessage': True,
        }, ensure_ascii=False))


if __name__ == '__main__':
    main()
