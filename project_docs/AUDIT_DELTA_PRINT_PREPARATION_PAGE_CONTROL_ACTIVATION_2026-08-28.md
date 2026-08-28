# Audit delta — print preparation must not activate page-owned controls — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-212** — PDF/print preparation must not synthesize activation of page-owned controls merely to reveal accordion/spoiler content.

This composes with **P0-070** document-generation fencing, **P0-075** hostile/shared-DOM trust, **P0-004** frozen print fidelity and the existing resource/print preparation requirements, but it is a distinct side-effect root cause: WebClip itself invokes arbitrary page behavior during an operation the user authorized only as “save/print”.

## Source proof

`prepareForPrint(meta)` calls:

`await expandSpoilersInIncludedContent()`

before PDF generation.

For non-native disclosure UI, `expandSpoilersInIncludedContent()` discovers controls by broad semantic/heuristic markers such as:

- `[aria-expanded="false"]`;
- `[aria-controls]`;
- `data-bs-toggle` / `data-toggle`;
- spoiler/accordion/collapse classes.

After resolving a panel, it calls `isSafeDisclosureControl(control, panel)` and then:

```js
const clicked = triggerInternalClick(control);
```

`triggerInternalClick()` executes:

```js
control.click();
```

The `state.internalInteraction` flag only prevents WebClip's own page-selection click handler from treating this activation as a user selection. It does **not** suppress the target page's event listeners or browser default action.

## The current “safe” predicate is not a side-effect proof

### Anchors

For an `<a>`, a non-fragment `href` is rejected only when the element lacks semantic toggle markers.

Therefore an anchor like:

```html
<a href="https://example.test/action" aria-controls="panel" aria-expanded="false">...</a>
```

passes the semantic-toggle rule and WebClip calls `.click()` on it.

The page handler may reveal a panel, but the anchor's default navigation is also eligible to run unless the site itself prevents it.

### Submit buttons

A `<button type="submit">` is rejected only if it lacks the same semantic-toggle markers.

A submit button with `aria-controls`/`aria-expanded` therefore passes and `.click()` can submit its owner form in addition to executing page listeners.

### Arbitrary listeners

Even an otherwise harmless-looking `<button type="button" aria-controls="panel">` can have arbitrary site listeners attached. WebClip has no authority proof that those listeners are disclosure-only.

The page can update account state, start network requests, delete/edit content, navigate, open dialogs or execute any other page-origin behavior from that activation.

## Why this is not solved by `Event.isTrusted`

Programmatic `.click()` is intentionally the problem. Whether the resulting event reports trusted/untrusted status does not make execution safe:

- ordinary page listeners normally receive and may act on synthetic click events;
- browser default activation behavior for `.click()` can still apply;
- a cooperative framework may intentionally use synthetic activation;
- WebClip cannot inspect arbitrary listeners to prove they are read-only.

The safe contract is to avoid page-owned activation as a print-preparation primitive.

## Deterministic failure schedules

### Navigation

1. User selects content containing an accordion-like anchor.
2. Anchor has `aria-controls` and a normal HTTP(S) `href`.
3. User clicks WebClip “save”.
4. `expandSpoilersInIncludedContent()` classifies the anchor as a disclosure control.
5. WebClip invokes `control.click()`.
6. Site listener may run and the anchor may navigate the document.
7. The PDF operation is now racing document replacement; P0-070 must later fail closed, but the unintended navigation has already happened.

### Form submission

1. A form's submit button also carries accordion/toggle ARIA metadata.
2. The selected region contains that button/panel.
3. Print preparation invokes `.click()`.
4. Form submission/site mutation occurs without a user gesture authorizing that site action.

### Arbitrary handler

1. A page element looks like a disclosure button and points to a real panel.
2. Its click listener both opens the panel and performs another state-changing action.
3. WebClip's save operation triggers both.

No malicious extension API access is required for these failures; the defect is the extension causing unrelated page-side effects during a capture operation.

## Required contract

### Native structural disclosure

Native `<details>` may be copied/rendered open through a WebClip-owned representation or otherwise have its `open` state handled structurally, without clicking its `<summary>`.

### Third-party accordion/spoiler

Do not call page-owned `.click()`, `dispatchEvent()` or equivalent activation merely to prepare PDF content.

Acceptable approaches include:

1. resolve the associated panel and make **the frozen print representation** visible without mutating/activating the live page;
2. copy already-present hidden panel DOM into the frozen representation and normalize its print styles there;
3. if content exists only after site JavaScript loads it on activation, leave it closed/omitted with clear diagnostics rather than causing an unapproved site action;
4. optionally expose an explicit user-controlled page interaction outside the save operation if product UX later chooses to support that behavior.

The extension must not infer “safe to activate” from ARIA/classes alone.

## Relationship to frozen representation

P0-004/P0-075 already require a WebClip-owned frozen print generation. That architecture is also the natural repair here:

- disclosure normalization belongs in F, the captured representation;
- F can make an existing hidden panel printable without firing live page listeners;
- subsequent host mutations cannot retarget the representation;
- save remains observational/capture-oriented instead of becoming a generic page-action runner.

## Regression cases

1. `<a href="/next" aria-controls="p" aria-expanded="false">` inside selection -> PDF preparation never navigates.
2. Same anchor with site click listener -> listener is not invoked by WebClip.
3. `<button type="submit" aria-controls="p">` -> form is never submitted by print preparation.
4. `<button type="button">` with arbitrary side-effect listener -> listener is not invoked.
5. Native `<details>` closed -> frozen PDF may render its content according to product policy without click activation.
6. Bootstrap/custom accordion with panel already present but CSS-hidden -> frozen representation can expose panel without executing site handlers.
7. Accordion whose body is created only after a page-owned click -> save stays bounded and reports/accepts unavailable dynamic content; it does not click.
8. P0-070 document generation remains unchanged during print preparation because WebClip itself does not initiate navigation.
9. Normal selected content without disclosures produces the same PDF behavior.
10. Hostile page adding fake `aria-controls`/accordion classes cannot turn WebClip save into a synthetic click primitive.

## Numbering result

**P1-212 is assigned to this root cause.**

P0-075 remains the hostile page/WebClip control-plane owner, P0-070 remains the exact-document PDF owner, and P0-004 owns fidelity of the frozen representation. P1-212 specifically prohibits unapproved page-owned activation during print preparation.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Browser regressions are required for anchor default navigation, form submission and arbitrary click listeners. No build, tag or Release was created.