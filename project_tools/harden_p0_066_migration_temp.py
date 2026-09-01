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
s = s.replace("      migrateStoreCursor(tx.objectStore('importStaging'), (value) => {", "      migrateStoreCursor(tx.objectStore('importStaging'), (value) => {")
s = s.replace("        return out;\n      });\n    }\n    if (db.objectStoreNames.contains('urlStats')) {\n      try { tx.objectStore('urlStats').clear(); } catch (_) {}\n    }", "        return out;\n      }, tx);\n    }\n    if (db.objectStoreNames.contains('urlStats')) {\n      try {\n        const clear = tx.objectStore('urlStats').clear();\n        if (clear && typeof clear === 'object') clear.onerror = () => abortMigration(tx);\n      } catch (_) {\n        abortMigration(tx);\n      }\n    }")
s = s.replace("migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls);", "migrateStoreCursor(tx.objectStore('pdfs'), sanitizeCachedPdfRecordUrls, tx);")
s = s.replace("migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls);", "migrateStoreCursor(tx.objectStore('meta'), sanitizeCachedPdfRecordUrls, tx);")
p.write_text(s, encoding='utf-8')

update(
    'journal.js',
    """    request.onupgradeneeded = () => {\n""",
    """    request.onupgradeneeded = (event) => {\n""",
    'journal upgrade event'
)
update(
    'journal.js',
    """      WebClipDurableUrlPolicy.migrateJournalDbV8(db, request.transaction, request.oldVersion || 0);\n""",
    """      WebClipDurableUrlPolicy.migrateJournalDbV8(db, request.transaction, event?.oldVersion || 0);\n""",
    'journal oldVersion source'
)

print('P0-066 migration hardening applied')