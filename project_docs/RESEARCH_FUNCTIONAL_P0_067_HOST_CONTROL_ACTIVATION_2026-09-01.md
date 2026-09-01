# WebClip — functional Closure Sweep — P0-067 host control activation — 2026-09-01

Date: 2026-09-01

Canonical starting point: `main = 13eaf46e0450e22e6061bcf5ff74ff15a5ca14ed` (P0-023/P0-079 tranche merged; post-merge Repository Integrity #201 SUCCESS).

Canonical owner authority: `RESEARCH_REGISTRY.md` → **P0-067 ACTIVE** — PDF preparation must not synthesize real host-page control activation with submit/navigation/destructive side effects.

This tranche re-checks the current disclosure-expansion path in the exact checked-out `content.js`. It allocates no new P-code and does not claim implementation closure.

## 1. Functional question

Can WebClip's own PDF preparation invoke a real host-page control strongly enough to trigger page-owned behavior that the user did not perform, while still proceeding to PDF generation?

The concrete discriminator is a disclosure-looking `<button type="submit">` that has `aria-expanded="false"` and `aria-controls`, opens its panel on click, and also owns a normal form-submit side effect.

## 2. Exact current source path

The accepted harness refuses to run unless current `content.js` still contains the following source chain:

1. `prepareForPrint(meta)` executes `await expandSpoilersInIncludedContent();`;
2. disclosure preparation executes `const clicked = triggerInternalClick(control);`;
3. `triggerInternalClick(control)` executes the **real** `control.click();` while only toggling WebClip's own `state.internalInteraction` guard;
4. `isSafeDisclosureControl(control, panel)` treats a `BUTTON type=submit` as admissible when it has semantic toggle markers such as `aria-controls`/`aria-expanded`;
5. after preparation, the normal download path continues to `WEBCLIP_GENERATE_PDF`.

`state.internalInteraction` suppresses WebClip's own page-click selection handler. It does not suppress the host page's click handler or the browser's default submit activation behavior.

## 3. Browser-level harness

Durable harness: `project_tools/research_host_control_activation.py`.

The harness:

- loads the exact checked-out `content.js` into Chrome for Testing 152 with a minimal MV3 runtime stub;
- starts selection through `WEBCLIP_START_SELECTION`;
- selects the fixture `<main>` through WebClip's own `WEBCLIP_COMMAND / auto-content` path;
- enters WebClip's own `download` UI;
- clicks the WebClip shadow-DOM button `Сформировать PDF`;
- lets the actual `downloadPdf() -> prepareForPrint() -> expandSpoilersInIncludedContent()` path run;
- counts **host-page** click and form-submit side effects separately;
- requires the path to continue to an actual captured `WEBCLIP_GENERATE_PDF` runtime message before accepting the run.

The fixture host page starts with:

- `clicks = 0`;
- `submits = 0`;
- `navigations = 0`;
- disclosure panel hidden;
- submit/toggle button `aria-expanded="false"`.

The host page's own click listener opens the disclosure panel. Its form's own submit listener increments the submit counter and calls `preventDefault()` only so the test page is not navigated away; WebClip does not know about or control either listener.

## 4. Rejected first run

Temporary managed run **33459152472**, job **99705437639**, exact head `919cde725ee9dd9d56a5a865147d953f411ede15`, was **rejected as fixture-timing-invalid**.

It had already passed the harness wait for `window.__host.submits > 0`, so the host side effect occurred, but the harness then checked for the later `WEBCLIP_GENERATE_PDF` message after only a fixed 100 ms. The WebClip shadow-button listener starts async `downloadPdf()` without awaiting its promise, so that acceptance check was too early.

No product conclusion is based on this rejected run.

The harness was corrected to wait independently for:

1. the host submit side effect; and
2. `window.__webclipRuntimeMessages.some(m => m.type === 'WEBCLIP_GENERATE_PDF')`.

## 5. Accepted current-Chrome execution

Accepted managed execution:

- GitHub Actions run: **33459232299**;
- job: **99705678594** (`host-control-activation`);
- exact evidence commit: **`497964ff2c0e670de1cbf93aa9d734fcb97bd25c`**;
- runner: Ubuntu 24.04 hosted runner;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- Playwright: 1.55.0;
- job conclusion: **SUCCESS**.

Exact source identity:

- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`.

Accepted result:

- selected root: `#selected-root`;
- before preparation: `clicks=0`, `submits=0`, `navigations=0`;
- after WebClip preparation: **`clicks=1`, `submits=1`, `navigations=0`**;
- controlled disclosure panel: `aria-expanded="true"`, physically visible;
- captured `WEBCLIP_GENERATE_PDF` messages: **1**;
- verdict: **`RENDERER-COVERED / FINDING`**.

The absence of navigation is a fixture control, not a product safety guarantee: the host form's submit listener intentionally calls `preventDefault()` after recording the submit. The material finding is that WebClip generated a real submit activation at all.

## 6. Verdict and ownership

**P0-067 remains ACTIVE.**

The accepted browser run proves that current PDF preparation can invoke a real host-page submit control solely because it looks like a disclosure toggle, and then continue toward PDF generation. The user did not click that host control.

No new P-code is warranted because this is exactly the canonical P0-067 root. P0-075 remains a broader supporting authority boundary (the page must not become WebClip's trusted control plane), but P0-067 is the primary concrete owner.

This evidence does not prescribe the final implementation. A repair must avoid executing arbitrary host control behavior while still preserving the intended functional requirement to include already-relevant disclosure content. Direct DOM/state materialization, inert cloning, or another isolated representation requires its own Change Impact evidence rather than assuming equivalence.

## 7. Change Impact for a future repair

A production change to this path should revalidate at least:

- C24 — spoilers/disclosures / inert expansion;
- C35 — mutation during preparation/render cut;
- C37 — failure/retry/rollback where preparation aborts;
- C45 — later-reading usefulness of the resulting PDF;
- P0-075 and any representation/materialization owners touched by a new isolated expansion strategy.

Controls should distinguish native `<details>` handling, ARIA accordion state, lazy disclosure content that already belongs to the selected logical content, submit/button/navigation side effects, and page-owned mutation during preparation.

## 8. Project-state consequence

- Cycle-2 research coverage remains `DEEP-RESEARCH-COVERAGE-COMPLETE`;
- functional/critical closure remains incomplete;
- P0-067 remains ACTIVE;
- `RELEASE_READINESS.md` remains `NOT READY`;
- no build, tag or GitHub Release is justified by this research tranche.

**Functional conclusion:** the current disclosure preparation path is not inert; exact WebClip PDF preparation can synthesize a real host-page submit activation through `control.click()`.