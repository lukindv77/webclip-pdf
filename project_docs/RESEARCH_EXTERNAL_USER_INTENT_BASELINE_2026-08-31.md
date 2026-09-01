# WebClip — external user-intent / peer-product baseline — 2026-08-31

Date: 2026-08-31

Campaign: second full deep-research cycle.

Canonical repository baseline at research start: `main = 2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`.

This is a substantive refresh required by `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` because a new full research cycle was explicitly started. It supersedes `RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-30.md` only as the **current external research input**; the earlier baseline remains historical evidence.

External evidence does not change `RESEARCH_REGISTRY.md`, does not create P-codes automatically, and does not silently modify `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

## 1. Research method and source classes

The refresh intentionally covered all source classes requested by policy where useful and accessible:

1. official product/developer documentation;
2. extension/app stores and current version metadata;
3. public GitHub repositories/issues from peer products;
4. Reddit/community reports describing real workflows/failures;
5. independent comparisons/reviews;
6. web-archiving/replay/capture documentation and specifications;
7. current browser/web-platform release material because renderer/API semantics are part of Change Impact.

No prevalence claim below is inferred from one issue/review. Individual reports are labelled isolated unless the same theme appears across multiple independent sources/products.

## 2. Fresh source inventory

### 2.1 Official product / developer sources

- SingleFile current Chrome Web Store listing: https://chromewebstore.google.com/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle
- Save Page WE Chrome Web Store listing: https://chromewebstore.google.com/detail/save-page-we/dhhpefjklgkmgeafimnjhojgjamoafof
- Obsidian Web Clipper introduction: https://obsidian.md/help/web-clipper
- Obsidian capture semantics: https://obsidian.md/help/web-clipper/capture
- Obsidian highlighter: https://obsidian.md/help/web-clipper/highlight
- Obsidian variables/current content extraction: https://obsidian.md/help/web-clipper/variables
- Evernote Web Clipper quick start: https://help.evernote.com/hc/en-us/articles/209125877-Evernote-Web-Clipper-Quick-Start-Guide
- Evernote clip formats: https://help.evernote.com/hc/en-us/articles/209125827-Clip-formats
- Zotero quick start/snapshots: https://www.zotero.org/support/quick_start_guide
- Zotero webpage saving: https://www.zotero.org/support/adding_items_to_zotero
- ArchiveBox current docs: https://docs.archivebox.io/latest/README.html
- Browsertrix Crawler behaviors: https://crawler.docs.browsertrix.com/user-guide/behaviors/
- Browsertrix QA/crawler docs: https://crawler.docs.browsertrix.com/
- Browsertrix workflow limits/behaviors: https://docs.browsertrix.com/user-guide/workflow-setup/
- ArchiveWeb.page: https://archiveweb.page/
- Webrecorder specifications / WACZ signing-verification family: https://specs.webrecorder.net/

### 2.2 Stores / current product movement

- SingleFile Chrome Web Store reports version **1.23.1**, updated **2026-08-29**, 600,000 users and 4.4/5 from about 1.1K ratings at scan time.
- SingleFile 1.23.1 release notes include fixes for blank self-extracting archive display and archive extraction robustness; current Safari/App Store notes also mention prior fixes for very large stylesheet hangs, repeated-save memory/performance, SVG display and ignored destinations.
- Obsidian Web Clipper App Store history shows 1.7.x changes around highlight persistence between live page and Reader, missing highlight markers, reader-font render warnings, clipboard/content handoff fixes, and site extractors.

These store/version facts are product-activity signals, not proof that the corresponding issue is prevalent.

### 2.3 Public GitHub issue evidence

SingleFile:

- https://github.com/gildas-lormeau/SingleFile/issues/1958 — filled form fields not present in saved result on a reported page.
- https://github.com/gildas-lormeau/SingleFile/issues/1961 — rewritten CSS `@import` dependency/provenance produced an unstyled saved page.
- https://github.com/gildas-lormeau/SingleFile/issues/1965 — save can hang before processing when a stylesheet optimization is enabled; issue remained open and was updated 2026-08-30 during this scan.
- current issue index also shows recent save hangs, local replay/display failures and destination/download edge cases as active peer maintenance themes.

Obsidian Web Clipper:

- https://github.com/obsidianmd/obsidian-clipper/issues/838 — missing images in article clipping.
- https://github.com/obsidianmd/obsidian-clipper/issues/876 — missing image captions on an academic article while main content remains intact.
- https://github.com/obsidianmd/obsidian-clipper/issues/895 — reported hotkey path created an empty note after an update while toolbar clipping worked.
- current PR list includes work titled `prevent live DOM mutation when clipping pages`, a useful architectural peer signal that capture-side page mutation is a recognized implementation concern.

### 2.4 Community evidence

- https://www.reddit.com/r/ObsidianMD/comments/1sm7cvk/web_clipper_does_not_save_full_article/ — incomplete article capture; manual selection can improve text capture but may lose images.
- https://www.reddit.com/r/ObsidianMD/comments/1t5oaqs/web_clipper_just_adds_blank_page_how_to_solve_it/ — reported correct clipper preview followed by a blank/empty persisted note on affected setups.
- https://www.reddit.com/r/ObsidianMD/comments/1mw3xg0/webclipper_full_article_images_graphs_etc_not/ — article text may be captured while graphs/images/embedded information are omitted.
- https://www.reddit.com/r/ObsidianMD/comments/1t44347/obsidian_web_clipper_not_including_featured/ — reported featured-image regression after updates.

Community reports establish real pain/workarounds, not prevalence.

### 2.5 Independent comparisons / hands-on reports

- https://kiroku.today/en/guides/how-to-archive-website-free — 2026 comparison emphasizes that different tools/representations solve different preservation goals and redundancy can be valuable.
- https://kiroku.today/en/guides/chrome-extensions-to-archive-webpages — distinguishes full-page screenshot, self-contained HTML and public archive URL as different design philosophies.
- https://blog.extenshi.io/posts/web-clipper-extensions-review-evernote-notion-raindrop-obsidian/ — 2026 comparison focuses on clipper permissions/data flow and local versus external storage.
- https://ldas.jp/en/posts/yahoo-news-web-archive-comparison/ — same-page comparison of SingleFile, Playwright PDF, ArchiveBox/WARC and media-specific capture.
- https://www.octoparse.jp/blog/save-website-tools — reported 2026 hands-on case where a dynamic page timed out in SingleFile and another saved page retained a notification popup; useful as an isolated external boundary example.

### 2.6 Web archiving / replay / QA patterns

Browsertrix documents deliberate behaviors such as autoscroll, autofetch and autoplay, bounded by behavior/page timeouts. Its crawler documentation also exposes QA crawling that compares replayed WACZ behavior/statistics with what the browser encountered during capture. Webrecorder specifications explicitly include WACZ packaging plus signing/verification for authenticity. ArchiveBox continues to preserve multiple redundant representations (SingleFile HTML, PDF, screenshot, WARC, DOM and article text) rather than treating one format as universally sufficient.

These are architecture/QA patterns. They do not override WebClip's faithful-PDF contract; in particular, Browsertrix autoscroll/autoclick behavior is evidence that materialization is an explicit product choice, not permission for WebClip to cross its current user-reached boundary.

## 3. Browser/web-platform delta relevant to a new research cycle

The prior physical research campaign used managed Chromium 144 for many renderer probes. Current external platform research shows materially newer Chrome rendering semantics:

- Chrome 146 (2026-03-10): scroll-triggered animations, scoped custom-element registries and the updated Sanitizer API — https://developer.chrome.com/blog/new-in-chrome-146
- Chrome 147 (2026-04-07): element-scoped concurrent/nested View Transitions — https://developer.chrome.com/blog/new-in-chrome-147/
- Chrome 150 (2026-06-30): CSS `text-fit`; beta notes also describe print-specific `page-margin-safety` — https://developer.chrome.com/blog/new-in-chrome-150 and https://developer.chrome.com/blog/chrome-150-beta
- Chrome 152 (2026-08-25, rolling out at scan time): JavaScript `CSSPseudoElement` access extends to `::backdrop`, `::scroll-marker` and `::view-transition` — https://developer.chrome.com/blog/new-in-chrome-152
- Chrome 153 beta (2026-08-20): new single-axis scroll-container combinations such as `overflow: scroll clip`, affecting sticky/scroll-container ancestry; this is a **watch/beta** signal, not yet a stable-current requirement — https://developer.chrome.com/blog/chrome-153-beta

This is material Change Impact for a new campaign. It does **not** invalidate every historical Chromium-144 result, but it creates new renderer variants that old evidence could not have covered and therefore requires explicit triage/revalidation for affected layout, composed-tree, top-layer, pseudo, animation, scroll/sticky and pagination surfaces.

## 4. Updated User Intent / Operation Map

| ID | Observed intent / expected outcome | Signal strength | WebClip relevance | Research implication |
|---|---|---|---|---|
| U1 | Save a complete current page as a durable offline/later-readable copy | cross-product | core | B2→B9 exact generation, offline resources, artifact/persistence truth |
| U2 | Save only selected text/elements/frame while preserving user authority | cross-product | core | Include/Exclude, selection restore, frame/composed scope, physical PDF |
| U3 | Choose readable/clean mode separately from faithful/full-page mode | cross-product | product-mode distinction | do not silently convert faithful PDF into Reader/cleanup |
| U4 | Preserve content beyond initial viewport | cross-product | core | long page, nested scroll, offscreen content, pagination |
| U5 | Materialize dynamic/lazy content where product semantics permit | cross-product | core/high | dynamic/virtualized boundary, lazy resources, truthful degradation |
| U6 | Preserve resources for offline use | cross-product | core | CSS/image/font/media resource identity and failure receipts |
| U7 | Keep provenance/metadata useful for later research/reference | cross-product | high | Journal, source identity, artifact linkage, later recovery |
| U8 | Preview/edit/highlight/select before save and get exactly that scope later | cross-product | core/high | admitted user authority must survive preparation and physical artifact |
| U9 | Bulk/automatic/repeated capture | recurring adjacent | secondary/currently separate | future mode; operation fencing/storage budgets if adopted |
| U10 | Use multiple representations because PDF/HTML/WARC/screenshot solve different needs | cross-product | architectural | capture-first architecture; separate format contracts |
| U11 | Successful preview/generation must equal persisted result | recurring cross-source | **core** | prioritize B6→B8 preview/artifact/destination identity; no success before settlement |
| U12 | Prefer local/private capture and explicit external-transfer authority | cross-product | core security/trust | permissions, minimization, destination authority, external upload receipts |
| U13 | Preserve user-entered / renderer-owned control state when faithful current-state saving promises it | isolated peer report + strong mission match | **high-risk core variant** | form value/selection/control scroll, sensitive-state provenance/minimization, L3+L4 |
| U14 | Capture must terminate within bounded work and fail/degrade explicitly rather than hang indefinitely | recurring across peer issue + archiving timeout practices | **core reliability** | C37/C38; time/node/byte/resource budgets and truthful failure path |

The new U13/U14 rows are not claims of broad market prevalence. They are promoted for research because external reports demonstrate the failure modes and WebClip's own mission makes silent corruption/hanging high-impact even at uncertain prevalence.

## 5. Recurring pain themes after refresh

The following themes are now supported by multiple source classes/products or by a strong architectural pattern:

1. **Incomplete capture** — missing body fragments, images, captions, embedded/graph content.
2. **Preview/admission versus persisted-result divergence** — correct UI preview or successful generation can still produce an empty/incomplete stored object.
3. **Rendered-state loss** — user-entered/control state can be lost even when ordinary DOM is captured.
4. **Resource/dependency rewriting breakage** — preserving/rewriting CSS/resource provenance can itself destroy later rendering.
5. **Non-termination / excessive work** — complex/dynamic/stylesheet-heavy pages need explicit limits and truthful failure rather than indefinite processing.
6. **Fidelity versus transformation ambiguity** — faithful page, Reader/article, screenshot and archival replay are distinct products/modes.
7. **Offline durability versus size/network cost** — embedding resources strengthens later reading but increases work/storage.
8. **Destination settlement** — a valid in-memory result is not enough if download/vault/cloud handoff fails or targets the wrong destination.
9. **Local/private processing** — permissions and external data flow are part of user trust for clippers.
10. **Modern renderer state is expanding** — view-transition pseudos, scroll-marker/backdrop pseudos, scroll-triggered animation, scoped custom-element registries and new print/layout semantics enlarge the state space a faithful capture tool must at least triage.

## 6. Immediate research-priority implications for the new full cycle

External evidence is one input, combined with mission, historical owners and coverage deficit. Initial priority raises are:

### A1 — Modern renderer/platform delta

Highest new-coverage signal because prior physical browser evidence used Chromium 144 and cannot directly cover stable Chrome 146–152 features.

Required triage variants:

- scroll-triggered animation sampled/admitted phase;
- element-scoped/nested View Transitions and `::view-transition` representation;
- `::backdrop` and `::scroll-marker` generated/top-layer state;
- scoped custom-element registries across Shadow/composed scopes;
- `text-fit` typography/layout identity;
- print-specific `page-margin-safety` interaction with WebClip pagination/margins;
- Chrome 153 single-axis scroll/sticky behavior stays a beta watch until stable or otherwise materially relevant.

These map initially to existing families rather than creating a new P-owner: C05/C07/C14/C18/C20/C25/C29/C31/C32/C33/C35 and supporting generation owners.

### A2 — Current form/control rendered state + privacy

Peer evidence reinforces C13/C27/C39. Research must distinguish:

- source DOM attributes versus renderer/current values;
- user-entered values that the faithful contract promises to retain;
- sensitive-state minimization/provenance and external-transfer authority;
- physical PDF truth, not source-only success.

### A3 — Preview/admission → persisted artifact coherence

Recurring peer reports reinforce B2→B8 and C02/C03/C40/C43/C45. Success must be proved at the actual saved/downloaded object boundary, not at preview or `printToPDF` return alone.

### A4 — Resource/CSS dependency identity

SingleFile CSS `@import` failure and recurring image omissions reinforce C06/C07/C08/C09/C10/C14/C21/C36. Resource provenance transforms need both physical rendering and offline/later-reading checks.

### A5 — Bounded work / failure / rollback

Peer hangs plus Browsertrix's explicit timeouts reinforce C37/C38 and existing WebClip budget owners. New campaign should re-check shared budgets for newly added modern-renderer variants rather than treating each feature's work as free.

### A6 — External settlement remains L5

Native download, permission UI and real Yandex identity remain external evidence boundaries. External research does not justify converting historical managed evidence to current L5 PASS.

## 7. Product Opportunity Map

This map is discovery evidence only; none of these entries changes current product requirements.

| ID | User need / peer pattern | WebClip hypothesis | Value / trade-off | Status |
|---|---|---|---|---|
| O1 | Different representations serve fidelity, readability, evidence and replay differently | offer future explicit format/mode choices built on capture-first provenance rather than changing faithful PDF semantics | broad value; high architecture/UX scope | `PROPOSE-FOR-DECISION` only after current closure priorities |
| O2 | Browsertrix QA compares replay against what capture encountered | add a WebClip artifact self-check/differential receipt that verifies selected high-value invariants between admitted representation and physical/later-read artifact | strong trust value; implementation complexity moderate/high | `CANDIDATE` |
| O3 | WACZ supports signing/verification; SingleFile exposes proof-of-existence options | optional cryptographic artifact/provenance verification for research/evidence workflows | useful for provenance; must avoid complexity/privacy surprises | `NEEDS-RESEARCH` |
| O4 | Bulk/auto/scheduled capture remains a recurring adjacent need | separate bulk/scheduled operation mode with strict generation/destination/budget fencing | useful but could overload primary workflow | `OBSERVED` |
| O5 | Local-first clippers are valued for privacy/data ownership | make local-only versus external-destination authority especially explicit in UX/receipts | aligns strongly with mission; mostly UX/authority clarity | `CANDIDATE` |
| O6 | Reader/main-content modes are common but intentionally different from faithful copy | future Reader/simplified output as an explicit mode sharing source provenance | useful for later reading; must never silently replace faithful PDF | `OBSERVED` / separate product decision |

## 8. What external research does **not** change

The refresh does not make Browsertrix-style autoclick/autoscroll a WebClip requirement. It does not make Reader cleanup part of faithful PDF. It does not prove every peer bug applies to WebClip. It does not allocate a P-code for a peer issue. It does not imply a market-share/prevalence estimate from issue counts or Reddit votes.

The authoritative current PDF semantics remain `WEBCLIP_PDF_FIDELITY_CONTRACT.md` until an explicit product decision changes them.

## 9. Freshness and next research trigger

This baseline is dated **2026-08-31** and is current for the new research cycle.

While the cycle is active, perform a dated delta scan no later than approximately **2026-09-07**, or earlier if any of the following occurs:

- Chrome 153 becomes stable and the single-axis scroll-container behavior enters the actual target renderer;
- a material browser/DevTools/print semantic changes;
- a peer product introduces a substantially new capture mode relevant to WebClip;
- a recurring new pain theme appears across independent sources;
- research risk ranking is materially reprioritized;
- the WebClip fidelity/product contract changes.
