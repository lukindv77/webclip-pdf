# WebClip — external user-intent / peer-product baseline — 2026-08-30

Date: 2026-08-30

Purpose: initial durable baseline for `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md`. This document records external evidence used to choose and prioritize WebClip deep-research user operations and surfaces. It does **not** change current P-code status/owner and does not automatically make peer-product behavior a WebClip requirement.

## 1. Research scope and source classes

This baseline used a mixed source set rather than only product marketing:

- official product/developer documentation and demos;
- official/open-source GitHub documentation and known issues;
- recent GitHub issue reports;
- Reddit/community discussions;
- archival tooling documentation describing capture/materialization/QA behavior.

Representative peer/overlap families reviewed:

- faithful/self-contained single-page saving: SingleFile, Save Page WE, Monolith;
- clean/readable/PDF transformation: PrintFriendly;
- web clipping / selection / knowledge-base capture: Obsidian Web Clipper, Evernote Web Clipper;
- research snapshot/provenance: Zotero Connector;
- multi-representation archival: ArchiveBox;
- browser-based archival/replay/materialization: ArchiveWeb.page / Browsertrix Crawler;
- community comparisons and archiving workflows on Reddit/DataHoarder and Obsidian communities.

## 2. Representative sources

Official / developer sources:

- SingleFile GitHub: https://github.com/gildas-lormeau/SingleFile
- SingleFile FAQ: https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md
- SingleFile known issues: https://github.com/gildas-lormeau/SingleFile/blob/master/known-issues.md
- Save Page WE Chrome Web Store: https://chromewebstore.google.com/detail/save-page-we/dhhpefjklgkmgeafimnjhojgjamoafof
- Monolith GitHub: https://github.com/Y2Z/monolith
- PrintFriendly Chrome extension: https://www.printfriendly.com/extensions/chrome
- Obsidian Web Clipper introduction/capture/highlighter/troubleshooting: https://obsidian.md/help/web-clipper , https://obsidian.md/help/web-clipper/capture , https://obsidian.md/help/web-clipper/highlight , https://github.com/obsidianmd/obsidian-clipper/blob/main/docs/Troubleshoot%20Web%20Clipper.md
- Zotero snapshot documentation: https://www.zotero.org/support/attaching_files and https://www.zotero.org/support/quick_start_guide
- ArchiveBox docs: https://docs.archivebox.io/latest/README.html
- ArchiveWeb.page: https://webrecorder.net/archivewebpage/
- Browsertrix Crawler behaviors/docs: https://crawler.docs.browsertrix.com/user-guide/behaviors/ and https://crawler.docs.browsertrix.com/

Recent/community evidence sampled:

- Obsidian community report: incomplete article capture, with manual selection working better but losing images: https://www.reddit.com/r/ObsidianMD/comments/1sm7cvk/web_clipper_does_not_save_full_article/
- Obsidian community report: correct clipper preview but saved result can be blank: https://www.reddit.com/r/ObsidianMD/comments/1t5oaqs/web_clipper_just_adds_blank_page_how_to_solve_it/
- Obsidian GitHub issue: missing images in article capture: https://github.com/obsidianmd/obsidian-clipper/issues/838
- Obsidian GitHub issue: missing article body/text on X/Twitter article: https://github.com/obsidianmd/obsidian-clipper/issues/676
- Obsidian GitHub issue: missing image captions on academic article: https://github.com/obsidianmd/obsidian-clipper/issues/876
- DataHoarder discussion comparing SingleFile and WebScrapBook trade-offs around fidelity/size/archive format: https://www.reddit.com/r/DataHoarder/comments/rf3tca
- DataHoarder workflow request to automatically visit and snapshot every page while retaining SingleFile-like per-page snapshots: https://www.reddit.com/r/DataHoarder/comments/1pdenra/trying_to_archive_websites_page_by_page/

## 3. Cross-product user-intent map

### U1 — Save the complete current page as a durable offline copy

Evidence:

- Save Page WE explicitly describes saving a complete page "as currently displayed" into one HTML file and emphasizes high accuracy.
- SingleFile describes saving a faithful/complete page into one self-contained HTML file.
- Monolith similarly emphasizes embedding page assets for offline rendering.
- Zotero describes snapshots as offline copies reflecting the state of the page when the snapshot was taken.

WebClip relevance: **core**. This directly supports the project mission and strengthens the requirement for admitted-state identity, current rendered state and later-readable durability.

### U2 — Save only the content/frame/elements the user explicitly cares about

Evidence:

- SingleFile offers current tab, selected content and selected frame capture.
- Obsidian Web Clipper uses a current selection when present and its highlighter can select text, images and elements.
- Evernote Web Clipper distinguishes article/full-page/screenshot/custom clipping modes.

WebClip relevance: **core** because Include/Exclude selection is already part of WebClip's mission. External products confirm that user-selected scope is a common primary operation, not a niche edge case.

### U3 — Produce a clean/readable representation instead of an exact page copy

Evidence:

- PrintFriendly intentionally removes ads/navigation/sidebars and supports editing/highlighting before PDF.
- Obsidian exposes Reader and main-content extraction.
- Evernote distinguishes Article and Simplified Article from Full Page.
- ArchiveBox stores both fidelity-oriented captures and Readability-derived article representation.

WebClip relevance: **product-mode distinction**, not an automatic requirement for the current faithful mode. This strongly supports keeping deliberate Reader/cleanup transformation separate from faithful copy semantics.

### U4 — Preserve content beyond the initial viewport

Evidence:

- Evernote's Full Page mode is presented as capturing material not visible on the current screen.
- Browsertrix's default behaviors include autoscroll and autofetch; autoscroll continues while new elements are added until convergence/timeout.
- PrintFriendly advertises full-page screenshots for tall/dynamic pages.

WebClip relevance: **core research surface**. Users often interpret "page" as more than the current viewport. This supports deep research of long pages, nested scroll, lazy loading and bounded materialization semantics.

### U5 — Handle dynamic/lazy/interactive content that requires materialization

Evidence:

- Browsertrix explicitly implements autoscroll, autoplay, autofetch and site-specific behaviors to make dynamically exposed resources/content capturable.
- ArchiveBox combines browser-rendered SingleFile/PDF/screenshot/DOM with WARC/readability/media extractors rather than assuming one capture primitive is complete.
- Recent clipper user reports repeatedly describe incomplete article bodies/images despite otherwise successful capture flows.

WebClip relevance: **high**. This supports treating deferred/virtualized/lazy/reveal semantics as user-visible completeness questions rather than rare implementation details.

### U6 — Preserve resources for offline/later reading

Evidence:

- SingleFile/Monolith explicitly bundle resources into self-contained files.
- Zotero snapshots are intended for offline access.
- Obsidian explicitly documents a different trade-off: clipped image URLs are not automatically downloaded, saving space but losing offline durability if URLs disappear.

WebClip relevance: **core contract decision**. The contrast between products shows that offline resource durability is a deliberate semantic choice and must be explicit in WebClip's mode/receipt rather than accidental.

### U7 — Retain provenance/metadata and make the captured object useful as a research/reference record

Evidence:

- Zotero couples webpage snapshots with bibliographic/URL/access metadata and library organization.
- ArchiveBox keeps snapshot metadata and multiple capture representations.
- Obsidian templates capture page metadata/Schema.org/selected fields into durable notes.

WebClip relevance: **high supporting intent**. Journal/SelectionSnapshot/source provenance should be researched as part of later-use truth, not merely internal metadata plumbing.

### U8 — Preview/edit/annotate/remove content before saving

Evidence:

- PrintFriendly allows deleting sections, editing text/images and highlighting before export.
- SingleFile supports annotate-and-save workflows including highlight/notes/removal.
- Obsidian's highlighter allows intentional element/text/image selection before capture.

WebClip relevance: **high** because explicit Include/Exclude already plays this role. Research must preserve the exact user-approved scope through later preparation and physical artifact generation.

### U9 — Save many pages automatically or repeatedly

Evidence:

- SingleFile supports multiple tabs and auto-save.
- ArchiveBox supports scheduled imports from bookmarks/history/feeds/link-saving services.
- Community archiving workflows ask for automatic traversal while retaining independent page snapshots.

WebClip relevance: **secondary unless/ until product scope expands**, but it is a recurring adjacent intent worth retaining in the external map. It may affect future bulk/save automation, operation fencing and storage design.

### U10 — Use multiple representations because one format does not satisfy every archival/readability need

Evidence:

- ArchiveBox intentionally saves original HTML, SingleFile, screenshot, PDF, WARC, DOM dump and article text.
- SingleFile documents trade-offs among single HTML, self-extracting ZIP, MHTML, Webarchive and HTML+folder.
- PrintFriendly focuses on clean PDF while WARC/WACZ tools focus on replay/archival completeness.

WebClip relevance: **architectural confirmation** for capture-first / renderer-second design and for keeping PDF as a first-class output rather than the canonical definition of the copy.

### U11 — Trust that successful preview/generation means the persisted result contains the same content

Evidence:

- Recent Obsidian community report describes a correct preview but a blank saved result.
- Other recent issues show article text/images/captions missing in the final clip.

WebClip relevance: **core end-to-end invariant**. Preview/admission/capture success cannot be considered sufficient unless the actual persisted artifact and Journal/storage identity match it.

### U12 — Favor local/private capture for sensitive browsing/research

Evidence:

- SingleFile states page processing is performed in the browser and does not upload content to third-party servers by default.
- Obsidian Web Clipper emphasizes local storage/privacy and no usage metrics for clipped content.

WebClip relevance: **supporting defensive-security/user-trust intent**. This reinforces minimization, safe local handling and explicit external-transfer authority but does not expand security work into offensive research.

## 4. Recurring user pain themes observed

The sampled sources are not prevalence statistics, but several themes recur across product classes:

1. **Incomplete capture** — article body, images, captions or content beyond the initially materialized DOM can be missing.
2. **Preview/final-result divergence** — a capture UI can appear correct while the persisted result is blank or incomplete.
3. **Fidelity versus size/performance trade-off** — aggressive optimization/minification or one-file convenience can conflict with fidelity and performance.
4. **Exact copy versus readable transformation ambiguity** — users want both, but products usually expose them as distinct modes.
5. **Dynamic-content convergence** — scrolling, lazy resources, autoplay/media and site-specific behaviors often require bounded active materialization.
6. **Offline durability versus space/network trade-off** — embedding resources improves durability but increases size/work; linking external resources saves space but weakens later availability.
7. **Destination/persistence reliability** — a logically prepared result is not useful if final save/download/vault/storage delivery fails or targets the wrong destination.
8. **Automation/bulk capture** — recurring and multi-page workflows are a real adjacent need even when a single-page faithful copy remains the primary operation.

## 5. Immediate implications for WebClip deep-research operation selection

The external baseline supports treating the following as mandatory high-value user-operation families for the current deep research:

- faithful whole-page current-state save;
- explicit selected-scope save, including frame/composed-tree cases;
- long-page/nested-scroll/offscreen completeness;
- dynamic/lazy/reveal/virtualized materialization under bounded policy;
- exact admitted-state -> physical artifact coherence;
- offline resource completeness and truthful degradation;
- later-reading usability: text, links, navigation, layout and resource availability;
- provenance/Journal/storage identity of the exact saved artifact;
- clear separation between faithful current-state capture and deliberate Reader/cleanup/expanded-static transformations.

The following should remain visible adjacent intents but are not automatically current-mode requirements:

- site crawling / automatic multi-page traversal;
- scheduled capture;
- Reader/simplified transformation;
- replayable interactive/WARC-style archival output;
- user annotations beyond existing Include/Exclude semantics.

They should become current research surfaces only when they intersect an already accepted WebClip behavior/architecture or after an explicit product decision.

## 6. What this baseline does not establish

This baseline does **not** decide the disputed fidelity contract for:

- closed disclosure content;
- nested scroll expansion;
- infinite/virtualized logical content;
- animation/transition phase;
- focus/selection/hover-like state;
- responsive/environment state;
- whether current PDF is a pure current-view mode or a complete-static archival mode.

The external evidence instead shows that peer products make different deliberate choices here. Therefore these cases require an explicit WebClip fidelity-mode decision rather than treating one peer behavior as universal truth.

## 7. Freshness / next refresh

This is the initial baseline dated 2026-08-30. Under `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md`, active deep-research work should perform a delta freshness scan no later than approximately 7 days from this baseline, and earlier if a material peer-product/platform/user-intent change is observed or the research coverage/fidelity contract is substantially reprioritized.
