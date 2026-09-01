# Durable research evidence — interactive capture / live frame topology / renderer state — 2026-08-29

Canonical status remains exclusively in `RESEARCH_REGISTRY.md`. This file is durable supporting evidence for a 24-block semantic research tranche. Runtime, `manifest.json`, build/tag/release state and release-readiness are not changed by this evidence.

Baseline source researched: `main` at `0121f81a1caa447b2d184b22ae08ef5b1c69237b`.

Local semantic browser controls used Chromium `144.0.7559.96`. They are policy-safe reproduction evidence, not a substitute for real unpacked-Chrome release QA, optional-host-permission QA or real Yandex OAuth/API E2E.

## Executive classification

One new independent owner is justified:

- **P1-227 ACTIVE** — active manual selection does not continuously discover newly inserted/replaced same-origin frame documents. A frame added after selection starts can remain outside the listener graph, so the user cannot select its inner DOM until some unrelated explicit rediscovery path happens.

Existing owners receive stronger acceptance evidence rather than duplicate codes:

- **P0-004 ACTIVE** — flattened same-origin iframe materialization can reorder mixed selections because the P1-152 proxy is appended to the top-document body; selected-copy fidelity must preserve logical/source ordering in addition to completeness and selection bounds.
- **P0-075 ACTIVE** — a page-selection gesture cannot be made host-inert merely by a late document-level `click` capture handler. Earlier host capture listeners and pointer/mouse events can execute first. Picker interaction therefore needs an extension-owned interaction boundary rather than trusting propagation ordering.
- **P1-187 ACTIVE** — flattened same-origin iframe proxy fidelity is broader than canvas: current video frame, current select state, Shadow DOM, pseudo-elements, complete layout/visual state and source-document URL/base resolution are all renderer-owned/source-context state that deep cloning plus a 2500-element style allowlist can lose.
- **P1-160 ACTIVE** — advertising-candidate discovery still materializes entire selected subtrees through `[root, ...root.querySelectorAll('*')]`; this is another bounded discovery surface, not a new owner.
- **P0-066 / P0-071 ACTIVE** — image/link PDF annotations can durably preserve signed/tokenized URLs; safe durable URL sanitization must apply to actual PDF navigation targets.
- **P0-068 / P1-213 ACTIVE** — custom elements cloned into a flattened proxy can execute `connectedCallback` when that proxy is inserted; the proxy must be inert before insertion.
- **P2-006 / P2-007 BACKLOG** — Shadow DOM scope and virtualized/deferred content still require explicit capture/mode policy. This tranche does not reactivate P1-003 merely from those architecture gaps.

## Block 1 — dynamic same-origin iframe insertion misses the selection listener graph — P1-227

Current `content.js` behavior:

- `startSelection()` calls `addPageListeners()`;
- `addPageListeners()` calls `refreshFrameDocuments()` once and attaches listeners to documents discovered at that moment;
- `refreshFrameDocuments()` installs a `load` handler only on frame elements that it has already discovered;
- known-frame reload therefore causes rediscovery;
- there is no selection-session `MutationObserver`, navigation observer or periodic topology refresh for newly inserted/replaced frame elements;
- `detectMainContent()` happens to call `refreshFrameDocuments()`, so using «Основной контент» can accidentally repair discovery, but ordinary manual selection does not.

Policy-safe Chromium reproduction matching that topology contract:

1. create a same-origin iframe before selection starts;
2. run discovery and attach child-document listeners;
3. click inside the existing frame — listener receives the event;
4. append a second same-origin iframe after selection starts;
5. click inside the new frame without calling rediscovery.

Observed result:

```json
{
  "hits": ["b1"],
  "knownDocs": 2,
  "newKnown": false
}
```

The new child document is live and same-origin, but manual selection cannot reach it because no WebClip listener was attached.

This also applies to replacement topology: replacing a frame element with a new element creates a new child document not owned by the old element's `load` handler.

### P1-227 acceptance

An active selection session needs bounded/coalesced live topology ownership:

1. newly inserted/replaced same-origin `iframe`/`frame` elements become discoverable/selectable without restarting selection or invoking auto-content;
2. nested newly inserted frames are handled recursively within a bounded node/frame/time budget;
3. known-frame navigation/reload remains supported by the existing load path or equivalent exact document-generation path;
4. detached child documents/listeners and removed frame-element handlers are cleaned up;
5. topology refresh is selection-session generation bound so a stale observer/task cannot attach authority after stop/restart;
6. discovery must not degrade into unbounded full-document rescans on every mutation; coalesce and bound changed-subtree work under the P1-160 discovery budget;
7. inaccessible/cross-origin documents remain fail-closed and are not read through same-origin logic;
8. cross-origin permission/agent identity remains under P1-004/P1-171/P1-193/P1-200/P1-201/P1-203 rather than being silently absorbed by this owner.

Required deterministic/browser regression: start selection, insert and replace same-origin frames at one and two nesting levels, select inside them, then remove them and prove listeners/selection-session authority are cleaned without restart.

## Block 2 — known same-origin frame reload is a positive control

The existing `refreshFrameDocuments()` registers a capture `load` handler on every already discovered frame. When such a frame reloads while selection remains active, that handler calls `refreshFrameDocuments()` and schedules outline update.

Therefore P1-227 is not a generic claim that all frame navigation is broken. Its reproduced gap is **frame-element topology that appears after the current discovery graph was built**.

## Block 3 — dynamic cross-origin frame topology is a related parity risk, not a new owner

`manifest.json` has no persistent all-sites content script. Cross-origin DOM access is optional-permission based.

`popup.js` calls `enableGrantedFrameAgents(tabId)` immediately before `WEBCLIP_START_SELECTION`; the worker's `enableFrameAgentsForTab()` performs a one-shot `chrome.scripting.executeScript({target:{tabId, allFrames:true}, files:['frame-agent.js']})` over frames that exist at that moment.

A new cross-origin iframe inserted later therefore does not automatically inherit an agent merely because its origin permission had previously been granted. The user can revisit the explicit frame-access flow, but this is not continuous selection-session topology tracking.

Classification: keep cross-origin lifecycle under P1-004/P1-171/P1-193/P1-200/P1-201/P1-203. P1-227 owns only accessible same-origin live topology. Future implementation should nevertheless avoid creating opposite semantics where same-origin topology updates automatically but already-permitted cross-origin topology silently remains stale without truthful UI/degradation.

## Block 4 — selection marker changes can alter what the page renders — existing P0-075

WebClip writes predictable `data-webclip-pdf-include` / `data-webclip-pdf-exclude` attributes into host-owned elements. A page can style these selectors itself.

A browser control with page CSS targeting `[data-webclip-pdf-include]` changed selected element presentation and injected a `::before` marker immediately when the WebClip-like attribute was added.

This is not a new root cause. Existing hostile-selection-marker evidence already places host-readable/mutable marker authority under P0-075. A capture architecture should not treat page-observable attributes as private immutable selection authority.

## Block 5 — host MutationObserver can observe exact selection timing/content — existing P0-075

A page-owned `MutationObserver` watching attributes observed the WebClip selection marker mutation together with the selected element identity/text. This confirms the host can observe selection timing and scope through shared DOM markers.

Again this is a P0-075 trust-boundary refinement, not a new owner.

## Block 6 — prior page capture handler can run before WebClip `click` suppression — existing P0-075

Current manual selection uses a document-level capture `click` listener and then calls `preventDefault()`, `stopPropagation()` and `stopImmediatePropagation()`.

A real CDP isolated-world control registered a page-owned document capture handler first and a content-script-like isolated-world capture handler later. Dispatch order was:

`MAIN > ISO`

The page side effect had already occurred when the isolated-world handler tried to suppress the event.

Therefore content-script world isolation does not make late event-listener ordering a reliable authority boundary.

## Block 7 — pointer/mouse events fire before the intercepted click — existing P0-075

Current selection installs `mousemove`, `click`, `keydown` and `scroll`; it does not own `pointerdown`, `mousedown`, `pointerup` or `mouseup`.

A browser event-order control observed:

`pointerdown -> mousedown -> pointerup -> mouseup -> webclip-click`

A page can therefore perform application side effects during the same user gesture before WebClip processes the final click. Faithful/secure selection cannot promise “select without interacting with the page” by blocking only click.

### P0-075 acceptance refinement

Picker gestures should be isolated from host application interaction by design, for example through an extension-owned pointer surface/hit-test architecture that obtains the underlying candidate geometry without dispatching the user's picker gesture into host controls. Exact implementation is open, but page event-listener registration order must not be the security or UX contract.

## Block 8 — proxy insertion activates custom elements — existing P0-068 / P1-213

A detached clone containing a custom element caused no connection callback while detached, but appending the proxy to the live document fired `connectedCallback`.

Current flattened proxy cloning therefore must not be considered inert merely because scripts were removed. Existing P0-068/P1-213 correctly own this class.

## Block 9 — `cloneNode(true)` form state is inconsistent — P1-187

Runtime-state clone control:

- `<select>` current selection reverted to markup/default state in the clone;
- tested `<input>.value`, checkbox `.checked` and `<textarea>.value` happened to carry current runtime state in Chromium;
- behavior is therefore element/state-specific and cannot be modeled as “cloneNode preserves form state”.

P1-187 acceptance must explicitly include current select/options and other renderer-owned control state rather than relying on deep clone semantics.

## Block 10 — ordinary Shadow DOM is absent from deep clone — P1-187 / P2-006

For a normal `attachShadow({mode:'open'})` host, `host.cloneNode(true)` produced a clone without `shadowRoot` and without the shadow-rendered text.

Direct page rendering can show the shadow content, so flattened iframe fidelity must explicitly capture/materialize it when the selected representation includes that host. Explicit selection *inside* Shadow DOM remains P2-006; preservation of already-rendered Shadow content inside an iframe proxy is a P1-187 fidelity requirement.

## Block 11 — selected-host resource scan does not traverse Shadow DOM — P2-006/P2-007 boundary

Current `includedElementsBounded()` walks ordinary DOM descendants with a TreeWalker rooted at the Include. `collectIncludedElements()` uses `querySelectorAll()` on light DOM. Neither traverses a host's shadow tree.

A control host with a shadow image/span confirmed the shadow descendants were absent from the light-DOM scan.

This can matter for custom lazy-resource state inside Shadow DOM, but this tranche does **not** reactivate P1-003 solely from that architecture gap. Exact Shadow capture/materialization scope remains coupled to P2-006/P2-007 unless a concrete current-resource readiness regression independently violates P1-003's accepted contract.

## Block 12 — virtualized lists prove CSS expansion alone cannot create absent content — P2-007

A virtual list control represented logical rows 0–99 while retaining only currently rendered rows 90–99 in DOM. Expanding overflow/height cannot archive rows that the application has already removed.

This is a structural distinction between:

- **clipped DOM**: content exists and can be statically reflowed;
- **virtualized logical content**: content does not exist in the captured DOM generation.

A faithful/expanded archival mode therefore needs an explicit bounded materialization strategy or a truthful incomplete/degraded result. It must not imply completeness because `scrollHeight` or CSS overflow was expanded.

## Block 13 — direct Chromium PDF preserves tested current top-document control state — positive control

A direct PDF after runtime mutations contained tested current contenteditable, textarea, input, select and checked-control presentation/text.

This is an important architecture control: Chromium direct rendering can be stronger than a cloned intermediate representation. Shared format-neutral capture / iframe flattening must not regress renderer-owned state that the final renderer can already preserve.

## Block 14 — selected-root overflow clipping remains P0-004

A selected root with fixed height and `overflow:hidden` contained `TOP_MARKER` and a lower `BOTTOM_MARKER`. WebClip-equivalent selected-only print CSS printed only the top marker.

This reconfirms current P0-004. No new number.

## Block 15 — corrected tall-iframe negative control

An initial local test fixture accidentally corrupted `srcdoc` quoting and falsely suggested that a long non-body iframe always lost its tail. The fixture was corrected before classification.

Corrected control:

- child document scroll height: about 2100 CSS px;
- direct tall iframe PDF: 4 pages, both `FRAME_TOP` and `FRAME_BOTTOM` present;
- flattened-flow control: 2 pages, both markers present.

Do **not** use the discarded fixture as evidence. There is no new generic “non-body iframe always clips” owner from this tranche.

## Block 16 — native `<details>` is an explicit mode control

Direct PDF of a closed `<details>` printed its summary but not hidden body; opening it printed the body.

This supports existing P2-007 mode semantics: faithful-current-view and expanded/archival representations are different policies. It does not justify hidden activation or synthetic page-owned clicks.

## Block 17 — top-document page scale is a positive geometry control

A CDP `pageScaleFactor=1.5` control kept top-document CSS `getBoundingClientRect()` coordinates in the same CSS coordinate space. This does not reopen P1-226 beyond its actual frame-coordinate composition problem.

## Block 18 — P1-152 top-body proxy mount can reorder mixed selected content — P0-004 / P1-187

Historical P1-152 intentionally changed flattened selected-body iframe proxy placement from the iframe's original shell to `ownerDoc.body.appendChild(proxy)` so site flex/grid/fixed-height ancestor constraints could no longer clip pagination.

That pagination fix creates a distinct ordering failure when a page contains selected content before and after the iframe.

Control page logical/source order:

1. selected `A_TOP` in top document;
2. selected iframe body `B_FRAME`;
3. selected `C_BOTTOM_NEIGHBOR` in top document.

After current-equivalent proxy append + original iframe hide, PDF text order was:

`A_TOP -> C_BOTTOM_NEIGHBOR -> B_FRAME`

The copy is complete but no longer faithful to the selected page ordering.

### P0-004 acceptance refinement

Selected-copy fidelity is **complete, selection-bounded and order-preserving**. WebClip-owned reparenting/flattening must not silently reorder selected logical/source regions. Fixing this must retain the P1-152 anti-clipping property; simply moving the proxy back under the hostile iframe ancestor shell is not acceptable.

P1-187 remains the implementation locus for the proxy representation; P0-004 owns the user-visible PDF fidelity invariant.

## Block 19 — proxy CSS allowlist loses ordinary rendered layout/visual state — P1-187

Current `FLATTENED_FRAME_STYLE_PROPERTIES` transfers a limited subset of computed style. A control matching that allowlist compared source vs clone and reproduced:

- source two-column grid -> clone single wide column because `grid-template-columns` was absent;
- `gap:17px` -> `normal`;
- `box-shadow` -> none;
- `filter:grayscale(...)` -> none;
- `opacity:.4` -> 1;
- source `::before` generated content -> absent.

Direct Chromium PDF controls in the same research showed ordinary masks, border-image and pseudo-element presentation can be rendered by Chromium. Therefore this loss is introduced by WebClip flattening, not an inherent PDF limitation.

## Block 20 — style budget accidentally becomes URL/base correctness budget — P1-187

`copyFrameCloneUrlState()` resolves/copies current anchor/image/media URLs, but it is currently invoked from `copyComputedFrameCloneStyle()`, which runs only for the first `FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500` aligned elements.

Control:

- child document base: `https://child.example/sub/`;
- top document base: `https://top.example/root/`;
- source body contains more than 2500 elements;
- a tail image after the style limit uses relative `images/tail.png`.

Source resolved URL:

`https://child.example/sub/images/tail.png`

Flattened tail clone resolved URL after insertion into top document:

`https://top.example/root/images/tail.png`

Thus a style-performance budget can silently become a resource-identity corruption boundary.

### P1-187 acceptance refinement

Correct source-document URL/base identity for all relevant cloned resource/navigation nodes must not depend on whether their expensive computed-style transfer was admitted. Use a separate bounded correctness pass / captured representation. If visual style fidelity is intentionally degraded by a budget, diagnostics must say so rather than silently resolving resources against a different document.

## Block 21 — current video frame is directly printable but deep cloning loses it — P1-187

A generated two-second WebM used a red first second and blue second second. The video was paused at `currentTime=1.5s`.

Observed:

- screen at capture: blue frame;
- direct Chromium PDF: blue frame;
- `video.cloneNode(true)`: `currentTime=0`, unprepared clone;
- PDF containing the clone no longer represented the admitted blue frame.

This is a strong positive/negative control: current video frame is renderer-owned state that Chromium can print directly, but proxy cloning loses it. P1-187 must preserve current frame/poster under explicit pixel/byte/time budgets or truthfully degrade.

## Block 22 — mask/border-image/pseudo are direct-PDF positive controls

A direct Chromium control preserved tested:

- `mask-image` presentation;
- `border-image` gradient;
- visible `::before` generated text/background.

Again, broad loss of these features in the flattened proxy is WebClip representation loss, not evidence that PDF cannot carry the visual result.

## Block 23 — signed/tokenized image/link target is durable inside PDF — P0-066 / P0-071

A direct anchor using a URL containing signed/token query material produced a PDF `/Link` URI carrying the full query/fragment. Current WebClip also wraps otherwise-unlinked images in anchors whose `href` is `image.currentSrc || image.src`.

Therefore an ephemeral/signed image source can become a durable clickable capability in the saved PDF unless the actual output target is sanitized.

No new owner: P0-066 owns durable/display URL confidentiality and P0-071 owns safe URI enforcement on the actual printed representation. Acceptance must cover PDF annotations/image-generated links, not only Journal/OperationLog text.

## Block 24 — advertising candidate discovery is unbounded full-subtree materialization — P1-160

Current `collectAdvertisingCandidates(root, out)` starts with:

`const elements = [root, ...root.querySelectorAll('*')];`

This eagerly materializes the entire subtree for every Include before classifying candidates. On a huge selected subtree this defeats the project's bounded discovery posture.

Classification: refine P1-160 shared visited-node/time-budget acceptance. No new number is justified for a second discovery function with the same root cause.

## External comparison / architecture evidence

External sources were used as hypothesis and design input only; current WebClip source plus local browser probes control P-code classification.

### SingleFile — deferred/virtualized content is explicitly best-effort

SingleFile help documents a `save deferred images` mode as best-effort and not guaranteed on every site. Its optional synthetic `scroll` event can improve some pages but is specifically recommended off because it can cause unexpected scrolling. Its optional zoom-out strategy can help infinite virtual lists but is also recommended off.

Current source:
`https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html`

SingleFile issue #1931 (2026-04-12) reports an Instagram infinite-scroll page where only some currently loaded/painted segments survive despite manual scrolling and deferred/scroll/zoom options. This is directly relevant to the distinction between DOM completeness and logical application content.

`https://github.com/gildas-lormeau/SingleFile/issues/1931`

Architecture consequence: WebClip must not silently dispatch host scroll/business events and call the result faithful. Virtualized materialization belongs to an explicit bounded capture mode/degradation contract under P2-007.

### snapDOM — state that a mature capture engine handles explicitly

snapDOM's current feature documentation explicitly handles full computed styles, pseudo-elements, Shadow DOM, same-origin iframe capture, canvas bitmap, current video frame, current form-control state, scroll position, transforms/shadows, backgrounds/masks/border-image, current image source and an optional live-vs-clone geometry reconciliation pass.

`https://github.com/zumerlab/snapdom/blob/main/FEATURES.md`

Its changelog includes continued fixes around iframe scroll restoration, video frames, content-visibility, background handling, pseudo/iframe isolation and capture-state correctness.

`https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md`

This does not mean WebClip should adopt snapDOM wholesale. It demonstrates that canvas/video/form/shadow/pseudo/layout/base-resource state are normal capture-engine responsibilities and are useful falsification targets for WebClip's format-neutral capture layer.

## Dedup / rejected new-owner decisions

No new P-number is created for:

- page-visible Include/Exclude marker effects -> P0-075;
- host event ordering / pointer-event leakage during picker gesture -> P0-075;
- custom-element activation in proxy -> P0-068/P1-213;
- select/video/shadow/style/pseudo/base-URL loss in flattened proxy -> P1-187;
- mixed selected-order corruption from top-body proxy -> P0-004 user-visible fidelity, P1-187 implementation locus;
- signed image/link capability in PDF -> P0-066/P0-071;
- ad subtree enumeration -> P1-160;
- virtualized/infinite logical content -> P2-007 architecture/mode policy;
- exact selection inside Shadow DOM -> P2-006;
- newly inserted permitted cross-origin frames -> existing cross-origin feature/lifecycle owners; no second topology number here;
- corrected tall-iframe fixture -> rejected hypothesis, retained above as a negative control.

P1-003 remains at its canonical default/historical status in this tranche. Shadow/deferred-resource observations alone did not justify reopening it without a concrete independent violation of its accepted current-resource readiness contract.

## Test / implementation requirements generated by this tranche

### P1-227

Add a deterministic/browser test where selection starts before dynamic same-origin frame insertion/replacement. Prove inner selection works without auto-content/restart and stale child listeners are removed. Add bounded mutation-storm coverage.

### P0-004

Add a mixed top-document + flattened iframe + later top-document selection regression that asserts preserved logical/source order while retaining multi-page anti-clipping behavior.

### P0-075

Add an isolated-world test with earlier page capture listeners and pointer handlers. A selection gesture must not authorize/trigger host actions. Test architecture must not depend on registration ordering.

### P1-187

Add renderer-state matrix for iframe proxy: canvas, paused video frame, current select, Shadow DOM, pseudo-elements, grid/flex visual geometry, opacity/filter/shadows/masks and relative URLs after the style budget. Distinguish hard correctness state from optional expensive visual-fidelity budget.

### P1-160

Add a large Include advertising-suggestion regression proving node/time budget and graceful partial/no-suggestion result rather than full-array materialization.

## Release boundary

This is source/browser/research research evidence only. No runtime fix is claimed. P0/P1 owners remain unresolved until implementation and their required direct verification are complete. No version bump/build/tag/release is implied.