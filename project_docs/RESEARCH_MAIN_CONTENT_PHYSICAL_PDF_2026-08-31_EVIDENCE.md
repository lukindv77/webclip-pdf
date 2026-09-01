# Durable research evidence — C03 Main Content / auto candidate -> final physical PDF — 2026-08-31

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`.

Researched fresh source baseline: `main = 869c47b14254fdadded1e24dc6a6bfabafc049a1`.

This tranche closes the missing C03 B2 -> B6 evidence bridge: the actual current `content.js` Main Content command chooses and commits an automatic Include, current selected-only print preparation runs, and a physical Chromium PDF is inspected. It does not reinterpret manual picker geometry or allocate a second owner for the same discovery/fallback root cause.

Managed-browser evidence is deterministic engineering evidence, not a substitute for real unpacked-Chrome release QA or optional-host-permission cross-origin QA.

## Executive classification

**C03 = `ARTIFACT-COVERED / FINDING`.**

No new permanent P-number and no current status transition are justified by this tranche.

- **P1-160 ACTIVE — primary owner.** Current auto-content discovery has no final confidence threshold and no winner-margin/ambiguity contract. `bestScore < 900` merely triggers a fallback pass; after that pass `detectMainContent()` returns `best || null` even if the best score remains far below 900 or negative. Two equally scored strong candidates are resolved by Set/DOM iteration order because only `score > bestScore` replaces the winner. Both behaviors bypass the owner’s existing requirement for bounded/coalesced discovery with graceful manual fallback.
- **P0-080 ACTIVE — supporting same-document generation owner.** After auto-selection, the chosen Element can be replaced/disconnected by the page while the stale Element remains in `state.includes`; save admission still sees a non-zero Include count and can proceed to a physical artifact with no intended selected content.
- **P0-070 ACTIVE — supporting exact-generation owner.** Auto-selection result is not frozen as an exact admitted generation through the physical cut. A same Element can also change logical content after selection, so the saved bytes may differ from what the auto decision scored.
- **P0-075 ACTIVE — supporting hostile/live-page boundary.** The page remains the live authority after automatic candidate admission and can supersede or mutate the selected DOM before physical serialization.
- **P0-004 ACTIVE — physical selected-copy consequence.** Low-confidence BODY admission physically serializes unrelated shell; arbitrary tied-winner admission physically serializes one candidate while silently omitting the equally plausible alternative; stale replacement can physically serialize no intended selected region.
- **P1-228 is not the primary C03 owner.** Its current registry wording is specifically manual event-target / hit-test / rendered geometry authority. C03’s scoring/fallback defect is already directly owned by P1-160. P1-228 remains relevant only if a future auto-content path begins reusing manual rendered hit-test authority.

No runtime, `manifest.json`, version/build/tag/release state is changed by this research tranche.

## Fresh source boundary

Current `content.js` establishes the auto-content authority pipeline:

1. `handleExternalCommand('auto-content')` ensures selection mode, calls `selectMainContent()` and returns `{ok:true}`; the command result does not expose which candidate was selected or whether confidence was low.
2. `selectMainContent()` calls `detectMainContent()`. Only a null candidate triggers the user-facing message `Не удалось уверенно определить основной контент. Выберите область вручную.`.
3. `detectMainContent()` scans all currently discovered same-origin documents, scores every collected candidate and keeps a single `best` using strict `score > bestScore`.
4. If no best exists or `bestScore < 900`, a second fallback pass scores one `main, article, [role=main]` or BODY candidate per document.
5. There is **no final check** that the post-fallback score reached 900 (or any other confidence floor). The function ends with `return best || null`.
6. There is no second-best score, margin, ambiguity state, or manual-fallback condition for equally/near-equally plausible candidates.
7. `collectMainContentCandidates()` performs broad `querySelectorAll()` scans over semantic selectors, every `body div, body section`, and `body > *, body > * > *`, with no shared candidate/node/time envelope.
8. `scoreContentCandidate()` repeatedly reads candidate `innerText`, descendant counts and link text; only the per-candidate link loop has a 5000-link cap. It also re-reads the entire `ownerDoc.body.innerText` for every candidate. These source facts remain direct P1-160 bounded-work evidence.
9. Once selected, `handleIncludeClick()` / `addInclude()` store a direct Element reference. There is no generation receipt tying the scored candidate state to the later save/physical cut.
10. `startReadLater()` uses the same `detectMainContent()` but, unlike manual auto-content, does not offer manual selection. A non-null low-score BODY therefore also bypasses its explicit detection-error branch.

## L3/L4 method

Durable probe: `project_tools/research_main_content_physical_pdf.py`.

The durable probe is designed to run from a repository checkout and:

- loads the actual checkout `content.js` into safe local fixtures;
- drives the actual `WEBCLIP_COMMAND` `start` and `auto-content` handlers;
- inspects the live Include marker selected by current source;
- drives the current download/preparation path;
- holds the mocked worker `WEBCLIP_GENERATE_PDF` reply so physical `Page.printToPDF` executes while the exact current prepared state is live;
- extracts physical PDF text with `pypdf`;
- resolves the held worker response only after artifact capture so current rollback completes.

An additional local L3/L4 model probe copied the exact current `detectMainContent()` / candidate collection / scoring formulas from baseline source to validate the adversarial fixture construction before the durable checkout probe was committed. It reproduced the low-confidence BODY, tied-winner and stale-replacement outcomes below. This model probe is supporting evidence; the durable repository probe is the retained regression artifact.

## Controls and findings

### 1. Strong semantic article beats navigation/footer shell and becomes the physical artifact — PASS control

Fixture contains a credible `<article>` with heading/paragraph content plus unrelated navigation/footer shell.

Observed contract:

- auto-content selects the article;
- selected-only physical PDF contains `MAIN_GOOD_MARKER`;
- unrelated navigation/footer markers are absent.

This rejects the broad hypothesis that current auto-content always chooses BODY or that the physical harness simply prints the whole page.

### 2. Hidden semantic competitor is rejected — PASS control

A high-semantic candidate with `display:none` or `visibility:hidden` is paired with one visible credible article.

`scoreContentCandidate()` returns negative infinity for the hidden candidate, the visible candidate is selected, and the hidden marker is absent from physical PDF.

This preserves the current positive visual-admission behavior at the candidate-scoring stage and keeps the finding narrow.

### 3. No credible main content: BODY with score far below 900 is still selected and unrelated shell is physically saved — FINDING / P1-160

Adversarial fixture contains only long navigation and footer/legal content. The explicit top-level `nav` and `footer` elements are rejected by `scoreContentCandidate()`. BODY remains a candidate because its combined text/geometry is large enough.

The exact current algorithm then behaves as follows:

1. BODY becomes `best` even though its score is weak because `bestScore` starts at `-Infinity`;
2. `bestScore < 900` triggers the fallback pass;
3. fallback has no better semantic candidate and therefore does not clear BODY;
4. there is no final score floor;
5. `return best || null` returns BODY instead of null/manual fallback.

Supporting physical model measured a post-fallback BODY score of **185**, still far below the code’s own 900 fallback threshold.

Physical consequence:

- BODY receives the Include marker;
- physical selected PDF contains `NAV_ONLY_MARKER` and `FOOTER_ONLY_MARKER`;
- the user-facing “could not confidently determine main content; choose manually” branch is not reached.

This is not merely heuristic quality disagreement. The source already contains an explicit confidence/fallback UX, but its final return bypasses that policy for weak non-null candidates. It is direct acceptance refinement of P1-160’s existing “graceful manual fallback” owner.

`startReadLater()` inherits the same detection result and therefore can also avoid its explicit detection-error state for this low-confidence BODY class.

### 4. Two equally strong Main Content candidates have no ambiguity state; DOM-order winner is physically serialized — FINDING / P1-160

Fixture contains two sibling `<article>` elements with identical structure, equal-length/equivalent text and equal semantic bonuses. Their only distinguishing physical markers are equal-length strings (`AAAAA_EQUAL_MARKER` and `BBBBB_EQUAL_MARKER`) so the scoring inputs remain tied.

Current behavior:

- both receive the same score in the supporting model (5390 in the retained fixture shape);
- `detectMainContent()` keeps the first encountered candidate because replacement requires strict `score > bestScore`;
- no second-best/margin/ambiguity is recorded;
- no manual-fallback warning is produced;
- physical PDF contains `AAAAA_EQUAL_MARKER` and omits `BBBBB_EQUAL_MARKER`.

DOM order is therefore silently promoted into automatic saved-scope authority when the heuristic has no evidence that one candidate is better. This remains P1-160, not a new confidence P-code: the owner already requires graceful fallback for discovery that cannot reliably resolve one candidate.

### 5. Post-auto-selection replacement leaves stale authority and permits an empty selected artifact — FINDING / P0-080 + supporting owners

A strong article is auto-selected correctly. Before save, page script replaces that node with a new unmarked live node.

Observed schedule:

- original selected Element is disconnected;
- no live element carries the Include marker;
- internal selection map still retains the old Element and `totalIncludeCount()` remains non-zero;
- download/save admission proceeds;
- physical selected artifact contains neither the old intended marker nor the new unselected replacement marker.

This is the same exact-generation root cause already owned by P0-080 and physically revalidated in C02. C03 adds only the fact that automatic Main Content authority is affected too; no new P-number is appropriate.

### 6. Same Element can change logical content after auto-selection — FINDING / P0-070/P0-075/P0-080 support

A strong article is selected, then page script mutates the selected Element in place without disconnecting it.

Because the Include marker remains on the same node, physical PDF serializes the **new** content under the old auto-selection decision. There is no immutable candidate fingerprint/generation receipt at save admission to prove that the content being serialized is the content that was scored.

This is an exact admitted-generation consequence, not a separate auto-content heuristic owner.

### 7. Same-origin frame Main Content reaches physical PDF — PASS control

A top shell plus accessible same-origin `srcdoc` frame contains a strong article. Current discovery includes the child document and grants same-origin frame candidates the documented bonus.

The durable probe asserts:

- the child article receives the Include marker;
- top shell remains unselected;
- physical PDF contains the frame article marker and omits the top-shell marker.

This establishes same-origin B2->B6 parity only. It does **not** close cross-origin optional-permission/document-generation L5/P1-004/P1-171 boundaries.

## Bounded-work refinement retained under P1-160

C03 also refreshes a source-level performance finding already owned by P1-160:

- candidate collection builds Sets from broad whole-document selector scans;
- every candidate may perform multiple descendant `querySelectorAll()` calls;
- every candidate reads normalized `innerText`;
- every candidate re-reads `ownerDoc.body.innerText` to compute share;
- link traversal is capped per candidate, not across the discovery operation;
- multiple same-origin documents multiply the work;
- there is no shared node/candidate/time receipt or early confidence cutoff.

The physical tranche does not allocate another performance owner and deliberately avoids a wall-clock threshold assertion because environment timing is not a stable correctness oracle. P1-160 already owns bounded/coalesced discovery.

## Duplicate/root-cause reconciliation

No new P-code is allocated.

- Weak BODY final admission and tied winner are directly inside **P1-160**: auto-content discovery + graceful manual fallback.
- Manual raw event-target/geometry defects remain **P1-228** and are not duplicated here.
- Disconnected/replaced same-document selection remains **P0-080**.
- In-place/live post-admission drift remains **P0-070/P0-075**, with **P0-004** for physical selected-copy consequence.
- Same-origin frame positive evidence cannot close **P1-004/P1-171** cross-origin/session identity boundaries.

Do not allocate a new “auto-content confidence” P-code unless future implementation separates a materially independent confidence subsystem from P1-160 and that subsystem has its own root cause.

## Acceptance refinement

C03 can be considered fixed only when Main Content -> save is end-to-end truthful, including at least:

1. discovery has a shared bounded node/candidate/time envelope across documents and per-candidate scoring;
2. final automatic admission has an explicit confidence threshold after all fallback passes;
3. materially tied/near-tied candidates do not silently use DOM order as authority; they fail/degrade to user manual choice unless another trusted signal resolves the tie;
4. the command/result UI exposes truthful selected/fallback outcome instead of unconditional transport-level `{ok:true}` masking a non-selection or low-confidence decision;
5. read-later shares the same confidence semantics and reaches its explicit error state when automatic authority is insufficient;
6. selected candidate is generation-bound/revalidated for connectedness and logical identity immediately before physical cut;
7. same-origin frame parity remains bounded and exact; cross-origin claims remain explicit external/permission/session boundaries;
8. physical artifact asserts selected marker inclusion and unrelated shell exclusion for every success path.

## Coverage consequence and next ranking

C03 moves from:

`RENDERER-COVERED / PARTIAL`

to:

`ARTIFACT-COVERED / FINDING`.

After C03, the previous two explicit in-repo CORE B2->B6 gaps (C02 and C03) are both at required L3/L4 artifact evidence. The campaign must now rerank residual rows instead of declaring completion automatically.

The next in-repo candidates are no longer an admission-source gap pair. The residual matrix should be triaged by required-vs-current evidence strength, with particular attention to:

- C38 node/byte/time/resource budgets (`RENDERER-COVERED / FINDING`) where additional direct bounded-work proof may still be valuable but many owners already have L2/L3 evidence;
- C43 Journal/provenance (`DETERMINISTIC/RENDERER-COVERED / FINDING`) where physical artifact linkage and remote identity claims split across in-repo and L5 boundaries;
- C44 backup/import/recovery (`DETERMINISTIC-COVERED / FINDING + EXTERNAL-REQUIRED`) where in-repo deterministic work is deep and remaining remote truth is partly L5;
- explicit L5 C41/C42/C46, which remain external-required and cannot be converted to managed PASS.

The Coverage Matrix must be reranked after this tranche using the campaign policy before choosing the next in-repo tranche.

## Reproduction

From a repository checkout with Chromium, Python Playwright and pypdf available:

```bash
python3 project_tools/research_main_content_physical_pdf.py
```

The script exits non-zero if a positive or adversarial contract assertion changes and prints a compact JSON result for durable comparison.
