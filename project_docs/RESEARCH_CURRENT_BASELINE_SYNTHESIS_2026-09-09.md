# WebClip — current-baseline comprehensive research synthesis — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md`  
Release-readiness authority: `project_docs/RELEASE_READINESS.md`  
Research mode: **RESEARCH-ONLY**

Exact current evidence heads used by this synthesis:

- PD7 / external baseline / reconciliation: `research/pd7-single-axis-scroll-stable-2026-09-09@f60ea13141c4f0f54fc998a5ff9c4f7fa0d36037`;
- P1-184 / C42: `research/p1-184-yandex-upload-content-receipt-2026-09-06@9efe631c640cec1274340179a815ac33d41021d8`.

This document is a project-wide research synthesis. It does **not** change production runtime, manifest, Registry owner/status, version, release readiness, build/tag/release or deployment.

## 1. Current project-wide state

The strongest truthful research state is:

```text
DEEP-RESEARCH-IN-PROGRESS
/ C42 SOURCE+MODEL TERMINALIZED AS EXTERNAL-REQUIRED
/ PD7 TARGET-BROWSER REVALIDATION STILL OPEN
```

This is narrower than the preceding reconciliation state `RECONCILIATION-BLOCKED` because C42 is no longer `NOT-TRIAGED / UNKNOWN`.

C42 now has:

```text
DETERMINISTIC-COVERED / FINDING (P1-184) + POSITIVE CONTROLS
EXTERNAL-REQUIRED for real Yandex checksum/object/public-link semantics
```

PD7 remains:

```text
REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE
```

because a feature-active/current-target Chrome receipt has not been executed. No lower evidence level is substituted for that renderer claim.

Therefore a new unconditional `DEEP-RESEARCH-COVERAGE-COMPLETE` declaration is still not made in this synthesis.

## 2. Research completeness vs implementation completeness

The project now has broad research saturation across C01…C46. Most cells have fresh source/L2/L3/L4 evidence, confirmed findings, owner mapping and explicit residual boundaries.

This does not mean implementation is close to complete. Registry still contains many ACTIVE P0/P1 owners.

The correct separation is:

```text
research coverage: broad, nearly reconciled
implementation closure: materially incomplete
release readiness: NOT READY
```

A proven finding can be research-terminal while its owner stays ACTIVE. A real external/native boundary can also be terminal only when the exact missing environment and receipt are bounded.

## 3. User-journey synthesis B1–B9

### B1 — User Intent

**State: PROVEN/PARTIAL.**

The product contract is substantially explicit: preserve the user's selected/admitted content truthfully, including bounded user-reached dynamic history, without silently expanding beyond authority.

Residual implementation risks are not ambiguity of mission but exact enforcement: Include/Exclude budget coherence, auto-discovery boundedness, stale selection/application generation and page-owned interaction semantics.

Primary owners include P1-154, P1-160, P0-075 and P0-080.

### B2 — Admission / exact generation

**State: BROKEN/PARTIAL.**

This remains one of the highest-risk architectural regions. Exact page/document/frame/application/save generation must survive asynchronous browser/API operations and later settlement.

Key owners include:

- P0-070 — exact full save generation end-to-end;
- P0-080 — same-document SPA/application generation distinct from browser documentId;
- P1-125/P1-171/P1-175/P1-198/P1-200/P1-203/P1-210 — exact injection/frame/operation/session authority;
- P1-217 — Action truth bound to current tab/URL/document context.

The common architecture theme is **receipt/generation authority**, not ad-hoc timestamp or URL equality.

### B3 — Capture

**State: PARTIAL with broad L3/L4 evidence.**

Ordinary DOM/text is strong, but complex selected visual truth still has confirmed owners:

- P1-001 — rendered-target restore admission;
- P1-003 — actual selected visual resource graph/readiness;
- P1-004/P1-171/P1-200/P1-229 — cross-origin frame authority/representation;
- P1-154/P1-167/P1-168/P1-228 — scope, work and geometry budgets;
- P1-230 — user-reached dynamic/virtualized history.

Current mounted DOM alone is not a universal proxy for admitted logical content.

### B4 — Static Materialization

**State: BROKEN/PARTIAL.**

A large family of current findings is one architectural class: WebClip temporarily changes page-owned DOM/style/resource state and later tries to restore it after the host may have changed the same state.

Important owners:

- P0-004 — selected fidelity and ancestor presentation/clipping;
- P0-075 — host page is not trusted control plane;
- P1-218 — resource-attribute compare-before-restore;
- P1-219 — wrapper topology rollback;
- P1-220 — exact generated header-node cleanup;
- P1-221 — private exact link-normalization receipt;
- P1-224 — frame/ancestor style-marker compare-before-restore.

The architectural direction is **operation-owned reversible mutation receipts + compare-before-restore + generation fencing**, not broad blind rollback.

### B5 — Renderer

**State: PARTIAL; one current Change Impact unresolved.**

There is extensive physical Chrome/PDF evidence for pagination, clipping, iframe, resources, temporal state and controls. Remaining important owners include P0-004, P1-003, P1-150, P1-187 and P1-229.

PD7 reopens a targeted renderer assumption for C20/C31 and supporting C22/C23/C29: scroll-container semantics can become axis-specific.

The committed PD7 harness already accepts `CHROME_BIN` and records feature detection, computed overflow, programmatic scroll settlement, sticky geometry and raw/normalized PDF rows. The missing evidence is a suitable feature-active/current-target Chrome execution, not another source hypothesis.

### B6 — Physical Artifact

**State: PROVEN/PARTIAL.**

Physical PDF is routinely used as evidence rather than inferred from source. Many ordinary and complex cases have L4 controls.

However a physical PDF can still be a truthful artifact of the wrong admitted generation, truncated selected representation or wrong remote/local byte generation. Therefore B6 must compose with B2/B3/B7 and cannot be treated as a standalone success flag.

Key remaining owners include P0-004, P0-023, P0-070, P0-079, P1-150 and P1-187.

### B7 — Persistence / Transfer

**State: BROKEN/PARTIAL; high silent-corruption priority.**

Local and Yandex flows both involve non-cancellable or externally settled side effects.

Critical owners include:

- P0-023 — exact source-document generation in PDF retry cache;
- P0-073/P0-074 — immutable Yandex account/root/config operation scope;
- P0-078 — publication policy generation;
- P0-079 — immutable operation-owned PDF bytes;
- P1-146 — unknown automatic-download start settlement;
- P1-156 — durable native Save As lifecycle;
- P1-184 — exact remote content/object receipt.

C42 now proves the central remote defect: current `path + exact size` reuse/recovery is not exact content identity.

### B8 — Journal / Provenance

**State: BROKEN/PARTIAL.**

The Journal has strong generation/CAS/backup evidence but still contains multiple active consistency and scalability owners.

High-impact owners include:

- P0-050 — versioned urlStats rebuild;
- P0-076 — per-entry revision + Journal-generation CAS;
- P1-009/P1-162/P1-174 — scalable search/tree/card materialization;
- P1-185/P1-186 — imported temporal/comment identity domains;
- P1-190 — imported operationId is historical, not live authority;
- P1-206 — exact composed view revision;
- P1-216 — one derived URL identity domain across legacy/modern rows.

Journal success must prove the exact artifact/operation generation, not merely that a row now exists.

### B9 — Later Reading / Recovery

**State: BROKEN/PARTIAL with explicit external boundaries.**

Recovery is a first-class architecture, not cleanup. Important owners include:

- P0-072 — bulk clear/replace cannot pretend admitted external effects were cancelled;
- P1-035 — live staging lease/generation;
- P1-064/P1-208 — fair bounded recovery progress;
- P1-076 — lease remains valid across resumable side effects;
- P1-183/P1-184 — exact destructive/upload remote receipts;
- P1-194 — truthful durability class under browser storage eviction;
- P1-207 — backup freshness bound to exact Journal revision.

P1-215 is a positive control showing the desired pattern for staged import: durable renewable lease, restart resume/cancel, exact receipt and revision authority.

## 4. Highest-risk root-cause clusters

### Cluster A — exact saved-artifact identity across the whole operation

**Priority: highest.**

This cluster can silently produce a valid-looking PDF/remote object/Journal record for the wrong generation or wrong bytes.

Composition:

```text
P0-070 save generation
+ P0-023 local retry-cache document generation
+ P0-079 immutable operation-owned PDF bytes
+ P0-073/P0-074 Yandex namespace/context
+ P1-184 exact remote content receipt
+ P0-078 publication policy
+ P0-076 Journal finalization authority
```

This should be treated as one end-to-end architecture program with separate owner closure, not independent cosmetic fixes.

### Cluster B — stale asynchronous settlement and blind rollback

**Priority: highest.**

Repeated current findings share the same shape:

```text
A admits/mutates
host/user/new generation B changes state
late A settles/restores/writes
A overwrites B
```

Owners span P0-076, P1-173, P1-198, P1-210, P1-217, P1-218, P1-219, P1-220, P1-221, P1-222, P1-223, P1-224 and P1-225.

The architectural remedy family is generation-owned receipts, latest-authority checks, compare-before-restore and explicit unknown outcomes.

### Cluster C — selected PDF fidelity under bounded work

**Priority: highest user-visible fidelity risk.**

P0-004 is the broad selected-fidelity owner. It composes with P1-003, P1-150, P1-154, P1-167, P1-187, P1-228, P1-229 and P1-230.

The requirement is not “copy more DOM”. It is:

```text
preserve exactly admitted rendered/logical content
under explicit node/byte/time/resource bounds
or report truthful partial/degraded/unknown
```

PD7 is a Change Impact on this cluster, not a new root cause.

### Cluster D — external/browser side-effect settlement

**Priority: high.**

Chrome downloads, native Save As, tabs/script injection, permissions and Yandex API calls can settle after local timeout or worker restart.

Key owners include P1-124/P1-125/P1-146/P1-156/P1-157/P1-166/P1-170/P1-193/P1-201/P1-203/P1-204/P1-210.

A caller timeout is not cancellation evidence.

### Cluster E — defensive privacy/trust boundaries

**Priority: high.**

Important owners:

- P0-045 — incognito isolation;
- P0-066 — durable/display URL confidentiality sanitizer;
- P0-075 — host page not trusted UI/control plane;
- P1-165 — OAuth returned-state verification;
- P1-172/P1-176 — bounded/sanitized inputs before page/IPC;
- P1-182 — privacy-preserving durable locators;
- P1-202/P1-211 — deleted comment retention/capacity lifecycle.

This remains defensive security only: protect sensitive state and authority, not exploit external systems.

### Cluster F — scale/budget/fairness

**Priority: medium-high after silent-corruption owners.**

Owners include P1-009, P1-035, P1-043, P1-064, P1-160, P1-162, P1-163, P1-167, P1-168, P1-173, P1-174, P1-192 and P1-208.

The common rule is bounded admission **before** expensive materialization, plus fair progress across durable queues.

## 5. Recommended implementation/closure sequence

This is research prioritization, not authorization to change production.

### Wave 1 — exact artifact/generation chain

Close the highest silent-wrong-artifact risk first:

1. P0-079 operation-owned PDF cache generation;
2. P0-070 exact save generation composition;
3. P0-073/P0-074 immutable Yandex context;
4. P1-184 exact remote content receipt with validated SHA-256 fast path + bounded fallback;
5. P0-078 publication after exact-content proof;
6. P0-076 exact Journal finalization CAS.

Every implementation needs a Closure Sweep across B2/B6/B7/B8/B9.

### Wave 2 — destructive/recovery concurrency

Prioritize P0-072, P0-076, P1-183, P1-090, P1-164, P1-179, P1-207/P1-208 and related operation-receipt owners.

Goal: no clear/import/delete/move/retry path may infer cancellation or object identity from absence, path or stale row identity.

### Wave 3 — selected fidelity and reversible preparation

P0-004 plus P1-218/P1-219/P1-220/P1-221/P1-224 should be handled as one rollback architecture family, then revalidate P1-003/P1-150/P1-187/P1-229/P1-230 and PD7-affected cells.

### Wave 4 — native/browser external settlement

P1-146, P1-156, P1-157, P1-193, P1-201 and related Chrome API receipt owners require real unpacked/native evidence, not managed-only claims.

### Wave 5 — scale and interaction polish

After silent-corruption and authority risks are reduced, address Journal/discovery/parser/render performance and fairness owners.

## 6. C42 result incorporated

C42 is no longer an untriaged coverage hole.

Exact branch evidence proves:

- current same-path/same-size adoption defect maps to P1-184;
- operation-owned SHA-256 is the required content truth;
- current YaDisk 3.4.1 strongly corroborates `sha256/md5/resource_id/revision` metadata fields;
- Yandex historical official SDK confirms hash semantics existed in provider upload flows;
- metadata SHA-256 may be a fast path only after real current L5 validation;
- bounded remote download + SHA-256 remains provider-agnostic fallback;
- real private/public RID/revision/checksum relationships remain explicitly L5.

No new P-code is needed.

## 7. PD7 remains the sole current research-reconciliation blocker

The exact required next receipt already exists as an executable harness contract.

Run the committed PD7 harness on the selected current target browser with `CHROME_BIN` and record:

```text
browser executable/version/channel
named-feature(single-axis-scroll-container) support
computed overflow X/Y
programmatic clipped-axis settlement
sticky geometry
raw PDF rows
static-normalized PDF rows
```

A feature-detection false result on the selected Stable target is itself valid bounded evidence. A true result requires the full PD7 schedules/expected semantics.

Until that receipt exists, current project state remains research-in-progress rather than a newly declared coverage-complete checkpoint.

## 8. What should not happen next

Do **not**:

- allocate P1-231 merely because the campaign is long;
- restart C01…C46 from zero;
- treat every ACTIVE owner as an unresearched coverage gap;
- use old Chrome release notes as renderer PASS;
- use path+size/resourceId/revision as exact Yandex content proof;
- change Registry status from research/model evidence alone;
- claim release readiness from managed/model evidence.

## 9. Release state

Canonical release declaration remains:

```text
NOT READY
manifest = 0.9.8
target WIP = 0.9.9
unpacked Chrome QA = pending
Yandex E2E = pending
release-blocker review = pending
explicit release decision = pending
```

No build/tag/GitHub Release/deployment is justified by this synthesis.

## 10. Research conclusion

The project is no longer in an exploratory state where the main problem is discovering what to research.

The dominant problem is now **implementation and exact closure of known authority/identity/fidelity root causes**, plus one targeted renderer Change Impact (PD7) and several explicitly bounded real external/native release boundaries.

Current deep-research direction is therefore:

```text
1. obtain PD7 exact target-browser receipt;
2. perform Coverage Reconciliation again;
3. if no newly stale/nonterminal CORE cell remains, declare DEEP-RESEARCH-COVERAGE-COMPLETE;
4. continue risk-ranked implementation + Closure Sweeps independently;
5. keep RELEASE-READY as a separate real-external gate.
```
