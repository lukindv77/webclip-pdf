from pathlib import Path

closure = Path('P1-153_CLOSURE.md')
text = closure.read_text(encoding='utf-8')
text = text.replace('Status: REGRESSION', 'Status: DONE', 1)
old = '- Real unmanaged Chrome retest on `https://its.1c.ru/db/metod8dev/content/2334/hdoc` remains the final behavioral verification.'
new = ('- Real Chrome verification on `https://its.1c.ru/db/metod8dev/content/2334/hdoc` PASS (2026-08-25): '
       'the resulting PDF is 2 pages and includes the complete third example plus the final explanatory paragraphs/link. '
       'OperationLog reports `documentScrollHeight=1155` with viewport `878` before print preparation, resources `5/5`, '
       'and Chromium PDF size `134659` bytes. This closes the original clipping repro on the real problem page.')
if old not in text:
    raise SystemExit('closure evidence anchor not found')
text = text.replace(old, new, 1)
closure.write_text(text, encoding='utf-8')

registry = Path('project_docs/PRIORITIES_P0_P1_P2.md')
text = registry.read_text(encoding='utf-8')
old_head = '### P1-153 — REGRESSION — root document print-flow normalization'
new_head = '### P1-153 — DONE — root document print-flow normalization'
if old_head not in text:
    raise SystemExit('registry P1-153 heading not found')
text = text.replace(old_head, new_head, 1)
old_tail = 'Permanent bounded OperationLog diagnostics record `document.rootLayout.html/body`; rollback remains style-node removal only. See `P1-153_CLOSURE.md`.'
new_tail = ('Permanent bounded OperationLog diagnostics record `document.rootLayout.html/body`; rollback remains style-node removal only. '
            'Real Chrome verification on the original its.1c.ru repro PASS: the generated copy is 2 pages and includes the complete article tail; '
            '`documentScrollHeight=1155` exceeds the viewport and Chromium pagination is no longer clipped. See `P1-153_CLOSURE.md`.')
if old_tail not in text:
    raise SystemExit('registry P1-153 body anchor not found')
text = text.replace(old_tail, new_tail, 1)
registry.write_text(text, encoding='utf-8')

qa = Path('QA_STATUS_0_9_9.md')
text = qa.read_text(encoding='utf-8')
marker = '## 2026-08-25 — P1-153 real its.1c.ru verification'
if marker not in text:
    text += ('\n\n' + marker + '\n\n'
             '- **PASS** on the original `https://its.1c.ru/db/metod8dev/content/2334/hdoc` clipping repro in real Chrome.\n'
             '- Resulting PDF: **2 pages**, complete third transaction example and final explanatory paragraphs/link are present.\n'
             '- OperationLog: resources **5/5**, Chromium PDF **134659 bytes**, `documentScrollHeight=1155` vs viewport `878`; root pagination is no longer viewport-clipped.\n'
             '- P1-147/P1-153 structural/root diagnostics remain permanent product diagnostics.\n'
             '- P1-153 status promoted from `REGRESSION` to `DONE` for this behavioral repro.\n')
qa.write_text(text, encoding='utf-8')

print('P1-153 real verification docs updated')
