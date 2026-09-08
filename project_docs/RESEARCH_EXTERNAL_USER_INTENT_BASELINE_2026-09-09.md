# WebClip — external user-intent / peer-product / platform baseline — 2026-09-09

Date: 2026-09-09

Canonical repository baseline at research start: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Research branch: `research/pd7-single-axis-scroll-stable-2026-09-09`.

This is the substantive external refresh required by `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` and `COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`. The previous current external input was `RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md`; it is now nine days old. This document supersedes it only as the **current external research input**. Historical baselines remain durable evidence.

External evidence does not change `RESEARCH_REGISTRY.md`, does not create P-codes automatically and does not silently modify WebClip product contracts. It is used for Change Impact, hypothesis discovery, risk ranking, comparison and architecture alternatives.

## 1. Fresh research method

The refresh used independent source classes where materially useful:

1. official Chrome / web-platform release material;
2. Blink intent / compatibility discussion;
3. current extension-store metadata;
4. public peer-product source/help/issues;
5. web-archiving QA documentation.

The refresh was intentionally delta-focused: it searched for material changes after the 2026-08-31 baseline rather than re-copying every earlier source.

## 2. Browser/platform Change Impact

### 2.1 Chrome 153 release-cycle boundary

Official Chrome release-cycle documentation schedules Chrome 153 Stable for 2026-09-08 and identifies M153 as the first release of the two-week Stable/Beta cadence:

- https://developer.chrome.com/blog/chrome-two-week-release

The current Chrome for Developers landing page identifies Chrome 153 as the latest Stable release and highlights Single-axis scroll containers among its release features:

- https://developer.chrome.com/

Chrome Platform Status release notes for Chrome 153 likewise list Single-axis scroll containers under CSS:

- https://chromestatus.com/release-notes

### 2.2 PD7 rollout ambiguity is itself current evidence

A more specific official Chrome article published 2026-09-04 says Single-axis scroll containers are available for developer testing in Chrome 153 **Beta, Dev and Canary**, and asks developers to test them **before the feature rolls out to Stable channels**:

- https://developer.chrome.com/blog/single-axis-scroll-containers-ready-for-testing

This conflicts operationally with the current Stable landing/release-note surfaces. The correct WebClip research interpretation is therefore not “all Chrome 153 Stable users certainly have the feature”. The correct interpretation is:

> **rollout-sensitive current-channel ambiguity requiring physical feature detection on the exact browser used for evidence.**

The official article explicitly recommends:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

rather than parse-only `@supports (overflow: scroll clip)`.

This feature-detection result must become part of any PD7 physical evidence receipt.

### 2.3 Single-axis semantic changes

The feature changes the meaning of combinations such as:

```css
overflow-x: auto;
overflow-y: clip;
```

or:

```css
overflow: auto clip;
```

The specific official Chrome article identifies material side effects for:

- per-axis `position: sticky` ancestry;
- `overscroll-behavior`;
- programmatic scrolling on the clipped axis;
- Grid/Flex automatic minimum sizing.

Blink's Intent to Ship records the compatibility risk: a pair such as `overflow: scroll clip` previously behaved as `scroll hidden`, while the new semantics no longer convert the clipped axis into a scroll container. It also exposes targeted compatibility counters for sticky ancestry and Grid/Flex auto-min-size changes:

- https://groups.google.com/a/chromium.org/g/blink-dev/c/PSiqwsm8f3Q

### 2.4 WebClip Change Impact mapping

This does not establish a new WebClip root cause by itself. It revalidates existing surfaces:

- **C20 / P0-004** — nested scroll / retained scrollports;
- **C31 / P0-004, P1-187 supporting** — fixed/sticky static PDF representation;
- **C22/C23 / P1-230 supporting** — user-reached history must distinguish exact scroll context and axis when the platform itself has per-axis scroll-container identity;
- **C29 / P0-004/P0-070 supporting** — layout can change because Grid/Flex auto minimum sizing changes under the new overflow semantics.

The 2026-09-02 Chrome-151 C20/C31 evidence remains valid evidence of the existing WebClip defects on that tested browser/source. It does not prove the new per-axis platform variant.

### 2.5 Chrome 154 Beta — WATCH, not current requirement

Chrome 154 Beta was published 2026-09-02:

- https://developer.chrome.com/blog/chrome-154-beta

Relevant future/watch changes include:

- `scroll-marker-group` `links` / `tabs` modes with different focus/accessibility behavior;
- light-dismiss changes for dialogs/popovers;
- responsively-sized `<iframe>` behavior.

These map to already-known WebClip families such as C14/C16/C17/C25/C27/C29 and current frame/render owners. They are **WATCH / Change Impact input**, not a new P-owner or current Stable requirement in this baseline.

## 3. Peer-product movement

### 3.1 SingleFile

Chrome Web Store current metadata at refresh time:

- version `1.24.1`;
- updated `2026-09-07`;
- approximately 1.1K ratings / 4.4 rating at scan time;
- developer disclosure states that the product does not collect/use user data.

Source:

- https://chromewebstore.google.com/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle

Current SingleFile help continues to expose an important failure boundary for event-timed saves: autosave on unload/tab discard/tab removal can have missing frame contents in documented conditions.

Source:

- https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html

WebClip implication:

- reinforces existing frame-generation/failure-settlement owners;
- reinforces truthful incomplete-result semantics;
- does not establish a new WebClip requirement or owner.

### 3.2 Obsidian Web Clipper — repeat-capture divergence

Issue #930 reports a first capture with escaped/replacement characters while immediately repeating the same capture can produce the correct text:

- https://github.com/obsidianmd/obsidian-clipper/issues/930

This is one peer report, not prevalence evidence. It nevertheless reinforces a WebClip architecture rule already present in current owners:

> first capture, retry and repeated capture must not silently represent different admitted/captured generations while reporting equivalent success.

This remains within existing generation/resource/persistence evidence families; no new P-code is justified.

### 3.3 Obsidian Web Clipper — credential storage trust signal

Issue #948 reports an AI provider API key stored in synchronized extension storage in plaintext:

- https://github.com/obsidianmd/obsidian-clipper/issues/948

This is external defensive-security input, not a WebClip finding. It reinforces existing WebClip C39 privacy/data-minimization and credential/config trust-boundary requirements:

- avoid unnecessary synchronization of secrets;
- minimize durable secret exposure;
- keep credential-storage architecture explicit and reviewable.

No new WebClip P-owner is allocated from this peer report.

## 4. Web-archiving QA pattern

Browsertrix QA continues to provide a useful architecture comparison point.

Current documentation compares what the browser encountered during capture with replay using multiple independent dimensions:

- screenshot comparison;
- extracted-text comparison;
- resource comparison.

Sources:

- https://crawler.docs.browsertrix.com/user-guide/qa/
- https://docs.browsertrix.com/user-guide/qa-review/

The key pattern is not “make WebClip a crawler”. It is:

> compare the persisted/replayed artifact against the **captured reference state**, not against a later-changing live site.

This strongly supports the existing WebClip opportunity for admitted/capture → physical/later-read differential receipts. It aligns with B2→B9 provenance and existing P0-070/P0-075/P0-004 families. It is an architecture opportunity, not an automatic product requirement.

## 5. Updated risk / opportunity implications

### A1 — PD7 per-axis scroll semantics — immediate Change Impact

Priority: **REVALIDATION-REQUIRED / rollout-sensitive**.

Required evidence is a current browser with exact feature detection and physical WebClip-shaped schedules. The local research environment currently exposes Chromium 144 and therefore only supplies a negative platform control.

### A2 — Artifact differential receipts — architecture opportunity remains strong

Peer/web-archiving evidence continues to support one compact differential QA receipt spanning high-value invariants such as:

```text
admitted selected scope
captured text/resources/geometry identity
physical PDF digest
later-read text/resource/URI checks
```

This should reuse existing provenance owners rather than create an independent feature owner during research.

### A3 — Event/retry capture equivalence remains high risk

SingleFile unload/discard caveats and Obsidian first-vs-repeat divergence reinforce WebClip's existing generation, frame, retry and settlement families. Silent “second try is different” behavior is unacceptable where WebClip claims the same operation truth.

### A4 — Secret/config storage remains defensive-security priority

The Obsidian peer issue reinforces existing WebClip privacy/trust review. External evidence changes risk ranking, not current source truth.

### A5 — Chrome 154 renderer/UI deltas remain WATCH

The Beta changes listed above should be considered by the next Change Impact pass when they approach Stable or when current WebClip source begins depending on them.

## 6. User Intent / Operation Map delta

The 2026-08-31 U1…U14 map remains materially valid. No new independent user-intent row is justified by the fresh scan.

Fresh observations reinforce these existing intents:

- **U1/U2/U8** — exact selected capture remains the central promise;
- **U6** — resource/frame completeness remains a peer pain point;
- **U11** — successful capture/preview must equal the persisted result;
- **U12** — local/private processing and explicit external-transfer authority remain trust differentiators;
- **U14** — capture/save must terminate with bounded truthful failure rather than indefinite or silently partial work.

## 7. Root-cause / owner reconciliation

The fresh external scan does **not** prove a new independent WebClip root cause.

Current mapping remains to existing owners/families:

- P0-004 / P1-187 — scroll/layout/static PDF representation;
- P1-230 — user-reached dynamic/virtualized history;
- P0-070 / P0-075 — admitted-generation/representation authority;
- existing frame-generation/settlement owners for unload/restart/frame incompleteness;
- existing C39 privacy/config owners for credential-storage architecture.

Therefore no `P1-231` is allocated by this baseline.

## 8. External evidence boundary

This refresh does not convert external/native claims into PASS:

- C41 native Save As remains L5 where required;
- C42 real Yandex object/public identity remains external;
- C43/C44 remote exact-object/recovery aspects remain external;
- C46 actual browser permission/debugger/restart boundaries remain bounded by their current evidence level.

External research freshness is now reset to `2026-09-09`, but release readiness remains unchanged.

## 9. Final baseline conclusion

The fresh external scan produces one material platform Change Impact and several reinforcing peer signals:

1. PD7 single-axis scroll semantics require a new current-channel physical revalidation because exact rollout is currently feature-detection-sensitive and official surfaces are operationally inconsistent about Stable availability.
2. Chrome 154 Beta adds WATCH variants but no current owner allocation.
3. SingleFile and Obsidian current signals reinforce existing frame/retry/privacy boundaries.
4. Browsertrix continues to support capture-vs-artifact differential QA as a strong architecture pattern.
5. No new WebClip product requirement, independent root cause or permanent P-code is justified by this external refresh alone.

Research coverage must therefore remain subject to PD7 Change Impact until current-feature physical evidence is obtained or the rollout is explicitly classified as non-Stable/out-of-scope at the chosen checkpoint.
