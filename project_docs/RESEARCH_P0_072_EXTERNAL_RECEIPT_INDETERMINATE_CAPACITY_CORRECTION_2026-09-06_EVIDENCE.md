# P0-072 — correction: indeterminate valid-key receipt consumes one unresolved liability — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this correction: `research/p0-072-recovery-quarantine-2026-09-04 @ 912f708a64460122ad5c98cfb5faa49172f4def2`  
Corrected model commit: `5721231487c7c30fc86c6fd8b22a7a3c4e7c1fca`  
Owner: **P0-072 ACTIVE**.

This checkpoint narrows an overly broad fail-closed admission rule introduced in the immediately preceding capacity note. Runtime/manifest remain unchanged.

## 1. Previous overstatement

The first indeterminate-capacity checkpoint said any unsupported/malformed external receipt body should block all new external-effect admission.

That is stronger than necessary once the stable key contract is taken into account.

## 2. One valid key is one physical-effect lineage

The external receipt architecture already requires one worker-issued effect generation per exact key:

```text
externalEffect:<UUID-v4 effectId>
```

Retry/new physical attempt authority must use a new effect id rather than hiding multiple independent effects inside one receipt key.

Therefore, if the **key itself is valid**, even an unsupported/malformed body can conservatively be counted as exactly one unresolved physical-effect liability.

The old worker still must not mutate, replay, clean up or claim reset-detachment for that unknown body, but it does know the namespace cardinality contribution.

## 3. Corrected admission rule

For each row under the stable root:

### Valid exact receipt key

- valid active/reconciling body -> consumes one unresolved liability;
- valid manual body -> consumes one unresolved liability;
- unsupported/malformed body -> consumes one unresolved/indeterminate liability;
- proven terminal body -> eligible for the terminal-retention class.

New admission is allowed only while the combined unresolved envelope remains below its configured cap.

### Invalid reserved-root key

If the key itself does not satisfy the frozen one-effect identity shape, the runtime cannot rely on the one-key/one-effect cardinality invariant.

That remains namespace corruption and blocks admission/reset according to the reserved-root validation contract.

### Prefix scan overflow

`max + 1` remains a separate fail-closed condition.

## 4. Destructive reset remains stricter than unrelated new admission

This correction does **not** allow a destructive reset to skip an unknown receipt body.

For clear/import, an unsupported/malformed receipt still cannot be safely classified/detached by v1, so reset remains fail-closed.

The distinction is:

- new unrelated effect admission needs bounded liability accounting;
- destructive reset needs proof that all in-scope old authority crossed the reset barrier.

These are different acceptance questions.

## 5. Cleanup remains conservative

An indeterminate body is never treated as terminal and is not generic-cleanup eligible.

It remains retained unresolved evidence until a compatible parser/repair path can establish stronger facts.

## 6. Model correction

`project_tools/test_p0_072_external_receipt_indeterminate_capacity_model.js` now proves:

1. valid receipt key + unsupported body consumes one unresolved slot;
2. that row blocks admission only when the unresolved cap is reached;
3. invalid reserved-root key still blocks the namespace;
4. known manual consumes unresolved capacity;
5. known terminal does not consume the simplified unresolved slot.

The earlier “any unknown body globally blocks admission” rule is superseded.

## 7. Owner boundaries / status

This remains P0-072 local logical capacity. P1-043 still owns global physical-byte reservation.

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
