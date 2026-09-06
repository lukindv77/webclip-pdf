# P0-074 — generation-owner boundary — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch before this checkpoint: `research/p0-074-immutable-live-yandex-context-2026-09-06 @ d77a93608fd6f87093324e9deab634058db07d31`  
Owner: **P0-074 ACTIVE**.

This checkpoint prevents P0-074 implementation from creating a competing generation authority already owned elsewhere in the canonical Registry.

## 1. Canonical owner split

The current Registry assigns:

- **P0-074** — one immutable Yandex auth/account/root/config/publication operation context and generation; later stages cannot switch global context;
- **P1-178** — OAuth pending/token exchange/config commit is the auth-attempt + settings-generation state machine;
- **P1-191** — manual-token replacement is generation-fenced and cannot overwrite the last proven auth on failure/unknown;
- **P1-196** — invalid-token/401 demotion is exact-auth-generation fenced;
- **P0-078** — `createPublicLinks` publication policy generation/revocation;
- **P1-198** — physical live operation identity is worker-issued; textual `operationId` is correlation metadata only;
- **P1-158** — prerequisite config/auth reads require bounded deadlines;
- **P0-073** — durable expected account/root scope for remote-save recovery.

P0-074 composes these authorities. It does not replace them.

## 2. No parallel P0-074 auth-generation counter

A new private counter local to the P0-074 helper would create two competing answers to questions such as:

```text
which token generation is current?
was auth A replaced by B?
is a 401 from A allowed to demote B?
which settings generation owns this root/publication policy?
```

Those questions already belong to P1-178/P1-191/P1-196/P0-078.

Therefore P0-074 must consume their authoritative generation receipts once implemented rather than mint a second independent lineage.

## 3. P0-074's own responsibility

P0-074 owns the binding/closure of one operation context:

```text
operationContext = bind(
  worker-issued operation identity,
  authoritative auth-generation receipt,
  account identity proven by that auth capability,
  authoritative operation-relevant config/settings generation,
  operation-owned root/path semantics,
  publication-policy generation where publication can occur
)
```

Once bound, every remote stage for that logical item uses the same context or stops. It never silently rebinds to newer global state.

This is a composition invariant, not a second source of truth for any constituent generation.

## 4. Recovery-specific implementation can be narrower than full P0-074 closure

P0-073 recovery already owns an immutable durable root/path scope. A safe incremental runtime implementation may therefore first solve the recovery subcase by:

1. capture one live token capability;
2. prove account identity using that same capability;
3. compare it with the P0-073 expected account UID;
4. use the same capability for all GET/publish/poll calls in that recovery item;
5. use checkpoint-owned root/path instead of rereading current configured root;
6. never persist the token;
7. stop/defer instead of adopting a different current token.

That can close the cross-account recovery TOCTOU subcase without pretending that general new-upload/config-generation coherence is solved.

P0-074 remains ACTIVE until broader operations consume generation-safe auth/config/publication authority across their full chains.

## 5. Publication revocation remains external authority

A captured operation context containing historical `createPublicLinks=true` is not perpetual publish permission.

If P0-078 determines that a later `false` generation revoked a publish mutation before its admission, P0-074 must stop/defer that mutation. It must not:

- continue because the old context was frozen;
- refresh the context to a newer token/config and continue;
- infer cancellation of an already admitted/unknown publish.

Thus immutable context and revocable mutation authority compose rather than conflict.

## 6. Auth replacement/demotion remains external authority

Similarly:

- P1-191 decides whether candidate manual auth B replaced A;
- P1-196 decides whether a failure from A may demote the current auth generation;
- P0-074 ensures an operation admitted under A cannot silently continue under B.

If A becomes invalid, the current operation becomes context-auth-invalid/deferred/failed under its owner-specific semantics. A new recovery cycle may later acquire B if B proves the same expected account and other owners permit it.

## 7. Physical operation identity remains P1-198

P0-074 context should bind to a worker-issued physical operation identity when such identity is required. It must not elevate caller-supplied textual `operationId` into an ownership capability.

This is particularly important when an unresolved checkpoint must be preserved and a genuine new attempt requires a distinct operation generation rather than in-place rebind.

## 8. Bounded acquisition remains P1-158-compatible

Generation-safe acquisition must remain bounded. A double-read/recheck loop cannot spin indefinitely while settings/auth mutate. Use a small explicit retry bound/deadline, then fail closed/defer.

P0-074 should report inability to acquire a coherent context rather than silently accepting a mixed snapshot.

## 9. Deterministic evidence state

`project_tools/test_p0_074_immutable_live_yandex_context_model.js` was executed as a standalone local Node model during this research session and returned:

```text
P0-074 immutable live Yandex context model: PASS
```

This proves only the deterministic architecture model. It is not a production/runtime PASS.

A full repository checkout/test run was not performed because the local environment could not resolve `github.com`; repository source authority in this session remained the GitHub connector.

## 10. Status

No Registry status changes are made.

- P0-074 remains **ACTIVE**;
- P0-073 remains **ACTIVE** until runtime/source gates turn GREEN with required verification;
- P0-078, P1-178, P1-191, P1-196 and P1-198 remain independent owners of their registered semantics.

Runtime/manifest remain `0.9.8`. Release remains **NOT READY**. No PR, build, tag, GitHub Release or release process is started here.
