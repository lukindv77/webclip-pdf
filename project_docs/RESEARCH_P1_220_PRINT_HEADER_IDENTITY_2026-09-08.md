# P1-220 — print-header cleanup must use exact generated-node identity

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-220`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Research branch: `research/p1-220-print-header-identity-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, Registry status, manifest, build, tag and release state are unchanged.

## 1. Classification

P1-220 remains the single current owner for this root cause:

> Print-header cleanup must remove the exact WebClip-generated node captured by a private generation-owned receipt. A textual DOM id is presentation metadata and cannot authorize cleanup of whatever node currently resolves that id.

This pass reconfirms the historical delta `RESEARCH_DELTA_PRINT_HEADER_TEXTUAL_ID_CLEANUP_2026-08-29.md` on fresh canonical `main`, adds an explicit duplicate/pre-existing-id schedule, and creates deterministic + source-bound closure gates. No new P-code is required.

## 2. Current source proof

`prepareForPrint()` creates a concrete temporary node:

```js
const header = document.createElement('section');
header.id = PRINT_HEADER_ID;
...
document.body.insertBefore(header, document.body.firstChild);
...
state.printHeader = header;
```

The implementation therefore already possesses the strongest possible cleanup identity: the exact JavaScript object reference for the node it created.

But `restoreAfterPrint()` discards that identity as mutation authority and performs a fresh global lookup:

```js
try { document.getElementById(PRINT_HEADER_ID)?.remove(); } catch (_) {}
...
state.printHeader = null;
```

That fresh lookup answers only “which live element currently has this textual id?”, not “is this the exact node WebClip created for this preparation generation?”.

## 3. Failure schedule: host replacement

Let `H1` be the WebClip-generated header and `H2` a later page-owned node.

1. WebClip creates `H1` and assigns `id="webclip-pdf-header"`.
2. WebClip stores the exact object in `state.printHeader`.
3. Page code removes `H1` during the preparation/render lifetime.
4. Page code inserts `H2` with the same id.
5. Cleanup calls `document.getElementById(PRINT_HEADER_ID)`.
6. The lookup resolves `H2`.
7. WebClip removes `H2` even though WebClip never created or owned it.

No navigation, privilege escalation or exotic DOM behavior is required; ordinary rerender/replacement is enough.

## 4. Additional same-root schedule: pre-existing duplicate id

Fresh research adds a second concrete schedule that does not require replacement after preparation.

A host page may already contain a node with `id="webclip-pdf-header"`. In particular, a same-id node earlier in document tree order can be returned by a global id lookup even while the exact WebClip header still exists.

The current cleanup can therefore delete a pre-existing host node and leave WebClip's own temporary node connected.

This is not a new owner. It is another manifestation of P1-220's existing invariant: textual identity is not ownership identity.

## 5. Required ownership model

Each print-header mutation needs an immutable private receipt:

```text
PrintHeaderReceipt {
    generation
    node   // exact generated object reference
}
```

Creation binds the exact node to the exact preparation generation before cleanup can become asynchronous or overlap later work.

Cleanup uses only the receipt's exact node as mutation authority.

### Exact node still connected

Remove that exact node by object identity.

Its current textual id is irrelevant. If the host changed the WebClip node's id, it is still the same generated node and may be removed by exact identity.

### Exact node already detached

Cleanup for that receipt is complete. Do not search for a replacement by id/name/selector.

A same-id live node may be observed for bounded diagnostics, but observation must not mutate it.

### Newer preparation generation

A newer preparation gets a distinct immutable receipt. Cleanup associated with generation A must never dereference a mutable global slot that may now contain generation B's node.

The simplest invariant is:

```text
rollback(receiptA) can mutate receiptA.node only
```

and never:

```text
rollback(A) -> read current global id/current mutable state -> remove resulting node
```

## 6. Why `state.printHeader?.remove()` alone is not sufficient

Replacing the textual lookup with a late read of mutable `state.printHeader` is an improvement only for the single-generation case.

It is not a complete generation contract if an older async cleanup can run after a newer preparation has overwritten `state.printHeader` with `H2`.

The authority must therefore be an immutable per-generation receipt captured for the cleanup being completed, not merely whatever node is in the global state slot at cleanup time.

## 7. Deterministic model

Added:

`project_tools/test_p1_220_print_header_identity_model.js`

The model covers eight schedules:

1. exact generated header remains connected -> exact node is removed;
2. host already removed exact header -> cleanup is a no-op;
3. host replaces H1 with H2 using the same id -> H2 survives;
4. host changes H1 id -> exact H1 can still be removed by object identity;
5. pre-existing host same-id node earlier in the document -> host node survives and H1 is removed;
6. host inserts another same-id node before H1 -> only H1 is removed;
7. two generations retain distinct receipts -> G1 cleanup cannot remove G2 node;
8. same-id diagnostics are observational only.

It also contains an executable counterexample reproducing the current textual-id failure shape.

Local execution before commit:

```text
P1-220 current-shape counterexample: textual-id cleanup deletes host replacement
P1-220 print-header exact-identity rollback deterministic model: PASS
```

The same file also passed `node --check` before commit.

## 8. Source-bound production closure gate

Added:

`project_tools/test_p1_220_print_header_identity_source.js`

The source gate requires:

- the explicit print-header feature remains present;
- creation retains exact generated node identity in private state;
- cleanup is preparation-generation/epoch owned;
- a private receipt carries exact node identity;
- `restoreAfterPrint()` consumes private identity;
- exact node removal remains possible;
- `document.getElementById(PRINT_HEADER_ID)?.remove()` is forbidden as cleanup authority;
- selector re-resolution of `PRINT_HEADER_ID` followed by removal is forbidden.

The gate passed `node --check` before commit.

Current production source is expected to fail this closure gate because it still contains the forbidden `document.getElementById(PRINT_HEADER_ID)?.remove()` shape and has no dedicated print-header generation receipt. This statement is source inspection, not a claim that the committed source gate has been executed against an exact checked-out production tree in this session.

## 9. Acceptance matrix for implementation

Production closure should prove at minimum:

| Case | Required outcome |
|---|---|
| H1 intact | exact H1 removed |
| H1 removed by host | no-op |
| H1 removed, H2 same id inserted | H2 survives |
| H1 id changed by host | exact H1 removed; unrelated nodes untouched |
| Pre-existing same-id host node | host node survives |
| New same-id duplicate inserted before cleanup | duplicate survives; exact H1 removed |
| Generation A cleanup after generation B exists | A cannot remove B's node |
| Same-id diagnostic | may report bounded metadata; no mutation authority |
| Success/failure cleanup paths | identical identity rule |

## 10. Relationship to adjacent owners

### P1-219

P1-219 owns structural rollback that can reparent a page-owned image. P1-220 is narrower and different: generated print-header node identity and deletion authority.

### P1-221

P1-221 owns rollback of page-owned link `href` values and authority currently carried partly through a host-mutable marker. P1-220 does not own attribute CAS.

### P0-075

The long-term preferred architecture remains a WebClip-owned/frozen print representation with fewer live-page temporary mutations. Until that boundary is complete, every live temporary node still requires exact private cleanup identity.

## 11. Research conclusion

P1-220 is not a missing-cleanup bug. The cleanup exists, but its authority is weaker than the identity already available to WebClip.

The architectural correction is to preserve capability continuity:

```text
created exact node -> private generation receipt -> cleanup exact same node
```

and never downgrade that capability to:

```text
created exact node -> textual id -> fresh global lookup -> mutate lookup result
```

P1-220 remains ACTIVE until production implementation plus required direct verification closes the Registry contract.
