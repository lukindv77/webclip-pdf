# P0-072 — external receipt reserved-root key validation — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ d3c83771f6b5a7036ecbb35d780e51716cbfb5b0`  
Deterministic model commit: `febcec7a97167f72d499583530744d28d268a92d`  
Owner: **P0-072 ACTIVE**.

This checkpoint completes the stable `externalEffect:` discovery-root contract by defining how malformed keys inside the reserved namespace are handled. Runtime/manifest remain unchanged.

## 1. Stable root is reserved authority space

After the 2026-09-06 namespace correction, external receipts are discovered under:

```text
externalEffect:
```

with the first implementation key shape:

```text
externalEffect:<worker UUID-v4 effectId>
```

Anything under that root is not an unrelated arbitrary `meta` key. It belongs to the reserved external-effect authority namespace.

## 2. Exact v1 key validation

A v1 receipt key must satisfy the exact bounded form:

```text
^externalEffect:<UUID-v4>$
```

Examples that are **not** silently skipped:

```text
externalEffect:
externalEffect:not-a-uuid
externalEffect:<uuid>:extra
```

They are `reserved-root-invalid` corruption/unknown authority.

## 3. Reset behavior

During bounded prefix scan:

- valid key + valid current body -> normal receipt classification;
- valid key + unsupported/malformed body -> fail closed according to the namespace-version checkpoint;
- invalid key under reserved root -> fail closed;
- keys outside the root are ignored by this receipt scan.

A destructive reset must not report success while a malformed record exists inside the namespace reserved for external physical authority.

## 4. Cleanup behavior

Generic terminal cleanup likewise cannot skip malformed reserved-root keys and then declare the namespace healthy.

Malformed/unknown receipt keys are preserved and block unsafe compaction/admission according to capacity policy until a compatible repair path exists.

They are not deleted merely because the parser cannot understand them.

## 5. Scan work bound includes malformed keys

The hard prefix-scan envelope counts every key under `externalEffect:`, including malformed ones.

Required order:

```text
encounter reserved-root row
 -> increment scanned count
 -> max+1 => overflow/fail closed
 -> validate key/body
```

This prevents a corrupted namespace from bypassing the work bound by filling it with keys that would otherwise be ignored.

## 6. Future versions

Future receipt versions must keep the stable discovery root. If a future version changes effect-id encoding, an older worker will still see the key under the root; inability to validate the suffix becomes fail-closed rather than invisibility.

This is intentionally conservative rollback behavior.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_key_validation_model.js`

Local Node result before durable write:

```text
P0-072 external receipt key validation model: PASS
```

Covered controls:

1. unrelated `meta` key is outside the namespace;
2. empty receipt suffix is corruption;
3. arbitrary non-UUID suffix is corruption;
4. exact UUID-v4 key is accepted;
5. malformed reserved-root key aborts namespace validation;
6. max+1 reserved-root rows abort even when the set is corrupted.

This is architecture/model evidence, not runtime PASS.

## 8. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
