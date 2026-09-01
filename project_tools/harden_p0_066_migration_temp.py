#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def update(path, old, new, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

update(
    'durable-url-policy.js',
    """  function migrateStoreCursor(store, mapper) {\n    if (!store?.openCursor) return;\n    const request = store.openCursor();\n    request.onsuccess = () => {\n      const cursor = request.result;\n      if (!cursor) return;\n      try { cursor.update(mapper(cursor.value)); } catch (_) {}\n      cursor.continue();\n    };\n  }\n""",
    """  function abortMigration(tx) {\n    try { tx?.abort?.(); } catch (_) {}\n  }\n\n  function migrateStoreCursor(store, mapper, tx) {\n    if (!store?.openCursor) return;\n    const request = store.openCursor();\n    request.onerror = () => abortMigration(tx);\n    request.onsuccess = () => {\n      const cursor = request.result;\n      if (!cursor) return;\n      try {\n        const update = cursor.update(mapper(cursor.value));\n        if (update && typeof update === 'object') update.onerror = () => abortMigration(tx);\n        cursor.continue();\n      } catch (_) {\n        abortMigration(tx);\n      }\n    };\n  }\n""",
    'fail-closed cursor migration'
)

p = ROOT / 'durable-url-policy.js'
s = p.read_text(encoding='utf-8')
s = s.replace("migrateStoreCursor(tx.objectStore('entries'), sanitizeJournalEntryUrls);", "migrateStoreCursor(tx.objectStore('entries'), sanitizeJournalEntryUrls, tx);")
s = s.replace("migrateStoreCursor(tx.objectStore(name), (value) => ({ ...value, data: sanitizePendingDataUrls(value?.data || {}) }));", "migrateStoreCursor(tx.objectStore(name), (value) => ({ ...value, data: sanitizePendingDataUrls(value?.data || {}) }), tx);")
s = s.replace("        return out;\n      });\n    }\n    if (db.objectStoreNames.contains('urlStats')) {\n      try { tx.objectStore('urlStats').clear(); } catch (_) {}\n    }", "        return out;\n      }, tx);\n    }\n    if (db.objectStoreNames.contains('urlStats')) {\n      try {\n        const clear = tx.objectStore('urlStats').clear();\n        if (clear && typeof clear === 'object') clear.onerror = () => abortMigration(tx);\n      } catch (_) {\n        abortMigration(tx);\n      }\n    }")
s = s.replace("migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls);", "migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls, tx);")
s = s.replace("migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls);", "migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls, tx);")
p.write_text(s, encoding='utf-8')

p = ROOT / 'journal.js'
s = p.read_text(encoding='utf-8')
marker = 'function openJournalDbForView() {'
start = s.find(marker)
if start < 0:
    raise SystemExit('journal view DB function marker missing')
prefix, tail = s[:start], s[start:]
old_handler = '    request.onupgradeneeded = () => {\n'
if tail.count(old_handler) < 1:
    raise SystemExit('journal view upgrade handler missing')
tail = tail.replace(old_handler, '    request.onupgradeneeded = (event) => {\n', 1)
old_version = '      WebClipDurableUrlPolicy.migrateJournalDbV8(db, request.transaction, request.oldVersion || 0);\n'
if tail.count(old_version) != 1:
    raise SystemExit(f'journal view oldVersion source expected once, found {tail.count(old_version)}')
tail = tail.replace(old_version, '      WebClipDurableUrlPolicy.migrateJournalDbV8(db, request.transaction, event?.oldVersion || 0);\n', 1)
p.write_text(prefix + tail, encoding='utf-8')

print('P0-066 migration hardening applied')