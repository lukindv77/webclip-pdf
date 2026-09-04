# P0-072 / P0-076 owner boundary — reset detachment must not invent a Journal generation — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ c11b264ad154945aa401171ddacee4431226df66`  
Deterministic model commit: `e3b095d8fffbba3fe52915f66a6ee3e85e39d265`  
Current owners: **P0-072 ACTIVE**, **P0-076 ACTIVE**.

This is a research/architecture checkpoint. Runtime, manifest, Registry status, release readiness and external Yandex state are unchanged.

## 1. Fresh dependency finding

The current P0-072 meta-receipt model uses an abstract `journalGeneration` / `entry.generation` value to demonstrate that a verified move only updates the exact original Journal generation.

Fresh current data-model inspection shows that production Journal entries do **not** currently persist a per-entry `generation` or `revision` field. The canonical Journal entry schema contains `id`, timestamps, destination/path/resource/account/root/url/site/title/selection fields and later recovery projections, but no exact per-entry generation token.

The current Registry explicitly assigns that missing capability to **P0-076 ACTIVE**:

> Journal single-entry mutations require per-entry revision + Journal-generation CAS against clear/replace/import; late stale writes cannot mutate replacement records.

Therefore P0-072 must not accidentally claim that this generation authority already exists merely because an architecture model can name a synthetic `generation` field.

## 2. Exact owner separation

### P0-072 owns the reset-detached path

Once clear/import has atomically attached a durable reset disposition to an admitted receipt, late factual settlement has enough information to make one unconditional safe decision:

```text
resetDisposition present => never mutate/recreate Journal from that old effect
```

This does **not** require a persisted per-entry generation field. The reset disposition itself is the proof that old Journal-finalization authority was detached.

A same-id replacement entry may exist after import. P0-072 still rejects Journal mutation because the receipt is reset-detached before considering the current entry.

This is sufficient for the direct P0-072 root cause: bulk reset must preserve physical truth without resurrecting old Journal state.

### P0-076 owns ordinary non-reset same-entry CAS

If no reset disposition exists, `journalEntryId` equality is not enough to prove that the current Journal row is the exact generation against which the external operation was admitted.

P0-072 should **not** weaken that problem into path/resource/title comparisons or another heuristic fingerprint and should not silently declare it solved.

The normal non-reset finalization path therefore remains dependent on P0-076's exact per-entry revision / Journal-generation CAS.

## 3. Portable `readMove*` projection is not a generation token

The earlier provenance correction remains important here.

Journal import can preserve `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId` and related fields. Those fields are portable projection/diagnostic data, not local physical-operation capability and not a per-entry generation token.

They cannot substitute for:

- worker-issued external-effect receipt identity;
- reset detachment authority;
- P0-076 per-entry revision / Journal-generation CAS.

No implementation should infer `same generation` merely because imported/current `readMove*` values happen to match a receipt.

## 4. Correction to the meta-receipt architecture model

`project_tools/test_p0_072_meta_receipt_linearization_model.js` remains useful as an abstract architecture model, but its synthetic `entry.generation` should be interpreted only as the **future/required P0-076 generation authority**, not as a claim about current runtime data.

P0-072 implementation acceptance should be expressed without depending on that synthetic field for reset-detached settlement:

1. matching reset transaction marks admitted receipt detached;
2. later settlement re-reads the receipt;
3. if reset disposition is present, it updates factual receipt state only;
4. it does not read a current same-id row as authorization to patch Journal;
5. this remains true even if import created a same-id replacement entry.

For an ordinary non-detached receipt, Journal finalization must use whatever exact CAS contract P0-076 ultimately supplies. Until then, P0-072 evidence must not label that independent path closed.

## 5. Deterministic owner-boundary model

New model:

`project_tools/test_p0_072_p0_076_owner_boundary_model.js`

Local Node result before GitHub write:

```text
P0-072/P0-076 owner boundary model: PASS
```

The model proves three narrow claims:

1. reset-detached settlement cannot patch a same-id replacement row even without any synthetic entry-generation field;
2. a non-reset same-id row remains `requires-p0-076-cas` rather than being guessed safe by P0-072;
3. portable `readMove*` projection contains neither a real `generation` nor `revision` capability.

This is an L2 architecture/owner-boundary proof, not runtime closure.

## 6. Implementation consequence for ReadLater receipt admission

The namespaced `meta` receipt may still record a field such as `expectedJournalRevision` / future `entryRevision`, but the implementation must distinguish two cases:

- **available authoritative token** — copied from a real worker-owned/current P0-076 generation mechanism and verified transactionally;
- **not yet available** — do not manufacture a value from `id`, timestamps, paths, `readMove*`, title or other mutable/importable metadata.

For the direct reset race, receipt creation + admission/reset linearization through `meta` remains valid because reset detachment itself supplies the old-generation fence.

For ordinary final Journal patch after successful move, absence of P0-076 authority remains a truthful dependency.

## 7. Why a global Journal revision is not an automatic replacement for P0-076

The database already has a global Journal revision token. It is useful for full-view/import coherence, but using it as the permanent per-entry CAS would couple one Mark Read operation to unrelated Journal mutations.

For example, a comment/update on unrelated entry B may advance global revision while move A is in progress. Failing A solely because unrelated B changed is conservative but can create unnecessary retries and liveness pressure; ignoring the change loses the exact same-entry proof P0-076 requires.

This tranche therefore does not silently redefine P0-076 as “compare global revision”. The exact per-entry/Journal-generation design remains with that owner.

## 8. Owner reconciliation

No new P-code is created.

- **P0-072**: preserve/detach admitted external-effect authority during bulk clear/replace; reset-detached settlement never resurrects Journal.
- **P0-076**: exact single-entry revision / Journal-generation CAS outside the already-detached reset path.
- **P1-183/P1-090/P0-073/P0-074** remain separate Yandex move/object/context dependencies.
- **P1-198** remains worker-issued operation identity/capability provenance where applicable.

The dependency does not block continuing P0-072 runtime work on pending-store quarantine, writer/delete fencing, reset detachment and factual-only settlement. It does block any claim that the same change fully solves ordinary non-reset stale entry mutation.

## 9. Revised P0-072 acceptance wording

Add these owner-boundary controls to the existing acceptance set:

- reset-detached late settlement refuses Journal mutation **before** same-id lookup can authorize anything;
- a same-id replacement row after import is a negative control and remains untouched;
- no P0-072 helper manufactures entry generation from portable/mutable Journal fields;
- deterministic tests explicitly classify non-reset same-id finalization as requiring P0-076 CAS;
- P0-072 closure statement must name P0-076 as still ACTIVE unless separately implemented/proved in the same delivery.

## 10. Current status / next research boundary

P0-072 remains **ACTIVE**. Runtime is still unchanged on this branch; the branch is research + deterministic models only.

The next useful P0-072 block is no longer storage selection or owner identity. It is the concrete **receipt capacity / transactional admission / cleanup envelope**:

- exact per-class count and record-size caps for namespaced `meta` receipts;
- atomic count/put transition under concurrent admissions;
- reset behavior when adding disposition fields would exceed quota/cap;
- which `cancelled-before-start` terminal receipts may be compacted/deleted and when;
- proof that unresolved/manual receipts never enter age-only deletion;
- interaction with existing P1-043 shared storage-reservation owner without falsely claiming global quota reservation.

Manifest remains `0.9.8`; release remains `NOT READY`; no build/tag/Release is authorized by this checkpoint.
