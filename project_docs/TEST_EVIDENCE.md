# Historical test evidence

This document consolidates historical engineering test/browser checkpoints that were previously scattered across root `STATIC_CHECKS_*.md`, closure narratives and the accumulated `QA_STATUS_0_9_9.md` WIP log.

**It is not the current test gate.** These results were executed at different physical WIP checkpoints and their file/test counts are therefore not expected to be monotonic by P-number. No test was rerun to create this document.

Current release/test truth is maintained in `project_docs/TEST_STATUS.md`.

## Common boundary

Unless a row explicitly says otherwise:

- manifest was Manifest V3 / version `0.9.8`;
- managed browser runs used Chromium `144.0.7559.96`;
- managed browser regression is engineering evidence, not full unpacked-extension release QA;
- real Yandex OAuth/API E2E was not established by the mocked worker tests.

## Recorded checkpoints

| Checkpoint | Syntax | Deterministic | Browser / special evidence |
|---|---:|---:|---|
| P1-001 + P0-003 | 54/54 | 44/44 | SelectionSnapshot v3 browser PASS; iframe framePath restore PASS; managed P1-007 PASS, PDF 36,000 bytes. P1-117…122 timing harness hardened separately and passed 60/60 stress; runtime unchanged. |
| P1-003 | 55/55 | 45/45 | Resource browser PASS: 5 attempted, 2 ready, 3 unavailable; unavailable did not block PDF; query/token-like diagnostics redacted; temporary lazy attributes restored; managed PDF 37,600 bytes. |
| P1-004 | 57/57 | 46/46 | Cross-origin frame browser PASS: SOP boundary, remote Include, v3 framePath, restore, print prepare/restore; frame expansion 350→944 px; managed PDF 37,499 bytes. Real unpacked permission prompt blocked by policy. |
| P1-007 | 51/51 | 41/41 | Managed integration PASS: selection, PDF 35,886 bytes, selected-only text, Journal render, Yandex worker mock, session-only token. Full unpacked runner explicitly returned policy-blocked; it did not silently skip. |
| P1-008 | 58/58 | 47/47 | Options user-settings deterministic + Chromium export/import PASS; managed PDF 37,501 bytes. |
| P1-009 | 60/60 | 48/48 | Journal filter browser PASS: 25 total / 20 first page / 2 title matches including record originally beyond page 1; AND/OR + comments/site/URL PASS; managed PDF 37,692 bytes. Later research reopened scalability acceptance, so this remains semantics evidence. |
| P1-025 | 61/61 | 49/49 | Yandex destination badge deterministic/browser PASS; managed PDF 37,604 bytes. |
| P1-026 | 62/62 | 50/50 | Russian Include/Exclude terminology browser PASS; one Journal selection summary, managed PDF 37,604 bytes. |
| P1-027 | 63/63 | 51/51 | Destination/read badge browser PASS; duplicate mode row absent; local badge neutral/non-action; managed PDF 37,604 bytes. |
| P1-028 | 64/64 | 52/52 | Badge placement browser PASS; baseline dimensions preserved: Yandex 109.03125x28, Yandex read 75.09375x28, local 111.796875x24, local read 75.09375x24; managed PDF 37,602 bytes. |
| P1-074 / P1-090 checkpoint | 66/66 | 54/54 | Import staging hung IDB open/write/read/delete fault injection PASS; P1-090 Yandex identity deterministic PASS; Journal browser + managed PDF 37,604 bytes. |
| P1-079 / P1-080 | 68/68 | 55/55 | Save As owner deterministic/browser PASS; no worker `saveAs:true`; pending native dialog remained one call without synthetic timeout/retry; managed PDF 37,604 bytes. |
| P1-081 / P1-084 | 69/69 | 56/56 | OperationLog/PDF-cache hung transaction abort + readonly no-publication-before-complete PASS; OperationLog v1→v2 PASS. |
| P1-085 / P1-124 | 71/71 | 58/58 | Hung direct Journal read abort + bounded SW fallback PASS; same-worker `tabs.create` timeout/no-duplicate/late-receipt PASS. Later research reopened P1-124 for MV3 restart durability. |
| P1-125 / P1-126 | 73/73 | 60/60 | `executeScript` settlement regression PASS; low-level worker `executeScript` exactly one call site. `tabs.get` bounded regression PASS; low-level worker `tabs.get` exactly one call site. Later research reopened P1-125 same-URL document generation. |
| P1-128 / P1-129 | 75/75 | 62/62 | Offscreen close single-flight/deadline/reschedule PASS; PREPARED late-settlement/RELEASE barrier PASS; P1-079/080 owner regression still PASS. |
| P1-130 / P1-131 historical closure gate | 77/77 | 64/64 | Action mutation generation/deadline/global pending budget PASS; debugger actual-settlement global PDF budget PASS. Later P1-217 adds degraded visual truth beyond P1-130. |
| P1-146 recorded static checkpoint | 52/52 | 42/42 | Automatic local-download start settlement regression PASS; managed integration PASS, PDF 35,885 bytes. This checkpoint was taken on a different physical WIP state and must not be ordered by count against later-number rows. |
| P1-094 earlier physical WIP | 47/47 | 38/38 | Context retention regression PASS; P0-060/061/062 source-anchor and P1-032 bounded-view regressions PASS. This is intentionally retained as an example of a non-monotonic historical WIP checkpoint. |
| P1-117…P1-122 earlier physical WIP | 48/48 | 39/39 | Storage/alarm actual-settlement regression PASS plus prerequisite neighboring regressions. |
| P1-123 / P1-127 earlier physical WIP | 49/49 | 40/40 | Session get/remove/set fault injection + actual-settlement serialization PASS; Journal/popup bounded read paths PASS. |

## Important browser / real-world evidence not reducible to suite counts

- P1-153 real Chrome `its.1c.ru` clipping reproduction was closed on 2026-08-25 for that specific page: 2-page PDF, complete third example/final text/link, `documentScrollHeight=1155` vs viewport 878, resources 5/5, PDF 134,659 bytes.
- P1-149 real diagnostic repro established selected content inside a same-origin iframe (`frameDepth=1`) with 3324 child text chars and 983 px child scroll height while the top print document stayed viewport constrained.
- P1-151/P1-152 real repro sequence established that height expansion alone did not solve Chromium pagination of an iframe replaced element and that a fully cloned proxy could still be constrained by the original ancestor shell.
- Managed P1-007 runs intentionally used the policy-managed Chromium environment; the project did not bypass enterprise policy to fake an unpacked extension pass.
- Historical release-QA environment detail: system Chromium was governed by `/etc/chromium/policies/managed/000_policy_merge.json` with `ExtensionInstallBlocklist: ["*"]`; unpacked loading reported `Loading of unpacked extensions is disabled by the administrator`. No alternate local Chrome/Chromium/Chrome-for-Testing was available in that environment, and installing a Playwright browser was unavailable because that environment had no network access. This explains a historical blocker; it is not a permanent statement about future environments.
- A headed Xvfb/Playwright rerun for the isolated `Прочитать позже` UI flow timed out in that environment. Separately, user-side functional confirmation reported that `Прочитать позже` completed saving after the historical `PAGE_UPLOAD_STAGES` fix. This is useful WIP evidence, not release E2E.
- A real Chromium print-render experiment for the progress UI established that `beforeprint`/`afterprint` completed within the same print-render before the next `requestAnimationFrame`; the next frame observed the WebClip host restored with `display:block`, and `pdftotext` confirmed the test WebClip progress-modal text was absent from the resulting PDF. This proves that specific historical print-visibility behavior, not the broader current print-generation research contract.
- An research-only headless Chromium print experiment demonstrated that Chromium can preserve unsafe link annotations (`javascript:`, `data:` and a local `file:` target) in PDF output; that evidence motivated P0-071. It was not a release regression gate.

## Retired source mapping

The following historical root static reports were read and consolidated here before removal from current `main`:

- `STATIC_CHECKS_P1-001.md`
- `STATIC_CHECKS_P1-003.md`
- `STATIC_CHECKS_P1-004.md`
- `STATIC_CHECKS_P1-007.md`
- `STATIC_CHECKS_P1-008.md`
- `STATIC_CHECKS_P1-009.md`
- `STATIC_CHECKS_P1-025.md`
- `STATIC_CHECKS_P1-026.md`
- `STATIC_CHECKS_P1-027.md`
- `STATIC_CHECKS_P1-028.md`
- `STATIC_CHECKS_P1-074.md`
- `STATIC_CHECKS_P1-079_P1-080.md`
- `STATIC_CHECKS_P1-081_P1-084.md`
- `STATIC_CHECKS_P1-085_P1-124.md`
- `STATIC_CHECKS_P1-090.md`
- `STATIC_CHECKS_P1-094.md`
- `STATIC_CHECKS_P1-117_P1-122.md`
- `STATIC_CHECKS_P1-123_P1-127.md`
- `STATIC_CHECKS_P1-125_P1-126.md`
- `STATIC_CHECKS_P1-128_P1-129.md`
- `STATIC_CHECKS_P1-146.md`

The accumulated root `QA_STATUS_0_9_9.md` was also retirement-compared against this ledger and `TEST_STATUS.md`. Its unique browser/environment observations are retained above; its repeated WIP chronology, implementation summaries and old PASS counts are intentionally not duplicated because the current registry and this evidence ledger already preserve their durable meaning. All retired source files remain exactly recoverable from Git history.
