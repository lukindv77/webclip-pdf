# P0-069 — explicit public-link outcome before Journal deletion — 2026-09-06

Date: 2026-09-06  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Branch: `research/p0-069-public-link-delete-outcome-2026-09-06`  
Owner: **P0-069 ACTIVE**  
Runtime/manifest/release state: unchanged.

## 1. Canonical owner

Registry:

> Deleting a Journal entry with a public Yandex link requires explicit publication outcome; local deletion cannot silently strand public access/control.

This checkpoint defines the P0-069 lifecycle boundary. It does not implement Yandex unpublish, Trash reconciliation, Journal CAS, or close the owner.

## 2. Current source defect

Current `deleteJournalEntry()` reads the Journal entry and computes:

```js
const isYandex = entry.destination === 'yandex';
const action = String(diskAction || 'keep');
```

For Yandex rows only two values are accepted:

```text
keep
trash
```

The operation log already records:

```js
hasPublicUrl: Boolean(entry.publicUrl)
```

but that fact does not influence delete admission.

The flow is currently:

```text
if trash -> moveJournalYandexFileToTrash(...)
-> deleteJournalEntryRecordOnly(id)
```

For `keep`, the remote file is untouched and the local Journal row is immediately deleted.

Fresh source search finds no `unpublish` implementation in `service-worker.js`.

Therefore a known public URL is currently descriptive metadata only, not a deletion barrier.

## 3. Current UI also conflates file disposition with publication state

The Journal delete dialog asks:

```text
Оставить файл на Яндекс Диске
Так же удалить файл на Яндекс Диске
```

The first choice says only that the local Journal entry will be removed. The second says the file is moved to WebClip Trash.

Neither choice states what happens to an already public link.

The UI also exposes after a failed Trash attempt:

```text
Удалить только запись журнала
```

which invokes the ordinary `keep` path. For a known-public entry this fallback can discard WebClip's local publication-control metadata immediately after a failed remote mutation.

This is a direct P0-069 acceptance gap.

## 4. Yandex publication is a separate state

Current Yandex documentation distinguishes public/shared access from file existence/location. Users can remove a public link / restrict access; after access is revoked, the old link no longer works, and if the resource is shared again later the link is different.

Current references:

- https://yandex.ru/support/yandex-360/customers/disk/web/ru/share/sharing
- https://yandex.ru/support/yandex-360/business/disk/web/ru/share/personal-and-public-access
- https://yandex.ru/support/yandex-360/customers/disk/desktop/linux/ru/cli-commands
- https://yandex.ru/dev/disk/rest/

Architecture consequence:

```text
file disposition
!=
publication outcome
```

Moving, retaining, or locally forgetting a file cannot by itself be treated as proof that public access was revoked.

## 5. Two independent user decisions

For a Yandex Journal row the delete model has two axes.

### Axis A — file disposition

```text
keep-file
trash-file
```

### Axis B — publication disposition when public access is known/potentially live

```text
revoke-public-access
keep-public-and-relinquish-WebClip-control
```

Current `diskAction=keep|trash` represents only Axis A and is therefore insufficient for known-public entries.

## 6. Selected single-entry outcomes

### 6.1 Non-Yandex row

Publication is not applicable; ordinary exact-entry delete may proceed under P0-076.

### 6.2 Yandex row not known public

P0-069 does not fabricate public state. Normal keep/trash semantics continue subject to other Yandex identity/recovery owners.

A future fresh remote metadata check may discover publication and then must upgrade the flow to the known-public branch rather than silently ignore it.

### 6.3 Known-public + keep file + revoke

Required order:

```text
exact Journal authority
-> explicit user revoke choice
-> P1-164 durable/reconciled unpublish
-> outcome = revoked | already-private
-> exact Journal authority/current publication state check
-> delete Journal row
```

Unknown/failed unpublish means the Journal row is retained. The UI must say public-access outcome is unresolved; no local success is fabricated.

### 6.4 Known-public + keep file + explicitly keep public

This is an intentional control relinquishment, not an ordinary `keep`.

It is permitted only with explicit disclosure equivalent to:

```text
The existing public link may remain accessible after this Journal entry is deleted.
WebClip will no longer retain this entry as a control point for revoking that link.
Manage/revoke the link directly in Yandex Disk if needed.
```

Requirements:

- separate explicit choice/confirmation; ordinary file-keep radio is insufficient;
- exact P0-076 entry authority at final delete;
- operation result records `publicationOutcome = explicit-control-relinquishment`;
- no claim that access was revoked;
- no hidden unpublish.

This composes with P1-180, whose bulk owner likewise requires disclosure of loss of control and forbids hidden mass unpublish.

### 6.5 Known-public + Trash

Selected safe first contract:

```text
revoke public access first
-> require known revoked/already-private outcome
-> then perform Trash move
-> require its own factual settlement/reconciliation
-> only then delete Journal row
```

`keep-public + trash` is not admitted in the first contract. Moving a public resource introduces another remote effect, and WebClip must not guess whether the old public link remains valid after that move.

If product requirements later demand public-in-Trash behavior, it needs an explicit post-move publication verification contract; P0-069 does not infer it.

## 7. Unknown outcomes are first-class

For unpublish:

```text
revoked
already-private
unknown
failed
```

Only `revoked` or `already-private` authorize the revoke branch to advance toward local deletion.

For Trash move:

```text
moved
unknown
failed
```

Only known factual settlement may authorize final Journal deletion.

An unknown external effect is not cancellation and not success.

This is consistent with the project's broader recovery architecture.

## 8. P1-164 is the unpublish owner

Canonical Registry already assigns:

> P1-164 — Per-entry Yandex public-link revoke requires explicit confirmation, durable/reconciled unpublish and truthful resulting identity/path semantics.

Therefore P0-069 must **not** invent a second unpublish state machine.

Composition:

```text
P0-069
  decides whether Journal deletion is admissible given publication outcome

P1-164
  owns durable/reconciled remote unpublish and its truthful outcome
```

If P1-164 returns unknown/manual state, P0-069 blocks Journal deletion on the revoke branch.

## 9. P1-180 boundary

P1-180 owns bulk local destructive operations and disclosure of loss of control over existing public links.

P0-069 is the exact single-entry delete counterpart.

A bulk clear/import replacement cannot call the per-entry unpublish path silently. It must follow P1-180/P0-072/P0-076 bulk semantics instead.

## 10. Trash and object-identity boundaries

P0-069 does not close:

- **P1-183** — durable exact pre-move Delete→Trash checkpoint;
- **P1-090** — exact remote object reconciliation after unknown move;
- **P0-073** — immutable account/root scope;
- **P0-074** — immutable live auth/account/config context.

P0-069 only says that known-public access must have an explicit settled/acknowledged publication outcome before the local control row disappears.

## 11. P0-078 boundary

P0-078 governs `createPublicLinks` as a generation/revocation policy for not-yet-started publication authority.

P0-069 concerns an entry whose public access already exists or is conservatively treated as potentially live at deletion time.

Disabling future publication does not revoke an existing public link and cannot substitute for P0-069/P1-164.

## 12. P0-076 entry CAS is required at final delete

The publication operation may take time. During it the Journal row can be edited, cleared, replaced, imported, or reincarnated under the same textual id.

Therefore final deletion must not use key-only `deleteJournalEntryRecordOnly(id)`.

It must consume exact current P0-076 authority / trusted external-effect continuation receipt so a completed unpublish for old incarnation A cannot delete replacement row B.

## 13. Publication state representation

P0-069 does not require a schema by itself, but deletion logic needs a bounded machine-visible state rather than `Boolean(publicUrl)` alone.

Conceptual projection:

```js
publicationState: {
  version: 1,
  status: 'public' | 'private' | 'unknown',
  publicUrl: '...',
  observedAt: 0,
  // exact object/account receipts owned by P1-164/P0-073/P0-074/P1-090
}
```

Rules:

- known nonempty stored `publicUrl` is conservative evidence that the entry must enter the public-delete branch until stronger current evidence proves private;
- stale/legacy metadata is never silently rewritten to private merely because a URL check fails locally;
- remote verification uses existing exact identity/context owners;
- no signed transport URL/token is persisted.

## 14. UI acceptance contract

For a known-public entry the UI must visibly separate publication from file disposition.

Minimum user-understandable choices:

```text
A. Close public access, keep file on Yandex Disk, then delete Journal entry.
B. Keep public link active, delete Journal entry, and stop WebClip tracking/control of this link.
C. Close public access, move file to WebClip Trash, then delete Journal entry.
```

No option is preselected.

The ordinary `Удалить только запись журнала` fallback after remote error cannot bypass the publication decision. For a public entry it must either:

- return to the explicit keep-public control-relinquishment confirmation; or
- retain the row.

## 15. Operation result truth

Successful deletion returns an explicit publication field, for example:

```text
not-applicable
not-known-public
revoked
already-private
explicit-control-relinquishment
```

It must never return generic success for a known-public row without one of the explicit public outcomes.

OperationLog may record safe publication outcome/status, but must not persist secret auth material or signed transport capability URLs.

## 16. Failure and restart semantics

If unpublish or Trash becomes unknown across timeout/worker restart:

- durable owner receipt survives;
- Journal row/control record survives;
- recovery reconciles the remote effect under its owning P-code;
- final local deletion happens only after the exact continuation authority is valid;
- no second blind unpublish/move is issued solely because the caller timed out.

## 17. Deterministic model

Added:

`project_tools/test_p0_069_public_link_delete_outcome_model.js`

It covers:

- known-public delete blocked without publication choice;
- revoke-first contract;
- explicit keep-public control relinquishment;
- rejection of keep-public+Trash in first contract;
- unknown/failed unpublish blocks deletion;
- revoked/already-private permits continuation;
- Trash must settle after revoke before final delete;
- stale Journal authority blocks deletion after remote settlement.

Model PASS is architecture evidence only, not runtime closure.

## 18. Source-bound RED gate requirements

Runtime is not P0-069-compliant until source proves at least:

- known public state changes delete admission;
- publication choice is distinct from file disposition;
- no known-public row can take ordinary `keep` without explicit control-relinquishment acknowledgement;
- Trash for a known-public row cannot start under a keep-public assumption;
- revoke branch delegates to durable P1-164-style unpublish/reconciliation before final delete;
- unknown revoke/move preserves local row/control authority;
- final Journal delete is exact P0-076 authority/receipt bound;
- after-error `delete only Journal row` cannot bypass public outcome;
- result/log/UI expose truthful publication outcome.

## 19. Required direct verification before closure

P0-069 cannot close from model/source inspection alone.

Required controlled Yandex E2E cases include:

1. public file -> revoke -> old public link no longer grants access -> Journal delete;
2. already-private remote object with stale stored public metadata -> reconcile private -> delete;
3. revoke failure/timeout -> Journal row retained, no success;
4. revoke success + Trash failure/unknown -> Journal/control state retained truthfully;
5. explicit keep-public path -> old link still intentionally usable and UI/operation result clearly states WebClip control was relinquished;
6. same-id Journal replacement during remote operation -> old settlement cannot delete replacement;
7. restart between remote settlement and local finalization -> exact receipt resumes without duplicate destructive effect.

Real-account testing must use dedicated fixtures and must not infer success from path disappearance alone.

## 20. Status

P0-069 is architecture-saturated for the first single-entry delete/publication contract, but remains **ACTIVE**.

No production runtime, manifest, Registry, release readiness, build, tag, or GitHub Release is changed by this research checkpoint.
