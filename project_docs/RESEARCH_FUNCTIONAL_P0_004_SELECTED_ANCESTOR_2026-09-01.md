# WebClip — functional Closure Sweep — P0-004 selected ordinary ancestor fidelity — 2026-09-01

Date: 2026-09-01

Canonical starting point: `main = fd708979b30ddd5b285b24b02b92eb715bafe750` (`DEEP-RESEARCH-COVERAGE-COMPLETE`; post-merge Repository Integrity #197 SUCCESS).

Owner authority: `RESEARCH_REGISTRY.md` → **P0-004 ACTIVE** — selected PDF fidelity must be complete and selection-bounded. This tranche does not allocate a new P-code and does not claim closure.

## 1. Functional question

When the user includes an ordinary nested DOM subtree, can a **non-selected ordinary ancestor** still alter the saved PDF by:

1. clipping/truncating selected descendants; or
2. contributing its own background/border/shadow presentation even though the ancestor itself was not selected?

This is a direct functional Closure Sweep re-check of P0-004 after Cycle-2 coverage completion.

## 2. Current source path

`content.js::installPrintStylesForSelectionDocuments()` keeps ordinary ancestors of an Include visible through the selected-only rule containing `:has([data-webclip-pdf-include])`.

The same stylesheet normalizes `html, body`, and a separate iframe path normalizes selected iframe/frame-chain ancestors (`applySelectedFramePrintFlow()`), but ordinary DOM ancestors retained only because they contain an Include do **not** receive equivalent selection-bounded normalization for page-owned:

- `height` / `max-height`;
- `overflow` / clipping;
- background / border / box-shadow;
- positioning / transform / contain.

Therefore source inspection predicts that an unselected ordinary ancestor can remain a physical presentation and clipping authority over selected content.

## 3. Physical harness

Durable harness: `project_tools/research_selected_ancestor_presentation.py`.

The harness does **not** hand-copy the product rule. It reads the checked-out `content.js`, extracts the exact `style.textContent` template from `installPrintStylesForSelectionDocuments()`, resolves the product attribute constants, hashes the resulting CSS, then uses that CSS in physical `Page.printToPDF` cases.

Managed execution:

- GitHub Actions run: **33458325172**;
- job: **99702966936** (`p0-004-selected-ancestor`);
- exact evidence commit: **`e750cff053c620eb097fb8e91eb12c85d67a6135`**;
- runner: Ubuntu 24.04 hosted runner;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- Playwright 1.55.0;
- PyMuPDF 1.26.4;
- Pillow 11.3.0;
- job conclusion: **SUCCESS** — meaning the discriminating research fixture validly reproduced the expected current finding.

Checked source/CSS identity from the run:

- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- extracted product selected-print CSS SHA-256: `5207fb85a5de707565ce6ad4aac858b210dd5f163b2acce4a0901f3f306eb7ec`.

## 4. Discriminating cases

### A. Baseline selected content

The selected subtree is directly printable without a hostile ancestor.

Physical PDF:

- pages: **2**;
- top sentinel: present;
- bottom sentinel: present;
- unrelated sibling noise: absent;
- hostile red/blue/magenta paint: **0 / 0 / 0 pixels**;
- selected green paint: **1,110,667 pixels**;
- PDF SHA-256: `cfca892a9afa1c89485ffe0681320871f7b4f1e211b002690de15f8813ed166e`;
- all-page raster SHA-256: `554aa980ba761c667bd0e5d9fb418f1bd43fe63ff3332e72a19bc4290f88a410`.

This is a positive control that the selected content itself is long enough to paginate and that selected-only filtering removes an unrelated sibling.

### B. Hostile **unselected ordinary ancestor** with exact product CSS

The selected subtree is nested in an unselected shell with red background, blue border, magenta outer paint, fixed height/max-height, `overflow:hidden`, `contain:paint`, padding and positioning.

Physical PDF:

- pages: **1** instead of 2;
- top sentinel: present;
- **bottom sentinel: absent**;
- unrelated sibling noise: absent;
- red ancestor paint: **30,504 pixels**;
- blue ancestor paint: **35,122 pixels**;
- magenta ancestor paint: **11,850 pixels**;
- selected green paint: **59,421 pixels**;
- PDF SHA-256: `393c2c709590122f4aed06c922bff1cd1d0b567d1594662703d8b065482b5c3d`;
- all-page raster SHA-256: `091428a336f23bf31f32c1869a2131448e5db2447868fff1afdf3c249406a982`.

This simultaneously proves both P0-004 manifestations in the tested ordinary-DOM path:

1. **selected content is physically truncated** by a non-selected ancestor;
2. **non-selected ancestor presentation is physically serialized** into the saved artifact.

### C. Test-only ancestor normalization control

For fixture discrimination only, the harness adds a separate test-only rule that neutralizes ordinary Include ancestors (overflow/height/position/contain/transform/clipping plus background/border/shadow). This rule is explicitly **not** product implementation and is not added to `content.js`.

Physical PDF:

- pages: **2**;
- top sentinel: present;
- bottom sentinel: present;
- unrelated sibling noise: absent;
- red/blue/magenta ancestor paint: **0 / 0 / 0 pixels**;
- selected green paint: **1,131,301 pixels**;
- PDF SHA-256: `6980e5078335bcb751452ef69683645f2b9456679d98fd021511e6d30020b52d`;
- all-page raster SHA-256: `9e160539a106985821edf515ffc378b8571c8fa335cd76ef936a15d3d4386fa0`.

This control shows the fixture is causal rather than merely correlational: removing ordinary ancestor presentation/clipping authority restores complete selected output.

## 5. Verdict and ownership

**Verdict: `ARTIFACT-COVERED / FINDING`.**

P0-004 remains **ACTIVE**. No new P-code is warranted because the physical behavior is exactly the already-owned root: selected PDF output remains influenced by an ordinary non-selected ancestor.

This tranche does **not** prove that a generic CSS reset is the correct implementation. A production fix must preserve legitimate selected/composed semantics while preventing non-selected ancestors from acting as clipping/presentation authorities, and then revalidate affected C01/C05/C06/C19/C29/C30/C31/C32/C35/C45 regions under Change Impact.

Supporting cross-cutting owners such as P0-070/P0-075 remain relevant to exact admitted→artifact generation, but this concrete ordinary ancestor failure is owned primarily by **P0-004**.

## 6. Project-state consequence

- Cycle-2 research coverage remains `DEEP-RESEARCH-COVERAGE-COMPLETE`;
- functional/critical closure remains incomplete;
- P0-004 remains ACTIVE;
- `RELEASE_READINESS.md` remains `NOT READY`;
- no build, tag or GitHub Release is justified by this research tranche.

Next functional Closure Sweep work should remain risk-ranked under the canonical Registry rather than allocate duplicate research variants.