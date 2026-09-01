# WebClip — fresh full-project audit restart — C07 fonts/typography — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline exercised: `28afa1fe6f29b455574f1e2caf9865f1e957c625`.

Accepted focused evidence execution:

- temporary evidence head: `1b6a36b60adb6aa0f7e01cd962489bd3ae0915d7`;
- GitHub Actions workflow run: `33512505056`;
- job: `99871390761`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- artifact id: `9802235490`;
- artifact ZIP digest: `sha256:d233fe0a85d964a9c073e963861c86fe5fc42dcd89c69f2042a103b8f6d9a87d`;
- machine result: `accepted=true`.

Temporary focused harness/workflow files are evidence-only and are intentionally absent from the final delivery branch. Product runtime remained byte-identical to the canonical source baseline throughout the accepted execution.

## 1. C07 contract and source-first boundary

C07 audits whether the saved physical PDF preserves the selected rendered typography and whether font readiness truthfully covers the glyphs actually needed by the selected representation.

Current `content.js` provides a bounded font task for each selected scanned element. The task uses a computed `fontSpec` built from style, weight, size and family, and calls `document.fonts.check/load(fontSpec, sampleText)`. The current `resourceTextSample()` is intentionally bounded to at most 12 direct text-node children and 64 characters. Font task dedup is keyed by document URL + `fontSpec`, not by sample text or actual glyph-range dependency.

That design has two separate audit implications tested here:

1. ordinary delayed webfonts that are represented by the bounded sample should be awaited and physically preserved;
2. one CSS family/fontSpec can map to multiple `@font-face unicode-range` faces, so a short first sample can admit one face while a later glyph range required by the same selected logical text is still loading.

The same tranche also directly checks the existing same-origin flattened-frame secondary representation, whose copied style allowlist includes basic font family/size/weight/style/line-height/letter-spacing but not the complete typography/rendering state.

## 2. Top-document physical positive controls

The focused top-document PDF physically revalidated ordinary typography behavior:

- 12px versus 30px text preserved a >2x physical span-size relation (`8.516` versus `21.290` PDF units);
- regular/bold/italic states remained distinguishable, with physical fonts `LiberationSans`, `LiberationSans-Bold` and `LiberationSans-Italic`;
- large letter spacing remained materially wider: ordinary line width about `128.13`, spaced line about `196.25`;
- line-height relation remained materially distinct: about `12.77` versus `34.06` vertical gap;
- serif and monospace family metrics remained physically distinct (`206.28` versus `164.05` width for the tested markers);
- underline/decoration plus text shadow/stroke produced the expected red/blue physical raster signal (`2417` red and `1828` blue pixels);
- Cyrillic and Greek markers were physically present;
- Chrome 152 reported support for `text-wrap:balance` and `text-box-trim:trim-both`; `text-wrap:balance` was retained as a feature-gated current-browser control.

Top typography artifact:

- bytes: `57094`;
- SHA-256: `e80f346abe35f21cc6df596af6be4fe94dfb8b9483d0fd4bb3cea9dc58f5116d`.

Its resource report was clean: attempted `10`, loaded `10`, failed `0`, no omission/truncation/deadline.

These controls show that the later findings are not generic Chromium/PDF inability to preserve font size, emphasis, spacing, multilingual text or ordinary selected-local paint.

## 3. Delayed ordinary webfont — positive readiness control

A selected top-document marker used an artificially delayed local `@font-face` (`DejaVu Sans Mono`).

Observed preparation:

- elapsed about `3.762 s`;
- resource report elapsed `3545 ms`;
- attempted `1`, loaded `1`, failed `0`;
- no omission/truncation/deadline.

Physical PDF:

- embedded/extracted font: `DejaVuSansMono`;
- bytes: `25502`;
- SHA-256: `abd0f3c94fb0b4402c848b27995ebae713d1f713520b0b060affed9998712403`.

This is a positive control proving that current WebClip preparation does wait for a delayed font when the required glyph subset is represented by the current task/sample.

## 4. Missing webfont — truthful failure control

A selected marker referenced an intentionally missing `@font-face`.

The resource report truthfully returned:

- attempted `1`;
- loaded `0`;
- failed `1`;
- failure kind `font` with network-error reason.

The physical PDF used fallback `LiberationSans` rather than silently claiming the requested face was ready.

Artifact SHA-256: `38ffb5d10a7db2e5e1b9ecb391af66834f42f310e47679678af40beda73fb26b`.

This is an important control: the P1-003 finding below is not “all font failures are hidden”; it arises when the bounded font task itself fails to represent a later required glyph range while still reporting the admitted task set as fully ready.

## 5. Fresh finding — bounded sample/dedup misses a required unicode-range face — P1-003

Focused fixture:

- one CSS family `C07Split` with the same effective style/weight/size;
- ASCII `@font-face` restricted to `U+0000-007F`, served quickly;
- Cyrillic `@font-face` restricted to `U+0400-04FF`, delayed by 4.5 seconds;
- selected direct text begins with more than 64 ASCII characters and ends with `КИРИЛЛИЦА_ЖЖЖЖЖ_C07`.

Because current `resourceTextSample()` stops at the first bounded 64 characters and font dedup is by `fontSpec` rather than actual glyph-range/sample dependency, preparation admits only one font task for the family/spec.

Fresh Chrome 152 state at the accepted run:

- preparation returned in about `0.216 s`;
- resource report said attempted `1`, loaded `1`, failed `0`, elapsed `1 ms`;
- the ASCII face was loaded;
- the required Cyrillic face remained `loading` after preparation and also after the immediate physical print;
- both `/ascii.ttf` and `/cyr.ttf` network requests existed, so the issue is not absence of browser discovery; it is that WebClip's readiness authority returned before the required later face settled.

Immediate physical PDF:

- selected logical text absent, including the Cyrillic marker;
- bytes: `20221`;
- SHA-256: `1b3fb43fac09f12f3a6f878d63a8e966f45bc1817d935292e32281d555e0ff03`.

After the same prepared page settled:

- Cyrillic face status became `loaded`;
- selected text appeared physically;
- Cyrillic span used `DejaVuSerif`;
- bytes: `29417`;
- SHA-256: `4a732429ca4b3ab628cd32d93a86934543ad8c1bba187da5699eed2feedbd57a`.

The immediate resource report therefore claimed complete readiness for its admitted vocabulary while the exact selected logical text was physically absent until a required glyph-range font settled.

This is a fresh current-Chrome physical revalidation of **P1-003 ACTIVE**. The existing owner already requires the exact final renderer-selected visual resource graph to be ready under bounded deadlines with truthful partial/unknown reporting. No new P-code is warranted.

## 6. Fresh finding — flattened same-origin proxy loses advanced typography — P1-187

A selected same-origin iframe BODY contained a basic typography control plus an advanced rendered text block.

Basic properties that are explicitly represented by the current flattened allowlist remained equal source -> proxy:

- `font-family: Arial, sans-serif`;
- `font-size: 30px`;
- `font-weight: 700`;
- italic style;
- `line-height: 42px`;
- `letter-spacing: 3px`.

The physical PDF retained the basic marker as bold+italic, a useful positive control.

Advanced source state, however, changed materially in the flattened proxy:

- `text-shadow`: red 10px -> `none`;
- text stroke: `2px` -> `0px`;
- `word-spacing`: `30px` -> `0px`;
- `font-kerning`: `none` -> `auto`;
- `font-feature-settings: "liga" 0` -> `normal`;
- `font-variant-ligatures: none` -> `normal`;
- direction `rtl` -> `ltr`;
- `unicode-bidi: bidi-override` -> `isolate`;
- tested rendered width changed from about `592.52` to `560.20`.

Source screenshot contained `1867` red and `4509` blue paint pixels; the flattened proxy contained `0` red and only `5` blue noise pixels. The physical flattened PDF contained `0` red and `0` blue signal.

Artifact SHA-256: `bfd5a69d36fa17de4df9fc9dbcee34600d60213ef8fbb44b3ed19906001c87a4`.

This is fresh evidence for existing **P1-187 ACTIVE**, whose root is incomplete rendered-state preservation in the same-origin flattened secondary representation. It is not a separate owner per typography property.

## 7. Fresh finding — frame-local `@font-face` is lost by flattened representation — P1-187

A selected same-origin iframe used frame-local `@font-face C07FrameFont` backed by a real loaded DejaVu Sans Mono file.

Before flattening:

- child `document.fonts` confirmed the face ready;
- source rendered marker width about `423.84`.

Flattened proxy:

- retained the CSS family string `C07FrameFont, sans-serif` but not the frame-local font-face authority/resource context;
- proxy width became about `522.61`;
- physical PDF used `LiberationSans`, not `DejaVuSansMono`.

Artifact SHA-256: `098fd9e377825f21d97932fa7c416cb5952434083f42bf32fbd7a2ce213836e4`.

The associated resource report remained clean (`attempted 2`, `loaded 2`, `failed 0`), which does not repair the fact that the secondary representation no longer has the source frame's font-face context.

This is another fresh revalidation of **P1-187 ACTIVE**, not a new P-code.

## 8. Rejected development executions

Earlier C07 runs are explicitly development provenance, not accepted evidence:

1. run `33511516812` / head `210e5b337d99fdd34e19c7846de2bff43a273abe` failed because the first letter-spacing discriminator assumed two identical markers would remain two independent PyMuPDF spans;
2. run `33512001528` / head `2e93418313ede5024e0e5981d4252b5e1336cde0` still assumed the heavily letter-spaced marker would extract as one whole span; artifact inspection showed Chromium/PDF correctly rendered it but extraction split it into per-character words;
3. run `33512228910` / head `104d7b838887bb9ed779af7d58701e91a00bec9f` completed successfully, but the initial unicode-range result classifier searched a zero-padded `U+0400` spelling while Chrome normalized the face range as `U+400-4FF`. The underlying physical artifact already showed the loss. The final accepted run makes that discriminator fail-closed and requires the physical immediate/settled difference explicitly.

The accepted run `33512505056` changes no product source; it corrects only harness extraction/classification assumptions and re-executes the complete focused suite.

## 9. Fresh restart classification

C07 advances from `NOT-TRIAGED / UNKNOWN` to:

**`L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-003, P1-187)`**

Fresh findings:

- bounded 64-character/sample + fontSpec dedup can return clean readiness before a later required unicode-range face is ready, physically omitting selected logical text -> **P1-003 ACTIVE**;
- flattened same-origin representation loses advanced typography/rendering state -> **P1-187 ACTIVE**;
- flattened same-origin representation loses frame-local `@font-face` authority and falls back physically -> **P1-187 ACTIVE**.

No new P-code is allocated. Neither existing owner changes status through this coverage checkpoint.

## 10. Boundaries and non-claims

This focused C07 tranche does not claim exhaustive coverage of every OpenType axis/script/shaping engine, browser accessibility font override or future CSS typography feature. It establishes a current physical baseline for ordinary selected typography, truthful ordinary font readiness/failure, current `text-wrap:balance` availability, the unicode-range/sample-bound readiness failure, and same-origin flattened-frame typography/font-context loss.

Later coordinates remain responsible for broader writing-mode/layout interaction, responsive environment, Shadow/composed-tree typography, pagination and cross-origin frame representation where those mechanisms materially change the evidence stack.

This evidence changes only fresh audit coverage/provenance:

- no product runtime change;
- no `AUDIT_REGISTRY.md` owner/status/acceptance change;
- no manifest/version change;
- no `RELEASE_READINESS.md` change;
- no build/tag/GitHub Release;
- release remains **NOT READY**.
