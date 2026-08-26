# Journal live/export/import envelope audit delta — 2026-08-27

Baseline source HEAD: `d3f14fe937133625a361d6ce6f8bd32370fdb8e9`.

This is a lossless checkpoint for existing P0-077. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-077 refinement — a valid live entry can exceed the export single-entry envelope

P0-077 already records two self-generated backup/restore mismatches:

- export can produce 50–64 MiB UTF-8 while import rejects >50 MiB bytes;
- live Journal can exceed 100000 compact entries while import caps `maxEntries: 100000`.

Fresh review found an earlier mismatch in the same unified live→export→import contract.

### Current limits

Live Journal allows independent bounded heavy fields on one entry, including at least:

- `selectionSnapshot` aggregate JSON budget up to about 2 MiB (`MAX_SELECTION_SNAPSHOT_JSON_CHARS = 2 * 1024 * 1024`);
- aggregate comment text up to about 2 MiB (`MAX_JOURNAL_COMMENTS_TOTAL_CHARS = 2 * 1024 * 1024`), plus comment object/ID/timestamp JSON overhead;
- `fileComment` up to 100000 characters;
- additional title/URL/resource report/Yandex/selection metadata.

These limits are independently valid; no live-entry aggregate admission forces their combined serialized record below 4 MiB.

Export batch reading does:

```text
json = JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })
if (json.length > JOURNAL_EXPORT_BATCH_MEMORY_CHARS /* 4 MiB */)
    throw JOURNAL_EXPORT_ENTRY_TOO_LARGE
```

Import, by contrast, permits a single source entry up to `MAX_JOURNAL_IMPORT_ENTRY_CHARS = 8 MiB`.

Therefore a record that WebClip can validly create and store locally can be larger than the 4 MiB export-single-record cap and make **both local full export and Yandex backup fail before a backup exists at all**. This is distinct from but shares the same root cause as the already documented “backup succeeds but same version cannot restore it”.

## Required broader P0-077 contract

Treat P0-077 as the unified **live Journal → export/backup → import/restore envelope** invariant:

1. Every state accepted as a normal live Journal profile must have a supported, explicit path to a self-generated recovery artifact.
2. Every artifact WebClip reports as successfully created must be importable by the same version.
3. A per-entry export batch-memory target must not silently become a stricter product data limit than live-entry admission.
4. If product policy chooses a true maximum serialized entry size, enforce that authoritative aggregate before live commit and use the same versioned bound in export and import.
5. If large but valid live entries remain allowed, export must stream/chunk a single record without requiring the entire serialized entry to fit a 4 MiB batch buffer. Simply raising the batch cap without a complete memory envelope is not sufficient.
6. Existing profiles already above a newly chosen bound must not become unrecoverable; provide a bounded migration/export path or a clearly defined compatibility mode.
7. Total chars, UTF-8 bytes, per-entry serialized size and entry count must all be part of one versioned envelope rather than independent constants that can drift.

## Required deterministic boundaries

Add at least:

1. One live-valid entry with selection snapshot near 2 MiB + comments near 2 MiB + non-empty file comment/metadata. It must either be rejected at live admission under one documented aggregate limit **before storage**, or successfully full-export and restore.
2. Single entry just below/above the chosen serialized-entry boundary.
3. High-Unicode total where chars ≤ current text cap but bytes cross import byte cap (existing P0-077 case).
4. Compact Journal around the chosen total entry-count boundary (existing P0-077 case).
5. Round-trip assertions that export/import preserve the same accepted heavy fields without hidden truncation.

## Existing related items, not duplicates

- **P1-053/P1-073**: export time/deadline/transaction budget; they do not define which valid records must be exportable.
- **P1-054**: offscreen Blob resource budget; it does not justify rejecting a live Journal record solely because the export batch implementation is 4 MiB.
- **P0-055**: comment aggregate boundary; it is one component of the live entry envelope.
- **P0-054**: selection snapshot aggregate boundary; likewise one component, not a total entry envelope.
- **P1-051**: export byte accounting; necessary but not sufficient for restore compatibility.

No new P0/P1 number is assigned because P0-077 already explicitly calls for one versioned restore envelope spanning live Journal, local export/import and Yandex backup/import.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.
