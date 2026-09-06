# P1-090 — source identity acquisition must not manufacture provenance — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/p1-090-exact-yandex-object-reconciliation-2026-09-06`  
Owners: **P1-090 ACTIVE**, adjacent **P0-022 ACTIVE**.

This checkpoint corrects an over-broad legacy-upgrade statement in the initial P1-090 note. Production runtime is unchanged.

## 1. Correction

It is **not universally safe** to take a legacy Journal row with only `remotePath`, perform `GET /resources?path=...`, observe `resource_id=RID-X`, persist RID-X, and then treat RID-X as proven identity for a destructive move.

That is safe only when the path itself already has trusted provenance sufficient to identify the intended source object/operation.

For imported/legacy locator metadata, canonical P0-022 explicitly owns the rule that locator metadata is not destructive object provenance.

Therefore:

```text
untrusted/imported path P
GET P -> RID-X
```

proves only:

```text
RID-X is currently present at P in the admitted account namespace
```

It does **not** prove:

```text
RID-X is the object historically represented by this Journal entry
```

## 2. Fresh source proof

Current import normalization accepts bounded imported Yandex locator fields directly into Journal metadata:

```text
remotePath
publicUrl
resourceId
accountUid
rootPath
```

These fields are normalized/bounded, but imported textual locator metadata is not thereby promoted to destructive provenance.

Current `findYandexFileForJournalEntry()` has a source-path convenience behavior: when neither expected `resourceId` nor expected `publicUrl` exists, `matchesKnownIdentity()` can accept a file located at the stored path because no stronger identity is available.

That can be acceptable for non-destructive observation/display under the right owner, but it is not enough to bootstrap destructive authority for P1-090.

## 3. Required composition

Before P1-090 freezes an `expectedSourceResourceId` for a move receipt, the source object must already be admitted by one of these categories:

1. durable native WebClip provenance that P0-022/P1-184/etc. recognizes as destructive-capable exact object identity;
2. an existing exact resourceId/public identity whose provenance is trusted under the applicable owner;
3. a separately completed user/manual verification flow explicitly designed to establish destructive identity.

Unsafe category:

```text
imported/legacy path only
-> current GET(path)
-> adopt current target as historical source identity
```

P1-090 must fail closed/manual rather than manufacture provenance from current location.

## 4. Trusted native row without stored resourceId

There may be a narrower native historical case where WebClip can independently prove that stored source path belongs to an exact prior operation even though `resourceId` was not persisted due an older schema/API omission.

Only in that proven provenance case may a pre-move GET enrich the move receipt with the currently returned `resource_id` before the destructive request.

The admission proof that permits this enrichment belongs to P0-022/P1-184/other relevant identity owner. P1-090 consumes the result; it does not define path-only trust.

## 5. Imported resourceId/publicUrl are not automatically stronger merely because present

The same provenance warning applies to imported `resourceId` and `publicUrl` text. Import schema validation can establish shape, bounds and URL safety, but not necessarily that the identifier refers to the user's intended live remote object.

P0-022 decides whether imported locator fields can authorize destructive behavior. P1-090 should treat its expected source identity as destructive-capable only after that owner has admitted it.

This keeps the boundaries clean:

- P0-022: **is this locator/identity evidence trusted enough to authorize destructive remote targeting?**
- P1-090: **given a trusted exact source identity, did the destructive move result still refer to that exact same object?**

## 6. Move receipt refinement

The conceptual move receipt should therefore distinguish identity value from provenance authority, for example:

```text
yandexMoveReceipt = {
  version: 1,
  sourcePath,
  targetPath,
  expectedSourceResourceId,
  sourceIdentityProvenanceReceipt: <P0-022/P1-184-owned receipt/reference>,
  movePhase
}
```

The exact representation may differ. The required invariant is that a bare path lookup cannot create the provenance receipt it is supposed to consume.

## 7. Deterministic schedules

### Imported path now points to unrelated B

```text
backup/import row says remotePath=/Upload/x.pdf
historical object A no longer exists
current unrelated B occupies /Upload/x.pdf, RID-B
```

Unsafe implementation:

```text
GET path -> RID-B
freeze RID-B
move B
```

Required:

```text
path-only imported provenance insufficient
-> no destructive admission
```

### Trusted exact native identity A moves to target occupied by B

Once trusted expected identity RID-A exists, P1-090 applies normally:

```text
target RID-B != RID-A -> conflict
```

No amount of path/name/size similarity repairs that conflict.

## 8. Source-bound acceptance additions

Future closure should prove:

1. imported/legacy `remotePath` alone cannot be upgraded into destructive identity merely by GET(path);
2. imported locator fields pass through P0-022 provenance admission before destructive move;
3. P1-090 move receipt distinguishes exact source identity from the provenance authority that admitted it;
4. target verification never treats a newly observed target id as a replacement provenance source;
5. a trusted native exact source identity still supports normal same-object target verification.

## 9. Status

P1-090 remains **ACTIVE**. This refinement narrows legacy identity enrichment and prevents P1-090 from bypassing P0-022 by manufacturing exact-object authority from current path occupancy.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
