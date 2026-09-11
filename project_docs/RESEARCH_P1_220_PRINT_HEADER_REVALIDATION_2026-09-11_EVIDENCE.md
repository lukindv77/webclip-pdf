# P1-220 — exact print-header identity and partial cleanup revalidation

Date: 2026-09-11. Owner: **P1-220, ACTIVE**. Research only.
Canonical baseline: `b8f9089545c642b544d4e53820b20c57ee02b4cd`.

## Baseline and ownership

Fresh main, RESEARCH_REGISTRY.md, open PRs/issues, relevant branches and tracked tree were inspected. No open PR or issue required continuation; no tracked AGENTS.md was found. Current source, requirements, rationale, architecture, consolidated PDF/print evidence and comprehensive research policy were reread. The preceding tranches supply already-read workflow, navigation, coverage and fidelity context. P1-220 is the existing ACTIVE owner; no new P-code or Registry status change is justified.

Historical branch `research/p1-220-print-header-identity-2026-09-08`, head `8b1f1fe99e68f47232521ce9a7a1d979b7ba1a34`, is provenance only: 3 ahead / 56 behind this main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. Its three-file proposal is not imported. The exact-node recommendation remains valid but needs earlier receipt capture and explicit partial-effect settlement. This fresh tranche adds two bounded files and does not import the historical production closure gate.

The product requires informational metadata in the printable representation while preserving the source page after temporary preparation. ARCHITECTURE.md explicitly requires generation-owned temporary DOM changes and exact generated-node receipts (P1-218 through P1-224). Removing a matching host node is outside that authority. This is C37 rollback/convergence evidence with C46 external comparison; C21 resources and printed metadata fidelity remain adjacent concerns, not newly closed coverage.

## Current source and positive controls

`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

| Location | Observed behavior | Consequence |
|---|---|---|
| PRINT_HEADER_ID, line 10; state.printHeader, line 81 | Fixed textual label and a private reference slot already exist. | A stronger identity is available than a global lookup. |
| prepareForPrint, lines 3062–3125 | Runs restoreAfterPrint at entry, creates a fresh section, fills metadata, inserts it, runs six preparation helpers plus diagnostics, then stores state.printHeader. | Initial cleanup can run without any generated node. A later failure can leave an inserted node before its private reference is recorded. |
| restoreAfterPrint, lines 4361–4368 | Resolves document.getElementById(PRINT_HEADER_ID), removes that result inside catch, then clears state.printHeader. | Resolution can target a host replacement/duplicate; removal failure loses the reference. |
| capturePageStructureDiagnostics, line 3032 | headerConnected uses the same ID lookup. | It measures a matching element's connectivity, not the generated node's connectivity. |
| Print CSS, around line 3907 and the header style rules | Selectors give matching IDs special print treatment. | Cleanup identity correction alone does not establish print-content authenticity or CSS isolation. |

The intact path does remove its generated node, and preparation already holds the exact local `header` object. The root cause is the loss of that object identity when cleanup re-resolves a mutable string, compounded by late private receipt capture and unconditional clearing.

## Executed current-source evidence

The companion model extracts the actual insertion-to-reference-assignment tail, header cleanup slice and diagnostic expression into node:vm. Surrounding preparation helpers are stubs; one can deliberately throw. The minimal ordered-tree double models ID lookup in tree order, object identity, parent/child connectivity and controlled operation failures. It is not Chromium or a complete DOM emulator.

Seven named current-gap checks execute these source slices:

1. With no generated receipt, cleanup removes a pre-existing host node bearing the fixed ID. This matters because prepareForPrint calls cleanup before creation.
2. After the host removes H1 and inserts H2 with the same ID, cleanup removes H2.
3. Renaming H1 makes lookup miss it; cleanup leaves it connected but clears state.printHeader.
4. An earlier same-ID duplicate is removed while H1 remains. The test inserts the duplicate before H1 after preparation; it does not assume a body descendant stays earlier after WebClip prepends its section.
5. A controlled failure in the first post-insertion helper leaves H1 connected with state.printHeader still null. Subsequent renaming makes current lookup cleanup miss it. A simple state.printHeader?.remove() replacement would also miss this unrecorded partial installation without any rename.
6. A controlled remove failure leaves H1 connected but discards its private reference.
7. Diagnostics return true for a host-only match and false for a renamed generated node.

An eighth current-source check is a positive intact-path control. Injected failures establish control-flow limitations, not production incident frequency or a claim that ordinary native remove randomly throws. Real exception/reaction causes need current-browser evidence. The extracted tail does not exercise the full asynchronous preparation lifecycle.

## Fresh external sources and alternatives

Retrieved 2026-09-11. Facts are separated below from their application to WebClip.

| Source | Observed fact | WebClip inference / limit |
|---|---|---|
| [WHATWG DOM, getElementById](https://dom.spec.whatwg.org/#dom-nonelementparentnode-getelementbyid) | Returns the first matching descendant in tree order. | The lookup is textual selection, not a creation or generation receipt. |
| [MDN getElementById](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById) | Duplicate IDs resolve to the first match; detached elements are not found. | Same-ID replacement and renamed/detached cases require exact objects, not lookup fallback. |
| [MDN isConnected](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) | Reports connection to a Document, directly or indirectly. | Connectivity does not establish creator, correct admitted document, metadata integrity or PDF visibility. |
| [SingleFile official capture-hook example](https://github.com/gildas-lormeau/SingleFile/wiki/How-to-execute-a-user-script-before-a-page-is-saved) | Stores placeholder-to-original objects in a Map before replacing images, then restores through those objects after capture. | Concrete adjacent capture-time use of retained identities before effects. The example does not prove generation, host-adoption or partial-failure safety; it is not a production fix to copy. |
| [Microsoft compensating transaction pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | Compensation records prior effects and accounts for concurrent changes; compensation itself can fail. | Architectural support for retaining unresolved cleanup debt. This is an analogy, not browser evidence. |

A fresh search for SingleFile duplicate-ID issues returned a generic GitHub destination with an unrelated filename-template excerpt. It is excluded. No independently validated community prevalence or trend claim is made. The concrete user story is saving/cancelling PDF while a dynamic page rerenders, then continuing to use that page without losing a new page-owned element.

Randomizing the ID reduces accidental collisions but cannot establish cleanup authority. A selector plus an ownership-looking data attribute remains host-mutable. Removing all matches is worse. A late mutable state.printHeader lookup addresses some single-generation collisions but still loses partial installation and can target a newer generation. Never cleaning avoids deletions but leaves the normal intact temporary header behind.

The preferred P0-075 inert/frozen print representation reduces live-page mutation exposure. It still needs explicit metadata/resource/layout fidelity and ownership of its own temporary representation. This tranche defines an interim local contract, not adoption of a new architecture.

## Proposed receipt and outcomes

Create a private receipt after building the detached generated subtree and before its first insertion into the live document:

`{exactScope, printGeneration, node, ownerDocument, insertionParent, phase, outcome}`.

Keep generation identity immutable. Capture a bounded exact generated-subtree topology if using the conservative host-addition guard. Reserve capacity before effects; do not overwrite a pending receipt. A cleanup caller must hold the matching receipt/token, not dereference whatever global slot is current. P1-199 owns broader continuation/admission sequencing.

| Current observation | Allowed cleanup | Outcome |
|---|---|---|
| No receipt or stale generation | No mutation and no ID fallback. | Stale/no authority. |
| Exact node intact in admitted document and original insertion parent | Remove only that object. Changed textual ID alone does not retarget it. | Removed after observed settlement. |
| Exact node has no parent | No mutation; do not discover replacements. | Detached settlement for this receipt. |
| Root moved to another parent or generated descendant topology changed | Conservative proposal: leave the subtree intact. | Relinquished, explicitly degraded. |
| Owner document differs or removal throws/cannot be confirmed | Retain exact receipt; do not open a new preparation over unresolved effects. | Unknown debt. |
| Terminal receipt receives duplicate cleanup | No new effect, even if the host later reattaches the same object. | Historical terminal outcome, not proof of present absence. |

The model keeps one admitted local receipt, blocks new admission until terminal settlement and allows cleanup after ordinary generation admission is closed. Failure before insertion can settle detached; failure after an insertion effect retains the exact node for cleanup. A remove exception after the effect remains unknown until the next bounded observation sees detachment. No unlimited retry loop is proposed.

Exact root identity prevents retargeting, but does not automatically authorize deleting host additions inside that root. The model checks all recorded raw descendant relationships, including nested element, text and comment additions, and relinquishes on change. It also conservatively relinquishes a moved root. This extends the historical unconditional exact-root deletion recommendation without merging P1-219's image reparenting owner into P1-220.

The topology guard is deliberately incomplete: text/attribute edits on existing descendants, attached listeners, shadow trees, same-shape removal/reinsertion (ABA) and other semantic adoption are not detected. One named test demonstrates the ABA limit: identical observed topology still permits removal. Implementation must define observed ownership-loss behavior and validate its chosen scope; passing this model is not universal host-adoption safety. The bounded toy traversal is not a production memory/stack budget implementation.

Diagnostic output should use exact receipt identity plus admitted document/generation checks and bounded status values. Keep connectivity separate from cleanup settlement and metadata/renderer fidelity. Do not store serialized DOM or full URLs in ownership diagnostics. The current CSS ID exemption remains a separate P0-075/P0-004 representation-trust question; changing cleanup alone cannot close it. P1-218 resource attributes, P1-219 image wrappers, P1-221 existing href values and P1-214 remote settlement retain their own contracts.

## Validation and implementation gates

`node project_tools/test_p1_220_print_header_revalidation_model.js` produced **24 named PASS checks**: seven executed current-gap cases, one current positive control, fifteen proposed-contract cases and one explicit limit case. `node --check` passed. Assertions verify exact node survival, retained debt, no extra mutations, current token and terminal behavior, rather than source text alone.

This is reproducible research evidence. It is not runtime implementation, a full extension regression suite, browser PASS, actual PDF output inspection or P1-220 closure. The source-extraction anchors intentionally fail if the researched source shape changes, requiring evidence revalidation rather than silently reporting an obsolete result.

Implementation sequence: capture private receipt before insertion; replace textual cleanup authority with the exact generation receipt; preserve partial/unknown debt; bind diagnostics to exact identity; integrate the P1-199 lifecycle and bounded host-change policy. Then directly test success/cancel/failure, initial same-ID host content, duplicate ordering, replacement, renaming, partial insertion, cleanup retry, document/generation transitions and host descendant additions in the supported current browser. Verify informational metadata and the unchanged PDF/link/resource behavior separately. No native/release evidence is run here.

Delivery checkpoint: exactly this evidence file plus the companion model are the intended change. Branch from the recorded fresh main; PR body declares research-impact: owner; verify exact-head Repository Integrity, refresh main/head/mergeability and exact filenames, squash with expected head, then require the exact merge-SHA push run before reporting canonical completion. GitHub PR/run records supply delivery identities; this document does not preclaim their future results.

P1-220 remains **ACTIVE**. Runtime, manifest, Registry status and version are unchanged.
Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker, release policy/readiness/receipts, tags, GitHub Releases and deploy/publish remain untouched.
