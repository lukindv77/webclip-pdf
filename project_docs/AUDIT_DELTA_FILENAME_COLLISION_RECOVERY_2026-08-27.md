# Audit delta — filename collision / recovery identity — 2026-08-27

Baseline HEAD before this audit block: `8a7b4f0cb0d9acce8ee5d7db7ab5864ad753bd2a`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh cross-check of filename/path collision semantics for Yandex save and local Chrome download recovery. Existing owners: `P1-184`, `P0-006`, `P0-048`, `P0-039`.

No new P-number is required; this block supplies deterministic self-generated collision cases for existing open/partial identity contracts.

## Yandex: same-path collision is self-generated, not only external

### Filename precision

`content.js::formatFilenameTimestamp()` formats only to whole seconds:

`YYYY-MM-DD_HH-MM-SS`.

`buildPdfFilename()` combines title + site + this timestamp. Therefore separate save operations with the same effective title/site that start during the same second can legitimately produce the same PDF filename.

The Yandex destination then maps that filename into the same managed folder/path for the same reading mode/site context.

This is especially realistic across two tabs/documents: PDF generation is globally serialized by debugger ownership, but metadata timestamps are captured before/around the user save workflow and different operations can still share the same whole-second naming timestamp/path.

### Retry reuse consequence

Initial Yandex upload uses `overwrite=false`. Explicit retry uses:

`uploadCachedRecordToYandex(... allowExisting: true)`.

When `allowExisting` is true, WebClip GETs the exact remote path and accepts an existing `type=file` when its byte size equals `expectedPdfBytes`, then skips sending the intended bytes.

Thus the same-size unrelated-file scenario in P1-184 does not require an external Yandex client or exotic replacement race. A second WebClip operation can create the colliding path itself.

If two distinct PDFs happen to have equal byte length, retry can adopt the other WebClip operation's file. With `createPublicLinks=true`, the existing P1-184 path can then publish/adopt the wrong object before stronger identity proof.

### Required P1-184/P0-006 refinement

- Treat filename/path collision as a normal product condition, not as proof of retry identity.
- Preserve human filename requirements, but remote object creation needs an operation/content receipt independent of textual path.
- If a path is occupied by a different proven object/content, choose an explicit collision-safe outcome (new unique managed path or fail for user resolution); never infer identity from same filename + same bytes.
- A local content digest/operation receipt from P0-079 can feed P1-184 stronger remote proof, but local ownership and remote identity remain separate contracts.
- Regression must include two WebClip-generated saves with identical filename timestamp/path and equal byte length but different PDF bytes.

## Local Chrome download: `uniquify` conflicts with recovery fallback

### Runtime uses Chrome's uniquify policy explicitly

Automatic Blob download starts with:

- requested `filename: targetFilename`;
- `saveAs: false`;
- `conflictAction: 'uniquify'`.

Current Chrome downloads API documentation defines `uniquify` as changing a conflicting filename by adding a counter before the extension. Reference: https://developer.chrome.com/docs/extensions/reference/api/downloads

Therefore the eventual `DownloadItem.filename` is not guaranteed to equal the requested WebClip filename.

### Primary recovery identity remains good when Blob URL survives

`pendingDownloads` reconciliation first compares the exact original Blob URL against `DownloadItem.url/finalUrl`. A uniquified disk filename does not break that primary identity.

### Fallback becomes false-negative exactly when it is needed

The code intentionally has a fallback for cases where Chrome no longer exposes the original Blob URL. That fallback requires, within a short window:

- exact `filename === expectedFilename`;
- exact expected byte size.

For a successful download that Chrome uniquified because a same-name file already existed, the actual basename differs from `expectedFilename`. Therefore once Blob URL evidence disappears, that physically successful own-extension download cannot satisfy the fallback at all.

This is a distinct false-negative mode inside the existing P0-048/P0-039 recovery root cause.

### Do not repair by stripping `(N)` heuristically

Blindly treating `name.pdf` and `name (1).pdf` as the same intended file would weaken identity and amplify the ambiguity already recorded in P0-048. Multiple own-extension downloads with same requested name/size can coexist and Chrome can assign different suffixes.

Required direction:

- bind the exact `downloadId` as early as Chrome exposes it;
- for unknown start settlement, use a stronger own-download creation receipt/event correlation around the exact Blob URL/start generation;
- exclude already-claimed downloadIds;
- if fallback remains necessary, require uniqueness and stronger temporal/operation evidence rather than filename normalization alone;
- unresolved successful-but-unprovable outcome remains dead-letter/manual-resolution evidence under P0-039; do not delete checkpoint based on wall clock.

## Required deterministic regressions

1. Two Yandex saves generate the same textual filename/path; different equal-sized PDFs are never adopted as each other on retry.
2. Occupied Yandex path by unrelated same-size WebClip file never triggers publish/adoption under P1-184.
3. Automatic local download where `name.pdf` already exists and Chrome creates a uniquified target still reconciles through exact own-download identity after lost `downloads.download()` response.
4. If Blob URL is unavailable, multiple same-name/same-size uniquified DownloadItems cause fail-closed ambiguity, not first-match claim.
5. One physical DownloadItem cannot bind two pending intents.
6. Unresolved uniquified outcome retains recovery evidence beyond the current TTL policy per P0-039.

## Classification

No new P-number created. Extend `P1-184` / `P0-006` for self-generated Yandex path collisions and `P0-048` / `P0-039` for Chrome `uniquify` fallback false-negatives.

`P0-079` and `P1-198` remain evidence-reserved as separate findings. `P2-020` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.
