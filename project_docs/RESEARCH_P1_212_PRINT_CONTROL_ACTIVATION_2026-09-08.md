# P1-212 — Print preparation must not synthesize page-owned control activation

Date: 2026-09-08

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline for this research branch:

`d4f5b268fa3f7ced5a7bc68da52784863d614138`

Branch:

`research/p1-212-print-control-activation-2026-09-08`

No production runtime, manifest, Registry status, release, build or tag is changed by this research block.

---

## 1. Registry owner and exact scope

Canonical Registry wording:

> P1-212 | ACTIVE | Print preparation must not synthesize activation of page-owned controls merely to reveal content.

P1-212 owns one narrow but important authority boundary:

> WebClip capture/print preparation must not execute a page-owned user action merely because that action might reveal more printable content.

The prohibited authority amplification includes, when performed by capture preparation rather than by the user:

- synthetic `HTMLElement.click()` on host controls;
- synthetic event dispatch intended to activate page controls;
- form submission/requestSubmit used as a reveal mechanism;
- programmatic dialog/popover/control activation used to reveal printable data;
- programmatic live `<details>` opening when it changes source-page disclosure state and dispatches host-observable `toggle`;
- equivalent source-page activation hidden behind a heuristic called "safe disclosure".

P1-212 does **not** claim that every temporary live DOM mutation is solved here. Adjacent rollback/generation owners remain authoritative for their own mutation classes.

---

## 2. Owner boundaries

### P1-212

Owns activation of page-owned controls during capture/print preparation.

Question:

> Did WebClip cause the page to execute an action that would normally belong to the user/site solely to reveal content for the PDF?

### P1-003

Owns bounded preparation/prefetch of resources already represented by the selected document and its existing renderer-visible resource identities.

P1-003 does not authorize arbitrary site UI activation to discover new content.

### P1-218

Owns compare-before-restore and generation-safe rollback for temporary resource attributes in top document and frame-agent.

A temporary `loading=eager` or selected resource attribute mutation is a different root cause from clicking a page-owned accordion.

### P0-075 / P1-218 / P1-221 / P1-224

Own exact rollback/restore authority for temporary host DOM/style/link mutations.

P1-212 must not be expanded into a generic rollback owner.

### P0-068 and P1-213

P1-213 is MERGED into P0-068. They own inertness of flattened/proxy same-origin frame representations and the fact that connecting a cloned active subtree can itself activate browsing/plugin/custom-element behavior.

P1-212 composes with that result:

- moving disclosure expansion into a print clone is only safe if that representation is actually inert;
- `cloneNode()` alone is not a proof of inertness.

### P0-070

Owns exact source-document/application generation across the prepared-document to PDF handoff.

P1-212 prevents an unintended action before document-generation fencing even becomes relevant. A later P0-070 rejection cannot undo a navigation/form submission that WebClip already triggered.

### P1-199

Owns print-generation ordering for cross-origin frame prepare/restore.

P1-212 says each generation must still be non-activating with respect to page-owned controls.

### P1-214

Owns multi-frame partial-success prepare/restore receipts and actual restore settlement.

It does not authorize child page control activation.

---

## 3. Fresh current-source proof

### 3.1 Disclosure expansion is part of the PDF preparation path

`content.js` explicitly performs:

```js
await expandSpoilersInIncludedContent();
```

immediately before bounded resource preparation and PDF generation.

The source comment states the intent: recognizable spoilers/accordion/collapse blocks inside Included content are expanded before creating the PDF.

Therefore actions inside `expandSpoilersInIncludedContent()` are not ordinary user interaction. They are capture preparation.

### 3.2 Non-native disclosure currently executes the site's normal handler

For a discovered disclosure control the source says, in effect:

```js
const clicked = triggerInternalClick(control);
if (clicked) {
  await delay(40);
}
```

The adjacent comment explicitly says the page's normal handler is used first so that the site may add/load lazy spoiler content.

`triggerInternalClick()` performs:

```js
state.internalInteraction = true;
control.click();
...
state.internalInteraction = false;
```

This is direct synthetic page-control activation.

### 3.3 `internalInteraction` is only a WebClip-local guard

`onPageClick()` checks:

```js
if (state.internalInteraction) return;
```

That stops WebClip's own selection click handler from interpreting its synthetic click as a user selection.

It does not suppress:

- page `click` listeners;
- framework listeners;
- anchor default navigation;
- submit-button default form behavior;
- lazy content handlers;
- analytics/business logic;
- application state changes.

Therefore it is not an activation sandbox.

### 3.4 Current "safe disclosure" predicate is not an effect proof

`isSafeDisclosureControl()` currently gives special treatment to anchors and submit buttons.

An `<a>` with a non-fragment `href` may still be accepted when it also has disclosure-looking metadata such as:

- `aria-controls`;
- `aria-expanded`;
- `data-bs-toggle`;
- `data-toggle`;
- a disclosure-looking class/id/role.

A `button[type=submit]` may also pass when it has similar semantic-toggle attributes.

This predicate proves only that the element resembles a disclosure control.

It cannot prove that clicking the element has no other effect.

A page is free to implement:

```js
button.addEventListener('click', () => {
  mutateBusinessState();
  fetch('/api/expand');
  submitSomething();
});
```

while also exposing perfectly legitimate accordion ARIA metadata.

### 3.5 Native `<details>` is also changed in the live source page

The current function handles native HTML details by doing:

```js
details.open = true;
```

on the selected live document.

The source comment currently describes this as an opening mechanism "without click and without launching third-party page logic".

That assumption is not correct as a general browser contract.

The `<details>` element dispatches a `toggle` event whenever its open/closed state changes. Page code can observe that event.

Therefore:

```text
details.open = true
```

is less dangerous than arbitrary `control.click()` in some ways, but it is still not an inert transformation of the source page.

### 3.6 Fallback visual reveal is a live host mutation

If the page handler did not reveal the panel, current code calls `forcePanelVisible(panel, control)` and modifies the live page:

- `hidden = false`;
- `aria-hidden = false`;
- inline `display`;
- `visibility`;
- `opacity`;
- `max-height`;
- `height`;
- `overflow`;
- control `aria-expanded=true`.

This is a separate mutation/rollback class.

P1-212 records it because it is part of the same reveal function, but does not claim all such mutation authority as its own. P1-218 and related rollback owners remain responsible for stale restore/host supersession.

The preferred architecture nevertheless moves disclosure-only visual expansion away from the source page when a safe frozen representation exists.

---

## 4. Browser semantics checked for this research

Current MDN documentation states:

- `HTMLElement.click()` simulates a mouse click and fires the element's click event unless disabled;
- `<details>` can be opened/closed programmatically through its `open` state;
- `<details>` dispatches `toggle` when its state changes;
- the general `toggle` event is also used by `<dialog>`/popover-style state transitions.

References used during this block:

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event

The architecture does not rely on `event.isTrusted` as a safety mechanism.

Even if a synthetic event is observable as untrusted, page code may still execute in response, and relevant default activation behavior may still occur for programmatic control methods.

Correct WebClip authority is therefore:

```text
DO NOT ACTIVATE
```

rather than:

```text
activate and hope the page ignores synthetic events
```

---

## 5. Deterministic failure schedules

### 5.1 Navigation caused by a disclosure-looking anchor

1. User selects an area containing an accordion-like anchor.
2. Anchor has `aria-controls` and an ordinary HTTP(S) `href`.
3. User asks WebClip to save.
4. `expandSpoilersInIncludedContent()` classifies it as a disclosure control.
5. WebClip executes `control.click()`.
6. Site listener and/or default anchor navigation occurs.
7. The source document begins replacement/navigation.
8. P0-070 may later detect stale document generation, but the unintended navigation has already happened.

P1-212 prevents step 5.

### 5.2 Form submission

1. Selected content contains a submit button.
2. Button also carries accordion/toggle metadata.
3. The current safety predicate admits it.
4. Capture preparation executes `.click()`.
5. The form or site handler submits/mutates state without a user action authorizing that business operation.

A print operation must never acquire form-submission authority merely from disclosure metadata.

### 5.3 Lazy network/business action

1. A collapsed panel has no materialized body yet.
2. Site click handler fetches data and mutates application state.
3. WebClip invokes the click because it wants more complete PDF content.
4. New network/business behavior occurs solely because the user saved a PDF.

Correct result:

```text
partial/degraded disclosure coverage
```

unless the user explicitly materialized that content first.

### 5.4 `<details>` toggle observer

1. Closed `<details>` is inside Included content.
2. Page listens for `toggle`.
3. WebClip sets `details.open=true`.
4. Browser changes disclosure state and emits `toggle`.
5. Page handler performs analytics, loads content or mutates application state.

No `.click()` was used, but the source page was still activated by capture preparation.

### 5.5 Nested accordion amplification

Current code performs multiple passes so newly revealed outer disclosures expose inner controls.

This can turn one save action into a sequence:

```text
click outer
→ page handler
→ new controls appear
→ click inner A
→ click inner B
→ ...
```

The more complete the heuristic tries to become, the more page-owned side effects it may amplify.

A bounded pass count limits quantity but does not make the authority safe.

---

## 6. Core P1-212 invariant

For each physical print preparation generation:

```text
WebClip may observe the page.
WebClip may snapshot already materialized content.
WebClip may transform WebClip-owned inert output.
WebClip may perform separately-authorized bounded resource preparation.

WebClip must not synthesize page-owned activation merely to reveal content.
```

In particular, print preparation does not receive authority for:

```text
click
submit
navigate
open site dialogs/popovers through their control API
dispatch activation events
focus-driven activation
live disclosure toggles that execute page handlers
```

---

## 7. Three disclosure states

The target implementation should classify disclosure content into three practical classes.

### 7.1 Already visible

The body is visible/materialized in the source page when preparation starts.

Policy:

```text
capture as observed
no activation needed
coverage = complete for this disclosure
```

### 7.2 Hidden but already materialized

The body already exists in the DOM/renderer state, but CSS/native disclosure state hides it.

Preferred policy:

```text
project into WebClip-owned inert/frozen representation
expand only that representation
leave source control unactivated
```

Whether such a frozen representation is truly inert must satisfy P0-068/P0-071 and adjacent representation owners. P1-212 cannot declare an unsafe clone inert by itself.

### 7.3 Content requires page activation/materialization

The data does not exist until site logic is run by click/toggle/business action.

Policy:

```text
DO NOT activate page
coverage = partial/degraded
reason = page-activation-required
```

Possible user-facing direction:

> Часть скрытого содержимого загружается только после действия на странице. WebClip не активирует элементы сайта автоматически. Раскройте нужный блок вручную и повторите сохранение.

The exact wording is product/UI work; the authority requirement is architectural.

---

## 8. Frozen representation boundary

The preferred architecture is to separate:

```text
source page DOM
```

from:

```text
WebClip print representation
```

A conceptual receipt may be:

```text
DisclosurePreparationReceipt {
    printGeneration,
    sourceDocumentGeneration,

    totalDisclosures,
    alreadyVisible,
    representedFromMaterialized,
    activationRequired,

    disclosureCoverage: complete | partial,
    partialReasons[]
}
```

No page-control event is required to produce this receipt.

The receipt is not permission to mutate the page. It is fidelity truth for the PDF operation.

### Important inertness constraint

Do not implement this as simply:

```js
const clone = source.cloneNode(true);
document.body.appendChild(clone);
```

and call it inert.

A connected clone may contain or trigger:

- browsing contexts;
- media/resource loads;
- custom elements;
- inline handlers;
- active/plugin-like behavior.

That root cause is owned by P0-068 (with P1-213 merged into it).

P1-212 only says that disclosure transformation should happen on a representation whose inertness has already been established by the relevant owner.

---

## 9. Native `<details>` target semantics

A closed source `<details>` has two safe cases.

### Body already materialized

The frozen representation can include the body and represent it as expanded, provided that representation is inert.

The source `<details>` remains unchanged.

### Body requires site reaction to `toggle`

WebClip does not force the reaction.

The print receipt records partial disclosure coverage.

The user can explicitly open the `<details>` before invoking save if they want the page to materialize the additional content under the site's normal user-interaction semantics.

---

## 10. Non-native accordions/tabs/spoilers

ARIA and framework metadata are useful for **classification**, not authority.

The following may identify a likely disclosure relationship:

- `aria-controls`;
- `aria-expanded`;
- Bootstrap/data-toggle attributes;
- collapse/accordion/spoiler class names;
- related hidden panel structure.

But none proves:

```text
click has no side effects
```

Therefore target code may use these attributes to decide:

```text
this hidden panel corresponds to this control
```

but not:

```text
therefore clicking the control is safe
```

---

## 11. User action remains authoritative

P1-212 does not prevent the user from interacting with the site.

Safe workflow:

1. User manually opens a disclosure on the page.
2. Site performs whatever user-authorized logic it normally performs.
3. Content is now visible/materialized.
4. User invokes WebClip save.
5. WebClip captures the resulting state without adding another activation.

The semantic boundary is:

```text
user action before capture
```

versus:

```text
extension-generated action because capture wants more content
```

---

## 12. Resource prefetch is not arbitrary reveal authority

Current print preparation also adjusts selected resource attributes so already represented images/resources can load before PDF.

P1-212 must not remove P1-003's legitimate bounded preparation merely because both happen before print.

However:

```text
selected DOM references image URL
→ bounded renderer preparation may be valid under P1-003
```

is different from:

```text
click site control
→ site application fetches a new business response
→ capture includes newly created content
```

The second operation is page-owned activation and is prohibited by P1-212.

---

## 13. Live `forcePanelVisible` relationship

Current fallback changes hidden/style/ARIA values directly on the source page.

P1-212 recommends removing disclosure expansion from the live source DOM when an inert representation exists, but closure of P1-212 should not be falsely used as closure for:

- stale rollback;
- compare-before-restore;
- host MutationObserver interactions;
- preparation generation ownership;
- temporary resource attribute rollback.

Those remain adjacent owners.

If implementation temporarily retains a narrowly scoped passive live visual mutation while eliminating all page-control activation, its rollback correctness must still independently satisfy the relevant owners.

---

## 14. Cross-origin frame parity

Current `frame-agent.js::preparePrint()` performs selected resource preparation and installs a print stylesheet. It does not currently contain the same generic `control.click()` disclosure-expansion loop as top `content.js`.

This is a positive control.

Future parity work must not introduce:

```text
remote prepare-print
→ synthetic child click
```

just to make the cross-origin result look more complete.

If hidden cross-origin content requires child-page activation, the same truthful partial/degraded semantics apply.

---

## 15. Unknown/partial is a valid result

A central design rule of the wider project is that lack of proof must not silently become success.

P1-212 applies that rule to fidelity:

```text
cannot safely reveal hidden content
```

must become:

```text
partial disclosure coverage
```

not:

```text
run site code and call the result complete
```

This is especially important because the site itself may be hostile, buggy, stateful or simply unexpected.

---

## 16. Suggested internal result model

An implementation may use an internal structure similar to:

```text
PrintDisclosureResult {
    status: complete | partial,
    totalCandidates,
    alreadyVisible,
    materializedHidden,
    activationRequired,
    skippedUnsafe,
    reasons: [
        page-activation-required,
        inert-representation-unavailable,
        representation-budget-exceeded,
        source-changed
    ]
}
```

The exact names are not mandatory.

Required semantics are:

- bounded counts;
- no page body/text leakage into diagnostics;
- generation-bound to the current print/source document;
- no claim of completeness when activation-required content was skipped.

---

## 17. Diagnostics/privacy

Diagnostics may contain bounded technical facts such as:

```text
disclosuresExamined: 8
activationRequired: 2
coverage: partial
```

They should not copy hidden page text or URL payloads merely to explain why a control was skipped.

OperationLog remains diagnostic only.

---

## 18. Generation and stale work

Although P1-212 is primarily an activation-boundary owner, implementation must compose with existing generation owners.

A disclosure representation prepared for:

```text
source document A
print generation G
```

must not later be attached/published as current for:

```text
source document B
print generation H
```

P0-070/P1-199 own those exact fences.

The P1-212 invariant still applies before any stale result is discarded: an old task is not allowed to activate the page simply because its result will later be recognized as stale.

---

## 19. What must be removed from the current path

At minimum, future runtime implementation should eliminate from print disclosure preparation:

```text
triggerInternalClick(control)
control.click()
```

and equivalent synthetic activation mechanisms.

It should also stop treating:

```text
details.open = true
```

on the live source document as an inert reveal operation.

Heuristic `isSafeDisclosureControl()` may remain as classification logic only if it no longer authorizes activation.

---

## 20. What can remain as positive controls

Preserve:

- explicit bounded disclosure discovery;
- selected-only semantics;
- existing selected resource preparation under P1-003;
- frame-agent print preparation without synthetic child clicks;
- exact document/print generation owners;
- bounded work/deadlines;
- truthful diagnostics;
- user ability to manually expand content before save.

---

## 21. Implementation direction

Recommended staged implementation:

### Stage 1 — remove active source-page invocation

- delete/disable synthetic disclosure `click()` during print preparation;
- do not dispatch substitute click/toggle events;
- do not use submit/dialog APIs as reveal mechanisms;
- stop changing live `<details>.open` as a supposedly inert shortcut.

### Stage 2 — classify disclosure availability

For each relevant selected disclosure:

- already visible;
- hidden but materialized;
- activation/materialization required;
- unknown/ambiguous.

### Stage 3 — integrate with inert print representation

Where a genuinely inert WebClip-owned representation exists:

- show materialized hidden content in the representation;
- do not mutate/activate the source control;
- bind result to exact source/print generation.

### Stage 4 — truthful partial result

Where safe representation cannot include the content without page activation:

- skip it;
- mark disclosure coverage partial;
- optionally provide bounded user guidance.

### Stage 5 — preserve rollback owners

Any remaining temporary live resource/style mutations must keep their existing generation-safe rollback requirements. Do not call P1-212 complete by deleting the click while breaking P1-218/P1-224.

---

## 22. Deterministic model added by this research

`project_tools/test_p1_212_print_control_activation_model.js`

The model covers 18 scenarios:

1. synthetic click runs page listener;
2. anchor navigation;
3. submit-button submission;
4. lazy/network side effect;
5. live `<details>` toggle event;
6. passive live mutation distinguished from inert representation;
7. already-visible content;
8. activation-required content becomes partial;
9. inert representation expansion;
10. user explicitly expands before save;
11. disclosure heuristic does not prove safety;
12. HTTP anchor with toggle metadata remains dangerous;
13. safety does not rely on trusted/untrusted event distinction;
14. missing lazy content is fidelity degradation, not activation authority;
15. P1-212 does not absorb all rollback owners;
16. inert transform cannot navigate/submit source page;
17. cross-origin child parity;
18. repeated preparation is source-action idempotent.

The locally executed exact model source returned:

```text
P1-212 print control activation model: PASS
```

Local `git hash-object` before GitHub write:

`6b6540c03f8c42136ccb50cc730f873493c67912`

The GitHub blob must be compared before claiming byte-for-byte committed execution evidence.

---

## 23. Source-bound future RED gate

`project_tools/test_p1_212_print_control_activation_source.js`

The gate intentionally requires future production source to show:

- an explicit disclosure/print representation projection;
- truthful partial/degraded coverage;
- inert/sanitized/frozen representation vocabulary;
- no `triggerInternalClick()` from print disclosure preparation;
- no `.click()`/`dispatchEvent()`/form-submit/dialog activation/focus in that path;
- no live `.open=true` details reveal treated as inert;
- no heuristic disclosure predicate serving as final activation proof;
- cross-origin `preparePrint()` remaining non-activating;
- preservation of adjacent resource-rollback controls.

The current runtime is expected to be RED because the exact forbidden primitives are present in current `content.js`.

A full source-gate execution against an exact local production checkout is still required before any implementation claim.

---

## 24. Required physical Chrome acceptance matrix

A future runtime implementation should be tested in unpacked Chrome with fixtures whose page scripts make side effects observable.

### A. Anchor disclosure fixture

Control:

```html
<a href="/navigation-target" aria-controls="panel">Expand</a>
```

Page records click and navigation attempts.

Expected during WebClip save:

```text
click count unchanged
navigation count unchanged
```

### B. Submit disclosure fixture

`button[type=submit]` also carries `aria-controls`.

Expected:

```text
form submit count unchanged
```

### C. Click-handler business mutation

Accordion button listener increments an application counter or posts to a local fixture endpoint.

Expected during save:

```text
counter/request unchanged
```

### D. Native details toggle listener

Page records `toggle` events on closed `<details>`.

Expected during save:

```text
source details remains closed
toggle event count unchanged
```

If its already-materialized body is represented in inert print output, PDF may include it without changing the source page.

### E. User-expanded control

User manually opens the accordion before save.

Expected:

- site action occurs only from user's interaction;
- WebClip save adds no second click/toggle;
- materialized content is eligible for capture.

### F. Lazy disclosure requiring page code

Content does not exist until click handler fetches/builds it.

Expected:

- WebClip does not click;
- no new page fetch/business request;
- receipt/status reports partial/degraded disclosure coverage.

### G. Nested disclosure

Several nested controls exist.

Expected:

- save causes zero synthetic source actions at every nesting depth.

### H. Cross-origin frame

Frame agent selected content contains a page-owned accordion.

Expected:

- `prepare-print` causes no synthetic child control activation;
- exact P1-199/P1-214 receipts remain valid.

### I. Source changes during preparation

Page navigates or application generation changes for unrelated reasons.

Expected:

- P0-070 rejects stale preparation;
- no P1-212 page activation occurred before rejection.

### J. Repeated save

Run preparation several times without user interaction.

Expected:

- page click/toggle/submit/network counters remain unchanged by each save.

---

## 25. Closure requirements

P1-212 must not close from this document/model alone.

Closure requires all of:

1. production source no longer activates page-owned controls during disclosure/print preparation;
2. live `<details>` is not programmatically toggled as an inert shortcut;
3. hidden materialized content is either represented through proven inert output or truthfully omitted/degraded;
4. activation-required lazy content is not materialized by synthetic site actions;
5. ordinary selected resource preparation remains bounded under its own owner;
6. cross-origin frame preparation has matching no-activation behavior;
7. exact source/print generation controls remain intact;
8. deterministic regression passes;
9. source-bound gate passes against exact production checkout;
10. real Chrome fixtures prove zero synthetic click/toggle/submit/navigation/business actions;
11. PDF fidelity diagnostics truthfully report partial disclosure coverage where appropriate.

Until then Registry status remains **ACTIVE**.

---

## 26. Summary

The current implementation tries to improve PDF completeness by asking the page itself to reveal content.

That mixes two authorities:

```text
capture authority
```

and

```text
user/page-action authority
```

They must be separated.

The target rule is simple:

```text
Observe what the user/page already materialized.
Transform only WebClip-owned inert output.
Never run a page-owned action merely to make the PDF richer.
If completeness requires such an action, report partial/degraded truthfully.
```

This preserves the project's broader principle that fidelity uncertainty is preferable to silently acquiring authority the user did not grant.
