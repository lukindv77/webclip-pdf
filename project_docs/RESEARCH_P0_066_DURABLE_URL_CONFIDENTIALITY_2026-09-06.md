# P0-066 — one versioned durable/display URL confidentiality contract — 2026-09-06

Date: 2026-09-06  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Branch: `research/p0-066-durable-url-confidentiality-2026-09-06`  
Owner: **P0-066 ACTIVE**  
Runtime/manifest/release state: unchanged.

## 1. Canonical owner

Registry:

> One durable/display URL confidentiality sanitizer must cover source URLs, locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist.

This checkpoint consolidates prior URL-minimization evidence into a source-bound implementation contract for the current baseline. It does not close P0-066.

## 2. Prior accepted research is authoritative input, not something to redo

The repository already contains substantial P0-066 evidence.

`RESEARCH_SOURCE_URL_DATA_MINIMIZATION_2026-08-30_EVIDENCE.md` concluded that the root problem is not caller forgery or live-page scheme admission. The worker correctly derives source URL authority from the Chrome sender and restricts the ordinary live save to HTTP/HTTPS.

The remaining root is role conflation:

```text
exact operational source URL
== current display URL
== PDF metadata URL
== durable cache/checkpoint URL
== Journal URL
== export/import URL
== content-template URL
```

Those roles have different confidentiality and identity requirements.

`RESEARCH_C39_PRIVACY_DATA_MINIMIZATION_2026-09-03_EVIDENCE.md` later revalidated the issue physically in Chrome 151 and established a successful causal control: an origin/path projection removed synthetic userinfo/query/fragment secret markers from the physical PDF and modeled durable surfaces while preserving a useful link.

Therefore this checkpoint does **not** reopen the question “should the source display URL keep the query?” The accepted direction is:

```text
raw exact URL -> volatile operational authority only
origin + pathname -> durable/display source representation
separate privacy-preserving equality authority -> when exact/grouping semantics must survive
```

## 3. Fresh current-source proof

### 3.1 `sanitizeContentSaveMeta()` validates scheme but retains every URL component

The current worker derives `tabUrl` from `sender.tab.url` / `sender.url`, parses it, requires HTTP/HTTPS and then keeps:

```js
url = parsed.toString()
```

This preserves:

- username;
- password;
- query/search;
- fragment/hash.

This is good integrity admission but not data minimization.

### 3.2 `normalizeJournalUrl()` is an identity normalizer, not a privacy sanitizer

Current logic clears only:

```js
parsed.hash = ''
```

and returns the rest.

On parse failure it returns a raw bounded string with only a textual `#` suffix removed.

Thus it can retain userinfo, query and malformed/non-durable values.

It must not become the future P0-066 policy merely by being reused more widely.

### 3.3 fresh Journal persistence still copies raw URL

Current final Journal construction uses the current save metadata URL directly. Pending local/remote checkpoints and PDF retry cache metadata also preserve the same raw or hash-only URL forms.

A recovery record may legitimately be durable. That makes minimization more important, not less.

### 3.4 import normalizers reproduce the same gap

`normalizeImportedHttpUrl()` enforces HTTP/HTTPS and removes only fragment.

It retains URL credentials and query.

`normalizeImportedHttpsUrl()` permits generic HTTPS values and is used for imported `publicUrl`. Generic HTTPS admission is insufficient for a Yandex public-link capability.

### 3.5 the PDF leak happens before worker-side save sanitization

The current content preparation path builds the printed metadata header before the worker receives `WEBCLIP_GENERATE_PDF` / `WEBCLIP_SEND_PDF_TO_YANDEX`.

The content-side metadata includes the current page URL, and `prepareForPrint(meta)` assigns it to both visible link text and href.

Therefore a worker-only durable sanitizer cannot close P0-066. The actual printable representation needs the same safe projection before `Page.printToPDF` creates bytes.

### 3.6 Journal UI treats stored URL as both display and navigation capability

Current Journal code assigns stored `entry.url` into a link and sends it through `WEBCLIP_OPEN_URL`; one fallback also calls `window.open(entry.url, ...)`.

The worker `WEBCLIP_OPEN_URL` boundary only checks a textual `http://` / `https://` prefix for trusted extension-page senders.

Therefore durable/imported URL policy is directly relevant to later navigation authority, not only visual privacy.

### 3.7 OperationLog is a useful partial positive control

Current `safeUrlForOperationLog()` already avoids retaining ordinary URL query contents by projecting origin/path plus a redaction marker.

P0-033 additionally installs `operation-log-redaction-guard.js`, which treats signed Yandex transport URLs as opaque capabilities and removes the signed path/query/fragment/userinfo from persistent diagnostics.

P0-066 must preserve this stronger owner-specific behavior.

## 4. One contract means one policy module, not one destructive function

Different URL classes have different legitimate functionality. Therefore “one sanitizer” means:

```text
one versioned policy module
+
explicit URL class
+
shared fail-closed primitives
+
class-specific output contract
```

It does **not** mean applying `origin+pathname` to every URL in the product.

Recommended pure shared helper name:

```text
durable-url-policy.js
```

Conceptual API:

```js
WebClipDurableUrlPolicy = {
  VERSION,
  sanitizeSourceDisplayUrl(value),
  sanitizeYandexPublicUrl(value),
  classifyOrReject(value, urlClass),
  sourceIdentityReceipt(value),
  sanitizeImportedUrl(value, urlClass)
}
```

The helper contains no secrets, no storage access and no Chrome API side effects. It can be loaded into the content isolated world and worker so the exact same projection rules guard PDF representation and durable persistence.

## 5. URL class A — source/display URL

Input authority:

- current exact sender/browser URL for worker-side admission;
- current content document URL only for local pre-render projection, never as worker persistence authority.

Allowed input schemes:

```text
http:
https:
```

Durable/display output:

```text
scheme + normalized host/port + pathname
```

Forbidden in durable/display source representation:

- username;
- password;
- query/search;
- fragment/hash.

Example:

```text
https://user:pass@example.test/private/report?access_token=X&doc=7#state
```

becomes:

```text
https://example.test/private/report
```

No regex-only opaque-string truncation. Parse with `URL`, reject on failure, clear components explicitly and serialize deterministically.

## 6. Non-durable schemes fail closed

The durable policy must reject rather than textual-normalize at least:

```text
data:
blob:
file:
javascript:
about:
chrome:
chrome-extension:
view-source:
filesystem:
```

and any future/unknown scheme outside the explicit class allowlist.

This applies especially to import, where historical backups are untrusted input rather than a current Chrome sender receipt.

A malformed value never falls back to “raw string minus fragment”.

## 7. Exact operational identity is separate

P0-070/P0-080/P0-023 cannot use the lossy display projection as proof that two logical page states are the same.

Examples:

```text
https://example.test/app?route=A
https://example.test/app?route=B
```

both project to:

```text
https://example.test/app
```

but may be different app/source states.

Therefore exact operational authority must be carried independently through:

- browser `documentId` / full-document generation receipt (P0-070);
- application/selection generation (P0-080);
- operation-owned PDF generation (P0-079);
- exact cache source receipt (P0-023).

Where a restart-safe URL equality key is still useful, store a **versioned non-plaintext identity receipt/fingerprint** rather than the raw query-bearing URL.

This checkpoint intentionally does not prescribe a production hash/KDF algorithm. A bare hash can still be guessable for low-entropy URLs; the exact design must consider cross-install restore/grouping requirements and threat model.

The deterministic research model uses SHA-256 only to demonstrate structural separation, not as a production cryptographic decision.

## 8. URL class B — Yandex public link

A Yandex public link is intentionally persisted user-facing access capability. Applying source `origin+pathname` blindly could break the link.

Required validator:

- HTTPS only;
- exact approved public host family used by the product/provider;
- no username/password;
- no fragment;
- bounded length;
- preserve provider-required path/query only after class validation.

Current product UI already recognizes Yandex public-link hosts such as:

```text
disk.yandex.ru
*.disk.yandex.ru
yadi.sk
```

The worker's API-public-link normalization should be the authoritative provider admission and imported `publicUrl` must use the same class policy instead of generic `normalizeImportedHttpsUrl()`.

If the provider later changes public-link hosts/formats, the allowlist/version changes deliberately; arbitrary imported HTTPS never becomes a trusted `publicUrl` automatically.

## 9. Public link is not a signed transport URL

P0-033 is a stronger distinct class.

Signed upload/download href:

```text
network use -> exact opaque provider capability
persistence/logging -> no reconstructable URL; redacted provider/category marker only
```

Yandex public link:

```text
explicit public-access product metadata -> may be durably retained after provider validation
```

P0-066 must never weaken P0-033 by routing signed transport hrefs through the public-link sanitizer.

## 10. URL class C — locator href/src and selected-link targets

Two neighboring concerns exist.

### P0-066 responsibility

Any URL string that enters a durable/display locator or archived-link boundary must obey a scheme/component confidentiality policy. Secret-bearing/non-durable URLs cannot be persisted merely because they came from selected DOM.

### P1-182 responsibility

P1-182 owns the broader SelectionSnapshot privacy contract:

- surrounding plaintext;
- raw `href`/`src` locator context;
- privacy-preserving fingerprints;
- restore quality.

Therefore P0-066 does not invent a second locator schema.

Composition rule:

```text
new durable locator schema -> P1-182 fingerprint/no-raw contract
legacy/import raw locator URL -> P0-066 fail-closed sanitizer/drop before persistence/use
```

C39 also proved that selected content link targets can enter actual PDF annotations. Printed link policy therefore must apply before the physical render representation, while P0-071 still owns unsafe URI schemes at the actual render cut.

## 11. URL class D — transient exact current source context

Some exact URL uses are intentionally non-durable and operational.

Examples include bounded `chrome.storage.session` source context or in-memory operation context used while proving a current source generation.

Rules:

- no portable export;
- no Journal persistence;
- no PDF display;
- no Yandex file metadata;
- no OperationLog raw serialization;
- bounded lifetime;
- never used as substitute for browser document/application generation when those owners require stronger proof.

P0-066 permits this distinction; it does not require destroying information needed transiently for correct operation.

## 12. Shared source/display sanitizer must run on both sides of the render boundary

### Content-side role

Before creating any printable source URL text/href:

```text
location/snapshot raw URL
-> shared sanitizeSourceDisplayUrl()
-> only projected URL enters print header/representation
```

This is a confidentiality projection, not worker authority.

### Worker-side role

Worker independently derives raw source authority from `sender` and computes the same projection:

```text
sender exact URL
-> validate live source scheme
-> compute safe durable/display projection
-> compare expected projection if needed
-> persist only safe projection + separate exact generation/equality receipt
```

Caller-provided projected URL cannot override the worker's sender-derived result.

This preserves existing integrity while closing PDF-before-worker leakage.

## 13. Durable source schema

Conceptual minimum:

```js
sourceUrl: {
  version: 1,
  displayUrl: 'https://example.test/path',
  identityReceipt: '<non-plaintext versioned equality authority when needed>'
}
```

For backward-compatible field migration, production may initially retain `entry.url` as the **safe display URL** and add a separate versioned identity field. The exact physical schema is implementation work.

The invariant is:

```text
no raw exact secret-bearing source URL in durable plaintext
```

## 14. Migration / legacy rows

Existing Journal/cache/checkpoint/export data may already contain query/userinfo/fragment.

Migration must be bounded and fail closed.

Recommended approach:

1. sanitize on read/use before any display/open/content return;
2. sanitize on every new write;
3. background/maintenance migration only under bounded batch budgets;
4. never reconstruct raw URL once removed;
5. version migrated URL semantics;
6. do not silently merge legacy records merely because their new display projections collide;
7. legacy exact/grouping behavior remains distinguishable through versioned historical identity metadata until intentionally migrated.

P0-077 governs self-export/restore envelope compatibility; P0-050/P0-080 govern derived-generation/grouping effects where applicable.

## 15. Import boundary

Imported data is untrusted.

For top-level source/site URL:

```text
parse -> explicit HTTP/HTTPS allowlist -> remove userinfo/query/hash -> bound -> persist
```

For imported public URL:

```text
parse -> HTTPS -> approved Yandex public host -> reject userinfo -> remove fragment -> preserve only provider-required public capability components -> persist
```

For raw locator href/src:

```text
P1-182 versioned locator parser/fingerprint
or drop/fail closed
```

No generic `normalizeImportedHttpsUrl()` may automatically confer Yandex-public semantics.

## 16. Display/open boundary

Journal, content templates and other UIs must receive the already-sanitized stored representation.

Defense in depth:

- display helper revalidates class before constructing `href`;
- `WEBCLIP_OPEN_URL` parses with `URL`, uses explicit protocol/class rules and must not rely on `/^https?:\/\//` alone;
- a rejected legacy/import URL is shown as unavailable, not opened through a direct `window.open` fallback;
- content-page return paths receive only the minimized display projection, consistent with P0-075.

## 17. Cache/checkpoint boundary

Current cache and pending Journal rows often need source provenance for restart/retry.

After P0-070/P0-079/P0-023:

```text
operation/source generation receipts
-> authorize retry/recovery
```

not raw URL plaintext.

P0-066 therefore removes the privacy rationale for keeping full URL query/userinfo in cache/checkpoint metadata.

Every durable cache/checkpoint metadata writer must receive:

- safe display URL;
- separate exact generation/equality receipt when the owning operation requires it.

## 18. Journal export / Yandex backup

Full Journal export serializes stored rows, and Yandex backup uploads those bytes externally.

There is no separate “backup may contain more secrets” exception.

If Journal storage is compliant, export/backup naturally receives the safe representation. Export must not reopen legacy raw URL fields during serialization.

On old rows, export should sanitize according to the versioned migration policy or clearly use an accepted compatibility schema that does not newly disclose forbidden raw URL components.

## 19. OperationLog boundary

Keep existing positive controls:

- ordinary diagnostic URL minimization;
- P0-033 signed transport opacity;
- bounded error text.

The future shared policy may be reused by the log summarizer for ordinary public-safe fields, but P0-033 remains authoritative for signed capabilities and must be applied before generic fallback logging.

## 20. `siteAddress` / origin summaries

Current `siteAddress = parsed.origin` is already more minimized than raw URL and is a positive control.

When a host/site summary is all a feature needs, use origin/hostname rather than source path. P0-066's source-display origin/path policy is a maximum durable source-address representation, not a requirement that every UI show the full path.

## 21. Error/fallback behavior

Sanitizer failure is not permission to persist raw input.

Wrong patterns:

```js
try { return sanitize(url); }
catch (_) { return String(url).split('#')[0]; }
```

Required:

```text
invalid/unparseable/disallowed
-> empty/rejected/manual legacy state
-> no raw fallback
```

The product may show “source address unavailable” while retaining non-URL archival data.

## 22. Versioning and provenance

Every durable representation contract needs an explicit version so old `url`/`urlKey` semantics are not silently treated as the new policy.

At minimum, consumers must be able to distinguish:

```text
legacy-unclassified URL data
version-1 source display URL
version-1 Yandex public URL
versioned identity receipt
```

A URL class is part of provenance. A string validated as a source display URL cannot later be interpreted as a provider public link merely because both are HTTPS.

## 23. Owner boundaries

P0-066 does not absorb:

- **P0-023** exact source-generation cache retry;
- **P0-033 DONE** signed Yandex transport URL opacity;
- **P0-045** Incognito persistent/privacy boundary;
- **P0-050** versioned `urlStats` rebuild/publication;
- **P0-069** public-link deletion outcome;
- **P0-070** exact full-document/source authority;
- **P0-075** host-page control-plane isolation;
- **P0-077 DONE** Journal export/restore envelope sizing;
- **P0-078** publication policy generation/revocation;
- **P0-080** SPA/application generation;
- **P1-182** SelectionSnapshot plaintext/raw locator privacy.

It composes with all of them through the rule that only class-valid safe URL representations cross durable/display boundaries.

## 24. Deterministic model

Added:

`project_tools/test_p0_066_durable_url_confidentiality_model.js`

The model covers:

- userinfo/query/fragment removal from ordinary source display;
- rejection of non-durable schemes;
- separation of display projection from a non-plaintext equality fingerprint;
- strict HTTPS/provider validation of Yandex public links;
- rejection of userinfo/arbitrary-host imported public links;
- signed transport redaction as a separate class;
- raw locator URL non-persistence;
- imported source uses the same projection;
- persisted source record contains no synthetic secret markers.

Local run before architecture commit:

```text
P0-066 durable URL confidentiality model: PASS
```

The SHA-256 example in the model is illustrative separation evidence only, not a production algorithm requirement.

## 25. Source-bound RED gate

A committed-source P0-066 gate should remain RED until runtime proves all of the following:

- one shared versioned URL-policy helper exists;
- content-side printed header/link uses the source-display projection before PDF render;
- worker independently computes the same projection from sender authority;
- fresh cache/checkpoint/Journal writes do not retain raw source userinfo/query/fragment;
- `normalizeJournalUrl()` raw-on-error/hash-only behavior is not a durable privacy fallback;
- imported source/site URL uses the same source policy;
- imported `publicUrl` uses Yandex-public class validation, not generic HTTPS;
- Journal display/open does not directly trust unsanitized legacy/import URL;
- content-template return exposes only safe URL projection;
- signed Yandex transport guard remains wired and stronger;
- SelectionSnapshot raw locator privacy remains owned by P1-182 and cannot bypass URL class policy;
- no forbidden raw source URL appears in portable Journal export/Yandex backup from newly written records.

## 26. Required current-Chrome / durable-flow evidence before closure

P0-066 already has strong historical physical evidence, but runtime closure requires fresh evidence on the implementation head.

Minimum matrix:

### A. Physical PDF header

Source fixture URL contains synthetic:

- username/password;
- query secret;
- fragment secret.

Physical PDF extracted text and `/URI` annotations contain only allowed source projection.

### B. Selected content link

Selected safe HTTP/HTTPS link with query secret is rendered according to the accepted printed-link privacy policy; secret marker does not survive in PDF annotation if that link class is governed by P0-066 projection.

P0-071 unsafe-scheme behavior remains PASS.

### C. Durable stores

After local and Yandex error/retry paths, inspect:

- PDF cache metadata;
- local pending checkpoint;
- remote pending checkpoint;
- final Journal row;
- content-template projection;
- export bytes.

No forbidden source markers occur.

### D. Import

Import fixture contains:

- source userinfo/query/fragment;
- non-durable source scheme;
- arbitrary HTTPS `publicUrl`;
- valid Yandex public URL.

Only class-valid minimized fields survive.

### E. Public-link function

A valid provider public link remains openable after round trip. This ensures source minimization did not accidentally destroy the intentional public capability.

### F. Signed-link regression

P0-033 deterministic/log redaction remains PASS; no signed path/query enters logs.

### G. exact-source regression

P0-070/P0-080/P0-023 exact generation checks still distinguish logical source changes even when two safe display URLs collide.

## 27. Implementation decomposition

### Block A — shared pure policy

Create one small shared `durable-url-policy.js` and deterministic unit tests.

### Block B — print/content projection

Use shared source-display sanitizer before creating PDF metadata/header/selected-link durable representation.

### Block C — worker persistence

Replace raw/hash-only URL copies in cache/checkpoints/Journal/content-template with safe projection + versioned identity authority.

### Block D — import/display/public URL

Use class-aware sanitizer on import and open/display; eliminate generic HTTPS-as-public semantics and raw fallback.

### Block E — migration/legacy

Bounded, version-aware read/use migration without raw fallback or accidental identity merging.

### Block F — Chrome/durable evidence

Re-run physical PDF + IDB/export/import/public-link/signed-link/exact-source matrix.

## 28. Status

P0-066 is **architecture-saturated on the current baseline, but remains ACTIVE**.

The existing historical physical evidence is strong problem/causal evidence, not current implementation closure. Runtime source is still RED.

No runtime file, manifest, Registry status, build, tag, GitHub Release or release-readiness declaration is changed by this research checkpoint.
