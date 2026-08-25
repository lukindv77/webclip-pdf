# P1-028 closure — journal badges in date/time row

Status: **REGRESSION**

## Problem
After P1-025/P1-027 the destination and reading-status badges had correct semantics, but they still occupied a separate upper-right block beside the page title. This split closely related entry metadata across two visual regions and did not match the required Journal hierarchy.

## Implementation
- Added `.entry-title-meta` directly below the entry `h2`.
- Moved the existing `.when` element and existing `.entry-badges` group into that row.
- Date/time remains on the left; the badge group is pushed to the right with `margin-left:auto`.
- Removed the former badge sibling from `.entry-head`; no empty reserved right-side container remains.
- Kept `.entry-badges` horizontal with `flex-wrap: nowrap`.
- Did not change the established `.badge`, `.badge-action`, `.badge.yandex`, `.badge.download`, `.badge.read`, or `.badge.read-later` sizing/visual rules.
- At narrow widths `.when` uses `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`, so date/time degrades predictably without overlapping or resizing badges.
- P1-025 semantics remain intact (`Яндекс Диск` is the protected open action); P1-027 semantics remain intact (`Скачан локально` is informational/non-action).

## Evidence
- Pre-change Chromium baseline captured before implementation:
  - `Яндекс Диск`: **109.03125 × 28 px**
  - `Прочитано` on Yandex card: **75.09375 × 28 px**
  - `Скачан локально`: **111.796875 × 24 px**
  - `Прочитано` on local card: **75.09375 × 24 px**
- `project_tools/test_p1_028_badge_placement.js` PASS.
- `project_tools/browser_p1_028_badge_placement.py` PASS on Chromium **144.0.7559.96**: under-title placement, date-left/badges-right alignment, no old upper-right badge sibling, exact baseline dimensions preserved, narrow-width no-overlap behavior, Yandex button/local span semantics preserved.
- Full local gate: **64/64** JavaScript `node --check`, **52/52** deterministic tests.
- Browser regressions PASS: P1-027, P1-025, P1-009, managed P1-007.
- Latest managed P1-007 selected-only PDF: **37,602 bytes**; Journal and mocked Yandex worker PASS.
- Manifest remains **MV3 / 0.9.8**. Full unpacked Chrome + real Yandex remains release QA.

No handoff archive was created for this task.
