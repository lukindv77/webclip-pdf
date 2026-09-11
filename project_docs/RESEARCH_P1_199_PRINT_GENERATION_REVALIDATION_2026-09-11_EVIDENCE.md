# P1-199 — current-main print generation revalidation

Date: 2026-09-11. Owner: P1-199, ACTIVE. Research only.
Baseline: `1977cb1f902e79eb76b4f8ae7a390df9b1f7ba9a`.

## Current authority and provenance

Fresh main, RESEARCH_REGISTRY.md, open PRs and research branches were checked. PR #230 remained open at `407d74d1c7ca897435af8be45d4c2a07ba4ed430`, diverged 2 ahead / 2 behind, merge base `122a041ced8d33618a92878c4e824202ea88e0d1`. It is superseded by this fresh-baseline revalidation, not imported or merged. Its two files were inspected as provenance only. The historical September 7 branch is likewise not authority. No new P-code is allocated.

Current requirements inspected: USER_REQUIREMENTS.md sections on frames, print representation and selected resources; DECISIONS_AND_RATIONALE.md sections on permission-gated frames and generation-owned temporary mutations; ARCHITECTURE.md frame-agent and print boundaries. These require exact document identity, permission-limited access and cleanup that preserves newer host state. Architectural statements describe the required behavior; current source below does not yet fully implement them.

Current canonical P1-200 and P1-201 refinements and the P1-214 distributed compensation refinement were read. Compared with #230, the substantive addition here is explicit composition with permission-era revocation and selection-session closure, plus execution of extracted current child functions to reproduce the races.

## Fresh source receipts

| File | Git blob at inspected baseline | Relevant mechanism |
|---|---|---|
| content.js | f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e | prepareRemoteFramesForPrint / restoreRemoteFramesAfterPrint, lines 615–639 |
| frame-agent.js | ce55145dc7ee1a4abf485b7fad3134ac39b61751 | prefetchSelected / preparePrint / restorePrint, lines 110–126 |
| service-worker.js | 6d61ac81befdbf2804ae9dbec425aa08d1194eb1 | sendFrameAgentCommand at 1972; TARGET handler at 2777 |

Top dispatch sends prepare-print with an empty extra payload. Its prepared set is keyed by frameId and filled only after the whole command loop returns. Restore clears the set before awaiting settlement. Those latter debt defects belong to P1-214.

The worker checks current host permission, a useful positive control, but its TARGET payload contains mode/clear/kind/locator and no printGeneration or permissionEra. sendMessage targets frameId only. Adding generation at top alone would therefore be insufficient: worker propagation/admission must change too. Exact document targeting remains P1-171.

Child prepare sets phase=printing, awaits prefetchSelected, and then appends a style without a post-await authority check. Resource warming itself awaits image decode between mutations. Child restore operates on singleton printStyle and changedAttrs. Neither function accepts a generation. This produces three reproducible current-source failures:

1. prepare A suspends; restore runs; A resumes and appends a style after cleanup.
2. A completes and is cleaned; B completes; late restore A removes B's current style.
3. A and B suspend; B completes then A completes; singleton ownership retains only A; restore removes A and leaves B's orphan style.

## Fresh external research and applicability

Sources retrieved on 2026-09-11. Platform facts, comparison observations and recommendations are separate.

| Source | Observed fact or report | Applicability and boundary |
|---|---|---|
| [Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage) | sendMessage supports documentId and frameId targeting and returns a response promise. | Use exact document targeting; this does not create application generation ordering or remote cancellation. |
| [MDN tabs.sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage) | Async response semantics; when several frames respond, one response is returned. | Explicit child identity and receipt validation are needed; cross-browser documentation is not physical Chrome evidence. |
| [Chrome worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Worker globals can disappear on shutdown. | A process-local counter alone cannot establish restart freshness; compose with P1-203. |
| [Chrome permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions) | contains, onAdded and onRemoved expose grant state and events. | Consent is an independent gate. These docs do not prove synchronous physical destruction of an already executing child. |
| [MDN Promise.race](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) | The returned promise settles from the first input settlement. | Inference: a local timeout is not a cancellation protocol for ongoing child mutations. |
| [SingleFile README](https://github.com/gildas-lormeau/SingleFile#readme) | Documents user cancellation by a second toolbar click and capture of selected content/frame. | Adjacent product confirms a real cancel-and-retry user story. Its HTML output and implementation are not proof of WebClip PDF rollback correctness. |
| [Chromium Extensions first-person discussion](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/6LqIT0D8ycM) | Author reports intermittent apparent message non-delivery; discussion highlights document targeting across navigation. | Qualitative developer report motivates exact identity diagnostics. It establishes neither failure frequency for WebClip nor a browser defect. |

Search boundary: searches sought Chrome/MDN messaging and SingleFile cancellation/frame issues. Some search hits resolved to generic homepages; no technical claim is based on those hits. Direct documentation pages and the first-person discussion were used. No public comparable implementation was verified to implement this exact generation/permission compensation protocol, and no popularity or broad usage trend is inferred from one product or report.

## Recommended identity and issuance contract

Use an exact reconciled scope containing tab, top document, child document, worker/re-handshake incarnation, permission-era receipt and selection-session identity. Within that scope, issue a strictly increasing safe-integer printGeneration from one authoritative coordinator. Issue before any child mutation and freeze the per-child envelope. Numeric values across different scopes are never ordered or compared as interchangeable authority.

Selection command sequence and selection state revision remain P1-200 concepts. A print operation captures admitted selection identity/revision; changed selection invalidates its admission rather than silently changing the selected content mid-prepare. printGeneration is not permissionEra, physicalOperationId, documentId or an authorization capability. Caller-supplied numbers require coordinator validation. Counter exhaustion requires a fresh reconciled scope, never wrapping.

Worker forwards only validated exact envelopes. Child echoes exact scope/generation in prepared, stale and closed responses. Top accepts results only against the still-current operation and exact child receipt, including after every await. Height/resource results are not timeless remote-frame state.

## Child state machine

Per exact scope keep bounded highest-admitted generation, closed-through generation, current preparation receipt and unresolved compensation status. A closed-through watermark is monotonic for the scope and rejects every prepare at or below it. The proposed ordered close(G) closes earlier work through G; cleanup never touches a newer generation. Only an admitted coordinator close may advance it.

| Event | Admission / transition |
|---|---|
| prepare(G) | Require current exact scope, consent and selection authority; reject closed/older G; duplicate current G returns status without repeating mutations. |
| newer prepare while old work/debt exists | Return busy/degraded until exact old compensation is settled or safely isolated by a separately proven mechanism. |
| close(G) before prepare(G) | Advance closed-through before cleanup; later prepare(G) cannot revive state. |
| awaited work settles | Recheck exact private receipt, scope, consent and closure before each next mutation, style insertion and response publication. |
| close(A) after B | Preserve B when B>A in the same scope; a different old scope is rejected entirely. |
| permission revoked | Close ordinary authority immediately; invalidate pending prepare continuations; exact cleanup is a separate restricted capability. |
| regrant | Fresh permission era plus reconcile/handshake; old era cannot publish or clean newer-era state even if its numeric generation is greater. |
| worker/document/session replaced | Invalidate old ordinary receipts; reconcile or clean exact old state before fresh admission. |

Closing logical authority precedes physical cleanup. Cleanup outcome cleaned/unreachable/unknown never authorizes ordinary work. A timed-out close cannot be labelled physically clean. Retain P1-214 debt and block unsafe reuse. Exact old-document disappearance may settle its debt from browser-owned evidence, never by retargeting the replacement document.

Resource warming needs checks after every asynchronous boundary, not just once at preparePrint return. Mutation records must remain private and operation-owned; an old continuation must not append into the new generation's changedAttrs. Under P1-218, restoration also compares the current attribute with the exact temporary value. Generation fencing alone does not prevent overwriting a host edit within the same generation.

## Ownership composition

| Owner | Responsibility preserved |
|---|---|
| P1-199 | Ordered print generation, close-before-late-prepare, continuation fencing |
| P1-200 | Selection session, command ordering, snapshot revision |
| P1-201 | Permission era, revoke/regrant, cleanup-only consent boundary |
| P1-203 | Restart re-handshake and reconstruction |
| P1-214 | Per-child issued/unknown/settled compensation debt |
| P1-218 | Exact temporary resource-attribute compare-before-restore |
| P1-171 | Exact document identity and transport target |
| P1-212 / P1-221 / P1-224 / P1-229 | Control activation / link restoration / frame styles / selected media geometry |

## Alternatives and trade-offs

Arrival order or one global printing boolean cannot reject late work. documentId alone protects navigation but not two operations in the same document. Ports can improve transport lifecycle visibility but do not establish generation or compensation semantics. Serializing prepares alone can block indefinitely on unsettled work; closure still needs prompt logical invalidation. A UUID alone identifies work but does not define older/newer closure; an ordered counter inside a fresh exact scope provides both.

Recommended first implementation uses one live mutation owner per child and blocks new admission on unresolved debt. This reduces throughput during failure but avoids unsafe overlapping restoration and minimizes temporary DOM retention. Bound frames, pending receipts, strings, resource budgets and recovery batches; do not queue unlimited closures. Retain compact watermarks until the scope is authoritatively retired. A fresh scope cannot discard live old mutation debt merely to reset a counter.

No new host permissions, page-content reads or remote services are needed. Diagnostics should store bounded identities/statuses, not page text or resource credentials. The main maintenance cost is coordinated top/worker/child protocol migration; a versioned handshake must fail closed when mixed old/new agents cannot echo required identity. No silent compatibility fallback to unversioned prepare/restore.

## Deterministic evidence and limits

Command: `node project_tools/test_p1_199_print_generation_revalidation_model.js`.

Result: 12 named checks PASS, including 3 current-source counterexamples and all 24 permutations of two prepare/two restore operations in the proposed synchronous model. Current functions are extracted from the inspected frame-agent source and executed in node:vm with controlled resource promises and a minimal style-node DOM double. The counterexamples demonstrate actual control-flow defects in those functions; they do not measure physical browser rendering or transport behavior.

Target checks cover early close, post-await cancellation, stale cleanup against B, duplicate prepare, unresolved debt, revoke during await, fresh regrant with numeric reset, old-scope rejection, document/worker/session separation and malformed generations. The model abstracts production admission, real DOM comparison, resource traversal, persistent recovery and platform event delivery. It is a specification experiment, not implementation validation. The fake DOM does not establish PDF fidelity. Source assertions intentionally require revisiting this evidence when implementation changes.

## Implementation and closure sequence

1. Define shared validated envelope and negotiated protocol; compose current P1-200/P1-201/P1-203 identity contracts.
2. Issue ordered print generations, create P1-214 per-child debt before dispatch, propagate through worker with exact document targeting.
3. Implement child receipt-local state, prompt closure and checks inside resource loops; implement P1-218 comparison ownership.
4. Validate top response/height acceptance and retain unknown compensation debt; never silently replay a failed mutating prepare.
5. Add runtime tests using delayed decode, duplicate/late prepare, old restore after new prepare, revoke/regrant, navigation, restart and mixed protocol agents.
6. Obtain direct current-browser engineering evidence with permitted fixtures before closure: inspect actual temporary DOM/style cleanup and selected PDF output, including uncertain/lost responses. This tranche does not perform that evidence run.

P1-199 remains ACTIVE pending runtime implementation and direct current-browser evidence. Research model PASS is not production PASS or release readiness.

Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker remains outside this change. Manifest/version, release policy, readiness, receipts, tags, GitHub Releases and deployment are unchanged.
