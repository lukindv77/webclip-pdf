# Audit delta — frozen print content generation — 2026-08-28

Source-of-truth `main` immediately before this write: `bc2756e5cca6ef1c4572e671538b6ddd71e52b02`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof strengthens **P0-075** (host-page/content-script DOM trust boundary) and **P0-004** (selected PDF correctness). It composes with **P0-071** (print-time URI TOCTOU), **P0-067/P0-068** (host/flattened representation side effects) and cross-origin **P1-199/P1-200/P1-203**.

The existing hostile-marker audit already proves that page-visible Include/Exclude attributes cannot be print authority. This pass adds a broader invariant: **even perfect marker fencing is insufficient while Chromium ultimately prints the original mutable page-owned selected subtree.**

## Fresh source proof

### 1. Save authorization snapshots metadata, not page contents

`downloadPdf()` and the Yandex save path first construct `meta` using `buildSaveMeta()`. The metadata includes a serialized selection snapshot made from WebClip's isolated-world Maps.

The content script then sets `state.phase = 'printing'` and calls `await prepareForPrint(meta)` before asking the worker to generate the PDF.

The selected nodes themselves are still ordinary live page DOM nodes. No immutable printable subtree/content generation is captured at this user-authorizing transition.

### 2. Preparation deliberately contains asynchronous windows

`prepareForPrint(meta)` performs multiple async operations before the worker reaches Chromium PDF capture. Current source includes:

- remote frame synchronization;
- selected-resource prefetch with a bounded deadline;
- cross-origin remote-frame `prepare-print` calls;
- frame/layout preparation and print-style installation.

For cross-origin frames, `frame-agent.js::preparePrint()` explicitly sets `state.phase='printing'`, then awaits `prefetchSelected()` before installing its print stylesheet.

These waits are necessary/valuable for print quality and bounded resource behavior, but they create a deterministic interval between user authorization and actual render.

### 3. Element identity does not freeze element contents

WebClip's authoritative `state.includes` / `state.excludes` Maps hold Element references. A hostile page cannot directly insert a new isolated-world reference into those Maps, which is a useful defense.

However the same Element object can be changed by the page after the user saw/confirmed it:

- replace text descendants;
- add/remove child nodes;
- change `href/src/srcset/style` and CSS classes;
- replace an image or link target;
- move the selected node within another ancestor/layout context;
- alter page stylesheet rules affecting the selected subtree.

The Element reference remains the same Map member. A selection-generation check that proves only `Element A` is therefore not proof that the bytes/visual/link content printed for A are the content that existed when the user authorized saving.

### 4. Current print path renders live DOM at the end

After `prepareForPrint(meta)` returns, content sends `WEBCLIP_GENERATE_PDF` to the service worker. Chromium `Page.printToPDF` then renders the page using the live print representation.

`beforeprint` handling itself performs fresh selected-frame measurements and diagnostics immediately around print rendering. This confirms that layout/content are intentionally observed from the current live document at render time rather than an earlier immutable snapshot.

Consequently a page mutation that occurs after the user's Proceed but before/during print can become part of the produced PDF even though the serialized selection snapshot still describes the earlier selection generation.

### 5. Marker hardening alone cannot close this TOCTOU

Suppose a future patch makes Include/Exclude markers display-only and re-derives allowed node identities solely from isolated-world Maps. A hostile page can still mutate **inside** an allowed selected element.

Example:

1. user selects article element A whose text is benign version V1;
2. user explicitly clicks Download/Yandex Proceed;
3. metadata snapshots selection identity A;
4. `prepareForPrint()` waits on resources/remote frames;
5. page script replaces A's descendants with sensitive/misleading V2 while A itself remains the same Element;
6. print CSS still correctly admits only A;
7. Chromium prints V2;
8. Journal selection metadata/replay semantics represent the user's earlier selection, but the physical PDF contains content changed after authorization.

No forged marker is required.

### 6. Cross-origin selected frames have the same source-content mutability

`frame-agent.js` similarly stores selected child Elements in isolated-world Maps, but `preparePrint()` ultimately applies print CSS to that hostile child document. The child page owns the descendants and styles inside the selected Element throughout the prefetch/render interval.

Therefore exact frame-agent command generation (P1-199/P1-200/P1-203) is necessary but not enough to freeze what the user approved.

## Required acceptance

### One admitted printable-content generation

At user authorization, or at a clearly defined subsequent confirmation boundary before irreversible save begins, WebClip needs an immutable/frozen printable representation generation that binds:

- exact selected/excluded structure;
- actual printable text/content descendants;
- safe link/image/resource representation required by P0-071;
- exact remote-frame representation/generation;
- metadata/selection snapshot stored in Journal;
- resulting PDF bytes/content receipt.

The Journal snapshot and physical PDF must derive from the same accepted generation.

### Source page becomes input, not authority

After frozen representation admission:

- page mutations can affect the live site but not the print tree being rendered;
- no live page marker, href/src, subtree child, stylesheet mutation or beforeprint handler can expand/change privileged output;
- any representation that requires late materialization must prove it still belongs to the same source/document/selection generation or fail closed/restart confirmation.

### Frozen does not mean active clone

The representation must also satisfy existing P0-067/P0-068 requirements. A naive live DOM clone connected to the page is not acceptable if it can execute custom elements, create nested browsing/plugin contexts, duplicate network requests, or inherit hostile host behavior.

Use an inert/bounded representation or an equivalent isolation mechanism.

### Bounded resource handling remains

Resource prefetch/decode deadlines remain useful. If a resource is unavailable by the frozen-generation deadline, record a bounded failure/placeholder policy rather than falling back to whatever later live page mutation happens to provide.

## Deterministic regressions

1. User confirms selected A/V1; page replaces A text descendants with V2 during prefetch -> PDF contains admitted V1 (or operation explicitly re-confirms/fails), never silently V2.
2. Page changes selected link `href` after confirmation/beforeprint -> printed clickable URI remains the admitted safe value required by P0-071.
3. Page changes selected image `src/srcset` during preparation -> PDF representation does not switch to an unadmitted resource.
4. Page inserts sensitive child S inside an otherwise legitimately selected A after confirmation -> S is absent from frozen output.
5. Page removes a user-excluded child after confirmation and inserts a replacement at the same position -> exclusion/output semantics remain generation-defined, not DOM-position guessed.
6. Page moves selected Element A under a different hostile layout/ancestor after confirmation -> frozen print structure is unchanged.
7. Host stylesheet mutation after confirmation cannot reveal extra content or materially rewrite frozen representation.
8. Cross-origin child mutates selected subtree while `prefetchSelected()` is awaiting decode -> top PDF uses one admitted remote-frame print generation.
9. Remote frame reload/replacement after confirmation -> old generation cannot silently print the new document.
10. Journal `selectionSnapshot`/metadata and resulting PDF content receipt identify the same generation.
11. Frozen representation remains inert: no custom-element callback, iframe/plugin activation or uncontrolled duplicate network request introduced by the fix.
12. Resource deadline/failure remains bounded and does not reopen the live-page authority window.

## Numbering result

No new item is created. Primary ownership remains **P0-075 + P0-004**, with P0-071/P0-067/P0-068 and P1-199/P1-200/P1-203 as required composition layers.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.
