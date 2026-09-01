# WebClip — second full deep-research campaign kickoff — 2026-08-31

Date: 2026-08-31

Campaign ID: `DEEP-RESEARCH-CYCLE-2-2026-08-31`.

Canonical baseline at campaign start: `main = 2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`.

The prior campaign reached `DEEP-RESEARCH-COVERAGE-COMPLETE` on this repository state. That decision remains true **for the completed prior campaign and its then-current coverage model**. The user has explicitly started a new full research cycle, so the current campaign state is now:

**`DEEP-RESEARCH-IN-PROGRESS`**.

This does not reopen or duplicate every old P-code. Historical evidence is retained and reused only to the exact claim/evidence level it still supports under Change Impact.

## 1. Why a new full campaign is justified

The cycle is not being restarted merely to count the same testcases twice.

Three independent triggers exist:

1. explicit user decision to start a new full research under current process rules;
2. substantive external user-intent/product research refresh (`RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md`);
3. material browser/web-platform delta since much of the previous L3/L4 renderer evidence, which used managed Chromium 144.

Stable Chrome 146–152 introduced or expanded semantics relevant to faithful capture/print: scroll-triggered animations, scoped custom-element registries, element-scoped/nested View Transitions, CSS `text-fit`, print `page-margin-safety`, and JS-accessible `::backdrop`/`::scroll-marker`/`::view-transition` pseudo-elements. Chrome 153 single-axis scroll-container behavior is currently a beta watch.

Per `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md` §16, materially changed browser/API semantics create targeted `REVALIDATION-REQUIRED` candidates rather than permitting a blanket inference from historical renderer evidence.

## 2. Session / durable-state start check

At campaign start:

- fresh canonical `main`: `2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`;
- open PRs: none;
- historical research branches exist, but there is no open delivery-tail from the previous campaign;
- prior PR #62 and post-merge Repository Integrity #177 were complete before this cycle began;
- new working branch: `research/cycle2-external-baseline-2026-08-31`.

The first durable checkpoint is the refreshed external baseline plus this kickoff document. No runtime implementation change is included.

## 3. Coverage model for Cycle 2

The previous C01…C46 family inventory remains the **minimum starting denominator**, because current policy still requires those material surface families where relevant.

Cycle 2 does not assume all 46 rows are current PASS/terminal simply because the prior campaign was complete. Each row must be re-triaged against:

- current source/runtime state;
- current fidelity/mission contract;
- current browser/API semantics;
- current external user-intent evidence;
- historical owner/evidence saturation;
- required L1–L5 evidence for the exact current claim.

Full Cartesian expansion is still not required. New platform behaviors are introduced as explicit variants/cells inside the existing family/boundary matrix unless a genuinely independent family/root cause is proven.

## 4. Mandatory platform-delta variants to add to the Coverage Sweep

### PD1 — scroll-triggered animations

Initial families: C33/C35 with C20/C29 where scroll geometry controls phase.

Questions:

- what is the admitted sampled phase;
- does WebClip preparation/scroll/materialization advance/reset it;
- does physical PDF contain admitted phase or print-time drift;
- does hover exclusion or user-reached policy interact with the trigger.

Required: L3+L4.

### PD2 — element-scoped/nested View Transitions + `::view-transition`

Initial families: C14/C18/C33/C35.

Questions:

- old/new snapshots and transition pseudo-tree during admission;
- nested/concurrent element transitions;
- print cut while transition is active;
- generated pseudo content/geometry and rollback.

Required: L3+L4.

### PD3 — `::backdrop` and `::scroll-marker` as modern pseudo surfaces

Initial families: C14/C20/C25/C27.

Questions:

- admitted non-hover top-layer backdrop;
- generated scroll-marker content/selection state;
- page JS manipulating pseudo-elements through `CSSPseudoElement`;
- Exclude and selected-scope interaction.

Required: L3+L4.

### PD4 — scoped custom-element registries

Initial families: C16/C18 plus selection/main-content discovery where custom element identity matters.

Questions:

- same local name with distinct definitions in different tree scopes;
- shadow/frame flattening and namespace/identity preservation;
- locator/restore ambiguity;
- physical rendering after static representation.

Required: L3+L4 for visual/selection claims.

### PD5 — CSS `text-fit`

Initial families: C05/C07/C28/C29/C32.

Questions:

- source/admitted fitted typography and geometry;
- print/A4 reflow changing fit calculation;
- page count and line-break fidelity;
- responsive/container interaction.

Required: L3+L4.

### PD6 — print `page-margin-safety`

Initial families: C32 and B5/B6 print boundary.

Questions:

- whether author `@page` / margin boxes and WebClip print settings conflict;
- whether safety descriptors change content scale/placement/page count;
- whether headers/footers/marginal generated content are duplicated or lost.

Required: L3+L4.

### PD7 — Chrome 153 single-axis scroll-container semantics

State: `WATCH / NOT-YET-STABLE-REQUIRED` at kickoff.

Initial families if/when promoted: C20/C29/C31.

Promotion trigger: target stable browser support, observed production relevance, or explicit browser-support decision.

## 5. External-signal variants promoted in Cycle 2

The refreshed external map increases priority, without creating requirements from peer behavior alone, for:

### EI1 — renderer-owned form/control current state

Families: C13/C27/C39; boundaries B2→B6 and B7 when saved externally.

Controls should include current value differing from HTML attribute/default, textarea internal scroll, checked/radio/select state, and a privacy/minimization boundary for user-entered data.

### EI2 — preview/admission → persisted result equivalence

Families: C02/C03/C40/C43/C45; boundaries B2→B9.

The new campaign must not treat successful preview, preparation or `printToPDF` return as proof of the downloaded/cached/uploaded/later-opened object.

### EI3 — resource dependency rewrite/offline identity

Families: C06/C07/C08/C09/C10/C14/C21/C36.

Add CSS `@import`/nested resource-provenance cases and later-reading/offline verification where applicable.

### EI4 — bounded termination under expensive capture

Families: C37/C38.

Include large stylesheet/resource graph, dynamic page, retry/failure and truthful degraded/error controls under one shared budget model.

## 6. Initial Cycle-2 risk ranking

This ranking is provisional until the first Coverage Sweep has re-triaged all C01…C46 cells.

1. **R1 — modern renderer/platform delta (PD1–PD6)**: high coverage deficit because old Chromium-144 evidence cannot contain these stable-new variants; central to B3→B6 fidelity.
2. **R2 — form/control rendered state + privacy (EI1)**: silent corruption of user-visible/current values and potential sensitive-state mishandling; external peer evidence reinforces existing mission risk.
3. **R3 — admission/preview → persisted/later-opened identity (EI2)**: broad silent-success risk across B2→B9 and repeated external pain theme.
4. **R4 — resource/CSS dependency identity (EI3)**: physical/later-reading corruption can arise after otherwise successful capture.
5. **R5 — bounded work/failure/rollback (EI4)**: hangs and excessive preparation undermine reliability and can block research itself.
6. **R6 — prior external L5 boundaries**: C41/C42/C46 remain explicitly external; they must be re-triaged but not falsely promoted from historical managed evidence.

Tie-breaker remains silent user-visible corruption/data loss over less silent failures.

## 7. First Coverage Sweep procedure

Before selecting the first deep-dive tranche, Cycle 2 must produce a new matrix/reconciliation checkpoint that:

1. enumerates C01…C46 and PD/EI variants;
2. classifies relevance as `RELEVANT`, `INDIRECT` or `NOT-APPLICABLE`;
3. records current invariant and required evidence;
4. distinguishes historical evidence that remains valid from `REVALIDATION-REQUIRED` cells;
5. maps each finding hypothesis to existing owners/duplicate history before allocating anything new;
6. records explicit L5/external requirements;
7. ranks nonterminal cells by impact, corruption/data-loss risk, breadth, mission proximity, coverage deficit, external evidence and root-cause uncertainty.

No old family is automatically marked `ARTIFACT-COVERED` in Cycle 2 until this re-triage is performed.

## 8. Evidence and controls rules for the first tranche

The first selected tranche must define the §8 tranche envelope before experimentation:

- surface/family;
- B1→B9 boundaries;
- current contract invariant;
- exact coverage cells and platform/external variants;
- known owners / duplicate history;
- external relevance from the 2026-08-31 baseline;
- required L1–L5 evidence;
- positive, negative, contract-boundary and failure/degradation controls;
- physical artifact requirement;
- L5 requirement if any;
- termination envelope / root-cause saturation rule.

## 9. Historical evidence reuse rule

Cycle 1 evidence is valuable and should not be discarded. It can be reused when:

- current source path has not materially changed;
- product/fidelity contract is unchanged for that claim;
- browser/API semantics relevant to the exact claim have not materially changed;
- fixture assumptions remain valid;
- external boundary behavior is unchanged.

If only a new variant appeared, the old result stays evidence for the old variant while the new variant is `REVALIDATION-REQUIRED`. This avoids both extremes: pretending old evidence proves new semantics, or unnecessarily rerunning every historical fixture.

## 10. Current campaign status and next durable checkpoint

Current Cycle-2 state after this kickoff:

**`DEEP-RESEARCH-IN-PROGRESS`**.

Completed:

- fresh-state / prior delivery check;
- current research/session/external-research policy review;
- substantive multi-class external research refresh;
- current browser/platform delta scan;
- initial new-cycle variants and risk ranking;
- durable external baseline and campaign kickoff.

Next required durable checkpoint:

**Cycle-2 Coverage Sweep / Matrix v2**, followed by selection of the highest-risk nonterminal tranche under the current ranking.

The prior `RESEARCH_COVERAGE_FINAL_SYNTHESIS_2026-08-31.md` remains the final synthesis of Cycle 1 and must not be rewritten as if it described Cycle 2 completion.
