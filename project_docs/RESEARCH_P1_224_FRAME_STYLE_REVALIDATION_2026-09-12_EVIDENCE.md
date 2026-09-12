# P1-224 — frame style rollback, declaration footprints and repeated writes

Date: 2026-09-12. Owner: **P1-224, ACTIVE**. Research only.
Canonical baseline: `1e402464df83acffe86ed293353d12ec1ef00458`.
Current `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Baseline, scope and execution boundary

Fresh main, Registry, context manifest, open PRs/issues, relevant branches and tracked tree were inspected. No open PR/issue required continuation; no tracked AGENTS.md was present. Requirements, rationale, architecture, PDF/print family, comprehensive research and session policies were freshly read. Unchanged navigation, coverage, workflow and fidelity blobs were checked against already-read context. This continues the live-page cleanup sequence from P1-218 through P1-221 with the existing P1-224 owner; P1-222/P1-223 UI tasks are separate.

Historical branch `research/p1-224-frame-style-rollback-2026-09-08`, exact head `ccb19d53b515f65462b2f3009826634453e07245`, is provenance only: 3 ahead / 58 behind this main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. Its three files/commits are not imported. The current family already owns whole-style stale restoration. This tranche refines declaration footprints, repeat-write debt and helper coverage rather than introducing a new P-code.

The workspace execution environment was unavailable. GitHub source was read directly and the new pure-JavaScript model was compiled/executed in the available built-in JavaScript runtime before any push. The complete CommonJS file was also compiled and its entrypoint executed using explicit in-memory fs/path adapters supplying the exact fetched source and Registry. This is **not** local Node execution, node --check, native CSSOM or browser evidence. Mandatory Repository Integrity remains the independent Node/syntax and delivery gate.

The bounded question is whether frame/ancestor compensation preserves newer host declarations and markers across initial normalization, repeated sizing and partial cleanup. Current-source execution and deterministic outcomes fit this tranche; real CSSOM and physical iframe/PDF evidence remain explicit implementation gates. Coverage relation: C37 rollback/convergence, C46 external comparison, and selected-frame representation. No new campaign-wide completeness or closure status is claimed.

## Product requirement and current source

USER_REQUIREMENTS.md requires selected same-origin frames to remain usable selection scopes and prevents loss of long frame content solely because of fixed frame/scroll-container height. It also forbids cleanup from overwriting newer host changes. ARCHITECTURE.md and DECISIONS_AND_RATIONALE.md require exact generation-owned temporary mutations. P1-149's legitimate print-flow behavior must remain; P1-224 adds concurrent ownership, not removal of that behavior.

| Function / source location | Positive control | Current limitation |
|---|---|---|
| rememberFramePrintMutation, 3477–3490 | Captures before effects, keeps exact element, deduplicates and records frame/chain kind. | Only old whole style and old marker pairs; no temporary declarations, priorities, phase or generation. |
| applySelectedFramePrintFlow, 3492–3530 | Normalizes frame/ancestor flow, clamps initial frame height and writes explicit important priorities. | Many live writes, including overlapping shorthands/longhands, have no individual effect receipt. |
| restoreFramePrintMutation, 3532–3545 | One helper for both kinds. | Restores/removes entire style and both markers in one try; a style exception skips marker restoration. |
| markFrameChainsForPrint, 3547–3586 | Collects exact frame/ancestor objects and saves before changing them. | Resets the ledger at entry; repeating it can recapture a temporary baseline. |
| measureSelectedFrameHeightAtPrintWidth, 3588–3637 | Bounded measurement width and height; attempts return to normalized width. | Writes width/max-width for measurement and then unconditionally writes 100%; no private subphase/compare. |
| stabilizeSelectedFramePrintHeights, 3812 onward | Bounded repeated passes and height growth. | Additional height writes bypass any proposed initial-only receipt. |
| createFlattenedBodyFramePrintProxy, line 3770 | Uses a separate generated proxy. | Also sets the original frame display:none; its live declaration must join the same ownership record. |
| restoreAfterPrint, 4378–4381 | Reverse receipt traversal. | Clears all frame receipts even when the helper swallowed a failed restoration. |

The code also normalizes outer host-side elements of permission-gated remote frames. This evidence does not assert access to remote child DOM or prove remote-agent parity. Remote media/geometry and aggregate settlement remain P1-229/P1-214 concerns.

## Seven executed current-gap schedules

The companion extracts the actual remember/apply/restore helpers, frame cleanup loop and measurement function. The declaration double uses a Map and synthetic JSON serialization solely to model replacing/removing an entire style attribute. It does not parse CSS or emulate shorthand expansion; CSSOM-specific conclusions below are grounded in external documentation and remain browser-unverified.

1. For both frame and chain fixtures, whole-style cleanup restores old color after the host changed that unrelated property.
2. A newer touched position value/priority is overwritten with the old declaration.
3. With originally absent style, cleanup deletes a style attribute containing a new host declaration.
4. Both include/chain markers can resurrect old values after the host removes the temporary marker.
5. An injected style restoration exception skips marker restoration; the caller then clears the only receipt while temporary effects remain.
6. Resetting the preparation ledger before another save/apply reproduces rebasing onto the first temporary style. The reset is a fixture operation matching markFrameChainsForPrint's inspected entry statement; the full discovery function is not executed.
7. An injected child-height getter changes width during the extracted measurement function; the final 100% reset overwrites it. This is a controlled read-reaction schedule, not evidence that ordinary native scrollHeight getters execute arbitrary host code.

An eighth current-source check confirms intact frame/chain snapshots restore in the double. The injected exceptions test partial control flow and do not establish real browser exception frequency. Source execution is narrower than running the complete extension.

## Fresh external evidence

Retrieved 2026-09-12. Observations inform proposals; they do not automatically change WebClip requirements.

| Primary source | Observation | Consequence / limit |
|---|---|---|
| [CSSOM editor's draft](https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-setproperty), dated 2026-08-31 | Shorthand set/remove affects constituent longhands; setters can return without a change for unsupported/invalid inputs; declaration APIs serialize CSS state. | A method-name/value receipt is not necessarily the complete write footprint. Readback and CSSOM validation are required. This is a working draft, not evidence of all deployed implementations. |
| [MDN getPropertyValue](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/getPropertyValue) | Shorthand retrieval can return empty when constituent declarations are missing or priorities differ; values are canonically serialized. | Empty shorthand text is not proof that every affected longhand was absent. Raw source spelling and normalized declaration identity differ. |
| [MDN getPropertyPriority](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/getPropertyPriority) | Priority is independently observable, including important versus empty. | A host priority-only edit must be preserved; value-only comparison is insufficient. |
| [GSAP ScrollTrigger.saveStyles](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.saveStyles()/) | Records inline styles and reapplies that snapshot while discarding other inline changes on internal revert. | A concrete vendor alternative with stronger application ownership assumptions. Copying its whole-style strategy would violate WebClip's arbitrary-host-change contract. |
| [GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context()/) | Groups recorded animations and custom cleanup; revert clears existing work, but later additions are possible. | Useful lifecycle comparison; a library context alone does not prove WebClip close-before-late-prepare or host-value ownership. |

The search for public GSAP saveStyles/revert issues returned unrelated general “styles” results. Those hits are excluded; exact official pages were directly inspected. No validated new community prevalence, complaint frequency or trend is claimed. The user scenario is saving a long embedded document while responsive layout or application state changes, then continuing to use the page after print/cancel without reverting its newer layout.

## Recommended declaration and marker receipts

Prefer P0-075 normalization in a WebClip-owned inert/frozen representation. While the live path remains, record exact element/document/scope/generation and each effective declaration's original and temporary **presence, normalized value, priority**, plus phase/outcome. Markers use independent original/temporary presence-value pairs. Keep source style text only as provenance, never unconditional whole-attribute restoration authority.

Register receipts before effects. Deduplicate by element and effective declaration within one generation, retaining the first true host baseline. A later height/width/display write must update the same record only while the previous exact temporary state is still owned. Initial flow, measurement width/max-width, stabilization height and proxy-induced display changes all need this route. A source migration that edits only applySelectedFramePrintFlow misses real writers.

The model admits one generation until its pending rows settle. It rejects ordinary writes after close, permits exact cleanup, and prevents old cleanup from changing newer rows. Automatic takeover from the historical branch is not adopted: transfer would need a separate proven protocol preserving original state, partial effects and exact scope.

| Observation | Proposed result |
|---|---|
| Exact temporary declaration value and priority remain | Restore only that effective declaration. |
| Host changed value, priority or removed declaration | Preserve live state; superseded. |
| Unrelated property changed | Never include it in compensation authority. |
| Marker equals exact temporary pair | Restore original marker pair; handle empty and absent separately. |
| Marker differs | Preserve host marker, independent of CSS outcome. |
| Read/write failure, detached element or document mismatch | Retain bounded unknown debt; continue independent entries. |
| Receipt terminal or generation stale | No further mutation. |

A whole-function catch is insufficient: style failure must not suppress marker or other declaration cleanup. Do not clear unresolved records. New-generation admission remains blocked on unresolved mutation debt, while independent cleanup can continue.

## Shorthand footprint and serialization refinement

Current writes include inset plus overflow, overflow-x and overflow-y. Treat inset as the affected top/right/bottom/left declarations, and overflow as the affected x/y declarations for the supported current CSSOM. A host overflow-y change must not be overwritten by later restoration of an old overflow shorthand. Preserve each affected longhand's original priority, including mixed priorities.

Two possible implementations require evaluation: canonicalize the complete affected footprint and write/restore longhands individually; or allow a shorthand operation only with a proven full-footprint comparison and a safe plan for partial changes. The model deliberately rejects direct shorthand ownership and demonstrates separate x/y records. It does not implement a production shorthand parser, test inset expansion, or prove physical/logical-property order interactions.

Before a grouped write, reserve the entire required receipt capacity or make partial admission explicit. The toy model bounds individual rows; it does not implement atomic group reservation. A production implementation must cover aliases, logical/physical mapping, declaration order, unsupported properties and CSS-wide values on its actual supported property list.

Capture normalized post-write state, but do not adopt any arbitrary readback as owned: use a validated expected footprint and distinguish accepted, ignored and host-superseded effects. Nonthrowing setProperty is not proof that the intended style was applied. The model includes an ignored-write control using its double.

Property restoration does not reproduce original style text, shorthand spelling, declaration order or necessarily absence of the style attribute. Leaving an empty style attribute can affect [style] selectors. Removing it blindly can also erase newer host ownership. Exact attribute-presence/fidelity requires a separately justified guard and browser evidence; this model does not claim to solve it.

## Repeated writes, partial effects and residual limits

If height changes from host H to temporary T1 and then an attempted T2 fails, do not replace the original with T1 and do not forget T1. Retain H plus the last confirmed temporary state and the pending attempted state. The model tests failure both before and after the second effect: cleanup can reconcile either observed owned temporary value back to H. Unknown work blocks new admission.

Measurement normalization has its own temporary phase: measurement width should return to the still-owned normalized state, while final cleanup should reach the original host width. A flat snapshot captured at the wrong layer can restore the wrong baseline. The current measurement counterexample establishes the missing comparison; the proposed model does not implement the complete nested measurement state machine or rerun real layout.

Exact declaration equality cannot detect a host write that returns to the same value/priority (ABA), listener-based adoption or changed stylesheet/computed context. One explicit model case demonstrates that ABA still permits restoration. Compare-before-write is not a browser transaction; production must recheck scope around effects and validate actual reaction semantics.

Disconnected/adopted nodes retain unknown debt in the model. Real document teardown needs a bounded lifetime policy and truthful degraded outcome; a timeout is not proof of restoration. Superseded means preservation of newer host state, not an intact print or fully restored page.

## Performance, privacy and migration

Use bounded exact-node lookup and iterable pending rows; avoid quadratic repeated scans in a large ancestor set. Bound selected frames, affected declarations, marker entries, values and cleanup work. Skip no-op writes. Prefer an explicit shared mutation helper over duplicate snapshots, but keep topology, resource attributes and CSS semantics distinct.

Receipts stay private and ephemeral. Do not persist CSS text or complete attribute values in diagnostics: declarations can contain resource URLs and page data. Bounded property names, effect identifiers and outcomes suffice. No new network request, service integration or permission is introduced.

Migration order: inventory every live writer; define supported declaration footprints and normalized comparison; introduce private pending receipts; route initial/measurement/stabilization/proxy writes; implement independent conditional compensation and scope/debt settlement; validate actual browser CSSOM and print geometry. P1-149 retains long-frame behavior, P1-199 lifecycle, P1-218 resource attributes, P1-220 header identity, P1-221 href restoration and P1-214 remote settlement.

## Validation and delivery checkpoint

The exact candidate model compiled and executed in built-in JavaScript: **24 named checks PASS** — seven current-gap cases, one intact source control, fifteen proposed-contract checks and one explicit ABA limit. Its complete CommonJS entrypoint also executed with documented in-memory adapters and exact GitHub source/Registry strings. No local filesystem or Node executable was available; no local Node/syntax command result is claimed.

The model is a deterministic control-flow/declaration-state double, not a real CSSOM implementation. Required closure still includes supported-browser frame/ancestor fixtures, shorthand/longhand and priority behavior, serialization/attribute presence, nested measurement and repeated sizing, host changes after success/cancel/failure, partial cleanup, and actual selected-frame PDF completeness. P1-224 remains **ACTIVE**.

Exactly two files constitute this tranche: this evidence and `project_tools/test_p1_224_frame_style_revalidation_model.js`. Delivery requires fresh-main branch, research-impact: owner PR, exact-head Repository Integrity, fresh main/head/mergeability/two-file guard, expected-head squash and exact merge-SHA push CI. GitHub PR/run records supply final identities; no future CI result is preclaimed here.

Runtime, Registry, manifest and version are unchanged.
Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker, release policy/readiness/receipts, tags, GitHub Releases and deploy/publish remain untouched.
