# Audit delta — imported Journal provenance / destructive authority

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `35651489f34648ac267904015705de5338528b83`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens and connects existing **P0-022 PARTIAL**, **P1-188 OPEN**, **P1-189 OPEN** and **P1-190 OPEN**. P1-182 privacy evidence remains valid but is not the destructive-authority root cause.

The common design gap is that replace-import produces entries whose imported fields are thereafter structurally indistinguishable from locally issued live authority. A durable provenance class is required; per-field syntax validation alone is insufficient.

## P0-022 — stronger destructive provenance proof

`normalizeImportedJournalEntry()` accepts from an unsigned backup:

- `destination='yandex'` and `readingMode='later'`;
- `remotePath`, `folder`, `filename`;
- `resourceId`, `publicUrl`, `accountUid`, `rootPath`;
- `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId`.

The imported entry carries no durable marker saying that these values are `imported-unverified` rather than locally issued recovery/object receipts.

`findYandexFileForJournalEntry()` defines `matchesKnownIdentity()` so that when both `resourceId` and `publicUrl` are absent, **any API object of type `file` passes identity matching**. The function checks, in order, the saved `remotePath`, then deterministic known-path candidates including imported `readMoveTargetPath`, `readMoveSourcePath`, derived Upload/ReadmeLater paths and `folder + filename`.

This confirms the existing P0-022 attack class and adds a stronger concrete sequence:

1. crafted backup imports a Yandex `readingMode='later'` entry;
2. it leaves `resourceId/publicUrl` empty;
3. it sets `readMoveTargetPath` to an existing unrelated WebClip-managed file under the derived Upload target folder;
4. user later explicitly chooses `Прочитать позже → Прочитано`;
5. locate treats the imported pending target as a recovery candidate and, with no stable identity fields, accepts the unrelated `file`;
6. `moveReadLaterEntryToRead()` sees the accepted source already inside the Upload target folder and can complete the **local** move state without performing a remote move;
7. the imported Journal entry has now effectively adopted that unrelated real file; a later ordinary Delete/Trash action can obtain destructive authority over it.

Managed-branch containment still prevents escaping the configured WebClip branches, but does not prove which object inside those branches belongs to this Journal entry.

### Required P0-022 acceptance refinement

- Imported/legacy `remotePath`, `folder`, filename-derived candidates and every imported `readMove*` field are hints only.
- An imported `readMoveTargetPath` must never be interpreted as a locally issued unfinished-move checkpoint.
- `resourceId/publicUrl/accountUid/rootPath` imported from unsigned backup are not a signature or local provenance proof either.
- New live entries/recovery transitions need a versioned locally-issued remote binding/checkpoint receipt.
- Import must retain historical fields for roundtrip/diagnostics but mark the binding/checkpoint provenance `imported-unverified`.
- Destructive move/delete must require a proven local binding or an explicit safe re-bind procedure that proves exact current account/root/object identity; otherwise fail closed.
- Regression must include the crafted pending-target adoption sequence above, not only `remotePath`/filename fallback.

## P1-189 — imported site identity remains privileged routing input

Fresh code confirms import does:

- `url = normalizeImportedHttpUrl(raw.url)`;
- `hostname = raw.hostname` when supplied, rather than canonicalizing it from `url`;
- `siteKey` is derived from `url || hostname`.

Remote locate/mark-read then uses `entry.hostname || hostnameFromUrl(entry.url)` to build site-dependent Upload/ReadmeLater paths.

Therefore a syntactically valid imported `hostname` remains privileged routing authority even when it conflicts with the normalized URL. P1-189 remains OPEN.

Acceptance remains: canonical `hostname/siteAddress/siteKey` must derive from the normalized URL for any operation that has a valid URL; conflicting imported duplicates are rejected or retained only as historical non-authoritative metadata. Legacy entries without a trustworthy HTTP(S) URL must not obtain site-dependent destructive routing from raw hostname alone.

## P1-190 — imported OperationLog ID has no installation/local-receipt provenance

Fresh import still normalizes and stores a syntactically valid `raw.operationId` directly into `entry.operationId`. Journal UI then builds the linked OperationLog affordance from that same value.

After replace-import there is no marker distinguishing:

- operationId locally issued for this live entry in this installation; versus
- historical/imported operationId text from another backup/installation.

So a crafted/imported entry can still point the UI at an unrelated current-installation OperationLog record with the same ID. This is forensic/provenance corruption, not a new remote privilege.

Acceptance: preserve the historical ID as `sourceOperationId` or equivalent, but only a locally issued receipt/installation namespace may activate a live OperationLog link.

## P1-188 — arbitrary imported selector execution remains unchanged

`sanitizeSelectionSnapshot()` still accepts `locator.cssPath` as arbitrary text up to 4000 chars. In `content.js`, both legacy and v3 restore paths feed it to native `querySelector()` before/alongside structural resolution; v1/v2 can accept the first tag-compatible match directly.

The provenance lesson is the same: imported locator text must not silently inherit the execution semantics of a locally generated canonical selector.

Acceptance remains P1-188: validate/parse only WebClip's versioned canonical selector grammar or ignore imported cssPath and use bounded structural fields. Preserve compatibility through migration, not by executing arbitrary imported CSS.

## P1-182 — privacy evidence confirmed, no reclassification

Locator sanitizer still stores plaintext `src`, `href`, element/ARIA/name/title text plus parent/previous/next text. Content locator creation still obtains raw `getAttribute('src')` / `getAttribute('href')` values. This supports P1-182, but the destructive-provenance checkpoint above does not create a new privacy item.

## System-level provenance requirement

A robust fix should introduce a versioned provenance layer instead of adding more ad-hoc booleans. At minimum distinguish:

- locally issued live Journal entry / local operation receipt;
- locally issued remote-object binding;
- locally issued recovery checkpoint generation;
- imported historical metadata;
- imported-unverified remote locator/binding;
- legacy-unverified state requiring safe migration/re-bind.

Export may preserve historical metadata, but import must not recreate local authority merely because field names match the live schema.

## Duplicate check

- Not P0-073/P0-074: account/root/auth generation fences remain required, but an attacker can import matching/blank values; provenance of the object binding is separate.
- Not P1-184: exact content/object proof is required after a candidate is found, but P0-022 decides whether imported locator/checkpoint fields may select the candidate at all.
- Not P1-189: site identity canonicalization does not prove object provenance.
- Not P1-190: OperationLog provenance is forensic/UI linkage only, not destructive Yandex authority.
- No P0-079/P1-197 assigned.
