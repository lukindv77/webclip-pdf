# WebClip — D0/D1/D2 reconciliation after J0 v8 migration research — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent D research branch: `research/wave1-journal-finalization-source-spec-2026-09-09`  
J0 research source: `research/wave1-journal-v8-migration-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY CHANGE IMPACT ADDENDUM**

No production or Registry change is made here.

---

## 1. Change Impact result

J0 materially refines D0 implementation details but does not replace the D authority model.

The following D conclusions remain unchanged:

```text
JR = whole-Journal mutation/snapshot revision
JG = whole-dataset generation
ER = per-entry exact mutation revision
F  = early Journal finalization intent
E  = independent exact destructive remote effect
```

J0 adds the concrete storage/migration boundary:

```text
WebClipJournal v8
  + journalFinalizations
  + pendingRemoteMutations
  + datasetGeneration meta
  + authorityMode meta
```

---

## 2. D0 activation now has an explicit prerequisite

D0 must not become authoritative merely because DB version is 8.

J0 seeds:

```text
authorityMode = passive-v8
```

D0 activation later transitions to:

```text
authorityMode = cas-v1
```

only after all mutation writers required by the D contract are compatible.

Therefore:

```text
DB v8
!= P0-076 closure
```

and:

```text
cas-v1
```

must be treated as a functional compatibility boundary by older/manual-downgraded packages.

---

## 3. Legacy ER refinement

The original D source specification allowed a literal legacy ER sentinel for rows without persisted `entryRevision`.

J0 refines this to a stronger transition receipt.

For a legacy row, one readonly transaction spanning `entries + meta` captures:

```text
journalEntryId
JG
row with no persisted ER
JR
```

and returns conceptually:

```js
{
  journalEntryId,
  journalDatasetGenerationId: JG,
  entryRevision: 'legacy-v7',
  legacyJournalRevision: JR
}
```

A legacy CAS requires:

```text
current JG == expected JG
row still exists
row still lacks real ER
current JR == captured legacy JR
```

The first successful mutation writes a real random ER.

This avoids a full Journal backfill while preventing an intervening legacy writer from being invisible merely because both old/new rows have no ER.

---

## 4. Consequence of conservative legacy JR fence

For a legacy row only, an unrelated Journal mutation may make a long operation's local finalization stale because JR changed.

This is intentionally conservative.

It is temporary:

```text
legacy row -> first CAS -> real ER
```

After real ER exists, unrelated JR changes no longer invalidate entry authority.

If the external effect has already completed when a legacy finalization becomes stale, the outcome is reconciled as the already-defined terminal partial/suppressed state; the remote effect must not be repeated.

---

## 5. F storage representation

D's semantic `JournalFinalizationIntent` remains the same.

J0 recommends indexable persisted fields:

```text
urlKey
siteKey
state
```

at the top level, even if the API exposes them under a semantic `scope` object.

This permits bounded scoped revocation through compound indexes rather than a full F-store scan.

---

## 6. E storage representation

D's destructive effect record remains independent from the Journal entry.

J0 assigns it the new v8 store:

```text
pendingRemoteMutations
```

Legacy embedded `readMove*` fields are not converted to E.

Legacy `pendingRemoteSaves` rows are also not copied into E.

Therefore D1 exact-v2 destructive recovery starts only for new exact-v2 operations after its activation point.

---

## 7. Clear/import activation rule

J0 alone leaves current clear/import behavior untouched.

D0/D2 activation is the stage that changes semantics to:

```text
scoped clear:
  revoke matching F
  mutate matching current Journal rows
  preserve started/unknown external effect ownership

clear-all/import-replace:
  rotate JG
  revoke open F
  preserve/reconcile started/unknown external effect ownership
```

No J0 migration may be described as solving this before D is activated.

---

## 8. Updated D source gate additions

Future D implementation evidence should now also require:

1. DB v8 schema-ready prerequisite;
2. recognized authority mode;
3. D0 activation from `passive-v8` to `cas-v1` is explicit;
4. legacy row CAS uses captured JR bridge until real ER exists;
5. no eager ER backfill is required;
6. F is stored in `journalFinalizations`;
7. destructive E is stored in `pendingRemoteMutations`;
8. legacy `readMove*` and legacy remote-save rows are not upgraded into exact-v2 provenance.

---

## 9. Owner impact

No new owner is needed.

```text
P0-072 = ACTIVE
P0-076 = ACTIVE
P1-090 = ACTIVE
P1-183 = ACTIVE
P2-019 = BACKLOG
P1-231 = NOT ALLOCATED
```

J0 is migration architecture in support of existing owners.

---

## 10. Current D status after J0 reconciliation

```text
D0 authority model                     = UNCHANGED / REFINED
D1 destructive effect model            = UNCHANGED / STORAGE ASSIGNED
D2 finalization model                  = UNCHANGED
legacy ER transition                   = STRENGTHENED WITH JR BRIDGE
v8 schema prerequisite                 = DEFINED
passive -> cas activation boundary     = DEFINED
production implementation              = NOT STARTED
```
