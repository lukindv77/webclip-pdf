# WebClip — Wave 3 selection / PDF fidelity / frame representation implementation readiness — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/wave3-fidelity-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS SYNTHESIS**

This document does not change production runtime, Registry status, manifest/version, build, tag, release or deployment.

The objective is to convert the already-covered Wave 3 findings into one source-ready implementation architecture without inventing a second identity system beside Wave 1 and Wave 2.

---

## 1. Canonical status at tranche start

Fresh `main` was rechecked immediately before the first write:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

The preceding Wave 2 branch was also reconciled against the same main:

```text
research/wave2-browser-lifecycle-readiness-2026-09-09
status     = ahead
behind_by  = 0
ahead_by   = 3
changed    = project_docs/** + project_tools/** only
```

Therefore Wave 3 starts from the exact production baseline, not from an accumulated research branch.

Project-wide research state remains:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
implementation closure          = INCOMPLETE
release regression              = INCOMPLETE
release readiness               = NOT READY
Yandex L5                       = DEFERRED TO FINAL EXTERNAL STAGE
```

No new P-code is allocated by this tranche. `P1-231` remains unallocated.

---

# Part I — exact Wave 3 owner denominator

## 2. Wave 3 owners

The project-wide production-entry synthesis already assigned exactly 16 ACTIVE owners to W3.

### W3-A — reversible temporary representation

```text
P1-218  resource-attribute compare-before-restore rollback
P1-219  image-link wrapper exact structural rollback
P1-220  print-header cleanup exact generated node receipt
P1-221  link-normalization private exact rollback authority
P1-224  frame/ancestor style/marker compare-before-restore
```

### W3-B — selection / geometry authority

```text
P1-001  restored selection rendered-target admission
P1-154  aggregate Include/Exclude budget before all materialization/export
P1-226  same-origin iframe geometry transforms/zoom composition
P1-228  rendered-intent manual selection candidate/geometry authority
P1-230  bounded user-reached dynamic/virtualized history
```

### W3-C — renderer / frame fidelity

```text
P0-004  selected PDF complete + selection-bounded fidelity
P1-003  actual selected visual resource graph readiness
P1-150  >200000px same-origin selected iframe truthful outcome
P1-187  flattened iframe renderer-owned/current rendered state
P1-212  no synthetic page-control activation during print preparation
P1-229  remote-frame media/geometry selected-only contract
```

The owner split is organizational only. Canonical single-owner authority remains in `RESEARCH_REGISTRY.md`.

---

# Part II — fresh source contradiction sweep

## 3. Current source still has five independent rollback mechanisms

Fresh `content.js` contains independent temporary state:

```text
changedLinks
wrappedImages
changedResourceAttributes
changedFrameStyles
printHeader / printStyles / flattenedFramePrintProxies
```

This is the core W3-A architectural smell: the operation does not have one generation-owned transaction/ledger through which every temporary live-DOM mutation passes.

### 3.1 Resource attribute restore is unconditional

Current `rememberResourceAttribute()` stores only:

```text
before: had/value
```

Current `restoreAfterPrint()` later writes the old value back unconditionally.

If the host changes the same attribute after WebClip's temporary write, stale cleanup can overwrite the newer host value.

This is exact P1-218.

### 3.2 Image wrapper rollback can stale-reparent a host-owned image

Current `wrappedImages` stores:

```text
image
link
parent
nextSibling
```

Rollback tries to put the image back under the remembered parent/next sibling.

The record does not itself prove that the current topology is still the topology WebClip installed. Host reparenting after admission can therefore collide with cleanup authority.

This is P1-219.

### 3.3 Link rollback uses a page-visible marker as old-value storage

Current `absolutizeLinksInIncludedContent()` writes the original href into:

```text
data-webclip-original-href
```

and later restores `href` from that DOM attribute.

The page can observe/mutate that marker, and the old value is not private operation authority.

This is P1-221 and the P0-075 trust-boundary adjacency already documented by prior evidence.

### 3.4 Header cleanup uses textual identity

Current cleanup includes the equivalent of:

```text
document.getElementById(PRINT_HEADER_ID)?.remove()
```

The correct authority is the exact node WebClip created, not whichever current node happens to own the same textual id.

This is P1-220.

### 3.5 Frame style rollback restores the whole old style attribute

Current `rememberFramePrintMutation()` snapshots:

```text
oldStyle = element.getAttribute('style')
```

and `restoreFramePrintMutation()` replaces/removes the entire inline style attribute.

A host change to any inline style property after WebClip preparation can therefore be overwritten by stale cleanup even if WebClip touched only a small subset of properties.

This is P1-224.

### 3.6 Current source conclusion

No independent new root cause exists. The five owners are all manifestations of one missing implementation primitive:

```text
one operation-owned reversible mutation ledger
```

---

## 4. Current selection authority is still raw target + one box

Fresh top `content.js` still admits a candidate using a projected `getBoundingClientRect()` with a minimum size threshold.

Fresh `frame-agent.js` still uses:

```text
ev.target
getBoundingClientRect()
width >= 2
height >= 2
```

for remote manual selection.

Current source therefore still has the P1-228/P1-001 shape proven by the physical/managed-browser evidence:

```text
raw page hit-test winner
        +
one axis-aligned union box
        =
selection authority
```

That abstraction is too strong for:

- transparent hit-test interceptors;
- visible pointer-inert descendants;
- disabled controls whose click never commits;
- multiline fragments;
- transformed geometry;
- clipped descendants;
- SVG/clip-path shapes;
- restore targets that are structurally strong but currently invisible.

No current source path establishes a richer rendered-target admission receipt.

---

## 5. Selection snapshot still post-hoc truncates scope

Current `selectionSnapshot()` accumulates local and remote locators and returns:

```text
includes: includes.slice(0, 250)
excludes: excludes.slice(0, 250)
```

This remains the direct P1-154 contradiction:

```text
live selection authority
!=
portable snapshot authority
```

if total scope exceeds the portable limit.

The correct boundary is admission before mutation/materialization/snapshot, not truncation after the user has already created a larger semantic selection.

---

## 6. Current source still has no user-reached virtual-history ledger

The accepted P1-230 physical evidence already proved:

```text
user gradually sees logical items 1..57
virtualizer recycles DOM
user scrolls back to top
physical PDF contains only current 1..8 window
```

Fresh current source still has no operation/session-owned structure that preserves previously materialized logical content or maximum user-reached logical boundary.

The existing selection-time `scroll` listener schedules outline updates; it is not capture-history authority.

Therefore W3-B must add a bounded history model rather than trying to reconstruct missing logical content at final print time from the current DOM.

---

## 7. Current same-origin iframe path still silently clamps at 200000px

Fresh `content.js` still contains `Math.min(200000, ...)` in multiple selected-frame height paths:

- remote prepared height;
- selected-frame print flow;
- same-origin measured height;
- stabilization target height.

Fresh C16 physical evidence already established the exact consequence:

```text
required height ≈ 210016px
current applied height ≈ 200004px
4200 selected rows exist
current PDF loses the tail
causal top-flow representation prints all 4200 rows
```

The 200000px limit is a useful safety limit but cannot be a silent fidelity transform.

W3-C therefore treats it as an **admission boundary**, not an output clamp.

---

## 8. Current remote-frame representation still has media/geometry disagreement

Fresh `frame-agent.js` still installs:

```text
interactive selection outline: @media screen
selected-only filtering:       @media print
```

while the worker still explicitly uses:

```text
Emulation.setEmulatedMedia({ media: 'screen' })
```

before `Page.printToPDF`.

The worker's screen-media policy is intentionally retained because site-owned `@media print` must not be allowed to erase explicitly selected content.

The defect is the child representation contract, not the existence of screen emulation.

Fresh remote-frame evidence already proved that the current combination can:

- print selected content;
- also print Excluded/unselected child content;
- rasterize WebClip green/red interactive outlines;
- size the frame from full/pre-filter child height.

Therefore W3-C must make filtering, UI suppression, resource graph and geometry properties of one exact remote representation generation.

---

## 9. Current preparation can still request synthetic page-control activation

Fresh `content.js` still contains a print-preparation path that calls:

```text
triggerInternalClick(control)
```

which in turn calls:

```text
control.click()
```

The existing host-control activation guard is an important safety control, but P1-212 requires a stronger architecture rule:

> Print preparation itself must not depend on synthesizing page-owned control activation.

A blocked dangerous call is safer than an unguarded call, but it is still the wrong representation protocol.

---

# Part III — browser/platform architecture inputs

## 10. `getClientRects()` is a useful minimum geometry input

Current external platform documentation confirms that `Element.getClientRects()` returns one DOMRect per CSS border box and therefore multiple rectangles for multiline inline content.

That directly addresses a current P1-228 failure where a union AABB contains a large visually empty gap.

It is not sufficient for all cases:

- clipping can remove part of those boxes;
- clip-path/masks/SVG painted geometry can remain more complex;
- transforms may require quads/matrices.

Therefore W3 does not replace one over-approximation with another and call it exact.

---

## 11. `checkVisibility()` is admission input, not visibility proof

Current platform documentation supports checks for:

- missing associated box;
- visibility state;
- opacity=0;
- content-visibility state.

But the same documentation explicitly warns that `true` does not prove that an element is actually visible to the user; it may be outside the viewport or occluded.

W3 therefore uses it as one input to `RenderedTargetAdmission`, not as the full P1-228 oracle.

---

## 12. DOMQuad / transformed geometry is a useful optional input

Current Geometry APIs can represent quadrilaterals rather than only axis-aligned rectangles. This is valuable for transformed candidates/frame boxes where a union bounding rect greatly overstates actual occupied region.

Implementation should use the strongest bounded geometry source available in the supported Chrome environment, while keeping an explicit `precision` classification when exact painted shape cannot be proven.

---

## 13. CDP DOMSnapshot is an oracle, not the production renderer

Current DevTools Protocol `DOMSnapshot.captureSnapshot` can produce a flattened DOM/layout/style snapshot and can include DOM rectangles and paint order.

This is useful for:

- independent geometry diagnostics;
- validating source/representation scope;
- comparing selected representation before physical render;
- current state such as source URLs/layout facts where exposed.

It is experimental and does not by itself produce the user's PDF or solve every rendered-state/resource problem.

Therefore the recommended role is:

```text
L3/L4 diagnostic/oracle
not
new canonical WebClip renderer
```

---

## 14. `scroll` event truth is not sufficient user-boundary authority

P1-230 requires the maximum range the user personally reached, not a range manufactured only by WebClip preparation or arbitrary host automation.

`scroll` is a high-frequency browser event and should not trigger expensive capture work directly.

Additionally `Event.isTrusted` distinguishes browser-generated from `dispatchEvent()` events, but browser-generated events can also originate from programmatic browser methods. It is not a general synonym for "physical user intention".

Therefore W3 must correlate boundary advancement with a bounded **user-input intent receipt**, rather than trust every scroll event in isolation.

Candidate intent inputs include trusted wheel/touch/pointer/keyboard interactions plus a short bounded settle window. The exact implementation can be refined during implementation, but the security invariant is fixed:

```text
host-only synthetic/programmatic scroll without accepted user intent
must not enlarge WebClip's capture boundary
```

---

# Part IV — W3-A architecture: Reversible Page Mutation Ledger

## 15. One ledger per exact print/capture generation

Introduce one private content-script object conceptually:

```text
PageMutationLedger {
  version
  mutationGeneration M
  physicalOperationId P
  sourceGeneration S
  selectionRevision SR
  state: open | sealing | rolled-back
  records[]
  conflicts[]
}
```

`M` is not `P`, not W2 `FS`, and not remote print generation `R`.

It is a local live-representation mutation generation.

Every live page mutation performed for one PDF representation must pass through this ledger.

No new mutation family may create another free-standing `state.changedSomething` rollback authority.

---

## 16. Scalar attribute mutation receipt

Conceptual record:

```text
AttributeMutationReceipt {
  M
  nodeRef
  attributeName
  before: { present, value }
  applied: { present, value }
}
```

Rollback rule:

```text
if current == applied:
    restore before
else:
    preserve current host state
    record rollback-conflict
```

This directly solves P1-218 for `src`, `loading` and related temporary resource attributes.

It also supplies the primitive for P1-221 link normalization.

---

## 17. Link normalization must keep old href privately

Do not use a page-owned `data-webclip-original-href` as authority.

Conceptual receipt:

```text
LinkMutationReceipt {
  M
  nodeRef
  beforeHref
  appliedAbsoluteHref
}
```

The original value remains only in private extension-world state.

If a page changes `href` after WebClip applies the absolute value, rollback preserves the newer host value.

A DOM marker may exist for non-authority diagnostics only, but cleanup must never trust it to decide the old href.

---

## 18. Per-property style rollback

P1-224 must not restore the entire old `style` attribute.

Each touched property receives a receipt:

```text
StylePropertyMutationReceipt {
  M
  nodeRef
  property
  before: { present, value, priority }
  applied: { present, value, priority }
}
```

Rollback compares only that exact property to the applied value.

Unrelated newer host inline-style properties are never overwritten.

The same contract applies to WebClip frame-chain marker attributes.

---

## 19. Structural wrapper receipt

P1-219 needs a structural CAS, not just remembered coordinates.

Conceptual record:

```text
WrapperMutationReceipt {
  M
  wrapperRef
  imageRef
  originalParentRef
  originalNextSiblingRef
  installedParentRef
}
```

Safe rollback requires:

```text
wrapper is exact WebClip-owned wrapper
AND
image is still child of that exact wrapper
AND
original parent remains a valid target
```

If host code reparented the image, WebClip must not pull it back to an old parent.

An empty exact WebClip wrapper can still be removed if ownership is proven.

---

## 20. Generated-node exact receipt

P1-220 print header/style/proxy cleanup uses exact node references:

```text
GeneratedNodeReceipt {
  M
  nodeRef
  kind
}
```

Cleanup removes exactly `nodeRef` if it is still WebClip-owned.

Textual DOM id is not cleanup authority.

---

## 21. Remote-frame mutations consume W2 `R`

Frame-agent live resource/style mutations must use the same compare-before-restore rule, but their owner tuple includes:

```text
FS = frameSessionGeneration
PG = permissionGeneration
R  = remotePrintGeneration
```

A stale `restore(R1)` must not touch state owned by `R2`.

This composes W2-B and W3-A rather than duplicating them.

---

## 22. Disconnect/failure cleanup

During active print preparation, W2 lifecycle ownership provides a renderer-worker lifecycle channel.

If the worker disappears while the live page is mutated:

```text
content/frame-agent detects lifecycle loss
-> rollback exact open M/R
-> preserve newer host conflicts
-> return to safe idle/degraded state
```

A page navigation naturally destroys its document and does not need stale reconstruction into the replacement document.

---

# Part V — W3-B architecture: rendered selection and user-reached authority

## 23. One exact CaptureAdmissionReceipt

Introduce a receipt conceptually:

```text
CaptureAdmissionReceipt {
  version
  physicalOperationId P
  sourceGeneration S
  applicationGeneration AG
  selectionRevision SR
  topDocumentId
  selectionCapacityReceipt
  selectionItems[]
  frameSessions[]
  userReachedHistoryReceipt
  visualStateReceipt
}
```

The receipt is created from the exact current selected source and then becomes the semantic input to representation preparation.

A later PDF must not rebuild selection scope from whatever mutable markers happen to remain in the DOM.

---

## 24. Selection items need private identity plus portable locator

Each live selection item has two roles:

### Live authority

```text
private exact node/document/frame handle
+ exact selection revision/session
```

### Durable portable meaning

```text
SelectionSnapshot locator
```

The locator is not live capability.

This separation is required for P0-080/W1 source authority and P1-001 restore semantics.

---

## 25. RenderedTargetAdmission

Manual selection and restored selection must call the same admission primitive.

Conceptual result:

```text
RenderedTargetAdmission {
  status: admissible | not-admissible | ambiguous
  visibilityInputs
  renderedRegion
  reason[]
}
```

At minimum it consumes:

- connected/current exact document authority;
- `checkVisibility()` with opacity/visibility/content-visibility checks where available;
- fragment geometry;
- clipping/transform knowledge;
- candidate/hit-test context when applicable.

P1-001 structural score is allowed to identify a candidate but cannot bypass this final admission.

---

## 26. Candidate discovery separates rendered intent from page event target

For pointer-based manual selection, raw `event.target` becomes one candidate input, not the answer.

A bounded candidate set may combine:

```text
raw event target
composedPath candidates
bounded elementsFromPoint stack
bounded semantic ancestors
bounded visible descendants around the hit parent when needed
```

This permits:

- demoting a transparent interceptor;
- allowing a visible pointer-inert descendant as a candidate;
- selecting a logical ancestor even when a child covers all pixels.

Candidate traversal must obey P1-160/P1-168 budgets and cannot scan an arbitrary full DOM on every mousemove.

---

## 27. RenderedRegion uses fragments, not only one union box

Conceptual shape:

```text
RenderedRegion {
  precision:
    exact-fragments |
    transformed-quads |
    clipped-approx |
    ambiguous
  fragments[]
  bounds
  clipChainSummary
}
```

For ordinary fragmented text, `getClientRects()` provides a much better representation than one union `getBoundingClientRect()`.

For transformed boxes, a quad/matrix input may be used where available.

For clip-path/masks/SVG or other geometry that WebClip cannot prove exactly, the result remains `ambiguous` rather than pretending the AABB is exact.

---

## 28. Overlap is a three-state decision

Current hard boolean overlap is too strong.

New contract:

```text
definite-overlap
definite-disjoint
ambiguous
```

Only `definite-overlap` may automatically reject a new independent Include.

`ambiguous` must not silently become hard rejection from a known over-approximation. Product UI can request explicit user confirmation or preserve the selection with degraded geometry diagnostics.

This is the minimum truthful P1-228 semantics without attempting a pixel-perfect CSS/SVG computational geometry engine.

---

## 29. Same-origin frame projection

P1-226 requires one transform-aware mapping through every same-origin iframe ancestor.

The implementation must account for:

```text
child viewport geometry
iframe content-box offset
iframe border
CSS transforms / zoom / scale
ancestor frame transforms
nested frame chain
scroll offsets
```

The exact implementation can use geometry APIs/quads/matrices appropriate to supported Chrome, but the final projected region must use the same model for:

```text
hover preview
selected outline
candidate usability
overlap authority
```

No separate "outline geometry" and "selection authority geometry" models.

---

## 30. One aggregate SelectionCapacityReceipt

P1-154 requires top + same-origin + remote scope to share one capacity authority before commit.

Conceptual receipt:

```text
SelectionCapacityReceipt {
  version
  selectionSession
  maxIncludes
  maxExcludes
  maxSerializedBytes
  admittedIncludes
  admittedExcludes
  admittedBytes
}
```

A remote frame-agent cannot independently accept 250 and later rely on top-level slicing.

Remote agent proposes a delta; the top/session authority admits or rejects it against the aggregate budget.

Consequences:

```text
selection UI scope
portable SelectionSnapshot scope
PDF scope
Journal scope
```

remain the same admitted set.

---

# Part VI — P1-230 user-reached dynamic/virtualized history

## 31. Boundary and history are distinct

P1-230 needs at least two concepts:

```text
UserReachedBoundaryReceipt
UserReachedMaterializationLedger
```

The boundary answers:

> how far did the accepted user interaction actually reach?

The ledger answers:

> what logical/rendered content was actually materialized inside that boundary before the page recycled it?

Current mounted DOM at save time answers neither question completely.

---

## 32. UserReachedBoundaryReceipt

Conceptual per-scroll-context state:

```text
UserReachedBoundaryReceipt {
  contextGeneration
  document/frame/application generation
  acceptedInputGeneration
  maxScrollOffset
  maxLogicalExtentObserved
  updatedAt
}
```

The maximum never decreases when the user scrolls back upward.

WebClip must not enlarge it through its own candidate centering/print preparation.

Host-only programmatic scroll without an accepted user-input intent receipt cannot automatically enlarge it.

---

## 33. Accepted user-scroll intent

Do not treat every `scroll` callback as proof of physical user intent.

Use a bounded correlation model such as:

```text
trusted wheel/touch/pointer/keyboard intent
-> short settle window
-> observe resulting scroll context state
-> advance boundary at most to the actually presented state
```

This is not a license for continuous expensive DOM scans.

Observation is throttled/coalesced and bounded.

The precise input matrix belongs in implementation tests; the authority requirement is fixed here.

---

## 34. UserReachedMaterializationLedger

Conceptual structure:

```text
UserReachedMaterializationLedger {
  contextGeneration
  maxItems
  maxNodes
  maxTextBytes
  maxSerializedBytes
  maxObservationTime
  observations[]
  coverageStatus
}
```

An observation captures an inert bounded representation of content that is currently materialized inside accepted user-reached scope.

The ledger does not scroll the live page to seek new content.

---

## 35. Reused node != reused logical content

A virtualizer may reuse one DOM node:

```text
node A = VR-003
later
node A = VR-052
```

History identity must include current logical/rendered content identity, not only live node identity.

The model therefore records distinct observations for the two logical states.

---

## 36. Exact merge may be impossible generically

Generic pages do not guarantee stable item ids.

Therefore W3 must distinguish at least:

```text
retained-live
stable-reconstructed
ambiguous-history
overflow
```

`retained-live`:
- user-materialized nodes remain in DOM;
- existing normal print path can use them.

`stable-reconstructed`:
- bounded observations establish a stable sequence/identity sufficient to build one inert static history representation.

`ambiguous-history`:
- WebClip saw content but cannot prove a duplicate-free exact merge/order after virtualization.

`overflow`:
- capture-history budget was exceeded.

Only the first two may support a full fidelity claim for that scope.

The latter two require `partial/degraded/unknown` or explicit failure according to product policy.

Silent full success is forbidden.

---

# Part VII — W3-C representation architecture

## 37. Do not universally flatten the document

The current physical evidence contains important positive controls:

- ordinary long selected same-origin non-BODY content can print fully;
- ordinary nested same-origin selections can print fully;
- direct Chromium handles many layout primitives correctly;
- universal clone/materialization itself introduces P1-187 state loss.

Therefore the architecture is:

```text
use direct Chromium rendering where proven
+
materialize only problematic boundaries
```

not:

```text
clone/flatten every selected document
```

---

## 38. RepresentationPlan

For each selected scope, create an explicit plan:

```text
RepresentationPlan {
  scopeId
  mode:
    direct-live-flow |
    live-expanded-frame |
    static-materialized-subtree |
    remote-selected-frame |
    dynamic-history-materialization
  requiredMutationGeneration
  requiredFrameSession/generation
  resourcePlan
  expectedCompleteness
}
```

The plan is fixed before the physical render cut and becomes part of the representation receipt.

---

## 39. Same-origin over-bound iframe handling

The 200000px bound becomes a branch condition:

```text
if measured selected representation <= safe live bound:
    use proven live-expanded-frame path
else:
    attempt bounded static materialization
```

If bounded static materialization is complete:

```text
status = full
mode   = static-materialized-subtree
```

If it cannot be proven complete under P0-064/P1-187 resource/state budgets:

```text
status = degraded / failed
```

Never:

```text
height = min(required, 200000)
status = full
```

This is the direct P1-150 closure shape.

---

## 40. Static representation preflight

Before the first expensive clone/materialization, preflight:

```text
node count
text bytes
estimated style bytes
image/canvas pixel budget
resource count
expected serialized bytes
time budget
```

P0-064 is the existing positive-control architecture for preflight-before-clone.

Do not reintroduce a "clone everything and stop styling after 2500 elements" shape.

---

## 41. P1-187 renderer-state adapters

A static same-origin frame representation needs typed state materialization for state that `cloneNode(true)` does not preserve faithfully.

Minimum acceptance families already proven include:

```text
canvas bitmap/current pixels
textarea/input/select current state where cloning is insufficient
picture/img current source and exact frame-local resource provenance
SVG external/use resource provenance
layout properties required by the captured representation
writing-mode/direction
visual effects such as opacity/filter/shadow
pseudo/generated content where required
object-fit/object-position/current image geometry
frame-local URL base effects
```

The implementation need not blindly copy every computed style property.

But if its chosen static representation depends on a computed-style subset, that subset must be complete for the admitted representation or must produce a truthful degraded outcome when the budget cannot cover it.

A silent default-style tail after an arbitrary element count is not acceptable.

---

## 42. Fixed/sticky/static materialization policy must be consistent

Current evidence shows:

```text
top fixed selected descendant -> can repeat on every PDF page
flattened frame fixed descendant -> currently forced static
```

The same current PDF mode must not silently use two incompatible semantics based only on frame location.

W3-C should choose and test one explicit screen-state staticization policy for selected fixed/sticky content where needed.

This is part of P0-004/P1-187, not a new owner.

---

## 43. P1-212 disclosure/content policy

Print preparation must not click page controls.

Cases:

### Native/static disclosure with already-present content

Example: `<details>` or a hidden associated panel whose DOM content already exists.

WebClip may expose the content **inside the controlled representation** without activating host application logic, ideally through the mutation ledger or static clone.

### Host-lazy content requiring application action

If content does not exist until page code performs a user/app action, WebClip must not synthesize that activation merely to claim complete capture.

The truthful result is:

```text
content unavailable without host activation
-> degraded/unknown or explicit omission
```

unless a separate user-driven/product mode is intentionally defined later.

---

# Part VIII — exact remote-frame representation

## 44. RemoteRepresentationReceipt

W2 supplies exact remote frame/session identity:

```text
FS = frame session
PG = permission generation
R  = remote print generation
```

W3 adds the rendering facts:

```text
RemoteRepresentationReceipt {
  FS
  PG
  R
  selectedScopeHash
  filterEffective
  selectionUiSuppressed
  geometryMeasuredAfterFilter
  selectedHeight
  resourceGraphReceipt
  status
}
```

Top code may size/render the child only from a receipt matching its exact current `FS/PG/R`.

---

## 45. Keep worker `screen` media, make WebClip child filter media-independent

The safer direction from existing evidence is:

```text
site CSS media policy = screen
WebClip selected-only filter = independent of site print media
WebClip selection UI decoration = explicitly disabled for R
```

Do not simply revert worker media to native print; existing evidence proves site `@media print` can hide explicitly selected content.

---

## 46. Geometry must be measured after the exact filter is effective

Remote child sequence:

```text
validate FS/PG/R
-> suppress WebClip interactive outline for R
-> install selected-only representation for R
-> settle layout under bounded passes
-> build resource graph from that same representation
-> measure selected representation height
-> return RemoteRepresentationReceipt
```

The old sequence "measure full child, then install print-only filter" is forbidden.

---

## 47. Stable multi-pass top/child geometry

Top sizing can feed back into child layout.

Use a bounded convergence loop:

```text
R pass 1 -> child selected height H1
apply frame shell H1
R pass 2 -> child selected height H2
...
```

Stop when:

```text
height change <= tolerance
```

or a small hard pass limit is reached.

If it does not converge within the budget, report degraded/failed; do not loop indefinitely.

Every pass remains the same `R`, with a pass sequence inside that generation.

---

# Part IX — P1-003 actual rendered resource graph

## 48. Resource graph is derived after representation selection

Current resource preparation starts from selected source nodes, while current remote physical output can contain a different scope.

New order:

```text
CaptureAdmissionReceipt
-> RepresentationPlan
-> exact effective selected representation
-> ResourceGraphReceipt
-> physical render
```

Resource readiness therefore describes what Chromium is actually about to render.

---

## 49. Minimum resource families

The graph must account for resource forms proven by research, including where applicable:

```text
img/currentSrc
picture/source
CSS background-image
border-image
list-style-image
mask / mask-image
filter / external filter refs
clip-path external refs
pseudo content:url(...)
fonts used by selected representation
SVG external/use references
frame-proxy rewritten resources
canvas/static bitmap materializations
```

The exact supported list may evolve, but resource omission must be explicit.

---

## 50. ResourceGraphReceipt

Conceptual record:

```text
ResourceGraphReceipt {
  representationReceiptId
  attempted
  ready
  failed
  omittedByBudget
  deadlineExceeded
  resources[]
  status: full | degraded
}
```

A failed resource outside the physical selected representation does not degrade that PDF.

A failed material resource inside the representation prevents an unconditional `full` fidelity claim.

---

# Part X — truthful final fidelity outcome

## 51. FidelityReceipt

The W3 product of preparation is one immutable semantic receipt:

```text
FidelityReceipt {
  version
  physicalOperationId P
  sourceGeneration S
  selectionRevision SR
  mutationGeneration M

  captureAdmissionReceiptId
  representationReceiptId
  resourceGraphReceiptId
  userReachedHistoryReceiptId

  frameReceipts[] // FS / PG / R

  selectionStatus
  geometryStatus
  historyStatus
  representationStatus
  resourceStatus
  cleanupStatus

  status: full | degraded | unknown | failed
  reasons[]
}
```

`full` is allowed only if every required component for the admitted scope is full/proven.

One degraded component makes the overall fidelity result degraded.

This prevents one subsystem from silently hiding another subsystem's partial result.

---

## 52. Relationship to W1 immutable PDF generation

W1/P0-079 proves **which exact bytes** were generated and later uploaded/retried.

W3 proves **what those bytes truthfully represent**.

They are complementary.

W1 implementation does not need to wait for W3 to land, but W3 later enriches PDF provenance with:

```text
representationReceiptRef
fidelityStatus
```

W1 SHA-256/byteLength semantics remain unchanged.

Do not make W3 a prerequisite for establishing exact byte identity.

---

## 53. Relationship to W2 frame/browser lifecycle

W3 cross-frame closure depends on W2-B identities:

```text
FS
PG
R
childDocumentId/topDocumentId
```

W3 must not create another `frameGeneration` that bypasses those authorities.

W2 tells W3 **which live frame/session/effect is current**.

W3 tells W2/W1 **what representation that exact frame contributed**.

---

# Part XI — visual admission / P0-004

## 54. VisualStateReceipt

P0-004 evidence shows the page may change appearance before the final print because WebClip itself moves focus into its own UI and because responsive state can be recomputed under PDF geometry.

The capture architecture therefore needs an explicit admitted visual state boundary.

Conceptually capture at least the facts needed by the selected representation:

```text
viewport/environment dimensions
screen media policy
relevant container/layout state
selected element fragment geometry
focus/hover/top-layer state where contractually preserved
responsive branch diagnostics
```

This does not mean serializing every browser renderer internal.

It means not claiming "what the user saw" without an explicit cut at which that statement was sampled.

---

## 55. Admission before WebClip UI destroys page interaction state

Where page focus/hover is part of the current fidelity contract, sample/materialize that selected visual state before WebClip's own metadata UI changes it.

Implementation options include:

- avoiding unnecessary autofocus;
- recording the relevant visual state before modal focus;
- materializing the current computed visual state in a static representation.

If a state cannot be preserved truthfully, record degradation rather than silently render another state as full fidelity.

---

## 56. Responsive state is not equivalent to media type

Keeping `media=screen` is necessary but not sufficient.

Existing evidence proved layout-dependent media/container/orientation queries can be reevaluated against print geometry.

P0-004 closure must therefore include physical cases where the selected visual branch seen at admission is preserved or explicitly reported as degraded.

---

# Part XII — deterministic architecture model

## 57. Wave 3 L2 model

Durable tool:

```text
project_tools/test_wave3_fidelity_readiness_model.js
```

Local execution of the exact authored model:

```text
Wave 3 fidelity readiness model: PASS; cases=54
```

The model covers:

1. compare-before-restore preserves newer host href;
2. exact applied scalar can restore old value;
3. style conflict preserves host update;
4. structural wrapper rollback succeeds only under unchanged topology;
5. superseded image topology is not stale-reparented;
6. generated header cleanup uses exact ownership;
7. hidden restored target is rejected;
8. opacity-zero restored target is rejected;
9. visible target is potentially admissible;
10. transparent raw event target loses to visible semantic candidate;
11. visible pointer-inert descendant can remain candidate;
12. multiline fragment gap is definite-disjoint rather than false overlap;
13. actual fragment overlap remains definite-overlap;
14. ambiguous clip geometry does not become hard overlap proof;
15. local + remote selection share one aggregate count/byte budget;
16. post-cap extra Include is rejected before commit;
17. non-user scroll cannot enlarge user boundary in the model;
18. maximum user boundary survives scroll-back;
19. previously materialized deeper virtual content remains in history;
20. recycled same DOM node with a new logical item creates a distinct observation;
21. history budget overflow becomes degraded;
22. under-bound iframe remains live-expanded/full;
23. over-bound iframe can become full only through complete static materialization;
24. failed over-bound materialization is degraded, not a clamped full result;
25. current-like remote media mismatch is not full;
26. media-independent selected filter + UI suppression + post-filter height can be full;
27. pre-filter remote height blocks full;
28. actual rendered CSS/pseudo resources participate in resource truth;
29. failed unselected resource does not degrade selected PDF;
30. one degraded component degrades the final FidelityReceipt;
31. P/S/M/FS/PG/R generations remain distinct and composable.

The remaining assertions are positive/negative controls around those invariants.

---

# Part XIII — source gate

## 58. RED source gate

Durable tool:

```text
project_tools/test_wave3_fidelity_readiness_source.js
```

The gate intentionally describes the future production source contract.

Current baseline is source-bound RED because it still has the observed legacy shapes:

```text
independent changed* rollback arrays
unconditional old-value restore
whole old style restore
textual header-id cleanup
raw target + bounding-box admission
post-hoc selection snapshot slice(0,250)
no user-reached history ledger
synthetic control.click preparation path
silent 200000 selected-frame clamp
remote @media print selected filter while worker media=screen
no exact FidelityReceipt consumed by the PDF seal
```

A future production tranche turns the relevant portion GREEN incrementally; the full gate is not required to turn green in one giant PR.

---

# Part XIV — implementation DAG

## 59. Recommended W3 production order

Do not implement all 16 owners in one PR.

Recommended dependency-safe order:

```text
W3-0  shared receipt/status vocabulary
  ↓
W3-A0 central PageMutationLedger
  ↓
W3-A1 attribute/link/style compare-before-restore
  ↓
W3-A2 structural wrapper/generated-node exact rollback
  ↓
W3-B0 RenderedTargetAdmission + RenderedRegion
  ↓
W3-B1 aggregate SelectionCapacityReceipt
  ↓
W3-B2 same-origin frame geometry projection
  ↓
W3-B3 user-reached boundary/history ledger
  ↓
W3-C0 RepresentationPlan + FidelityReceipt skeleton
  ↓
W3-C1 P1-212 no-host-activation preparation
  ↓
W3-C2 same-origin over-bound static materialization
  ↓
W3-C3 P1-187 state materializers
  ↓
W3-C4 exact ResourceGraphReceipt
  ↓
W3-C5 remote selected representation FS/PG/R integration
  ↓
W3-C6 P0-004 visual/responsive fidelity convergence
  ↓
W3-Z  physical Closure Sweep / Change Impact
```

---

## 60. What may be parallelized

After W3-A0:

```text
W3-A1/A2
```

can proceed largely independently from selection geometry.

After W2-B exact frame identities are available:

```text
W3-B2
W3-C5
```

can proceed in parallel.

P1-230 history can begin after W3-B0/B1 but final static materialization should reuse W3-C0/C3.

P1-003 resource graph should not be finalized before representation modes are known because it must describe the actual rendered representation.

---

# Part XV — owner-specific closure mapping

## 61. W3-A owners

### P1-218

Closure:

```text
all temporary resource attributes are ledger-owned;
restore only if current == WebClip-applied value;
remote parity uses exact R.
```

### P1-219

Closure:

```text
wrapper has exact private owner;
rollback validates current topology;
new host reparenting is preserved.
```

### P1-220

Closure:

```text
exact generated node receipt;
no textual-id lookup as ownership authority.
```

### P1-221

Closure:

```text
old href private;
page marker non-authoritative;
compare-before-restore.
```

### P1-224

Closure:

```text
per-property/per-marker mutation receipts;
no whole-style stale restoration.
```

---

## 62. W3-B owners

### P1-001

Closure:

```text
structural locator resolution
AND
shared current RenderedTargetAdmission
```

must both pass.

### P1-154

Closure:

```text
one aggregate local+remote admission budget
before UI commit/materialization/snapshot
```

with no post-hoc slicing.

### P1-226

Closure:

```text
nested same-origin transform/border/zoom geometry
projects correctly into top visual coordinates
```

for outlines/usability/overlap from one model.

### P1-228

Closure:

```text
candidate != raw event target;
fragment-aware geometry;
transparent/disabled/pointer-inert/fragmented/transformed/clipped controls;
ambiguous geometry not hard-rejected as exact.
```

### P1-230

Closure:

```text
maximum user boundary retained;
no auto-scroll beyond it;
virtualized user-seen history preserved/reconstructed or truthfully degraded;
physical PDF gradual traversal + scroll-back receipt.
```

---

## 63. W3-C owners

### P0-004

Closure matrix must include at least:

```text
ancestor clipping/overflow/containment
selected-root clipping
unselected generated presentation
responsive/orientation/container-query state
focus/interaction-state admission
layout context/reflow
fixed/static semantics
compositing/backdrop dependencies
same-origin/remote representation parity
```

without regressing established positive controls.

### P1-003

Closure:

```text
resource graph == exact rendered representation graph
with bounded deadlines and truthful failed/omitted state.
```

### P1-150

Closure:

```text
>200000px selected same-origin frame
never silently succeeds as clipped full PDF.
```

Physical regression must preserve LAST/tail or return truthful degraded/failure.

### P1-187

Closure:

```text
static/flattened representation preserves required current rendered state
or refuses/degrades before producing plausible wrong output.
```

### P1-212

Closure:

```text
no print-preparation control.click()/synthetic host activation dependency.
```

### P1-229

Closure:

```text
remote selected filter effective under actual worker media;
interactive UI absent from PDF;
height measured after same exact selected representation;
resource graph from same representation;
FS/PG/R exact.
```

---

# Part XVI — physical evidence strategy

## 64. Do not close W3 from source/model only

W3 is inherently browser-rendering work.

Required evidence levels vary by owner, but final closure needs managed/real browser physical evidence for the relevant physical-output invariants.

At minimum retain/rebuild harnesses for:

```text
manual picker transparent/pointer-inert/fragmented geometry
same-origin transformed/nested frame geometry
P1-150 over-cap long frame
P1-187 canvas/select/layout/style tail
remote P1-229 screen-media selected-only PDF
P1-230 gradual virtual traversal + scroll-back
P0-004 clipping/responsive/fixed/compositing cases
```

PDF inspection must verify the actual physical artifact rather than only pre-print DOM.

---

## 65. Existing positive controls must remain in the matrix

Examples:

```text
ordinary long flex/grid/multicolumn/table cases that already pass
ordinary long/nested same-origin iframe cases under safe height
no-user-scroll dynamic feed does not auto-generate N+1
additive user-created nodes that remain mounted print normally
top screen-media protection against site print CSS
P0-071 unsafe-link physical render guard
P0-068 inert flattened proxy safety
```

A broad rewrite that fixes one failing case but regresses these controls is not W3 closure.

---

# Part XVII — non-goals / architecture boundaries

## 66. No universal screenshot replacement

A raster Region/Screenshot mode remains P2-007 product architecture.

W3 current PDF remains semantic/text-oriented where the current contract requires it.

---

## 67. No pixel-perfect geometry solver requirement

P1-228 does not require mathematically exact painted-shape intersection for every SVG/clip/mask primitive.

It requires that WebClip stop using a known coarse over-approximation as hard authority without exposing ambiguity.

---

## 68. No unbounded virtual-list scrolling

P1-230 explicitly forbids using WebClip auto-scroll-to-convergence to discover content the user never reached.

---

## 69. No page-control automation engine

P1-212 does not become a general crawler that clicks accordions/buttons until content appears.

---

## 70. No W1/W2 identity duplication

W3 consumes:

```text
P / S / SR
FS / PG / R
```

and adds only representation-specific generations/receipts.

---

# Part XVIII — final readiness decision

## 71. W3 research decision

For exact production baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

Wave 3 can now be classified:

```text
OWNER DENOMINATOR                       DEFINED (16/16)
W3-A MUTATION ARCHITECTURE              DEFINED
W3-B SELECTION/GEOMETRY ARCHITECTURE    DEFINED
P1-230 HISTORY ARCHITECTURE             DEFINED WITH TRUTHFUL AMBIGUITY BOUNDARY
W3-C REPRESENTATION ARCHITECTURE        DEFINED
REMOTE MEDIA/HEIGHT CONTRACT            DEFINED
RESOURCE GRAPH CONTRACT                 DEFINED
FIDELITY RECEIPT                        DEFINED
W1/W2 COMPOSITION                       DEFINED
IMPLEMENTATION DAG                      DEFINED
L2 CROSS-OWNER MODEL                    PASS (54 cases)
CURRENT PRODUCTION SOURCE               RED / NOT IMPLEMENTED
```

Strongest truthful W3 research state:

```text
WAVE-3-IMPLEMENTATION-READY
```

This is a research/architecture readiness statement only.

It does **not** transition any owner to DONE or IMPLEMENTED/RELEASE-REGRESSION.

---

## 72. Recommended next project research step

After final branch reconciliation, the next internal research tranche should move to **Wave 4 — Journal / portable-data / history integrity**.

Reason:

- W1 exact operation/Journal generation foundation is already designed;
- W2 browser lifecycle is implementation-ready;
- W3 fidelity is now implementation-ready;
- W4 has strong dependencies on W1 J0/D0 and can now be consolidated without waiting for Yandex L5;
- real Yandex L5 remains intentionally deferred to the final external stage.

Do not reopen broad C01…C46 coverage. Use targeted Change Impact only if canonical main/browser/product contracts change.
