# Durable audit evidence — cross-origin frame print media / selected-only geometry — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves a **50-block** source-first deep-audit tranche focused on the physical cross-origin iframe representation rendered by Chromium after WebClip has already admitted a save.

Audited fresh source baseline: `main` at `3c08e7f1bca2990acb36497f91afd87bc490be04`.

Managed Chromium: `144.0.7559.96` on Debian 13. Browser probes used local deterministic HTML/iframe fixtures plus CDP `Emulation.setEmulatedMedia` and `Page.printToPDF`. They are engineering evidence, not a substitute for real unpacked-Chrome optional-host-permission QA or Yandex E2E. Enterprise browser policy was not bypassed.

## Executive classification

This tranche establishes one independent current root cause and therefore allocates the next unused permanent code:

- **P1-229 ACTIVE — new concrete owner.** Cross-origin frame selected-only PDF representation needs one WebClip-owned media/geometry contract. Current worker forces CSS media to `screen` before `Page.printToPDF`, while current `frame-agent.js` places its Include/Exclude filtering only under `@media print` and its interactive selection outlines only under `@media screen`. Deterministic Chromium therefore prints selected, excluded **and unrelated unselected** child content and also prints green/red selection outlines. Independently, `frame-agent.preparePrint()` returns full-document `documentHeight` **before** installing the selected-only stylesheet; top content uses that pre-filter height to size the cross-origin iframe. Fixing filtering alone can therefore leave excess blank pages unless geometry is measured from the same effective selected-only representation.
- **P0-004 ACTIVE — supporting fidelity umbrella.** Physical PDF bytes are not selection-bounded when a selected cross-origin frame contributes excluded/unselected child content or is paginated from full-document rather than selected representation geometry.
- **P1-004 ACTIVE — cross-origin feature umbrella.** P1-229 is the concrete print-representation contract beneath the existing cross-origin iframe umbrella. It is intentionally separate from document/session/permission lifecycle owners.
- **P1-003 ACTIVE — resource-readiness refinement.** The child prefetch report scans selected roots, but current physical PDF can render unrelated unselected child content. The actual rendered resource graph can therefore exceed the graph that was prepared/reported.
- **P0-070 ACTIVE — end-to-end provenance refinement.** `meta.selectionSnapshot` can correctly describe Include/Exclude authority while the physical PDF generated from the same operation contains a larger child scope. Selection metadata and immutable PDF bytes need one representation receipt/generation.

This is **not** a duplicate of P1-199, P1-200, P1-171 or P0-075. It reproduces in one clean operation on one unchanged document with honest static DOM, no stale restore, no late selection command, no marker spoof, no synthetic event and no navigation. P0-075's frozen/isolated representation remains the preferred architecture, but the concrete defect here is a deterministic media/geometry incompatibility in WebClip's own current implementation.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this evidence.

## Fresh source boundary

### Worker physical print path

`service-worker.js` uses the same `generatePdfBlob(tabId)` path for local download and Yandex upload. After debugger attach and `Page.enable`, it deliberately calls:

```text
Emulation.setEmulatedMedia({ media: 'screen' })
```

and then calls `Page.printToPDF(..., printBackground:true, preferCSSPageSize:true, transferMode:'ReturnAsStream')`.

The source comment explains the intent: site-owned `@media print` rules must not arbitrarily hide content selected by WebClip.

The Chrome DevTools Protocol contract for `Emulation.setEmulatedMedia` explicitly says it emulates the supplied media type for CSS media queries. `screen` and `print` are distinct CSS media types.

### Top/same-origin representation

`content.js::installPrintStylesForSelectionDocuments()` installs WebClip selected-only CSS **without** wrapping it in `@media print`. Consequently that filtering remains active when worker media is forced to `screen`.

This is an important positive control: the mismatch is specific to the cross-origin frame-agent representation rather than a universal top-document failure.

### Cross-origin child representation

`frame-agent.js` has two opposing media-scoped styles:

1. `ensureStyle()` installs interactive green/red Include/Exclude outlines only under `@media screen`.
2. `preparePrint()` installs selected-only Include/Exclude filtering only under `@media print`.

`preparePrint()` also computes and freezes returned `documentHeight` from `documentElement/body.scrollHeight` **before** adding the selected-only print stylesheet.

Top `content.js` stores that value as `remote.printHeight`, uses it in `markFrameChainsForPrint()`, and later uses it again as the cross-origin fallback in `stabilizeSelectedFramePrintHeights()` because SOP prevents top from measuring the child document directly.

## Managed Chromium probe ledger

| Probe | Current-like condition | Result |
|---|---|---|
| Media baseline | CDP media=`screen`, page has screen-only and print-only text | PDF contains `SCREEN-MEDIA-CONTENT`; print-only text absent |
| Remote current filter | child selected-only filter under `@media print`, worker media=`screen` | `REMOTE-SELECTED`, `REMOTE-EXCLUDED`, `REMOTE-UNSELECTED` all present |
| beforeprint media state | top and child listeners inspect media queries | both see `screen=true`, `print=false` |
| Interactive outline raster | current child `@media screen` outlines + screen emulation | 1664 green-ish and 2268 red-ish pixels in rasterized PDF |
| Native-print control | no screen emulation, current child `@media print` filtering | selected present; excluded/unselected absent |
| Site print conflict | site `@media print` hides selected content, no screen emulation | selected content disappears entirely |
| Screen + unconditional WebClip filter | worker remains screen; WebClip selected-only child filter not media-gated | selected present; excluded/unselected absent |
| Height timing | selected 100px + unselected 5000px child tail | pre-style 5100px; after print-style while screen 5100px; print-media geometry ~720px |
| Top frame height effect | same selected short content; iframe height 120px vs 5200px | 1 page vs 7 pages with unselected tail correctly hidden |

Exact pixel totals and page counts are fixture evidence, not product thresholds. The invariant is qualitative and deterministic: media selection changes which WebClip rules are active, and pre-filter geometry can materially enlarge pagination even when filtering is corrected.

## Blocks 1–20 — worker `screen` media disables the current child selected-only representation

### Block 1 — worker explicitly emulates `screen` for every PDF — P1-229

`generatePdfBlob()` sets the target media to `screen` immediately before `Page.printToPDF`. This is not a browser default accident; it is current WebClip policy.

### Block 2 — CDP media override controls CSS media queries — platform contract

The DevTools Protocol documents `Emulation.setEmulatedMedia` as emulation of the supplied media type for CSS media queries. Therefore an extension stylesheet gated behind `@media print` cannot be assumed active after WebClip explicitly selects `screen`.

### Block 3 — child selected-only filtering exists only under `@media print` — P1-229

`frame-agent.preparePrint()` hides unrelated child nodes and Excludes only inside an `@media print{...}` stylesheet.

### Block 4 — child interactive outlines exist only under `@media screen` — P1-229

`frame-agent.ensureStyle()` draws 3px green/red Include/Exclude outlines inside `@media screen`.

### Block 5 — top/same-origin filtering is unconditional — positive control

Top `content.js` selected-only stylesheet is not media-gated. Forcing `screen` therefore does not inherently disable top/same-origin filtering. This source asymmetry explains why cross-origin representation can diverge from local representation.

### Block 6 — baseline Chromium PDF uses screen media after emulation — browser proof

A deterministic fixture with mutually exclusive screen-only and print-only text was printed after `setEmulatedMedia('screen')`. PDF text contained `SCREEN-MEDIA-CONTENT` and did not contain `PRINT-MEDIA-CONTENT`.

### Block 7 — selected remote content still prints — positive control

With the current-like child stylesheet and screen emulation, `REMOTE-SELECTED` remained in the PDF. The defect is not simply “remote iframe disappears”.

### Block 8 — unrelated unselected remote sibling also prints — P1-229/P0-004

The same PDF contained `REMOTE-UNSELECTED`. Thus the child selected-only rule was ineffective during the physical render.

### Block 9 — explicitly excluded remote child content also prints — P1-229/P0-004

The same PDF contained `REMOTE-EXCLUDED`. Exclude semantics are lost for the same media reason.

### Block 10 — current failure is a scope leak, not a total omission — acceptance boundary

Because selected content remains present while extra child content is added, ordinary smoke checks that only search for the selected text can pass while selection-bounded fidelity is false.

### Block 11 — top `beforeprint` observes screen media — browser proof

A top-frame `beforeprint` listener evaluated media queries during `Page.printToPDF` after screen emulation and observed `screen=true`, `print=false`.

### Block 12 — child `beforeprint` observes the same screen media — browser proof

The iframe listener observed the same values. The emulated media applies to the child rendering context used by the PDF; cross-origin frame-agent cannot rely on a separate print-media island.

### Block 13 — green Include outline is physically rasterized into PDF — P1-229

Rasterized output from the current-like fixture contained **1664 green-ish pixels**, including exact sample `[24,128,56]`, matching the current frame-agent Include outline.

### Block 14 — red Exclude outline is physically rasterized into PDF — P1-229

The same raster contained **2268 red-ish pixels** matching the current Exclude outline. Interactive selection affordances are therefore part of physical output under the current media policy.

### Block 15 — no hostile page behavior is required — duplicate boundary

The leak reproduces with static honest DOM and extension-owned styles only. No host script modifies WebClip markers, no custom element reacts, and no synthetic click occurs.

### Block 16 — native print-media control makes current child filter effective — positive control

Without forcing screen media, the same current-like child `@media print` filter produced only `REMOTE-SELECTED`; excluded and unselected text were absent.

### Block 17 — simply removing screen emulation is not a complete fix — acceptance boundary

The worker's original motivation is valid: ordinary or hostile site `@media print` may hide content that the user explicitly selected. P1-229 must not regress that protection.

### Block 18 — site print CSS can erase the selected child under native print — browser proof

A fixture whose site stylesheet hides the selected node in `@media print` produced an empty selected result when relying on native print media, even though the current WebClip child selected-only filter was installed.

### Block 19 — screen media plus media-independent WebClip filtering works in the control — design proof

Keeping worker media=`screen` while making the WebClip child selected-only rule effective independently of `@media print` produced only the selected child text. This is a viable contract direction, not a claim that one exact CSS patch alone closes all print isolation owners.

### Block 20 — interactive outline style must be explicitly suppressed during physical PDF — P1-229

Any implementation that preserves screen media must ensure the frame-agent's screen-only selection decoration is not rendered into PDF. Selection filtering and selection UI decoration need separate print-generation ownership.

## Blocks 21–32 — remote iframe geometry is frozen before selected-only filtering

### Block 21 — child computes `documentHeight` before installing its filter — P1-229

`preparePrint()` calculates `documentHeight` immediately after resource prefetch and only then creates/appends the selected-only stylesheet.

### Block 22 — that measurement is screen/full-document geometry — P1-229

At this point no child selected-only print style exists, and the ordinary document is still under screen media. The returned height is therefore not a measurement of the physical selected-only representation.

### Block 23 — 5100px fixture proves pre-filter measurement includes unselected tail — browser proof

A child containing roughly 100px selected content followed by a 5000px unselected tail measured about **5100px** before the filter.

### Block 24 — appending the current print-only filter while media remains screen changes nothing — browser proof

After appending the current `@media print` filter under screen emulation, the same child remained about **5100px** high.

### Block 25 — activating print media materially changes selected-only geometry — positive control

Switching the same fixture to print media made the unselected tail disappear and reduced measured document geometry to roughly **720px** in that browser fixture. The exact viewport floor is incidental; the full 5100px receipt was not selected-only geometry.

### Block 26 — top stores this receipt as `remote.printHeight` — P1-229

`prepareRemoteFramesForPrint()` assigns the returned child height directly to the mapped remote record.

### Block 27 — top print-flow normalization consumes the stale/full height — P1-229/P0-004

`markFrameChainsForPrint()` uses `remote.printHeight` when choosing a selected iframe's content height and applies that height to the live iframe shell.

### Block 28 — beforeprint stabilizer cannot remeasure cross-origin child DOM — P1-229

SOP prevents top `content.js` from reading the cross-origin child document. For those frames, `stabilizeSelectedFramePrintHeights()` retains the remote receipt as its authoritative geometry fallback.

### Block 29 — oversized iframe shell creates excess PDF pages even when child filtering is fixed — browser proof

With a media-independent child selected-only filter, the same short selected content printed in **1 page** when the iframe shell was ~120px high and **7 pages** when the shell was forced to ~5200px. Hidden unselected content was absent in both PDFs.

### Block 30 — 200000px cap is a positive safety bound, not correctness — boundary

Both child and top clamp remote heights, limiting runaway magnitude. A bounded wrong height can still create many wrong pages and is not a truthful selected-representation receipt.

### Block 31 — filter-only remediation would leave a pagination bug — P1-229

Making child filtering media-independent without moving/recomputing geometry after that representation becomes effective can convert today's content leak into excess blank pages. Both media and geometry are one closure contract.

### Block 32 — current source compounds both failures — P1-229/P0-004

Today screen media disables the filter **and** top sizes the frame from full-document geometry. The physical PDF can therefore contain both the unrelated content and the space/pages allocated for it.

## Blocks 33–40 — resource reporting, metadata and immutable bytes can disagree with physical scope

### Block 33 — child resource prefetch starts from authoritative selected Maps — positive control

`prefetchSelected()` enumerates images under `state.includes`. It does not intentionally prepare all unrelated child DOM.

### Block 34 — physical PDF can nevertheless render unselected child resources — P1-003

Because the selected-only CSS is inactive under screen media, an unselected subtree may still participate in rendering. Its images/backgrounds/fonts can therefore matter to PDF bytes despite not belonging to the child prefetch input graph.

### Block 35 — resource report can underdescribe the actual rendered graph — P1-003

A successful selected-resource report is not proof that every resource physically printed in the remote iframe was prepared. P1-003 acceptance needs representation parity: the graph being prepared must be the graph being rendered.

### Block 36 — child prepare receipt has no “filter effective” postcondition — P1-229

`preparePrint()` returns `ok`, resource counts and `documentHeight`, but does not prove which media is active or that unrelated/Excluded nodes are currently suppressed in the representation Chromium will render.

### Block 37 — top diagnostics cannot enumerate the actual cross-origin rendered child scope — P1-229/P0-070

Top diagnostics retain selection counts, frame measurements and local element samples, but SOP means they do not enumerate every cross-origin child node that Page.printToPDF actually renders.

### Block 38 — SelectionSnapshot can be semantically correct while PDF bytes are larger — P0-070

An operation may persist a truthful locator set such as Include A / Exclude B while physical child bytes contain A, B and unrelated C. Correct metadata alone does not bind immutable output to the authorized representation.

### Block 39 — local download and Yandex generation share the same defective renderer path — P1-229

Both destinations call `generatePdfBlob(tabId)`. The media mismatch is destination-independent.

### Block 40 — retrying transport cannot repair already-generated wrong bytes — P0-070 boundary

Once the PDF is generated/cached, Yandex retry or local cached download intentionally reuses those bytes. This is correct retry semantics, but it means representation correctness must be established before the original PDF stream becomes immutable operation state.

## Blocks 41–46 — duplicate/root-cause boundaries

### Block 41 — not P1-199 print-generation ordering

One clean prepare → print operation reproduces the defect. No stale `restore-print(A)` overtakes a newer `prepare-print(B)`.

### Block 42 — not P1-171 child document identity

The iframe document is unchanged throughout the probe. No frameId/documentId reuse or navigation is needed.

### Block 43 — not P1-200 selection-session ordering

The selected/excluded Maps are stable. No late clear/start/set-mode/restore/state response changes them during the operation.

### Block 44 — not a hostile-marker P0-075 repro

The fixture does not forge, move or remove WebClip markers. Extension-owned CSS and worker-owned media policy conflict deterministically on an honest page.

P0-075's isolated/frozen representation is still a compositional architecture requirement and would make this class easier to eliminate, but it is not the single detailed owner for the current media/geometry bug.

### Block 45 — P1-004 remains the cross-origin umbrella, not the concrete closure row

Project history intentionally keeps specific independently testable child-frame lifecycle/representation causes under the broader cross-origin feature owner. P1-229 follows that established ownership model.

### Block 46 — P0-004 remains the severity/fidelity umbrella

P0-004 states that selected PDF output must be selection-bounded. P1-229 explains one exact cross-origin implementation mechanism currently violating that requirement and supplies a direct deterministic regression matrix.

## Blocks 47–50 — implementation acceptance / regression matrix

### Block 47 — WebClip owns the effective child media/filter contract

At physical PDF generation, WebClip must preserve the product goal that site `@media print` cannot silently hide explicitly selected content **and** ensure its own selected-only Include/Exclude filtering is active regardless of the emulated page media. Do not rely on the browser coincidentally switching the child to print media after WebClip forced screen.

### Block 48 — screen-only selection decoration cannot enter immutable PDF bytes

During the exact PDF generation, child Include/Exclude outlines or other interactive selection affordances must be disabled in the rendered representation even if page media remains `screen`. A regression should verify both text scope and raster/visual absence of WebClip selection decoration.

### Block 49 — geometry receipt is measured from the same effective selected-only representation

The child/top handoff must carry height/layout geometry measured **after** exact selected-only filtering/normalization is effective for that print generation. Top must not size a cross-origin iframe from pre-filter full-document `scrollHeight`. Geometry receipt must be generation/document-bound and compose with P1-199/P1-171/P1-214 ordering/rollback contracts.

### Block 50 — deterministic and real-browser acceptance matrix

A closure regression must cover at least:

1. one selected child subtree + one explicit Exclude + one unrelated sibling;
2. worker physical media policy used by production;
3. ordinary site `@media print` trying to hide selected content;
4. screen-only WebClip selection decoration absent from PDF;
5. a very large unselected tail proving post-filter geometry does not create excess pages;
6. selected visual resources and resource report matching the actual rendered child scope;
7. multiple selected cross-origin frames and nested/mixed same-origin ancestry;
8. clean single operation plus rapid consecutive operations to compose with P1-199/P1-214;
9. persisted SelectionSnapshot/Journal selection semantics matching the physical PDF scope;
10. real unpacked Chrome with optional host permission as release QA after deterministic managed-Chromium regression passes.

## New-owner duplicate check

Immediately before allocating P1-229, the audit re-read:

- current `AUDIT_REGISTRY.md` (late stream occupied only through P1-228);
- current `AUDIT_DELTA_INDEX.md` and recent selection/save-freeze evidence;
- `AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md`;
- `AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md`;
- `AUDIT_HISTORY_INDEX.md`;
- repository search for `P1-229`, `setEmulatedMedia` and the specific media-contract hypothesis.

No existing detailed owner or reservation covers this deterministic clean-operation media/selected-geometry mismatch. P1-229 is therefore newly reserved by the accompanying canonical registry update and must never be reused even after future closure/merge/supersession.

## Test / release boundary

This tranche changes audit documentation only. Managed Chromium proves the media/geometry mechanics and the resulting PDF output in deterministic fixtures; it does **not** upgrade current release readiness or claim real unpacked-extension optional-host-permission regression.

`manifest.json` remains `0.9.8`. No build, tag or GitHub Release is created.