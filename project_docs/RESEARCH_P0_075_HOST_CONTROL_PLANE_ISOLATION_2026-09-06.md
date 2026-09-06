# P0-075 — host page is not a trusted WebClip control plane — 2026-09-06

Date: 2026-09-06  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Branch: `research/p0-075-host-control-plane-isolation-2026-09-06`  
Owner: **P0-075 ACTIVE**  
Runtime/manifest/release state: unchanged.

## 1. Registry owner

Canonical Registry wording:

> Host page is not a trusted UI/control plane: sensitive input/selection/authorization state must not be host-readable or synthetic-event authorizable; print representation should be isolated.

This checkpoint defines the first complete source-bound architecture for that owner. It is defensive architecture/data-integrity research. It does not claim an exploit, vulnerability disclosure, runtime closure, release readiness, or current-Chrome proof.

## 2. Why isolated-world JavaScript is necessary but insufficient

Chrome content scripts run in an isolated JavaScript world by default. Page JavaScript cannot directly read content-script lexical/global JavaScript state, and content script JavaScript cannot directly read page-world JavaScript variables.

However, the DOM is shared. Chrome's own extension security guidance explicitly warns that hostile pages can manipulate DOM relied on by content scripts and recommends treating data sent to content scripts as potentially exposed to the page.

References:

- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure
- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts

Therefore P0-075 must distinguish:

```text
isolated JS state
!=
private DOM state
!=
trusted user authorization
!=
trusted printable representation
```

## 3. Current source findings

### 3.1 WebClip UI host is addressable from page DOM

Current `content.js` defines:

```js
const ROOT_ID = 'webclip-pdf-extension-root';
```

and `ensureUi()` creates:

```js
const host = document.createElement('div');
host.id = ROOT_ID;
```

The host is intentionally inserted into the ordinary source document.

A stable page-visible id is not itself a defect, but it makes the WebClip host directly discoverable by page JavaScript.

### 3.2 WebClip Shadow DOM is explicitly open

Current source then does:

```js
const shadow = host.attachShadow({ mode: 'open' });
```

For an open root, ordinary page JavaScript can obtain `host.shadowRoot` and traverse/mutate its descendants.

MDN documents this directly and notes that a closed root is an encapsulation mechanism, not a complete security boundary:

- https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
- https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM

P0-075 conclusion:

- changing `open` to `closed` is useful hardening for page-embedded non-privileged affordances;
- it is **not** sufficient authority for irreversible/privileged effects;
- high-impact user confirmation belongs in an extension-owned document surface.

### 3.3 User comment currently lives in the open page-hosted root

`showFileCommentDialog()` creates an ordinary `textarea` and appends it to `state.modalExtra`, which belongs to the open WebClip Shadow DOM.

The user's file comment can therefore be present in page-readable DOM before save admission.

The comment is not an OAuth secret, but it is user-authored private metadata and the Registry owner explicitly includes sensitive input state.

Selected contract:

```text
user comment / destination confirmation
-> extension-owned surface
-> never page-readable DOM
```

### 3.4 Selection identity is mirrored onto host-owned elements

Current selection writers do:

```js
function addInclude(element) {
  const id = String(state.nextIncludeId++);
  element.setAttribute(INCLUDE_ATTR, id);
  state.includes.set(id, element);
}

function addExclude(element) {
  const id = String(state.nextExcludeId++);
  element.setAttribute(EXCLUDE_ATTR, id);
  state.excludes.set(id, element);
}
```

The isolated-world Maps are private JavaScript state, but the exact selected elements are also tagged in the shared host DOM.

This creates two different notions:

```text
private isolated selection authority
page-readable render marker
```

P0-075 does not permit the page-readable marker to be the durable/current selection authority or to expose the exact selection set throughout the interactive session.

Target:

- selection ownership remains in isolated-world/session state;
- ordinary interactive selection does not require exact include/exclude ids on page-owned elements;
- page-visible geometry is an unavoidable visual fact, but the extension must not publish its authoritative selection graph as stable DOM metadata;
- print-only markers, if any remain in a compatibility implementation, are not authoritative and may exist only under an independently proven host-execution fence.

### 3.5 Page click listener has no trusted-event admission

Current `createUiButton()` installs:

```js
button.addEventListener('click', (event) => {
  event.stopPropagation();
  onClick(event);
});
```

Current `content.js` contains no `event.isTrusted` check.

The document-level selection listener `onPageClick(event)` similarly admits clicks based on state/target and does not reject untrusted events.

The DOM standard exposes `Event.isTrusted`; MDN documents that a click generated by `HTMLElement.click()` is untrusted:

- https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted

Source conclusion:

- source currently does not require trusted physical/user-agent event provenance;
- direct current-Chrome proof is still required before claiming the exact cross-world synthetic activation behavior as L4 fact;
- implementation must nevertheless fail closed on untrusted events for any page-embedded WebClip affordance.

### 3.6 Shared WebClip dialog contains privileged destination actions

Current `showSaveDialog()` creates page-hosted buttons:

```text
Скачать PDF
Отправить на Яндекс Диск
```

The second dialog creates a proceed button that directly enters `downloadPdf(...)` or `sendPdfToYandex(...)`.

Those paths later send privileged content messages to the worker.

This is the central P0-075 control-plane problem:

```text
host-visible DOM event
-> content isolated-world handler
-> privileged runtime message
-> downloads / Yandex operation
```

Even though the final worker message originates from a legitimate content script, the worker currently has no evidence that the action was authorized in an extension-owned user surface.

### 3.7 Worker sender validation is a positive control, not user authorization

`service-worker.js` has a `CONTENT_SCRIPT_MESSAGE_TYPES` allowlist and `assertRuntimeMessageSender(...)`.

For `WEBCLIP_SEND_PDF_TO_YANDEX`, the worker takes the real `sender.tab.id` and sanitizes metadata before calling the Yandex/PDF path.

This is good boundary validation.

It does **not** prove user activation. Once a content-script handler emits the message, the worker sees an allowed content sender.

P0-075 therefore must not be reduced to stronger input sanitization in the worker.

### 3.8 OAuth/access token is not present in `content.js`

Fresh source search found no `accessToken` in `content.js`.

This is an important positive control:

```text
OAuth credential
-> worker/session authority
-> not page-hosted content UI
```

P0-075 must preserve this property and must not solve UI isolation by sending Yandex credentials into an extension iframe/content surface.

### 3.9 Current printable representation is materially host-owned during preparation

Current `prepareForPrint(meta)` operates on the live source document.

Among other mutations, the print header containing source metadata and optional file comment is inserted with:

```js
document.body.insertBefore(header, document.body.firstChild);
```

Selection markers/styles, link normalization, image wrapping and frame representation are also prepared in or relative to the live document.

The host page is therefore both:

- the content source, which is expected;
- and the mutable container of WebClip's final representation, which is the P0-075 concern.

## 4. Why P0-071 does not close P0-075

P0-071 is DONE and is a valuable positive control.

Its render guard:

1. hides WebClip UI at the real print cut;
2. disables page script execution;
3. scans the actual DOM for unsafe URI schemes;
4. calls `Page.printToPDF`;
5. restores hrefs and script execution.

That closes the actual printed URI-scheme owner.

But current P0-075 preparation occurs **before** the P0-071 script freeze. The host page can observe or mutate page-hosted WebClip representation during the preparation interval.

Therefore:

```text
P0-071 render-cut freeze
!=
P0-075 control-plane confidentiality
!=
P0-075 pre-render representation isolation
```

P0-071 must remain intact and compose with any P0-075 implementation.

## 5. Why P0-067 does not close P0-075

P0-067 protects a different direction of authority.

`host-control-activation-guard.js` patches isolated-world `HTMLElement.prototype.click` so WebClip preparation cannot programmatically activate **page-owned** controls.

It explicitly:

- does not patch the page main world;
- allows WebClip-owned Shadow-DOM controls.

That is correct for P0-067 and must not be weakened.

P0-075 asks the reverse question:

```text
Can the host page use shared WebClip DOM as a capability to control WebClip?
```

So P0-067 remains DONE while P0-075 stays ACTIVE.

## 6. Threat/authority model

The host page controls:

- its own DOM/content;
- its own CSS and layout;
- main-world JavaScript;
- ordinary DOM mutation while scripts are running;
- navigation/application updates subject to P0-070/P0-080;
- data that is intentionally captured as page content.

The host page must **not** control:

- WebClip destination confirmation;
- user-authored private comment input;
- exact WebClip selection authority representation;
- worker-issued operation identity;
- Yandex authentication/account/root policy;
- the final extension-owned printable representation;
- sealed PDF bytes.

Availability attacks by the page, such as deleting an overlay root, are not equivalent to authorization. The extension may fail/recover/recreate its UI, but it must not turn page DOM mutation into a privileged effect.

## 7. Selected control-plane architecture

### 7.1 Page-embedded surface becomes non-privileged

Allowed in page-embedded content UI:

- hover/selection outlines;
- include/exclude interaction;
- count/status presentation;
- cancel/return to idle;
- bounded non-sensitive warnings.

Required properties:

- closed Shadow DOM or equivalent page-inaccessible encapsulation;
- no user private comment field;
- no direct download/Yandex/retry/delete/permission authorization;
- all click/keyboard transitions reject untrusted events;
- interaction is exact selection-session/application-generation bound with P0-080.

### 7.2 Extension-owned surface owns privileged confirmation

Privileged user actions are confirmed in an extension page, for example the browser-action popup or another extension-owned document surface.

At minimum this includes:

- local PDF download admission;
- Yandex save admission;
- retry of cached PDF to Yandex;
- download of cached PDF after Yandex error;
- user private file comment;
- any future destructive/permission-sensitive action not already owned elsewhere.

The exact product UI can change, but authority cannot reside in page-hosted DOM.

### 7.3 Two-phase user flow

Recommended strong flow:

```text
1. Extension popup starts exact selection session.
2. Content script owns selection geometry in isolated state.
3. User finishes selection through a trusted, non-privileged page affordance.
4. Worker/content expose a bounded selection-session summary/receipt.
5. User opens/continues extension-owned confirmation UI.
6. User enters private comment and chooses destination there.
7. Extension-owned UI sends privileged intent to worker.
8. Worker proves exact source document/application/selection receipt.
9. Worker begins P0-070 render generation.
10. P0-079 seals exact PDF byte generation before destination effects/retry.
```

The worker must not infer privileged authorization merely because an allowed content-script message arrived.

## 8. Trusted activation rule

For every page-embedded WebClip event that can change extension state:

```text
event.isTrusted !== true
-> ignore/fail closed
```

This includes mouse/keyboard activation used for selection.

However, `isTrusted` is only a minimum anti-synthetic condition. It does not convert the page DOM into the preferred privileged control plane.

For privileged destination confirmation the selected P0-075 contract remains:

```text
extension-owned user surface
+
trusted user confirmation
+
exact source/session receipt
```

## 9. Selection authority rule

Authoritative interactive selection state remains isolated:

```text
selectionSession = {
  exact browser document generation,   // P0-070
  application generation,              // P0-080
  session generation,
  include element identities,
  exclude element identities
}
```

The page DOM may contain ordinary page content and non-authoritative render hints, but it does not hold the authoritative selection graph.

Stable `data-webclip-pdf-include/exclude` identity attributes on page-owned elements are therefore not the final contract.

P0-080 still owns stale SPA/disconnected-target admission. P0-075 owns confidentiality/control-plane placement of the selection authority.

## 10. Print representation contract

P0-075 requires a distinction between:

```text
source document
final printable representation
```

The source document is inherently host-controlled. The final representation must become extension-owned before destination success can be reported.

### 10.1 Preferred strong profile: extension-owned render target

Preferred architecture:

```text
exact admitted source generation
-> bounded snapshot/materialization
-> extension-owned document/render target
-> P0-071-equivalent final URI/render guard
-> Page.printToPDF against extension-owned target
-> P0-079 sealed byte generation
```

Possible implementation surfaces include an extension-owned print document/tab. Exact mechanics require Chrome proof because fidelity/resource/frame behavior intersects multiple owners.

The snapshot is data, not executable host authority:

- scripts are inert/omitted;
- event handlers are removed;
- browsing/plugin/custom-element activation follows existing P0-068 inertness constraints;
- resources are bounded under P1-003/P1-167;
- selected-content fidelity remains P0-004/P1-150/etc.;
- no OAuth credentials enter the snapshot.

### 10.2 Compatibility profile: same-tab render only with proven isolation

If exact fidelity forces same-tab printing initially, closure requires direct current-Chrome evidence that:

- no authority-bearing selection/comment/control state is host-readable before the fence;
- host script execution is disabled before final representation materialization becomes visible;
- the page cannot mutate that representation before/during `Page.printToPDF`;
- cleanup restores the live source page;
- failure is fail closed.

Current runtime does not satisfy this profile because `prepareForPrint()` mutates the live page before the P0-071 freeze.

## 11. Render handoff to neighboring owners

P0-075 composes as:

```text
P0-080
  exact current SPA/application + live selection admission
      -> P0-070
         exact full-document/source generation through render
            -> P0-075
               representation/control-plane isolation
                  -> P0-071
                     actual render-cut URI safety/freeze
                        -> P0-079
                           immutable operation-owned PDF bytes
```

These owners overlap in lifecycle position but not root cause.

## 12. Additional owner boundaries

P0-075 does not absorb:

- P0-004 selected PDF fidelity/layout correctness;
- P0-066 durable URL confidentiality sanitizer;
- P0-067 prevention of extension-triggered page-owned control activation;
- P0-068 inert flattened iframe representation;
- P0-070 source generation continuity;
- P0-071 actual printed URI-scheme guard;
- P0-079 PDF byte ownership;
- P0-080 SPA/application/selection freshness;
- P1-003 renderer resource readiness;
- P1-167 bounded preparation/diagnostic computation;
- P1-172 metadata bounds before print/IPC;
- P1-193 optional permission user-activation flow.

## 13. Worker admission requirements

Current content sender allowlisting remains necessary.

P0-075 additionally requires a privileged-save admission concept that cannot be minted by page DOM activation alone.

Conceptual minimum receipt:

```js
{
  version: 1,
  action: 'download-pdf' | 'yandex-save' | 'retry-yandex' | 'download-cached-pdf',
  sourceDocumentReceipt: { ...P0-070/P0-080 authority... },
  userConfirmationGeneration: '<worker/extension-owned opaque id>'
}
```

Rules:

- opaque id is not a secret substitute for user confirmation;
- content page cannot create a valid confirmation generation on its own;
- receipt carries no token/auth secret;
- stale source/session receipt fails closed;
- synthetic/untrusted page events cannot mint or consume privileged confirmation;
- retry still targets an exact P0-079 generation/P0-023 source contract.

This intentionally leaves physical operation identity to P1-198.

## 14. Current source RED conditions

Current production source remains RED for P0-075 because all of the following are present:

1. `host.attachShadow({ mode: 'open' })`;
2. private file-comment textarea in that page-hosted root;
3. page-hosted `Скачать PDF` / `Отправить на Яндекс Диск` actions;
4. `createUiButton()` has no `event.isTrusted` rejection;
5. selection listener has no `event.isTrusted` rejection;
6. authoritative selection identities are mirrored as include/exclude attributes on page elements;
7. print header including file comment is inserted into `document.body` before the render-cut freeze;
8. worker privileged save path accepts an allowed content sender without a separate extension-owned user-confirmation receipt.

No single item above is enough by itself to characterize the whole owner. Together they show the current architecture has not yet established the Registry trust boundary.

## 15. Source-bound gate design

A P0-075 committed-source gate should fail until runtime demonstrates at least:

- page-embedded WebClip root is not open when carrying extension UI;
- page-embedded event handlers reject untrusted activation;
- privileged save/retry/download controls are no longer directly page-hosted authority;
- private file comment is collected in extension-owned UI;
- worker privileged admission includes extension-owned confirmation plus exact source receipt;
- interactive selection authority is no longer published as stable page attributes;
- print materialization has an explicit isolation primitive and no longer inserts private comment/final authority into live host body before isolation;
- OAuth token remains absent from content/print representation;
- existing P0-067/P0-068/P0-071 guards remain wired.

The gate must inspect implementation structure, not merely search for comments or marker strings.

## 16. Required direct Chrome evidence before closure

P0-075 is observably browser/realm dependent and cannot close from a pure model.

Current-Chrome harness should include at least:

### Case A — DOM confidentiality baseline

Current baseline page attempts to inspect the known WebClip root.

Record whether it can observe:

- open shadow root;
- comment textarea value;
- privileged destination controls;
- include/exclude attributes.

### Case B — synthetic activation baseline/control

A hostile fixture attempts native DOM synthetic activation of a WebClip destination control from the page main world.

Measure only controlled test counters/stubbed destination admission; do not contact a real external destination for the negative control.

This test establishes the real cross-world Chrome behavior rather than relying only on reasoning.

### Case C — post-fix confidentiality

Host page cannot traverse WebClip control internals or recover the private comment/selection authority from shared DOM.

### Case D — post-fix synthetic activation

Untrusted page-generated input cannot cause a privileged admission or mutate selection authority.

### Case E — real trusted user path

Trusted interaction in the selected extension-owned UI can still perform a bounded test save path.

### Case F — print isolation

Fixture page runs aggressive MutationObserver/timer callbacks while WebClip prepares.

Evidence proves those callbacks cannot read/modify the final isolated representation after its authority boundary and before the actual print cut.

### Case G — regression composition

Re-run relevant P0-067, P0-068 and P0-071 browser/deterministic evidence after P0-075 implementation.

## 17. Deterministic model

Added:

`project_tools/test_p0_075_host_control_plane_model.js`

The model covers:

- open page-hosted sensitive UI is host-readable;
- closed root is useful encapsulation for non-privileged page UI;
- extension-owned UI is outside host DOM;
- isolated Map plus authoritative page attributes still leaks selection authority;
- page-hosted control plane never authorizes privileged save in the selected strong contract;
- extension-owned save requires trusted confirmation and exact source receipt;
- page selection interaction requires trusted event + connected target + same session;
- final print representation must be extension-owned/exact-source-bound/sealed before destination effects.

Local execution before commit:

```text
P0-075 host control-plane isolation model: PASS
```

This is architecture/model evidence only.

## 18. Implementation decomposition

A safe future runtime implementation should be split so regressions are attributable.

### Block A — page UI encapsulation and activation

- closed Shadow DOM for remaining page affordances;
- reject untrusted page-embedded events;
- remove sensitive/private fields from page root.

### Block B — selection authority cleanup

- keep exact include/exclude identities only in isolated session state;
- remove stable authoritative selection ids from host-owned elements;
- adapt visual overlays without publishing authority.

### Block C — extension-owned save confirmation

- destination/comment/retry controls in extension-owned page;
- worker-owned confirmation generation;
- exact P0-070/P0-080 source/session binding.

### Block D — printable representation isolation

- create explicit isolated render target/materialization primitive;
- preserve P0-068 inertness and P0-071 final guard;
- hand sealed result to P0-079.

### Block E — current-Chrome evidence

- confidentiality;
- synthetic activation negative control;
- trusted user path;
- hostile host mutation during print preparation;
- P0-067/068/071 regression.

## 19. Status

P0-075 is **architecture-saturated for the first control-plane/representation design pass, but remains ACTIVE**.

No runtime file, manifest, Registry status, release readiness, build, tag, GitHub Release or production behavior is changed by this checkpoint.

Runtime closure requires implementation + committed-source GREEN gate + direct current-Chrome evidence.
