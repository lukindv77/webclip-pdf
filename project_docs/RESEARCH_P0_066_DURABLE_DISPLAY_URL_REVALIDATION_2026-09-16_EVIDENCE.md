# Research evidence — P0-066 durable/display URL confidentiality revalidation — 2026-09-16

Canonical baseline: `main` at `78cb8137b5c7b88b8c6f968b72736f46beea0445`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, `TEST_STATUS.md`, `RELEASE_READINESS.md`, build/tag/deploy/release state are unchanged.

## Owner and classification

Canonical `RESEARCH_REGISTRY.md` keeps **P0-066 ACTIVE**:

> One durable/display URL confidentiality sanitizer must cover source URLs, locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist.

Fresh current-source review reconfirms this existing owner. No new P-code is allocated.

**Current result: `P0-066 = ACTIVE / ROOT-CAUSE-REVALIDATED`.**

This tranche is not implementation closure and does not claim release readiness.

## Fresh exact-source receipts

Baseline files were read from exact canonical `main` `78cb8137b5c7b88b8c6f968b72736f46beea0445`.

- `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.
- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.
- `RESEARCH_REGISTRY.md` Git blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`.
- Release state remains `NOT READY`.

## Semantic duplicate / owner reconciliation

Historical `RESEARCH_SOURCE_URL_DATA_MINIMIZATION_2026-08-30_EVIDENCE.md` was used only for provenance, prior physical controls and semantic dedup. Its own source baseline is historical and is not treated as current source truth.

It already assigns the durable/display URL root to P0-066 and explains the required separation between:

1. exact operational source identity used by save/retry/document provenance; and
2. durable/display URL data allowed into PDF, Journal, export/backup and UI.

That owner remains correct after fresh source review.

Adjacent owners remain separate:

- **P0-070** owns exact end-to-end source/document generation.
- **P0-023** owns exact source-document binding of retry cache.
- **P0-080** owns same-document application generation.
- **P0-075** owns hostile host-page UI/control-plane access.
- **P0-033 DONE** owns opaque signed Yandex transport capability redaction, which is stronger than ordinary durable source-URL projection.
- selection-locator privacy findings are dependencies but do not replace the single durable/display URL sanitizer required by P0-066.

## Fresh current-source proof

### 1. Exact source authority is correctly obtained from Chrome sender, but the same string is also used as durable metadata

`sanitizeContentSaveMeta(rawMeta, sender)` reads source authority from `sender.tab.url` / `sender.url`, parses it, requires HTTP(S), then returns:

```js
hostname: parsed.hostname.toLowerCase().slice(0, 255),
siteAddress: parsed.origin.slice(0, 2048),
url: parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS),
```

The sender-derived URL is a positive integrity control and must remain exact enough for P0-070/P0-023/P0-080.

The confidentiality problem is that `parsed.toString()` retains HTTP(S) URL username, password, query string and fragment and is then reused as archival/display data.

`siteAddress: parsed.origin` is a positive control showing that current code already understands a less-disclosing representation for a different role.

### 2. PDF persists the complete source URL in two independent channels

Current `content.js` print header builds:

```js
urlLink.href = meta.url;
urlLink.textContent = meta.url;
```

Therefore forbidden URL components can become both:

- visible PDF text; and
- PDF hyperlink/annotation target.

A fix that changes only visible text is insufficient. Both channels must consume the same durable/display projection.

Historical managed-Chromium evidence already physically demonstrated this persistence pattern; this tranche revalidates the current source path rather than treating that older browser run as current closure.

### 3. `normalizeJournalUrl()` is an identity normalizer, not a confidentiality sanitizer

Current worker implementation:

```js
function normalizeJournalUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return '';
  }
}
```

It removes only fragment. HTTP(S) userinfo and query remain.

Current PDF cache admission stores:

```js
sourceUrl: normalizeJournalUrl(meta.url || '')
```

for both local-download and Yandex cache paths. The same normalized form participates in current-page cache validation.

P0-066 must not simply replace this operational identity input with a lossy display URL, because different exact application states may intentionally collapse to the same durable projection.

### 4. Imported URLs have the same gap

Current `normalizeImportedHttpUrl(value)`:

1. bounds length;
2. parses URL;
3. permits only HTTP/HTTPS;
4. sets `url.hash = ''`;
5. returns `url.toString()`.

Thus imported HTTP(S) URL username/password/query survive.

A backup/import round trip can therefore re-admit durable URL components that a future live-save sanitizer might remove unless import uses the same versioned durable contract.

### 5. Selection locator metadata persists raw `href` and `src`

Current content locator construction stores:

```js
src: String(element?.getAttribute?.('src') || '').slice(0, 1000),
href: String(element?.getAttribute?.('href') || '').slice(0, 1000),
```

These are ordinary page attributes and can include query/fragment/userinfo or non-durable schemes.

The canonical P0-066 owner explicitly includes locator URLs. A source-only sanitizer is therefore incomplete.

Locator matching may need richer ephemeral operational data during the live session, but durable SelectionSnapshot/export metadata must use an explicit safe representation and must never promote a dangerous/non-durable scheme into persistent archival state.

### 6. One global destructive URL rewrite would be incorrect

A query/fragment can be real application state. For example:

- `https://example.test/app?id=42&view=compact#section`
- `https://example.test/app?id=99&view=compact#section`

may refer to distinct operational page states even if policy intentionally projects both durably to `https://example.test/app`.

Therefore durable equality cannot substitute for exact provenance.

The required architecture is a **dual representation**:

- bounded exact operational receipt under P0-070/P0-023/P0-080 authority; and
- versioned durable/display projection under P0-066.

The durable string must never be accepted as proof that two operation/document generations are the same.

## External standards / vendor controls

### WHATWG/MDN URL component model

MDN documents `URL.username`, `URL.password`, `URL.search` and `URL.hash` as separate URL components, and the URL object can modify them independently. This gives a deterministic component-wise sanitizer rather than a fragile regex over an opaque URL string.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/URL
- https://developer.mozilla.org/en-US/docs/Web/API/URL/username
- https://developer.mozilla.org/en-US/docs/Web/API/URL/password
- https://developer.mozilla.org/en-US/docs/Web/API/URL/search
- https://developer.mozilla.org/en-US/docs/Web/API/URL/hash

MDN also notes that credentials embedded in URLs are deprecated because of security concerns.

### OWASP — sensitive data in URLs

OWASP guidance warns that sensitive values in URL/query data can be exposed through browser history, logs and other intermediaries. This supports fail-closed archival treatment of credential/token-like URL components.

Sources:

- https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url
- https://owasp.org/www-project-web-security-testing-guide/

The P0-066 rule is intentionally broader than attempting to maintain a finite blacklist of query parameter names: WebClip cannot know every provider/application secret convention.

### Chrome extension storage

Chrome documents persistent extension storage areas and recommends session-only storage for sensitive user data where appropriate.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/storage

WebClip Journal/export/Yandex backup are intentionally durable archival surfaces, so they need minimized durable data rather than relying on storage lifetime to hide excess URL components.

## Public project / product controls

Obsidian Web Clipper is a useful public comparison because it also makes current page URLs and selector-derived `href`/`src` values available to clipping templates. Its documentation exposes `{{url}}`, `selector?...?href`, and `selector?...?src` as distinct captured data classes.

Sources:

- https://github.com/obsidianmd/obsidian-clipper
- https://github.com/obsidianmd/obsidian-clipper/blob/main/docs/Variables.md

This does not prove an Obsidian defect and is not used as one. It demonstrates that page-level and locator URLs are independently useful data in a real clipper, supporting WebClip's requirement for one explicit durability policy across both instead of accidental per-call-site behavior.

Obsidian's current documentation also states that saved clips are durable local artifacts and that remote image URLs can remain in clipped output, illustrating why persisted URL policy is a long-lived archival concern rather than only a transient network concern.

## Deterministic failure / acceptance model

Added model:

`project_tools/test_p0_066_durable_display_url_revalidation_model.js`

Local execution:

- `node --check`: PASS
- execution: **P0-066 durable/display URL model: PASS 61 checks**
- SHA-256: `d6bd7274bcf4bd7d40986a8fe4d1c56518802e13263661f9704d9ce03c08462d`
- expected Git blob: `f93f01b4ccb3b26dc5576967084c5c14be4c1c10`

The model proves:

1. current hash-only normalizer preserves userinfo/query;
2. candidate durable projection removes userinfo/password/query/fragment while preserving HTTP(S) origin/path;
3. non-durable schemes fail closed;
4. exact operational receipt remains separate and can distinguish values that share one durable projection;
5. document/navigation/application generations remain part of operational equality;
6. PDF visible text and annotation use the same safe projection;
7. locator `href` and `src` use the same durable policy;
8. imported URLs use the same sanitizer;
9. versioned export/import round trip preserves only the minimized durable form;
10. P0-033 signed-transport capability redaction remains separate and stronger.

The model uses origin/path as the conservative minimum candidate durable projection for the tested acceptance shape. The final implementation may adopt a different explicitly documented path/query policy only if it proves that secrets/userinfo/non-durable schemes cannot persist and preserves the exact/durable separation.

## Required implementation acceptance

### A. One versioned durable/display URL contract

Create one central policy used by every durable/display URL field, including at minimum:

- source URL shown/stored in PDF metadata;
- PDF link target;
- Journal entry/source display URL;
- pending local/remote recovery metadata intended to persist;
- full Journal export and Yandex backup;
- imported source/public metadata before re-persistence;
- SelectionSnapshot/locator URL fields such as `href` and `src`;
- content-template/card URL returned to host-page UI.

The policy must be versioned so import/export/migration behavior is explicit.

### B. Exact operational authority is separate

P0-070/P0-023/P0-080 may retain exact source identity only in the bounded operational receipt needed to prove source/document/application equality.

The durable/display URL must never be used as a substitute for:

- browser document identity;
- navigation/application generation;
- retry/source-generation authority.

Two exact URLs may intentionally project to the same durable URL.

### C. Component policy is fail-closed

At minimum:

- reject non-HTTP(S) durable source/locator URLs unless a specific separately-safe representation is defined;
- remove URL username and password;
- remove fragment;
- query must not persist by default merely because its parameter name is unfamiliar;
- dangerous schemes such as `javascript:`, `data:`, `blob:`, `file:` cannot enter ordinary durable URL fields.

Any allowed query subset requires an explicit documented allowlist/representation contract rather than a secret-name blacklist.

### D. PDF has no second URL channel

Both visible URL text and annotation/link target must use the durable projection.

Physical PDF verification must inspect both extracted text and annotation URI objects.

### E. Import/export cannot reintroduce forbidden data

Same-version WebClip export/import must round-trip the safe representation.

Legacy import must sanitize before new persistence. Unknown future policy versions fail closed or require explicit migration rather than silently accepting raw URL strings.

### F. Locator privacy follows the same contract

Durable locator `href`/`src` cannot keep raw query/fragment/userinfo/non-durable schemes merely because the locator is used for restore.

If exact ephemeral locator data is required to restore during one live operation, keep it in a bounded ephemeral receipt separate from durable SelectionSnapshot.

### G. Existing stronger URL boundaries remain stronger

P0-033 signed Yandex transport URLs remain opaque capabilities; do not weaken them into generic origin/path durable URLs.

Public-link policy under P0-069/P0-078 and remote identity under P0-022/P0-074 remain separate.

## Required physical regressions

Real browser/repository closure should prove at least:

1. source URL containing username/password/query/fragment produces none of those markers in PDF visible text;
2. PDF annotation URI contains none of those forbidden markers;
3. Journal row contains only durable projection;
4. pending local and remote recovery durable records contain only durable projection;
5. exported Journal/Yandex backup contains no forbidden source markers;
6. re-import of legacy raw URL sanitizes before persistence;
7. locator `href`/`src` query/userinfo/non-durable schemes do not persist;
8. `data:`, `blob:`, `file:`, `javascript:` durable inputs fail closed;
9. exact operational receipt still distinguishes two source states that intentionally have the same durable projection;
10. P0-070 source-generation regressions remain PASS;
11. P0-023 retry-generation regressions remain PASS;
12. P0-080 application-generation regressions remain PASS;
13. P0-033 signed-link redaction remains PASS.

## Closure interpretation

This tranche supplies fresh current-source proof, standards/vendor/public-project revalidation and a deterministic acceptance model.

It is **not** implementation closure.

`P0-066` remains **ACTIVE / ROOT-CAUSE-REVALIDATED** until runtime architecture changes and direct PDF/Journal/export/import/locator regressions are durable on current source.

Release readiness remains **NOT READY**.
