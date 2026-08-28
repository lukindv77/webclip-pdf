# Audit delta — Journal entry-id width coherence — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owner: **P1-025** (`WEBCLIP_OPEN_JOURNAL_SAVED_FILE` / Yandex destination badge). Import/schema ownership remains **P1-030**. This checkpoint adds one deterministic boundary requirement: every Journal-entry RPC must accept the same canonical entry-id width as the persisted/imported schema.

## Source proof

Current persisted/imported Journal schema defines:

- `MAX_IMPORTED_ENTRY_ID_CHARS = 180`;
- `normalizeImportedJournalEntry()` accepts/bounds entry ids to 180 characters;
- `journalViewSummary()` returns `entry.id` sliced to 180 characters.

Most Journal mutation routes preserve the full textual id and delegate validation/lookup downstream:

- `WEBCLIP_JOURNAL_DELETE` -> `deleteJournalEntry(String(message.id || ''))`;
- comment add/edit/delete routes use the full `String(message.id || '')`;
- `WEBCLIP_JOURNAL_MARK_READ` uses the full `String(message.id || '')`;
- `WEBCLIP_JOURNAL_GET_MANY` accepts ids and its helper bounds them to the persisted 180-character domain.

The open-saved-file route is inconsistent:

```js
case 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE': {
  ...
  const id = boundedContentString(message.id, 160).trim();
  ...
  const entry = await getJournalEntryById(id);
```

`journal.js` sends the actual rendered `entry.id` when the Yandex destination badge is clicked.

## Deterministic failure

1. Import a valid Journal backup containing a Yandex entry with an id of 161–180 characters.
2. Import normalization accepts the id and stores it unchanged within the supported 180-character schema.
3. Journal view returns/renders that same id.
4. Delete/comment/Mark Read can still address the exact entry because those routes do not truncate it to 160.
5. User clicks the `Яндекс Диск` badge.
6. `journal.js` sends the exact id.
7. Worker truncates it to 160 and calls `getJournalEntryById()` with a different key.
8. The real entry is not found, so the valid public URL is treated as unavailable.

This is deterministic and does not require a race or malformed IndexedDB state.

## Required contract

1. Define one canonical Journal entry-id normalization helper/shared constant.
2. The worker, Journal page, import normalizer, view summaries, `GET_MANY`, open-file, delete, comments and Mark Read must all use the same supported id domain.
3. A supported id must never be silently truncated into a different valid-looking key at an action boundary.
4. If an id is outside the supported domain, reject it explicitly before lookup rather than retargeting it by truncation.
5. Imported ids of exactly 180 characters remain round-trippable through export/import and every user-visible Journal action.
6. Future versioned schema changes to id width must migrate/validate all RPC consumers together.

## Regression cases

- 160-character imported Yandex id -> destination badge opens the exact entry.
- 161-character id -> same result.
- 180-character id -> same result.
- 181-character source id -> import applies the schema's explicit normalization/rejection rule; no action later performs a second incompatible truncation.
- Two ids sharing the first 160 characters but differing afterward remain distinct; opening either cannot address the other.
- Delete/comment/Mark Read/open-file all resolve the same exact persisted key.

## Duplicate check

This is not a new import-streaming problem and does not require a new stable P-number. It refines **P1-025** because that feature's protected `journalEntryId` transport currently narrows the schema behind the UI, with **P1-030** providing the imported-id domain.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.