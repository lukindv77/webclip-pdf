# Local download recovery audit delta — 2026-08-27

Baseline source HEAD: `ff576e5f76dc64048e60e38233ef197e73c56838`.

This is a lossless audit checkpoint for existing recovery items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-039 refinement — bounded `downloads.search()` miss is not negative proof

P0-039 already requires that absence of a DownloadItem after 24 hours must not be treated as proof that the physical file was never saved. Fresh code review found a second, earlier reason that the current negative proof is unsound for unbound download intents.

Current intent reconciliation:

- scans at most `PENDING_LOCAL_RECONCILE_BATCH = 12` checkpoints per maintenance pass;
- for an intent without a bound `downloadId`, calls `chrome.downloads.search({ startedAfter, limit: 200 })`;
- filters the returned array to own-extension DownloadItems and then tries exact Blob URL first, conservative filename+bytes fallback second;
- if no candidate is found and the intent becomes older than `PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h`, removes the durable checkpoint, revokes the Blob URL if present, and logs that the Journal entry was not created.

The hard `limit: 200` means a successful `downloads.search()` call only proves that the matching item was not found **inside that bounded result set**. If more than 200 DownloadItems satisfy the `startedAfter` filter, a valid exact own-extension candidate can be omitted from the returned sample. Therefore `download === undefined` after this query is not even proof that Chrome Downloads history lacks the item; it can simply be a bounded-discovery miss.

Required extension of P0-039:

- Never TTL-drop the only durable intent because a capped candidate scan returned no match.
- Recovery discovery must either establish a completeness property for the searched time/key range or preserve the checkpoint as unresolved/dead-letter/manual-resolution evidence.
- If a bounded search cannot enumerate all plausible candidates, record `discoveryIncomplete` (or equivalent) distinctly from authoritative `notFound`.
- Do not convert repeated bounded search misses into physical-file absence by elapsed wall-clock alone.
- P0-039's existing rule still applies after Chrome history was genuinely cleared: missing history is unknown outcome, not proof of no physical file.

Required regression:

1. Create an unresolved intent whose exact own-extension DownloadItem exists, but arrange >200 later DownloadItems inside the current `startedAfter` range so the matching item is outside the first bounded result set.
2. Maintenance must not delete the intent at 24h merely because that capped query missed it.
3. Recovery evidence remains bounded/manageable (dead-letter/manual-resolution is acceptable) and no false Journal success is created.

No new P0/P1 number is assigned because the data-loss mechanism is exactly P0-039's prohibited destruction of the sole unknown-outcome checkpoint on insufficient negative evidence.

## Existing P0-048 confirmation — ambiguous fallback and downloadId claim remain open

Fresh review reconfirms the current fallback implementation:

- candidate array is filtered to own-extension DownloadItems;
- exact Blob URL is primary identity;
- fallback accepts requested filename + exact bytes + short age window;
- selection still uses `.find(...)`, i.e. the first matching candidate;
- the recovery scan does not establish that fallback has exactly one candidate and does not exclude DownloadItems already claimed by another pending checkpoint before selecting one;
- `bindPendingLocalDownloadIntent()` deletes the intent key and `put()`s the bound item under numeric `downloadId`; if another checkpoint already owns that key, IndexedDB `put()` can replace it.

This remains precisely P0-048 PARTIAL. Required resolution continues to be: zero or multiple fallback candidates fail closed, already-claimed ids are excluded, and binding uses an atomic no-overwrite/expected-owner contract.

## Positive findings retained

This pass also confirms several existing safeguards:

- `downloads.search()` API errors/timeouts are treated as recovery errors and keep the checkpoint; they are not converted to not-found.
- Once a checkpoint has a known numeric `downloadId`, reconciliation uses exact `downloads.search({id})` rather than the 200-item discovery scan.
- ownership gate `byExtensionId === chrome.runtime.id` is applied before recovery accepts a candidate (P1-087).
- append after physical completion rechecks the required durable checkpoint in the same IndexedDB transaction; if clear/import intentionally removed that checkpoint, the old metadata is not resurrected (P0-072 behavior).
- automatic `downloads.download()` starts keep a durable intent before the non-cancellable browser call and maintain a global unresolved-start cap of four (P1-146).

## Existing P1-067 note — Blob deadline behavior remains intentional, not a new finding

After the 15-minute automatic-download resource deadline, WebClip checks `downloads.search({id})`; for in-progress or unknown state it makes a bounded best-effort `chrome.downloads.cancel(id)` attempt and then releases the Blob URL. The cancel promise itself can time out locally, but the accepted P1-067 contract explicitly chooses bounded resource lifetime after a cancel attempt. This audit does not reclassify that trade-off as a new issue.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.
