# WebClip — UserOperationReconcile retention/GC addendum — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/wave1-user-operation-reconciliation-2026-09-09`  
Inputs: J0 v8 + Journal authority retention/GC + transactional capacity research.  
Mode: **RESEARCH-ONLY CHANGE IMPACT ADDENDUM**.

No production or Registry change is made here.

---

## 1. Core reconciliation refinement

The common reconciliation layer must distinguish:

```text
domain detail currently present
```

from:

```text
exact terminal truth still known
```

because terminal F/E detail is intentionally bounded and may be GC'd after its common P terminal summary is durable.

Therefore:

```text
missing F/E detail
+ exact terminal P summary
-> project the terminal P summary
```

Never:

```text
-> not-admitted
```

`not-admitted` remains legal only when exact admission lookup proves no P was admitted.

---

## 2. Terminal P summary becomes the post-GC projection source

Before terminal F/E is removed, P must contain a bounded immutable terminal summary carrying at least:

```text
operationClass
retryDisposition
domainKind
domainTerminalClass
terminalCode
evidenceClass
terminalAt
postcondition summary
```

This summary does not replace live domain receipts while they exist.

Authority precedence becomes:

```text
live exact domain receipt
  > terminal common P summary after legitimate domain GC
  > UI/OperationLog diagnostics
```

---

## 3. `canceled-before-start`

Retention research introduced an exact E terminal state:

```text
canceled-before-start
```

Meaning:

```text
prepared E existed
F was revoked/stale before effect-start
exact protocol proves provider mutation was not admitted
```

Common projection:

```text
lookupResolution = exact
operationClass = canceled
retryDisposition = new-attempt-allowed
```

The allowance for a new operation comes from exact no-effect proof, not merely from a cancel label.

This state must remain distinct from:

```text
started-unknown
```

where retry remains `reconcile-only`.

---

## 4. `settled-partial` survives domain GC

For:

```text
remote-complete-local-suppressed
```

common terminal projection remains:

```text
operationClass = settled-partial
retryDisposition = none
```

even after F/E detail is legitimately removed.

The exact external effect must never become retryable just because detailed receipts aged out.

---

## 5. Manual/evidence-limited outcome survives detail GC

For a long-lived unresolved effect that eventually transitions to:

```text
manual-resolution
```

P terminal summary must preserve:

```text
operationClass = evidence-limited
retryDisposition = manual-resolution
```

After detailed E is later removed under its longer retention rule, P still projects the same result for its own remaining retention window.

Missing E detail is not proof that the effect failed or never started.

---

## 6. GC ordering requirement for E0

The common receipt cleanup owner must enforce:

```text
if live F/E dependency exists
-> P cannot be GC'd
```

If dependency lookup fails unexpectedly or cross-reference is inconsistent:

```text
retain P
project evidence-limited / repair-required where appropriate
```

Do not optimize ambiguity into absence.

---

## 7. Capacity failure projections

### F capacity failure

Correct schedule:

```text
P already admitted
F admission rejects before later effect
P terminalizes failed-before-effect
```

Projection:

```text
lookupResolution = exact
operationClass = failed-before-effect
retryDisposition = new-attempt-allowed
```

provided exact evidence proves no later physical effect was admitted.

### E capacity failure

E preparation capacity is checked before provider effect admission.

If it fails and no other effect exists:

```text
failed-before-effect
new-attempt-allowed
```

Again, retry is authorized by the effect boundary, not by an arbitrary storage error string.

---

## 8. Crash P admitted before F

A worker restart may leave:

```text
P = admitted
F = absent
```

Common reconciliation must not classify this as a brand-new request opportunity by default.

It first projects the same P as running/domain admission pending and lets the same-operation owner either:

- finish F admission;
- or terminalize the same P as failed-before-effect.

No blind P2 is minted solely because F is missing.

---

## 9. Updated E0/E1 acceptance additions

Future implementation must prove:

1. terminal P summary is used after legitimate F/E GC;
2. absent domain detail alone never yields `not-admitted`;
3. `canceled-before-start` maps to canceled/new-attempt-allowed only with exact no-effect proof;
4. `started-unknown` never maps to canceled;
5. `settled-partial` survives domain-detail GC;
6. manual/evidence-limited truth survives domain-detail GC;
7. P cleanup occurs after domain cleanup;
8. broken cross-reference fails closed;
9. F/E capacity failures are exact failed-before-effect only when the external effect boundary was not crossed;
10. P-without-F crash resumes/reconciles the same P.

---

## 10. Status impact

```text
E0 reconciliation contract               = REFINED
E1 retry UI contract                      = UNCHANGED / STRENGTHENED
post-domain-GC terminal truth             = DEFINED
canceled-before-start projection          = DEFINED
capacity failure projection               = DEFINED
P-before-F crash projection               = DEFINED
production implementation                 = NOT STARTED
P1-231                                    = NOT ALLOCATED
```

Project-wide coverage completion is not re-declared here; PD7 exact-target reconciliation remains separate.
