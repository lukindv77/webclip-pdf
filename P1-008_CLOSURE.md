# P1-008 closure — user settings export/import

Status: **REGRESSION**

## Problem

WebClip had no physically implemented portable user-settings format. Users had to repeat configuration manually, while a naive storage dump could leak session OAuth/PKCE material or overwrite a live OAuth session on import.

## Implemented

- Added Options panel for settings export/import.
- Added `webclip-user-settings` schema v1 with 8 allowlisted values: Yandex `clientId`, `rootPath`, `createPublicLinks`, backup enabled/interval/retry, Journal `groupByUrl`, OperationLog `retentionHours`.
- Export reads only explicit non-secret `storage.local` keys.
- Import is limited to 256 KiB and validates exact schema, required fields, types/ranges, unknown fields, secret-like keys and Yandex root-path invariants before writes.
- OAuth access/refresh token, PKCE state/code verifier, session auth, Journal, durable checkpoints, backup execution state and OperationLog contents are excluded and never written.
- Import commit is a single bundled non-cancellable `chrome.storage.local.set` containing all persistent settings plus `webclipUserSettingsImportPending`.
- Local storage timeout returns pending/unknown settlement and never auto-retries. Late success or next MV3 worker start reconciles backup scheduler and clears the marker.
- Subsequent Yandex config / OperationLog mutations wait for an actually unresolved settings-import storage settlement.

## Verification

- `node project_tools/test_p1_008_user_settings.js` PASS: allowlist, secret exclusion, strict validation, one bundled write, actual rejection, timeout/late success reconciliation, session untouched.
- `/opt/pyvenv/bin/python project_tools/browser_p1_008_user_settings.py` PASS on Chromium 144.0.7559.96: production Options export/download path and file-import UI.
- Full deterministic suite: **47/47 PASS**.
- JavaScript syntax: **58/58 PASS**.
- `browser_p1_007_managed_integration.py` PASS after changes; selected-only PDF **37,501 bytes**, Journal/Yandex mocks PASS.
- Manifest: **V3 / 0.9.8**.

Full unpacked Chrome + real Yandex remains release QA. No handoff/recovery archive was created for this task.
