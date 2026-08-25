# P1-027 closure — destination/read-status badges without duplicate mode row

Status: **REGRESSION**

## Problem
Journal duplicated the same state twice: the card already had destination and reading-status badges, but meta also rendered `Режим выгрузки: ... · Статус чтения: ...`. Local downloads were labeled with the generic `Файл`, which did not describe the user-visible result and visually resembled another colored status.

## Implementation
- Removed `.entry-mode-row` / `.entry-mode-summary` and the duplicate `Режим выгрузки... · Статус чтения...` text from `buildEntryCard()`.
- Preserved P1-025 Yandex semantics: `Яндекс Диск` remains a button only when the saved Yandex public URL is openable through the protected service-worker RPC.
- Local `destination=download` now renders `Скачан локально` as a `<span>` informational badge with no click handler.
- Changed `.badge.download` to neutral gray (`#f1f3f4` / `#3c4043`, gray border).
- Kept the reading badge independently as `Прочитано` / `Прочитать позже`.
- Kept `.entry-badges` as `flex-wrap: nowrap`, preserving a horizontal pair at normal card widths.
- Preserved historical `Переведено в «Прочитано»: ...` metadata as a separate fact; it does not duplicate the current status.
- No IndexedDB migration and no changes to Yandex identity/destructive flows.

## Evidence
- `project_tools/test_p1_027_destination_badges.js` PASS.
- `project_tools/browser_p1_027_destination_badges.py` PASS on Chromium 144.0.7559.96.
- Browser regression confirms Yandex read/later and local download cards, neutral local styling, non-action local badge, nowrap alignment and preserved moved-to-read history.
- Full local gate: **63/63** JavaScript `node --check`, **51/51** deterministic tests.
- Regressions PASS: P1-025, P1-026, P1-009, managed P1-007.
- Latest managed P1-007 selected-only PDF: **37,604 bytes**; Journal and mocked Yandex worker PASS.
- Manifest remains **MV3 / 0.9.8**. Full unpacked Chrome + real Yandex remains release QA.

No handoff archive was created for this task.
