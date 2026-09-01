# P0-067 closure evidence — host-page control activation during PDF preparation — 2026-09-01

Date: 2026-09-01

Primary owner: `P0-067`.

Canonical source baseline: `main = a24b97ea9606c10414a804a8baca056713a4ba10` (P0-065 merged; post-merge Repository Integrity #217 SUCCESS).

Accepted current-Chrome evidence head: `7f9397dd30f5b4c8b125603d829e8e38dbc4500c`.

Accepted GitHub Actions run: `33469545801`, job `99736317876`, conclusion **SUCCESS**.

Browser: Google Chrome for Testing `152.0.7977.64`.

The temporary evidence workflow was removed after the accepted run. Runtime/test files covered by the accepted evidence were not changed after that evidence head before durable documentation/status delivery.

## 1. Acceptance contract

P0-067 requires WebClip PDF preparation to **not synthesize real host-page control activation**. In particular, preparation must not obtain disclosure content by calling page-owned `.click()` in a way that can execute arbitrary host click handlers, submit forms, navigate, or trigger other page-owned side effects.

The narrow owner is activation authority. Closing it does **not** claim that every disclosure representation is fully faithful, that site-JS-only lazy content can always be reproduced without activation, or that the host page is otherwise a trusted print control plane. Those remain separate representation/fidelity/resource-readiness and P0-075 boundaries.

## 2. Baseline defect and prior accepted finding

Before this repair, exact `content.js` followed:

`prepareForPrint()` → `expandSpoilersInIncludedContent()` → `triggerInternalClick(control)` → `control.click()`.

A disclosure-looking `<button type="submit" aria-expanded="false" aria-controls="panel">` was admitted as a disclosure control. `state.internalInteraction` suppressed only WebClip's own selection click handler; it did not suppress host-page event listeners or the browser's default activation behavior.

Existing durable finding: `AUDIT_FUNCTIONAL_P0_067_HOST_CONTROL_ACTIVATION_2026-09-01.md`.

Accepted finding run:

- run `33459232299`;
- job `99705678594`;
- Chrome for Testing 152;
- before preparation: `clicks=0`, `submits=0`;
- after WebClip preparation: `clicks=1`, `submits=1`;
- the path still reached one `WEBCLIP_GENERATE_PDF` message.

That finding established the exact P0-067 root.

## 3. Implemented boundary

`host-control-activation-guard.js` is injected into WebClip's extension isolated world before `content.js`.

The guard replaces the isolated-world `HTMLElement.prototype.click` boundary with a policy that:

1. permits programmatic click only for WebClip-owned elements rooted under the extension Shadow-DOM host `#webclip-pdf-extension-root`;
2. blocks programmatic click on page-owned elements before native activation;
3. applies the same rule to accessible same-origin frame realms;
4. keeps the page's main world untouched.

The guard is intentionally not a page-main-world patch. Trusted user events and site JavaScript running in the page main world retain their native browser semantics.

`content-injection-guard.js` now enforces exact helper order for every guarded `content.js` injection:

`frame-proxy-budget-guard.js` → `frame-proxy-inert-guard.js` → `host-control-activation-guard.js` → `content.js`.

`popup.html` loads `content-injection-guard.js` before `popup.js`, so direct popup-triggered top-content injection and worker-triggered injection share one prefix policy.

Current `content.js` itself remains unchanged. At the accepted evidence head it contains exactly one `.click()` call: the already-audited `triggerInternalClick(control)` boundary. When that page-owned click is blocked, existing code continues to the already-present static fallback `forcePanelVisible(panel, control)` for a linked panel that already exists in the selected DOM.

## 4. Deterministic regression

`project_tools/test_p0_067_host_control_activation_guard.js` proves:

- a page-owned programmatic click does not reach native activation;
- a WebClip Shadow-DOM programmatic click still reaches native activation;
- each deterministic VM has its own browser-like HTMLElement realm;
- helper injection is ordered and idempotent;
- popup bootstrap loads the injection guard before `popup.js`;
- service-worker bootstrap continues to install the shared injection guard;
- the exact `content.js` audited page-owned `.click()` and static visibility fallback remain present.

Accepted deterministic output on the accepted evidence head:

`P0-067 host control activation guard: PASS`

## 5. Rejected evidence attempts

Three earlier managed attempts are explicitly **not** closure evidence:

1. run `33469256932`, job `99735459851`: deterministic fixture reused one fake HTMLElement prototype across VM contexts, conflicting with the guard's intentionally non-configurable install marker. Product Chrome path did not run.
2. run `33469316214`, job `99735632837`: deterministic layer passed, but the synchronous Playwright harness accidentally used a local `async def send()` and failed on a Python coroutine before the first product runtime command.
3. run `33469440306`, job `99736002561`: core Chrome discriminators had passed, but a final main-world `.click()` control was executed after WebClip selection had installed its intentional capture listener. The control measured selection interception rather than prototype leakage.

The final harness corrected those fixture problems without weakening the product acceptance assertions.

## 6. Accepted Chrome 152 execution

Accepted managed run `33469545801`, job `99736317876`, exact head `7f9397dd30f5b4c8b125603d829e8e38dbc4500c` completed **SUCCESS**.

### 6.1 Source identity

SHA-256 retained by the accepted run:

- `frame-proxy-budget-guard.js`: `7c787f08b3942ecfb50246c45169bf52af7491920edeb2ce8abee9e754da8356`;
- `frame-proxy-inert-guard.js`: `dc4fd3204e52d5c50b57a78ea3f682c64564e49063d2b4a8c7ada8bd01b5ab08`;
- `host-control-activation-guard.js`: `e0cc737d6f607bb7ed53d9f3f4d157c85bec5549a08bfdda17002cd5962e0b39`;
- `content-injection-guard.js`: `e32ada74fa2c9dab60e4dc57f1096a82339f3a793a28fa35203755e93c955b12`;
- `content.js`: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`.

### 6.2 Isolated-world negative controls

The real MV3 worker injected the reviewed helper prefix and `content.js`.

Immediately after injection:

- `WebClipHostControlActivationGuard` existed in the isolated world;
- isolated `HTMLElement.prototype.click` was the guarded function;
- two realms were installed: top document plus same-origin child frame.

A page-owned top-document programmatic click and a page-owned same-origin-frame programmatic click were then executed from the isolated world.

Observed:

- guard blocked count: `2`;
- host top probe click count: `0`;
- host frame probe click count: `0`.

Thus the guard stops real page-owned activation in both reviewed accessible realms.

### 6.3 WebClip-owned positive control

A temporary button was appended inside WebClip's own Shadow root and programmatically clicked from the same isolated world.

Observed:

- WebClip-owned button click count: `1`;
- `allowedWebClipClicks`: `1`.

The policy therefore does not disable all programmatic activation in the extension UI.

### 6.4 Main-world positive control

The page's main-world `HTMLElement.prototype.click` was inspected:

- before extension injection: native = `true`;
- immediately after injection: native = `true`;
- after the full preparation/PDF flow: native = `true`.

Before WebClip selection listeners were installed, the page main world programmatically clicked its own control and the page listener observed exactly `1` click.

This distinguishes isolated-world enforcement from a host-page prototype mutation.

### 6.5 Exact PDF-preparation discriminator

The harness used WebClip's real command/UI path:

1. `WEBCLIP_START_SELECTION`;
2. `WEBCLIP_COMMAND / auto-content`;
3. `WEBCLIP_COMMAND / download`;
4. a trusted physical click on WebClip's `Сформировать PDF` Shadow-DOM button;
5. real `downloadPdf()` → `prepareForPrint()` → `expandSpoilersInIncludedContent()`;
6. actual `WEBCLIP_GENERATE_PDF` message.

Before preparation:

- host disclosure clicks: `0`;
- host form submits: `0`.

After preparation, while the generate response was deliberately held so the prepared representation could be inspected and physically printed:

- host disclosure clicks: **`0`**;
- host form submits: **`0`**;
- linked existing panel `aria-expanded`: `true`;
- linked existing panel visible: `true`;
- total blocked page-owned programmatic clicks: `3` (top probe + frame probe + actual preparation attempt);
- total allowed WebClip programmatic clicks: `1`;
- `WEBCLIP_GENERATE_PDF` messages: `1`.

This directly reverses the prior finding: the exact preparation path no longer activates the host submit control, while the existing static linked disclosure representation remains available.

### 6.6 Physical PDF positive control

The generate response was held until a physical `Page.printToPDF` was captured from the prepared state.

Result:

- pages: `1`;
- PDF SHA-256: `bae2d151e2d91540b17cdfec65673add02fb75a90f9ac0c1be333c375ea7a2cf`;
- selected article sentinel present: `true`;
- `P0_067_STATIC_DISCLOSURE_SENTINEL` present: `true`.

The fix therefore does not simply prevent the preparation path or drop the already-existing disclosure panel from the printed output.

## 7. Change Impact and residual owners

The production change affects the content-script injection bootstrap and the page-owned programmatic activation boundary used by disclosure preparation.

P0-067 is the primary owner and is satisfied by the accepted proof.

This closure does **not** close:

- `P0-004` — complete selection-bounded PDF fidelity;
- `P0-075` — the broader rule that the host page is not WebClip's trusted UI/control plane and print representation should be isolated;
- `P1-003` — selected renderer-resource readiness;
- other disclosure/render-state owners where content exists only after site JavaScript performs lazy generation;
- release readiness.

A disclosure whose meaningful content does not already exist in the selected DOM and is created only by arbitrary site activation is no longer synthesized by executing that site action. Whether such content can be represented faithfully through a future isolated/materialized strategy belongs to the separate fidelity/representation owners, not to P0-067's activation-authority root.

No new P-code is warranted.

## 8. Owner conclusion

`P0-067` satisfies its narrow implementation + direct current-browser verification contract and can transition to **DONE** after ordinary PR delivery gates.

The accepted evidence proves that WebClip's own PDF preparation no longer invokes the real host control, the actual product path still reaches PDF generation, an existing linked disclosure panel remains printable, same-origin frame realms are covered, WebClip's own Shadow UI remains functional, and the page main world retains native `.click()` semantics.

`DEEP-AUDIT-COVERAGE-COMPLETE` remains true, but broader critical closure remains incomplete.

`RELEASE_READINESS.md` remains **NOT READY**. No manifest version, build, tag or GitHub Release is changed by this tranche.
