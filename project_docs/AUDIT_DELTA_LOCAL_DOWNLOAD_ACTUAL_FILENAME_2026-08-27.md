# Audit delta — actual local-download filename / recovery receipt — 2026-08-27

Source-of-truth `main` immediately before this write: `850542b130cf4abf27e94015cb7ae115b39c4883`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## New confirmed item: P1-199 — local Journal/recovery never captures Chrome-resolved filename

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

This root cause is distinct from:

- `P0-039` — preserving unresolved local-save recovery evidence instead of destructive TTL-drop on unknown outcome;
- `P0-048` — ambiguous fallback matching / numeric `downloadId` no-overwrite;
- `P1-146` — actual settlement of non-cancellable `chrome.downloads.download()` start;
- `P1-198` — worker-issued operation identity;
- `P0-079` — immutable PDF byte generation/consumer ownership.

The missing invariant is **physical local filename truth**: WebClip requests one filename, explicitly allows Chrome to uniquify it, but never writes the Chrome-resolved target basename back into the durable checkpoint or Journal entry.

## Fresh source proof

### 1. Automatic local download explicitly allows filename mutation

`startAutomaticBlobDownloadBounded()` starts Chrome Downloads with:

- `url: sourceUrl`;
- `filename: targetFilename`;
- `saveAs: false`;
- `conflictAction: 'uniquify'`.

Current Chrome Extensions downloads documentation defines `uniquify` to modify the filename by adding a counter before the extension when the requested name already exists.

Therefore `targetFilename` is only a **requested** filename. It is not proof of the final physical filename.

This is a normal supported outcome, not an exceptional API failure.

### 2. Filename collisions are plausible in normal WebClip use

WebClip's generated filename timestamp has one-second granularity:

`YYYY-MM-DD_HH-MM-SS`.

Two saves of the same title/domain inside the same second can therefore request the same filename. A pre-existing file with the same generated name can also trigger Chrome's conflict policy.

The physical outcome can consequently be e.g.:

- requested: `Title__site__2026-08-27_18-30-00.pdf`;
- actual: `Title__site__2026-08-27_18-30-00 (1).pdf`.

### 3. Durable intent stores only requested filename

Before the irreversible Chrome start, `checkpointPendingLocalDownloadIntent()` persists `pendingData`, whose `filename` is the requested WebClip filename.

The durable item also stores Blob URL, expected bytes, operationId and Journal metadata, but has no separate fields such as:

- `requestedFilename`;
- `resolvedFilename` / `savedFilename`;
- filename resolution state.

After `chrome.downloads.download()` returns a numeric `downloadId`, `bindPendingLocalDownloadIntent()` rekeys the existing intent under that id. It does not read the corresponding `DownloadItem` and does not update filename metadata.

### 4. Fast-path completion appends Journal directly from stale requested metadata

`chrome.downloads.onChanged` reacts to terminal `state.current` and calls:

`finalizePendingLocalDownload(downloadId, state, error)`.

On `complete`, that function loads the durable checkpoint and immediately calls:

`appendJournalEntryFromDurableCheckpoint(pending.data, ...)`.

It does not first read `chrome.downloads.search({id: downloadId})` to obtain the actual `DownloadItem.filename`.

The onChanged listener also ignores filename-only deltas because it returns unless `delta.state.current` is present.

Therefore a successful uniquified physical file can be journaled under the original requested name.

### 5. Recovery fallback uses exact requested basename

For an unbound intent, background reconciliation first tries exact Blob URL identity. The code explicitly supports a fallback for browsers/history states where the original Blob URL is no longer exposed.

That fallback:

1. extracts the basename from `candidate.filename` (the Chrome DownloadItem target);
2. requires it to equal `expectedFilename` from the durable intent exactly;
3. also requires exact expected bytes and a short time window.

When Chrome has legitimately uniquified the filename, exact equality is false by design.

Thus if the Blob URL is unavailable, a valid own-extension physical download can become undiscoverable specifically because WebClip intentionally requested `conflictAction:'uniquify'` but retained only the pre-conflict name.

### 6. Do not "fix" this by accepting `(1)`, `(2)` heuristically

Broadening fallback to accept any basename that looks like a uniquified derivative would weaken P0-048.

Several own-extension downloads may legitimately have:

- the same requested base;
- the same byte length;
- nearby timestamps;
- different Chrome conflict counters.

The correct solution is to capture the exact resolved target for the already-known numeric DownloadItem, not to make later discovery more heuristic.

## User-visible / recovery impact

### Journal truth

For a completed automatic local save, the Journal can show a filename that does not exist on disk under that name. The user may search the download folder for WebClip's displayed filename and fail to find it although the file was saved correctly under Chrome's uniquified name.

### Recovery completeness

When the fast terminal event/finalization was missed and the intent remains unbound/needs discovery, loss of Blob URL plus filename uniquification makes the current fallback miss the correct DownloadItem deterministically.

Current P0-039 then compounds this because old unresolved evidence is eventually TTL-dropped. P0-039 already owns the destructive evidence-loss bug; P1-199 owns the reason the successful physical file cannot be rediscovered/truthfully named even with otherwise healthy Chrome history.

After P0-039 is fixed, P1-199 would still matter: the checkpoint would safely remain unresolved/dead-lettered rather than being falsely finalized, but automatic recovery could not prove the correct DownloadItem from the data it retained.

## Required P1-199 contract

### Separate requested and resolved names

Model at least:

- `requestedFilename` — WebClip's deterministic generated proposal;
- `resolvedFilename` / `savedFilename` — exact basename reported for the own-extension Chrome DownloadItem;
- resolution state (`requested-only`, `resolved`, `unknown`) if useful.

Do not overwrite history in a way that loses which filename WebClip originally requested; both values are useful for diagnostics.

### Capture resolved target from exact numeric downloadId

Once `chrome.downloads.download()` returns a valid numeric id, all future filename truth should be attached to that exact id.

Use a bounded exact-id read and/or terminal DownloadItem observation to obtain the current resolved filename. Never infer it from a directory scan.

Because Chrome may finalize filename selection asynchronously, the implementation may update the durable checkpoint when the exact id's target becomes known and must re-read exact id before Journal finalization if necessary.

### Privacy boundary

`DownloadItem.filename` can be an absolute local filesystem path. WebClip does not need to persist or expose the user's full local directory merely to solve this bug.

Normalize to the exact final **basename** for Journal/display/recovery matching unless a separately justified feature requires more. Do not add full local path to export/OperationLog by accident.

### Journal finalization

For a proven completed own-extension DownloadItem:

- Journal `filename` should represent the actual saved basename if available;
- requested filename may remain as separate diagnostic/recovery metadata;
- if exact resolved basename cannot currently be read, do not falsely claim that the requested basename is the physical one. Preserve explicit unknown/resolution-pending state or defer exact-name finalization according to the chosen data model.

### Recovery fallback

Once an intent has ever been bound to numeric downloadId, recovery must prefer exact id and capture its actual basename.

For genuinely unbound unknown-start intents, keep Blob URL as the primary identity and P0-048's fail-closed ambiguity rules. Do not loosen fallback matching merely to guess Chrome's conflict counter.

P1-146 late-success binding should opportunistically enrich the same exact durable intent with the resolved basename when safely available.

## Required deterministic regressions

1. Pre-create a file with the exact requested WebClip name; automatic download uses `uniquify` and Chrome resolves a different basename.
2. After successful completion, Journal records the actual resolved basename, not the stale requested name.
3. Requested filename remains available separately for diagnostics if the model retains it.
4. Two same-page saves inside one filename-timestamp second produce distinct Chrome physical basenames and two truthful Journal entries.
5. Known numeric downloadId + missed terminal event: maintenance exact-id reconciliation learns the same resolved basename and finalizes correctly.
6. Blob URL unavailable + uniquified physical file: do not silently accept an unproven `(N)` candidate through heuristic broadening.
7. Multiple plausible uniquified candidates still fail closed under P0-048 when there is no exact downloadId/Blob identity.
8. Full local filesystem path is not leaked into Journal export/OperationLog when only basename is required.
9. Interrupted download may retain requested/resolved-name diagnostics but does not create a false completed Journal entry.
10. P1-198 operation-id collision tests remain independent: two physical operations cannot corrupt one another's intent before filename resolution.
11. P0-039 unknown-outcome checkpoint is preserved even if resolved filename is still unknown.
12. Normal no-conflict save preserves the same visible filename as today.

## Duplicate check / numbering

`P1-199` is assigned by this audit block.

- Not P0-039: that item decides whether unresolved evidence may be destroyed; P1-199 decides whether the physical target name is truthfully captured and recoverable.
- Not P0-048: that item owns ambiguous candidate matching and no-overwrite downloadId claims; P1-199 should reduce dependence on fallback by recording the exact resolved name from a known id.
- Not P1-146: native-start actual settlement can be perfectly reconciled while the bound metadata still contains the wrong requested filename.
- Not P1-198/P0-079: this bug occurs with perfectly distinct operation/cache identities; normal Chrome conflict resolution alone is sufficient.

`P1-200` remains free after this assignment.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.
