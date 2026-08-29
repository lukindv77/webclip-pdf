# Audit delta — print-header cleanup must remove the exact generated node — 2026-08-29

Baseline `main` before this write: `a7030b807da1d96e79f41bf9e15c3344f0832972`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-220 — print-header cleanup re-resolves a textual DOM id and can delete a newer host-owned replacement node.**

This is the DOM form of the architecture invariant that a fresh read by textual id is not CAS/ownership proof.

## Source proof

During PDF preparation `content.js` creates a concrete node:

```js
const header = document.createElement('section');
header.id = PRINT_HEADER_ID;
...
state.printHeader = header;
```

The state therefore has exact object identity for the generated header.

But `restoreAfterPrint()` does not remove `state.printHeader`. It does a new lookup:

```js
document.getElementById(PRINT_HEADER_ID)?.remove();
```

The page owns the same DOM and can remove, rename or replace that id while print is in progress. `getElementById()` at cleanup time only proves current string equality, not that the returned node is the one WebClip created.

By contrast, print style cleanup already iterates stored exact style object references (`state.printStyles`) and calls `style.remove()` on those exact nodes.

## Deterministic replacement schedule

1. WebClip creates header object `H1` with id `webclip-pdf-header` and appends it.
2. Host MutationObserver removes `H1` and later creates its own node `H2` with the same id, or an application rerender replaces the subtree with `H2`.
3. PDF completes/fails.
4. WebClip executes `document.getElementById(PRINT_HEADER_ID)` and receives `H2`.
5. Cleanup removes `H2`, although WebClip never created/owned that node.

No navigation, document replacement or hostile privilege escalation is required; ordinary DOM rerender is sufficient.

## Required contract

- Cleanup must operate on exact node identity captured when the temporary artifact was created, e.g. `state.printHeader` plus preparation generation.
- If the exact generated node is detached, cleanup is already complete for that node; do not search by id for a replacement.
- A newer WebClip preparation generation must have a distinct receipt so old cleanup cannot remove its node.
- Any id/name is presentation metadata only, never cleanup capability.
- Diagnostics may separately detect an unexpected same-id node, but must not delete or mutate it.

Longer-term P0-075 frozen/owned print representation should further reduce live-page temporary nodes, but exact cleanup identity remains required wherever such nodes exist.

## Required regressions

1. Exact WebClip header remains connected -> cleanup removes it.
2. Host removes exact header before cleanup -> cleanup is a no-op.
3. Host removes H1 and inserts H2 with same id -> H2 survives cleanup.
4. Host changes H1 id -> cleanup may remove H1 by object identity without touching any other same-id node.
5. G1 header replaced by G2 WebClip header -> G1 cleanup cannot remove G2.
6. Success and failure cleanup paths obey identical object-identity rules.
7. Diagnostics do not use `getElementById()` as proof of WebClip ownership.

## Duplicate check / numbering

Repository semantic search for `PRINT_HEADER_ID`, `getElementById(...).remove`, replacement-node cleanup and exact print-header ownership found no existing dedicated audit owner. P0-075 owns the broader hostile/live-DOM print boundary, but not this concrete stale cleanup identity bug.

Current repository search found no `P1-220`; P1-219 is the immediately preceding newly assigned owner on current `main`. Therefore this checkpoint assigns **P1-220**.

## Validation state

Documentation only. Historical 88/88 JS syntax and 74/74 deterministic PASS were not rerun for this HEAD. Real unpacked Chrome QA remains required.