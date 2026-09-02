# WebClip — fresh full-project research restart — C15 links / anchors / internal destinations — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = 662bed0635d3cd909e4356fdc0b9cce5a2d7ae13`

Fresh source identities:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-proxy-inert-guard.js` Git blob: `1197b4a5cf752c63ff3a3ecb3d1421aa51e59daa`;
- `RESEARCH_REGISTRY.md` remains the current P-owner/status authority.

Fresh restart coordinate:

**C15 — Links / anchors / internal destinations**

Classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`**

No new P-code is allocated. No Registry owner/status transition is made. Runtime, manifest/version, build, tag, Release and release readiness are unchanged by this research tranche.

## 1. Bounded question

C15 asks whether an admitted link remains the correct kind of PDF navigation after WebClip preparation, especially when its destination is document-local and a same-origin child BODY is materialized into a flattened top-document representation.

The focused fresh set covers:

- a native same-document fragment link in the top document;
- the same top-document link after current-shaped `href = link.href` preparation;
- direct printing of a same-origin child document with its own local destination;
- current production-shaped inert BODY flattening, including URL-state copying;
- a causal final-representation control that assigns a collision-safe destination identity and rewrites the corresponding local fragment;
- ordinary external HTTPS, `mailto:`, `tel:` and image-link positive controls.

C15 does not claim exhaustive coverage of every PDF viewer, cross-document named destination, image maps, SVG links, cross-origin frame, download/navigation side effect, malformed URL, scheme policy or privacy surface. Those remain governed by their existing owners and later restart coordinates.

## 2. Fresh current-source inspection

### 2.1 Top-document preparation absolutizes admitted links

Current `absolutizeLinksInIncludedContent()` collects included `a[href], area[href]`, stores the author value in `data-webclip-original-href`, and then writes:

`link.setAttribute('href', link.href)`

Thus a source `href="#dest"` is represented as an absolute same-document URL at preparation time. The fresh physical top-document control below verifies that this alone does not destroy the internal PDF destination while the link and target still share the same document identity.

### 2.2 Flattening changes document identity but preserves child URL provenance

Current same-origin BODY flattening deep-clones the child's BODY nodes into a top-document `<section>`. `copyFrameCloneUrlState(source, target)` then copies an anchor's resolved `source.href` into the corresponding flattened anchor.

For a child source link such as `#frame-dest`, the flattened anchor therefore receives a URL such as:

`http://127.0.0.1:<port>/frame-source#frame-dest`

The anchor now lives in the top document, but its URL still denotes the former child document.

### 2.3 The inert clone guard intentionally strips destination identity

The current inert clone guard drops `id`, `name`, `is`, IDREF relationship attributes, actions and event handlers from the flattened representation. That boundary is security-relevant and must remain inert, but it also means the flattened destination has neither the source `id` nor legacy anchor `name`.

The combined representation therefore has two independent local-navigation losses:

1. the link retains child-document URL provenance after moving into the top document;
2. the target's document-local identity is absent from the final top representation.

This source inspection is a hypothesis only until the physical PDF controls in section 4.

## 3. External standards / comparable capture research

External sources are comparison and hypothesis inputs only. The C15 outcome rests on current WebClip source plus fresh physical Chrome/PDF evidence.

### 3.1 WHATWG fragment resolution is document-identity dependent

The HTML Standard's fragment navigation algorithm first requires the navigated URL without its fragment to equal the document URL without its fragment. It then resolves a target by matching an element `id`, followed by a legacy `<a name>` match.

Reference:

- https://html.spec.whatwg.org/multipage/browsing-the-web.html

That model predicts that moving a child link into another document while retaining the child URL and removing the target `id`/`name` cannot preserve ordinary same-document navigation semantics.

### 3.2 `Page.printToPDF` is the print primitive, not a link-fidelity contract

The Chrome DevTools Protocol exposes `Page.printToPDF`, but its API contract does not promise that a transformed DOM representation will retain author-level internal-link meaning. Physical PDF annotations must therefore be inspected rather than inferred from browser API success.

Reference:

- https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF

### 3.3 SingleFile explicitly protects same-document fragment form

At inspected SingleFile commit `8ce3eb5cabcf79589335ea58d70a20d33562cd97`, its link-resolution path resolves an `href` but converts a same-document absolute result back to fragment form when fragment-identifier URL resolution is disabled. This is useful architectural comparison: a mature page-saving pipeline treats same-document fragments as semantic state rather than blindly retaining an absolute URL after representation changes.

Reference:

- https://github.com/gildas-lormeau/SingleFile/blob/8ce3eb5cabcf79589335ea58d70a20d33562cd97/lib/single-file.js

### 3.4 Chromium PDF anchor behavior is version-sensitive

Public Puppeteer/Chromium issue history includes both missing internal anchors and incorrect internal destinations after browser upgrades. Those reports are not proof of the WebClip failure, but they justify fresh browser-version-specific physical evidence and a causal control.

References:

- https://github.com/puppeteer/puppeteer/issues/8778
- https://github.com/puppeteer/puppeteer/issues/12869
- https://issues.chromium.org/issues/351431841
- https://issues.chromium.org/issues/347674894

## 4. Fresh Chrome physical-PDF evidence

Accepted environment:

- GitHub-hosted `ubuntu-24.04` runner;
- Google Chrome `151.0.7922.173`;
- Chrome headless `--print-to-pdf`;
- PyMuPDF `1.26.6` text and link-annotation inspection;
- self-contained local HTTP fixtures;
- exact evidence head `7af2162d11f40691e1dc50cd3ccdf51e2ada5887`;
- workflow run `33590686024`, job `100123891066`, conclusion `SUCCESS`;
- accepted result JSON SHA-256 `e627cd337e0591293f00661c7a58bf7e5af7589cb6debfbaabcc49c2dfc523f0`.

Durable reproduction harness:

`project_tools/research_c15_links_anchors.py`

PyMuPDF reports the working internal Chrome 151 annotations as link kind `4` with `target_page = 1`, `uri = null`. The acceptance invariant is therefore an internal PDF page destination, not one library enum name.

| Case | PDF bytes | PDF SHA-256 | Internal destination | Relevant URI result |
|---|---:|---|---:|---|
| top direct fragment | 18,285 | `7f32aea25d7e0ac01874181a397053af8a260e90b9eb66b675091924f54393fa` | 1 | external / mail / tel remain URIs |
| top prepared/absolutized fragment | 18,496 | `5210a46f52de8ec0b300b52f31ab0ef03205c540c4ff52f058a9f6c688718e07` | 1 | external / mail / tel / image remain URIs |
| child document printed directly | 17,661 | `17581bf586f381b38f4189254e37a3e267ebd4f6209e948d82c61a87e491c41a` | 1 | child external link remains a URI |
| production-shaped flattened child | 21,771 | `c88407d7b980fac0d1d5b13d088e6d7cdaf3eb0fec3c8c51380bffa7f8b203bd` | 0 | former local link becomes child-document URI |
| causal namespaced final representation | 22,266 | `9603b5ae3fb832c3e609af14e0d364408eb3f702ebf6d7e26e049cfb32855538` | 1 | external and image URIs remain intact |

### 4.1 Positive/native controls preserve internal navigation

The direct top document, the top document after current-shaped link absolutization, and the direct child document each produce a PDF annotation targeting page 1 with no URI.

This rules out three broader hypotheses for the focused fixture:

- Chrome 151 is not generally unable to emit internal PDF destinations;
- current-shaped absolutization alone does not break a same-document top link;
- the child source fragment and destination are valid before flattening.

### 4.2 Production-shaped flattening loses the internal destination

The flattened PDF still contains visible `FRAME_DESTINATION_TOKEN`, so this is not loss of target content. Its diagnostic text records:

- `SOURCE_ABSOLUTE=http://127.0.0.1:<port>/frame-source#frame-dest`;
- `PROXY_HREF=http://127.0.0.1:<port>/frame-source#frame-dest`;
- `PROXY_DEST_ID=[EMPTY]`.

The former internal link has `internal_destination_count = 0` and instead appears as a URI to the child source URL with fragment. External HTTPS and wrapped-image URI annotations remain present. The failure is therefore narrowly tied to local destination semantics in the flattened representation, not to general anchor survival.

### 4.3 Causal final-representation repair restores the internal destination

The test-only causal control assigns a collision-safe top-document identity:

`id="webclip-c15-frame-dest"`

and rewrites the corresponding flattened link to:

`href="#webclip-c15-frame-dest"`

No child script, navigation authority or interactive frame is restored. The resulting PDF again contains one internal destination targeting page 1, while external and image links remain ordinary URIs.

This proves that a bounded static document-local identity/provenance mapping is sufficient for the focused failure. It does not prescribe the eventual production implementation or identifier format.

### 4.4 Probe corrections are retained as research provenance

Two intermediate workflow results were not accepted as the final L4 run:

- run `33590278007` stopped before the matrix because the temporary browser-identity shell expression was syntactically invalid; Chrome was present at `/usr/bin/google-chrome-stable`;
- run `33590548900` completed all PDFs and emitted result SHA-256 `435e41b050e7ab696d117f591228c2dcc1352992d003ce980c880015da7c94e5`, but the harness incorrectly required the PyMuPDF `LINK_GOTO` enum even though Chrome emitted valid kind-4 annotations with concrete target pages.

The accepted harness prints observations and their hash before validation and checks the semantic internal-page invariant.

## 5. Duplicate / root-cause reconciliation

Fresh registry and historical evidence reconciliation maps the focused failure to existing **P1-187 ACTIVE**: the flattened same-origin representation must preserve required rendered state and document-local provenance under explicit budgets.

No new C15-specific owner is needed. The evidence neither closes P1-187 nor expands its status; it adds a fresh link/destination fidelity discriminator to that existing root.

Any future repair must preserve the established inert security boundary: it may materialize bounded static identity and local link mapping, but it must not restore page-script execution, form submission, target browsing-context authority or other active behavior.

## 6. Architectural implications

The prospective production architecture should treat local anchors as a pair, not as independent strings:

1. classify whether the source URL is local to the source document;
2. allocate collision-safe identity in the final document namespace;
3. materialize only destinations that are required by admitted links/content;
4. rewrite the corresponding admitted local links to the final namespace;
5. keep external URLs and allowed schemes unchanged;
6. preserve rollback metadata and current inert/action-stripping boundaries;
7. apply explicit node, attribute and byte budgets.

This is an architectural direction under P1-187, not runtime authorization in this tranche.

## 7. Verdict and next checkpoint

C15 advances from `NOT-TRIAGED / UNKNOWN` to:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`**

The next sequential restart coordinate is **C16 — Same-origin iframe**. Its matrix entry remains `PARTIAL / L4 POSITIVE CONTROLS`; the next tranche must inspect that current partial coverage and decide the bounded remaining question before advancing it.

This research-only tranche changes no runtime behavior, P-code status, manifest version or release readiness.
