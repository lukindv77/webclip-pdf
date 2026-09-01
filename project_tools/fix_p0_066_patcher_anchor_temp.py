#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).with_name('apply_p0_066_durable_url_policy.py')
s = p.read_text(encoding='utf-8')
old = "s = replace_once(s, '(db, tx) => {\\n      let store;', '(db, tx, event) => {\\n      let store;', 'journal upgrade signature')"
new = "s = replace_once(s, \"JOURNAL_DB_VERSION,\\n    (db, tx) => {\\n      let store;\", \"JOURNAL_DB_VERSION,\\n    (db, tx, event) => {\\n      let store;\", 'journal upgrade signature')"
if s.count(old) != 1:
    raise SystemExit(f'patcher anchor fix expected once, found {s.count(old)}')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
print('P0-066 patcher anchor fixed')