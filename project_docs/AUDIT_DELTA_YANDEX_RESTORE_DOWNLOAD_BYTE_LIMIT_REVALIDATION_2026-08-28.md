# Audit delta — Yandex restore download byte-limit revalidation — 2026-08-28

Source-of-truth `main` immediately before this write: `6447e4d3b1d11fc7795a816d6413601ece39ed6e`.

Docs-only positive-control checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Scope

The worker calls Yandex restore download with a field named `maxChars: 50 MiB`. This block checked whether that naming hides a chars-vs-UTF-8-byte mismatch capable of admitting an oversized backup or materializing it as an unbounded JS string.

## Positive result — restore download is physically byte-bounded

For signed `text-download`, offscreen converts the caller value into `maxBytes` and clamps it to its own:

`MAX_JOURNAL_IMPORT_BYTES = 50 * 1024 * 1024`.

`stageResponseBodyAsJournalImport()` then:

1. checks declared `Content-Length` against the byte cap when present;
2. requires a streaming `response.body.getReader()` path;
3. reads chunks as `Uint8Array`;
4. increments `totalBytes += bytes.byteLength`;
5. cancels/rejects immediately if `totalBytes > cap`;
6. stages bounded byte chunks as Blob-backed transfer records rather than first decoding the whole response to one JS string.

Therefore a multibyte UTF-8 JSON backup cannot bypass the 50 MiB download limit merely because its decoded JavaScript character count is smaller than its encoded byte length.

## Admission reservation uses the same physical scale

`getSignedTransferAdmissionBytes()` reserves the `text-download` transfer using the same 50 MiB-clamped numeric value, and after staging `resizeSignedTransferReservation()` uses `staged.totalBytes`.

Thus the offscreen concurrent-transfer memory/admission budget is expressed in bytes for this path, consistent with the actual streamed body.

This preserves P0-063's important property that caller timeout does not free reservation before actual transfer settlement.

## Naming debt, not a new correctness blocker

The service-worker API still calls the field `maxChars`, while offscreen actually interprets it as bytes for `text-download`.

That name is misleading and makes future refactoring risky because other text surfaces genuinely use UTF-16/string-character limits.

Recommended cleanup when the interface is next changed:

- rename signed download argument to `maxBytes`;
- reject/ignore legacy `maxChars` only after all bundled callers migrate together;
- keep explicit byte units in OperationLog/diagnostics;
- do not accidentally reuse `MAX_TRANSFER_TEXT_CHARS` for streamed restore bytes.

Current source proof does not justify a new P-item for naming alone because the enforced boundary itself is correct.

## Downstream parse boundary remains separate

After byte staging, service-worker import parsing still has its own schema/entry/per-field/deadline limits. The byte cap is not proof that every decoded entry is cheap or semantically valid.

Conversely parser character limits must not replace the earlier byte/network bound. Both layers should remain.

P1-030/P1-042/P1-069 continue to own streaming import validation/transaction/deadline concerns.

## Regression guard

1. 49 MiB ASCII JSON download stages normally within other schema limits.
2. >50 MiB ASCII body with no Content-Length is stopped by streamed `byteLength` accounting.
3. >50 MiB body with Content-Length is rejected before full body read.
4. Multibyte UTF-8 body whose decoded character count is <50 MiB but encoded bytes exceed 50 MiB is rejected on bytes.
5. Streaming-unavailable response fails closed rather than falling back to full `response.text()`.
6. Transfer reservation reflects actual staged bytes and stays owned until actual promise settlement.
7. Staged manifest `totalBytes` remains the encoded byte count used by later import validation.
8. Future rename `maxChars -> maxBytes` preserves wire compatibility only intentionally and does not weaken the cap.
9. Oversized-body failure cleans partial staging according to the existing transfer lifecycle.
10. Normal restore never needs to hold the complete downloaded JSON as one JS string solely to enforce size.

## Classification

No new P-item. This is a positive control adjacent to P0-063/P1-069/P1-030/P1-042.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
