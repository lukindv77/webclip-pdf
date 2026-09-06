# P0-072 — strong reset/effect generation ids — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ dd17b43c6b2a953b9072d803cec284a6c3d8d05f`  
Deterministic model commit: `4da9de70e088b72e839b3495b7bc2a59eb934bff`  
Owner: **P0-072 ACTIVE**.

This checkpoint fixes the generation primitive for new P0-072 reset/effect identities. Runtime/manifest remain unchanged.

## 1. Why these ids deserve a stronger rule

P0-072 introduces new durable generation identities whose accidental collision could merge independent recovery/reset histories:

- `resetId` — one destructive Journal reset generation;
- `effectId` — one trusted physical external-effect lineage in the later `externalEffect:` namespace.

They are not passwords, OAuth tokens or remote capabilities, but their uniqueness is part of durable correctness.

## 2. Existing generic fallbacks are not the target contract

Current source contains several historical helpers that use patterns such as:

```text
crypto.randomUUID ? crypto.randomUUID() : <Date.now/Math.random fallback>
```

Those call sites belong to their existing operation/lease/session owners and are not changed by this P0-072 checkpoint.

P0-072 should not copy that fallback pattern into new durable reset/effect generation authority.

## 3. Selected primitive

For new P0-072 UUID generation:

```text
crypto.randomUUID()
```

is required.

The generated result must match the fixed UUID-v4 shape already selected by the v1 validators.

If the API is unavailable or returns an invalid shape:

```text
fail closed before durable authority creation / external-effect admission
```

Do not fall back to `Math.random()`.

## 4. Platform compatibility

The extension currently declares:

```text
minimum_chrome_version = 118
```

`Crypto.randomUUID()` has been broadly available since 2022, is available in Web Workers, and returns a cryptographically secure UUID-v4.

Therefore a fallback is unnecessary for the supported browser floor.

External references checked 2026-09-06:

- MDN `Crypto.randomUUID()`;
- MDN WorkerGlobalScope `crypto`.

## 5. Reset id

One reset id is generated before the destructive transaction and reused for every new disposition created by that transaction.

The reset id:

- is not caller-provided;
- is not derived from URL/site/account/path data;
- is fixed 36-char UUID-v4;
- is persisted only in bounded reset/fence evidence;
- is not a capability for external mutation.

Generation failure aborts the reset before any authoritative write.

## 6. Effect id

The later external-effect receipt uses one worker-issued effect UUID as both durable effect identity and stable key suffix:

```text
externalEffect:<effectId>
```

Effect-id generation must succeed before the trusted prepared receipt can be written. Without a durable unique effect id, no external move/mutation is admitted.

This preserves the separation between textual `operationId` correlation and physical-attempt lineage.

## 7. Local token salt remains a different primitive

The installation-local 32-byte pseudonymization salt continues using:

```text
crypto.getRandomValues()
```

because it is raw random bytes rather than a UUID identity.

Both primitives remain fail-closed with no `Math.random()` fallback.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_strong_generation_id_model.js`

Local Node result before durable write:

```text
P0-072 strong generation id model: PASS
```

The model proves:

1. a valid UUID-v4 from the strong source is accepted;
2. unavailable `randomUUID()` fails closed;
3. malformed output fails closed rather than being persisted.

## 9. Owner boundaries

This checkpoint does not retroactively change every historical `Math.random()` fallback in the project and does not claim closure for their existing owners.

It only defines the primitive for new P0-072 `resetId`/`effectId` generation.

## 10. Status

P0-072 remains **ACTIVE**. Runtime, manifest and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
