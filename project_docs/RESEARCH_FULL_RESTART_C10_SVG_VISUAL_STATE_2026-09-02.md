# WebClip — fresh full-restart C10 — SVG visual state/resources

Date: 2026-09-02

Canonical source baseline: `be223420aa8b060526e1699c477e89f9f37bb0d0`.

Current `content.js` is unchanged by C09 runtime-wise; its content identity remains the exact current main source inspected for this tranche.

Research outcome: **`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-003, P1-187)`**.

No runtime source, `RESEARCH_REGISTRY.md`, P-owner status, manifest version, build, tag or GitHub Release is changed by this tranche.

## 1. Scope

C10 asks whether SVG that is visibly part of admitted selected content remains faithful through current WebClip resource convergence, same-origin secondary representation and physical PDF rendering.

Relevant SVG classes include:

- ordinary inline shapes and paint/reference state;
- `clipPath` and local fragment references;
- `<foreignObject>`;
- SVG `<image href>` external resources;
- frame-local CSS presentation state such as `fill`, `stroke`, `stroke-width`, `filter`, `mask`, `clip-path` and related paint properties;
- owner-document/base-URL changes introduced by same-origin BODY flattening;
- local fragment identity such as `<use href="#symbol">`.

This tranche intentionally does not absorb C15 link-annotation semantics, C18 Shadow DOM, C33 animation, or C36 changed-resource-byte generation into C10 merely because SVG can contain those mechanisms.

Evidence requirement is L1 current-source inspection plus L3 managed Chromium and L4 physical PDF controls.

## 2. Fresh source inspection

Exact current source shows three relevant boundaries.

### 2.1 SVG external visual resources are not explicit DOM image tasks

`prefetchIncludedResources()` scans bounded included elements. Its explicit DOM image branch is:

- `tag === 'IMG'`;
- candidate from `currentSrc` / `src` / first `srcset` URL;
- `waitForDomImage()`.

It also scans computed `background-image` and font specs.

There is no corresponding explicit task for SVG `<image href>`, external SVG `<use href>`, SVG paint-server URL dependencies, or other SVG-specific external visual-resource edges.

This source observation is not enough to declare a defect; the delayed physical control below establishes whether `Page.printToPDF` itself closes the missing readiness boundary.

### 2.2 Flattened computed-style whitelist is HTML-oriented

`FLATTENED_FRAME_STYLE_PROPERTIES` copies layout/text/background/table properties but does not include SVG presentation properties such as:

- `fill`;
- `stroke` / `stroke-width`;
- `clip-path`;
- `mask`;
- `filter`;
- other SVG paint/vector state.

Therefore SVG whose admitted appearance depends on a frame-local stylesheet may lose that rendered state when its subtree is cloned into the top document.

### 2.3 SVG URL-bearing elements are not normalized during owner-document change

`copyFrameCloneUrlState(source, target)` has explicit URL/state handling for HTML `<a>`, `<img>`, media/source and video poster. It has no branch for SVG `<image>` or `<use>`.

A relative SVG `href` therefore remains a relative attribute even though flattening changes the node's owning document and base URL. This creates a direct hypothesis that the same literal `href` can resolve to different bytes after flattening.

## 3. External research input

External sources are hypotheses/comparisons only. Final classification below is based on fresh WebClip source plus fresh physical evidence.

### 3.1 Standards / SVG semantics

Current W3C SVG Working Group material (`w3c/svgwg`, current repository) distinguishes typed SVG references. The SVG linking specification states, among other reference classes, that the `<image>` element references a document processable as an image; SVG also uses document-local fragment/resource references for paint servers and structural reuse.

Sources:

- https://github.com/w3c/svgwg
- https://w3c.github.io/svgwg/svg2-draft/linking.html
- https://w3c.github.io/svgwg/svg2-draft/embedded.html

The relevant design implication is not “copy all attributes blindly”: reference meaning depends on owning document/base/fragment namespace.

### 3.2 SingleFile — analogous clipping/archive implementation and real SVG failures

SingleFile is a relevant comparable browser-extension archive implementation because it serializes a rendered page and its resources into a portable representation.

Fresh issue search shows recurring SVG-specific fidelity problems rather than treating SVG as equivalent to an ordinary raster IMG:

- issue #331, `Remove unused images in SVG sprite definitions`: saved content lost visible SVG sprite icons even though definitions were present in source;
- issue #439, `CSS selectors including (a fragment of) a resource URL are broken`: an SVG emoticon rendered at 20×20 on the source page was saved at its 704×704 intrinsic size, illustrating loss of used/rendered sizing context.

Sources:

- https://github.com/gildas-lormeau/SingleFile/issues/331
- https://github.com/gildas-lormeau/SingleFile/issues/439

These are not WebClip requirements. They are useful evidence that SVG fidelity requires preserving reference graphs and used/rendered state rather than only retaining SVG markup.

### 3.3 Browsertrix / Webrecorder — resource provenance approach

Browsertrix Crawler issue #457 proposed a page-info resource record containing every resource loaded by a page and its status code; its example explicitly includes an SVG asset. This is an external architecture pattern where resource truth is derived from actual page-resource activity rather than only a hard-coded tag list.

Source:

- https://github.com/webrecorder/browsertrix-crawler/issues/457

For WebClip this is only a hypothesis for stronger diagnostics/provenance: the current bounded PDF preparation contract may still choose a narrower graph, but any omitted SVG dependency must be truthful rather than silently assumed ready.

### 3.4 GitLab analogue — browser-rendered archive plus required assets

SOSSE on GitLab uses Chromium/Firefox browser-based crawling for dynamic pages and advertises offline archiving that adjusts links and downloads required assets. This supports an architectural comparison between preserving a browser-rendered state and explicitly accounting for the resource set needed to reproduce it.

Source:

- https://gitlab.com/biolds1/sosse

Again, this does not require WebClip to become an HTML/WARC archiver; it only reinforces that PDF fidelity and resource readiness are separate concerns.

### 3.5 User/community experience

Recent and older DataHoarder discussions repeatedly distinguish convenience/size from fidelity. Users describe SingleFile as useful for page snapshots, while also reporting that more aggressive single-file compression can break pages and that format choice (single HTML, WARC, PDF, screenshot) carries different fidelity/readability trade-offs.

Representative discussions:

- https://www.reddit.com/r/DataHoarder/comments/rf3tca/
- https://www.reddit.com/r/datacurator/comments/198e07k/
- https://www.reddit.com/r/DataHoarder/comments/1pdenra/

For WebClip, this supports keeping its existing explicit faithful-static-PDF contract rather than silently changing SVG art/resources to optimize size.

## 4. Local-first L3/L4 physical evidence

The current tool environment had local Chromium, Playwright and PyMuPDF, so C10 research did not consume a dedicated GitHub Actions research runner.

Browser:

- Chromium `144.0.7559.96`;
- headless managed Chromium;
- forced screen media through CDP;
- `Page.printToPDF`;
- physical PDF raster inspection with PyMuPDF.

Local exploratory probe SHA-256:

- `e923c81df0b85abe3e5a3c3af8bf32c8359704ae9b7f68b39763c932ec461906`.

Machine result SHA-256:

- `954174e6967abbc0df69650f35df9a35f69796e047249289f6123ba56fa24099`.

The durable project reproduction harness is `project_tools/research_c10_svg_visual_state.py`. Generated PDFs are intentionally not committed.

## 5. Physical cases

### 5.1 Inline SVG + `clipPath` — positive control

A top-document inline SVG contains a red rectangle clipped by a local circle `clipPath`.

Physical PDF:

- red pixels: `11251`;
- blue/black diagnostic pixels: `0`;
- PDF SHA-256: `6094f7cb682ffa0ff097e568b855bef38190b548283e875685858bec73442d1f`.

Current Chromium therefore physically renders ordinary inline SVG/local clip references; later failures cannot be classified as a blanket “PDF does not support SVG”.

### 5.2 `<foreignObject>` — positive control

Inline SVG contains a red XHTML `<foreignObject>` with visible text `SVG-FO`.

Physical PDF:

- red pixels: `30022`;
- extracted text contains `SVG-FO`;
- PDF SHA-256: `1e5859ae2cdf3c830fa2cb95e72ce73e0e1b70f70e7ef02eeaaa3f5dfd3719f4`.

This bounds C10 further: basic SVG/HTML integration is physically printable in current Chromium.

### 5.3 Delayed SVG `<image href>` — FINDING / P1-003

A selected top-document SVG receives `<image href="/slow-red.svg">`; the fixture delays the SVG image response by 2.5 seconds. This dependency is not an HTML `IMG` and therefore is not represented by the current explicit DOM-image prefetch branch.

Immediate physical cut:

- `Page.printToPDF` returned in about `9.235 ms`;
- red pixels: `0`;
- PDF SHA-256: `4918f763fee40a579f46180d17aad1bb545e08c5d749bffc00157017d2624c86`.

After the same SVG resource settles:

- red pixels: `30374`;
- PDF SHA-256: `29c64a25f9181ba7077591361f232e30d55f5fb7ed58d80f6b7e3e7af33a3476`.

Causal conclusion: `Page.printToPDF` completion is not a final SVG-resource readiness barrier. The current resource graph can therefore report/act as converged while a selected SVG visual dependency is still absent from the actual physical artifact.

This is a fresh C10 revalidation of **P1-003 ACTIVE**, not a new SVG-specific P-code.

### 5.4 Frame-local CSS SVG presentation -> flattened proxy — FINDING / P1-187

Source child stylesheet:

- `fill = rgb(255, 0, 0)`;
- `stroke = rgb(0, 0, 255)`;
- `stroke-width = 12px`.

After product-shaped same-origin BODY clone plus the current computed-style allowlist:

- `fill = rgb(0, 0, 0)`;
- `stroke = none`;
- `stroke-width = 1px`.

Physical proxy PDF:

- red pixels: `0`;
- blue pixels: `0`;
- black pixels: `24871`;
- PDF SHA-256: `2709afe5c7db1d32c6fa3c6c9cb1d07195ee0b20f0ebfb781d6ff32dc9fe3014`.

The failure is representation loss before print; Chromium faithfully prints the wrong proxy state. It is directly owned by **P1-187 ACTIVE**.

### 5.5 Relative SVG `<image href>` base rebinding — FINDING / P1-187

Source child context has base:

- `http://127.0.0.1:<fixture>/nested/`;
- literal SVG attribute remains `href="asset.svg"`;
- it resolves to `/nested/asset.svg`, a red asset.

Source physical PDF:

- red pixels: `30374`;
- blue pixels: `0`;
- PDF SHA-256: `e21401b89fe1745b190debd308d978851878a59b216963ac8322bdd6d7f16702`.

The BODY is then cloned into a parent whose base is the fixture root. Because current clone URL normalization has no SVG `<image>` branch, the literal attribute remains `asset.svg` but its new `baseURI` becomes the top-document root.

Flattened physical PDF:

- red pixels: `0`;
- blue pixels: `30374`;
- PDF SHA-256: `1c7ea5a66eb06e572640110978b6abb0a420617437d023b8cc0519f702582dbd`.

This is a particularly strong representation identity discriminator: the markup string is unchanged, but moving it to another owner document changes the referenced bytes and therefore the saved visual result.

This is **P1-187 ACTIVE** under the existing frame-rendered-state/materialization owner.

### 5.6 Self-contained local `<use href="#sym">` clone — positive/causal boundary

A self-contained SVG contains its own `<symbol id="sym">` and `<use href="#sym">` in the same cloned subtree.

After plain subtree clone into the parent:

- physical red pixels: `30374`;
- blue pixels: `0`;
- PDF SHA-256: `871bf8a75b5bc8fe5b347a52797a98a512c954bae33e69e736c5d055172c1e00`.

So ordinary clone does not automatically destroy every SVG fragment reference. The failures require a missing stylesheet/environment/reference dependency or namespace collision/rebinding.

### Rejected fixture

An exploratory delayed external `<use href="external.svg#symbol">` case was not promoted because the `setContent` fixture had an opaque owner origin and therefore did not establish a valid same-origin external-use positive control. C10 does not use that result for owner/status conclusions.

## 6. Duplicate / root-cause reconciliation

Current `RESEARCH_REGISTRY.md` is the only owner/status authority.

Relevant current owners:

- **P1-003 ACTIVE** — actual selected visual resource graph and truthful bounded readiness; `Page.printToPDF` is not readiness proof;
- **P1-187 ACTIVE** — flattened iframe proxy must preserve required rendered state under explicit budgets.

Historical evidence was consulted only for duplicate/root-cause reconciliation and fixture design. `RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md` already physically proved:

- independent child SVG fragment namespaces can collide after flattening;
- duplicate gradient IDs can turn a formerly blue region red;
- duplicate local SVG `<use href="#s">` can retarget the second frame to the first symbol;
- coordinated, typed pre-connection ID/reference rewriting can restore the intended physical representation;
- the final current reconciliation keeps **P1-187 ACTIVE** and does not create a separate SVG namespace owner.

Fresh C10 adds current-source/current-Chromium evidence for two adjacent P1-187 manifestations not requiring a new root:

1. frame-local SVG presentation style omitted by the flattened computed-style representation;
2. relative SVG resource href rebased by owner-document change.

Fresh C10 separately adds the delayed SVG `<image>` L4 readiness discriminator to **P1-003 ACTIVE**.

**No new P-code is allocated. No owner status is changed.**

## 7. Architecture implications — weighted options, not implementation mandate

Fresh internal evidence plus external comparison supports these candidate directions for existing owners:

1. **SVG must be treated as a rendered dependency graph, not just retained XML.** Relevant state includes CSS presentation, local fragment/reference identity, owner-document base, external resource readiness and selected physical result.
2. **Final visual-resource convergence should operate on the actual final printable representation.** A hard-coded HTML-IMG/background/font graph cannot truthfully prove SVG `<image>` readiness.
3. **Secondary representation needs typed URL/reference preservation.** HTML `a/img/src` handling does not cover SVG `href`, paint-server URLs, fragment IDREFs or base-sensitive resources.
4. **Do not blindly copy every SVG/CSS property or rewrite every string.** Historical namespace controls show typed reference transforms are necessary; naïve ID-only/string rewriting can break correct references and can exceed bounded budgets.
5. **Preserve explicit degraded/unknown truth for unsupported SVG dependency classes.** Resource diagnostics should not claim full convergence merely because known HTML tasks loaded.
6. **Keep PDF contract separate from HTML/WARC archive designs.** SOSSE/Browsertrix/SingleFile provide useful resource/provenance patterns, but WebClip should adopt only mechanisms that improve its current faithful-static-PDF contract without accidentally becoming a different archive product.

## 8. C10 conclusion

C10 reaches terminal fresh-restart evidence depth:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P1-003, P1-187)`**.

Fresh current-source and physical evidence proves:

- ordinary inline SVG, local `clipPath`, `<foreignObject>` and a self-contained local `<use>` are printable positive controls;
- a delayed selected SVG `<image>` can be absent from an immediate physical PDF because current resource convergence does not explicitly own that dependency and print completion does not wait for it — P1-003;
- same-origin SVG can change physical appearance after flattening because frame-local SVG presentation properties are not preserved — P1-187;
- a relative SVG `<image href>` can resolve to different bytes after owner-document/base change — P1-187;
- historical SVG namespace/fragment collision evidence independently reinforces the same existing P1-187 root.

The next sequential untriaged coordinate is **C11 — Canvas**.