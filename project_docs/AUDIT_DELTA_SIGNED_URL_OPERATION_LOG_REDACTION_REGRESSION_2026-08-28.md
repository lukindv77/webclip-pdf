# Audit delta — signed Yandex URL OperationLog redaction regression — 2026-08-28

Source-of-truth `main` immediately before this write: `73f5d80c4c1ebad20dfeae4fdec55ae725401f00`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source evidence **reopens P0-033**. The canonical acceptance already states that a signed Yandex upload/download URL must be treated as a secret **in full, including its path**, and OperationLog may retain only a non-capability summary such as origin + `[REDACTED_SIGNED_PATH]`.

Current runtime has regressed from that contract.

## Canonical P0-033 contract

P0-033 explicitly requires:

- signed Yandex URL is secret as a whole;
- path and query of temporary upload/download links are not persisted in OperationLog;
- logging retains only origin plus an explicit redacted signed-path marker.

This is not a new confidentiality policy invented by this checkpoint; it is a previously accepted security invariant.

## Fresh runtime proof

`yandexApi()` records bounded response summaries into OperationLog for Yandex API requests.

For a response object containing `data.href`, current `summarizeYandexResponse(endpoint, data)` does:

1. parse the signed href as `URL`;
2. set:

`summary.href = origin + pathname + (query ? '?[REDACTED_QUERY]' : '')`;

3. retain the returned HTTP method as a small diagnostic field.

Thus only query parameters are redacted. The full pathname remains durable diagnostic data.

This directly contradicts P0-033.

## Why redacting only query is not a valid signed-capability boundary

A provider-issued signed upload/download href is an opaque temporary capability from WebClip's perspective.

WebClip must not infer that:

- signature/authorization material always lives in query parameters;
- pathname is stable/public/non-sensitive;
- future provider URL formats preserve the same split.

Yandex upload/download hrefs can contain unique upload/download target information in the path, and some observed/documented shapes may have little or no query component. Even where query currently carries additional signature data, retaining the unique path is unnecessary durable disclosure and violates the project's stronger existing contract.

The safe abstraction is therefore:

`signed href -> provider/origin/category only`

not:

`signed href -> redact whichever URL component currently looks secret`.

## Persistent exposure path

The response summary is attached to OperationLog events.

OperationLog is intentionally persistent diagnostic storage with configurable retention and export/view tooling. Therefore a temporary network capability/path can outlive the network operation and become visible through diagnostic history.

The fact that a signed URL may expire later does not make durable logging acceptable:

- the log may be inspected/exported while the capability is still valid;
- provider TTL is external policy and can change;
- path may contain resource/account/operation identifiers that remain sensitive after authorization expires;
- diagnostics have no functional need for the exact signed path.

## Affected API classes

The generic summarizer applies to Yandex responses carrying `href`, including at least upload/download link acquisition paths used before offscreen signed transfer.

The exact remote target path managed by WebClip is separately represented through normalized operation/checkpoint fields where needed for recovery. Signed transport href is a different, ephemeral capability and should not be reused as recovery identity.

## Required P0-033 repair contract

### Opaque signed-link redaction

When a Yandex response field is recognized as signed transport `href`, persist at most bounded non-secret diagnostics such as:

- provider category (`yandex-signed-upload` / `yandex-signed-download` if known);
- scheme/host or normalized origin, if operationally useful;
- HTTP method;
- boolean `hasSignedHref`;
- an explicit marker such as `[REDACTED_SIGNED_PATH]`.

Do not persist:

- pathname;
- query;
- fragment;
- userinfo;
- full href;
- a reversible encoding/hash intended to reconstruct the capability.

### Fail closed on unknown href class

If future Yandex API response structures introduce another temporary/signed href and the logger cannot confidently distinguish safe public metadata from a capability, default to redacting the URL components rather than logging them optimistically.

### Separate public URLs

A user-facing permanent/public link is governed by separate privacy/publication policy (P0-069/P0-078/P0-066). Do not apply the signed-transfer capability model mechanically to every URL field, but do not let public-link handling weaken signed-link redaction.

### Existing OperationLog rows

Implementation should consider whether already-persisted current-version rows containing signed path summaries need bounded cleanup/migration. Do not parse/rewrite arbitrary historical logs in an unbounded startup loop; use bounded retention/migration semantics.

## Required deterministic regressions

1. `/resources/upload` returns an href with sensitive-looking unique path and no query: OperationLog contains no pathname.
2. Signed href contains both unique path and query: neither appears in OperationLog JSON/detail/export.
3. Signed href contains fragment/userinfo in an adversarial/mocked response: none is persisted.
4. OperationLog may retain origin/method/redaction marker according to policy.
5. Upload still receives the original full href in the live offscreen transfer path; log redaction must not mutate the actual request capability.
6. Download signed href receives the same full-path redaction treatment.
7. Public permanent URL handling remains governed by its own publication/privacy sanitizer and is not confused with ephemeral transport href.
8. Error messages/OperationLog events do not reintroduce the full signed href through exception serialization.
9. Raw response diagnostics cannot bypass the summarizer and persist the full href elsewhere in OperationLog.
10. Large/malformed href remains bounded and redacted/fail-closed.
11. Existing P0-033 accepted representation `origin + [REDACTED_SIGNED_PATH]` (or stricter) is restored.
12. Access token/session-only handling remains unchanged; signed-link redaction is additional capability hygiene, not token storage logic.

## Related items

- **P0-033** is the sole primary owner and is reopened by this regression evidence.
- **P0-066** is the broader durable URL confidentiality boundary for source/locator/public metadata, but P0-033 is more specific for signed transport capabilities.
- **P1-184/P0-074** own exact remote operation/object provenance; they must not depend on retaining signed transport URL text.
- **P1-197/OperationLog retention items** govern history lifecycle, not whether a capability is safe to log in the first place.

## Number allocation

No new number. P0-033 changes from historical regression-closed evidence to **reopened by fresh current-source audit** until implementation and tests restore full signed-path redaction.

## Test / release state

Audit documentation only. Runtime/configuration/manifest unchanged. Product tests were not rerun; historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or GitHub Release was created.
