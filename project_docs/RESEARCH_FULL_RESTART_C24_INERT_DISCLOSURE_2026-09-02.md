# WebClip — fresh full-project research restart — C24 inert disclosure — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = c2f4648cf073070f74c188e7ff9f50d3e30ed05b`

Fresh product-source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `host-control-activation-guard.js` Git blob: `5b98e046a69f5389271f626536b02e6f073ca7fb`;
- `content-injection-guard.js` Git blob: `fd6e1a0b7be0a82c5f0ea4455aa288a7eef35b4e`;
- `frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`;
- `RESEARCH_REGISTRY.md` remains the only current P-owner/status authority.

Fresh restart coordinate:

**C24 — Spoilers/disclosures / inert expansion**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/GUARDED-ACTIVATION/INERT-STATIC/NAMED-DETAILS/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-167 supporting)`**

No new P-code is allocated and no Registry status/wording change is required. Fresh evidence materially corrects the older 2026-08-30 C24 narrative: current P0-067 guard now successfully blocks page-owned programmatic `.click()` activation in the production injection path, so the old synthetic-click/submit reproduction is **not** current behavior. C24 nevertheless remains a finding because disclosure materialization is still performed on the live hostile document, native `<details>.open` remains page-observable, direct fallback mutations persist after print, named-details group semantics can prevent complete static expansion, and no source-state/static-representation provenance is emitted.

Runtime, manifest/version, build, tag, Release and release readiness are unchanged by this research tranche.

## 1. Bounded question

C24 asks whether current faithful-static-PDF preparation can make safe existing disclosure content readable without turning page-owned interaction or live widget semantics into archive authority.

The current PDF contract requires:

1. already-existing safe closed disclosure content inside selected scope may be statically expanded for later reading;
2. expansion must be inert/static and must not execute page-owned submit/navigation/application side effects;
3. explicit Exclude remains absolute;
4. source state and static representation should remain distinguishable where materially relevant;
5. unsupported or unsafe expansion must be truthful rather than silently claimed complete.

This tranche separates four mechanisms that older evidence mixed together:

- guarded page-owned `.click()` attempts;
- native `<details>.open = true` mutation on the live page;
- direct fallback mutation of hidden/ARIA panels on the live page;
- WebClip-owned disconnected static materialization as a causal control.

It also adds a standards-driven `<details name>` mutual-exclusion case.

## 2. Fresh current-source inspection

### 2.1 Production injection now includes the P0-067 activation guard

Current `content-injection-guard.js` requires this exact prefix whenever `content.js` is injected:

`frame-proxy-budget-guard.js -> frame-proxy-inert-guard.js -> host-control-activation-guard.js -> content.js`.

Current `host-control-activation-guard.js` replaces isolated-world `HTMLElement.prototype.click()` so that:

- WebClip-owned Shadow DOM controls may still invoke native click;
- page-owned elements return without native activation and increment `blockedPageClicks`;
- the main page world itself is not patched;
- accessible same-origin frame realms are patched as well.

Therefore an old C24 harness that models `control.click()` without the production prefix is stale for current behavior.

### 2.2 Current disclosure helper still attempts `.click()` before fallback

`expandSpoilersInIncludedContent()` still finds page-owned ARIA/accordion-like controls and calls `triggerInternalClick(control)`, whose implementation calls `control.click()` and returns `true` when no exception is thrown.

Under the current P0-067 guard this call is blocked before page activation, but the helper still treats it as a successful click attempt and incurs the serial `await delay(40)` before checking visibility and applying fallback mutation. This is supporting evidence for existing **P1-167 ACTIVE** bounded-preparation ownership, not a current synthetic-activation failure.

### 2.3 Native `<details>` is still opened on the live source document

For each selected closed native details element current source executes:

`details.open = true`.

This is not programmatic `.click()` and therefore is not stopped by P0-067. It changes the live page's widget state and is observable to page code through platform state/events.

The local `snapshotted` Set created by the helper is not later consumed as an ownership/provenance/rollback receipt.

### 2.4 Fallback panels are made visible by direct live DOM/style/ARIA mutation

If the blocked/ineffective page-control attempt does not make the existing panel visible, current fallback mutates the live panel/control state: `hidden`, `aria-hidden`, display/visibility/opacity, max-height/height/overflow and `aria-expanded`.

These mutations are part of the source page itself, not a disconnected WebClip representation.

### 2.5 Disclosure state remains intentionally outside ordinary rollback

The print lifecycle restores resource attributes, temporary wrappers/links/styles/frame state, but disclosure expansion is intentionally retained after PDF. Thus a successful save can leave native details and fallback panels in a WebClip-created state.

### 2.6 Current save metadata has no disclosure provenance receipt

Fresh physical harness inspection of the actual `WEBCLIP_GENERATE_PDF` request finds no disclosure/spoiler/sourceState/staticRepresentation metadata path. The operation does not record a durable distinction such as:

`sourceState=closed -> staticRepresentation=expanded`.

### 2.7 Cross-origin frame-agent still has no disclosure-expansion phase

Current `frame-agent.js::preparePrint()` prefetches selected images, measures current document height and installs selected-only print CSS. It has no native-details or ARIA-disclosure materialization step.

This remains a source-level parity limitation under the existing **P1-004 ACTIVE** umbrella. This C24 tranche does not claim fresh L4 cross-origin disclosure evidence and therefore does not advance or redefine that owner.

## 3. External standards / comparable implementation / user-experience research

External material is architecture and failure-mode input only. The C24 verdict rests on current WebClip source plus the exact physical evidence in section 4.

### 3.1 HTML `<details>` state changes are observable, and named groups are mutually exclusive

The current HTML Living Standard defines `open` as the visibility state of `<details>` and `name` as a group of mutually-exclusive details elements. At most one member of a common named group can be open at once; user-agent enforcement changes `open` state on the other members.

Reference:

- https://html.spec.whatwg.org/dev/interactive-elements.html#the-details-element

MDN likewise documents that changing details state dispatches `toggle`, and that opening one member of a named group closes the other open member.

References:

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement/name

Architecture implication: setting `details.open = true` on a live page is neither inert nor a general “open all safe content” primitive. Page logic can observe the state transition, and named-group widget semantics can actively prevent simultaneous expansion.

### 3.2 SingleFile exposes the same product tension but chooses a different artifact contract

SingleFile's current FAQ explains that folding titles and other interactive elements may not work because scripts are normally removed; retaining scripts/raw-page behavior is possible only as an unreliable trade-off.

References:

- https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md
- https://github.com/gildas-lormeau/SingleFile/discussions/916

A 2025 feature request asks for expand/collapse support in saved pages, and a 2026 discussion still reports saved “Click to Show/Hide” controls that no longer work.

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1766
- https://github.com/gildas-lormeau/SingleFile/discussions/1903

The WebClip conclusion is not to preserve arbitrary application JavaScript. Its current PDF contract is explicitly static: preserve the useful disclosure content as an inert representation while avoiding page-owned activation and source mutation.

## 4. Fresh exact-source Chrome physical evidence

Accepted combined environment:

- GitHub-hosted `ubuntu-24.04` runner;
- Google Chrome `151.0.7922.173`;
- actual repository guard prefix plus `content.js` loaded from checkout;
- Playwright `1.55.0`;
- `pypdf 6.0.0` physical PDF text inspection;
- synthetic local fixtures containing no user data;
- exact accepted workflow head `445866d20f2caec910db6edb853b428524b9d51f`;
- workflow run `33608253236`;
- job `100177131433`;
- conclusion **SUCCESS**;
- persisted raw result commit `0b660c772757dcaf363d81771ab574cbec51f22d`.

Durable reproduction harnesses:

- `project_tools/research_c24_inert_disclosure.py`;
- `project_tools/research_c24_named_details.py`.

The temporary workflow and raw JSON receipts are removed before the final research PR.

### 4.1 Current-path guarded activation is a positive control

The selected fixture contains four disclosure-like page controls: ordinary ARIA button, stateful ARIA button, submit button and non-hash anchor.

Fresh result:

- `blockedPageClicks = 4`;
- page-observed `clicks = []`;
- page-observed `submits = 0`;
- page-created `STATEFUL_CREATED_BY_PAGE_CLICK` is absent both before and in the physical PDF.

This directly rejects the old current-behavior hypothesis that WebClip presently synthetic-clicks those controls through to page handlers. **P0-067 DONE remains closed.**

The existing panels still become visible because current helper falls back to direct live DOM/style/ARIA mutation after the blocked attempt.

### 4.2 Live native details transition creates post-admission application content

Before WebClip preparation the selected native details is closed. Current preparation sets `open=true` on the live node.

The fixture's page-owned `toggle` listener observes that transition and appends `NATIVE_TOGGLE_CREATED_CONTENT`.

Fresh result:

- `nativeClosed: false -> true`;
- one page-created native-toggle node appears;
- physical PDF contains `NATIVE_CLOSED_CONTENT` **and** `NATIVE_TOGGLE_CREATED_CONTENT`;
- Exclude and unselected outside shell remain absent.

Physical current-path PDF:

- bytes: `25239`;
- SHA-256: `948b5eb539b4dc4bf9999d64b7974979a01519dc93aa95202490d3ed43bcfe9d`.

Thus current PDF can include content that did not belong to the admitted source state and exists only because WebClip mutated the live native widget.

### 4.3 Fallback panels are readable but source mutation persists

The physical PDF contains the pre-existing ARIA/stateful/submit/anchor panel text after fallback.

After physical print the live source still has:

- native details open;
- `aria-expanded=true` on fallback controls;
- corresponding panels visible;
- fixture-observed source mutations retained.

This is a useful completeness positive control but not an inert/static implementation: current success modifies the hostile source document and provides no provenance receipt for the transformation.

### 4.4 Disconnected static materialization is the causal control

A test-only control clones the selected scope while disconnected, removes Exclude, expands native details and already-existing controlled panels in the clone, then prints that static representation while keeping the source hidden/unmodified.

Fresh result:

- source native details remains closed;
- page clicks/submits remain zero;
- page native-toggle-created/stateful-click-created content remains zero;
- physical PDF contains all pre-existing disclosure/panel content;
- physical PDF contains neither page-created side-effect token;
- Exclude/outside shell remains absent.

Physical causal PDF:

- bytes: `9990`;
- SHA-256: `e55db22c9f3d74bd26c92f3fba3b86dd9bfac2d2135354cdf354d1cb2f351047`.

This proves that the tested useful disclosure completeness does not require executing the host page's activation/state-transition behavior on the source document.

### 4.5 Named-details group exposes a second live-widget completeness failure

A separate fixture contains two initially closed safe `<details name="faq">` members with distinct existing bodies.

Current actual WebClip preparation iterates them and assigns `open=true` to each. Browser mutual-exclusion semantics close the first when the second opens.

Fresh current-path result:

- before: `g1=false`, `g2=false`;
- prepared: `g1=false`, `g2=true`;
- physical PDF contains group two body but **not** group one body;
- Exclude/outside shell remains absent.

Physical current-path named-details PDF:

- bytes: `23363`;
- SHA-256: `6b392aa40ad6231c1061f4b7422827837c3bf872d1701bf280553757811a7d2f`.

The causal disconnected static representation removes the named-group exclusivity from the archival clone, opens both, leaves the source group closed and physically prints both bodies.

Causal named-details PDF:

- bytes: `8429`;
- SHA-256: `028f25acf2fda6a273596cbe5376ec040aabb6eaa249001a06a8b59e38230d11`.

Raw named-details result SHA-256:

`e38213efecf265e95d756379600396964aa7657ed0821cb479e5c349e43ce78f`

Primary C24 result SHA-256:

`a21f2881112aaac414ab61a7b371c89f3d6fd1eeca0cb9e9e899f5386fbd11d3`

## 5. Duplicate / root-cause reconciliation

### 5.1 No new C24 P-code

The fresh failures remain inside existing current ownership regions:

- **P0-075 ACTIVE** — the host page is not a trusted preparation/control plane; static representation should be isolated from page-observable/live mutation;
- **P0-070 ACTIVE** — physical output must remain bound to the admitted source/document generation rather than post-admission application state created by WebClip;
- **P0-004 ACTIVE** — selected PDF completeness/fidelity is the physical consequence, including lost named-details body and admission of post-transition content;
- **P1-167 ACTIVE** — current disclosure helper still performs broad scans and serial waits, including a 40 ms wait after page clicks that the P0-067 guard blocks;
- **P1-004 ACTIVE umbrella** remains supporting source ownership for missing cross-origin disclosure parity.

No separate “native details”, “accordion”, “toggle event” or “named details” P-code is warranted: each is a manifestation of the same missing WebClip-owned static disclosure representation.

### 5.2 P0-067 remains DONE and is explicitly a fresh positive control

Fresh physical evidence demonstrates that current production guard prevents page-owned `.click()`/submit activation for the tested controls. The older unguarded C24 synthetic-click result must not be promoted as current behavior.

### 5.3 P1-212 remains ACTIVE but this tranche does not prove a current activation leak

Current Registry wording for P1-212 is broader policy: print preparation must not synthesize activation of page-owned controls merely to reveal content. Current source still expresses the attempted `.click()` path, but P0-067 prevents the actual page activation in this exact physical matrix.

Therefore C24 does not claim a fresh P1-212 page-click failure. The remaining current findings are live native widget/state mutation, fallback mutation, completeness/provenance and boundedness.

## 6. Architectural implications

### 6.1 Do not improve the click heuristic; change representation ownership

The target should not be a longer allowlist of “safe” page controls. A control that looks disclosure-like can still carry application semantics, and native widget mutation itself can be page-observable.

The stronger architecture is:

`admitted selected source state -> bounded WebClip-owned inert/static disclosure representation -> resource convergence -> physical renderer`

rather than:

`admitted source -> mutate/activate live page until it looks printable -> PDF`.

### 6.2 Native details must be materialized as archival content, not left under live widget exclusivity

For ordinary `<details>`, static representation may preserve summary plus expanded body while separately recording original `open` state.

For `<details name>` groups, the static representation must not blindly inherit mutually-exclusive live accordion behavior if the product contract requires every safe pre-existing closed body to be readable. A static renderer may neutralize group exclusivity in its private representation while preserving source-state provenance.

### 6.3 Safe existing panels can be represented without page-owned action

The causal control shows that already-existing hidden panels can be made statically readable without invoking their controls or mutating the source page.

Content that exists only after page/application action remains a different class: user materialization or truthful degraded/unknown is required; WebClip must not generate it by executing application behavior.

### 6.4 Preserve bounds and parity

Any future representation must obey shared node/control/text/mutation/time/resource budgets and must not turn disclosure discovery into unbounded whole-page work.

Same-origin and supported remote-frame disclosure semantics need explicit parity or truthful degradation; current `frame-agent.js` does not provide it.

## 7. Verdict and next checkpoint

Fresh C24 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/GUARDED-ACTIVATION/INERT-STATIC/NAMED-DETAILS/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-167 supporting)`**

Fresh evidence corrects one historical assumption rather than repeating it: page-owned programmatic clicks are now blocked by P0-067 and do not reach page click/submit handlers in the tested production-shaped path.

The remaining current failure is representation ownership. Live `details.open` can admit post-admission page-created content; direct fallback mutates source state and persists after print; named-details exclusivity can hide another safe body; the operation emits no source-closed/static-expanded receipt. Disconnected static materialization preserves the tested safe existing content without those source-side effects.

Required durable integration for this tranche:

- retain both fresh reproduction harnesses;
- retain this evidence plus a compact C24 receipt;
- advance only C24 in the fresh-restart matrix;
- leave `RESEARCH_REGISTRY.md` unchanged;
- leave runtime/product code unchanged;
- keep `RELEASE_READINESS.md` at **NOT READY** and manifest/runtime at `0.9.8`.

After C24 integration, the next sequential fresh-restart coordinate is **C25 — Dialog / popover / top layer**.
