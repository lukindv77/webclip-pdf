# P1-090 — exact Yandex object identity for destructive move/reconciliation — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-090-exact-yandex-object-reconciliation-2026-09-06`  
Owner: **P1-090 ACTIVE**.

This is a research/model checkpoint. Production runtime and manifest are unchanged.

## 1. Canonical owner

Current Registry defines P1-090 as:

> Destructive Yandex move/reconciliation must prove the same exact remote object after unknown settlement; path/type/size or newly observed target id cannot substitute for source identity.

P1-090 therefore owns the **same-object proof** across a destructive path mutation.

Adjacent owners remain separate:

- **P0-073** — immutable account/root namespace for the operation;
- **P0-074** — one immutable live auth/account/root/config context for remote calls;
- **P1-183** — durable source/target/object checkpoint before Delete→Trash destructive move;
- **P1-184** — exact object/content creation receipt for unknown upload/reuse/recovery;
- **P0-069/P1-164** — publication outcome/revocation semantics;
- **P0-076** — Journal entry revision/CAS against concurrent local replacement;
- **P1-198** — trusted live operation identity/generation.

P1-090 does not invent a second account scope, operation id or Journal revision mechanism.

## 2. Fresh source positive control: locator already prefers durable identity

`findYandexFileForJournalEntry()` reads:

```text
entry.resourceId
entry.publicUrl
entry.accountUid
entry.rootPath
entry.remotePath
```

Its `matchesKnownIdentity()` has an important positive property:

- if expected `resourceId` exists and fetched `resource_id` exists, they must match;
- a conflicting fetched `resource_id` is rejected;
- if no stable resourceId is available, exact stored `publicUrl` can be used as a legacy secondary identity;
- if neither resourceId nor publicUrl exists, broad fallback search is refused.

This shows the runtime already recognizes that path alone is not identity.

## 3. Adjacent P0-073 correction discovered during source review

The same locator currently also rejects when:

```text
expectedRootPath != current configured rootPath
```

P0-073 research has already established that a same-account user root-setting change must not invalidate an old operation's stored root/path. This root-config equality is therefore an adjacent P0-073/P0-074 issue, not a new P1-090 owner.

P1-090 uses the operation-owned stored source/target namespace once P0-073/P0-074 admit the correct account/context.

## 4. Fresh source defect: Trash move verifies target by type, not same object

Current Trash move flow:

```text
POST /resources/move from=sourcePath path=targetPath overwrite=false
```

then polls:

```text
GET /resources path=targetPath fields=name,path,type,size,public_url,resource_id
```

but the success condition is only:

```text
if (moved?.type === 'file') break
```

and final success requires only `moved?.type === 'file'`.

The returned `moved.resource_id` is then persisted/returned, which means a **newly observed target id** may become the Journal result even though it was never proven equal to the source object identity.

That is exactly the P1-090 root cause.

## 5. Fresh source defect: ReadmeLater→Upload has the same target-proof problem

The mark-read/move flow similarly issues `/resources/move`, polls target metadata and accepts a file at the target path.

The pre-move local checkpoint is a useful P1-183-style positive control:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
```

but the patch does not independently freeze an exact source-object identity receipt for the move attempt. The Journal entry may already carry `resourceId`, but the destructive attempt needs to preserve the **pre-move expected identity** as immutable operation evidence and compare the target to it.

A path checkpoint plus later target metadata is not same-object proof.

## 6. Deterministic false-success schedule

```text
source path S contains object A, resourceId=RID-A
target path T chosen for A
move request outcome becomes unknown
before/while verification, T contains file B, resourceId=RID-B
```

Current target verification can observe:

```text
type=file
path=T
```

and accept B.

Even if B has the same name and size, it is not A.

Required result:

```text
expected RID-A
observed RID-B
-> identity-conflict
-> do not finalize Journal as moved
-> do not replace durable A identity with RID-B
```

## 7. Newly observed target id cannot bootstrap identity

Legacy/weak schedule:

```text
Journal has path S but no durable resourceId/publicUrl
move outcome unknown
GET target T returns RID-X
```

RID-X was observed **after** the destructive action. It cannot prove that RID-X is the object that previously occupied S.

Therefore this is unsafe:

```text
source expected id absent
-> target has some id
-> adopt target id as proof of successful move
```

The source identity must be established before the move.

## 8. Safe legacy upgrade: prove source identity before mutation

A legacy entry without durable resourceId can still become safely movable if the pre-move source object is authoritatively located in the correct P0-073/P0-074 namespace.

Before starting destructive mutation:

```text
GET source S
-> file metadata with resource_id RID-A
-> durably checkpoint expectedSourceResourceId=RID-A
-> only then admit move
```

If provider metadata cannot supply a usable stable identity, automatic destructive move should fail closed/manual rather than rely on path/type/size.

An exact durable publicUrl may remain a legacy secondary identity where the provider omits resource_id and no conflicting id exists, but the strongest implementation path is to freeze the source `resource_id` before mutation whenever available.

## 9. Recommended move identity receipt

Conceptually, composed with P1-183:

```text
yandexMoveReceipt = {
  version: 1,
  sourcePath: S,
  targetPath: T,
  expectedSourceResourceId: RID-A,
  expectedSourcePublicUrl: <optional legacy secondary>,
  expectedAccountRootScope: <P0-073-owned reference/value>,
  movePhase: prepared | mutation-unknown | verified-same-object | conflict | manual
}
```

Do not persist OAuth token in this receipt.

The exact operation/generation identity belongs to P1-198; the Journal entry revision/CAS belongs to P0-076.

## 10. Target verification rule

If `expectedSourceResourceId` is nonempty:

```text
target resource_id == expectedSourceResourceId
-> same-object identity candidate

target resource_id differs
-> conflict

target resource_id missing
-> not enough proof for automatic destructive finalization
```

Do not silently replace a known expected id with a target id.

If only exact pre-move publicUrl is available as legacy identity:

```text
target has conflicting nonempty resource_id against any known source id -> reject
target public_url == exact pre-move publicUrl -> legacy same-object candidate
otherwise -> manual/indeterminate
```

Path/type/size can be consistency checks but never the identity root.

## 11. Unknown move reconciliation matrix

After a durable prepared receipt and unknown remote settlement, recovery should inspect **both exact source and target** where safe.

### Target contains RID-A

```text
T -> RID-A
-> move succeeded / same object located at target
-> may finalize exact move receipt
```

### Target contains RID-B

```text
T -> RID-B != RID-A
-> target collision/conflict
-> never finalize B as A
```

Then source lookup matters:

- S still contains RID-A -> A remains at source; new target/retry requires a deliberate new move attempt under current ownership and collision policy;
- S absent or contains another object -> A location/outcome is indeterminate; do not overwrite/delete B and do not fabricate completion.

### Target absent, source still RID-A

This is evidence that A is still at source at observation time. If the prior mutation outcome is otherwise reconciled as not committed and a retry is permitted, a new attempt may be admitted. A single immediate 404 after an unknown request should respect provider consistency/settlement semantics; do not infer too aggressively.

### Target absent, source absent

Indeterminate. No automatic success and no blind second move.

### Both source and target appear to contain RID-A

Treat as provider/eventual-consistency ambiguity unless provider semantics prove otherwise. Do not use duplicate observation as a reason for another destructive mutation.

## 12. Target path collision before move

`overwrite=false` is a useful positive control: the move request should not intentionally replace an existing target object.

But collision handling must remain identity-aware.

If target T is occupied by B before mutation, choose a different target only **before** the destructive move is admitted and durably bind that new target to the same expected source A receipt.

After an unknown move outcome, discovering B at T is not permission to silently choose T2 and issue another move without first reconciling A.

## 13. Do not update Journal identity from an unproven target

Current code can use `moved.resource_id` when writing resulting entry metadata.

Required rule:

```text
Journal resourceId after move
=
pre-move expected exact source resourceId
```

or an independently proven equivalent exact identity.

The target response may confirm the same value; it must not introduce a different value as if it were a successful continuation of A.

Similarly, target `public_url` is factual metadata only after the target has first passed same-object identity proof.

## 14. Source path itself can change only after proof

Once target T is verified as the same exact object A, Journal `remotePath` may advance S -> T.

Before that proof:

- keep original source identity evidence;
- keep prepared target path separately;
- do not overwrite source locator with target path merely because a file exists there.

This prevents a failed/unknown move from permanently retargeting the Journal entry to B.

## 15. Relation to P1-184

P1-184 covers unknown upload/reuse/recovery where WebClip must prove the exact object/content it created or adopted.

P1-090 covers an already identified object moving through destructive namespace changes.

They share a principle — path/size are not object identity — but the receipts differ:

- upload: prove created/adopted remote object/content;
- move: carry pre-move exact object identity across source -> target.

P1-090 must not claim to close P1-184.

## 16. Relation to P0-073/P0-074

Before any source/target GET or move:

- P0-073 supplies immutable account/root namespace evidence;
- P0-074 supplies one immutable live auth/account context for the operation/recovery item.

P1-090 comparisons are meaningful only inside that admitted namespace.

A cross-account same `resource_id`/path observation must not be treated as a valid move proof without the account scope.

## 17. Implementation acceptance cases

Minimum future deterministic/source gate:

1. known source RID-A -> target RID-A after unknown move -> same-object verification succeeds;
2. known source RID-A -> target RID-B -> conflict; Journal never adopts RID-B;
3. target B has same name/type/size as A -> still conflict;
4. legacy source without id -> pre-move GET source RID-A -> durable receipt freezes RID-A before move;
5. legacy source without provable id/public identity -> destructive move fails closed/manual;
6. unknown move + target B + source A -> do not finalize and do not overwrite B;
7. unknown move + target absent + source A -> no blind success; retry only after authoritative settlement/collision policy;
8. unknown move + source absent + target absent -> manual/indeterminate;
9. Journal `remotePath` advances only after target passes same-object proof;
10. Journal `resourceId` cannot change from expected RID-A to observed RID-B during move finalization;
11. mark-read durable checkpoint carries/freezes exact source identity, not only paths;
12. Trash destructive move composes with P1-183 durable receipt before remote mutation;
13. P0-073 account/root scope and P0-074 live context are checked before remote identity comparison;
14. current configured root change in same account does not itself invalidate stored old-root operation authority (P0-073 boundary).

## 18. Status

P1-090 remains **ACTIVE**. Current source has strong locator identity checks but destructive target verification still accepts `type=file` without proving target `resource_id` equals the pre-move source identity.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
