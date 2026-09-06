# P1-189 — imported site identity must derive from normalized URL — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: imported hostname/site identity must be derived from normalized URL before privileged Yandex routing; a duplicate raw `hostname` field is not authority.

## 1. Current source proof

`normalizeImportedJournalEntry()` currently does:

```js
const url = normalizeImportedHttpUrl(raw.url || '');
const hostname = boundedImportString(
  raw.hostname || (() => { try { return new URL(url).hostname; } catch (_) { return ''; } })(),
  255
);
```

Therefore a portable backup field `raw.hostname` overrides the host derived from the already-normalized URL.

Later, privileged Yandex move/read-later routing uses:

```js
getSiteFolderSegments(entry.hostname || hostnameFromUrl(entry.url))
```

This gives the duplicated imported field authority over the target site-folder namespace.

Other Journal filtering/view paths also use `entry.url || entry.hostname`, so a single inconsistent duplicate can affect both UI classification and privileged routing.

## 2. Root contract

A Journal entry has one canonical site identity source:

```text
normalized URL -> derived hostname -> derived site key/folder identity
```

`hostname` is a derived/cache/display field only. It is never an independently trusted input from backup/content metadata.

At import normalization:

1. normalize `raw.url` under the P0-066 URL policy;
2. derive hostname from that normalized URL;
3. derive public-suffix/site key from the same URL/hostname;
4. ignore `raw.hostname` for authority;
5. optionally record only a diagnostic boolean/counter that a conflicting duplicate field was present, never the conflicting value if not needed.

## 3. Fail-closed behavior

If the normalized URL is missing, invalid or non-HTTP(S):

- derived hostname is empty;
- imported `raw.hostname` must **not** rescue it;
- privileged site-dependent Yandex routing fails closed / requires manual re-establishment from independently trusted data;
- display grouping may use an explicit `unknown` bucket, but must not fabricate a site identity.

This avoids a fallback of the form:

```js
hostnameFromUrl(url) || importedHostname
```

which would preserve the defect.

## 4. Privileged routing must derive fresh authority

Even after import normalization, high-impact routing should not blindly trust a cached `entry.hostname` field forever.

Before creating/moving a Yandex site folder, derive the current routing site from the entry's normalized durable URL (or a versioned derived-site receipt that proves it was generated from that exact URL generation).

Conceptually:

```js
const site = deriveJournalSiteIdentity(entry.url);
if (!site.hostname) failClosed();
const target = joinDiskPath(uploadRoot, ...getSiteFolderSegments(site.hostname));
```

This protects legacy rows and future accidental field drift.

## 5. Live-save path

Although the Registry wording is import-focused, new live Journal rows should follow the same invariant: content-provided `meta.hostname` is a convenience hint, not authoritative site identity.

The worker can derive `hostname`, `siteKey`, folder segments and grouping keys from authoritative normalized `meta.url` at the persistence/routing boundary.

This prevents implementation from fixing import while continuing to create duplicate mutable authorities for new rows.

## 6. P0-066 composition

P1-189 does not define a second URL sanitizer.

P0-066 owns the durable/display URL policy. P1-189 consumes its normalized URL output and derives site identity from that value.

If P0-066 changes the durable URL projection while preserving host identity, P1-189 should remain mechanically downstream of that module.

## 7. Public suffix / grouping

`getJournalSiteKey()` / the public-suffix helper remain responsible for grouping semantics. P1-189 only says their input comes from the canonical normalized URL-derived identity, not an independent backup hostname.

Thus hostname and siteKey are separate concepts but share one source-of-truth lineage.

## 8. Deterministic model

`project_tools/test_p1_189_imported_site_identity_model.js` proves:

- conflicting `raw.hostname` is ignored when a valid URL exists;
- privileged folder routing follows URL-derived hostname;
- invalid/non-HTTP URL plus a plausible raw hostname still fails closed;
- the same normalized URL produces the same site identity regardless of duplicate backup fields.

Expected output:

```text
P1-189 imported site identity model: PASS
```

## 9. Source-bound gate

The RED source gate should require:

1. import normalization derives hostname only from normalized URL;
2. no `raw.hostname || derived(url)` authority fallback;
3. privileged Yandex folder routing derives from URL/versioned derived-site receipt, not `entry.hostname || hostnameFromUrl(entry.url)`;
4. Journal siteKey/grouping code prefers canonical URL-derived identity;
5. invalid URL cannot be rescued by imported hostname;
6. live append/persistence also derives duplicate site fields from canonical URL.

## 10. Neighboring owners

- **P0-066** — URL confidentiality/normalization.
- **P0-022** — imported Yandex remote locators are not destructive object provenance.
- **P0-073/P0-074** — account/root/live Yandex context authority.
- **P1-190** — imported operationId is historical/unverified, not local OperationLog linkage.

P1-189 does not prove remote object identity and does not authorize moves by itself.

## 11. Closure evidence still required

Architecture/model PASS does not close P1-189.

Closure requires production implementation, source-gate PASS and direct regression evidence that an imported row with `url=A` / `hostname=B` is classified and routed only as A, while invalid URL + B cannot reach privileged site routing.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
