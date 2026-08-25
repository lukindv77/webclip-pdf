# P1-026 closure

Status: **REGRESSION**
Date: 2026-08-25
Manifest: **0.9.8 / Manifest V3**

## Problem
Journal duplicated the same selection counts in two places: a standalone `Сохранено областей: N · Исключено: M` row and the selection-details heading. User-facing surfaces also mixed Russian wording with technical `Include/Exclude` terminology, making one selection model look like several different concepts.

## Implementation
- Removed the standalone Journal counts row from `buildEntryCard()`; counts remain once in `Области страницы Включены/Исключены (N/M)`.
- Locator group headings are `Включены` and `Исключены`; the apply action is `Применить Включены/Исключены`.
- Top-page selection toolbar counts are `Включены: N · Исключены: M`.
- History modal, restore status, toasts, OperationLog clear stage, Yandex help and manifest description no longer expose `Include/Exclude` as user terminology.
- Current README/project documentation uses `Включены`/`Исключены` for page areas.
- Internal compatibility names (`state.includes`, `state.excludes`, `includeCount`, `excludeCount`, SelectionSnapshot fields and RPC payloads) were intentionally not renamed.
- No selection, PDF, Yandex identity or destructive-flow behavior changed.

## Verification
- `project_tools/test_p1_026_russian_selection_terms.js`: PASS.
- `project_tools/browser_p1_026_russian_selection_terms.py`: PASS on Chromium 144.0.7559.96; verifies toolbar 0/0 -> 1/0, one Journal counter surface, Russian summary and locator headings.
- Full JavaScript syntax gate: 62/62 PASS.
- Full deterministic suite: 50/50 PASS.
- `browser_p1_025_yandex_badge.py`: PASS.
- `browser_p1_009_journal_filter.py`: PASS.
- `browser_p1_007_managed_integration.py`: PASS; selected-only PDF 37,604 bytes, Journal render PASS, mocked Yandex worker PASS.

## Release note
This is local audit/regression evidence, not release QA. Manifest remains `0.9.8`. No handoff archive was created.
