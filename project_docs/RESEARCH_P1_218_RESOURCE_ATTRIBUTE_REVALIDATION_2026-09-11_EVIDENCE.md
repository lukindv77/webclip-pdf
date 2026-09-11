# P1-218 — exact resource-attribute compensation revalidation

Date: 2026-09-11. Owner: **P1-218, ACTIVE**. Research-only refinement.
Exact current baseline: `be5926946745f3a175c517f708e24a4ee4f312de`.

## Scope, authority and provenance

Fresh main, current Registry, open PRs/issues and relevant branches were checked. No open PR or issue required continuation. The historical P1-218 branch is provenance-only: `research/p1-218-resource-attribute-rollback-2026-09-08`, head `b0f24d986abca1c1db8f8bb56b9f80f48e890f7d`, diverged 3 ahead / 54 behind current main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. Its claims were rechecked; none of its commits or tests is imported wholesale. In particular, the historical always-red source gate is not introduced into the canonical passing research suite.

Current authority read: CONTEXT_MANIFEST.json, USER_REQUIREMENTS.md, DECISIONS_AND_RATIONALE.md, ARCHITECTURE.md, RESEARCH_REGISTRY.md, RESEARCH_DELTA_INDEX.md, RESEARCH_HISTORY_INDEX.md, relevant consolidated PDF/print family and WEBCLIP_PDF_FIDELITY_CONTRACT.md. The family already assigns this root cause to P1-218; no new P-code or owner/status change is needed.

The bounded question is whether local top/child resource compensation preserves newer host attributes, remains generation-exact and reports failed restoration truthfully. It follows the canonical P1-199 print-generation refinement and composes with P1-201 consent and P1-214 distributed settlement. Existing consolidated family evidence remains the historical proof layer; this compact source-executed refinement adds current counterexamples and an executable proposed contract without rewriting the large losslessly retained family.

Coverage connection: C21 selected lazy/offscreen resources and C37 failure/rollback/convergence. Current Cycle2 Matrix retains findings and explicit external requirements; C46 stays an external/native boundary. This tranche provides fresh L1/L2 evidence, not L3/L4/L5 closure, a new campaign-wide completeness claim or a release qualification. Scope is bounded to local resource attributes; link, wrapper and frame-style owners remain separate.

## Current project requirement

The current PDF contract permits bounded materialization of resources already in the admitted selected scope. It prohibits replacing admitted content/resource generation silently. USER_REQUIREMENTS.md requires generation-owned compare-before-restore for temporary lazy-resource attributes. DECISIONS_AND_RATIONALE.md explains that newer host changes must survive. ARCHITECTURE.md describes the target invariant; source below still lacks that invariant. Successful attribute cleanup by itself does not prove the PDF used the correct responsive/decoded resource.

## Fresh source evidence

| File / Git blob | Current mechanism and positive control | Remaining gap |
|---|---|---|
| content.js / `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e` | rememberResourceAttribute at 3150 deduplicates exact Element + name and preserves first original presence/value; setTemporaryResourceAttribute at 3161 installs temporary values. | No installed-value receipt, generation or live comparison. restoreAfterPrint at 4326 restores old state unconditionally, catches errors and clears every receipt. |
| frame-agent.js / `ce55145dc7ee1a4abf485b7fad3134ac39b61751` | rememberAttr at 109 retains exact element and original presence/value; prefetchSelected at 110 promotes src/loading. | No installed value or generation; restorePrint at 121 restores unconditionally, catches errors and clears the array. |

Top promotion uses IMG src/loading/srcset and SOURCE srcset through the helper. Child currently promotes only IMG src/loading. Both retain actual element references, which is better than rediscovering a replacement by ID, but object identity does not prove attribute ownership. Top deduplication preserves the original baseline during repeated writes; it does not identify the latest temporary state or intervening host edits.

The test executes extracted current helper/cleanup code. For top, the exact resource-cleanup prefix of restoreAfterPrint is isolated from unrelated wrapper/link/style restoration. For child, rememberAttr and restorePrint are executed with a controlled attribute write between them, matching the prefetch call shape. A minimal Element double supplies raw attributes and injected setter failures; no browser DOM fidelity is inferred.

Six current-source counterexamples pass as expected defect reproductions, three for each executor:

1. src before -> WebClip temporary -> host-new -> cleanup incorrectly restores before.
2. loading lazy -> WebClip eager -> host removes attribute -> cleanup incorrectly recreates lazy.
3. Temporary state exists -> setter/remover throws during cleanup -> temporary state remains while the receipt array becomes empty.

The third observation refines local P1-218 outcome truth. P1-214 still owns whether distributed child cleanup was delivered/settled; it must receive the local outcome, not infer cleanliness from an empty array or `{ok:true}`.

## Fresh external research

All following pages were retrieved on 2026-09-11. Facts and comparative reasoning are distinguished.

| Source | Evidence used | Relevance / limit |
|---|---|---|
| [WHATWG DOM Standard](https://dom.spec.whatwg.org/#interface-element) | Defines attribute read/write/removal and MutationObserver records/queues. | Exact raw DOM attribute state is the comparison domain. The platform does not supply a WebClip generation receipt or generic attribute compare-and-swap transaction. |
| [MDN getAttribute](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute) | Missing attributes return null; existing attributes return strings. | Absent and present-empty must remain distinct. Do not conflate them with truthiness or compare parsed/resolved URL identity instead of actual attribute state. |
| [MDN MutationObserver.takeRecords](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/takeRecords) | Returns and empties queued mutation records. | An observer can support conservative dirty tracking, but its callback is not a synchronous ownership barrier. It does not establish the writer's identity. |
| [Microsoft compensating transaction pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | Restoring an original snapshot can overwrite concurrent work; compensation must account for it and can itself fail. | Supports preserving newer host state and retaining unknown cleanup debt. Database/distributed patterns are analogies, not browser implementation proof. |
| [SingleFile official repository](https://github.com/gildas-lormeau/SingleFile#readme) | Documents saving selected content/frame and cancelling processing. | Adjacent user story: capture a selected image/frame, cancel and keep using the live page. Its HTML capture behavior is not evidence of WebClip PDF compensation. |

Search scope included MDN attribute/observer behavior, concurrent compensation and SingleFile lazy-loading issues/public implementation. Search returned no usable issue results, and direct issue/source-page retrieval failed. No community consensus, frequency estimate, competitor internals or new user requirement is inferred. Official standards and distinct platform/architecture/product sources provide the evidence used here; exact peer implementation comparison remains unavailable.

## Proposed receipt and state contract

Each touched attribute receives a private receipt:

`{exactScope, printGeneration, element, ownerDocument, name, original:{present,value}, temporary:{present,value}, status}`.

The exact scope composes top/child document identity, permission era and relevant current selection/re-handshake authority. Generation validation is against coordinator-issued receipts, never an arbitrary caller's numeric ID. P1-199 owns ordering/closure; P1-218 owns each exact local write. A DOM data marker cannot authorize restoration.

| State / outcome | Meaning | Permitted next action |
|---|---|---|
| noop | Requested state already present; no mutation was needed. | Do not manufacture a cleanup write. |
| installed | Exact temporary state was installed and still owns its receipt. | Compare immediately before a further write or cleanup. |
| restored | Original state verified after a permitted restoration. | Terminal; duplicate cleanup performs no write. |
| superseded | Current attribute differs from the owned temporary value, or post-write observation shows a host reaction. | Preserve current host state; terminal for this receipt; do not retry destructively. |
| unknown | Read/write/identity could not be confirmed. | Keep bounded debt; block unsafe generation reuse; reconcile exact receipt. |
| stale | Cleanup/continuation belongs to a different current receipt or scope. | No DOM writes and no clearing of newer receipts. |

Unknown is not success. Superseded is successful relinquishment of local write ownership, not a claim that the original state was restored or that the PDF is correct. After restoration, later host edits remain legitimate; a cached terminal result does not describe timeless current DOM state.

## Write and cleanup rules

1. Validate current exact ordinary authority and selected scope before resource discovery or mutation. Reserve bounded receipt capacity before any write; exceeding capacity causes truthful degradation, not untracked mutation.
2. Capture original raw presence/value once. Record intended temporary state before attempting the write; retain unknown debt if a write throws. Avoid setters when current state already equals the requested state.
3. A repeated write by the same generation preserves the first original baseline and updates only its exact latest temporary state. Before rewriting, compare live state with the previous temporary state. If the host intervened, mark superseded and stop that generation's writes to the attribute.
4. Cleanup must validate its exact receipt and document, read live raw state and restore only if it equals the receipt's temporary state. No await is permitted between validation/comparison and the attempted write. Read after the write to classify immediate observable settlement; synchronous reentrant behavior is not assumed impossible.
5. Restore each attribute independently. A host srcset change cannot suppress restoration of an unchanged loading attribute. Presence-empty, absence and nonempty strings remain distinct. Raw strings are not normalized to resource URLs for this comparison.
6. Do not clear unknown records merely because a pass finished or an exception was caught. A failed repeated write may leave the previous owned temporary value, so mismatch with the newly attempted value cannot automatically mean host supersession. Retain unknown debt until explicit exact reconciliation; the model conservatively blocks reuse in this case. Keep reconciliation bounded and private; do not persist raw page resource URLs or DOM snapshots as diagnostics.
7. A detached node is not automatically a replacement node; never find a fresh node by selector for cleanup. If ownerDocument changes through adoption or document authority is uncertain, quarantine the receipt as unknown and require explicit reconciliation. Exact document disappearance may retire remote debt only under P1-214/P1-171 evidence.

## Generation and permission composition

Recommended first implementation: strict single active mutation generation per child/document. New preparation B waits until old A has settled or relinquished each local attribute receipt, together with P1-214's other child-level debt. This prevents B capturing A's temporary value as the host baseline. After A restores, B captures the true original; after host supersession, B captures the newer host state. Late A cleanup cannot mutate B.

Safe ownership transfer is an alternative: B could inherit A's original baseline only when exact generation/value ownership is proven. It requires more intricate transfer, partial-failure and lifecycle semantics. It is not needed for the first implementation, and the model does not claim to prove it.

P1-201 revocation stops ordinary writes/async continuations immediately. Existing exact cleanup may be attempted only through its narrow revoked-era compensation capability. P1-218's local comparison remains mandatory on that path. Cleanup unknown never reopens consent; regrant B establishes a fresh scope, and old cleanup A must not acquire B's authority. P1-203 restart requires re-handshake/reconcile, not counter reset plus reuse of old receipts.

## Limits of value comparison

Value comparison cannot distinguish a host writing the same temporary value, or an ABA sequence temporary -> host-other -> temporary. The model deliberately demonstrates this boundary: cleanup can then restore the original because live value equals temporary. This is not proof of writer provenance. It preserves the currently assigned value-supersession contract and does not silently expand it into a guarantee about every intervening same-value write.

A stronger provenance requirement would need a separately validated conservative mutation-observation protocol or an inert print representation. Observer records have no writer capability. Delayed notification and queued records must be handled explicitly; indiscriminate whole-page observation can also cause unbounded work. No such stronger protocol is approved or implemented here.

Likewise synchronous compare/read/write is not an atomic database CAS. The model checks a controlled immediate post-write host reaction, but does not establish browser custom-element callback, adoption, all resource side effects or arbitrary reentrancy behavior. P0-075's inert/frozen representation direction reduces live mutation exposure; generation/CAS-style compensation is an interim local safeguard, not a substitute for that architecture.

## Owner boundaries and trade-offs

P1-003 retains resource selection/loading budgets and readiness. P1-167 retains shared work budgets. P1-199 retains print ordering. P1-201 retains permission lifecycle. P1-214 retains distributed debt and aggregate settlement. P1-218 retains local resource-attribute receipt/restore truth. P1-219 topology, P1-220 generated nodes, P1-221 links and P1-224 frame styles remain independent. The historical P1-218 text grouped P1-223 with style rollback; current Registry instead assigns P1-223 to Create Folder browse-intent, so that historical attribution is not carried forward.

Per-attribute receipts preserve unaffected host behavior and need no extra host permission or external integration. The cost is additional bounded state and a shared top/child semantic helper or parity suite. Prefer O(1) exact-node/name lookup plus bounded iterable cleanup records; the current top linear dedup can compound with many repeated writes. Avoid a whole-page observer, unlimited historical receipt arrays or a new persistence subsystem without measured need. Unknown debt reduces availability temporarily but avoids silent destructive retries. Cleanup cannot reverse a network request already caused by resource loading; no such promise is made.

## Validation and implementation sequence

Executed locally: `node project_tools/test_p1_218_resource_attribute_revalidation_model.js` — **21 named checks PASS**, comprising 6 extracted-current-source counterexamples and 15 target/limit checks. JavaScript syntax also checked before push. Presence tests include all 9 original/temporary combinations of absent, empty and nonempty state. Other checks cover host replacement/removal, repeated writes and their failures, per-attribute independence, generation handoff, consent closure, unknown debt, ownerDocument mismatch, budgets, no-op, duplicate cleanup, immediate host reaction and the explicit ABA limit.

Target code is a proposed deterministic state machine, not runtime adoption. It abstracts validated transport/capability admission and uses an attribute double, not a renderer. It does not prove browser resource loads, PDF fidelity, mutation-observer attribution, physical permission cleanup, durable restart recovery or complete shared print admission. Local full-repository gates are not claimed: this session materialized the relevant source/docs through the connector; the independent exact-SHA Repository Integrity gates remain mandatory.

Recommended implementation order: define the private receipt helper and exact generation API; route top and child resource writes through it; replace both unconditional restoration loops; propagate local outcomes into P1-214; integrate P1-199 continuation and P1-201 cleanup admission; add current runtime and browser evidence. Real current-browser engineering closure must exercise top IMG/SOURCE and permitted cross-origin IMG, host edits/removal during delayed resource work, cancellation/failure, repeated print, permission revoke/regrant and actual post-cleanup DOM/PDF observations. Native/release evidence is not performed by this tranche.

P1-218 remains **ACTIVE** pending runtime implementation and direct applicable current-browser evidence. Research PASS is not production PASS.

Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Manifest/version, release policy/readiness/receipts, existing S0-F portability blocker, tags, GitHub Releases and deploy/publish remain untouched.
