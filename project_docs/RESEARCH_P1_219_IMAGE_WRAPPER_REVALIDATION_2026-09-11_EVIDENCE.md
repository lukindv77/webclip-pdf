# P1-219 — image-wrapper topology and partial compensation revalidation

Date: 2026-09-11. Owner: **P1-219, ACTIVE**. Research only.
Canonical baseline: `28a0af6ea5aa69321610ce766fdbc6f4b23ac469`.

## Current-baseline envelope

Fresh main, Registry, open PRs/issues, relevant branches and current tracked tree were inspected. No open PR or issue required continuation. No AGENTS.md was present in the tracked tree. Current requirements, rationale, architecture and the PDF/print family evidence were freshly read; unchanged context manifest, history/navigation, coverage and PDF fidelity contract blobs were compared with the already-read current documents from the preceding tranche.

P1-219 is the existing owner for structural image-wrapper rollback. The consolidated family already contains the original root cause, while P1-218 covers resource attributes. No new number or Registry status change is justified. This bounded refinement covers installation/cleanup effects and their local settlement, not a campaign-wide research completion claim. It relates to selected image/link representation and C37 rollback/convergence; physical PDF/browser evidence remains required.

Historical branch `research/p1-219-image-wrapper-rollback-2026-09-08`, exact head `731663d4244b53fc47aed719349a38dd9b17b5be`, was inspected only as provenance. It is 3 ahead / 55 behind this main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. No historical commits or permanently-red source gates are imported. Its in-place unwrap recommendation is refined below: following a wrapper into a different host parent is not automatically authorized.

## Product requirement and architectural context

USER_REQUIREMENTS.md section 5 requires images already inside links to preserve those links, and otherwise-unlinked images to retain safe navigation to their source where possible. DECISIONS_AND_RATIONALE.md requires generation-owned temporary wrappers and preservation of newer host state. ARCHITECTURE.md and WEBCLIP_PDF_FIDELITY_CONTRACT.md bind printed representation to admitted content/resource identity. None of these grants authority to reconstruct obsolete host topology after the site changed it.

P0-075's preferred inert/frozen printable representation avoids moving the live page's image. This tranche examines the current live-DOM implementation as an interim boundary; it does not replace the broader architecture or remove the user-facing image-link requirement.

## Fresh current source

`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

| Function / location | Existing positive control | Current missing authority |
|---|---|---|
| wrapUnlinkedImagesForPdf, lines 4000–4030 | Skips disconnected images and existing linked images; creates a new anchor; retains exact image, anchor, original parent and nextSibling. | Resets ledger at entry, performs two topology writes, then records the receipt. No generation, pending-install record or post-effect reconciliation. |
| restoreAfterPrint wrapper loop, lines 4339–4349 | Uses exact saved node objects and reverse order. | Reparents image to historical parent/nextSibling without proving current ownership, removes wrapper without inspecting host additions, catches errors and discards all receipts. |

The relevant installation sequence is insert wrapper before image -> move image into wrapper -> append receipt. The cleanup sequence is move image to old saved position -> remove wrapper -> clear receipts. Both contain a real intermediate state. A whole-function success/failure flag cannot describe which effects took place.

## Six source-executed counterexamples

The companion test extracts and executes the current wrap function and exact wrapper-cleanup loop in node:vm. A minimal ordered-tree double models moving an existing node, connectivity, siblings, raw child nodes and controlled operation failures. The double is not a browser and does not measure CSS/PDF behavior.

1. Host moves image from wrapper to Q. Current cleanup moves it back to original P.
2. Host moves wrapper and image together to Q. Cleanup again moves image back to P and removes the wrapper at Q.
3. Host adds a text node inside the wrapper. Cleanup moves only the image, removes the wrapper and disconnects the host text from the live page. The object is not memory-deleted, but its visible page content is lost.
4. Wrapper insertion succeeds and image append throws. No receipt was yet recorded, so cleanup leaves an untracked empty wrapper.
5. Image unwrap succeeds and wrapper removal throws. The wrapper remains connected but its receipt is discarded.
6. Site inserts a sibling after the wrapper but before the original nextSibling. Historical insertion before old nextSibling moves the image past that newer sibling, changing the site's current order.

These are current control-flow counterexamples, not measured production incident rates. The injected append/remove failures test architectural partial-effect handling; they do not assert that ordinary DOM operations randomly throw. Real causes and callback/interleaving semantics must be verified in current-browser fixtures.

## Fresh external evidence

Retrieved 2026-09-11; observations do not automatically create WebClip requirements.

| Source | Observed mechanism | Applicability / limit |
|---|---|---|
| [WHATWG DOM](https://dom.spec.whatwg.org/#concept-node-pre-insert) | Defines insertion/removal, existing-node movement, document adoption and mutation/custom-element processing hooks. | Parent/child topology is live state. A JavaScript operation sequence is not a transactional rollback of a historical tree. |
| [MDN insertBefore](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) | Inserting an existing node moves it; the reference node controls its new position. | Explains why saved-parent cleanup actively undoes a newer host move. |
| [MDN childNodes](https://developer.mozilla.org/en-US/docs/Web/API/Node/childNodes) | The live child list includes text and comments as well as elements. | Use exact raw child-node shape for destructive cleanup. children.length alone misses host text/comment additions. |
| [MDN remove](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove) and [replaceChild](https://developer.mozilla.org/en-US/docs/Web/API/Node/replaceChild) | Removal/replacement acts on the actual node relationship. | Neither API proves ownership or supplies generation fencing. A single replacement API is not proof of safe compensation under changed topology. |
| [Microsoft compensating transaction pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | Compensation must account for concurrent changes and can itself fail. | Supports recording intermediate effects and retaining unresolved local debt; this is an architectural analogy, not DOM evidence. |
| [SingleFile official user-script example](https://github.com/gildas-lormeau/SingleFile/wiki/How-to-execute-a-user-script-before-a-page-is-saved) | Example keeps exact placeholder-to-image references, replaces images before capture and restores through the placeholder's current parent after capture; documents asynchronous before/after hooks. | A concrete adjacent implementation comparison for capture-time topology restoration. The short example does not establish generation/host-adoption/partial-failure safety and must not be copied as WebClip correctness proof. |

Searches also sought SingleFile issues about image links and page mutation. Search hits sometimes resolved to generic homepages; those are not evidence. The exact official wiki was directly retrieved and inspected instead. No new community prevalence estimate or broad usage trend is inferred. Relevant user story: save/cancel a selected image's PDF while continuing to use the dynamic page, without losing the page's newer image position or content.

## Recommended private receipt

Record before the first live topology write:

`{exactScope, printGeneration, image, wrapper, ownerDocument, originalParent, originalNextSibling, phase, outcome}`.

Scope and generation compose with P1-199/document identity; exact object references remain required. The original placement is provenance, never unconditional reparent authority. A textual marker, ID or newly discovered element cannot replace the exact generated wrapper receipt.

Phases should distinguish planned, wrapper-inserted, image-wrapped, image-unwrapped and wrapper-removed (or equivalent effect receipts). Outcomes distinguish installed, restored, relinquished and unknown. An exception may occur after a partial effect; reconcile actual exact topology instead of assuming the entire operation did nothing. The model uses observed topology plus a pending receipt, not a full production phase journal.

## Conservative cleanup contract

| Current observation | Allowed effect | Result meaning |
|---|---|---|
| Exact current wrapper, same admitted document and original parent, raw childNodes exactly [image] | Unwrap at the wrapper's current slot; recheck before removing the now-empty wrapper. | Restored, only after observed settlement. |
| Image moved elsewhere; exact wrapper still eligible and empty | Never move image; remove only that exact empty wrapper. | Relinquished image topology; temporary empty wrapper removed. |
| Wrapper contains any added element, text or comment | No unwrap or wrapper removal. | Relinquished; host additions preserved, wrapper may remain. |
| Wrapper moved to another parent as a unit | Conservative proposal: no topology writes. | Relinquished; host location preserved, not a claim of complete cleanup. |
| Wrapper detached while still containing image | Do not reconstruct attachment from old parent/sibling. | Relinquished detached topology; no forced reattachment. |
| Document identity differs or an operation/read cannot be confirmed | No blind retry or retarget; retain bounded debt. | Unknown; unsafe new preparation remains blocked. |
| Different generation/receipt or already terminal result | No topology writes and no clearing newer records. | Stale/idempotent terminal response. |

Within the original parent, unwrap uses the wrapper's current position rather than the saved nextSibling. This preserves new neighboring nodes and does not need fallback append-to-end behavior. If the host moved the wrapper into another parent, the historical proposal to follow it is only an alternative, not established authority: the site may have adopted the wrapper itself. The recommended conservative first implementation leaves that subtree unchanged and reports relinquishment. A broader move-following policy needs its own proven ownership contract and browser evidence.

Raw childNodes must be checked, including whitespace and comment nodes. Even an empty exact generated wrapper is not universally safe to delete: wrapper attribute changes, identified host adoption or other observed loss of ownership should also relinquish removal authority. The structural model does not implement a complete host-semantic-adoption detector and cannot prove that no event listener or same-shape host write occurred. Those limits must remain explicit rather than labelling shape equality absolute ownership.

## Partial effects, reentrancy and debt

Reserve capacity and create the receipt before insertion. After inserting the wrapper, recheck generation, document and adjacency before moving the image. If image append fails, the receipt still identifies the inserted wrapper. Cleanup can remove an exact eligible empty wrapper without moving the image. A failed first insertion needs no invented successful effect; reconcile whether the wrapper is actually attached.

During cleanup, compare before each topology write with no intervening await. After moving the image out, reread wrapper parent/document/content before removing it. The model injects a synchronous host reaction that adds text between those two effects and confirms that the second destructive effect stops. This does not prove all browser reentrancy/custom-element behavior safe. If a reaction changes authority, preserve newer topology and report unknown/relinquished as appropriate; never repeatedly force the old shape.

An exception while removing the emptied wrapper must retain its receipt so an exact retry can clean only that wrapper. No blanket array reset may erase pending work. Later-generation admission cannot capture an old temporary wrapper as normal source state merely to bypass debt. A retry after terminal restoration must not move the image again after subsequent host edits.

P1-199 owns print-generation ordering/close-before-late-prepare. P1-218 owns attribute compensation separately. A local structural cleanup result must not stand in for resource-attribute restoration or P1-214 aggregate child settlement. Unknown structural debt remains nonterminal; relinquished topology is an explicit degraded outcome, not full restoration. Release/capture success must interpret the relevant fidelity contract independently.

## Alternatives, performance and defensive boundaries

The preferred P0-075 representation creates printable link semantics in an inert/frozen copy instead of moving the live image. It reduces this compensation surface but introduces resource identity, image state, layout and renderer fidelity work. It is not adopted by this research-only change.

A live interim helper can preserve exact private node references and use one admitted generation with bounded pending receipts. Lookup can use weak/exact-node maps plus a bounded iterable pending set. Budget wrapper count, discovery, mutations and per-pass cleanup; do not clone whole host subtrees into receipts or install unbounded whole-page observation. Reverse order alone is insufficient but can remain an execution preference.

Do not replace the source image with a clone to make cleanup easier: it may discard object identity/state and does not satisfy the existing live-page integrity requirement. Do not flatten all wrapper children or use innerHTML: doing so moves/deletes host additions. Do not treat a generated marker as a capability, or use parent/nextSibling to recover topology after host supersession. A never-clean strategy avoids stale moves but leaves every temporary link behind and is not the intact-case solution.

A topology check cannot detect structural ABA: image leaves wrapper and later returns to exactly the same shape. It also cannot discover arbitrary listener attachment or invisible host ownership changes. The model demonstrates this limit without declaring the stronger provenance problem solved. Mutation history could support conservative invalidation, but needs bounded observation and current-browser validation; it is not introduced here.

Security analysis is defensive and local: preserve page integrity, avoid retargeted cleanup and keep private receipts free of persisted DOM text/resource credentials. Diagnostics should contain bounded effect/status identifiers rather than serialized HTML. No new host permissions, provider integration or privileged page activation is needed. Link scheme/render safety remains P0-071, and changes to attributes of existing links remain P1-221.

## Validation, implementation path and closure

`node project_tools/test_p1_219_image_wrapper_revalidation_model.js` produced **23 named PASS checks**: six current-source counterexamples and seventeen target/limit checks. Target cases include intact unwrap, moved image/unit, text/comment/element additions, detachment, sibling insertion/removal, partial install, failed removal/retry, an immediate host reaction, stale generation, closed ordinary admission, document adoption, capacity, duplicate cleanup, forged-marker twin and structural ABA. Source syntax is checked before push.

The tree double models only the operations needed by these schedules. It does not execute Chromium, real MutationObserver/custom-element delivery, shadow/slot geometry, image network/resource behavior or PDF annotations. Some model outcomes deliberately relinquish cleanup and preserve the host subtree. Passing these checks is not runtime implementation, a full production regression result, browser PASS or owner closure.

Implementation sequence: introduce private generation-bound topology receipts before effects; replace wrapper installation and cleanup with guarded local primitives; integrate bounded unknown-debt handling and P1-199 continuation fencing; keep attribute/link/remote compensation separate; then validate actual runtime and browser schedules. Current-browser closure must prove image/link fidelity before print, preservation of host topology after success/cancel/failure, raw text/comment preservation, partial-effect settlement, current document/generation targeting and relevant resource/link regressions. Native/release evidence is not run in this tranche.

P1-219 remains **ACTIVE** pending runtime implementation and direct applicable current-browser engineering evidence. Two bounded research files are the complete change; runtime, manifest and Registry are unchanged.

Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker, release policy/readiness/receipts, tags, GitHub Releases and deploy/publish remain untouched.
