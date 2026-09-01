# WebClip — functional Closure Sweep — P0-071 printed-link scheme at render cut — 2026-09-01

Date: 2026-09-01

Canonical starting point: `main = f450858c315460132c2e51ae1b727e9df8644e48` (P0-067 tranche merged; post-merge Repository Integrity #203 SUCCESS).

Canonical owner authority: `RESEARCH_REGISTRY.md` → **P0-071 ACTIVE** — safe URI schemes must be enforced on the actual printed representation, including hostile `beforeprint`/post-sanitization mutation.

This tranche re-checks that exact current owner. It allocates no new P-code and does not claim implementation closure.

## 1. Functional question

Can a selected link be in an ordinary safe HTTPS state when WebClip prepares it, then be mutated by page-owned `beforeprint` into a non-safe URI that is physically embedded into the resulting PDF annotation?

The physical discriminator is the URI stored in the actual PDF link annotation, not only the live DOM attribute.

## 2. Exact current source boundary

Current `content.js` still has this chain:

1. `prepareForPrint(meta)` executes `absolutizeLinksInIncludedContent()` before physical printing;
2. `absolutizeLinksInIncludedContent()` collects selected `a[href], area[href]`;
3. it stores the original authored value in `data-webclip-original-href`;
4. it replaces `href` with the browser-resolved absolute value through `link.setAttribute('href', link.href)`;
5. the function contains no protocol/scheme allowlist and no javascript/data rejection;
6. `beforeprint` is later dispatched by Chromium around the actual print render, after preparation.

Therefore a post-preparation page mutation is outside the only selected-link rewrite pass.

## 3. Physical harness

Durable harness: `project_tools/research_print_link_scheme_render_cut.py`.

The harness is source-bound: it refuses to run if the current `content.js` no longer contains the preparation/absolutization chain above, or if scheme-safety logic appears inside `absolutizeLinksInIncludedContent()`.

For each case it creates the equivalent current prepared-link state:

- authored href `/article?id=42#section`;
- base `https://example.com/`;
- prepared absolute href `https://example.com/article?id=42#section`;
- original authored value retained in `data-webclip-original-href`.

It then lets the browser emit `beforeprint`, prints a real A4 PDF and inspects every PDF link annotation using PyMuPDF.

Cases:

- safe control: no mutation;
- hostile render-cut mutation to `javascript:alert('P0_071_RENDER_CUT')`;
- hostile render-cut mutation to `data:text/html,P0_071_RENDER_CUT`.

## 4. Rejected first run

Temporary managed run **33459920944**, job **99707741172**, exact head `706744242df6d9245c31758f230258a144b8629f`, is rejected as **fixture-invalid**.

The fixture used `page.set_content()` without an explicit base URL, so DOM `target.href` remained relative and the positive-control invariant failed before any product conclusion was evaluated.

The fixture was corrected with `<base href="https://example.com/">`. No product conclusion uses the rejected run.

## 5. Accepted current-Chrome physical result

Accepted managed execution:

- GitHub Actions run: **33460006832**;
- job: **99707991974** (`p0-071-render-cut-link`);
- exact evidence commit: **`c3be5d6590e37f25bed65fd647f3204963a71337`**;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- Playwright: **1.55.0**;
- PyMuPDF: **1.26.4**;
- job conclusion: **SUCCESS**.

Exact source identity:

- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`.

### Safe HTTPS control

Prepared href: `https://example.com/article?id=42#section`.

`beforeprint` href remains the same.

Physical PDF annotation URI: `https://example.com/article?id=42#section`.

PDF SHA-256: `c837f7d2f41062637a8a40326e6a7cce08a0c20e3c604a814ab219f5cc8b568f`.

This proves the fixture and annotation inspection retain an ordinary valid link.

### `javascript:` render-cut mutation

Prepared href is still the same safe HTTPS value.

At `beforeprint`, page-owned code changes it to:

`javascript:alert('P0_071_RENDER_CUT')`.

The physical PDF contains a URI annotation with exactly:

`javascript:alert('P0_071_RENDER_CUT')`.

PDF SHA-256: `3d958e801019302c6a442170684240fd8360c118d38889e673467e8eed3d816c`.

### `data:` render-cut mutation

Prepared href is again the same safe HTTPS value.

At `beforeprint`, page-owned code changes it to:

`data:text/html,P0_071_RENDER_CUT`.

The physical PDF contains a URI annotation with exactly:

`data:text/html,P0_071_RENDER_CUT`.

PDF SHA-256: `15c052f77894d35d20dbef2ad89983746fa5a11d8608fae56e074d4958fe15ef`.

## 6. Verdict and ownership

Verdict: **`ARTIFACT-COVERED / FINDING`**.

**P0-071 remains ACTIVE.**

The current link preparation pass is not render-cut authoritative. A page can present a safe selected link during WebClip preparation and substitute a `javascript:` or `data:` URI during the browser's real `beforeprint`; Chrome 152 then serializes that substituted URI into the physical PDF annotation.

No new P-code is warranted. This is the exact canonical P0-071 root. P0-070/P0-075 are supporting generation/control-plane boundaries, but P0-071 remains the single direct owner for printed URI scheme safety.

## 7. Change Impact for repair

A production repair must enforce allowed URI semantics on the actual isolated/printed representation at or after the final page-controlled mutation boundary, rather than assuming the earlier prepared DOM remains authoritative.

At minimum revalidate:

- C15 links/anchors/internal destinations;
- C35 page mutation during preparation/`beforeprint`/render cut;
- C40 physical PDF bytes/artifact identity;
- C45 later-reading usefulness/safety;
- P0-070/P0-075 if the fix changes generation isolation or page control-plane architecture.

Positive controls should preserve ordinary `https:` and required internal-document destination behavior. Negative controls should cover at least `javascript:`, unsafe `data:`, malformed/empty values and page mutation after any earlier sanitizer pass.

## 8. Project-state consequence

- Cycle-2 research coverage remains `DEEP-RESEARCH-COVERAGE-COMPLETE`;
- functional/critical closure remains incomplete;
- P0-071 remains ACTIVE;
- `RELEASE_READINESS.md` remains `NOT READY`;
- no build, tag or GitHub Release is justified by this research tranche.

**Functional conclusion:** current selected-link preparation can be bypassed by page-owned render-cut mutation, and Chrome 152 physically preserves the substituted unsafe URI in the PDF annotation.
