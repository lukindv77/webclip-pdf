# P0-076 — committed-source RED gate for Journal mutation authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 9bb30bd02d9f31d9514d156a4264d5bf90398418`  
Source-gate commit: `b5bc7fc82e5fb2bd8b48e0429a7d568bfd53db38`  
Owner: **P0-076 ACTIVE**.

This checkpoint adds an intentionally RED committed-source gate for the current P0-076 runtime gap. It changes no production runtime.

## 1. Why a source-bound gate is needed

The deterministic architecture models now prove the desired CAS semantics, but model PASS is not evidence that current `service-worker.js` or `journal.js` implements them.

Current source still has four directly observable gaps:

1. Journal export serializes a raw spread of the persisted entry, so a future local authority field would become portable unless export is explicitly hardened.
2. Journal mutation messages are id-only and carry no exact rendered mutation authority.
3. Journal direct IndexedDB view queries observe `entries` without `meta`, so legacy entry + global revision authority cannot be guaranteed to come from one snapshot.
4. Point update/delete paths remain blind id-based mutations rather than exact CAS.

The source gate is intended to stay RED until the actual runtime is changed.

## 2. Added gate

Added:

`project_tools/test_p0_076_source_contract.js`

The test follows the existing committed-source pattern used by P0-072: Node reads actual repository source files through `fs.readFileSync` and asserts semantic source contracts plus removal of known unsafe forms.

The test itself was syntax-checked locally with:

```text
node --check project_tools/test_p0_076_source_contract.js
```

using a scratch copy before the durable write.

## 3. Persisted authority markers

The gate requires actual worker source to contain:

```text
journalMutationGeneration:v1
journalLocalRevision
```

This binds later GREEN evidence to the selected local Journal generation + per-entry incarnation/revision architecture instead of allowing an unrelated test-only helper to satisfy the model.

## 4. Portable export boundary

The gate requires an explicit worker serializer:

```text
makePortableJournalEntry(...)
```

and rejects the current raw export shape equivalent to:

```text
JSON.stringify({ ...entry, journalComments: ... })
```

The exact function name is now part of the P0-076 implementation contract because the portability boundary should be explicit and reviewable, not an incidental omission list buried in export code.

`journalLocalRevision` and future local-only authority fields are never portable backup authority.

## 5. Rendered authority snapshot

The gate requires `journal.js` to carry an ephemeral field named:

```text
journalMutationAuthority
```

and requires at least one direct readonly authority snapshot using:

```text
[ JOURNAL_STORE, JOURNAL_META_STORE ]
```

in the same IndexedDB transaction.

This makes the legacy bridge source-auditable and prevents the mixed old-entry/new-meta-revision split-read race already demonstrated by the P0-076 snapshot model.

## 6. Mutation message propagation

The gate checks the current user mutation command families:

- `WEBCLIP_JOURNAL_UPDATE_COMMENT`;
- `WEBCLIP_JOURNAL_ADD_COMMENT`;
- `WEBCLIP_JOURNAL_EDIT_COMMENT`;
- `WEBCLIP_JOURNAL_DELETE_COMMENT`;
- `WEBCLIP_JOURNAL_DELETE`;
- `WEBCLIP_JOURNAL_MARK_READ`.

For each source location, the message construction must propagate `journalMutationAuthority` rather than only textual id.

After a successful point mutation, the worker returns the next authority and UI installs it. The gate therefore also requires a `result.journalMutationAuthority` update path.

This prevents a successful first comment mutation from leaving the open card with its now-stale pre-mutation token.

## 7. Blind mutation forms explicitly rejected

The source gate rejects the current exact blind merge:

```text
{ ...current, ...patch, id: current.id }
```

inside point update authority and rejects the current `deleteJournalEntryRecordOnly()` shape when it performs a later `entries.delete(id)` after an earlier separate read.

The eventual implementation may organize CAS helpers differently; the gate does not require one exact helper name. It requires the known unsafe source shapes to disappear.

## 8. Machine outcome taxonomy

The gate reserves stable machine-readable stale outcomes in worker source:

```text
stale-journal-generation
stale-entry-generation
stale-entry-revision
stale-legacy-revision
```

Together with the implementation contract, point mutation outcomes are:

```text
committed
missing
invalid-authority
stale-journal-generation
stale-entry-generation
stale-entry-revision
stale-legacy-revision
```

A stale outcome means no mutation committed. UI should reload/reconcile; it is never implicit permission to retry a non-cancellable external side effect.

## 9. Current expected result

Against current runtime the gate is intentionally RED immediately because, among other missing contracts, `journalMutationGeneration:v1` and `journalLocalRevision` do not yet exist in production source.

Therefore this file is **acceptance evidence**, not runtime PASS.

## 10. Status

P0-076 remains **ACTIVE**. Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
