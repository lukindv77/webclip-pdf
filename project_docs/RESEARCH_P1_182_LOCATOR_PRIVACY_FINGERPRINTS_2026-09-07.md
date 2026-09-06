# P1-182 — durable locator privacy fingerprints — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: durable `SelectionSnapshot` locator context must not persist surrounding plaintext or sensitive raw `href/src`; restore quality must instead use privacy-minimized structural evidence and versioned fingerprints.

## 1. Current source proof

The live locator producer currently captures multiple page-controlled semantic strings directly:

```js
text: locatorElementText(element, 180),
ariaLabel: String(element.getAttribute('aria-label') || '').slice(0, 180),
name: String(element.getAttribute('name') || '').slice(0, 180),
title: String(element.getAttribute('title') || '').slice(0, 180),
src: String(element.getAttribute('src') || '').slice(0, 1000),
href: String(element.getAttribute('href') || '').slice(0, 1000),
parentText: locatorElementText(parent, 160),
previousText: locatorElementText(element.previousElementSibling, 120),
nextText: locatorElementText(element.nextElementSibling, 120)
```

The worker `sanitizeSelectionSnapshot()` currently preserves those values as bounded plaintext, including `src`, `href`, `parentText`, `previousText` and `nextText`.

That sanitizer is reused at save/checkpoint/Journal/import boundaries, so length bounding alone does not prevent the values from becoming durable/exportable locator metadata.

## 2. Privacy goal

P1-182 is a data-minimization owner, not an encryption owner.

The durable locator should contain enough secondary evidence to improve restore quality without retaining nearby human-readable page content or raw capability-like URL components.

The following semantic fields should no longer be durable plaintext:

- target text sample;
- `aria-label` / `name` / `title` when used only as locator context;
- parent/sibling text samples;
- raw `href`;
- raw `src`.

Structural fields such as bounded tag, role, path/index evidence and the separately-governed id/class fields remain available. This document does not claim all possible page identifiers are secret-free; it closes the Registry-defined semantic-context/raw-URL owner.

## 3. Versioned privacy receipt

Conceptually, a durable locator becomes:

```js
{
  privacyVersion: 1,
  tag,
  id,
  role,
  classes,
  domPath,

  textFeatures: {
    text:        { digest, lengthBucket },
    ariaLabel:   { digest, lengthBucket },
    name:        { digest, lengthBucket },
    title:       { digest, lengthBucket },
    parentText:  { digest, lengthBucket },
    previousText:{ digest, lengthBucket },
    nextText:    { digest, lengthBucket }
  },

  hrefProjection,
  hrefFingerprint,
  srcProjection,
  srcFingerprint
}
```

The exact field layout may change during implementation, but it must remain explicitly versioned and bounded.

## 4. Text fingerprints

Text evidence is normalized using the same bounded normalization semantics on both producer and restore candidate, then domain-separated before hashing, for example:

```text
SHA-256("webclip-locator-v1\0parentText\0" + normalizedBoundedText)
```

The raw normalized text is not persisted.

A coarse non-plaintext feature such as a bounded length bucket may accompany the digest to preserve a small amount of scoring information.

### Important limitation

A digest is **not encryption**. Low-entropy values can be guessed by an attacker who already possesses the backup. P1-182 therefore treats hashing as durable plaintext minimization and equality evidence, not as a confidentiality guarantee against dictionary attack.

Fingerprints must remain secondary restore evidence and must never become privileged identity/authorization receipts.

## 5. URL context composes with P0-066

Raw locator `href/src` must not create a second URL privacy policy.

P1-182 composes with P0-066:

- durable plaintext projection for ordinary HTTP(S) locator URL context is the approved minimized form, conceptually `scheme + host/port + pathname`;
- username/password, query and fragment are absent from durable plaintext;
- non-durable/non-HTTP schemes do not become openable locator URLs;
- if exact secondary comparison is useful, a domain-separated fingerprint of the bounded exact value may be stored separately;
- the digest itself is never interpreted as a URL and is never passed to navigation/network APIs.

Thus two URLs with the same origin/path but different query values can remain distinguishable as secondary evidence without storing either query in plaintext.

## 6. Worker-authoritative persistence boundary

The authoritative sanitizer belongs in the extension worker before any Journal/checkpoint/export/import persistence.

Raw locator semantic strings received from content are transient input only. They must not appear in:

- Journal rows;
- pending save checkpoints;
- PDF retry cache metadata;
- exported backup JSON;
- OperationLog/error text;
- import staging records after normalization.

Legacy imports containing plaintext locator context should be migrated at import normalization time: compute the permitted V1 features/fingerprints, then discard the raw fields before staging/commit.

## 7. Restore comparison without re-persisting plaintext

Current scoring uses exact/string-similarity comparisons on the raw locator fields. After P1-182, restore should proceed in two phases:

1. structural shortlist using id/tag/path/classes/role and P1-188 selector grammar;
2. bounded privacy-evidence comparison for only that shortlist.

Because `SubtleCrypto.digest()` is asynchronous and available in workers, the robust baseline design is worker-authoritative hashing of a **bounded batch** of transient candidate evidence. The content/frame context supplies opaque candidate ids plus already-bounded evidence; the worker returns fingerprints/scores and does not persist/log the raw batch.

Reference: <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>

An implementation may use an equivalent audited shared helper where the platform context supports it, but there must be no requirement to persist plaintext merely to keep restore scoring synchronous.

P1-172 owns bounding/sanitizing data before structured-clone IPC; P1-168/P1-167 own the work budgets for candidate acquisition and scoring.

## 8. Migration and compatibility

Legacy snapshots without `privacyVersion:1` are normalized as untrusted durable input:

- permitted raw semantic fields may be read once inside the worker import/save sanitizer;
- V1 minimized features are derived;
- plaintext fields are removed before the normalized object crosses a durable boundary.

If a legacy value is malformed/oversized/non-durable, the corresponding privacy feature is omitted rather than preserving the original text for compatibility.

Restore can fall back to structural evidence when a fingerprint is absent.

## 9. Composition with neighboring owners

- **P0-066** — canonical durable/display URL minimization.
- **P1-188** — imported selector language; arbitrary CSS text is not executable authority.
- **P1-168** — bounds live locator string/sibling/selector work before processing.
- **P1-172** — bounds save metadata before print DOM and structured-clone IPC.
- **P1-001** — final rendered-target admission.
- **P1-154** — aggregate locator count/byte budget.

P1-182 does not own document generation, selection admission or exact remote object identity.

## 10. Deterministic model

`project_tools/test_p1_182_locator_privacy_fingerprints_model.js` proves:

- semantic text and surrounding context are absent from the durable object;
- userinfo/query/fragment are absent from durable URL projections;
- domain-separated SHA-256 fingerprints preserve exact secondary comparison;
- two raw URLs with the same durable origin/path projection can still have different fingerprints;
- structural fallback remains intact when semantic evidence changes;
- non-HTTP schemes never become durable openable locator URLs.

Expected output:

```text
P1-182 locator privacy fingerprints model: PASS
```

## 11. Source-bound acceptance gate

Before implementation can be claimed, committed source must prove:

1. a named/versioned locator privacy policy;
2. worker-side fingerprint/minimization before Journal/checkpoint/import persistence;
3. no durable `text/parentText/previousText/nextText` plaintext in normalized locators;
4. no durable raw `href/src` plaintext with credentials/query/fragment;
5. P0-066-compatible URL projections;
6. bounded fingerprint comparison path on restore;
7. legacy import migration discards raw fields after deriving permitted features;
8. no logging/error path serializes raw locator semantic evidence.

## 12. Closure evidence still required

Architecture/model PASS does not close P1-182.

Closure requires production implementation, committed-source gate PASS, migration tests and real Chrome evidence that:

- a saved/exported snapshot does not contain injected sentinel plaintext/query secrets;
- restore still discriminates a structurally similar positive/negative candidate using privacy features;
- malformed/legacy locator data fails closed or falls back structurally without re-persisting plaintext.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
