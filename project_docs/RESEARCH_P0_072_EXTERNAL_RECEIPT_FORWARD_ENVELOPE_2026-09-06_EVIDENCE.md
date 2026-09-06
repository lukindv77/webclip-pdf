# P0-072 — forward-compatible external-effect receipt envelope — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 6f99e07a6bf973c111d28d5154d74fa7d8b78a1f`  
Deterministic model commits: `12df4f9d1711a6d0d0635d3d69ca558a57fa021a`, refined by `aefc3299d12deef05579b32abcce29101517c9ea`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the later namespaced external-effect receipt design. Runtime/manifest remain unchanged.

## 1. Problem with “unknown body always aborts reset”

The previous namespace/version checkpoint correctly moved discovery from `externalEffect:v1:` to the stable root `externalEffect:` so an older worker can at least see a future receipt after downgrade.

It then selected the conservative v1 behavior:

```text
unknown/malformed receipt body -> abort destructive reset
```

That is safe, but it creates an avoidable rollback/usability failure: a receipt written by a newer compatible payload version could make clear-all/import-replace impossible after an extension downgrade even when the only thing the old worker needs to do is detach the receipt from Journal authority.

The correct compatibility boundary is not “payload version”. It is the smaller set of fields whose semantics must remain stable across payload versions.

## 2. Selected direction — stable envelope, versioned opaque payload

Use one stable discovery key:

```text
externalEffect:<effectId>
```

and a stable envelope version independent from the effect-specific payload version.

Conceptual v1 envelope:

```text
{
  key: 'externalEffect:<effectId>',
  envelopeVersion: 1,
  effectId: '<worker-issued UUID-v4>',
  provenance: 'worker-issued-live',
  scopeTokenVersion: 1,
  urlScopeToken: '<bounded token string>',
  siteScopeToken: '<bounded token string>',
  payloadVersion: 1,
  payload: { ...effect-specific bounded data... }
  // resetDisposition is ABSENT until the receipt is detached
}
```

The payload contains ReadLater/Yandex/object/account/root/operation-context facts owned by the existing Yandex/receipt owners. P0-072 does not freeze or reinterpret those semantics.

## 3. What is frozen by `envelopeVersion = 1`

The v1 envelope freezes only the cross-version reset contract:

- stable key/effect identity binding;
- local worker-issued provenance;
- reset-scope token identity/version;
- payload version and opaque payload container;
- the rule that **presence of `resetDisposition` is a mutation/replay barrier**.

The top-level v1 envelope shape is exact, except that `resetDisposition` is an optional field whose presence means detached. New authority-bearing top-level fields require an `envelopeVersion` bump. Future effect-specific evolution belongs under `payloadVersion` + `payload`.

This prevents an older worker from silently ignoring a future top-level field that changed authority semantics.

## 4. Presence of reset disposition is the inter-version barrier

For envelope v1, active receipts omit `resetDisposition` entirely.

If the property is present, even if an old worker does not understand the disposition's future body version, it must treat the receipt as detached/non-mutation-authoritative.

Therefore:

```text
resetDisposition absent  -> potentially current physical authority
resetDisposition present -> no external mutation replay and no Journal finalization authority
```

The old worker must never overwrite a disposition it cannot understand merely to normalize it to v1. First/unknown detachment evidence wins.

This is the same fail-closed principle already selected for corrupt/future `journalResetDisposition` in the three pending stores, but the envelope makes the rule explicit across external receipt payload versions.

## 5. Full reset can detach a future payload safely

For a valid `envelopeVersion = 1` receipt with unsupported `payloadVersion`:

1. the old worker validates only the envelope;
2. it does **not** replay/reconcile the unknown payload automatically;
3. clear-all/import-replace clones the complete record;
4. it adds the known reset disposition at the envelope level;
5. it writes the complete record back in the same authoritative `meta + Journal` transaction;
6. the opaque payload is preserved unchanged;
7. success is published only on transaction completion.

This avoids the downgrade deadlock while preserving the future payload for a newer worker or manual reconciliation.

## 6. Scope token format is interpreted only by its supported version

The first draft of the deterministic model required `urlScopeToken` and `siteScopeToken` to be 64 hex characters for every `scopeTokenVersion`.

That was too strict for forward compatibility. A future scope-token algorithm may use a different bounded encoding. A full clear/import does not need to understand that encoding at all.

Correct v1 envelope validation therefore requires only:

- positive integer `scopeTokenVersion`;
- bounded nonempty token strings in the stable token fields.

Strict format validation occurs only when the running worker supports that exact token version. For the current version-1 token algorithm, the token remains the already selected 64-lowercase-hex SHA-256 representation.

Consequences:

```text
full reset + future scopeTokenVersion -> may detach known envelope
scoped reset + future scopeTokenVersion -> fail closed
scoped reset + supported v1 but malformed v1 token -> fail closed
```

This keeps full-reset rollback compatibility without weakening URL/site matching.

## 7. Scoped reset requires supported scope-token semantics

URL/site reset is allowed to detach an unknown payload only when the envelope's `scopeTokenVersion` is supported by the running worker.

The worker can then compare the stable envelope-owned URL/site token without understanding the effect-specific payload.

If `scopeTokenVersion` is unsupported or the supported-version token is malformed:

```text
scoped reset -> fail closed
```

Do not infer nonmatch and do not mass-detach unrelated receipts.

Full clear/import does not need scope-token matching and can still detach a valid envelope-v1 receipt.

## 8. Unknown envelope version remains a hard boundary

A v1 worker encountering:

```text
envelopeVersion = 2
```

must abort destructive reset for that receipt namespace.

The old worker cannot assume that v2 retained:

- the same reset-barrier field semantics;
- the same provenance meaning;
- the same scope identity contract;
- the same key/effect relationship.

Therefore this checkpoint narrows the previous abort rule from **unknown payload** to **unknown envelope**.

## 9. Opaque future payload cannot regain mutation authority

A worker that does not understand `payloadVersion` may preserve and detach the record, but must not:

- start/resume the external effect;
- synthesize remote reconciliation decisions from unknown payload fields;
- mutate Journal from that receipt;
- downgrade the payload to v1;
- drop unknown fields during a write.

Unknown payload remains one unresolved/manual liability for capacity purposes under the already selected bounded namespace policy.

## 10. IndexedDB mechanics support opaque preservation

IndexedDB stores values through structured serialization/clone. A read-modify-put of the complete record can therefore preserve unknown nested object fields without interpreting them.

Overlapping readwrite transactions on the same object-store scope are serialized, so reset detachment and effect admission retain one database ordering.

Primary external references checked during this checkpoint:

- W3C IndexedDB 3.0 transaction scheduling / atomic transactions;
- W3C IndexedDB value storage through structured serialization;
- MDN `IDBObjectStore.put()` structured-clone behavior.

This does not allow arbitrary future payload sizes. Existing receipt count, record-size and prefix-scan bounds remain mandatory.

## 11. Data-model consequence

The earlier conceptual body:

```text
{ version: 1, ...all receipt fields... }
```

is superseded for the later external-effect receipt tranche by:

```text
{
  envelopeVersion: 1,
  ...stable reset/discovery fields...,
  payloadVersion: 1,
  payload: { ...versioned effect-specific fields... }
}
```

The stable root `externalEffect:` from the previous checkpoint remains correct.

The previous rule “any unknown receipt body blocks full reset” is superseded as follows:

- unknown/malformed **envelope** -> block;
- valid v1 envelope + unknown payload -> retain as unresolved, but full reset may detach it;
- valid v1 envelope + future scope token encoding -> full reset may detach, scoped reset blocks;
- unknown/future resetDisposition body already present -> honor its presence as a barrier and do not overwrite it.

## 12. Owner boundaries

This envelope does **not** close or redefine:

- P0-073 / P0-074 remote account/root/config identity;
- P0-076 exact Journal generation/CAS;
- P1-090 exact destructive remote-object reconciliation;
- P1-183 Delete→Trash durable pre-move receipt;
- P1-210 user reconciliation UI;
- P2-019 shared IndexedDB schema ownership.

Those facts live in or constrain the versioned payload and later reconciliation logic.

## 13. Deterministic model

Added and refined:

`project_tools/test_p0_072_external_receipt_forward_envelope_model.js`

Local Node result after the refinement:

```text
P0-072 external receipt forward-compatible envelope model: PASS
```

The current model proves:

1. a v1 worker recognizes a future `payloadVersion` under a known envelope as opaque rather than malformed;
2. full reset adds the envelope reset barrier while preserving the opaque future payload;
3. an existing unknown/future reset disposition is honored and not overwritten;
4. scoped reset can detach a future payload when scope-token semantics are supported;
5. scoped nonmatch remains untouched;
6. future scope-token encoding does not block full reset;
7. future scope-token version blocks scoped matching;
8. unexpected top-level authority fields invalidate envelope v1 and require a version bump;
9. unsupported envelope version remains a hard fail-closed boundary.

The model is architecture evidence, not runtime PASS.

## 14. Status

P0-072 remains **ACTIVE**. This checkpoint changes only the later external-effect receipt architecture. The first pending/legacy/local/remote runtime tranche remains governed by the current acceptance addendum and stays unimplemented/RED.

Runtime, `service-worker.js`, `journal.js`, manifest and release state are unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
