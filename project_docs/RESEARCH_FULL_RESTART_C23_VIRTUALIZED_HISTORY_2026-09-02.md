# WebClip — fresh full-project research restart — C23 virtualized/windowed history — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = 7d0774054d434b4dd897af3a14a51732018c4cb9`

Fresh source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

Fresh restart coordinate:

**C23 — Virtualized/windowed content history within user-reached range**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/GRADUAL-WHEEL/SCROLL-BACK/RECYCLED-HISTORY/CAUSAL CONTROLS (P1-230)`**

No new P-code is allocated and no Registry wording/status changes. Runtime, manifest/version, release readiness, build, tag and GitHub Release are unchanged.

## 1. Bounded question

C23 asks the physical-history half of the current P1-230 contract:

> If a virtualized page repeatedly mounts logical items while the user scrolls through them, then recycles/removes those DOM representations before save, does current WebClip preserve the logical content already inside the user-reached range, or does the current mounted DOM window silently become the archive?

This tranche deliberately avoids a nested `overflow:auto` scrollport so the result is not explained by the independent C20 retained-scrollport clipping defect. It also does not ask WebClip to auto-scroll or discover content the user never reached.

## 2. Current contract and owner

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` §6 requires WebClip to strive to preserve dynamic/virtualized content that the user has already reached. Scrolling back upward must not shrink the maximum boundary merely because the current DOM/window changes. If prior history cannot be safely reconstructed, the result must be truthfully partial/degraded/unknown.

`RESEARCH_REGISTRY.md` already assigns this invariant to **P1-230 ACTIVE**:

- current mounted DOM/window cannot silently substitute for admitted user-reached history;
- preservation/history must be generation-bound and bounded;
- WebClip still must not auto-scroll beyond the user boundary.

## 3. Fresh current-source inspection

C22 fresh inspection on the immediately preceding current source established that `content.js` has no WebClip-owned max-user-scroll/history ledger. C23 starts from the C22-integrated main, and `content.js` remains byte-identical at blob `f3ee7b51...`.

The relevant current mechanism therefore remains:

- selection state stores current Element references;
- current scroll handling schedules outline updates;
- save preparation consumes current selected DOM/render state;
- no logical virtual-item history is accumulated as the page recycles nodes.

The C23 physical fixture below tests the artifact consequence directly.

## 4. Fresh exact-source physical evidence

Accepted environment:

- canonical C23 baseline: `7d0774054d434b4dd897af3a14a51732018c4cb9`;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`;
- GitHub-hosted `ubuntu-24.04`;
- Playwright `1.55.0`;
- `pypdf 6.0.0` physical PDF text inspection;
- workflow run `33606883094`;
- job `100172789243`;
- exact accepted workflow head `355cc40f5d754b45d3da29c69fb466b50e187ef5`;
- conclusion **SUCCESS**;
- raw result SHA-256 `67d332fc775670fec9b2c42a4d6952a9f8df948f40d2e8789e246b18211d3964`.

Durable reproduction harness:

`project_tools/research_c23_virtualized_history.py`

## 5. Fixture design — virtual history without a retained scrollport

The synthetic selected document owns a tall normal-flow/window-scroll surface representing 100 logical positions, but only eight reusable row Elements exist at any time.

On each browser scroll event the virtualizer:

1. computes the current logical window from `window.scrollY`;
2. repositions/relabels the same eight DOM nodes;
3. records every logical ID that has actually been mounted in a page-side `seen` set.

The browser-wheel trajectory walks the windows gradually:

`1…8 -> 9…16 -> 17…24 -> 25…32 -> 33…40 -> 41…48 -> 49…56 -> 50…57`

and then returns to the top.

No `overflow:auto` container is involved. This isolates virtualized DOM recycling from C20.

## 6. User-reached proof

At session start:

- current mounted window: `1…8`;
- page-side seen history: `1…8`;
- `maxLogical=8`.

After seven browser wheel scroll events:

- current mounted window: `50…57`;
- `scrollY=3136`;
- page-side seen history is exactly **every ID 1…57**;
- `maxLogical=57`;
- all seven scroll events observed by the fixture are browser-dispatched/trusted events.

After the user trajectory returns to top:

- `scrollY=0`;
- current mounted window has been recycled back to `1…8`;
- page-side seen history still proves `1…57` had actually been mounted during the trajectory.

## 7. Fresh physical finding — current WebClip serializes only the recycled current window

The top-level virtual host remains the single current WebClip Include throughout the trajectory. After scroll-back, the actual current WebClip download/preparation path is executed and the exact prepared document is physically printed.

Physical current-path result:

- PDF SHA-256 `4fd32b4c9222e548cacdc5cbe59e1b1d257305dbe9d6ad6d752363ad4840a4c6`;
- 6 PDF pages due the retained virtual scroll geometry;
- extracted logical IDs: exactly **1…8**;
- `C23_FIRST_SENTINEL` present;
- `C23_REACHED_LAST` for logical item 57 absent;
- Exclude absent;
- outside-scope token absent.

The actual user-reached history 9…57 is therefore absent from the physical saved copy even though the fixture proves each ID was mounted during the user trajectory.

This is not merely “content was never loaded”. It is previously materialized logical history lost because the current DOM window was recycled before the physical render cut.

## 8. Causal control — static materialization of exact seen history restores the artifact

A second run repeats the same browser-wheel trajectory and the same current WebClip preparation. Immediately before physical print, a test-only causal step materializes exactly the recorded `seen` IDs into inert/static normal flow inside the already-selected host and hides the recycled pool.

Causal result:

- materialized logical count: `57`;
- first/last: `1 / 57`;
- physical PDF IDs: exactly **1…57**;
- `C23_FIRST_SENTINEL` present;
- `C23_REACHED_LAST` present;
- Exclude/outside tokens remain absent;
- PDF SHA-256 `9763b1a22f56420dcf11e2070b42fdb692a21200f47a28d6209e4771aa1a9552`.

This rules out explanations that Chrome cannot print that amount of content, the logical rows are intrinsically unprintable, or selection filtering requires the loss. The missing history is representational: current WebClip has no retained logical history to materialize after the page recycles it.

## 9. Duplicate/root-cause reconciliation

No new P-code is warranted.

Primary owner:

- **P1-230 ACTIVE** — exact current root: user-reached dynamic/virtualized logical history cannot be replaced by the current mounted window; preserve it within bounded generation or report truthful degradation.

Supporting owners/boundaries:

- **P0-070/P0-080 ACTIVE** — exact document/application and selection generation;
- **P0-075 ACTIVE** — page-owned state is not user authority;
- **P1-167 ACTIVE** — any observation/history/materialization must be bounded;
- **P0-004 ACTIVE** — physical completeness once content has a faithful final representation;
- **P1-003 ACTIVE** — resource readiness, not logical-item history.

C20 does not own this result because no retained nested scrollport exists. C22 already proved the maximum-boundary admission/provenance half of P1-230; C23 now supplies fresh B6 physical history-loss evidence.

## 10. External comparison research

External sources explain why current DOM cannot be assumed to equal logical list history.

### 10.1 TanStack Virtual explicitly keeps the DOM small

Current TanStack Virtual documentation describes a virtualizer that renders only the visible items (plus optional overscan) while maintaining a much larger logical scroll surface. Its table guide likewise says virtualization keeps DOM size small by rendering only the viewport/overscan subset.

References:

- https://tanstack.com/virtual/latest/docs/introduction
- https://tanstack.com/table/latest/docs/framework/react/guide/virtualization

This is a normal performance architecture, not a site defect. It means archival capture that wants user-reached history needs its own logical/history representation rather than assuming every previously seen row remains as DOM.

### 10.2 React Virtualized is another independent windowed-list implementation

`react-virtualized` documents `List` as a windowed list whose `rowRenderer` renders rows needed for the current virtualized view. This provides an independent implementation example of the same architectural class.

Reference:

- https://github.com/bvaughn/react-virtualized/blob/master/docs/List.md

### 10.3 SingleFile user reports show the archive consequence

SingleFile issue #1931 and discussion #1737 describe manually exposed/dynamically loaded page segments disappearing from the saved artifact when the live page unloads/recycles them.

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1931
- https://github.com/gildas-lormeau/SingleFile/discussions/1737

These external reports are failure-mode inputs only; C23 classification rests on fresh WebClip source plus the exact physical experiment above.

## 11. Architectural implication

The correct direction is not “disable virtualization globally” and not “auto-scroll until the list ends”. Both would violate product/runtime boundaries or create unbounded work.

P1-230 needs a capture/provenance mechanism roughly shaped as:

`exact capture generation`

+ `bounded user-reached trajectory/boundary`

+ `bounded logical-item/history receipts while items are actually represented`

→ `final inert/static representation of user-reached history`

→ `if history identity/content cannot be safely retained or reconstructed: partial/degraded/unknown`.

For a client-side virtualizer, an implementation may sometimes use stable item identity/data already available in the application, but WebClip cannot assume arbitrary page internals are trustworthy or standardized. A generic capture strategy must therefore be defensive, bounded and explicit about uncertainty.

## 12. Verdict and next coordinate

Fresh C23 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/GRADUAL-WHEEL/SCROLL-BACK/RECYCLED-HISTORY/CAUSAL CONTROLS (P1-230)`**

The user physically reaches every logical item 1…57, then returns to the top. The page recycles the same eight nodes back to IDs 1…8, and current WebClip saves only those eight. Test-only static materialization of the exact seen history restores all 57 in the physical PDF.

No new owner, status, runtime, version or release-readiness change is made. After C23 integration, the next sequential coordinate is **C24 — Spoilers/disclosures / inert expansion**.
