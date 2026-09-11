# P1-212 — Print-control activation refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = ff60a95533f9e8cf852da3e1adb70e68d6593dd0`.

Canonical source blobs inspected:

- `content.js = f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `host-control-activation-guard.js = 5b98e046a69f5389271f626536b02e6f073ca7fb`;
- `content-injection-guard.js = fd6e1a0b7be0a82c5f0ea4455aa288a7eef35b4e`;
- `frame-agent.js = ce55145dc7ee1a4abf485b7fad3134ac39b61751`.

Historical provenance branch inspected only as provenance:

`research/p1-212-print-control-activation-2026-09-08`

with historical merge-base `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

The four relevant production blobs above are byte-identical on that historical branch and current canonical `main`. No historical branch is imported wholesale.

Production/runtime modification: **NONE**.

This research does not change `manifest.json`, runtime source, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner and current-contract authority

Current Registry authority is exact:

> P1-212 ACTIVE — Print preparation must not synthesize activation of page-owned controls merely to reveal content.

Current `USER_REQUIREMENTS.md` requires useful hidden content to be included where it can be represented without arbitrary page business logic, explicitly denies WebClip authority to synthetic-click arbitrary buttons/links/submit/accordion/toggle controls for printing, permits inert/static representation, and requires a user step or safe static alternative when reveal requires real application action.

Current `DECISIONS_AND_RATIONALE.md` makes the same architectural decision: disclosure is an inert/static representation problem, because a page-owned control can have business effects.

Current `WEBCLIP_PDF_FIDELITY_CONTRACT.md` is more specific:

- closed disclosures inside selected scope are part of later-reading completeness when already materialized content can be represented safely;
- provenance should distinguish `sourceState=closed` from `staticRepresentation=expanded`;
- expansion is performed on capture/clone/static representation rather than by synthetic page-owned click on the live page;
- content that exists only after stateful/network/page-owned interaction requires explicit user materialization or truthful degraded/partial/unknown classification.

P1-212 therefore owns **non-activation during disclosure preparation**, not generic DOM rollback and not arbitrary completeness.

## 2. Important correction to the 2026-09-08 provenance branch

The historical P1-212 document correctly identified that a raw `HTMLElement.click()` can execute page-owned activation behavior. But it treated the current `triggerInternalClick(control) -> control.click()` call as if it still reached the page handler.

That is no longer a valid current-source claim — and, because the relevant blobs are byte-identical, it was already stale relative to the P0-067 closure present in that branch.

P0-067 is now **DONE** and is a strong positive control that must not be reopened by P1-212.

### 2.1 P0-067 current defense-in-depth control

`content-injection-guard.js` enforces this injection prefix before `content.js`:

```text
frame-proxy-budget-guard.js
-> frame-proxy-inert-guard.js
-> host-control-activation-guard.js
-> content.js
```

`host-control-activation-guard.js` patches `HTMLElement.prototype.click` only in the extension isolated world. For page-owned elements it increments `blockedPageClicks` and returns before native activation. WebClip-owned Shadow-DOM elements may still use programmatic click. The page main world remains native.

The guard also installs into accessible same-origin frame realms and repairs newly loaded/discovered same-origin frame realms.

### 2.2 Direct current browser evidence already exists for that narrow click boundary

P0-067 closure evidence records Chrome for Testing 152 run `33469993760`, attempt 2, job `99737912236`, SUCCESS.

That run proved, on the real product path:

- page-owned preparation click attempts were blocked;
- host disclosure click count remained zero;
- form submit count remained zero;
- WebClip-owned Shadow control click still worked;
- page main-world click semantics remained native;
- PDF generation still proceeded;
- an already-existing linked disclosure panel remained printable.

Therefore current P1-212 research must not claim that `triggerInternalClick()` presently produces host click/submission/navigation. The guard is the positive control.

## 3. Fresh current-source residual gap

### 3.1 Disclosure preparation still runs on the live page

Current `prepareForPrint()` still executes:

```js
await expandSpoilersInIncludedContent();
```

before bounded selected-resource preparation and PDF generation.

The current comment says recognized spoilers/accordion/collapse blocks inside selected content are expanded and that the expanded state is intentionally preserved after the PDF.

That means disclosure preparation is still a live-source transformation stage, not yet the frozen/inert representation stage required by the fidelity contract.

### 3.2 Live native `<details>` is still opened by mutating source state

Current `expandSpoilersInIncludedContent()` still performs:

```js
for (const details of collectIncludedElements('details')) {
  if (!details.isConnected || isInsideExcludedArea(details) || details.open) continue;
  snapshotted.add(details);
  details.open = true;
}
```

The adjacent source comment calls this a reveal “without click and without launching third-party page logic.” That is not a valid HTML-platform guarantee.

Changing the `open` attribute from absent to present is a browser-defined disclosure state transition. The HTML Standard queues a details toggle event task for `closed -> open` and, for a non-empty shared `name`, enforces group exclusivity by closing another open member if necessary.

Thus `details.open = true` is not equivalent to changing a detached inert representation.

### 3.3 Deterministic current failure schedule: host-observable toggle

```text
1. Selected <details> A is closed at admission.
2. Host page has a toggle listener on A.
3. WebClip starts print preparation.
4. expandSpoilersInIncludedContent() executes A.open = true on the live node.
5. Browser queues/fires A's closed->open toggle event.
6. Host listener may run analytics, network work or application mutation solely because capture ran.
```

P0-067 does not prevent this because no `.click()` call is needed.

P0-070 source-generation fencing cannot undo a side effect after step 6.

### 3.4 Deterministic current failure schedule: named-details collateral state change

HTML `details[name]` groups are exclusive.

```text
1. B and A are in the same non-empty details-name group.
2. B is open at admission; A is closed and belongs to selected content.
3. WebClip sets live A.open = true.
4. User agent closes B to enforce group exclusivity.
5. B's source state changed even though WebClip only intended to statically include A's body.
6. Toggle notification may also be produced for affected disclosure state changes.
```

The important boundary is not whether B is inside or outside the selected visual subtree. The problem is that capture preparation obtained authority to alter source application disclosure state as a side effect of static representation.

### 3.5 `triggerInternalClick()` now has misleading success semantics

Current helper still contains:

```js
state.internalInteraction = true;
control.click();
return true;
```

Under the P0-067 guard a page-owned `.click()` returns normally **without performing native activation**. No exception is thrown.

Therefore `triggerInternalClick()` can return `true` while the control was deliberately not activated.

The caller then waits 40 ms as if a page handler might have run and only afterward uses its fallback representation mutation.

This is not a current host-activation vulnerability; P0-067 prevents that. It is a semantic/maintainability defect in the disclosure-preparation stage: `clicked === true` means only “the call did not throw,” not “a page action was accepted or revealed content.”

Target architecture should remove the activation attempt from print preparation rather than depending on a guard to silently turn it into a no-op.

### 3.6 Live visual fallback is a separate mutation boundary

When the blocked click does not reveal an already-existing linked panel, current code calls `forcePanelVisible(panel, control)` and directly changes live source values such as:

```text
hidden
aria-hidden
display
visibility
opacity
max-height
height
overflow
aria-expanded
```

Moving disclosure transformation to a WebClip-owned inert representation also reduces this live-source surface.

However P1-212 does **not** absorb generic rollback/host-supersession ownership. Existing owners remain responsible for exact temporary-mutation rollback semantics, including P0-075 and relevant P1-218/P1-221/P1-224 classes.

P1-212's question remains narrower:

> Does capture preparation create a page-owned disclosure/control transition merely to obtain printable content?

### 3.7 Cross-origin frame agent is a current positive control

Current `frame-agent.js::preparePrint()` does not click, submit, dispatch activation events or open page controls. It performs bounded selected-resource preparation plus selected-only print styling.

P1-212 must preserve this property. It must not introduce a new child-frame activation path while fixing top/same-origin disclosure representation.

## 4. External platform and comparable-product evidence

Fresh external research is comparison evidence, not automatic WebClip requirement authority.

### 4.1 WHATWG HTML — `<details>` state transitions are observable and grouped

Current HTML Standard:

- defines `details[name]` groups as exclusive;
- says opening one group member causes other open members to close;
- specifies that `open` attribute transitions queue a details toggle event task;
- specifically runs exclusivity enforcement when `open` becomes present.

Source:

- https://html.spec.whatwg.org/multipage/interactive-elements.html

Applicability: direct. WebClip currently writes live `details.open = true`, so this is the normative browser behavior boundary.

### 4.2 MDN — toggle and exclusive accordions are normal author-visible behavior

MDN documents that `<details>` dispatches `toggle` whenever open/closed state changes and that elements with the same `name` are connected so only one is open at a time.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement/name
- https://developer.mozilla.org/en-US/blog/html-details-exclusive-accordions/

The MDN compatibility note records `details[name]` as stable in Chrome 120. WebClip cannot assume a modern Chromium deployment treats live `open` mutation as an isolated visual-only change.

### 4.3 Mozilla Readability — transform a clone when parsing mutates DOM

Mozilla Readability documents that `parse()` modifies the DOM and explicitly recommends passing a cloned document when modifying the original is undesirable. Its Node guidance also notes that scripts/resource fetching are disabled by default for security in the cited jsdom usage.

Source:

- https://github.com/mozilla/readability/blob/main/README.md

Comparison principle only: a transformation pipeline can separate source observation from transformation by operating on a copy. WebClip still needs its own stronger fidelity/inertness/identity contracts; `cloneNode(true)` alone is not sufficient for WebClip.

### 4.4 SingleFile — collapsible archival behavior is a recurring user problem with trade-offs

SingleFile issue #908 records a user trying to archive an accordion where opening the second item closes the first, leaving only visible content in the saved result. The maintainer calls dynamic/folding behavior a recurring issue and notes that preserving scripts/interactivity can sometimes work but is unreliable and can break other content.

Sources:

- https://github.com/gildas-lormeau/SingleFile/issues/908
- https://github.com/gildas-lormeau/SingleFile/issues/908#issuecomment-1088696414

Comparison principle: users do want complete collapsed content, but executing/preserving page interaction logic is not a reliable generic archival mechanism. This supports WebClip's existing product decision to favor a truthful static representation over page-owned activation.

## 5. Refined P1-212 invariant

For every physical print-preparation generation:

```text
source page / frame = observation authority only for disclosure state/content

WebClip may:
  observe whether disclosure is open/visible/materialized;
  capture already materialized content within admitted scope;
  expand that content in a proven inert/frozen WebClip-owned representation;
  perform separately-owned bounded resource preparation.

WebClip must not, merely for capture completeness:
  synthesize page-owned click;
  dispatch activation events;
  submit/requestSubmit;
  open dialog/popover controls through page APIs;
  synthesize focus-driven activation;
  mutate live <details>.open to create a disclosure transition;
  execute site logic/network materialization that requires page interaction.
```

P0-067 stays as defense-in-depth against an accidental `.click()` regression. The primary P1-212 design becomes safe-by-construction instead of “attempt activation and rely on a guard to block it.”

## 6. Target disclosure classification

Each relevant disclosure at the admitted source generation should be classified before representation transformation.

### 6.1 `source-open` / already visible

```text
sourceState = open/visible
contentMaterialized = true
```

Target:

- capture observed content;
- no WebClip-created page transition;
- disclosure coverage complete for this item, subject to other fidelity/resource owners.

### 6.2 `source-closed + materialized`

```text
sourceState = closed
contentMaterialized = true
```

Target:

- source node remains closed;
- materialized body is projected into a WebClip-owned inert/frozen print representation;
- representation is expanded there;
- receipt distinguishes:

```text
sourceState = closed
staticRepresentation = expanded
```

This matches the current PDF fidelity contract.

### 6.3 `source-closed + page-activation-required`

```text
sourceState = closed
contentMaterialized = false
requiresPageActivation = true
```

Target:

```text
disclosureCoverage = partial/degraded
reason = page-activation-required
```

No click, live toggle, navigation, submission or site-JS/network materialization is performed by capture.

The user may explicitly open/materialize the page content before saving and then run capture again.

## 7. Conceptual receipt

P1-212 does not require this exact schema, but implementation needs equivalent truth:

```text
DisclosurePreparationReceipt {
  printGeneration,
  sourceDocumentGeneration,

  totalDisclosures,
  sourceOpen,
  sourceClosedMaterialized,
  pageActivationRequired,

  representedExpanded,
  disclosureCoverage: complete | partial | degraded,
  partialReasons[]
}
```

Important properties:

1. `sourceState` and `staticRepresentation` are separate facts.
2. A blocked `.click()` is not “reveal success.”
3. No receipt field grants mutation authority.
4. Receipt identity composes with P0-070 generation authority; it does not replace it.
5. Excluded descendants remain excluded after representation expansion.

## 8. Inert representation dependency

P1-212 must not implement “static representation” as naive live insertion of an active clone.

P0-068 already proved that connecting an unsanitized clone can activate custom elements, handlers, nested browsing/plugin-like resources and other behavior. Its inert-clone guard is a positive control and an adjacent implementation primitive.

P0-071 owns the actual print render-cut protection.

Therefore P1-212 requires an **already-established inert/frozen representation boundary**; it does not redefine that boundary.

The safe ordering is conceptually:

```text
admit exact source generation
-> observe/classify disclosure state
-> build/prove inert representation under P0-068/P0-071 constraints
-> expand materialized disclosure in representation only
-> mark page-activation-required gaps truthfully
-> bounded resource preparation under P1-003
-> physical print cut
```

## 9. Adjacent owner composition

P1-212 owns only page-control/disclosure activation authority during print preparation.

It composes with, but does not absorb:

- **P0-004** — complete selection-bounded PDF fidelity;
- **P0-067 DONE** — isolated-world page-owned `.click()` blocking, direct Chrome proof;
- **P0-068 DONE** — inertness of flattened/live-connected print representation;
- **P0-070** — exact source-document/application generation across save;
- **P0-071 DONE** — render-cut guard;
- **P0-075** — broader host page trust/control-plane boundary;
- **P1-003** — bounded renderer-resource readiness for already represented resources;
- **P1-199** — cross-origin frame print-generation prepare/restore ordering;
- **P1-214** — multi-frame partial-success rollback receipts and actual restore settlement;
- **P1-218** — temporary resource-attribute compare-before-restore ownership;
- **P1-224** — same-origin frame/ancestor temporary style rollback;
- **P1-229** — selected-only cross-origin frame media/geometry representation.

No owner above grants authority to execute page business logic merely because a hidden block would improve PDF completeness.

## 10. Why P0-067 does not make P1-212 redundant

P0-067 solved a narrower concrete activation vector:

```text
isolated-world pageElement.click()
```

P1-212's remaining requirement is architectural and broader:

```text
print preparation must not create page-owned disclosure transitions merely to reveal content
```

Current `details.open = true` proves the distinction. It does not call `.click()`, yet HTML defines observable toggle/group behavior.

Also, relying on the guard as the primary mechanism would preserve misleading code that still says “use the page's normal handler,” still returns `clicked=true`, and still waits as if page logic ran. Safe-by-construction disclosure representation is more maintainable and aligns directly with the current fidelity contract.

## 11. Deterministic model acceptance

The companion deterministic model must prove at least:

1. exact current Registry owner binding;
2. exact canonical baseline binding;
3. P0-067 guard is present and blocks page-owned isolated-world `.click()`;
4. content injection enforces that guard before `content.js`;
5. current print path still invokes disclosure preparation;
6. current live `details.open = true` remains visible in source;
7. current helper can report `true` after a blocked click because no exception occurs;
8. blocked `.click()` produces no modeled host click/submit/navigation;
9. live details open produces modeled host-visible toggle;
10. opening a named-group details can close another source details;
11. target inert expansion preserves source closed/group state;
12. already-open content is complete without activation;
13. site-JS-only content becomes truthful `page-activation-required`, not capture-triggered network/action;
14. user-manual materialization before save remains supported;
15. source state and static representation state remain distinct;
16. P1-003 resource preparation remains separate and allowed;
17. current remote-frame `preparePrint` has no synthetic activation path;
18. release fence and manifest version remain unchanged.

## 12. Implementation sequence recommended by this research

A bounded implementation tranche should:

1. stop treating `triggerInternalClick()` as a disclosure-preparation mechanism;
2. remove live `details.open = true` from print disclosure preparation;
3. classify source disclosure state/materialization without activation;
4. project hidden but already-materialized content into the established inert print representation;
5. carry `sourceState` separately from `staticRepresentation` in bounded diagnostics/receipt;
6. classify unavailable site-JS-only disclosure as `page-activation-required` partial/degraded;
7. keep P0-067 guard unchanged as defense-in-depth;
8. preserve P1-003 resource preparation and cross-origin frame-agent non-activation;
9. use adjacent generation/rollback owners for any temporary state they own;
10. add direct deterministic regression plus controlled current-browser proof before P1-212 can leave ACTIVE.

This research does not authorize that runtime implementation in the current research-only branch.

## 13. Required direct implementation evidence later

P1-212 should remain ACTIVE until a separately scoped runtime implementation demonstrates, at minimum, in controlled current Chrome:

- page-owned disclosure click/submission/navigation remains zero;
- live selected closed `<details>` remains closed in source while its already-materialized body is represented expanded in PDF;
- a host `toggle` listener receives no event from WebClip preparation for that case;
- a same-name already-open sibling is not closed by WebClip preparation;
- site-JS-only disclosure produces truthful partial/degraded state rather than site activation;
- user-manually opened disclosure remains capturable;
- selected Exclude semantics remain intact;
- P0-067, P0-068 and P0-071 positive controls remain green;
- cross-origin frame preparation remains non-activating;
- physical PDF proves the intended already-materialized disclosure body is actually present.

That browser run would be engineering closure evidence, not release authorization.

## 14. External-research trade-offs

The external material does not prescribe a single implementation:

- HTML platform semantics make live `<details>` mutation observably stateful.
- Readability demonstrates a mature pattern of transforming a clone when source mutation is undesirable, but its output mission differs from WebClip fidelity and its naive clone example is not sufficient inertness proof for WebClip.
- SingleFile user reports show that collapsible completeness is a real archival expectation, while its maintainer describes script-preserving workarounds as unreliable. WebClip's product choice is therefore defensible: preserve safely materialized content statically, but do not execute arbitrary page logic to chase completeness.

The recommended WebClip architecture balances fidelity and authority by separating observed source state from print representation and making unavailable interaction-generated content explicit rather than invisible or side-effectful.

## 15. Conclusion

P1-212 remains **ACTIVE**.

The 2026-09-08 provenance correctly identified the architectural direction — non-activating inert disclosure representation — but its current failure model must be refined after P0-067:

```text
NOT current root gap:
  page-owned .click() from content.js executes host handler
  (P0-067 blocks this and has direct Chrome evidence)

CURRENT residual gap:
  print preparation still mutates live disclosure state through details.open=true,
  which is browser-defined toggle/group behavior,
  while blocked-click call success is still misread as reveal success.
```

Target:

```text
observe source disclosure state
-> never activate page merely for completeness
-> expand safely materialized content only in proven inert/frozen print representation
-> preserve sourceState separately from staticRepresentation
-> report page-activation-required content truthfully as partial/degraded
-> keep P0-067 as defense-in-depth
```

No runtime/release state is changed by this research tranche.
