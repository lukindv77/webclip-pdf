# P1-217 — Chrome Action truth under failed current-tab reads

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-217`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`service-worker.js` Git blob at that `main`: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Research branch: `research/p1-217-action-truth-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, release state, build/tag/release are not changed.

## 1. Classification

P1-217 remains the single owner for the following root cause:

> Chrome Action must not retain a concrete icon/badge/title state derived for a previous URL when the newest current-tab/current-URL read cannot establish truth.

The defect is not a generic Chrome Action mutation-ordering bug. Existing P1-130 generation fencing already protects against an older asynchronous Action mutation regaining authority after a newer per-tab generation has been admitted. P1-217 is earlier in the state machine: the newest generation can fail while **establishing the current URL's Journal truth**, before it publishes any replacement visual state at all.

The result is a presentation-authority hole: the newest generation exists internally, but browser-owned Action state can still display a previously installed concrete statement from URL A while the tab is now at URL B.

This research confirms and deepens the historical docs-only delta `RESEARCH_DELTA_ACTION_DEGRADED_READ_STALE_URL_STATE_2026-08-28.md`, now consolidated into `project_docs/RESEARCH_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md`. That delta already assigned P1-217 and described the stale-state schedule. The present block binds the owner to current `main`, reconstructs the state machine, models tab/navigation generations explicitly, adds tab replacement and worker restart schedules, and creates a source-bound RED gate for production closure.

## 2. Current-source pipeline

### 2.1 Event admission

Current `service-worker.js` refreshes Chrome Action from several sources. The most important tab lifecycle listeners are:

- `chrome.tabs.onActivated` → `updateActionForTab(tabId).catch(() => {})`;
- `chrome.tabs.onUpdated` when URL changes or load completes → `updateActionForTab(tabId, changeInfo.url || tab?.url || '').catch(() => {})`;
- worker bootstrap → `refreshActionForAllTabs().catch(() => {})`.

Errors from the direct tab event refreshes are intentionally swallowed at the caller boundary. Therefore `updateActionForTab()` itself must leave browser-owned Action state semantically safe on every terminal path. Merely rejecting is not a safe terminal state.

No `chrome.tabs.onReplaced` listener was found in the researched source. That is not by itself proof of a production bug, because browser event composition and per-tab Action behavior must be verified physically, but it means replacement convergence has no explicit source-level owner today.

### 2.2 Existing P1-130 generation fence

Current source has:

- `actionUpdateGenerationByTab`;
- `beginActionUpdateGeneration(tabId)`;
- `isActionUpdateGenerationCurrent(tabId, generation)`;
- bounded Chrome Action mutation settlement;
- stale/late mutation repair scheduling;
- a global cap for pending actual Action promises.

This is a strong positive control. Once generation B has been admitted, a late generation-A completion cannot normally publish a newer Action mutation as if A were still current.

But this fence only decides whether a mutation is allowed. It does not guarantee that generation B publishes any visual state.

### 2.3 URL acquisition

`updateActionForTab(tabId, knownUrl = '')` begins a new Action generation. If no URL is supplied, it performs a bounded `chrome.tabs.get` read. Failure of that tab read is converted to an empty URL.

After the generation-current check, non-HTTP(S) or unavailable URL falls into an explicit neutral branch: gray icon, empty badge, generic `WebClip PDF` title.

This is an important positive control: a failure to obtain the current URL does **not** necessarily leave the previous concrete URL visual installed.

However, that generic state is not an explicit semantic distinction between:

- restricted/unavailable current URL;
- current truth still loading;
- current truth degraded because a read failed;
- proven HTTP(S) URL with no Journal history.

P1-217 requires those authority states not to collapse where product meaning depends on the distinction.

### 2.4 Journal-summary acquisition — defect boundary

For a valid HTTP(S) URL the code proceeds to an asynchronous Journal summary read:

`getJournalSummaryForUrl(url)`.

That path can depend on Journal stats health, IndexedDB access, per-URL stats lookup and a fallback rebuild. A rejection/timeout from the effective summary path propagates back to `updateActionForTab()`.

Crucially, the current function does not first publish a B-specific neutral/unknown state and does not catch a failed B summary read to settle generation B into degraded/unknown. Known icon/badge/title are derived only after successful summary establishment.

Thus a failed summary read has this shape:

```text
admit generation B
↓
prove B is still current
↓
await Journal summary(B)
↓
reject
↓
no B visual mutation
↓
caller swallows rejection
```

Browser-owned Action state is therefore not forced away from whatever visual had previously been installed.

## 3. Confirmed current-source counterexample

Deterministic schedule:

```text
T displays URL A
↓
Action refresh for A succeeds
↓
icon/badge/title encode known A Journal state
↓
T navigates to HTTP(S) URL B
↓
onUpdated admits Action generation B
↓
Journal summary read for B fails/rejects/times out
↓
updateActionForTab(B) rejects before publishing B state
↓
listener catch suppresses the error
↓
previous browser-owned A visual is not revoked by source
```

The dangerous fact is not just cosmetic staleness. Icon, badge and title encode statements such as “this URL has saved Journal history”, recency/color, or unique saved-day count. A user can therefore see a concrete statement established for A while interacting with B.

This is stronger than “refresh did not happen”: old URL-specific truth retains semantic authority after the tab context has changed.

## 4. Why P1-130 does not close P1-217

P1-130 answers:

> Can a stale/late Chrome Action mutation from generation A overtake or corrupt generation B?

P1-217 answers:

> What must be displayed when generation B itself cannot establish current truth and therefore has no successful known-state mutation to publish?

The schedules differ:

### P1-130 style

```text
A admitted G1
B admitted G2
A mutation settles late
→ generation fence rejects/repairs stale A
```

### P1-217 style

```text
A known visual already installed
B admitted G2
B current summary fails before visual publication
→ there is no stale A completion to fence
→ old installed A visual can simply remain
```

Therefore a P1-130 PASS is a positive dependency, not closure evidence for P1-217.

## 5. Neighbor owner boundaries

| Concern | Owner | P1-217 relationship |
|---|---|---|
| Per-tab Chrome Action mutation deadlines, late settlements, stale generation repair, pending cap | P1-130 | positive control / compose, do not absorb |
| All-tabs Action refresh wave, coalescing and bounded convergence | P1-170 | global fan-out concern, not current truth semantics |
| General bounded Chrome prerequisite reads | P1-158 family | may explain why a read fails; P1-217 owns what Action shows afterward |
| `urlStats` correctness/generation/rebuild | P0-050 and related Journal owners | owns derived data correctness, not presentation truth when read unavailable |
| Exact Journal URL identity / ghost scope | P1-216 | owns which rows belong to URL; P1-217 owns state when current URL truth cannot be established |
| Context-menu browser-owned state | P1-204 family | different UI object and lifecycle |

No new P-code is required.

## 6. Target Action truth model

The architecture needs an explicit semantic record, conceptually:

```text
ActionTruth {
    tabId,
    actionGeneration,
    navigationGeneration | documentKey,
    urlIdentity,
    truth:
        unknown
        | known-empty
        | known-history
        | degraded,
    journalState?,
    reason?,
    visualReceipt?
}
```

Names are not authority; semantics are.

### `unknown`

Current tab/navigation identity is known, but current Journal truth has not yet been established. It is a temporary state entered immediately when a new HTTP(S) navigation generation becomes authoritative.

### `known-empty`

The exact current URL was successfully checked and has no qualifying Journal history.

This state must never be produced as a fallback for a failed read.

### `known-history`

The exact current URL was successfully checked and the Action visual may encode its current Journal state.

### `degraded`

The current tab/navigation is authoritative, but the information required to establish current Journal truth is unavailable or failed. Reason may classify storage/read timeout, restricted URL, permission limitation, worker lifecycle interruption, or another bounded failure.

`degraded` must be neutral with respect to previous URL-specific facts. It may be visually distinct from `known-empty` where users rely on that distinction.

## 7. Core invariants

### I1 — Current-context authority

```text
ConcreteActionTruth(T)
⇒
receipt.tabId = T
AND receipt.navigation/document generation = current(T)
AND receipt.urlIdentity = current URL identity(T)
```

A concrete visual without a matching current receipt has no semantic authority.

### I2 — Revoke-before-read

When a new HTTP(S) navigation/document generation B is admitted, URL-specific truth from A loses authority **before** awaiting any fallible B read.

```text
admit(B)
→ publish unknown/neutral(B)
→ await summary(B)
```

not:

```text
admit(B)
→ await summary(B)
→ maybe publish B
```

### I3 — Failure must settle current generation

```text
failed current read(B)
→ degraded/unknown(B)
```

It must never mean “do nothing and retain previous browser state”.

### I4 — No false zero

```text
known-empty(B)
⇒
current B read completed successfully and proved empty
```

Read unavailable, timeout, permission failure, storage failure or uncertain recovery state must not be represented as a verified empty Journal.

### I5 — Latest-generation fence remains mandatory

A late completion from A cannot overwrite B known/unknown/degraded. P1-217 must compose with existing P1-130 generation fencing rather than replace it.

### I6 — Tab lifecycle revokes authority

Closing or replacing a tab must revoke transient Action truth for the old tab context. A new/replacement tab must establish its own current context before concrete truth is shown.

### I7 — Worker restart does not resurrect concrete URL truth

Module-memory receipts disappear on MV3 worker restart. After restart, browser-owned Action state must be treated as unproven until current tab/document identity is re-established. Startup refresh is a convergence mechanism, not evidence that an old concrete visual is valid.

### I8 — Bounded repair

A degraded state may schedule bounded/coalesced recovery. It must not create an unbounded wake/poll loop. Global refresh fan-out remains under P1-170.

### I9 — Action visual is one semantic vector

The following must be treated as a coherent state publication, even if Chrome exposes separate mutation APIs:

```text
icon
badge text
badge/background semantics
title
```

A repair may be required if one browser-owned mutation partially fails; that mutation convergence remains P1-130, while P1-217 determines which semantic state is allowed to converge.

## 8. Transition model

| Trigger | Previous truth | Required immediate/current truth | Later success | Later failure |
|---|---|---|---|---|
| HTTP A → HTTP B | known A | unknown B | known-empty/history B | degraded B |
| activation with URL unavailable | any | degraded current/unknown | later current refresh may replace | remain degraded boundedly |
| restricted Chrome URL | any | degraded/restricted neutral | n/a until normal URL | no prior-site truth |
| same tab A → B → C | any | unknown C after C admission | only C may become known | C degraded; A/B ignored |
| tab close | any | no authority | n/a | n/a |
| tab replacement | old tab truth | new tab unknown/degraded | new tab known | new tab degraded |
| worker restart | browser may still show something | treat as unproven; refresh current tabs | current known | current degraded |

## 9. Deterministic race schedules covered by the model

`project_tools/test_p1_217_action_truth_model.js` covers:

### A. Navigation A → B, B read fails

A known state is explicitly revoked at B admission. B ends degraded with neutral icon/badge/title semantics.

### B. A request delayed, B succeeds first

Late A cannot overwrite B known state.

### C. A request delayed, B fails

B ends degraded; late A still cannot replace it.

### D. Rapid A → B → C

Only the last navigation/document generation has authority.

### E. Tab closed/replaced before completion

Old completion has no tab-context authority; replacement establishes an independent context.

### F. Service-worker restart

A previous worker's concrete truth is not copied into the new worker's authority model. Live current tabs re-enter unknown first and then known/degraded based on new evidence.

### G. Current URL unavailable / restricted page

State is explicit neutral/degraded, not the previous site.

### H. Permission/read failure versus verified empty

`known-empty` and `degraded` are distinct semantic states and distinct titles in the model.

The model also embeds a legacy-shape counterexample showing that a failed B read which publishes nothing leaves the installed A visual unchanged.

## 10. Source-bound RED gate

`project_tools/test_p1_217_action_truth_source.js` is intentionally a production-closure gate, not a claim that runtime is already repaired.

It preserves positive controls for P1-130 and requires the future production source to prove:

1. existing per-tab Action generation fencing remains present;
2. current HTTP(S) navigation publishes explicit unknown/neutral truth before awaiting Journal summary;
3. current Journal-summary failure is caught and settles current generation into degraded/unknown;
4. `known-empty` is explicit and not conflated with degraded/read-unavailable;
5. an explicit per-tab Action truth/receipt record exists;
6. that receipt is bound to URL identity and navigation/document generation;
7. tab removal revokes the truth receipt;
8. tab replacement has explicit source-level reconciliation, unless the gate is deliberately replaced by an equivalent source-proven lifecycle mechanism backed by physical Chrome evidence;
9. worker bootstrap refresh remains as a positive convergence path.

On current `main`, source inspection shows the first group of P1-130 positive controls exists but the P1-217 target contract is absent. Therefore the expected semantic result of the source gate is RED until production implementation is made.

## 11. Specific current-source findings

### Confirmed defect

For HTTP(S) current URLs, failure of the Journal summary path can reject `updateActionForTab()` before the current generation publishes any new visual state. Event callers swallow that rejection. The source therefore does not revoke prior browser-owned URL-specific icon/badge/title authority on this failure path.

### Positive control: unavailable URL

When `chrome.tabs.get` cannot supply a current URL, source converts the URL to empty and enters an existing neutral branch. This already demonstrates the correct broad principle: lack of current URL evidence should not imply previous site truth.

### Positive control: non-HTTP(S)

Restricted/non-HTTP(S) pages receive neutral icon, empty badge and generic title. The missing piece is explicit semantic differentiation and the analogous failure settlement after a valid HTTP(S) URL's Journal read fails.

### Positive control: late completion fencing

The existing generation map prevents many late A completions after B/C admission. P1-217 should reuse that generation rather than invent an unrelated ordering mechanism.

### Gap: tab replacement

No `chrome.tabs.onReplaced` hook was found in current source. The deterministic model treats replacement explicitly. Physical Chrome E2E is required to determine whether an explicit handler is mandatory or whether another browser event sequence plus current-identity validation is sufficient.

### Gap: worker restart

Startup calls `refreshActionForAllTabs()`, but a refresh still enters the same fallible current-summary path. If Chrome preserves an old per-tab Action visual across worker restart and the new summary read fails, source has no P1-217 failure settlement. Whether and how Chrome preserves the visual must be treated as browser-owned behavior requiring physical E2E, not inferred solely from JavaScript.

## 12. Recommended production architecture direction

This research does not modify runtime. A future minimal patch should prefer central state publication over scattered icon/badge/title fallback logic.

Conceptually:

```text
beginActionContext(tabId, currentUrl/document)
→ record generation + URL/document identity
→ publish unknown immediately for HTTP(S)
→ perform bounded/current summary read
→ if generation still current:
     success empty   → publish known-empty
     success history → publish known-history
     read failure    → publish degraded
```

Each publication should use the existing bounded Action mutation wrappers and P1-130 stale-generation checks.

A useful implementation decomposition is:

```text
admitActionTruthContext(...)
publishActionTruthUnknown(...)
publishActionTruthKnown(...)
publishActionTruthDegraded(...)
revokeActionTruthForTab(...)
```

Exact names are not prescribed. The key requirement is one semantic transition owner for icon, badge, background and title.

Do not implement `known-empty` as a generic catch fallback. Do not infer current exact URL truth from hostname/title/site identity. Do not durably restore a concrete Action truth across worker restart without a current tab/document receipt.

## 13. Production closure criteria

P1-217 should remain `ACTIVE` after this research block. Production closure requires at least:

1. minimal runtime implementation in an implementation branch, based on a fresh canonical `main`;
2. `node --check` on changed JavaScript;
3. deterministic P1-217 model PASS from committed blob;
4. P1-217 source gate PASS from exact checkout against the committed runtime blob;
5. existing P1-130 Action generation/deadline regression remains PASS;
6. any P1-170 all-tabs coalescing dependency stays independently valid;
7. physical Chrome/Yandex-browser E2E for browser-owned Action behavior;
8. explicit coverage of icon, badge, badge/background semantics and title;
9. explicit A→B read-failure test proving no A truth remains;
10. tab replacement test;
11. MV3 worker restart test;
12. restricted/unavailable URL test;
13. verified-empty versus read-unavailable UX distinction test;
14. Registry status change only after implementation/test evidence is committed according to project methodology.

## 14. Physical E2E requirement

Physical Chrome E2E is required for closure.

The deterministic model proves the desired state-machine invariant. The source gate can prove that JavaScript has the required transitions. Neither proves browser-owned persistence and rendering behavior across:

- real navigation;
- tab replacement;
- service-worker termination/restart;
- partial `chrome.action` API failures;
- restricted pages;
- actual icon/badge/title rendering and retention.

Those are observable Chrome behaviors and must be tested physically before P1-217 can be called production-closed.

## 15. Validation record for this research block

Research branch artifacts:

- `project_tools/test_p1_217_action_truth_model.js`;
- `project_tools/test_p1_217_action_truth_source.js`;
- `project_docs/RESEARCH_P1_217_ACTION_TRUTH_2026-09-08.md`.

Model committed blob SHA after first commit: `b6ba87c668506fdfd9c8f32cc2fb8871e198a58d`.  
Source gate committed blob SHA after second commit: `f94a81f309572ba7d1cbd48e5458d2c843406f59`.

The model was locally syntax-checked and executed before commit. Its local Git blob hash was calculated as `b6ba87c668506fdfd9c8f32cc2fb8871e198a58d`, exactly matching the committed GitHub blob fetched after commit. Therefore that execution is valid evidence for the exact committed model blob:

```text
P1-217 current-shape counterexample: stale A survives failed B refresh
P1-217 Action truth deterministic model: PASS
```

The source gate was locally syntax-checked before commit and its local Git blob hash was `f94a81f309572ba7d1cbd48e5458d2c843406f59`, exactly matching the committed GitHub blob fetched afterward.

However, the environment could not obtain an exact local checkout/materialization of `service-worker.js` because direct GitHub network access from the execution container was unavailable. Therefore the committed source gate is **not claimed as functionally executed against the exact current production source** in this research block. Its expected RED status is supported by direct GitHub source inspection, not by a falsely claimed local source-gate run.

This distinction is intentional:

```text
model PASS (exact committed blob, actually executed)
≠
source gate PASS/RED execution evidence
≠
production PASS
≠
physical Chrome E2E
```

## 16. Registry and release state

No Registry status change is made by this research. `P1-217` remains `ACTIVE` until production closure.

No production source is changed. `manifest.json` is unchanged. Release state is unchanged. No build, tag, GitHub Release or deployment is performed. Release remains NOT READY under the existing project state.

## 17. Next owner

After final fresh-check of canonical `main` and Registry, the next sequential ACTIVE owner is expected to be `P1-218` — temporary resource-attribute rollback. It should be started only if fresh Registry state still assigns that root cause and there is no already-saturated research branch for it.
