# WebClip — fresh full-project research restart — C22 user-reached dynamic scroll — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = 05dc44e43765c37a24a8b4a6d6621c92e7e0b759`

Fresh source identity:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `RESEARCH_REGISTRY.md` remains the sole P-owner/status authority.

Fresh restart coordinate:

**C22 — Scroll-triggered new logical content / user-reached max boundary**

Recommended integrated classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NO-AUTOSCROLL/TRUSTED-WHEEL/SCROLL-BACK CONTROLS (P1-230)`**

No new P-code is allocated and no Registry wording/status changes. C22 fresh evidence revalidates the already-ACTIVE P1-230 contract. Runtime, manifest/version, release readiness, build, tag and GitHub Release are unchanged.

## 1. Bounded question

C22 asks whether current WebClip preserves the current primary-PDF contract for **new logical content created by user scrolling**, while maintaining an authoritative maximum user-reached boundary:

1. Does WebClip preparation/physical print avoid scrolling the page farther and creating content that the user did not reach?
2. If the user really scrolls far enough to materialize additional additive content and then returns upward, does that retained content remain in the physical selected PDF?
3. Does current capture/admission metadata contain a WebClip-owned, generation-bound maximum user-reached scroll receipt, or does it merely rely on current DOM/page state?

C22 deliberately does not test virtualized/recycled history after nodes are removed. That stronger history-loss mechanism is **C23**. It also does not reopen C20 retained-scrollport clipping or C21 lazy-resource readiness.

## 2. Current normative contract

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` §6 requires:

- WebClip must not auto-scroll the live page to create new logical content beyond the user;
- dynamic content already present at session start remains in scope;
- during an active capture/selection session, the maximum user-reached boundary should be retained where technically possible;
- content materialized by user scrolling within that boundary is part of PDF completeness;
- scrolling back upward must not shrink that maximum boundary;
- if virtualized history cannot be recovered, the result must be truthfully partial/degraded/unknown rather than silently complete.

`RESEARCH_REGISTRY.md` already assigns this independent acceptance contract to **P1-230 ACTIVE**.

## 3. Fresh current-source inspection

### 3.1 Current state has no user-reached scroll ledger

Fresh exact-current `content.js` state contains selection, frame, resource and print fields, but no max-user-scroll, user-reached boundary or retained logical-scroll history structure.

### 3.2 Current scroll listener is UI-only

`addListenersToDocument(doc)` installs:

`doc.addEventListener('scroll', scheduleOutlineUpdate, true)`

and the corresponding cleanup removes that same listener.

Fresh inspection finds no C22 admission/history work on that event path. Scroll currently updates WebClip outlines; it does not create a persistent user-reached boundary receipt.

### 3.3 Preparation has no auto-scroll convergence loop

Fresh current source contains no general save-time `scrollTo()` / “scroll until no new items” convergence path. This is an important positive control for the current product rule: WebClip should not become a crawler that creates more infinite-scroll items than the user reached.

### 3.4 Current save metadata is not a user-boundary receipt

The physical harness below inspects the actual `WEBCLIP_GENERATE_PDF` request emitted after current `content.js` preparation. It searches the captured metadata for explicit user-reached/max-boundary/history fields and finds none in both the no-scroll and user-scroll cases.

This is consistent with fresh source inspection. Current scroll dimensions or current DOM counts are not equivalent to a retained maximum user-reached authority: a later scroll-back or virtualizer can change the current represented state.

## 4. Fresh exact-source physical evidence

Accepted environment:

- exact canonical source baseline: `05dc44e43765c37a24a8b4a6d6621c92e7e0b759`;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`;
- GitHub-hosted `ubuntu-24.04` runner;
- Playwright `1.55.0`;
- `pypdf 6.0.0` physical PDF text inspection;
- workflow run `33606163625`;
- job `100170513908`;
- exact accepted workflow head `a0f0ded486020e0b3b9405903f4b14fdd1717ff1`;
- conclusion **SUCCESS**;
- raw result SHA-256 `803d23630e2f50ee78446e532b489e936d08be7373c1c9411af03a921ca92911`.

Durable reproduction harness:

`project_tools/research_c22_user_reached_dynamic_scroll.py`

The fixture is synthetic/local. It initially owns 20 selected feed items and appends another batch of ten only when the browser scroll reaches the current bottom. The harness drives the actual repository `content.js` selection/download preparation. User-reached motion is generated by browser wheel input rather than direct `scrollTop` assignment.

Raw result JSON is emitted before interpretation assertions.

## 5. Physical matrix

| Case | Before user/prep | User-reached state | After WebClip prepare/print | Physical PDF |
|---|---|---|---|---|
| No user scroll | 20 items, 0 scroll events | none | still 20; 0 scroll events | exactly items 1…20; 2 pages |
| User reach then scroll back | starts 20 | wheel scrolling grows to 40; max observed bottom `2400`; 2 UA/trusted scroll events before return | back at `scrollY=0`; still 40 after prepare and print; no fifth/sixth batch | exactly items 1…40; 3 pages |

Both cases preserve Exclude and outside-scope omission.

Exact physical artifacts:

- no-user-scroll PDF SHA-256: `8aa10052560e10cb6354035217d4789f50fe3c44722ec02f38c730ea0aab1c96`;
- user-reach-then-back PDF SHA-256: `f633b4eec09565ccef7b370900e99a65009c61bd99b84406d8b891f4d4ea29d6`.

## 6. Positive control — WebClip does not create N+1 content

In the no-user-scroll case:

- `count=20`, `batches=2` before save;
- current WebClip preparation emits no page scroll event;
- physical `printToPDF` emits no page scroll event;
- `count=20`, `batches=2` after the physical cut;
- PDF contains exactly `C22_ITEM_001…020`.

This freshly rejects the broad hypothesis that current WebClip/Chromium print implicitly autoscrolls an infinite-like feed for completeness.

## 7. Positive control — user-materialized additive nodes survive scroll-back

The second case starts selection while only 20 items exist. Browser wheel input reaches the bottom twice and page-owned scrolling adds two new batches. At the deepest state:

- `count=40`, `batches=4`;
- `scrollY=1680`;
- page-side `maxObservedBottom=2400`;
- two browser-dispatched scroll events have been observed.

The user trajectory then returns to top. Before WebClip preparation:

- `scrollY=0`;
- all 40 materialized nodes are still mounted.

After WebClip preparation and physical print:

- count remains exactly 40;
- no additional batch is produced;
- PDF contains exactly items 1…40, including `C22_USER_LAST`;
- Exclude and outside controls remain absent.

Therefore additive content that the user actually caused to materialize and that remains mounted is physically preserved under current WebClip.

## 8. Fresh finding — maximum user-reached authority is absent

The current success above depends on the page retaining all materialized nodes. WebClip itself still has no maximum-user-boundary/history authority.

Fresh source plus exact save-request inspection shows:

- scroll handling is UI-outline-only;
- no generation-bound max-user-scroll ledger exists in current `state`;
- actual save metadata contains no explicit user-reached/max-boundary/history receipt (`userBoundaryMetaPaths=[]` in both cases);
- current preparation simply consumes the represented page/selected DOM that exists when save begins.

This directly revalidates **P1-230 ACTIVE**. It is not a new symptom-only owner.

The practical consequence becomes artifact-visible when a site later removes/recycles previously reached items; that physical history-loss discriminator is intentionally reserved for C23. C22 establishes the admission/provenance half of the same root and verifies the no-auto-scroll/additive positive controls on current source.

## 9. User-authority nuance: `scroll` event trust is not sufficient by itself

The accepted user-wheel fixture produced browser-dispatched scroll events. That is useful test provenance, but future implementation must not simply treat `scrollEvent.isTrusted === true` as a complete user-authority proof.

The WHATWG DOM Standard defines `Event.isTrusted` as whether the event was dispatched by the user agent, not specifically whether a human physical gesture authorized a product-level boundary. User-agent events can also arise from browser handling of programmatic state changes.

A future P1-230 implementation therefore needs a bounded input/admission model that distinguishes the user's accepted scrolling trajectory from page-owned scripts and from WebClip's own UI/preparation actions. P0-075 remains supporting hostile-page/control-plane authority.

Reference:

- https://dom.spec.whatwg.org/

## 10. External comparison research

External material is architecture/risk input, not WebClip acceptance proof.

### 10.1 SingleFile user reports show the retained-history problem in product terms

Current SingleFile issue #1931 reports that after manually exposing segments of an infinite-scroll page, saving can still retain only certain loaded segments depending on the current view. Discussion #1737 similarly describes dynamically loaded/unloaded page content disappearing from the saved result.

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1931
- https://github.com/gildas-lormeau/SingleFile/discussions/1737

These reports support the need for an explicit history/boundary contract, but they do not prove WebClip behavior.

### 10.2 Browsertrix/Webrecorder deliberately uses a different product contract

Browsertrix Crawler's built-in Autoscroll intentionally scrolls a page while new elements are being added until scrolling stops or a behavior timeout is reached. Browsertrix documentation also exposes Autoscroll as a configurable crawl behavior.

References:

- https://crawler.docs.browsertrix.com/user-guide/behaviors/
- https://docs.browsertrix.com/user-guide/workflow-setup/

That is appropriate for crawler/archival capture, but current WebClip faithful-PDF semantics explicitly forbid this strategy beyond the user's own boundary. The useful architectural lesson is that dynamic content needs an explicit behavior contract; the Browsertrix solution itself is not transplanted into WebClip.

## 11. Duplicate/root-cause reconciliation

Fresh current Registry and historical evidence make the owner boundary precise:

- **P1-230 ACTIVE** — primary owner for max user-reached dynamic/virtualized history or truthful degradation;
- **P0-075 ACTIVE** — supporting authority: a hostile page cannot forge user authorization for farther capture;
- **P0-070/P0-080 ACTIVE** — supporting exact document/application/logical generation and selection identity;
- **P1-167 ACTIVE** — any future tracking/materialization remains bounded;
- **P0-004 ACTIVE** — physical completeness of represented descendants, but it cannot reconstruct logical items that later cease to exist;
- **P1-003 ACTIVE** — resource readiness only, not logical-item history.

No new P-code is warranted.

## 12. Architectural implication

C22 does **not** justify auto-scrolling the live page. The current no-auto-scroll behavior is a positive control and should be preserved.

The target direction under P1-230 is instead:

`trusted/bounded user trajectory + exact document/frame/application/capture generation`

→ `maximum user-reached boundary + bounded logical-content/history receipts`

→ `static capture uses only content within that admitted boundary`

→ `if history cannot be reconstructed/proven, truthful partial/degraded/unknown`.

That boundary/history representation belongs conceptually in the format-neutral capture/provenance layer, not in PDF pagination itself.

## 13. Verdict and next coordinate

Fresh C22 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/NO-AUTOSCROLL/TRUSTED-WHEEL/SCROLL-BACK CONTROLS (P1-230)`**

Fresh current source and physical Chrome evidence prove two important positive controls: WebClip does not silently crawl farther during save, and retained additive items produced by a user scroll survive scroll-back into the physical selected PDF. The unresolved current contract is that WebClip has no own generation-bound maximum user-reached boundary/history receipt and therefore cannot distinguish retained completeness from later recycled-history loss by current page state alone.

No owner/status/runtime/version/release changes are made. After C22 integration, the next sequential coordinate is **C23 — Virtualized/windowed content history within user-reached range**.
