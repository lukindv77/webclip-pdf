# Durable research evidence — SelectionSnapshot privacy revalidation — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This is an interruption-safe source-first checkpoint from fresh `main` at `a899ae3d22c365010a663389dc07844b34c86f77`.

## Session pivot / dedup controls

The session initially tested post-freeze physical print mutation and cross-operation remote rollback. Two candidate directions were deliberately rejected as duplicate findings before this checkpoint:

1. The general live-DOM / `beforeprint` mutation window is already losslessly preserved in `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` under the existing frozen-representation owners.
2. The exact old-`restore-print(A)` versus new-`prepare-print(B)` cross-origin race is already the historical root of **P1-199 ACTIVE**, including `remotePrintPrepared.clear()`, fire-and-forget cleanup, shared child `printStyle`/`changedAttrs`, duplicate-style/lost-pointer behavior and the two-frame reverse-order regression.
3. The same-origin flattened-frame relative SVG `<use href>` / `<picture><source srcset>` provenance defects are already explicitly covered by the 38-block `RESEARCH_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md` under P1-187.

No P1-230 is allocated from any of those paths.

The fresh tranche therefore pivots to **P1-182 ACTIVE**, whose canonical current owner says durable SelectionSnapshot locator context must not persist surrounding plaintext or sensitive raw `href/src`, while restore quality is retained through privacy-preserving fingerprints.

No runtime, `manifest.json`, version, build, tag or GitHub Release is changed by this checkpoint.

## Fresh source boundary

Current top `content.js` still constructs v3 locators with plaintext semantic/context fields:

- selected `text`;
- `ariaLabel`, `name`, `title`;
- raw attribute `src` and `href`;
- `parentText`;
- `previousText` and `nextText`;
- structural ids/classes/path information.

The top local limits are bounded but plaintext: selected text 180 chars, `href/src` 1000 chars, parent text 160 chars and previous/next text 120 chars.

Current `frame-agent.js` independently emits the same privacy-sensitive categories with equal or larger bounds: selected/context text up to 240/180 chars and raw `href/src` up to 2000 chars.

Current worker `sanitizeSelectionSnapshot()` is an important size/schema boundary, but its safe locator still retains plaintext `text`, `ariaLabel`, `name`, `title`, raw `src`, raw `href`, `parentText`, `previousText` and `nextText`. It truncates them; it does not hash/redact/minimize them for durable storage.

`appendJournalEntry()` sanitizes `meta.selectionSnapshot` again and stores that result directly as the durable Journal entry `selectionSnapshot`, with `includeCount` / `excludeCount` derived from it.

## Managed Chromium privacy control

Managed Chromium `144.0.7559.96` was used only as deterministic DOM semantics evidence. The fixture selected a benign link whose own visible text was `Quarterly report`; adjacent siblings contained `RECOVERY PHRASE: SEVEN-TULIP-SECRET` and `SSN-LIKE NEIGHBOR: 999-88-7777`. The link itself used raw `href="/report?access_token=RAW_HREF_SECRET#private"`. A separate selected image used `src="/private/photo.png?sig=RAW_SRC_SECRET"`.

A production-shaped locator extraction produced:

- selected link text: only `Quarterly report`;
- `parentText`: both neighboring secret strings plus the selected text;
- `previousText`: `RECOVERY PHRASE: SEVEN-TULIP-SECRET`;
- `nextText`: `SSN-LIKE NEIGHBOR: 999-88-7777`;
- raw href including `access_token=RAW_HREF_SECRET` and fragment;
- raw image src including `sig=RAW_SRC_SECRET`.

Thus the surrounding plaintext is not required to be inside the selected node or visible PDF content in order to enter the locator.

## Blocks 1–16 — current P1-182 data-flow confirmation

### Block 1 — selected text itself is durable locator material — P1-182

Top locator creation copies normalized `innerText || textContent` of the selected element. This is useful matching evidence but becomes durable Journal data rather than an ephemeral restore-only feature vector.

Acceptance must explicitly decide how much selected plaintext, if any, is necessary for portable restore. The current P1-182 direction is privacy-preserving fingerprints rather than durable surrounding plaintext.

### Block 2 — `parentText` can capture unselected sibling plaintext — P1-182

`locatorElementText(parent, 160)` reads the parent's aggregate rendered/text content, not only a structural parent label. A benign selected child therefore inherits text belonging to unselected siblings.

Managed Chromium confirmed the selected link did not contain the recovery phrase, while its locator `parentText` did.

### Block 3 — `previousText` explicitly persists the previous unselected sibling — P1-182

The locator separately stores up to 120 chars from `previousElementSibling` (180 in the frame-agent). Managed Chromium captured the complete `SEVEN-TULIP-SECRET` phrase from a sibling outside the selected link.

This is a direct minimum-disclosure failure: a neighbor is persisted specifically because it is adjacent, not because it is selected output.

### Block 4 — `nextText` does the same for the following sibling — P1-182

The managed fixture likewise captured `SSN-LIKE NEIGHBOR: 999-88-7777` in `nextText`. A user cannot infer from “save this selected region” that adjacent sibling plaintext is durably archived as a locator feature.

### Block 5 — raw `href` persists query and fragment material — P1-182 / P0-066

Top locator copies `getAttribute('href')` directly before only applying a character slice. Worker sanitizer keeps the resulting raw string up to its own bound.

Managed Chromium preserved `/report?access_token=RAW_HREF_SECRET#private` exactly. P0-066 remains the URL-confidentiality owner for durable locator URLs; P1-182 owns why restore matching should not require reversible/raw sensitive locator context.

### Block 6 — raw `src` persists resource query material — P1-182 / P0-066

The same path applies to `src`. A selected image locator can durably carry signed/cache/session query material even when the visual PDF needs only the decoded/rendered resource.

Managed Chromium preserved `/private/photo.png?sig=RAW_SRC_SECRET` exactly in the production-shaped locator field.

### Block 7 — character bounds are not privacy transformation — positive boundary

Current bounds materially prevent one locator field from being arbitrarily large. Preserve those limits.

However, keeping the first 1000/2000 characters of a URL or first 120/240 characters of sibling text is still keeping plaintext. Size safety and privacy minimization are separate contracts.

### Block 8 — Exclude locators carry the same sensitive schema — P1-182

`serializeSelectionSnapshot()` calls the same `createElementLocator()` for local Includes and Excludes. Excluding a block from the PDF therefore does **not** mean its text/context is absent from durable metadata; the excluded element itself receives a full locator.

The exclusion feature is output-negative but metadata-positive under the current schema.

### Block 9 — an excluded secret can also leak through an Include parent's context — P1-182

Because `parentText`/sibling context is captured before any privacy-aware semantic filtering, content that the user explicitly excluded from the PDF can remain represented as plaintext context of another locator.

Acceptance cannot equate “not rendered in PDF” with “not persisted in Journal”; the durable metadata boundary needs its own minimization rule.

### Block 10 — same-origin frame paths multiply locator privacy surface — P1-182

`buildFramePath()` materializes a `createSimpleElementLocator()` for each ancestor same-origin frame element. Every selected node inside nested frames can therefore carry additional frame-element ids/classes/text/raw `src`/parent/sibling context before its own locator fields are considered.

A deep frame path is not merely structural indices; it is a list of full simple locators.

### Block 11 — cross-origin remote prefix also contains a top-side frame locator — P1-182 / P0-066

`collectCrossOriginFrameCandidates()` constructs `prefix = [...buildFramePath(ownerDoc), createSimpleElementLocator(frame, ownerDoc)]`. `composeRemoteLocator()` prepends that prefix to every remote child locator.

Thus a remote selection can durably inherit the cross-origin iframe element's raw `src` and top-document surrounding context in addition to the child frame-agent locator fields.

### Block 12 — worker sanitizer confirms, rather than removes, the sensitive fields — P1-182

`sanitizeSelectionSnapshot()` keeps plaintext locator `text`, ARIA/name/title, `src`, `href`, parent text, previous text and next text. It imposes scalar/list/depth/aggregate bounds but performs no privacy-preserving hashing/fingerprint transform on those fields.

This is a strong positive schema boundary for size and malformed input, but it is not the P1-182 fix.

### Block 13 — content save admission does not create a privacy-minimized durable variant — P1-182

`sanitizeContentSaveMeta()` calls `sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true })`. The exact plaintext fields that passed content→worker admission remain in `meta.selectionSnapshot`.

There is no split between an ephemeral high-detail restore locator and a minimized durable Journal locator at this boundary.

### Block 14 — `appendJournalEntry()` persists the sanitized snapshot directly — P1-182

Journal append re-sanitizes `meta.selectionSnapshot` and assigns the result to the durable entry as `selectionSnapshot`; Include/Exclude counts are then derived from that object.

Therefore the privacy-sensitive locator is not merely transient IPC data used to generate the PDF. It becomes persistent Journal state.

### Block 15 — durable recovery checkpoints can retain the same snapshot before final Journal append — P1-182

Pending Journal append normalization includes `selectionSnapshot: sanitizeSelectionSnapshot(meta.selectionSnapshot)`. When a save needs durable reconciliation, the snapshot can therefore exist in recovery/checkpoint state in addition to (or before) the final Journal record.

Any P1-182 migration/design must cover durable intermediate representations, not only the final Journal object.

### Block 16 — historical imported-provenance evidence confirms the issue remains current — dedup control

The consolidated import/provenance family previously noted that the sanitizer stores plaintext `src`, `href`, selected/ARIA/name/title text and parent/previous/next context. Fresh current-source review and managed Chromium reproduce that same behavior on `a899ae3d...`.

This is revalidation/refinement of **P1-182 ACTIVE**, not a new privacy P-code.

## Stage 2 classification

- **No new P-number.** P1-182 remains the single current privacy owner.
- **P0-066 composes** for URL confidentiality: raw locator `href/src` must use the same durable URL-secret policy as source/public metadata, while P1-182 should avoid needing reversible URLs for matching when a privacy-preserving identity can suffice.
- **P1-001 composes** for restore quality: replacing plaintext with fingerprints must preserve truthful ambiguity/fail-closed semantics rather than weakening resolver correctness.
- **P1-168 composes** for bounded locator computation: privacy hashing/normalization must itself be bounded before expensive/string-heavy work.
- Existing field/count/JSON bounds are positive controls and must remain.

## Next checkpoint targets

The next stage must follow the fresh snapshot through additional durable/portable surfaces and prove minimization acceptance:

1. Journal list/detail exposure and Apply semantics;
2. local Journal JSON export portable schema;
3. automatic/manual Yandex Journal backup bytes;
4. import round-trip and legacy compatibility;
5. whether operation/cache/recovery copies create extra persistence classes;
6. raw URL secret handling versus P0-066;
7. privacy-preserving matching alternatives and collision/ambiguity requirements;
8. deterministic regressions proving no surrounding plaintext/raw secret survives while restore remains fail-closed and useful.
