#!/usr/bin/env python3
"""Case-level capture wrapper for fresh C25 top-layer physical research.

Runs each existing C25 case independently and always emits/persists a raw JSON receipt,
so a single browser interaction failure cannot hide completed observations.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import traceback

from playwright.sync_api import sync_playwright
import research_c25_top_layer as c25

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')


def run_case(name, fn, ctx, out):
    try:
        return {'ok': True, 'result': fn(ctx, out)}
    except Exception as exc:
        return {
            'ok': False,
            'errorType': type(exc).__name__,
            'error': str(exc),
            'tracebackTail': traceback.format_exc().splitlines()[-12:],
        }


def run(chrome: str, out: pathlib.Path, receipt: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=chrome,
            headless=True,
            args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        )
        ctx = browser.new_context()
        result = {
            'browserVersion': browser.version,
            'contentBlobSha': os.environ.get('CONTENT_BLOB_SHA', ''),
            'cases': {},
        }
        for name, fn in [
            ('autoDirect', c25.auto_direct),
            ('autoAfterFinish', c25.auto_after_finish),
            ('manualAfterFinish', c25.manual_after_finish),
            ('modal', c25.modal_case),
            ('closedNegative', c25.closed_negative),
        ]:
            result['cases'][name] = run_case(name, fn, ctx, out)
        browser.close()
    payload = json.dumps(result, sort_keys=True, separators=(',', ':'))
    result['resultSha256'] = hashlib.sha256(payload.encode()).hexdigest()
    final = json.dumps(result, sort_keys=True, separators=(',', ':'))
    receipt.write_text(final + '\n', encoding='utf-8')
    print('C25_CAPTURE_JSON=' + final, flush=True)
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--chrome', default=CHROME_DEFAULT)
    p.add_argument('--out', default='')
    p.add_argument('--receipt', default='project_tools/.c25-capture-result.json')
    a = p.parse_args()
    if not a.chrome:
        raise SystemExit('Chrome unavailable')
    out = pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c25-capture-'))
    run(a.chrome, out, pathlib.Path(a.receipt))


if __name__ == '__main__':
    main()
