# WebClip — fresh full-project research restart — C17 cross-origin iframe — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = f1f5de60d7de901eb8249ae3376b07c29a196961`

Fresh product-source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`;
- `manifest.json` version remains `0.9.8`;
- `RESEARCH_REGISTRY.md` remains the only current P-owner/status authority.

Fresh restart coordinate:

**C17 — Cross-origin iframe capture/print boundary**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)`**

No new P-code is allocated. Fresh evidence directly revalidates existing **P1-229 ACTIVE** for the cross-origin selected-only print media/geometry contract and strengthens existing **P1-004 ACTIVE** for feature-level cross-origin frame reachability. Existing lifecycle owners P1-171, P1-193, P1-199…P1-203 and P1-214 remain separately ACTIVE and are not claimed exercised by this bounded C17 tranche. Runtime, manifest/version, build, tag, Release and release readiness are unchanged.

## 1. Bounded question

C17 asks whether a user-selected cross-origin iframe scope remains selection-bounded and complete through the current frame-agent preparation and physical Chromium PDF boundary, and whether the current frame-agent topology reaches nested content behind the first cross-origin boundary.

The fresh tranche deliberately separates two current mechanisms:

1. **one-level permitted cross-origin physical print representation** — Include/Exclude state, frame-agent `prepare-print`, top-frame height application and the worker-shaped media choice used by `Page.printToPDF`;
2. **nested reachability** — `top A -> cross-origin outer B -> same-origin inner B`, where the inner frame is inaccessible to top `content.js` because of the outer SOP boundary, but its immediate parent is same-origin.

C17 does not claim real user permission-prompt QA, permission revoke/regrant lifecycle, worker restart reconciliation, stale frameId/documentId races, partial multi-frame restore settlement or full unpacked `chrome.debugger` extension UI behavior. Those remain under C46 and their existing lifecycle owners.

## 2. Fresh current-source inspection

### 2.1 Cross-origin support is permission-gated and frame-agent based

Current `manifest.json` declares optional host permissions for `http://*/*` and `https://*/*`. The worker-side frame enable path injects `frame-agent.js` with `chrome.scripting.executeScript({ target: { tabId, allFrames: true }, ... })` after the relevant host permission has been granted.

The worker keeps a per-tab frame-agent registry and validates frame/document information before forwarding child state and commands. Those existing identity/lifecycle mechanisms are governed by P1-171/P1-199… and are not closed by C17.

### 2.2 `frame-agent.js` intentionally exits when its immediate parent is same-origin

At startup the current agent does:

```js
if (window.top === window) return;
try {
  void window.parent.document;
  return;
} catch (_) {}
```

The comment says same-origin child frames are handled recursively by top `content.js`, so an agent is needed only where the immediate parent DOM is blocked by SOP.

That heuristic is valid for a simple top-same-origin descendant, but it is not equivalent to **top-document reachability**. In topology `A -> B -> B`, the inner B document can read its immediate B parent, so its agent exits; however top A cannot cross the outer A/B boundary to recurse into the inner B document. This leaves the inner document with neither top-content recursion nor a live frame-agent.

### 2.3 Child selected-only filtering exists only inside `@media print`

Current `frame-agent.js::preparePrint()` appends the child print stylesheet:

```css
@media print {
  body *:not([data-webclip-remote-include])
        :not([data-webclip-remote-include] *)
        :not(:has([data-webclip-remote-include])) { display:none!important }
  [data-webclip-remote-exclude],
  [data-webclip-remote-exclude] * { display:none!important }
  html,body { overflow:visible!important; height:auto!important; max-height:none!important }
}
```

So the actual remote Include/Exclude representation is media-dependent.

### 2.4 The worker explicitly forces `screen` media before `Page.printToPDF`

Current PDF generation calls:

```js
Emulation.setEmulatedMedia({ media: 'screen' })
```

before `Page.printToPDF`. The intent is to preserve page screen CSS and prevent arbitrary site `@media print` rules from hiding selected content.

For a cross-origin child, however, this same override also disables WebClip's own selected-only `@media print` stylesheet. The product therefore asks the child to prepare a selection-filtered **print-media** representation and then renders under **screen media**.

This is the exact current mechanism described by **P1-229 ACTIVE**: one WebClip-owned media/geometry contract is required so worker screen-media emulation cannot disable child Include/Exclude filtering.

### 2.5 Remote geometry is measured before the selected-only print representation becomes effective

`frame-agent.js::preparePrint()` computes:

```js
const documentHeight = Math.max(...document scroll heights...)
```

before it appends the `@media print` selected-only style.

Top `content.js` then stores that returned value as `remote.printHeight` and uses it when expanding the live iframe for print. Therefore the current remote geometry is based on the pre-filter full child document rather than the same effective selected-only representation that should be rendered.

This is the second half of existing P1-229. C17 does not allocate a new geometry owner.

## 3. External browser/API constraints

External documentation is architecture/risk input only; the C17 verdict is based on current WebClip source and section 4 physical evidence.

### 3.1 Chrome `scripting.executeScript(... allFrames:true)` targets all frames

Chrome's current `chrome.scripting` documentation states that `allFrames: true` runs the injection in all frames of the specified tab, while specific `frameIds` may be used instead.

Reference:

- https://developer.chrome.com/docs/extensions/reference/api/scripting

This supports the C17 topology interpretation: the nested inner frame is not omitted because Chrome cannot target nested frames in principle. The durable WebClip agent itself exits based on immediate-parent SOP reachability.

### 3.2 Chrome content-script frame matching is evaluated per frame

Chrome's content-script manifest documentation states that with `all_frames: true`, frames are checked independently against their URL requirements.

Reference:

- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts

Again, this makes the architectural distinction important: **injection reachability** and **agent self-admission/top-document reachability** are different contracts.

### 3.3 CDP `Emulation.setEmulatedMedia` controls CSS media-query evaluation

The Chrome DevTools Protocol defines `Emulation.setEmulatedMedia` as emulating the specified media type for CSS media queries.

Reference:

- https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setEmulatedMedia

Therefore a deliberate `media: 'screen'` override is expected to make `@media print` false; the physical difference below is not treated as mysterious browser behavior.

`Page.printToPDF` itself remains the physical PDF renderer boundary:

- https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF

## 4. Fresh exact-source Chrome physical evidence

Accepted primary environment:

- GitHub-hosted `ubuntu-24.04` runner;
- Google Chrome `151.0.7922.173`;
- exact repository `content.js` and `frame-agent.js` loaded from checkout;
- Playwright `1.55.0`;
- `pypdf 6.0.0` physical PDF text inspection;
- two synthetic localhost HTTP origins with no user data;
- exact primary run head `ceb56406d03d0503c6e898e1fa940bd5ef70d3f7`;
- workflow run `33596133152`;
- job `100139834463`;
- conclusion **SUCCESS**;
- primary result JSON SHA-256 `e85ec2f6f72e204de597ba5811abe27e7d1dd9db3bca448c7f83ab72948fe896`.

The raw result was temporarily persisted by the workflow in follow-up bot commit `87d95e1e63a7b14abd2d54730de4de72e6d2f104` only so connector-visible review could read it; that temporary receipt and workflow are removed before integration. The accepted physical execution itself is the successful run/job above.

Durable reproduction harness:

`project_tools/research_c17_cross_origin_iframe.py`

The harness uses real separate HTTP origins and a SOP-respecting postMessage transport shim for extension messaging. It loads the repository's actual product scripts, drives current Include/Exclude and download preparation, holds the mocked worker PDF reply, and physically prints the exact prepared page under both the production-shaped `screen` media and a causal `print` media control. Raw JSON is emitted before assertions.

### 4.1 One-level cross-origin positive admission control

The child frame successfully registers a frame-agent, receives the current selection session, and records one Include plus one nested Exclude. Preparation succeeds with four remote commands and a clean bounded resource report (`attempted=0`, `failed=0`).

The selected article contains 120 logical rows with FIRST/MIDDLE/LAST sentinels. The unselected tail contains 160 rows; one token is used as an explicit unselected sentinel.

This proves that the fixture is exercising the intended current remote-selection path rather than merely printing an uncontrolled iframe.

### 4.2 Production-shaped `screen` media physically violates selected-only scope

With the prepared document printed under the worker's current `screen` media contract:

- all 120 selected rows remain present;
- FIRST, MIDDLE and LAST remain present;
- **the explicit Exclude is present**;
- **the unselected child tail is present**;
- 159 distinct unselected row tokens are extracted;
- the unselected top-document shell remains correctly omitted;
- PDF pages: `11`;
- PDF SHA-256: `722f853462a91b3269dc1231a73ab0ec619ade63ecd0ab8c183f71fe8dd13ed3`.

This is not a completeness failure for the selected rows; it is a **selection-boundedness failure** inside the cross-origin child representation.

### 4.3 Causal `print` media control restores remote Include/Exclude semantics

The harness prints the same already-prepared document again, changing only the effective CDP media to `print`.

Physical result:

- 120/120 selected rows present;
- FIRST/MIDDLE/LAST present;
- Exclude absent;
- unselected child sentinel absent;
- unselected row count `0`;
- top shell absent;
- PDF pages: `11`;
- PDF SHA-256: `5bc1cb09fdd5a6701623dfbc4d22c6d2c0813a0c4d9f1cdb93c8ec1fff4b1afb`.

This directly isolates the media-contract cause: the child selection stylesheet exists and works physically, but the worker's `screen` override disables it in the production-shaped cut.

### 4.4 The same result exposes stale pre-filter geometry

The current child preparation reports/full-frame expansion produces a top iframe height of approximately `10318px` even though the selected article itself is much shorter than the full child document.

A supplementary development probe switched the already-expanded prepared page to print media and observed:

- Exclude computed `display:none`;
- unselected tail computed `display:none`;
- selected target height about `4096px`;
- iframe/prepared screen height about `10318px`;
- child document `scrollHeight` still about `10314px`;
- selected-only physical PDF remains complete but still spans `11` pages.

The probe's assertion expected post-filter `document.scrollHeight` itself to shrink below 60% of the prepared height and therefore failed. That assertion was **rejected** because after top already expands the iframe, the child document's scrollHeight is lower-bounded by the large frame viewport. The raw observation is retained here only to explain the confound; the failed development run is not promoted to an accepted gate.

The source-order fact remains independently clear: production `documentHeight` is measured before the selected-only style is appended. A future causal geometry test must measure the selected representation before top expansion, or otherwise remove viewport-size feedback from the measurement.

Rejected development run for provenance:

- workflow run `33596451775`;
- job `100140759277`;
- run head `1eff84ca924a176a92b5368e0143c9d8a6fbbaf3`;
- raw observation result SHA-256 `6a79868e8209dd0ce1d018718c1282a966e161ca3597af1b8ede5c5bfbdc67cb`;
- final conclusion **FAILURE** due the harness assertion described above, not due a new product assertion.

### 4.5 Nested `A -> B -> B` reachability revalidates P1-004 umbrella

The second accepted browser case constructs:

`top origin A -> outer iframe origin B -> inner iframe origin B`

Observed current behavior:

- outer B agent active: `true`;
- outer listener count: `1`;
- inner B agent active: `false`;
- inner listener count: `0`;
- Include count before inner click: `0`;
- Include count after clicking the inner target: `0`;
- clicking the outer positive target then changes Include count to `1` and records `C17_OUTER_POSITIVE_TOKEN`.

This gives both negative and positive controls in the same topology. The outer cross-origin support path works; the same-origin descendant behind that boundary is unreachable because the inner agent self-exits while top recursion is blocked by the outer SOP boundary.

## 5. Duplicate / root-cause reconciliation

### 5.1 No new media/geometry owner: P1-229 already exactly owns it

Current Registry wording for **P1-229 ACTIVE** requires one WebClip-owned cross-origin selected-only PDF media/geometry contract so worker screen-media emulation cannot disable child Include/Exclude filtering, and iframe geometry is measured from the same effective post-filter representation rather than pre-filter full-document height.

The fresh C17 source and physical findings are a direct reproduction of that exact owner. Allocating another P-code would duplicate the root cause.

### 5.2 Nested reachability remains inside P1-004 feature umbrella

Current **P1-004 ACTIVE** says the cross-origin iframe feature umbrella remains partial until exact child document/permission/session lifecycle owners are closed. Historical implementation evidence proved ordinary one-level/opaque-origin support but explicitly left the umbrella partial.

The fresh `A -> B -> B` reachability gap is a feature-topology limitation of the frame-agent admission scheme. Duplicate search did not identify a more precise existing owner whose invariant is solely "same-origin descendant behind the first cross-origin boundary has neither top recursion nor an agent". Therefore C17 records it under P1-004 rather than allocating a new code.

### 5.3 Adjacent lifecycle owners remain separate

C17 does not merge or close:

- **P1-171** — exact top/child document generation and reused frameId authority;
- **P1-193** — transient user activation and exact candidate generation for optional host permission request;
- **P1-199** — print-operation generation for remote prepare/restore;
- **P1-200** — remote selection/control session generation;
- **P1-201** — permission revoke/regrant cleanup/fencing;
- **P1-203** — frame-agent survival across MV3 worker restart;
- **P1-214** — multi-frame partial prepare/restore receipts and actual settlement.

Those are independently actionable even if P1-229 media/scope and the P1-004 topology gap are repaired.

## 6. Architectural implications

### 6.1 WebClip-owned selection filtering cannot depend on a media state the worker disables

The product may still choose to preserve host **screen CSS** rather than allow arbitrary site print CSS to redefine the selected content. But WebClip's own Include/Exclude authority must survive that choice.

An acceptable design therefore needs a WebClip-owned filtering layer whose activation is explicit for the print operation and is not accidentally disabled by the page media override. The exact implementation may be an always-active operation-scoped WebClip style, a dedicated representation, or another bounded equivalent; the contract matters more than the mechanism.

### 6.2 Geometry must come from the same effective representation

Remote iframe height must not be derived from the full pre-filter child document when the artifact will contain only a selected subset. The capture/materialization pipeline should establish the effective selected representation first and measure that same representation under the same width/media state used for physical rendering, while retaining existing boundedness and truthful degradation requirements.

### 6.3 Agent eligibility must model top-document reachability, not only immediate-parent SOP

The current immediate-parent test avoids duplicate handling for simple same-origin descendants, but misses descendants whose same-origin parent itself sits behind an earlier cross-origin boundary.

A repair must determine whether top WebClip recursion can actually reach the document. A same-origin child of a cross-origin outer frame may still require its own agent (or an equivalent delegated subtree agent), with exact document/session identity and without duplicate selection ownership.

### 6.4 Preserve existing security boundaries

Any topology repair must retain:

- explicit optional host-permission authority;
- sender/document generation validation;
- host-page non-authority over extension commands;
- bounded remote selection counts and resource work;
- operation-generation/rollback requirements from the existing lifecycle owners.

C17 does not justify broad `<all_urls>` standing access or bypassing Chrome permission UI.

## 7. Pipeline map B1…B9

| Boundary | C17 result |
|---|---|
| B1 User Intent | PASS for the exercised remote Include/Exclude admission; nested inner intent cannot currently be admitted. |
| B2 Admission / generation | PARTIAL; ordinary remote agent admission works, nested reachability and existing lifecycle generation owners remain open. |
| B3 Capture | FINDING: one-level remote selection snapshot exists, but nested same-origin descendant behind cross-origin boundary is not captured. |
| B4 Static Materialization | FINDING: child selected-only filtering is represented only in `@media print`, inconsistent with worker media choice. |
| B5 Renderer | FINDING: production-shaped `screen` media disables WebClip child print filtering; causal `print` media restores it. |
| B6 Physical Artifact | FINDING: selected rows remain, but Exclude + unselected child content leak into the physical PDF under current screen-media cut. |
| B7 Persistence / Transfer | Not exercised; PDF transfer/storage identity remains under existing owners. |
| B8 Journal / Provenance | Not exercised. |
| B9 Later Reading / Recovery | Physical PDF already demonstrates the wrong saved scope; viewer/recovery semantics not separately exercised. |

## 8. Integrated C17 conclusion

C17 advances from `NOT-TRIAGED / UNKNOWN` to:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL/NESTED-BOUNDARY CONTROLS (P1-229, P1-004 umbrella)`**

Accepted exact-current-source Chrome evidence establishes:

1. the ordinary one-level remote frame-agent path can receive Include/Exclude and prepare successfully;
2. current production-shaped screen-media PDF rendering disables the child selected-only print stylesheet, physically admitting Exclude and unselected child content;
3. the same prepared document under causal print media becomes correctly selection-bounded, directly revalidating P1-229;
4. current remote geometry is sourced before that selected-only representation becomes effective, also matching P1-229;
5. topology `A -> B -> B` leaves the inner same-origin descendant with neither top recursion nor an agent, strengthening P1-004 umbrella;
6. no new P-code or status transition is required.

C18 — Shadow DOM / slots / composed tree — is the next sequential untriaged coordinate.

## 9. Delivery state

This file and the durable harness are research evidence only. They do not modify runtime, permissions, version, release readiness, build, tag or GitHub Release.
