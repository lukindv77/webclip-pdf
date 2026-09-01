# P0-068 closure evidence — inert flattened same-origin iframe proxy — 2026-09-01

Date: 2026-09-01

Primary owner: `P0-068`.

Duplicate historical owner reconciled by this closure: `P1-213` -> `P0-068`.

Baseline `main`: `d7f0fde8732b42902bfcb023c5359408972f5fbd`.

Accepted current-Chrome evidence head: `9e44a66340f06a62309145d17e7b4369aeffb35a`.

Accepted GitHub Actions run: `33465846960`, job `99725415291`, conclusion **SUCCESS**.

Browser: Google Chrome for Testing `152.0.7977.64`.

## 1. Acceptance contract

The flattened same-origin iframe print representation must be inert **before it is connected to the live top document**. Creating the printable copy must not itself execute page behavior, create nested browsing/plugin contexts, trigger custom-element lifecycle, preserve executable inline handlers, or introduce duplicate live identity. Ordinary readable content must remain printable, and explicit WebClip Exclude semantics must still apply.

This is narrower than general PDF fidelity/resource completeness. Renderer resource fetching needed for retained ordinary visual content remains governed by its existing bounded resource owner.

## 2. Source defect at baseline

`content.js::createFlattenedBodyFramePrintProxy()` deep-cloned every direct child of a selected same-origin iframe body with `node.cloneNode(true)`, removed only cloned `script` elements and WebClip Exclude descendants, then appended the proxy to the live top-document body.

A deep DOM clone preserves attributes and active element types. Connecting that clone can therefore create behavior even without a synthetic click.

## 3. Implementation

The implementation adds `frame-proxy-inert-guard.js` and installs it before `content.js` in every top-content injection path.

The guard is intentionally source-bound to the single researched `.cloneNode(true)` call in current `content.js`. In the extension isolated world it replaces deep Element cloning with a manual inert mirror builder. Host-page main-world `Node.prototype.cloneNode` remains native.

Before insertion the inert mirror:

- neutralizes active nested HTML elements such as iframe/frame/object/embed/media/script and autonomous custom elements into inert ordinary placeholders;
- strips inline `on*` event-handler attributes;
- strips duplicate identity/capability attributes including `id`, `name` and `is`;
- strips ID-reference/control relationship attributes and action/navigation attributes such as `action`, `formaction`, `srcdoc`, `autoplay`, `autofocus`, `ping` and related fields;
- disables copied form controls;
- marks copied HTML elements/root inert;
- preserves ordinary text/layout-bearing markup and image/resource attributes needed for static rendering;
- leaves the existing WebClip Exclude marker available until `content.js` removes excluded cloned descendants.

`content-injection-guard.js` wraps worker `chrome.scripting.executeScript()` and rewrites an injection of `['content.js']` to `['frame-proxy-inert-guard.js', 'content.js']`. `popup.js` injects the same order directly. `journal-text-filter.js` loads the worker injection guard synchronously beside the existing PDF print guard.

## 4. Deterministic regression

`project_tools/test_p0_068_inert_frame_proxy.js` verifies:

- iframe and autonomous custom elements classify as active while ordinary tables remain ordinary;
- inline handlers, identity, relationship and action attributes are stripped;
- iframe/object/video/custom/script descendants become inert placeholders;
- form controls are disabled;
- script source text does not leak as visible text;
- ordinary image/static attributes and the Exclude marker survive until ordinary WebClip clone cleanup;
- worker injection rewriting prepends the inert helper only for `content.js`;
- popup and worker bootstrap wiring are present;
- current `content.js` retains exactly one researched deep-clone interception boundary.

Accepted output:

`P0-068 / P1-213 inert flattened-frame proxy: PASS`

## 5. Current Chrome physical evidence

The current-Chrome harness is `project_tools/research_p0_068_inert_frame_proxy.py`.

### Native deep-clone failure control

A real source iframe contained a custom element, image with inline `onerror`, nested iframe, object, autoplay video, form/button actions and duplicate ids.

Native `cloneNode(true)` + live insertion produced:

- active descendants retained: **4**;
- inline handlers retained: **3**;
- duplicate top-document ids: **2 / 2 / 2** for the three identity controls;
- custom-element delta on connect: construct **+1**, connect **+1**;
- inline image-error side effect: **+1**;
- nested iframe request: **+1**;
- object request: **+1**;
- custom-element disconnect after cleanup: **+1**.

This positive failure control proves the browser actually executes the class of behavior the owner describes.

### Guarded extension-isolated-world control

The real MV3 fixture worker installed the content-injection guard, and the page confirmed the inert helper ran before `content.js`.

The host main-world `Node.prototype.cloneNode` was native both before and after extension injection, proving the patch did not leak into page script authority.

For the guarded clone:

- deep guarded element clones: **1**;
- installed same-origin isolated realms: **3**;
- neutralized active elements: **4**;
- neutralized custom elements: **1**;
- inert elements: **15**;
- stripped event handlers: **3**;
- stripped duplicate identity attributes: **9**;
- active tags after insertion: **0**;
- inline handlers after insertion: **0**;
- duplicate identity attributes after insertion: **0**;
- action attributes after insertion: **0**;
- duplicate top ids remained **1 / 1 / 1**;
- copied button was disabled;
- root was inert.

Host-effect deltas after guarded insertion were all zero: custom construct/connect/disconnect, image handler and inline click.

Nested active-load deltas were also zero for iframe and object. One ordinary image request remained possible because static image resources are intentionally preserved for rendering; its copied inline handler was absent and did not execute. That resource-fetch boundary remains governed by the existing renderer-resource policy and is not an active-context side effect.

Cleanup produced zero custom-element disconnect delta.

## 6. Physical PDF positive controls

The guarded proxy physically printed ordinary selected content, including:

- `FRAME_TEXT_SENTINEL_guarded`;
- `CUSTOM_VISIBLE_guarded` as inert readable text;
- `BUTTON_SENTINEL_guarded`;
- `TABLE_SENTINEL_guarded`.

The explicitly excluded sentinel was absent.

Physical PDF:

- pages: **1**;
- SHA-256: `b1b105ff8bf73962e4daa455a26701361dff2bd73a733976de043271e0b7d16b`.

This is the required L4 discriminator: inertization blocks active behavior without replacing selected content with an empty/failed representation.

## 7. Change Impact after accepted evidence head

After accepted evidence head `9e44a66340f06a62309145d17e7b4369aeffb35a`, the temporary evidence workflow is deleted and only durable research/status/index documentation may change before delivery. Runtime guards, wiring, deterministic regression and physical harness must remain byte-equivalent for this Chrome evidence to stay applicable.

## 8. Owner and dedup conclusion

`P0-068` now satisfies its implementation + direct current-Chrome verification contract and can transition to **DONE**.

`P1-213` is not an independent remaining root cause. Its wording — flattened same-origin iframe print proxy must be inert before live insertion — is fully contained by the canonical `P0-068` root, which additionally names the concrete nested browsing/plugin/custom-element/duplicate-identity side effects. Therefore `P1-213` transitions to **MERGED -> P0-068** and remains permanently reserved.

This closure does **not** close broader PDF representation/resource/budget/host-trust owners. In particular, complete rendered-state preservation, resource readiness, clone-size admission and general host-page isolation remain governed by their separate Registry rows.

`RELEASE_READINESS.md` remains **NOT READY**. This engineering closure does not create a build, tag or GitHub Release.
