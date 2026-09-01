# Durable research evidence — source URL data minimization / external persistence — 2026-08-30

Canonical current P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **56-block** source-first data-confidentiality/integrity research of the authoritative source URL as it crosses PDF rendering, retry/recovery persistence, Journal/export and Yandex upload/backup surfaces.

Exact fresh source baseline: `main = 2c851fa6868479f97659b47cc77741d03922497f`.

Managed Chromium: `144.0.7559.96` on Debian 13. Browser PDF probes are engineering evidence for current-shaped WebClip markup/Chromium behavior; they do not replace real unpacked-extension release QA.

Security scope is intentionally restricted to protection of extension data and information persisted or transmitted by WebClip to external services/APIs. No offensive/exploitation analysis is part of this tranche.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this evidence.

## Executive classification

**No new permanent P-code and no canonical status transition.** Fresh source plus physical PDF proof revalidates existing **P0-066 ACTIVE**: WebClip still lacks one enforced dual-representation contract that separates exact operational source-URL identity from the durable/display URL allowed to enter PDF bytes, Journal/recovery, portable export and Yandex storage.

Current P0-066 already owns the root: durable/display URL confidentiality must cover source URLs, locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist. Historical PDF-family evidence also already states that exact operational URL identity and durable/public-safe URL are separate needs. The fresh tranche therefore deliberately does **not** allocate P1-230.

Supporting existing owners:

- **P0-070 ACTIVE** — the exact source/document generation still needs an authoritative operational URL/receipt; privacy repair must not weaken save provenance.
- **P0-080 ACTIVE** — same-document/application-generation checks cannot be replaced by a lossy display URL.
- **P0-023 ACTIVE** — PDF retry cache source-generation validation still needs exact or privacy-preserving equality authority.
- **P0-075 ACTIVE** — extension-owned durable metadata returned into content-page context must not disclose more historical URL data than required.
- **P1-182 ACTIVE** — locator `href/src` privacy is a separate but analogous durable-minimization owner; this tranche concerns the top-level source URL, not SelectionSnapshot locator context.
- **P0-077 ACTIVE** — a future URL schema/minimization migration must remain self-exportable/self-importable and must not make WebClip-generated backups unrestorable.

## Fresh source boundary

Current `content.js` and `service-worker.js` establish:

1. content save metadata originates from the current page URL, while the worker correctly replaces caller URL authority with `sender.tab.url` / `sender.url` in `sanitizeContentSaveMeta()`.
2. the worker permits only current HTTP/HTTPS source pages. This is a positive scheme-admission control, not a data-minimization control.
3. worker metadata retains `parsed.toString()` as `meta.url`; URL username/password, query and fragment are not removed there.
4. `prepareForPrint(meta)` creates the visible PDF row `Полный URL страницы:` and sets both `urlLink.textContent = meta.url` and `urlLink.href = meta.url`.
5. the same physical PDF Blob is cached and, on the Yandex path, transferred by offscreen `pdf-cache-upload`; there is no post-print URL rewrite of PDF bytes.
6. `normalizeJournalUrl()` removes only `hash`; username/password and query remain.
7. pending local/remote Journal checkpoints copy raw `meta.url`.
8. final Journal entries copy raw `meta.url`; `urlKey` uses the hash-only normalization.
9. full Journal export serializes the complete stored entry, and Yandex Journal backup uploads those staged bytes.
10. import normalization removes fragment but preserves username/password/query for HTTP/HTTPS URLs.
11. OperationLog URL handling and resource-diagnostic labels already demonstrate useful positive minimization patterns: query redaction, signed-link redaction and origin/path-only resource labels.
12. raw/exact session source context and retry identity are operationally useful, so the correct repair is not one global destructive string truncation; it is explicit separation of exact authority from durable/display representation.

External browser/API documentation was used only to confirm component semantics and service role. MDN documents `URL.username`, `URL.password`, `URL.search` and `URL.hash` as separate URL components that can be modified independently. Official Yandex Disk documentation describes the REST API as a facility for uploading/storing user files. All WebClip conclusions below are nevertheless derived from fresh repository source and controlled Chromium output, not inferred from those external products.

## Blocks 1–12 — authoritative current URL is sound, durable projection is not minimized

### Block 1 — fresh baseline and owner dedup — P0-066

Fresh `main` was fixed at `2c851fa6868479f97659b47cc77741d03922497f`; current registry, PDF-family evidence and history were re-read before classification.

The top-level source-URL confidentiality requirement is already P0-066. A new P-code would duplicate the same durable/display URL root.

### Block 2 — caller cannot choose an arbitrary saved source URL — positive integrity control / P0-070

`sanitizeContentSaveMeta(rawMeta, sender)` derives `tabUrl` from the Chrome sender and ignores the content-provided `rawMeta.url` as URL authority.

This prevents a stale/forged content metadata field from becoming the canonical source URL. Preserve this integrity property.

### Block 3 — live save is restricted to HTTP/HTTPS — positive scheme control / P0-066

The worker parses the authoritative sender URL and rejects any protocol other than HTTP or HTTPS.

The fresh finding is therefore **not** that a live `file:`, `data:` or other scheme can currently flow through ordinary content save. The unresolved issue is minimization of accepted HTTP/HTTPS URL components.

### Block 4 — `siteAddress` already demonstrates a safer origin projection — positive control

The worker stores `siteAddress: parsed.origin`, which excludes username/password, query and fragment.

This proves current code already distinguishes at least one safe summary representation from the full URL; the missing piece is applying an explicit durable URL policy consistently to all archival surfaces.

### Block 5 — authoritative `meta.url` retains URL credentials — P0-066

The worker returns `url: parsed.toString().slice(...)` without clearing `username` or `password`.

For an accepted HTTP/HTTPS URL containing URL credentials, those values remain part of the archival metadata string.

### Block 6 — authoritative `meta.url` retains query — P0-066

The same `parsed.toString()` preserves `URL.search`.

A query may legitimately encode page state, but it is also a common place for session/capability identifiers. P0-066 requires a durable policy rather than unconditional persistence of the entire query.

### Block 7 — authoritative `meta.url` retains fragment — P0-066

`URL.hash` is also preserved in `meta.url` at content-save admission.

Fragments are client-side state and are not sent as the HTTP request target, but current PDF rendering later makes them durable archival data.

### Block 8 — title and selected page content are not treated as defects merely because they are archived — boundary control

The user explicitly invokes WebClip to archive selected content, and title/comment are product archive metadata.

This tranche does not classify intended selected content as excessive disclosure. It is limited to source-URL components for which P0-066 already requires a minimized durable representation.

### Block 9 — exact source URL remains necessary for some operational comparisons — P0-070/P0-080

Retry/source-generation logic needs to know whether a cache belongs to the current logical source. A fully stripped display URL cannot automatically substitute for that identity.

Privacy repair must therefore preserve exact operational authority or a suitable privacy-preserving equality key separately.

### Block 10 — `normalizeJournalUrl()` is an identity normalizer, not a confidentiality sanitizer — P0-066

Current function removes only `hash` and returns the rest of `parsed.toString()`.

Treating it as the future durable sanitizer would still persist URL credentials and query values.

### Block 11 — imported URL normalizer has the same confidentiality gap — P0-066/P0-077

`normalizeImportedHttpUrl()` bounds length, enforces HTTP/HTTPS and clears hash, but leaves username/password/query intact.

A backup round trip can therefore re-admit those durable URL components even after fragment removal.

### Block 12 — one string cannot safely serve all current roles — acceptance boundary

The current `meta.url` simultaneously serves source provenance, PDF display/link, recovery metadata, Journal display/grouping and portable backup.

Those roles have different disclosure requirements. The architectural unit is a versioned URL representation contract, not another caller-by-caller slice.

## Blocks 13–22 — physical Chromium PDF persists both URL text and hyperlink target

### Block 13 — print header copies raw `meta.url` into visible text — P0-066

`prepareForPrint(meta)` creates the `Полный URL страницы:` row and assigns `urlLink.textContent = meta.url`.

Thus every component retained in `meta.url` is eligible to become visible text in the saved PDF.

### Block 14 — print header also copies raw `meta.url` into `href` — P0-066/P0-071

The same anchor receives `urlLink.href = meta.url`.

Visible label and navigable target are independent PDF artifacts; both require the durable URL policy.

### Block 15 — managed Chromium raw fixture persisted query marker in extracted PDF text — direct proof

Production-shaped header fixture used:

`https://user:pass@example.test/private/report?access_token=RAW_QUERY_SECRET&doc=7#RAW_FRAGMENT_SECRET`

Chromium PDF text extraction retained `RAW_QUERY_SECRET`.

### Block 16 — managed Chromium raw fixture persisted fragment marker in extracted PDF text — direct proof

The same physical PDF text retained `RAW_FRAGMENT_SECRET`.

This proves the fragment does not remain merely ephemeral browser state once WebClip prints the full URL string.

### Block 17 — managed Chromium raw fixture persisted URL userinfo in visible PDF text — direct proof

The extracted header contained the `user:pass@` authority form.

The test is a data-flow fixture only; it demonstrates durable byte content, not an authentication scenario.

### Block 18 — PDF link annotation retained the complete raw URL — direct proof

`pypdf` inspection of link annotations found `/URI` equal to the complete fixture URL, including userinfo, query and fragment.

Therefore changing only displayed text would leave sensitive source data inside the PDF hyperlink object.

### Block 19 — one Chromium URL produced more than one annotation object — robustness note

The raw fixture yielded duplicate annotation URIs in the generated PDF while the safe fixture yielded one. The exact annotation count is renderer/layout-specific and is **not** classified as a defect.

The invariant is simpler: no annotation URI may carry forbidden durable URL components.

### Block 20 — safe projection is a positive physical control

A second fixture used `https://example.test/private/report` as both displayed text and anchor target.

Extracted PDF text contained only that safe URL, and the annotation `/URI` was the same safe URL with none of the raw markers.

### Block 21 — component-wise sanitization is browser-native and deterministic — external positive control

MDN documents username, password, query (`search`) and fragment (`hash`) as separate writable `URL` properties.

A sanitizer can therefore clear forbidden components through parsed URL operations instead of regex replacement of an opaque string.

### Block 22 — managed PDF evidence is engineering proof, not release closure

The fixture reproduces Chromium PDF serialization of the current-shaped header, but it is not a full unpacked-extension run under real Chrome permission/debugger UI.

P0-066 remains ACTIVE; release QA still needs the actual extension pipeline.

## Blocks 23–34 — local cache, recovery and Journal persist raw source URL

### Block 23 — local generated-PDF cache stores raw metadata URL — P0-066/P0-023

`generatePdfAndDownload()` writes a temporary PDF-cache record whose `meta` spreads the sanitized save metadata, including raw `meta.url`.

The cache is operationally temporary, but it is persistent IndexedDB state and feeds recovery/download settlement.

### Block 24 — local cache `sourceUrl` removes only fragment — P0-023/P0-066

The same record stores `sourceUrl: normalizeJournalUrl(meta.url)`.

That field keeps query and userinfo because its current purpose is exact-ish retry/source matching, demonstrating why it should not be reused as a display/public URL.

### Block 25 — pending local-download checkpoint receives raw URL — P0-066

Before the irreversible Chrome download starts, `pendingData.meta` spreads `meta` and adds `tabId`.

`normalizePendingJournalAppendData()` then persists `meta.url` as a bounded raw string.

### Block 26 — local download recovery can therefore outlive the content operation with raw URL metadata — P0-066

The checkpoint intentionally survives worker loss/unknown download settlement.

Durability is correct for recovery, but durable recovery data needs the same URL confidentiality projection or a separate non-reversible identity key.

### Block 27 — final Journal entry stores raw `meta.url` — P0-066

`appendJournalEntry()` assigns `url: String(meta.url || '')`.

No URL confidentiality sanitizer is applied at the durable Journal commit point.

### Block 28 — Journal `urlKey` keeps query and userinfo — P0-066/P0-080

`urlKey` is generated through hash-only `normalizeJournalUrl()`.

This is useful for current-URL grouping, but it means exact equality semantics and display data are currently conflated in durable plaintext.

### Block 29 — Journal view summary publishes raw entry URL inside extension UI data — P0-066

`journalViewSummary()` copies `entry.url` (bounded by length only).

The extension UI can legitimately display a source address, but it should receive the defined durable/display representation, not necessarily the exact operational string.

### Block 30 — content template path removes only fragment — P0-066/P0-075

`journalEntryForContentTemplate()` calls `normalizeImportedHttpUrl(entry.url)` before returning previous-operation metadata to a content script.

That removes fragment but preserves query/userinfo, so historical extension-owned URL metadata can be re-exposed into page-associated content context.

### Block 31 — transient Journal source context is a different class — positive boundary / P0-070

`storeJournalSourceContext()` places a bounded raw source URL in `chrome.storage.session` to support current/site Journal navigation.

This is transient operational context rather than portable archival data. A future design may retain exact ephemeral URL here while using a durable-safe projection for long-lived records.

### Block 32 — cached retry currently compares current URL against hash-only normalized cache URL — P0-023/P0-080

`getValidCachedPdfForTab()` normalizes current and cached source URLs through `normalizeJournalUrl()` and requires equality.

Dropping query from this exact comparison without a replacement generation/key could make unrelated app states collide. Privacy repair must preserve provenance separately.

### Block 33 — durable URL and durable equality key need not be the same field — architecture refinement

Where Journal needs exact-source grouping across restarts, a versioned non-reversible equality key/fingerprint can be considered separately from the human-readable URL.

The research does not prescribe one hash/key algorithm; it requires that plaintext secret-bearing URL components not be retained solely because equality/grouping needs an identifier.

### Block 34 — migration cannot silently reinterpret old `urlKey` semantics — P0-077/P0-080

Existing rows were grouped with hash-only normalization and may contain query-specific identities.

A future migration must version the new display/key semantics and preserve truthful legacy read/apply/group behavior rather than silently merging distinct old source states.

## Blocks 35–44 — Yandex PDF and recovery path transmit/persist the same raw URL data

### Block 35 — Yandex generation cache stores raw `meta.url` — P0-066

`generatePdfAndUploadToYandex()` writes cached metadata with `url: String(meta.url || '')` and hash-only `sourceUrl`.

No durable URL projection occurs before the cache becomes the authority for retry upload.

### Block 36 — the physical PDF is created before Yandex upload and contains the header URL — P0-066

`generatePdfBlob(tabId)` returns the already-rendered PDF Blob; the header was inserted by content preparation before this worker step.

Any raw source URL in the header is now embedded in the file bytes.

### Block 37 — offscreen `pdf-cache-upload` sends the exact cached PDF Blob — external-data proof

`uploadCachedRecordToYandex()` passes the cache key to `runOffscreenSignedTransfer()` with mode `pdf-cache-upload`.

Current `offscreen.js` reads that cache record, obtains the exact PDF Blob (or compatibility reconstruction), validates its size and uses it as the HTTPS request body. There is no post-print redaction layer.

### Block 38 — official Yandex Disk API purpose confirms this is external persisted file data — external service boundary

Official Yandex Disk REST documentation describes the service/API as allowing applications to upload and store user files on Yandex Disk.

Combined with the fresh offscreen code, the physical PDF bytes containing the source URL cross the extension boundary into external cloud storage.

### Block 39 — disabling public links does not mitigate source URL bytes — P0-066 boundary

`createPublicLinks=false` skips publication of a remote public URL, but the PDF upload still occurs.

Publication policy and archive-content minimization are independent controls.

### Block 40 — cached manual Yandex retry retransmits the same previously generated bytes — P0-066/P0-023

`retryCachedPdfUploadToYandex()` loads the existing cached PDF and calls the same upload path.

A future header sanitizer must run before PDF bytes are committed to cache; retry cannot repair already-generated raw URL bytes without regenerating the archive.

### Block 41 — remote-save checkpoint persists raw URL metadata independently of PDF bytes — P0-066

`checkpointPendingRemoteSaveIntent()` normalizes through `normalizePendingJournalAppendData()`, whose `meta.url` is a bounded raw string.

Thus raw source URL is present in both the uploaded PDF and local durable remote-recovery metadata.

### Block 42 — remote verification/final Journal append preserves that checkpoint metadata — P0-066

`markPendingRemoteSaveVerified()` re-normalizes the checkpoint but does not privacy-transform `meta.url`; final `appendJournalEntryFromDurableCheckpoint()` consumes it.

The durable recovery lifecycle can therefore propagate the same URL into final Journal state after successful cloud save.

### Block 43 — exact remote object identity is unrelated to source URL disclosure — negative control

Yandex file identity is proven with remote path/resource metadata/byte size and account/root contracts under separate owners.

No remote object verification step requires embedding raw source URL credentials/query/fragment in PDF or Journal display data.

### Block 44 — signed upload URL logs are already redacted — positive external-data control

`safeUrlForOperationLog()` replaces signed Yandex paths and redacts query for other URLs before transfer logging.

This shows current code already accepts the principle that operationally necessary exact URLs and durable diagnostic URLs should differ.

## Blocks 45–50 — portable Journal export and Yandex backup propagate stored URL plaintext

### Block 45 — full Journal export serializes the whole entry — P0-066/P0-077

`readJournalEntryBatch()` uses `JSON.stringify({ ...entry, journalComments: ... })`.

There is no export-specific source-URL privacy projection, so whatever raw `entry.url` contains is copied into portable JSON.

### Block 46 — chunking changes transport shape, not URL disclosure — P0-066

`stageFullJournalExport()` splits serialized text into bounded chunks and applies byte/deadline controls.

Those are valuable memory/integrity controls but do not transform source URL contents.

### Block 47 — local full-Journal file export therefore preserves raw URL fields — P0-066

The staged chunk set is materialized as the user-visible JSON export.

This creates another long-lived copy independent of the PDF itself.

### Block 48 — Yandex Journal backup uploads the same staged export — external-data proof / P0-066

`uploadJournalExportStagedToYandex()` passes the staging key to offscreen `text-chunks-upload` with JSON content type.

The raw Journal URL is therefore also transmitted to Yandex in backup JSON, separately from any uploaded PDF.

### Block 49 — import strips fragment but keeps query/userinfo — P0-066/P0-077

`normalizeImportedHttpUrl()` clears hash and enforces HTTP/HTTPS, but leaves the other authority/query components.

A WebClip-generated backup containing raw query/userinfo can be imported back into a current Journal row.

### Block 50 — schema repair must be coordinated across export and import — P0-077

If new exports switch to a minimized URL representation, current import/read code must understand that version while remaining compatible with legacy backups.

Do not fix only one sink and produce a self-generated backup whose URL identity/grouping semantics the same version cannot restore truthfully.

## Blocks 51–56 — positive controls, duplicate boundary and implementation acceptance

### Block 51 — OperationLog URL sanitization is a reusable positive pattern — P0-066

Current `safeUrlForOperationLog()` keeps ordinary `origin + pathname`, replaces query with a redacted marker, omits fragment and naturally omits URL credentials from `origin`.

This is not automatically the exact durable archive policy, but it proves parsed-component minimization is already practical in the codebase.

### Block 52 — resource diagnostic labels independently minimize URLs — P0-066 positive control

`sanitizePdfResourceDiagnosticLabel()` emits HTTP/S `origin + pathname`, maps data/blob URLs to placeholders and strips query/hash on fallback.

The source URL path should use the same central-policy principle rather than bespoke raw-string copying at every sink.

### Block 53 — P1-182 remains distinct — duplicate control

P1-182 owns SelectionSnapshot locator context, including surrounding plaintext and raw element `href/src` needed for restore matching.

The current tranche is top-level page source URL propagation through PDF/Journal/Yandex. Both require minimization, but they are different serialization contracts and P0-066 remains the single source-URL owner.

### Block 54 — required representation contract — P0-066/P0-070/P0-080

A complete implementation should derive, at one authoritative worker boundary, at least logically distinct forms:

1. **exact operational source authority** — used only where exact current generation/routing/retry comparison truly requires it, with bounded lifetime;
2. **durable/display source URL** — safe for PDF text/link, Journal UI, checkpoints intended to survive, export/backup and external cloud storage;
3. **durable equality/group key** where cross-session exactness is needed without retaining reversible secret-bearing plaintext.

These may be represented by fields/receipts rather than three literal strings, but the authority roles must not be conflated.

### Block 55 — durable URL minimization acceptance

For ordinary HTTP/HTTPS source URLs, the durable/display form must at minimum:

- remove URL username and password;
- remove fragment;
- treat query as non-durable by default unless an explicitly reviewed safe allowlist/product rule preserves specific parameters;
- use parsed URL component operations rather than secret-name heuristics on one opaque string;
- preserve only the path/origin information intentionally required for archive readability under a documented policy;
- apply the same result to **both** PDF displayed text and hyperlink annotation target.

Where another subsystem admits non-HTTP/S imported/display metadata, existing P0-066 rules for non-durable schemes remain authoritative.

### Block 56 — final deterministic/direct regression matrix

Closure of this refinement requires regression evidence that:

1. worker still derives source authority from the exact sender tab/document rather than caller metadata;
2. HTTP/HTTPS-only live save admission remains intact;
3. fixture URL containing userinfo/query/fragment yields no forbidden marker in PDF visible text;
4. the same PDF contains no forbidden marker in any link annotation `/URI`;
5. local Journal, pending local/remote recovery and PDF-cache **durable/display metadata** contain no forbidden plaintext components;
6. Yandex PDF upload bytes contain only the durable-safe header URL;
7. full-Journal local export and Yandex backup contain only the durable-safe URL representation;
8. legacy backups remain readable without re-emitting forbidden plaintext into new-format writes;
9. current-URL grouping/retry/source-generation checks retain exact truth through a separate exact/fingerprint authority and do not merge different logical states accidentally;
10. OperationLog signed-link/query redaction and resource diagnostic URL minimization remain valid;
11. real unpacked Chrome verifies the actual debugger PDF path, including PDF hyperlink target, and real Yandex E2E verifies the bytes/backup produced by the extension;
12. no implementation claims old already-exported local files or already-uploaded Yandex artifacts were retroactively scrubbed.

## Final decision

- P0-066 stays **ACTIVE**; fresh evidence strengthens its current acceptance but does not change canonical wording/status.
- Supporting owners remain P0-070, P0-080, P0-023, P0-075, P1-182 and P0-077.
- `RESEARCH_REGISTRY.md` should remain unchanged in this docs-only tranche.
- P1-230 is deliberately not allocated.
- This session contains **56 completed research blocks**.
