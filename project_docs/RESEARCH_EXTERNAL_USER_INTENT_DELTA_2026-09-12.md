# WebClip — external user-intent delta refresh — 2026-09-12

Date: 2026-09-12

Prior substantive baseline: `RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md`.

Policy: `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` sets an active-research target age of about seven days. The 2026-08-31 baseline is therefore stale for a 2026-09-12 project-wide reconciliation and must be refreshed before a new coverage-complete claim.

This document is a bounded delta refresh, not a replacement for the full 2026-08-31 User Intent Map U1…U14. It asks whether current external evidence materially changes those user intents, priorities or research families.

## 1. Result

**No new material user-intent family is required.** The existing U1…U14 map remains semantically adequate for the current product mission.

Material change since the prior baseline:

- Chrome 153 entered Stable on 2026-09-08 and Chrome began a **two-week Stable release cycle**; Chrome 154 Stable is scheduled for 2026-09-22. This materially increases browser/platform freshness pressure and converts the prior "Chrome 153 beta watch" into an ongoing per-milestone change-impact watch.

Important non-change:

- Chrome 153 release notes currently list `single-axis scroll containers` as **available in non-stable channels**, despite Chrome 153 itself being Stable. Therefore this feature is not promoted into a stable WebClip acceptance assumption by this refresh. Its status remains a platform watch/recheck item.

Peer/store/community evidence continues to reinforce existing intents around faithful complete capture, explicit format tradeoffs, preview→persisted truth, offline durability, capture QA, resource completeness and bounded processing. It does not create a new WebClip requirement or P-code automatically.

## 2. Source classes refreshed

The policy asks for multiple independent source classes. This delta reviewed the following.

### 2.1 Browser/platform official sources

Chrome for Developers, 2026-09-08:

- https://developer.chrome.com/blog/chrome-two-week-start
- https://developer.chrome.com/release-notes/153

Observed delta:

- Chrome 153 launched on Desktop/Android/iOS;
- Stable feature delivery moves from four weeks to two weeks;
- Chrome 154 Stable is scheduled for 2026-09-22;
- release-notes status must still be checked per feature rather than inferred from milestone number.

User-intent impact: none new. Research-process impact: **material**. Renderer/platform-dependent cells need a tighter freshness watch because the stable milestone cadence has doubled.

### 2.2 Peer product store/current shipping state

SingleFile Chrome Web Store current result:

- https://chromewebstore.google.com/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle
- observed version `1.24.3`, updated 2026-09-11 in the current English store result;
- store promise remains a complete page in a single HTML file including CSS/images/fonts/frames, with current-page/selection/frame/link capture and destination options.

Obsidian Web Clipper Chrome Web Store current result:

- https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf
- observed version `1.7.1`, updated 2026-07-22;
- store promise remains private/durable offline capture to open Markdown-oriented storage, with highlights/templates/interpretation.

User-intent impact: reinforces existing durable/offline, selected-scope and format-choice intents; no new family.

### 2.3 Peer product documentation / known limitations

SingleFile FAQ:

- https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md

Current FAQ still documents explicit tradeoffs relevant to WebClip: scripts are removed by default because offline dynamic behavior cannot be guaranteed; dynamic maps/carousels/folding elements may therefore not work, while alternative options trade fidelity/security/performance. It also documents cross-origin image/referer and deferred-resource behavior.

Interpretation: supports WebClip's explicit static representation contract and truthful degradation rather than pretending a saved page remains a live application. No new P-owner.

### 2.4 Public peer issue signal

Obsidian Web Clipper public repository remains active through 2026-09-04:

- https://github.com/obsidianmd/obsidian-clipper

Recent issue #947 (opened 2026-08-30) reports interpreter output retaining JSON escape sequences when a local model returns pretty-printed JSON:

- https://github.com/obsidianmd/obsidian-clipper/issues/947

This is a conversion/serialization truth signal, but it does not materially change WebClip's PDF-first current coverage denominator. It fits existing transformation/provenance truth themes.

A targeted Sep-2026 search did not surface a newer material peer issue that requires a new WebClip user-intent family. Absence of a surfaced result is not treated as proof that no issue exists.

### 2.5 Community signal

Targeted recent Reddit searches did not surface a new Sep-2026 material thread in the requested window. Older recurring reports still show the known user pain that a clipper preview can look correct while the persisted note is blank/incomplete, or that article text saves while images/graphs do not.

Representative older thread retained only as continuity evidence:

- https://www.reddit.com/r/ObsidianMD/comments/1t5oaqs/web_clipper_just_adds_blank_page_how_to_solve_it/

Interpretation: reinforces the existing preview→persisted coherence and artifact completeness priorities; it is not a fresh standalone requirement.

### 2.6 Archiving / replay QA systems

Browsertrix current QA documentation:

- https://docs.browsertrix.com/user-guide/qa-review/
- https://crawler.docs.browsertrix.com/user-guide/qa/

Current QA compares crawl-time data to replay across screenshot, extracted text and resource dimensions. Resource differences are interpreted alongside status codes rather than as a single simplistic success bit.

Interpretation: continues to support WebClip opportunity O2-style artifact differential/self-check and multi-dimensional quality receipts. This is a product/research opportunity signal, not a current WebClip requirement.

### 2.7 Independent comparison signal

Independent 2026 comparisons rechecked:

- https://ldas.jp/en/posts/yahoo-news-web-archive-comparison/ — compares SingleFile, Playwright PDF, ArchiveBox, WARC and media capture as different preservation choices;
- https://kiroku.today/en/guides/how-to-archive-website-free — updated 2026-09-08, explicitly separates evidence features, screenshots, HTML preservation, hash verification and bulk archiving;
- https://kiroku.today/en/guides/chrome-extensions-to-archive-webpages — updated 2026-09-08, emphasizes that full-page screenshot, self-contained HTML and public archive URL are distinct design philosophies.

These are secondary sources and are not treated as authoritative product contracts. They reinforce the existing baseline conclusion that one format cannot silently stand in for every archival/user-intent mode.

## 3. User Intent Map delta

The 2026-08-31 U1…U14 map remains retained. Delta classification:

- **U1–U5 capture/scope/fidelity:** reinforced; no semantic expansion;
- **U6–U8 durable artifact/offline/later reading:** reinforced by SingleFile/Obsidian/current archive comparisons;
- **U9–U11 destinations/settlement/provenance:** reinforced; no new destination category required;
- **U12 privacy/minimization:** reinforced by peer format/destination tradeoffs; no new requirement;
- **U13 bounded/understandable processing:** reinforced by SingleFile option tradeoffs and Browsertrix QA cost caveats;
- **U14 truthful degradation/recovery:** reinforced by peer limitations and replay QA; no new family.

No new U-number is created.

## 4. Priority delta

The prior A1 browser/platform delta priority changes shape:

**Before:** watch Chrome 153 beta/current renderer semantics.

**Now:** Chrome 153 is Stable, and Stable milestones arrive every two weeks. Maintain a rolling Chrome milestone delta check with exact feature-status verification; do not infer feature stability from the milestone headline alone.

Other existing priorities remain materially valid:

- preview/admitted/persisted coherence;
- complete resources/CSS/renderer state within the declared static contract;
- bounded work and truthful incomplete/degraded outcomes;
- exact destination settlement and provenance;
- current external/native L5 proof where the boundary cannot be simulated.

## 5. Product-opportunity delta

No new product opportunity is strong enough to allocate a new project requirement.

Current sources continue to support existing opportunities:

- multi-dimensional artifact self-check/differential receipts (Browsertrix QA pattern);
- cryptographic artifact identity/provenance (current peer/evidence comparisons and SingleFile proof-of-existence positioning);
- explicit representation-mode clarity rather than claiming HTML/PDF/screenshot/WARC equivalence.

These remain opportunities until the user/product contract explicitly adopts them.

## 6. Research/change-impact consequence

The refreshed external baseline is current as of 2026-09-12.

The new Chrome two-week cadence does **not** by itself stale every existing L4 result. Change Impact remains semantic: affected cells reopen when a relevant runtime/contract/browser feature change can invalidate their claim. However, the maximum age of platform-delta review should remain tight during active work, and Chrome 154 needs a fresh status check around its scheduled Stable date if research continues across that boundary.

No current source found in this delta requires a new WebClip coverage family, a new P-code or a change to `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.
