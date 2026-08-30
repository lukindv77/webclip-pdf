#!/usr/bin/env python3
"""L3/L4 control proving loss of actually materialized virtual-list history.

Safe local fixture only. A simulated user progresses through every virtual window from
logical item 1 through 57, then returns to the top. The page records every logical item
that was actually mounted. Physical PDF is then inspected to show which history survives.
"""

import argparse
import asyncio
import json
import re
import shutil
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright
from pypdf import PdfReader

HTML = r'''<!doctype html><meta charset=utf-8><style>
body{font-family:Arial;margin:20px}.box{height:256px;overflow:auto;border:2px solid #444}.spacer{height:3200px;position:relative}.row{position:absolute;left:0;right:0;height:32px;border-bottom:1px solid #ddd;background:#fff}
@media print{.box{height:auto!important;overflow:visible!important}}
</style><h1>GRADUAL VIRTUAL HISTORY</h1><div id=box class=box><div id=spacer class=spacer></div></div><div id=summary></div>
<script>
const box=document.querySelector('#box'), spacer=document.querySelector('#spacer'), pool=[], seen=new Set();
let maxReached=0, renders=0;
for(let i=0;i<8;i++){const d=document.createElement('div');d.className='row';spacer.appendChild(d);pool.push(d)}
function render(){renders++;const start=Math.max(0,Math.min(92,Math.floor(box.scrollTop/32)));maxReached=Math.max(maxReached,Math.min(100,Math.floor((box.scrollTop+box.clientHeight)/32)));pool.forEach((d,i)=>{const x=start+i+1;d.style.top=((x-1)*32)+'px';d.textContent='HIST-'+String(x).padStart(3,'0');seen.add(x)});document.querySelector('#summary').textContent='MAX '+maxReached+' SEEN '+[...seen].sort((a,b)=>a-b).join(',')}
box.addEventListener('scroll',render);render();
window.actions={to:n=>{box.scrollTop=(n-1)*32;box.dispatchEvent(new Event('scroll'))},top:()=>{box.scrollTop=0;box.dispatchEvent(new Event('scroll'))},metrics:()=>({maxReached,renders,scrollTop:box.scrollTop,current:pool.map(x=>x.textContent),seen:[...seen].sort((a,b)=>a-b)})};
</script>'''


def extract(path: Path) -> list[int]:
    text = '\n'.join((p.extract_text() or '') for p in PdfReader(str(path)).pages)
    return sorted(set(int(x) for x in re.findall(r'HIST-(\d{3})', text)))


async def run(chromium: str, out: Path) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 900, 'height': 700})
        await page.set_content(HTML)
        for start in (1, 9, 17, 25, 33, 41, 49, 50):
            await page.evaluate('(n)=>actions.to(n)', start)
            await page.wait_for_timeout(25)
        reached = await page.evaluate('actions.metrics()')
        await page.evaluate('actions.top()')
        await page.wait_for_timeout(25)
        before_print = await page.evaluate('actions.metrics()')
        pdf = out / 'gradual_virtual_history.pdf'
        await page.pdf(path=str(pdf), format='A4', print_background=True)
        after_print = await page.evaluate('actions.metrics()')
        printed = extract(pdf)
        await browser.close()
    expected_seen = list(range(1, 58))
    assert reached['seen'] == expected_seen, reached
    assert before_print['seen'] == expected_seen
    assert after_print['seen'] == expected_seen
    assert printed == list(range(1, 9)), printed
    return {'reached': reached, 'beforePrint': before_print, 'afterPrint': after_print, 'printedIds': printed}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chromium', default=shutil.which('chromium') or shutil.which('google-chrome') or '')
    ap.add_argument('--out', default='')
    args = ap.parse_args()
    if not args.chromium:
        raise SystemExit('Chromium not found')
    if args.out:
        out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
        result = asyncio.run(run(args.chromium, out))
        (out / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    else:
        with tempfile.TemporaryDirectory(prefix='webclip-virtual-history-') as tmp:
            result = asyncio.run(run(args.chromium, Path(tmp)))
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
