# P1-009 closure — universal multiline Journal filter

Historical implementation gate: **REGRESSION at the time of this closure**. Current canonical status: **PARTIAL**; see `project_docs/PRIORITIES_P0_P1_P2.md`.

> Later deep audit found a valid worst-case CPU/deadline gap in the exact full-Journal filter scan (`P1-009`): with up to 100k entries and multi-megabyte allowed comment payloads, repeated chunked lowercase/matching can still exhaust the 20-second view budget. The verification below proves the implemented filter semantics and bounded UI contracts from the original closure; it does **not** prove the later search-summary/index acceptance criterion.

## Problem

Journal did not have the required universal search layer across title/comments/site/URL. With pagination and large journals, a client-side post-page filter would miss matching records that were outside the currently loaded 20 rows and would conflict with the bounded-memory P1-032 architecture.

## Implemented

- Added the preserved universal-filter UI design to production `journal.html`.
- Each row contains text and field selectors: `Наименование` default ON, `Комментарии`, `Сайт`, `URL`.
- Up to 8 rows are accepted; each query is bounded to 512 characters. A row cannot remain with zero fields selected.
- Non-empty rows combine as `И` by default or `ИЛИ`.
- Added shared pure `journal-text-filter.js`, loaded by Journal and imported by the MV3 service worker so direct IndexedDB and fallback behavior cannot drift.
- Matching uses the full current cursor entry for title and comments; comments include `fileComment`, legacy `journalComment` and `journalComments[].text/comment`.
- Site matching covers hostname plus Public Suffix hierarchy values; URL matching covers `url`/`urlKey`.
- Long strings use bounded-size lowercase chunks with overlap instead of materializing a full lowercase duplicate.
- Universal filter is evaluated before Journal mode counters, domain aggregation, page total/offset, URL grouping and group-child pagination.
- Filter edits reset page/group boundaries and are debounced by 180 ms; no persistent Journal data is changed.
- Existing direct IndexedDB deadline/fallback architecture is retained.

## Verification

- `node project_tools/test_p1_009_universal_filter.js` PASS: all four fields, AND/OR, no-field fallback, 8-row/512-char bounds, chunk-boundary match, source-contract checks for pre-pagination/pre-aggregation placement.
- `/opt/pyvenv/bin/python project_tools/browser_p1_009_journal_filter.py` PASS on Chromium 144.0.7559.96: 25-entry fixture, 20-entry first page, title filter returned 2 matches including one originally beyond page 1; comments/site/URL and AND/OR PASS.
- Full JavaScript syntax gate: **60/60 PASS**.
- Full deterministic suite: **48/48 PASS**.
- P1-001, P1-003, P1-004 and P1-008 browser regressions PASS after changes.
- `browser_p1_007_managed_integration.py` PASS after changes; selected-only PDF **37,692 bytes**, Journal PASS, Yandex worker mock PASS.
- Manifest: **V3 / 0.9.8**.

Full unpacked Chrome + real Yandex remains release QA. No handoff/recovery archive was created for this task.
