# WebClip — Wave 1 publication-control state machine for destructive Journal deletion — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-publication-control-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION PUBLICATION-CONTROL SPECIFICATION**  
Production implementation: **NOT STARTED**.

Primary owners: **P0-069, P1-164**.  
Mandatory composition: **P0-072, P0-073, P0-074, P0-076, P0-078, P1-090, P1-183, P1-198, P1-210**.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

D1 destructive-move research proved:

```text
move verified
!=
Journal deletion fully successful
```

when the original Yandex object still has public-access state.

P0-069 requires an explicit publication outcome before a Journal row carrying a public Yandex link can disappear. P1-164 additionally requires durable/reconciled per-entry public-link revoke semantics.

This tranche defines the safest initial Wave 1 publication profile for:

```text
Delete Journal entry + keep remote file
Delete Journal entry + move remote file to Trash
```

when the remote file is public.

---

# Part I — current production source

## 2. Current code can publish, but has no unpublish flow

Current production uses:

```text
PUT /resources/publish
```

when creating a permanent public link for saved files.

No current production path for:

```text
/resources/unpublish
```

is present in `service-worker.js`.

Current Journal delete therefore has no durable provider-side publication-control effect before local deletion.

---

## 3. Why move-to-Trash is not publication proof

Current Delete→Trash moves the file and then deletes the local Journal record when the move path succeeds.

There is no exact current proof that:

```text
move to Trash
=> public URL/access revoked
```

and no local unpublish request is issued.

Therefore a public object may conceptually become:

```text
remote object moved
+ local control row deleted
+ public-access state unresolved
```

which is exactly the P0-069 failure class.

---

# Part II — external capability boundary

## 4. Yandex supports unpublish as a service capability

Current Yandex Disk user/CLI documentation exposes an `unpublish` operation, and the maintained YaDisk ecosystem maps public-resource revocation to:

```text
PUT https://cloud-api.yandex.net/v1/disk/resources/unpublish?path=...
```

The current provider API/Polygon can be used later for real verification.

This is current source/ecosystem evidence only.

This tranche does **not** claim L5 proof for WebClip's real account of:

- exact response payload;
- repeated unpublish idempotency;
- whether `public_url` disappearance is sufficient for every sharing mode;
- behavior after file move to Trash;
- newer address/ACL sharing semantics.

If provider evidence is weaker than required, WebClip must remain evidence-limited rather than fabricate `private`.

---

# Part III — product-safe baseline

## 5. Public Journal row cannot simply disappear while access remains public

There are conceptually two user intentions:

```text
A. delete Journal/control record AND revoke public access
B. delete Journal/control record BUT intentionally retain public access
```

A is straightforward to make safe with an exact unpublish state machine.

B is not safe merely by recording the decision in terminal P because P is intentionally bounded/GC-able. Long-lived public access would outlive the control authority.

Therefore the recommended initial Wave 1 baseline is:

> For a public Yandex entry, destructive removal of its Journal record requires exact public-link revocation first.

---

## 6. `retain public and delete Journal` is out of the initial trusted path

Until the product has a dedicated long-lived `PublicAccessControl` ledger or another durable authority that survives as long as the public access, Wave 1 should reject:

```text
public file
+ delete Journal row
+ intentionally keep public access
```

Suggested result:

```text
RETAIN_PUBLIC_UNSUPPORTED
```

This is not a claim that such a feature can never exist. It is a boundary preventing silent loss of public-access control.

A later product tranche may explicitly design:

```text
PublicAccessControl
retention/lifecycle
list/revoke UI
import/export semantics
account/root namespace
```

without weakening P0-069.

---

# Part IV — publication effect as independent domain authority

## 7. Unpublish is a separate remote effect

D1 already uses E for destructive move.

A public delete should not overload the move E to mean both:

```text
file moved
AND
public access revoked
```

unless the provider proves both are one atomic operation, which is not established.

Preferred architecture:

```text
E_pub  kind = unpublish
E_move kind = delete-trash   // only when diskAction=trash
```

Both link to the same P/F/C.

For `diskAction=keep`, only E_pub is required before local Journal deletion.

---

## 8. Publication E phases

Use the same generic remote-effect lifecycle:

```text
prepared
started-unknown
verified
canceled-before-start
manual-resolution
local-finalized / terminal-composed state as appropriate
```

But its result semantics are publication-specific:

```text
verified-private
```

must be the provider truth before the Journal row is removed.

---

## 9. Publication source identity

E_pub binds the exact remote object:

```text
resourceId
current path
provider revision where available
account/root/context C
```

The same textual path holding a different resource later cannot satisfy the unpublish receipt.

---

# Part V — required ordering

## 10. Recommended ordering for public Delete→Trash

Safe initial order:

```text
P/F/C admitted
  ↓
E_pub prepared
  ↓
E_pub started-unknown
  ↓
provider unpublish
  ↓
exact private-state reconciliation
  ↓
E_pub verified-private
  ↓
E_move prepared
  ↓
E_move started-unknown
  ↓
provider move
  ↓
exact same-object move verification
  ↓
Journal delete CAS
```

---

## 11. Why unpublish precedes move

This ordering has the better failure envelope.

If unpublish succeeds but move later fails/unknown:

```text
Journal row still exists
remote object is private
move can be reconciled safely
```

If move were performed first and unpublish then became unknown:

```text
file already relocated to Trash
public-access state unresolved
local Journal cannot safely disappear
```

The second state is harder to support and leaves a longer public-control ambiguity.

Therefore Wave 1 should remove public exposure first.

---

## 12. `diskAction=keep`

For a public Yandex entry where the user deletes the Journal row but keeps the remote file:

```text
exact unpublish
-> verify private
-> Journal delete CAS
```

No move E exists.

The remote file remains managed/private but no longer appears in Journal after exact local commit.

---

# Part VI — unpublish effect-start boundary

## 13. Prepared

After exact object/context/user intent is established:

```text
E_pub.phase = prepared
```

No provider mutation has started.

If F is revoked before effect-start:

```text
E_pub -> canceled-before-start
zero provider call
```

---

## 14. Started-unknown before provider call

In one Journal transaction:

```text
recheck P/F/C/object authority
E_pub prepared -> started-unknown
commit
```

Only after commit may:

```text
PUT /resources/unpublish
```

be invoked.

This matches the remote write-ahead rule used for move effects.

---

## 15. Timeout/lost response

A local timeout or rejected outer response leaves:

```text
E_pub = started-unknown
```

No move and no Journal deletion may proceed.

UI:

```text
operationClass = effect-unknown
retryDisposition = reconcile-only
```

Do not blindly repeat unpublish unless real provider behavior later proves a repeated call is safely idempotent for the exact same object and context.

---

# Part VII — publication reconciliation

## 16. Reconciliation is read-only

The common reconcile path may read exact provider metadata/state for the same resource under C.

It must not issue another unpublish.

---

## 17. Exact object continuity

Publication settlement is valid only for the same object E_pub targeted.

Conceptually:

```text
observed.resourceId == E_pub.resourceId
```

If a different object now occupies the path:

```text
OBJECT_IDENTITY_CHANGED
manual/evidence-limited
```

No local delete success.

---

## 18. What counts as private proof

The exact provider fields still require L5 validation.

For the existing WebClip public-link model, candidate evidence includes:

```text
public_url absent
provider unpublish response/metadata indicating private
other public-key/public-settings fields if provider exposes them
```

However modern sharing/address-access semantics may not be fully represented by `public_url` alone.

Therefore production implementation must define a versioned `PublicationStateReceipt` from actual tested provider fields.

If current provider state cannot distinguish private vs unknown:

```text
manual-resolution
```

not:

```text
assume private
```

---

# Part VIII — composition with F revoke and partial outcomes

## 19. F revoked before unpublish start

```text
E_pub prepared -> canceled-before-start
```

No provider effect.

---

## 20. F revoked after unpublish start

```text
E_pub stays started-unknown/verified
```

The provider effect cannot be canceled by local clear/replace.

If unpublish later verifies private:

```text
remote publication effect is real
local delete/move authority remains revoked
```

This can produce a terminal partial outcome.

---

## 21. Private verified but move never admitted due F revoke

For a public Delete→Trash operation:

```text
public access revoked successfully
move did not start
Journal row remains
```

This is not full success and not a failed unpublish.

Appropriate common classification:

```text
settled-partial
retryDisposition determined by exact remaining operation policy
```

The external unpublish must never be reversed automatically merely to make the operation appear atomic.

---

# Part IX — Journal deletion gate

## 22. Public state must be exact before local delete

Before deleting the original Journal row:

```text
if original/publication owner says public control required:
  require E_pub verified-private

if diskAction=trash:
  require E_move verified

require exact JG/ER/F CAS
```

Only then may Journal deletion commit.

---

## 23. Same-id replacement protection

If import/replace creates a new Journal row with the same id after remote effects:

```text
old ER/JG fails
new row untouched
```

Remote effects remain represented by E/P terminal/partial truth.

---

# Part X — retention/control implication

## 24. Why terminal P cannot be the permanent owner of retained public links

Current Wave 1 common receipts intentionally have bounded retention.

A public URL can remain valid longer than that.

Therefore using:

```text
P terminal summary
```

as the only future control record for intentionally retained public access is structurally insufficient.

This is the main reason Wave 1 trusted default should not support `retain-public + delete-journal` without another ledger.

---

## 25. Future PublicAccessControl ledger boundary

If product scope later requires retaining public access after Journal deletion, a dedicated long-lived authority should minimally answer:

```text
which exact account/root/object is still public?
what user decision authorized it?
how can it be listed/revoked later?
what happens on account disconnect/root change/import/export?
what is its retention policy?
```

That is future product/architecture work, not silently part of the current Delete button.

No new P-code is created in this tranche because P0-069 already owns the root cause.

---

# Part XI — current provider/API evidence

## 26. Current evidence level

Current external evidence supports that Yandex provides publish/unpublish functionality and ecosystem clients use:

```text
PUT /v1/disk/resources/unpublish?path=...
```

But WebClip still needs real-provider L5 proof of:

- request fields;
- response/status;
- exact private-state metadata;
- same-object identity continuity;
- repeat-call/idempotency behavior;
- public state after Trash move;
- behavior of newer access modes.

No owner closes from source/ecosystem evidence alone.

---

# Part XII — deterministic model

## 27. Model

Research file:

```text
project_tools/test_wave1_publication_control_model.js
```

Observed local result:

```text
Wave 1 publication control model: PASS cases=29
```

Covered schedules include:

- unpublish prepared has zero provider calls;
- durable started-unknown before provider call;
- verified-private before move;
- unpublish timeout blocks move/local delete;
- no blind repeated unpublish;
- retain-public delete rejected in baseline;
- non-public negative control;
- F revoke after unpublish start cannot cancel provider effect;
- F revoke before start yields zero provider effect;
- different resource identity cannot satisfy unpublish;
- same-id Journal replacement blocked by CAS;
- diskAction keep uses unpublish without move;
- unknown provider public state is not private proof;
- move-alone cannot authorize public Journal deletion.

This is L2 deterministic architecture evidence only.

---

## 28. Production source gate

Research file:

```text
project_tools/test_wave1_publication_control_source.js
```

It is intentionally RED against current production because current source has no unpublish state machine.

---

# Part XIII — future L5 schedule

## 29. Real-account publication tests

On exact implementation commit:

1. create/pick exact WebClip public file;
2. capture resourceId/path/public metadata;
3. call unpublish through exact provider API;
4. capture response/status;
5. re-read same exact object;
6. prove the public access state is private under the provider's tested model;
7. repeat a second unpublish to determine exact idempotency semantics;
8. move a public test object to Trash without unpublishing in a controlled test and observe whether public access remains;
9. restore/cleanup test state;
10. test public object with any address-access/public-settings mode relevant to the account;
11. inject response-loss if feasible and prove read-only reconciliation;
12. verify account/root switch cannot rebind the old publication receipt.

---

# Part XIV — source integration

## 30. New/refined helpers

Conceptual boundaries:

```text
capturePublicationStateReceipt()
prepareUnpublishEffect()
markUnpublishEffectStarted()
executeYandexUnpublishEffect()
reconcileYandexPublicationState()
markUnpublishVerifiedPrivate()
composeDeleteDomainOutcome()
```

The move helpers remain independent.

---

## 31. UI impact later

For a public Journal entry, delete confirmation must disclose that deleting the control record requires revoking public access in the trusted baseline.

The UI must not present a generic "Удалить" and silently decide publication semantics.

If future retain-public support is added, it must be an explicit separately described choice with its own durable control authority.

---

# Part XV — owner/status impact

## 32. No new P-code

The research directly refines:

```text
P0-069 public outcome on Journal delete
P1-164 per-entry durable unpublish
P0-072 effect unknown/recovery
P0-076 Journal CAS
P0-073/P0-074 immutable Yandex context
P1-210 reconciliation/retry authority
```

Therefore:

```text
P1-231 = NOT ALLOCATED
```

---

## 33. Current state

```text
public-entry deletion publication gate       = DEFINED
unpublish-before-move ordering                = DEFINED
unpublish effect state machine                = DEFINED
retain-public baseline boundary               = DEFINED
long-lived control-ledger implication         = IDENTIFIED
publication deterministic model               = PASS 29/29
production unpublish                          = NOT IMPLEMENTED
Yandex publication L5                         = REQUIRED
P0-069 / P1-164                               = ACTIVE
release                                        = NOT READY
```

---

## 34. Project-wide status

Do not re-declare `DEEP-RESEARCH-COVERAGE-COMPLETE` from this work.

PD7 exact current-target receipt + fresh Coverage Reconciliation remain the separate project-wide gate.

---

## 35. Next research boundary

The next high-value research step is no longer another generic receipt primitive. It is an **integrated D1 terminal-composition matrix** covering all destructive delete variants:

```text
local-only entry delete
Yandex delete keep-file non-public
Yandex delete keep-file public + unpublish
Yandex delete Trash non-public
Yandex delete Trash public + unpublish + move
Mark Read
```

For each variant, define the exact required P/F/E set, terminalOutcome, retryDisposition, restart schedules and UI actions. This should become the implementation checklist that prevents one path from bypassing the newly defined publication/move authority.
