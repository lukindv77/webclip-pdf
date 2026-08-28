# Audit delta — flattened same-origin frame proxy must be inert — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-213** — a print-only flattened same-origin iframe representation must not re-execute page behavior or create new live browsing/network contexts merely because WebClip cloned it for pagination.

This composes with **P0-004** PDF fidelity, **P0-071** safe PDF URI semantics, **P0-075** hostile/shared-DOM trust and **P1-212** prohibition on activating page controls during print preparation.

## Source proof

For a selected same-origin iframe whose body is flattened, current `createFlattenedBodyFramePrintProxy()`:

1. creates a top-document `<section>` proxy;
2. clones every direct body child with `node.cloneNode(true)`;
3. enumerates the cloned descendants;
4. copies selected computed styles/URL state;
5. removes cloned `<script>` elements;
6. removes cloned descendants carrying the WebClip exclude marker;
7. appends the proxy directly to the live top document body;
8. hides the original iframe.

Removing `<script>` is useful, but it does not make the clone inert.

## Active content that survives a deep DOM clone

`cloneNode(true)` copies element attributes. Current sanitization does not strip or neutralize, for example:

- inline `onload`, `onerror`, `onclick`, `oninput`, etc. event-handler attributes;
- nested `<iframe src/srcdoc>` / `<frame>` browsing contexts;
- `<object data>` / `<embed src>`;
- media autoplay/preload behavior;
- form/action attributes and interactive controls;
- refresh/navigation-capable embedded document markup;
- active/local URI schemes beyond the separate link annotation rules.

Event listeners registered only via `addEventListener()` are not cloned, which is a useful limitation, but inline handlers and browser element activation/loading semantics remain relevant.

## Why insertion into the live document matters

The proxy is not kept detached. It is appended to `ownerDoc.body` in the top page.

Once connected, cloned resource/browsing elements may initiate behavior independently of the original iframe:

- a nested iframe may create another browsing context/load;
- an image/resource load failure/success can dispatch an event to copied inline handler attributes;
- object/embed/media resources may be loaded again;
- live form/interactive content becomes present in the top document;
- the host page can also observe and mutate the proxy under P0-075.

The save operation therefore risks changing page/network behavior merely to improve PDF pagination.

The original same-origin page already has authority to run its own scripts, so this is not claimed as a same-origin privilege escalation. The defect is **side-effect amplification caused by WebClip capture**: saving a page should not create additional active page executions or browsing/resource contexts that would not otherwise occur.

## Relationship to P1-212

P1-212 covers the explicit `control.click()` activation path.

P1-213 is separate: no synthetic click is necessary. Connecting a non-inert cloned subtree can itself activate browser/page behavior.

Both are naturally solved by a genuinely inert frozen print representation.

## Required contract

Before any flattened clone is connected to a live/render document, sanitize it into a print-only inert representation.

At minimum:

1. strip all `on*` event-handler attributes recursively;
2. neutralize executable/local-active URI schemes according to P0-071;
3. define explicit policy for nested `iframe/frame/object/embed` rather than cloning them live by default;
4. disable form submission/action and other interactive activation in the print representation;
5. define media policy so capture does not unexpectedly autoplay or duplicate side effects;
6. preserve only resources/attributes needed for accepted visual PDF fidelity;
7. do not run page scripts/handlers to recover fidelity;
8. preferably build the frozen representation under WebClip-owned control rather than exposing it in the live host tree.

If a resource must be fetched for rendering, it must follow the existing bounded/resource privacy policy and not inherit arbitrary active element behavior.

## Deterministic/browser regressions

1. Selected iframe body contains `<img src="missing" onerror="sideEffect()">` -> flattening never executes copied inline handler.
2. Body contains nested `<iframe src="/counter">` -> print proxy does not create an unapproved second live browsing-context load.
3. Body contains `<object data="...">` / `<embed src="...">` -> no implicit active load outside explicit print-resource policy.
4. Body contains autoplay media -> capture does not start a second playback merely because the proxy is mounted.
5. Inline `onclick`/form action remains visually representable but cannot become a live page action from the print proxy.
6. Normal text/images/tables preserve accepted P0-004 PDF appearance.
7. Scripts are absent as today, and all other executable event attributes are also absent.
8. Host-page mutation after frozen representation seal remains covered by P0-075/frozen-generation tests.
9. Nested same-origin selected iframe policy is explicit and bounded rather than recursively creating uncontrolled active clones.
10. Cleanup removes the inert proxy without executing late active teardown behavior.

## Numbering result

**P1-213 is assigned to this root cause.**

P0-004 remains PDF fidelity owner; P0-071 owns printable URI safety; P0-075 owns page mutation trust; P1-212 owns explicit page-control activation. P1-213 specifically owns active behavior caused by connecting flattened cloned content.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Browser tests are required for inline event attributes and nested active elements. No build, tag or Release was created.