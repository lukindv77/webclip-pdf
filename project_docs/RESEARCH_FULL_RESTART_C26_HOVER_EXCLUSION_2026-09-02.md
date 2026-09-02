# Fresh full-restart C26 research — hover exclusion

Date: 2026-09-02

Status: **accepted fresh L4 physical evidence** for C26. This document is research evidence, not a release declaration. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

## 1. Coordinate and contract boundary

C26 asks whether a saved selected PDF excludes state that exists only because the pointer is hovering, even when that state was active at admission.

The current fidelity contract excludes:

- CSS `:hover` styling;
- hover-only children and generated pseudo-content;
- tooltips, menus, flyouts and overlays whose sole cause is hover;
- hover-opened DOM retained by page JavaScript after ordinary pointer state changes.

The contract separately allows non-hover focus/selection and admitted non-hover dialogs/popovers/top-layer state. Therefore a valid solution cannot indiscriminately discard every transient-looking node or every focused/open control.

Fresh canonical source inspected:

- `main = c5834ba0eb75fbf0ac1c637f42d7da1bff24b429`;
- exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- manifest remains `0.9.8`; `0.9.9` remains WIP and release readiness remains NOT READY.

## 2. Fresh current-source inspection

The accepted harness fails closed unless all of these source bindings hold:

1. the exact `content.js` blob is current;
2. WebClip review uses a fixed full-screen Shadow-DOM backdrop with `pointer-events:auto`;
3. review/save can focus its textarea;
4. WebClip UI is hidden only inside the print render via `beforeprint`;
5. same-origin selected BODY content uses the current flattened-frame proxy helpers;
6. `service-worker.js` selects screen media and calls `Page.printToPDF`;
7. the current `prepareForPrint` body contains no hover, pointer-boundary or provenance receipt.

Relevant current behavior:

- selection mode listens to page/frame `mousemove`, but `state.hoverElement` only drives WebClip's own selection outline;
- finishing selection installs the full-screen review backdrop, changing pointer hit-testing in the page;
- preparation expands/normalizes selected content and can clone an accessible frame BODY into the top document;
- preparation has no record of which nodes were created solely while a page element matched `:hover`;
- once a page-JS hover flyout is ordinary connected DOM, current selection-only preparation treats it like other selected descendants.

This creates two distinct cases that must not be conflated:

1. live renderer hover state (`:hover`, hover rules and pseudo-content), which can clear when hit-testing changes;
2. durable DOM side effects created by hover-time page JavaScript, which do not automatically disappear unless page code removes them.

## 3. Fresh external research

External sources are architecture input only. C26 advancement rests on the exact-source physical evidence in section 4.

### 3.1 `:hover` is pointing-device state, not a DOM provenance marker

Selectors Level 4 defines `:hover` as applying while the user designates an element with a pointing device. It can also propagate through flat-tree ancestors, and the specification explicitly notes that hit-testing details are not themselves fully defined there.

Reference:

- https://www.w3.org/TR/selectors-4/#the-hover-pseudo

Therefore a DOM snapshot does not contain a general attribute that says which arbitrary JS-created descendants owe their existence to a prior hover interval.

### 3.2 Hit-test changes legitimately emit page-observable boundary events

Pointer Events requires boundary events after layout changes that alter the hit-test target even when the physical pointing device is stationary. `pointerenter`/`pointerleave` are observable by page code.

Reference:

- https://www.w3.org/TR/pointerevents/#boundary-events-caused-by-layout-changes

This predicts the current WebClip backdrop behavior: installing a full-screen interactive overlay can clear ordinary CSS hover and fire `pointerleave`. Page JavaScript remains free to remove, preserve or replace its hover-created DOM in response.

### 3.3 Synthetic pointer movement is not a neutral cleanup primitive

The Chrome DevTools Protocol `Input.dispatchMouseEvent` method dispatches a mouse event to the page at specified coordinates. Puppeteer's `Page.hover()` is explicitly implemented by moving the page mouse, and `Mouse.move()` moves that input source.

References:

- https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchMouseEvent
- https://pptr.dev/api/puppeteer.page.hover
- https://pptr.dev/api/puppeteer.mouse.move

Using those operations in a product save path would create page-observable input and could itself execute arbitrary page hover/leave handlers. It can change natural CSS hover but cannot reliably undo DOM already created by page scripts.

### 3.4 Forced pseudo-state is a test capability, not general negative provenance

CDP `CSS.forcePseudoState` makes specified pseudo-classes apply to one identified node when styles are computed. It is useful for controlled testing, but it does not define a page-wide operation that discovers and reverses natural hover or page-JS side effects.

Reference:

- https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-forcePseudoState

The absence of a forced `hover` token is not evidence that an arbitrary connected node was not previously created because of hover.

### 3.5 PDF generation samples browser rendering state

CDP `Page.printToPDF` prints the current page. Puppeteer's PDF documentation likewise distinguishes print media from explicit screen-media emulation; WebClip deliberately uses screen media before `Page.printToPDF`.

References:

- https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF
- https://pptr.dev/api/puppeteer.page.pdf

The direct native control below confirms that current Chrome can physically serialize active hover presentation when it remains active at the render cut.

### 3.6 Comparable archival-source search

Fresh search of current public SingleFile default-branch source at commit `8ce3eb5cabcf79589335ea58d70a20d33562cd97` found UI-specific hover selectors/selection affordances but no `CSS.forcePseudoState`-based page hover normalization. Mouse boundary event names also appear in its generic event-attribute processing list, not as a proven general provenance solution.

Reference:

- https://github.com/gildas-lormeau/SingleFile

This is only comparative architecture input. It neither proves WebClip correctness nor supplies a production repair.

## 4. Fresh exact-source physical evidence

Accepted run:

- workflow run `33618234004`;
- job `100208967903`;
- exact workflow head `be799886020c68e8984958d4843bf0709c56159e`;
- conclusion **SUCCESS**;
- Google Chrome `151.0.7922.173`;
- Playwright `1.55.0`;
- `pypdf 6.0.0` text inspection;
- PyMuPDF `1.26.4` raster/color inspection;
- raw result SHA-256 `a487b7773a8741ae530b45b15acfc92b7d54142cffb6d1db605c0a3b74435f62`.

The workflow was a temporary branch-only environment boundary because no local Chromium/Playwright installation was available. It was removed before PR. The durable harness is `project_tools/research_c26_hover_exclusion.py`.

### 4.1 Native active-hover positive control

The pointer remained over a target with:

- red `#target:hover` background;
- CSS hover-only child token;
- hover-only `::after` token;
- a page-JS node mounted on `pointerenter`;
- an independent non-hover open dialog.

Before print:

- `hover=true`;
- CSS child display `block`;
- event log `['enter']`;
- JS flyout present.

Physical PDF:

- CSS hover token present;
- pseudo hover token present;
- JS hover-mounted token present;
- `21,975` red pixels;
- PDF SHA-256 `1eaab03b562ac002ca027d7fada0adb7ef307ac8027751357120ea91540e87ef`.

This proves current Chrome can print active hover presentation. A passing product contract cannot rely on `Page.printToPDF` to discard hover automatically.

### 4.2 Current WebClip overlay — CSS clears, sticky JS survives

The test loaded the exact current guard prefix and `content.js`, selected the containing scope, genuinely marked the Exclude, then hovered the target. The real WebClip `finish` command installed the current full-screen review backdrop.

Transition:

- before overlay: `hover=true`, CSS child visible, event log `['enter']`, JS flyout present;
- after overlay: `hover=false`, CSS child hidden, event log `['enter','leave']`, JS flyout still present;
- after real preparation: same non-hover state, sticky JS still connected.

Physical selected PDF:

- CSS hover token absent;
- pseudo hover token absent;
- red pixels `0`;
- JS hover-mounted token **present**;
- non-hover dialog present;
- legitimate pre-existing token present;
- Exclude absent;
- outside shell absent;
- PDF SHA-256 `a940bf1bd2d1cabfdc59c504c4f6f29535b93552b5d1925686b61e6d72258ea9`.

This is the primary C26 finding. Current WebClip happens to clear ordinary CSS/pseudo hover through its overlay, but it has no admitted-representation provenance to reject durable hover-only page DOM.

### 4.3 `beforeprint` non-rehover control

The harness registered observations both before and after WebClip's own `beforeprint` listener. In the sticky-JS case both stages recorded:

- `hover=false`;
- CSS child hidden;
- event log `['enter','leave']`;
- sticky JS present.

The printed sticky node is therefore not explained by a brief natural re-hover when WebClip hides its own host for the print render. It is ordinary connected DOM left by the page.

### 4.4 Page-owned cleanup control

The same fixture removed its flyout on `pointerleave`.

After the WebClip backdrop:

- `hover=false`;
- event log `['enter','leave']`;
- JS flyout absent.

The physical PDF kept the legitimate pre-existing content and non-hover dialog while omitting CSS/pseudo hover, the JS flyout, Exclude and outside shell. PDF SHA-256: `c98d0a7c8c8a6f25fed41bf8f3a0e61c203a678c98e3eed33069e3335db1a12f`.

This isolates the defect from ordinary boundary-event behavior: WebClip succeeds only when the page itself happens to clean up its hover DOM.

### 4.5 Same-origin selected BODY / flattened-proxy parity

The child BODY was selected in a same-origin iframe. Hovering the child target mounted the sticky JS node; the WebClip backdrop then cleared child CSS/pseudo hover and fired child `pointerleave`.

Current preparation:

- hid the original frame;
- created the current flattened-frame proxy;
- proxy target did not match `:hover`;
- proxy text still contained `C26_JS_HOVER_MOUNTED`;
- genuinely marked Exclude was removed.

Physical PDF:

- CSS/pseudo hover absent;
- sticky JS present;
- non-hover dialog and legitimate content present;
- Exclude absent;
- top-document outside shell absent;
- PDF SHA-256 `cb121c1e3207e3460aae4f14914d8ecf9e147896770ecc31062c444784f03b88`.

This proves frame parity for the same root. The flattened proxy accurately clones the connected sticky DOM; it cannot infer why that node exists. This does not create a new P1-187 owner.

### 4.6 Test-only provenance causal control

A private MutationObserver was enabled before hover. It marked nodes added while the target actually matched `:hover`. This instrumentation is intentionally unavailable to the page contract and is not proposed as a complete algorithm.

After normal WebClip preparation, the control removed exactly one marked final-representation node.

Physical PDF then:

- omitted CSS/pseudo hover;
- omitted the sticky JS hover node;
- preserved legitimate pre-existing content;
- preserved the independent non-hover dialog;
- omitted Exclude and outside shell;
- PDF SHA-256 `6ad19773ab37f3162317f3cef27364da0da81cf9f7740281089caabf6611c2bd`.

This is a causal demonstration that provenance at the admission/static-representation boundary can remove the failing token without broad transient-state destruction. It is not proof that every real page mutation can be classified safely after the fact.

## 5. Duplicate / root-cause reconciliation

### P0-075 — primary owner

WebClip's page-hosted review UI changes page hit-testing and emits page-observable boundary events. The host page remains an untrusted control plane, and no isolated inert representation is cut before this interaction. **P0-075 ACTIVE** already owns that architecture boundary.

### P0-070 — exact admission-to-render generation

The saved artifact must remain bound to the exact admitted presentation. Current preparation has no hover provenance, no explicit normalization receipt and no truthful degraded/unknown result when sticky hover DOM cannot be distinguished. **P0-070 ACTIVE** owns that generation boundary.

### P0-004 — physical selected-copy consequence

The selected PDF physically contains content the contract says to exclude. **P0-004 ACTIVE** owns the resulting selection-bounded fidelity failure.

### No P1-231 and no Registry change

Historical duplicate analysis had already reserved against allocating a standalone hover owner if current WebClip clears ordinary CSS/pseudo hover and the remaining sticky-JS failure maps to the existing representation/generation/fidelity roots. Fresh evidence confirms exactly that shape.

Therefore:

- do not allocate `P1-231`;
- do not change Registry wording/status;
- do not reopen P0-067;
- do not claim P1-187 as the independent root merely because a frame clone preserves the same connected DOM;
- do not make an L5 claim: no real unpacked-extension / permission / ordinary browsing-context acceptance run was performed.

## 6. Architecture implications

### 6.1 Admit before WebClip UI changes page pointer state

The durable direction is:

`selected presentation -> extension-owned inert admission receipt -> WebClip review/save UI -> renderer`

not:

`selection -> page-hosted WebClip overlay changes pointer state -> later serialize whatever DOM remains`.

### 6.2 Do not use synthetic mouse movement as normalization

Moving the pointer is page-observable and can execute arbitrary page code. It can exchange one hover state for another and cannot reverse persistent DOM side effects. It is acceptable in a bounded test harness, not as a trusted archival cleanup contract.

### 6.3 Provenance must be captured, not guessed from final DOM

After `pointerleave`, a sticky flyout is structurally ordinary DOM. Text, class names, geometry or ARIA roles cannot reliably prove that it is hover-only. A production design needs either:

- a static admitted representation cut before WebClip changes page hit-testing;
- bounded causal mutation/state accounting across the relevant top document and admitted same-origin frame agents; or
- a conservative degraded/unknown outcome where disentanglement cannot be proven.

### 6.4 Preserve independent non-hover state

The causal and page-cleaned controls preserve the non-hover dialog and legitimate pre-existing content. Any repair must keep C25/C27 boundaries explicit and must not broadly remove all focused, open, recently-created or transient-looking content.

## 7. Verdict and next checkpoint

Fresh C26 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/PAGE-CLEANED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004)`**

Proven current failure:

- current WebClip overlay clears natural CSS/pseudo hover but a page-JS hover-only node deliberately retained after `pointerleave` remains ordinary selected DOM and reaches both top-document and same-origin flattened physical PDFs.

Proven controls:

- native Chrome can print active CSS/pseudo/JS hover state;
- current overlay produces the expected pointer boundary transition;
- page-owned cleanup removes the failing token;
- `beforeprint` host hiding does not re-hover the target;
- frame flattening repeats the same root;
- test-only provenance cleanup removes exactly the hover-created node while preserving legitimate non-hover content and selection boundaries.

Durable integration:

- update the C26 restart matrix to the classification above;
- retain this detailed report, the compact evidence receipt and bounded harness;
- leave runtime, `RESEARCH_REGISTRY.md`, manifest/version and release readiness unchanged;
- keep the temporary physical workflow out of the final PR.

After C26 integration the next sequential coordinate is **C27 — Focus / selection / interaction-induced page state**.
