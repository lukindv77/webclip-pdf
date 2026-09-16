# Research evidence — P0-075 host-page control-plane revalidation — 2026-09-16

Canonical baseline: `main` at `8695b23704d99ca0c91657291b89e797d5e7bc47`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Owner and result

Canonical `RESEARCH_REGISTRY.md` keeps **P0-075 ACTIVE**:

> Host page is not a trusted UI/control plane: sensitive input/selection/authorization state must not be host-readable or synthetic-event authorizable; print representation should be isolated.

Fresh-current-source review reconfirms that root cause. No new P-code is created.

**Current result: `P0-075 = ACTIVE / ROOT-CAUSE-REVALIDATED`.**

This tranche does **not** claim implementation closure, physical browser closure, or release readiness.

## Fresh canonical source receipts

Baseline source was read from exact canonical commit `8695b23704d99ca0c91657291b89e797d5e7bc47`.

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.
- `RESEARCH_REGISTRY.md` Git blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`.
- `RELEASE_READINESS.md` Git blob: `165766b248ffa48fc88f0140283adf0e855df22f`.
- `manifest.json` current version: `0.9.8`; release target remains `0.9.9` and current release state is `NOT READY`.

## Semantic duplicate / root-cause reconciliation

Historical evidence was consulted only for provenance and semantic dedup.

`RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` already preserves the historical P0-075 control-plane refinement:

- WebClip injects a predictable host into the page and creates an **open** shadow root;
- sensitive file-comment input lives inside that host-readable shadow tree;
- `createUiButton()` invokes privileged callbacks without a trusted-event admission check;
- page-level selection click handling likewise has no `event.isTrusted` gate;
- page-visible include/exclude markers are not a safe authority boundary;
- the file comment is later copied into an ordinary `document.body` print-header node.

Therefore this work extends the existing **P0-075** owner. It does not allocate a duplicate finding and does not reassign P0-020, P0-066, P0-067 or P0-071.

Adjacent owner boundaries:

- **P0-020 / sender ACL family**: privileged worker caller/source validation. Here the worker request genuinely originates from WebClip content code; the missing boundary is user intent inside host-page UI.
- **P0-066**: durable/display URL confidentiality sanitizer. P0-075 is about host-page access to sensitive control/input/selection state.
- **P0-067 DONE**: prevents WebClip print preparation from activating page-owned controls. P0-075 is the reverse trust direction: hostile page code reaching or influencing WebClip-owned controls/state.
- **P0-071 DONE**: render-cut safety for unsafe PDF link annotations and page freeze. It does not make the earlier host-page UI/control plane private.
- **P0-070/P0-080**: source/application-generation authority. P0-075 additionally requires that the user authorization itself cannot be synthesized or tampered with by the host page.

## Fresh current-source proof

### 1. WebClip UI is reachable through an open shadow root

Current `ensureUi()` creates a predictable host and then:

```js
const shadow = host.attachShadow({ mode: 'open' });
```

The host lives in the page DOM. `open` therefore exposes `host.shadowRoot` to JavaScript that can resolve the host element.

### 2. Sensitive file comment lives in that host-readable tree

The save dialog creates an ordinary textarea:

```js
const textarea = document.createElement('textarea');
textarea.rows = 5;
textarea.placeholder = 'Можно оставить пустым';
...
state.modalExtra.appendChild(wrap);
```

The save callback later reads the mutable DOM value at authorization time:

```js
const options = { readingMode: later ? 'later' : 'read', fileComment: textarea.value.trim() };
if (destination === 'download') downloadPdf(proceed, back, options);
else sendPdfToYandex(proceed, null, back, options);
```

A host script able to reach the open shadow tree can therefore read or rewrite this value before the callback consumes it.

### 3. Privileged control callbacks do not require a trusted user event

Current generic WebClip UI button binding is:

```js
button.addEventListener('click', (event) => {
  event.stopPropagation();
  onClick(event);
});
```

A full-text search of current `content.js` finds no `isTrusted` admission check.

That makes a page-script `.click()`/synthetic click capable of entering the same WebClip callback path as a real user click if the host can reach the button node. For the Proceed button that path reaches `downloadPdf(...)` or `sendPdfToYandex(...)`, and then privileged runtime messaging.

This is a **user-intent authorization** problem even though Chrome's runtime sender ACL remains intact.

### 4. Selection mutation has the same missing trusted-event boundary

WebClip attaches page click listeners while selection is active. `onPageClick(event)` checks internal/UI/phase conditions but current source contains no `event.isTrusted` gate.

A hostile page can therefore synthesize a page click that participates in Include/Exclude mutation while selection mode is active. A trusted-event control is needed at the user-input boundary; merely keeping the selection Maps in the isolated-world JavaScript namespace is insufficient because the event originates through the shared DOM.

### 5. Authoritative selection is also represented by host-visible markers

Current `addInclude(element)` does both:

```js
element.setAttribute(INCLUDE_ATTR, id);
state.includes.set(id, element);
```

The extension-side Map is private to the isolated world, but the attribute is ordinary page DOM. Host code can observe, remove, replace or inject matching attributes.

P0-075 therefore requires the final print selection authority to be derived from extension-held logical state / exact generation, not from long-lived page-visible markers. If temporary markers are unavoidable, they must be derived immediately from the extension-owned receipt for the frozen/inert print representation and removed with exact rollback.

### 6. Closing the shadow alone would not close the owner

Even if the toolbar shadow were changed from `open` to `closed`, current print preparation copies the file comment into an ordinary header and inserts it into the host body:

```js
if (String(meta.fileComment || '').trim()) {
  header.appendChild(makeMetaRow('Комментарий', String(meta.fileComment || '').trim()));
}
...
document.body.insertBefore(header, document.body.firstChild);
```

A hostile host can observe ordinary DOM while its scripts are runnable. P0-075 therefore needs an architecture-level isolation boundary for sensitive input/authorization and the print representation, not merely a one-token Shadow DOM change.

## External standards/vendor revalidation

### Chrome — isolated worlds do not create a private DOM

Chrome's content-script documentation states that content scripts run in an isolated JavaScript world but **share access to the page's DOM** with the host page. This exactly matches the WebClip distinction: extension JS variables are isolated, but page-DOM nodes used as UI/control/data surfaces remain a shared boundary.

Sources:

- Chrome Extensions content scripts / isolated worlds:
  - https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
  - mirrored source: https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/mv3/content_scripts/index.md
- Chrome architecture overview:
  - https://developer.chrome.com/docs/extensions/develop/concepts/extension-and-content-scripts
- Chrome security guidance:
  - https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure

Chrome security guidance explicitly warns that hostile pages may manipulate DOM that a content script depends on. This supports treating the host DOM as untrusted input/control surface.

### MDN — open Shadow DOM is externally reachable

MDN documents that `attachShadow({mode: "open"})` exposes the shadow root through the host's `shadowRoot`; code outside the root can access its internals.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode

MDN also cautions that `closed` mode should not be treated as a complete strong security mechanism. Accordingly, this tranche does not propose `mode: "closed"` as sufficient closure.

### DOM event trust

MDN documents `Event.isTrusted` as `false` for script-dispatched events and specifically notes that a `click` produced through `HTMLElement.click()` has `isTrusted === false`.

Source:

- https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted

This supplies a concrete browser primitive for rejecting ordinary page-script synthetic authorization events, while the final design must also bind authorization to the current WebClip control/session generation and protect against UI redressing/tampering.

## Public-project evidence / negative controls

Public projects/issues were used only to validate browser behavior and architectural patterns, not as proof of the WebClip defect.

1. GoogleChrome/chrome-extensions-samples issue #807 discusses `.click()` behavior across MV3 isolated/main worlds and demonstrates that programmatic click is a real extension/page interaction primitive:
   - https://github.com/GoogleChrome/chrome-extensions-samples/issues/807
2. W3C WebExtensions issue #1009 discusses content-script timing/trust and explicitly references a closed-shadow-root workaround when code must avoid relying on host-compromisable page APIs:
   - https://github.com/w3c/webextensions/issues/1009
3. W3C WebExtensions issue #612 documents explicit APIs used by extension worlds to access open/closed shadow roots; this reinforces that Shadow DOM visibility is a deliberate capability boundary rather than equivalent to a privileged extension page:
   - https://github.com/w3c/webextensions/issues/612

These are architectural controls/analogs. They do not independently establish the WebClip source bug; the fresh WebClip source above does.

## User/community evidence

Community extension-development practice also treats injected page UI as an isolation problem. For example, a 2026 Chrome-extension showcase describes choosing a **closed Shadow DOM** for injected UI isolation and keeping prompt/context data local. This is anecdotal practice rather than a security proof:

- https://www.reddit.com/r/chrome_extensions/comments/1sqid8k/showcase_built_a_zerotelemetry_promptcontext/

The stronger conclusion comes from the Chrome/DOM specifications and the current WebClip source, not from the community post.

## Deterministic failure / acceptance model

Added model:

`project_tools/test_p0_075_host_page_control_plane_revalidation_model.js`

Local execution:

- `node --check`: PASS
- execution: **P0-075 host-page control-plane model: PASS 47 checks**
- SHA-256: `e2b994228019b00d20007675189c9d15612b1f1b59d9d2c1f8a252287887bb37`
- expected Git blob: `4b15bfba8d123ccc1390918daeee05285fcb7ebb`

The model covers:

1. current open-shadow host reachability;
2. host-readable and host-mutable sensitive input;
3. current synthetic Proceed acceptance without a trusted-event gate;
4. `isTrusted` rejection of synthetic click while preserving real-user click;
5. synthetic page click mutation of selection vs trusted-event admission;
6. ordinary-body print-comment disclosure;
7. closed-shadow-only negative control;
8. page-visible include marker deletion/injection vs extension-held logical selection;
9. exact control/session-generation authorization;
10. explicit separation from P0-067's reverse-direction host-control guard;
11. isolated JavaScript world positive control while shared DOM remains untrusted.

## Required implementation acceptance

P0-075 physical implementation closure requires all of the following.

### A. Sensitive UI state is extension-owned

Sensitive user text and authorization state must not be readable or writable through host-page DOM.

Preferred architecture: place save/upload confirmation and sensitive free-text input in an extension-owned page/surface (for example popup/side-panel/extension document) and communicate with content code through bounded typed messages.

If an injected page UI is retained for non-sensitive selection affordances, it must be treated as presentation over untrusted DOM, not as the authorization store.

### B. Synthetic host events cannot authorize privileged actions

A host-script `.click()`/`dispatchEvent()` on any reachable WebClip node must not authorize:

- local PDF save;
- Yandex upload/retry;
- destructive/authoritative selection transitions;
- other privileged operations.

Trusted input must be checked at the WebClip user-intent boundary and bound to the current control/session generation. `event.isTrusted` is a useful required control for ordinary synthetic events but is not, by itself, the whole authorization architecture.

### C. Selection authority remains extension-held

Include/Exclude logical identity and generation remain in extension-owned state. Host-visible data attributes cannot be accepted as authority.

Temporary print markers, if still required, are derived from the exact current extension-owned selection receipt only for the frozen/inert print representation and have exact-generation rollback.

### D. Print representation does not re-expose sensitive control data

Closing the toolbar shadow is insufficient if sensitive text is copied into live host DOM before the host page is safely frozen/isolated.

The final print architecture must either:

- construct sensitive header/print content in an isolated/frozen representation inaccessible to running host code; or
- prove an equivalent ordering/fence in which hostile host code cannot observe or mutate the injected representation.

### E. Trust directions remain separate

P0-067's protection against **WebClip activating page-owned controls** must remain intact.

P0-075 closes the opposite direction: **host page influencing WebClip control/authorization state**.

## Required physical Chrome regressions

Real unpacked-Chrome closure should prove at least:

1. hostile page cannot read a user's live file comment;
2. hostile page cannot overwrite that comment before save authorization;
3. hostile page `.click()` on a WebClip Proceed/Save/Upload control is rejected;
4. hostile `dispatchEvent()` is rejected;
5. a genuine user click still succeeds;
6. hostile synthetic page click cannot add/remove authoritative selection;
7. page mutation/removal/injection of `data-webclip-pdf-include` / `...exclude` cannot change final logical print scope;
8. page MutationObserver cannot capture sensitive print-header data while page script is runnable;
9. UI/control generation change invalidates stale trusted authorization;
10. P0-067 host-control-activation regressions remain PASS;
11. PDF fidelity/selection regressions remain PASS.

## Closure interpretation

This tranche supplies fresh current-source and external revalidation plus a deterministic acceptance model.

It is **not** implementation closure.

`P0-075` remains **ACTIVE / ROOT-CAUSE-REVALIDATED** until runtime architecture changes and the required real Chrome regressions are durable on current source.

Release readiness remains **NOT READY**.
