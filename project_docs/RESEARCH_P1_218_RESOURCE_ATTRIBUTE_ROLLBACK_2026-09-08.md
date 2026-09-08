# P1-218 — generation-owned compare-before-restore for temporary resource attributes

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-218`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
`frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`  
Research branch: `research/p1-218-resource-attribute-rollback-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-218 remains the single owner for this root cause:

> Temporary resource-attribute rollback in both top `content.js` and remote `frame-agent.js` must be compare-before-restore and preparation-generation owned. A stale cleanup must not overwrite a newer host-page value or a newer WebClip preparation generation.

This research confirms and deepens two historical docs-only deltas consolidated in `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md`:

- `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`;
- `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_REMOTE_FRAME_PARITY_2026-08-29.md`.

The historical evidence already classified P1-218 as an unfenced stale writer and required DOM-CAS semantics. The current pass binds that finding to fresh `main`, proves the same defect still exists in both executors, makes preparation generation explicit, models overlapping WebClip generations, and adds a source-bound production closure gate. No new P-code is required.

## 2. Current source — top document

`content.js` keeps temporary resource rollback data in `state.changedResourceAttributes`.

`rememberResourceAttribute(element, name)` deduplicates by exact element object + attribute name and records only:

```text
element
name
had
value
```

It does not record the exact temporary `{present,value}` WebClip installed, a preparation generation/epoch, a current owner token, or a superseded state.

`setTemporaryResourceAttribute(element, name, value)` remembers the old state and then mutates the live DOM. Current resource promotion uses it for:

- `SOURCE[data-srcset]` -> temporary `srcset`;
- `IMG[loading=lazy]` -> temporary `loading=eager`;
- `IMG[data-src]` -> temporary `src`;
- `IMG[data-srcset]` -> temporary `srcset`.

`restoreAfterPrint()` later iterates the saved entries in reverse and unconditionally executes the old state:

```text
if (had) element.setAttribute(name, value ?? '')
else element.removeAttribute(name)
```

There is no live attribute read immediately before restoration, no equality test against the temporary value WebClip wrote, and no preparation-generation check. Exact JavaScript object identity is preserved, but current attribute-value ownership is not proven.

## 3. Current source — remote frame agent

The same defect exists independently in `frame-agent.js`.

`state.changedAttrs` stores temporary rollback entries. `rememberAttr(el,name)` records only `el`, `name`, `had`, `value`.

`prefetchSelected()` may:

- populate a missing `src` from `data-src`;
- change `loading=lazy` to `loading=eager`.

`restorePrint()` reverses `state.changedAttrs` and unconditionally applies:

```text
x.had
  ? x.el.setAttribute(x.name, x.value ?? '')
  : x.el.removeAttribute(x.name)
```

No installed temporary value and no local preparation generation are recorded. Therefore a cross-origin selected child frame has the same stale-writer problem even if top-side command delivery is correct.

## 4. Confirmed counterexample

For either executor:

```text
Host before prepare: src = A
WebClip: remember A
WebClip: src = P
Host page while preparation is running: src = B
WebClip cleanup: restore remembered A unconditionally
Final DOM: A
Correct final DOM: B
```

The cleanup has overwritten a newer host mutation with stale historical state. This is stronger than an incomplete cleanup: it is a wrong side effect against the live page after WebClip's temporary mutation has lost authority.

## 5. Why object identity is insufficient

The current code retains the exact `Element` object, which is a positive control: this particular loop does not rediscover a fresh node by selector or textual id. But a host-owned node can legitimately change its attributes while PDF preparation is active.

Required rollback authority is therefore at least:

```text
Element object identity
+ attribute name
+ preparation generation
+ exact temporary state installed by that generation
```

not merely:

```text
Element object identity
+ old state
```

## 6. Target receipt

Conceptually:

```text
ResourceAttributeReceipt {
    element,
    name,
    generation,
    original: { present, value },
    temporary: { present, value },
    status: installed | restored | superseded | stale-generation
}
```

The receipt must be private extension state. A host-mutable DOM marker is not sufficient ownership proof.

## 7. Core invariants

### I1 — Record both sides of the write

Every reversible temporary mutation records both `original {present,value}` and exact `temporary {present,value}`.

### I2 — Compare before restore

Immediately before rollback, read live `{present,value}`. Restore/remove only when live state exactly equals the recorded temporary state.

### I3 — Host supersession wins

If live state differs from `receipt.temporary`, leave it untouched and classify a bounded `rollback-superseded` diagnostic. Do not retry destructively.

### I4 — Generation ownership

A cleanup from preparation A cannot mutate an attribute once preparation B is authoritative for that mutation context.

```text
rollback(A) after admit/install(B) => zero A DOM writes
```

### I5 — Safe generation takeover

If B starts while A's exact temporary value is still WebClip-owned, B must not accidentally turn A's temporary value into the final host baseline. If the host has already superseded A before B, B must preserve that newer host state as its baseline.

A production implementation may alternatively prove strict single-active-preparation admission; either design must satisfy the same final-state invariant.

### I6 — Per-attribute independence

`src`, `srcset`, `loading`, and future resource attributes have independent receipts. Host supersession of one must not prevent restoration of another still-owned attribute on the same node.

### I7 — Presence is part of identity

Attribute absent and attribute present with empty string are different states and must remain different in comparison/restoration.

### I8 — Top/frame parity

Remote frame-agent rollback has the same contract as top `content.js`. Top correctness cannot compensate for an unsafe local child-frame restore.

### I9 — Bounded diagnostics

Supersession is expected on dynamic pages. Diagnostic evidence must be bounded and must not create a wake/retry loop.

### I10 — Same rule on success and failure

Successful print, failed print, cancellation, timeout, and best-effort cleanup must all use the same ownership test.

## 8. Deterministic schedules

`project_tools/test_p1_218_resource_attribute_rollback_model.js` runs the same suite for `top-content` and `frame-agent`.

### A. Originally present, unchanged temporary value

`loading=lazy -> WebClip eager -> rollback -> lazy`.

### B. Originally absent, unchanged temporary value

`src absent -> WebClip temporary src -> rollback -> src absent`.

### C. Host changes value

`src=A -> WebClip P -> host B -> rollback`. Expected: B remains and receipt is superseded.

### D. Host removes value

`loading=lazy -> WebClip eager -> host removes loading -> rollback`. Expected: absence remains.

### E. Multiple attributes

WebClip mutates `src`, `srcset`, `loading`; host supersedes only `srcset`. Expected: `src` and `loading` restore, host `srcset` remains.

### F. Old generation after new generation

`G1 temp1 -> G2 temp2 -> late rollback(G1)`. Expected: G1 performs no write; G2 remains authoritative.

### G. Host supersedes A before B

`host A -> G1 temp1 -> host B -> G2 temp2 -> cleanup`. Expected final value: B.

### H. B takes over still-owned A temporary state

`host A -> G1 temp1 -> G2 temp2 while temp1 is still WebClip-owned -> cleanup`. Expected final value: A, not temp1.

The model also embeds a legacy-shape counterexample in which unconditional rollback overwrites `host-b` with obsolete `host-a`.

## 9. Neighbor-owner boundaries

### P1-003

Owns bounded renderer-side resource prefetch and the requirement to restore temporary resource mutations. P1-218 owns whether rollback still has authority to restore.

### P1-214

Owns multi-frame prepare/restore command settlement, partial-success receipts and frame/document generation. A perfectly delivered `restore-print` command is still unsafe if the frame agent performs unconditional stale attribute restoration. P1-218 therefore remains a local mutation-authority invariant.

### P1-219

Owns structural image-wrapper rollback and node reparenting. P1-218 owns attribute-value CAS; topology and attribute values remain separate mutation classes.

### P1-220

Owns cleanup of the exact generated print-header node, not a fresh node with the same id. P1-218 already has exact element references; its gap is value ownership.

### P1-221

Owns link/href normalization rollback and its private authority. P1-218 remains resource-prefetch attributes such as `src/srcset/loading` in top and frame-agent.

### P1-223/P1-224

Own style/layout rollback identity/CAS. P1-218 must not absorb those merely because the stale-writer pattern is similar.

No owner merge is justified.

## 10. Positive controls to preserve

Current source already has useful controls:

1. top rollback receipts retain exact element objects;
2. top element+attribute dedup preserves the first pre-WebClip baseline during one current receipt set;
3. top prefetch is bounded by scan/resource/deadline controls;
4. frame-agent also retains exact element objects;
5. reverse-order cleanup remains useful where temporary writes have dependencies;
6. `prepareForPrint()` attempts cleanup before a new top preparation;
7. remote prepared frames are explicitly tracked before restore commands.

These controls reduce risk but do not prove current value/generation authority.

## 11. Orchestration observation

`prepareForPrint(meta)` starts by invoking cleanup before preparing again. This reduces overlap probability, but it does not remove P1-218 because host JavaScript can mutate concurrently, cleanup has multiple success/error paths, and remote-frame command settlement is asynchronous. Local compare-before-restore remains mandatory even if production later enforces strict single-generation admission.

## 12. Same-value host-write limit

Pure DOM compare-before-restore cannot distinguish this sequence:

```text
WebClip writes P
host independently writes the exact same {present,value}=P
```

The historical P1-218 contract defines the practical minimum as exact temporary-state comparison plus preparation generation, and this research preserves that boundary. If a future requirement says an identical-value host write must also revoke WebClip ownership, mutation provenance/version tracking would be needed. That is not required to prove or close the currently assigned value-supersession defect.

## 13. Recommended production direction

Conceptually centralize the semantic primitive:

```text
beginPreparationGeneration()

installTemporaryAttribute(generation, element, name, temporary)
  -> capture or safely inherit original baseline
  -> write temporary
  -> store exact temporary receipt

rollbackAttribute(receipt, currentGeneration)
  -> reject stale generation
  -> read live state
  -> if live != receipt.temporary:
         superseded; do not write
     else:
         restore receipt.original
```

Top and frame-agent need not physically share one module, but they must share this tested semantic contract.

## 14. Source-bound RED gate

`project_tools/test_p1_218_resource_attribute_rollback_source.js` is a future production-closure gate. It checks both `content.js` and `frame-agent.js` and requires:

1. existing prefetch/restore helpers remain;
2. old state remains captured;
3. exact installed temporary state is recorded;
4. explicit preparation generation/epoch exists;
5. top restore reads live state;
6. top restore compares against its temporary receipt;
7. top has an explicit superseded/compare path;
8. frame-agent records installed temporary state;
9. frame-agent has equivalent generation ownership;
10. frame-agent reads and compares live state;
11. the current unconditional restore-loop shapes are absent.

Current source inspection proves the positive controls but not the P1-218 target contract, so the expected semantic result against current production is RED until implementation. This research does not call that an executed RED unless exact production blobs are actually materialized and the gate is run against them.

## 15. Physical Chromium closure matrix

Production closure needs real browser evidence in addition to source/model proof.

### Top document

- selected lazy image is temporarily promoted;
- host changes `src` during preparation;
- cleanup runs after successful print;
- newer host `src` survives;
- unchanged WebClip-owned attributes restore.

### Remote cross-origin frame

- frame agent installs temporary `src`/`loading`;
- child page changes one before restore;
- exact `restore-print` reaches the current frame/document generation;
- host value survives and unchanged temporary values restore.

### Generation race

- A installs temporary state;
- B becomes current;
- A cleanup settles late;
- A performs zero stale writes;
- B cleanup converges to the correct host baseline.

### Failure path

Repeat host supersession when print/preparation fails and prove error cleanup uses the same CAS rule.

## 16. Production closure criteria

P1-218 can leave ACTIVE only after fresh canonical evidence proves:

- top receipt includes exact temporary state;
- top restore is compare-before-restore;
- frame-agent has the same contract;
- preparation generation fences stale cleanup;
- host-superseded values survive;
- present/absent semantics restore correctly;
- attributes restore independently;
- old WebClip generation cannot overwrite newer generation;
- deterministic model PASS;
- source gate is actually executed PASS on exact committed production blobs;
- relevant prior print/resource regressions PASS;
- real Chromium E2E covers top + remote frame races;
- Registry status is updated only after those closure facts exist.

## 17. Validation in this research block

The deterministic model was executed before commit and produced:

```text
P1-218 current-shape counterexample: unconditional rollback overwrites host-b with host-a
P1-218 top-content parity suite: PASS
P1-218 frame-agent parity suite: PASS
P1-218 resource-attribute rollback deterministic model: PASS
```

The source-gate JavaScript was syntax-checked before commit. It is expected RED against current source based on direct inspection, but no exact-production source-gate execution is claimed here unless exact `content.js` and `frame-agent.js` bytes are run.

No product regression suite, browser E2E, build, tag, release or deployment was performed by this research block.

## 18. Registry/release state

No Registry status change is made. `P1-218` remains `ACTIVE` until production closure. Production runtime and `manifest.json` are unchanged; release state is unchanged.

## 19. Next owner

After final fresh-check, the next sequential ACTIVE owner is expected to be `P1-219` — temporary image-link structural rollback. Start it only if Registry still assigns that owner and there is no already-saturated research branch/PR.
