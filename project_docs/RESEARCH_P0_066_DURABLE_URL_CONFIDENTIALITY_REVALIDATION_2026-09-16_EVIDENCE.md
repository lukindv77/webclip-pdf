# Research evidence — P0-066 durable URL confidentiality revalidation — 2026-09-16

Canonical baseline: `main` at `78cb8137b5c7b88b8c6f968b72736f46beea0445`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Owner and semantic-dedup decision

Current canonical owner:

> P0-066 — One durable/display URL confidentiality sanitizer must cover source URLs, locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist.

No new P-code is allocated.

Adjacent owners remain separate:

- **P1-182** owns the broader versioned SelectionSnapshot privacy-preserving feature/restore contract, including surrounding plaintext and locator-feature migration. P0-066 supplies the URL-confidentiality semantics used by that schema; it does not replace P1-182.
- **P0-033 DONE** owns signed Yandex transfer URL redaction at the OperationLog boundary. It is a narrow positive control, not a replacement for durable Journal/import/locator/public metadata sanitization.
- **P0-075** owns hostile host-page UI/control-plane isolation; exposing a sanitized value to an untrusted DOM is still P0-075, while whether the persisted value itself contains secrets is P0-066.
- **P0-071** owns safe print-render link annotation/scheme handling. Durable metadata confidentiality is separate.
- **P0-022/P0-069/P0-078** own remote object provenance/publication lifecycle, not generic URL secret minimization.

## Fresh-current source baseline

Fresh source was re-read at exact canonical `main` `78cb8137b5c7b88b8c6f968b72736f46beea0445`.

Exact source blobs:

- `service-worker.js` — `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`
- `content.js` — `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`

The recent closure-oriented merges through PR #254 are docs/tooling-only, so these runtime blobs are intentionally unchanged.

## Current requirement basis

The current requirement baseline contains two relevant constraints that must be reconciled rather than handled independently:

1. PDF metadata currently asks for the page's full URL as a clickable source reference.
2. Persisted diagnostics explicitly must not retain signed/tokenized query/hash URL material, and `data:`/`blob:` values must be represented by safe opaque labels.

P0-066 generalizes the confidentiality side of that boundary: an archival source reference can preserve benign identity semantics, but credentials/capabilities must not be copied durably merely because they are syntactically part of a URL.

This tranche does **not** change the product requirement. It records an implementation acceptance rule: URL fields need an explicit confidentiality class and central sanitizer so a "full URL" requirement never silently means "persist passwords/tokens/capabilities".

## Fresh root-cause proof

### 1. `normalizeJournalUrl()` removes only the fragment

Current worker:

```js
function normalizeJournalUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return String(url || '').split('#')[0];
  }
}
```

Therefore a source such as:

```text
https://alice:password@example.com/report?lang=en&access_token=SECRET#section
```

becomes:

```text
https://alice:password@example.com/report?lang=en&access_token=SECRET
```

The fragment is removed, but URL userinfo and the query capability remain.

This helper is not merely a comparison helper. Current Journal construction stores:

```js
url: String(meta.url || ''),
urlKey: normalizeJournalUrl(meta.url || ''),
```

and cached PDF metadata carries the source URL as well.

### 2. content-save admission preserves the exact trusted tab URL, including query

`sanitizeContentSaveMeta()` correctly distrusts caller-provided hostname/origin and derives identity from `sender.tab.url`, which is an important positive control. But after requiring HTTP(S), it returns:

```js
siteAddress: parsed.origin.slice(0, 2048),
url: parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS),
```

The authority source is correct; confidentiality minimization is not applied.

A trusted browser URL can still contain query capabilities. "Trusted source" and "safe to persist verbatim" are different properties.

### 3. imported source URLs repeat the same fragment-only normalization

Current `normalizeImportedHttpUrl()`:

```js
const url = new URL(raw);
if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
url.hash = '';
return url.toString();
```

So imported Journal source URLs can preserve userinfo and sensitive query values.

### 4. imported public metadata has a weaker generic HTTPS gate

Current `normalizeImportedHttpsUrl()` returns any syntactically valid HTTPS URL unchanged.

`normalizeImportedJournalEntry()` uses it for:

```js
publicUrl: normalizeImportedHttpsUrl(raw.publicUrl || ''),
```

Thus imported `publicUrl` is not constrained to the same Yandex public-link host semantics used for a fresh API response, and credentials/query material are not centrally normalized.

This is both a consistency and confidentiality gap. It does **not** mean public links should lose the capability needed to open them; it means the `publicUrl` field needs an explicit public-capability policy rather than the generic "any HTTPS string" rule.

### 5. fresh Yandex public URL validation still permits URL userinfo

`normalizeYandexPublicUrlFromApi()` bounds length and restricts scheme/host using `isAllowedContentOpenUrl()`. The host test is useful, but `URL.hostname` ignores username/password when evaluating the host.

A URL shaped like:

```text
https://user:password@disk.yandex.ru/d/abc
```

still has hostname `disk.yandex.ru` and can pass the current host predicate before being serialized with `url.toString()`.

Fresh public API validation therefore also needs an explicit `username === '' && password === ''` invariant.

### 6. durable SelectionSnapshot locator `href/src` are truncated, not privacy-normalized

`content.js` constructs locator fields from raw attributes:

```js
src: String(element?.getAttribute?.('src') || '').slice(0, 1000),
href: String(element?.getAttribute?.('href') || '').slice(0, 1000),
```

Worker `sanitizeSelectionSnapshot()` again copies them as bounded strings:

```js
src: String(locator.src || '').slice(0, 2000),
href: String(locator.href || '').slice(0, 2000),
```

This retains:

- URL userinfo;
- signed/tokenized query values;
- fragments;
- `data:` payloads;
- `blob:` opaque identifiers;
- `javascript:` values;
- relative URLs carrying secret query parameters.

Historical SelectionSnapshot privacy evidence already demonstrated propagation through Journal/export/Yandex backup/import. P0-066 is the supporting URL-confidentiality owner; P1-182 remains the broader snapshot schema/restore owner.

### 7. current source already contains a good narrower positive control

The PDF resource diagnostics sanitizer recognizes that raw URL strings are not safe durable labels:

- `data:` becomes `[data-url]`;
- `blob:` becomes `[blob-url]`;
- non-HTTP(S) schemes become opaque scheme labels;
- HTTP(S) resource labels are reduced to origin + pathname;
- fallback strings lose query/hash.

That narrower implementation proves the architecture already accepts privacy-reduced URL representations where exact capability semantics are not required.

The defect is policy fragmentation: Journal/import/locator/public-display fields do not all consume one equivalent durable URL contract.

## Deterministic failure/acceptance model

Added model:

`project_tools/test_p0_066_durable_url_confidentiality_revalidation_model.js`

Local preflight:

- `node --check`: PASS
- deterministic execution: **PASS 57 checks**
- SHA-256: `3e2c36b6be1a23f0d248082a419360f646a6b1abe0c118f9331c5aceceb85feb`
- expected Git blob: `13eb6aa121a2006c3a3f3618cd0f59a9bb53e6c2`

The model covers:

1. current Journal source URL preserving userinfo + token query;
2. current import source preserving the same;
3. current imported `publicUrl` accepting arbitrary HTTPS origins;
4. current fresh Yandex public URL accepting userinfo;
5. raw locator signed/token query persistence;
6. `data:` / `blob:` / `javascript:` locator persistence;
7. relative locator query-secret handling;
8. HTTP(S)-only durable source admission;
9. one central source/import/site-address sanitizer semantics;
10. sanitizer idempotence across export/import cycles;
11. benign query preservation;
12. sensitive query-value redaction;
13. explicit public-capability policy distinct from ordinary source metadata;
14. unknown sanitizer class failing closed.

The model intentionally does **not** claim that one literal serialization is the only valid product solution. It proves the required invariants and the need for explicit policy classes.

## Required architecture / implementation acceptance

P0-066 should close only when fresh implementation evidence proves all of the following.

### A. One central durable/display URL policy

There must be one versioned helper/contract used by every URL-bearing durable/display boundary instead of ad hoc per-sink string truncation.

The helper may expose explicit policy classes, but they must share common invariants and tests.

At minimum classes need to distinguish:

- ordinary source/Journal URL;
- `siteAddress`/origin;
- SelectionSnapshot locator URL feature;
- intentionally openable public capability URL;
- diagnostics/display-only label;
- signed/ephemeral transport URL that must never become ordinary durable metadata.

### B. Common confidentiality invariants

For durable/display classes where exact credentials are not the product object:

- URL username/password never persist;
- fragment is removed unless an explicit accepted use case proves it is safe/required;
- known token/signature/session/auth/API-key query values never persist verbatim;
- non-durable/unsafe schemes (`data:`, `blob:`, `javascript:`, extension/file-style schemes) cannot enter ordinary durable source/locator fields as raw URLs;
- parse failures fail closed rather than falling back to an untrusted raw string.

### C. Benign URL meaning should not be destroyed unnecessarily

The current product wants useful source references.

A compliant design may preserve benign query semantics such as search/filter/page parameters while replacing sensitive values with a stable redaction marker, or it may adopt a stricter accepted policy. What is not acceptable is treating every query value as safe merely because it is syntactically valid.

If exact query semantics are required for a specific capability field, that field must be explicitly classified and isolated from generic display/log/source metadata.

### D. Public URL is an explicit capability class

`publicUrl` is intentionally a share/open capability and differs from a signed upload transport URL.

Acceptance must prove:

- fresh Yandex API public URLs are HTTPS and allowed-host constrained;
- URL userinfo is rejected;
- imported public URLs receive the same public-capability validation, not generic arbitrary-HTTPS acceptance;
- durable/display propagation is intentional and bounded;
- it is never confused with signed Yandex transfer URLs governed by P0-033.

### E. SelectionSnapshot composition

P0-066 URL sanitization must compose with P1-182 rather than bypass it.

For `href/src`:

- raw secret/capability material must not survive into the durable snapshot;
- privacy-preserving locator semantics remain versioned;
- restore ambiguity must fail closed rather than re-introducing raw URL secrets as a scoring shortcut;
- Include/Exclude, top document, same-origin frame and permission-gated remote-frame paths use the same URL feature semantics.

### F. Migration / import / export

Future writes must not reintroduce secrets from legacy data.

Required controls:

- legacy import normalizes before import staging/live Journal;
- local export and Yandex backup serialize only normalized current representation;
- import → export does not resurrect raw legacy URL fields;
- repeated sanitizer application is idempotent;
- already externalized historical backups are not falsely reported as retroactively scrubbed.

### G. Surface matrix

At least the following must be covered by direct tests:

- live Journal append;
- local-download pending checkpoint;
- remote-save pending checkpoint;
- PDF retry cache metadata;
- Journal import staging and commit;
- local full-Journal export;
- Yandex Journal backup;
- Journal views/templates;
- URL/site grouping keys;
- saved-file/open-source navigation;
- public URL display/open paths;
- SelectionSnapshot locators;
- diagnostics/OperationLog negative controls.

## External revalidation — 2026-09-16

Fresh external evidence was reviewed for feasibility and risk context.

### Platform / standards

**MDN — What is a URL?**
https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL

MDN documents URL username/password syntax and notes that credentials-in-URL usage is deprecated for security reasons.

**MDN — URL API**
https://developer.mozilla.org/en-US/docs/Web/API/URL_API

The URL API exposes `username`, `password`, `search` and other components separately, so a sanitizer can remove credentials/query material without string heuristics for URL structure.

**MDN — `data:` URLs**
https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data

`data:` embeds content in the URL itself and modern browsers treat it as an opaque-origin scheme. Persisting it as a locator string can therefore persist the payload itself.

**MDN — `blob:` URLs**
https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob

Blob URLs are opaque identifiers for browser-managed in-memory resources and depend on a backing object/storage context, making them unsuitable as durable locator identity.

**MITRE CWE-598 / OWASP reference**
https://cwe.mitre.org/data/definitions/598

The current CWE entry references OWASP guidance on sensitive query-string exposure and records query-string exposure as a recognized sensitive-data design problem.

### Public project evidence

**NousResearch/hermes-agent issue #84746 — "WS/download tokens in query strings are not redacted by the default formatter"**
https://github.com/NousResearch/hermes-agent/issues/84746

A recent 2026 public issue reports the same general failure class: query/userinfo redaction gaps allow URL-carried credentials to propagate into logs/telemetry. This does not prove a WebClip defect; it is an independent public analogue of the confidentiality boundary.

**obsidianmd/obsidian-clipper issue #948 — plaintext AI provider API keys in extension sync storage**
https://github.com/obsidianmd/obsidian-clipper/issues/948

This is not a URL-normalization analogue, but it demonstrates current user scrutiny of browser-extension durable secret persistence and reinforces the principle that "extension-owned storage" is not equivalent to "safe to persist every secret".

### User/community relevance

**Reddit / r/ObsidianMD — "Web clipper and such"**
https://www.reddit.com/r/ObsidianMD/comments/1h2hrnt

Users explicitly discuss concern about what sensitive information a clipper permission model may expose. This is user-intent context only, not proof of this project's implementation behavior.

## Important contract distinction

P0-066 is not a proposal to destroy every query string.

There are three different concepts:

1. **exact ephemeral operational URL** — may be needed transiently to bind the current browser document or perform an explicitly admitted operation;
2. **durable/archive source reference** — useful to the user but must not copy credentials/capabilities by default;
3. **explicit public capability** — intentionally shareable/openable and validated under a narrower capability-specific policy.

Current source often uses one raw string for more than one of these purposes. Closure requires separating the semantics before persistence/display, not merely adding another regex at one sink.

## Status / closure decision

**P0-066 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

This tranche:

- does not modify runtime;
- does not mark implementation closure;
- does not mark P1-182, P0-033, P0-071, P0-075 or remote-lifecycle owners closed;
- does not change release readiness;
- does not authorize build/tag/deploy/GitHub Release.

Physical closure still requires implementation plus direct deterministic and real unpacked-Chrome regression across the surface matrix above.
