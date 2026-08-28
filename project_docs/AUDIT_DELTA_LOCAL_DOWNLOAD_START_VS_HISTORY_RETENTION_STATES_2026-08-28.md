# Audit delta — local download start receipt vs DownloadItem/history retention states — 2026-08-28

Source-of-truth `main` before this checkpoint: `7de06abc93b577ea454a21f0e5cb783f3559e9e0`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-039**, **P0-048**, **P1-146**, **P1-087** and the compact detached-evidence contract recorded in the preceding audit session.

The current `PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h` is applied to states with materially different evidence. A single wall-clock threshold cannot both reclaim resources and prove that a non-cancellable Chrome download side effect never occurred.

## Current local-download state has at least two physical identity phases

Before `chrome.downloads.download()` WebClip stores an unbound intent under a key shaped like `intent:<...>`.

After Chrome returns a numeric `downloadId`, the intent is bound to a numeric pending checkpoint and later recovery queries that exact id.

These states mean different things:

### Unbound intent

WebClip knows:

- exact local operation/PDF/blob intent;
- that a Chrome download start may have been admitted;
- but no durable numeric `downloadId` was observed/bound yet.

### Bound DownloadItem

WebClip knows:

- exact `downloadId`;
- its pending Journal metadata;
- later `downloads.search({id})` can reconcile browser state while Chrome retains that history item.

The evidence and safe cleanup rules are not interchangeable.

## Positive controls

Current recovery correctly includes several important protections:

- exact Blob URL is the primary unbound-intent match;
- filename + expected bytes is only a short-window fallback;
- candidates must have `byExtensionId === chrome.runtime.id`;
- Downloads API read errors preserve the checkpoint rather than treating them as absence;
- numeric-bound reconciliation also filters by own-extension ownership.

P0-048 already owns the remaining fallback ambiguity where `.find()` can choose the same candidate for multiple intents.

This checkpoint does not duplicate that finding.

## Fresh issue — unbound intent age starts before actual browser settlement is known

The unbound-intent branch computes:

`intentAge = Date.now() - (createdAt || updatedAt)`.

It searches recent DownloadItems. If no candidate can be bound and `intentAge > 24h`, current code removes the pending intent, revokes its Blob URL and logs that no Journal record was created.

But `createdAt` is the local intent/admission time. It is not an authoritative browser receipt proving the underlying non-cancellable `downloads.download()` call settled as `no download created`.

A local timeout/worker death is not browser cancellation.

Therefore:

`24h since intent creation + no currently searchable DownloadItem`

is not a physical non-occurrence proof.

## MV3 worker loss makes the distinction unavoidable

Same-worker code keeps unresolved actual Chrome starts in `automaticDownloadStartSettlements` and caps them. That is a useful admission bound.

The map is module memory. After MV3 termination it cannot tell a future worker whether the old browser-side start:

- never reached Chrome;
- was rejected;
- created a DownloadItem whose response was lost;
- created a DownloadItem later removed from history;
- remains in an unusual delayed browser-owned settlement state.

The durable intent is precisely the crash evidence that survives that loss.

Removing it because its wall-clock age exceeded 24h converts `unknown physical result` into `no retained evidence` without an authoritative settlement receipt.

## Bound DownloadItem has a different 24h problem

For a numeric pending key current recovery performs exact `downloads.search({id})`.

If no DownloadItem is found and checkpoint age exceeds 24h, current code removes the pending checkpoint and Blob and records terminal diagnostic text.

P0-039 already proves why this is unsafe: Chrome/user may have cleared download history even after a physically successful file write.

The fresh retention-model point is that the same numeric constant currently represents two different assumptions:

- unbound start could not be reconciled;
- bound historical DownloadItem is no longer queryable.

Neither absence is proof that no physical file existed.

## Resource lifetime and evidence lifetime must be separate

A Blob URL or cached PDF body may need a finite resource deadline to avoid pinning memory/storage indefinitely.

The exact physical-operation evidence does not need to retain those heavy resources indefinitely.

After a resource deadline:

1. stop/clean expensive retry resources according to exact owner state;
2. retain a compact detached receipt for unresolved physical outcome;
3. mark whether the receipt was never-bound or numeric-bound;
4. never describe resource reclamation as proof that the browser side effect did not occur.

This composes directly with the prior `AUDIT_DELTA_COMPACT_DETACHED_RECEIPT_RETENTION_2026-08-28.md` architecture.

## Required local download state model

A versioned generation should distinguish at least:

- `prepared-intent` — durable before browser admission;
- `start-admitted/outcome-unknown` — browser start may be in flight, no numeric id confirmed;
- `download-bound` — exact own-extension numeric id known;
- `download-complete` — exact DownloadItem reports complete;
- `download-interrupted` — exact DownloadItem reports interrupted;
- `history-unavailable/unknown` — previously unresolved/bound evidence cannot be queried authoritatively;
- `detached-stale-journal-generation` where clear/import revoked Journal finalization;
- compact terminal/dead-letter class when rich retry resources are reclaimed.

The implementation may collapse some phases if equivalent proof is retained, but must not collapse unknown into absent.

## Age belongs to a physical generation, not to a reused Journal id

Each local-download generation needs its own:

- created/admitted timestamp;
- numeric bind timestamp when available;
- last authoritative browser observation;
- resource-retention deadline;
- evidence-retention/dead-letter transition.

A retry/new physical generation cannot inherit age/attempt history from an earlier attempt, matching the remote-save generation rule established in the preceding session.

## P0-048 exact matching composition

When an unbound intent is reconciled by search:

- exact Blob URL remains strongest current evidence;
- heuristic fallback requires exactly one unclaimed own-extension candidate;
- one DownloadItem cannot satisfy two physical generations;
- `bindPendingLocalDownloadIntent()` must compare ownership and refuse to overwrite an existing different numeric generation;
- after bind, later state changes address that exact generation/id.

A retention transition cannot make ambiguity disappear by selecting the first candidate merely because the intent is old.

## Journal finalization authority

A compact unresolved receipt is not authority to create a Journal entry.

Automatic Journal success still requires the strong proof required by P0-048/P1-087:

- exact own-extension DownloadItem;
- correct physical generation binding;
- terminal `complete` state;
- expected Journal generation/capability still current.

If history is unavailable, retain evidence/manual state without fabricating a successful Journal record.

## Required deterministic regressions

1. Unbound intent -> browser start response lost -> worker restart -> no searchable item for >24h: heavy Blob may be reclaimed, but compact unknown-start receipt survives; system does not claim no download occurred.
2. Same case where DownloadItem appears later -> retained generation can be reconciled without starting a second download automatically.
3. Bound exact DownloadItem physically completes -> history is cleared before recovery -> >24h: Journal is not falsely finalized, but physical-generation evidence remains bounded/detached.
4. Bound DownloadItem is authoritatively interrupted -> terminal interruption can retire retry resources according to policy without leaving an `unknown` classification.
5. Downloads API search throws -> no absence/TTL conclusion is drawn from the failed read.
6. Two equal filename/byte intents -> ambiguous fallback cannot bind either to the same item.
7. Exact Blob URL candidate and heuristic candidate coexist -> exact generation wins; heuristic does not steal another claimed id.
8. Rich Blob/PDF retry cache expires while physical result stays unknown -> compact receipt remains and contains no large body.
9. Clear/import while local download active -> Journal capability becomes stale while physical receipt survives detached.
10. Normal exact complete DownloadItem finalizes once and compact evidence can then be retired under ordinary terminal retention.
11. New retry B gets a new age/admission generation; it never inherits old A's 24h age.
12. OperationLog cleanup/clear does not remove the physical local-download receipt.

## Duplicate check / numbering

No new item is created.

- **P0-039** owns preservation of unresolved physical save evidence.
- **P0-048** owns exact local DownloadItem identity/binding ambiguity.
- **P1-087** owns own-extension DownloadItem provenance.
- **P1-146** owns non-cancellable `downloads.download()` actual-settlement/admission behavior.
- Existing detached-receipt/storage-pressure items remain the retention implementation dependencies.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime change, build, tag or Release was made.
