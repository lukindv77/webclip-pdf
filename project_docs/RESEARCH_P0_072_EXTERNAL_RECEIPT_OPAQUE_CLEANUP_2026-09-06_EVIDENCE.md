# P0-072 — opaque future external-effect receipt cleanup — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ ec90e1e3e7ac846abcfaff8ebe7112f67b08519a`  
Deterministic model commit: `3a00435951400bf7cd01350308e4aa500dc2e70f`  
Owner: **P0-072 ACTIVE**.

This checkpoint completes one cleanup consequence of the forward-compatible external-effect receipt envelope. Runtime/manifest remain unchanged.

## 1. Envelope understanding is not payload understanding

An old worker may safely perform two generic operations on a valid envelope-v1 / future-payload receipt:

- count/preserve it as one unresolved liability;
- add/honor the stable envelope reset barrier during destructive reset.

That does **not** mean the old worker understands effect-specific terminality contained in the future payload.

## 2. Unknown payload is never terminal-cleanable by an old worker

For a running worker that does not support the receipt's `payloadVersion`:

```text
cleanup class = opaque unresolved/manual
```

The worker must not parse guessed future fields such as:

```text
payload.resolution = terminal
payload.phase = complete
payload.outcome = verified
```

and use them as deletion authority.

Those field names/semantics belong to the future payload schema the old worker explicitly does not understand.

## 3. Reset detachment does not prove effect terminality

Adding or observing an envelope-level `resetDisposition` means:

```text
no mutation replay / no Journal finalization authority
```

It does **not** mean:

```text
physical effect outcome is terminal and receipt can be deleted
```

Therefore a detached future payload remains opaque unresolved to an older worker unless the stable envelope itself later defines a separately frozen terminality contract. The current selected envelope does not.

## 4. Cleanup eligibility requires current payload understanding

Terminal cleanup/compaction may run only when the executing runtime:

1. understands `envelopeVersion`;
2. understands the exact `payloadVersion`;
3. validates the payload under that schema;
4. proves a terminal outcome/resolution under that schema;
5. applies the dedicated terminal-retention policy.

If any of those checks is unavailable, preserve the receipt.

## 5. Capacity consequence

An opaque future payload consumes one unresolved/manual liability slot even if its future schema would call it terminal.

This can reduce admission capacity after downgrade, but that is truthful bounded degradation. A compatible newer runtime can later interpret/compact the receipt.

Do not trade correctness for capacity by guessing terminality.

## 6. Generic cleanup stays envelope-only

Generic older-worker cleanup may use stable envelope facts only for:

- key validation;
- bounded namespace enumeration;
- reset-barrier preservation;
- unresolved liability accounting.

It may not delete an opaque payload based on age, guessed payload fields or reset presence.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_opaque_cleanup_model.js`

Local Node result before durable write:

```text
P0-072 opaque external receipt cleanup model: PASS
```

Covered controls:

1. a payload-v1 worker preserves a payload-v2 receipt even if the future body contains a terminal-looking field;
2. a payload-v2-aware worker may classify that same fixture for terminal policy;
3. adding a reset barrier does not make the opaque future payload terminal-cleanable by the old worker.

## 8. Owner boundaries

This checkpoint does not define the final user-facing retention period or P1-210 reconciliation UI and does not close P1-043 global storage reservation.

It only prevents P0-072 rollback compatibility from becoming an evidence-deletion shortcut.

## 9. Status

P0-072 remains **ACTIVE**. Runtime, manifest, Journal schema and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
