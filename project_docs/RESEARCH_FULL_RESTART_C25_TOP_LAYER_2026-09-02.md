# WebClip — fresh full-project research restart — C25 dialog / popover / top layer — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = 6e61f8db7b77737c34a8290cea11bc8b8aff51e6`

Fresh product-source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `RESEARCH_REGISTRY.md` remains the only current P-owner/status authority.

Fresh restart coordinate:

**C25 — Dialog / popover / top layer**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/AUTO-LIGHT-DISMISS/MANUAL/MODAL/CLOSED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P1-187; P0-004 supporting)`**

No new P-code is allocated. Runtime, manifest/version, build/tag/Release and release readiness are unchanged.

## 1. Current contract and bounded question

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` requires non-hover top-layer state to follow admission:

- an open dialog/popover/top-layer element should remain represented open once in the static PDF;
- a closed one must not be opened merely for completeness;
- hover-only top-layer state is excluded separately under C26;
- backdrop, geometry and overlap matter when they materially affect the selected presentation.

C25 therefore asks whether WebClip preserves browser-owned top-layer membership and the user's admitted open/closed state from selection through its own review/save UI and physical PDF cut.

This tranche intentionally separates ordinary short top-layer state from the previously researched long scroll/pagination problem. Long top-layer viewport clipping remains P0-004/C20/Pagination-family territory and is not duplicated here.

## 2. Fresh current-source inspection

Fresh `content.js` inspection finds no explicit `showPopover()`, `hidePopover()`, `:popover-open`, `showModal()`, `:modal` or `::backdrop` capture/materialization path.

The save path continues to use the live page plus WebClip's page-hosted Shadow-DOM UI. This matters because browser top-layer interaction has semantics outside ordinary DOM attributes:

- an open `popover=auto` can be light-dismissed by a trusted outside pointer gesture;
- `popover=manual` does not light-dismiss;
- a `dialog.showModal()` element makes other content in the same document inert;
- same-origin BODY flattening clones DOM into a secondary representation, but browser top-layer membership itself is not a DOM attribute.

The selected-only print stylesheet still contains explicit Exclude hiding. A focused fresh control below proves this works even when the selected scope is an open top-layer element; an earlier apparent top-layer Exclude leak was a harness selection failure and is explicitly retracted.

## 3. External standards / platform research

External sources constrain the browser semantics but do not determine the WebClip classification.

### 3.1 Popover state is browser top-layer state

Current WHATWG HTML defines `showPopover()` as adding the element to the top layer. For `auto` and `hint` popovers, light dismiss is driven by trusted pointer interaction outside the applicable popover stack; `manual` popovers do not light-dismiss.

References:

- https://html.spec.whatwg.org/multipage/popover.html
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover
- https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using

This makes the WebClip UI interaction itself a material variable: a trusted click outside an admitted `auto` popover is allowed by the browser to close it before the PDF render cut.

### 3.2 Modal dialog state makes the surrounding document inert

Current `HTMLDialogElement.showModal()` semantics place the dialog in the top layer with `::backdrop` and make other nodes in the containing document inert.

Reference:

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal

WebClip currently hosts its trusted-looking controls in the same page document. Therefore an admitted page modal can legitimately make the WebClip UI itself non-interactive; this is a control-plane architecture issue, not a Chromium print inability.

### 3.3 Top layer is not directly cloneable DOM state

MDN's current Top Layer reference describes top-layer membership as browser-managed internal state. Popovers and modal dialogs enter that layer through their respective APIs and obtain independent stacking/backdrop semantics.

Reference:

- https://developer.mozilla.org/en-US/docs/Glossary/Top_layer

This matches earlier WebClip historical evidence: raw cloning does not preserve `:popover-open` or `:modal` state. That historical material is used only for duplicate/root-cause lookup; C25 advancement rests on the fresh exact-source physical runs below.

### 3.4 Comparable archival implementation boundary

Fresh search of the current SingleFile source did not identify an explicit `showPopover()` / `:popover-open` top-layer reconstruction mechanism. SingleFile documentation separately warns that application interaction can become unavailable once page scripts are removed. This is architecture input only: a saved representation must explicitly own the visible state rather than assume application interaction survives serialization.

Reference:

- https://github.com/gildas-lormeau/SingleFile

## 4. Fresh exact-source Chrome physical evidence

Primary environment across accepted C25 runs:

- Google Chrome `151.0.7922.173`;
- GitHub-hosted `ubuntu-24.04` runner;
- actual repository guard prefix plus exact current `content.js` loaded from checkout;
- Playwright `1.55.0`;
- `pypdf 6.0.0` text inspection;
- PyMuPDF `1.26.4` physical raster/backdrop classification;
- synthetic local fixtures only.

### 4.1 Case-level admission/top-layer run

Accepted case-level run:

- workflow run `33610993477`;
- job `100185833170`;
- exact workflow head `040bee0dc466e9dec376405de6e0b48c9f7feb50`;
- conclusion **SUCCESS**;
- persisted raw capture commit `b3bc977eff1bcd993b5d4e78200b55db89bd6b76`;
- raw result SHA-256 `940b81c1b1ae52c0e7e1808e84daaa10e27605a36d4510989f758192d1fc732f`.

The case-level wrapper deliberately records each case independently so one browser interaction problem cannot hide already-completed observations.

### 4.2 Open `auto` popover — direct render control

With no trusted WebClip review click between selection and preparation:

- popover open before preparation: `true`;
- popover open after preparation: `true`;
- selected token physically present: `true`;
- blue `::backdrop` signal: `369139` pixels;
- PDF SHA-256: `1fb1a61d12908188485b9e7ce0d17065596dbbea2a8d98ed3b0f07bfa4927b6a`.

This is the native positive control: current Chromium can physically serialize the open popover and its backdrop in the WebClip-shaped live path when no intervening trusted outside gesture dismisses it.

The original case did not successfully register its intended Exclude; that specific field is not used as evidence. Focused corrected Exclude controls are in section 4.7.

### 4.3 Open `auto` popover — WebClip Finish light-dismiss finding

The same admitted selected `auto` popover began open. A trusted pointer click on the real WebClip Shadow-DOM `Готово` control then succeeded and opened the WebClip review modal.

Immediately after that trusted WebClip UI click:

- popover open state changed `true -> false`;
- it remained closed through preparation;
- the physical PDF did **not** contain the selected popover token;
- blue backdrop pixels: `0`;
- PDF still completed and the mocked save request was reached;
- PDF SHA-256: `7eb5240dd5863f67fb09e30c726998c2305b59a8e89fc3b40e879f68b58c6379`.

The direct case above proves the same open popover is printable. The discriminator is WebClip's own trusted outside pointer interaction before the render cut.

This is an admission-to-render state drift under **P0-075 / P0-070**, with **P0-004** owning the physical selected-copy consequence. It is not a generic Popover API or PDF limitation.

## 4.4 `manual` popover — same UI gesture positive control

With `popover=manual`:

- popover began open;
- the same trusted WebClip `Готово` click succeeded;
- popover remained open after that click;
- selected token remained in the PDF;
- blue backdrop signal remained `369139` pixels;
- PDF SHA-256: `6a1a9efd696b8c7f50eb3a0f6071a69445ca17f660fd56e09051213c1d3cc148`.

This is a strong causal/browser-semantic control: WebClip's review click does not generically erase top-layer content. The failure specifically follows `auto` light-dismiss semantics.

## 4.5 Modal dialog — WebClip page-host UI becomes inert

The test opens a real `<dialog>` using `showModal()` before selection.

Fresh observation:

- source dialog `open=true`, `:modal=true`;
- WebClip Finish button exists and is visually positioned;
- trusted pointer attempt on that WebClip button does **not** activate it (`clicked=false`);
- the WebClip review modal remains closed;
- page modal remains `open=true` and `:modal=true`.

A test-only forced WebClip prepare command then reaches the print path. The physical PDF contains the selected dialog token and about `363426` blue backdrop pixels, SHA-256 `f59493ae1972a22c498efa557e9351905fe97f5376d00fdcc7d7e98e3685de63`.

Therefore Chromium can print the admitted modal state. The normal WebClip UI cannot advance because it is hosted in the same document that the page modal makes inert. This is direct **P0-075** control-plane/isolation evidence, with **P0-070** supporting the requirement to keep the user operation bound to admitted state.

## 4.6 Closed top-layer negative control

A corrected physical negative control selected ordinary visible content that contained a closed popover and a closed dialog.

Accepted final-control run proves:

- closed popover remained `:popover-open=false`;
- closed dialog remained `open=false`;
- visible selected token reached the PDF;
- closed popover token absent;
- closed dialog token absent;
- Exclude absent;
- outside shell absent;
- PDF SHA-256 `3174c1f41ba1cfa90d9d714cabb7c046c379218552fd02f906a1ac1f1ea7c243`.

This confirms WebClip is not indiscriminately opening closed top-layer controls during the tested C25 path.

## 4.7 Corrected top-layer Exclude control — prior apparent leak retracted

An earlier exploratory C25 result showed `C25_EXCLUDE_TOKEN` in open popover PDFs. Focused inspection proved the test had never actually registered the Exclude: `excludeCount=0`.

The corrected final control dispatches the selection event after switching WebClip to Exclude mode and verifies `excludeCount=1` / marker present before preparation.

Result:

- marked Exclude before preparation: true;
- after WebClip preparation computed display: `none`;
- open manual popover remains open;
- physical selected token present;
- Exclude token absent;
- outside shell absent;
- blue backdrop signal `379051` pixels;
- PDF SHA-256 `e03fba84281477c73d3c9ab07d103fc72ff8620bc12ea3fa96682890e2d9b297`.

Therefore there is **no fresh C25 Exclude failure** from this tranche. The earlier apparent leak is a harness artifact and must not be promoted to P0-004.

A separate focused run `33611514811` / job `100187518738` reached the same correction path and is retained only as debugging provenance; the final-control run below is the preferred durable authority.

## 4.8 Same-origin BODY flattening loses top-layer/backdrop state — P1-187

Accepted final-control run:

- workflow run `33611864788`;
- job `100188651541`;
- exact workflow head `c2bea7a0bf0d0454d55cb23ca570e0134cff44ad`;
- conclusion **SUCCESS**;
- persisted raw-result commit `0b48519b70c10521667f14117eb673f7a657b5df`;
- raw result SHA-256 `1af09abbf1b44d257dc420d55a84791874c341506d81e644541a02fa4de8cc48`.

Native direct child-document control:

- source popover shown;
- selected popover text physically present;
- blue backdrop signal `472830` pixels;
- PDF SHA-256 `8b9089d6c8c7fc67c397db632b5711f28e2a635b57004893188e8a9246b622da`.

Production-shaped same-origin selected BODY preparation:

- source popover `:popover-open=true` before preparation;
- child BODY selected; intended Exclude is genuinely marked;
- WebClip hides original iframe and creates a flattened top-document proxy;
- proxy contains the cloned `[popover]` element;
- cloned popover `:popover-open=false`;
- copied used `display:block` keeps its ordinary text visible;
- physical PDF still contains popover text and ordinary child text;
- Exclude is absent;
- **blue backdrop signal becomes `0`**;
- PDF SHA-256 `dd426486395689316cd04e15ae4b0d7ad44c37bfb603e0c1e5a0d2a28d8f1c0b`.

The final representation therefore preserves some flattened appearance but has lost actual browser-owned top-layer membership and backdrop semantics.

### Causal top-layer re-entry

After the same normal WebClip preparation, the test calls `showPopover()` only on the connected final proxy popover:

- proxy changes to `:popover-open=true`;
- physical token remains present;
- Exclude remains absent;
- blue backdrop signal returns to `388963` pixels;
- PDF SHA-256 `99af8ba657705e13148bc2e58a4c40632fc3719f4af725b9a2a16c624a7cdbc2`.

This is fresh current-source physical revalidation of **P1-187 ACTIVE**. Historical clone-state evidence had already identified top-layer state as browser-owned, so no new owner is allocated.

The architectural target is not to make the archival copy live/interactive. It is to materialize the admitted visible result inertly, including relevant backdrop/geometry, under explicit budget.

## 5. Duplicate / root-cause reconciliation

### P0-075 / P0-070 / P0-004

The top-document `auto` popover failure is not a new popover subsystem owner. The root is that WebClip's own trusted page-hosted control interaction changes page-owned browser state after admission and before the artifact cut:

- **P0-075 ACTIVE** owns the untrusted host-page/control-plane isolation boundary;
- **P0-070 ACTIVE** owns exact user-save generation from admission through print;
- **P0-004 ACTIVE** owns the physically wrong/missing selected result.

The modal case independently reinforces P0-075: a page-owned modal legitimately makes WebClip's in-document UI inert.

### P1-187

The same-origin flattened BODY case is directly within **P1-187 ACTIVE**: the secondary representation does not preserve required renderer/browser-owned state. Top-layer membership/backdrop is another physical manifestation of that already-owned representation root.

### Owners not reopened or duplicated

- **P0-067 DONE** is not implicated; no synthetic page-control activation is required for the C25 findings.
- **P1-003 ACTIVE** resource readiness is adjacent but no C25 resource-readiness defect is proven here.
- **P1-167 ACTIVE** remains general preparation boundedness but is not the direct top-layer root.
- **P1-004 ACTIVE** remains the cross-origin frame umbrella; no fresh C25 cross-origin top-layer L4 claim is made.
- C20/P0-004 already owns long nested/top-layer scroll completeness; C25 does not create a duplicate long-scroll owner.

No new P-code and no Registry status/writing change is warranted.

## 6. Architecture implications

### 6.1 Admission must precede and survive WebClip UI interaction

A top-layer state that is part of the accepted PDF contract cannot be sampled only after WebClip has injected or interacted with its own page-hosted controls. `auto` popover light dismiss demonstrates a legal browser transition caused by WebClip itself.

The durable architecture direction already implied by P0-075/P0-070 is:

`user-selected/admitted browser presentation -> immutable/inert representation receipt -> WebClip review/save UI -> renderer`

rather than:

`user selection -> WebClip UI changes live browser state -> later sample whatever remains`.

### 6.2 Trusted UI should not depend on page modality

A page `showModal()` dialog makes ordinary sibling DOM inert by design. A trusted operation UI hosted in that same page document cannot be assumed interactive.

The fix direction should isolate operation controls in extension-owned browser UI/page space or otherwise provide a control plane that page top-layer modality cannot disable, while still excluding WebClip UI from the saved artifact.

### 6.3 Flattened representations need static top-layer materialization, not replay of modality

P1-187 repair should not blindly call live `showPopover()` / `showModal()` in production archival DOM. The causal `showPopover()` call is only proof that the missing backdrop is browser-state-dependent.

The archive representation should instead encode the admitted one-time visual result inertly: relevant backdrop, geometry, stacking/overlap and visible content without active page interaction/modality.

### 6.4 Preserve closed-state negative semantics

The corrected closed-state control passes and should remain an explicit regression invariant. A generalized top-layer materializer must not turn every closed dialog/popover into visible content.

## 7. Verdict and next checkpoint

Fresh C25 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/AUTO-LIGHT-DISMISS/MANUAL/MODAL/CLOSED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P1-187; P0-004 supporting)`**

Proven current failures:

1. selected open `auto` popover is light-dismissed by WebClip's own trusted Finish interaction before render, and ordinary save proceeds without the admitted selected token;
2. a page modal makes WebClip's in-document trusted-looking Finish UI inert, while a forced renderer control proves Chromium can print that admitted modal/backdrop state;
3. same-origin BODY flattening loses browser-owned popover top-layer membership/backdrop even though copied used display can leave the cloned text visible; causal re-entry restores the backdrop.

Proven positive/negative controls:

- direct open auto popover prints with backdrop if WebClip does not light-dismiss it first;
- manual popover survives the same trusted WebClip Finish click and prints with backdrop;
- closed popover/dialog remain closed and absent;
- genuinely marked Exclude remains excluded inside open top-layer content;
- direct child top-layer rendering can preserve backdrop;
- causal final-proxy top-layer re-entry restores the lost backdrop.

Required durable integration:

- update C25 restart matrix to the classification above;
- retain detailed and compact evidence plus bounded reproduction harnesses;
- leave `RESEARCH_REGISTRY.md`, runtime source, manifest/version and release readiness unchanged;
- remove all temporary workflow/raw-result debugging files before PR.

After C25 integration the next sequential coordinate is **C26 — Hover exclusion**.
