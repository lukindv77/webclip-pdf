# P1-025 closure

Status: **REGRESSION**
Date: 2026-08-25
Manifest: **0.9.8 / Manifest V3**

## Problem
Journal duplicated Yandex saved-file navigation: a destination badge existed alongside a separate `Открыть сохранённый файл на Яндекс Диске` text link. The badge did not own the action and entries without a usable public URL had no explicit disabled state.

## Implementation
- Removed the standalone saved-file text link from `buildEntryCard()`.
- `destination=yandex` renders its existing `Яндекс Диск` badge as a button with unchanged badge sizing/colors.
- UI enables the button only for HTTPS `disk.yandex.ru`, `*.disk.yandex.ru` or `yadi.sk` public URLs; unavailable/invalid URLs render a disabled badge with title and aria-label explanation.
- Click sends only `{type:'WEBCLIP_OPEN_JOURNAL_SAVED_FILE', id: entry.id}`. It does not navigate directly to `entry.publicUrl`.
- Existing P0-037 service-worker boundary remains authoritative: the worker re-reads the Journal entry, normalizes/validates the public URL and creates the tab only when allowed.
- `destination=download` stays a non-interactive span.
- Yandex deletion/move/identity flows were not changed.

## Verification
- `project_tools/test_p1_025_yandex_badge.js`: PASS, including allowed/denied URL policy and source contracts.
- `project_tools/browser_p1_025_yandex_badge.py`: PASS on Chromium 144.0.7559.96.
- Browser verified valid Yandex badge click, disabled badge without publicUrl, absence of standalone link and non-action local badge.
- Full syntax gate: 61/61 PASS.
- Full deterministic suite: 49/49 PASS.
- `browser_p1_009_journal_filter.py`: PASS after the rendering change.
- `browser_p1_007_managed_integration.py`: PASS; selected-only PDF 37,604 bytes, Journal render PASS, mocked Yandex worker PASS.

## Release note
This is local audit/regression evidence, not release QA. Manifest remains `0.9.8`. No handoff archive was created.
