# P1-217 — Chrome Action current-truth refinement

Date: 2026-09-11  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-217`  
Registry status: `ACTIVE`  
Canonical baseline researched: `81ea6b9e2679e09de765651c577e7274941dad00`  
Current `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Current `manifest.json` Git blob: `259a7c3706e78c1a22021db7dc4769e8accdfb3e`  
Manifest version: `0.9.8`  
Research branch: `research/p1-217-action-truth-refinement-2026-09-11`

Scope is research/model evidence only. Production runtime, manifest/version, release readiness, release policy, release receipts, package/tag/Release/deploy and P1-231 S2 authority are unchanged.

Hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner

Canonical Registry wording on the researched baseline:

> `P1-217 | ACTIVE | Chrome Action requires explicit unknown/degraded truth; failed current read cannot leave previous URL's icon/badge/title on the tab.`

P1-217 remains the owner. No new P-code is required.

The root cause is presentation authority, not generic mutation ordering:

> a concrete Chrome Action projection must not continue to communicate previously proven Journal truth after the current tab/URL refresh has become authoritative but current truth cannot be established.

P1-130 remains the owner for bounded Chrome Action mutation settlement, stale mutation completion and repair. P1-170 remains the owner for bounded/coalesced all-tabs refresh waves. P1-216 owns exact Journal URL membership. P0-080 owns same-document application/selection generation. P1-217 only owns what the browser toolbar may truthfully communicate when the current Action read is pending, unavailable or failed.

## 2. Historical provenance, not import authority

Historical branch:

`research/p1-217-action-truth-2026-09-08`

Fresh compare against canonical `main` on 2026-09-11:

- merge base: `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- historical branch ahead by 3 commits;
- historical branch behind current main by 50 commits;
- historical files: one evidence document and two JS models/gates.

Therefore the branch is provenance only. It is not cherry-picked wholesale.

The historical evidence bound `service-worker.js` to the same blob now present on current main:

`6d61ac81befdbf2804ae9dbec425aa08d1194eb1`

This means the WebClip Action implementation itself has not changed since the historical P1-217 research, but external Chromium revalidation below corrects an over-broad historical failure schedule and simplifies the target architecture.

## 3. Current WebClip source

### 3.1 Existing P1-130 positive controls

Current worker has:

- `actionUpdateGenerationByTab`;
- `beginActionUpdateGeneration(tabId)`;
- `isActionUpdateGenerationCurrent(tabId, generation)`;
- `runChromeActionMutationBounded(...)`;
- `applyChromeActionMutationBestEffort(...)`;
- pending actual-settlement cap;
- late settlement repair scheduling.

These mechanisms are important and must remain. They prevent many older asynchronous Action mutations from overtaking a newer admitted generation.

They do not decide what semantic state the newest generation must publish before a fallible read.

### 3.2 Current event admission

Current worker registers:

```js
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionForTab(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateActionForTab(tabId, changeInfo.url || tab?.url || '').catch(() => {});
  }
});
```

Thus every observed URL change already admits a new WebClip Action generation, including URL-only changes reported through `changeInfo.url`.

The event boundary intentionally swallows refresh rejection. Therefore `updateActionForTab()` must itself leave browser-owned presentation in a truthful state on every terminal path; throwing is not a semantic settlement.

### 3.3 Current URL acquisition positive control

`updateActionForTab()` begins a new generation and, when a URL was not supplied by the event, performs bounded `chrome.tabs.get` through `getChromeTabBounded(...)`.

If URL acquisition fails, current source converts the URL to empty. Non-HTTP(S) / unavailable URL then publishes a neutral icon, empty badge and generic `WebClip PDF` title.

This is already the correct broad safety principle:

> absence of current URL evidence does not authorize retaining a prior site-specific visual.

### 3.4 Current HTTP(S) gap

For an HTTP(S) URL, current source does this before any new Action visual mutation:

```js
const summary = await getJournalSummaryForUrl(url);
```

Only after the read succeeds does it derive recency color, badge count and title and call `chrome.action.setIcon`, `setBadgeText`, `setBadgeBackgroundColor` and `setTitle`.

`getJournalSummaryForUrl()` may fail through IndexedDB open/read/rebuild paths. If it rejects, `updateActionForTab()` rejects before publishing any current-generation neutral/degraded HTTP(S) state, and the event caller suppresses the error.

This is the remaining source-level gap.

## 4. Important correction: ordinary cross-document navigation is already a Chromium positive control

The historical 2026-09-08 P1-217 evidence used an over-broad deterministic counterexample:

```text
URL A has known Action visual
-> tab navigates to ordinary URL B
-> B Journal read fails
-> no B Action write
-> A visual remains
```

Fresh Chromium revalidation shows this is not generally correct for a committed cross-document main-frame navigation.

Current Chromium source (`chrome/browser/extensions/extension_action_runner.cc`, tag `148.0.7778.39`) implements:

```cpp
if (!navigation_handle->IsInPrimaryMainFrame() ||
    !navigation_handle->HasCommitted() ||
    navigation_handle->IsSameDocument()) {
  ...
  return;
}
...
ExtensionActionDispatcher::Get(browser_context_)
    ->ClearAllValuesForTab(web_contents());
```

So Chromium clears extension Action per-tab values after committed primary-main-frame **cross-document** navigation and explicitly does **not** do that for same-document navigation.

Chromium's `ExtensionAction::ClearAllValuesForTab()` erases tab-specific popup/title/icon/badge text/badge colors/visibility values. This is browser-owned revocation independent of WebClip's service-worker code.

Chrome's public `chrome.action` reference also says tab-specific settings are automatically reset when the tab closes. MDN additionally documents navigation reset for several per-tab action properties. Chromium source gives the more precise implementation boundary needed here: committed cross-document navigation clears values; same-document navigation is excluded.

Therefore P1-217 must not claim that ordinary cross-document navigation necessarily preserves stale A state. That schedule is retired as an over-broad proof.

## 5. Confirmed residual failure: same-document / SPA URL generation

The corrected deterministic schedule is:

```text
1. Tab T is at https://app.example/items/1 (URL A).
2. WebClip successfully publishes concrete A truth, for example badge `7`.
3. The site performs same-document navigation to /items/2 (URL B), e.g. history.pushState/replaceState or another same-document URL transition.
4. Chromium does not ClearAllValuesForTab because IsSameDocument() is true.
5. chrome.tabs.onUpdated reports changeInfo.url = B.
6. WebClip admits a new Action generation B and calls updateActionForTab(T, B).
7. getJournalSummaryForUrl(B) rejects/times out before any current-generation visual publication.
8. updateActionForTab rejects; the listener catches and suppresses it.
9. Browser-owned concrete A icon/badge/title remains visible while the tab URL is B.
```

This is exactly the Registry root cause after correcting the platform boundary.

It is especially relevant to modern SPA applications because tab identity and browser document lifetime can remain stable while URL identity changes.

P0-080 owns the broader same-document application-generation problem for selection/save authority. P1-217 does not absorb that owner. Here the only required fact is that URL identity B has become the current Action scope and A-specific toolbar truth must lose authority before the B Journal read can fail.

## 6. Additional current-read failure schedule on the same URL

There is a second schedule that does not require URL A != URL B:

```text
1. Current URL U has a previously proven Action projection.
2. Journal state for U is mutated or an explicit refresh is admitted.
3. A new Action generation for U starts.
4. Current Journal summary revalidation fails.
5. No replacement visual is published.
6. The old concrete projection remains visible even though its current validity is unknown.
```

This is the same root cause: older concrete truth retains authority after a newer current read has failed.

The Registry wording emphasizes the previous-URL case because that is the clearest harmful presentation error; the architecture should nevertheless define current-read failure consistently for both different-URL and same-URL refreshes.

## 7. MV3 restart refinement: do not make Action projection durable authority

Fresh Chrome service-worker documentation states:

- extension service workers are terminated when idle;
- global variables are lost on shutdown;
- important application state must be persisted rather than relying on globals;
- extensions must tolerate unexpected termination.

Current WebClip keeps `actionUpdateGenerationByTab` in module memory, so that generation fence naturally starts fresh after worker restart.

However Chrome Action state is browser-owned per-tab UI state, not a worker-global variable. Public Action API semantics tie per-tab state reset to tab lifecycle; Chromium stores it in browser-side `ExtensionAction` structures. There is no platform rule that service-worker termination itself revokes the browser toolbar visual.

The historical P1-217 design therefore overreached by requiring a durable Action truth receipt as if the projection itself were durable business authority.

The refined rule is simpler:

> Chrome Action is a re-derivable browser-owned projection. Persist the underlying Journal/business authority, not the projection. After any worker start/current refresh, treat the existing browser visual as unproven and overwrite it with a current-generation neutral state before the first fallible Journal read.

A worker-local desired-state/receipt map may be useful for P1-130 repair, but P1-217 does not require a new durable per-tab authority store.

If startup tab census itself fails or a global refresh cannot cover all tabs, bounded convergence belongs to P1-170. P1-217 only defines the truth state that a successfully admitted tab refresh is allowed to publish.

## 8. Refined semantic domain

A minimal conceptual model is:

```text
ActionProjection {
  tabId,
  actionGeneration,
  urlIdentity,
  truth:
      not-applicable
    | unknown
    | known-empty
    | known-history
    | degraded,
  reason?,
  journalSummary?
}
```

This is conceptual semantics, not a requirement to add a durable schema.

### `not-applicable`

Current URL is known but is outside the HTTP(S) Journal domain, e.g. a restricted/internal URL. Projection is neutral and must not carry prior site-specific truth.

This is not the same as a failed HTTP(S) read.

### `unknown`

Current HTTP(S) URL identity is admitted, but current Journal truth has not yet been established.

This should be published **before** awaiting the current Journal summary.

### `known-empty`

A successful current read proves there is no qualifying history for the exact current URL identity.

Read failure must never fabricate this state.

### `known-history`

A successful current read proves qualifying history and may publish recency/count semantics.

### `degraded`

Current HTTP(S) context is known, but current Journal truth cannot be established because the read/rebuild path failed or timed out.

It must be neutral with respect to older concrete URL facts and distinguishable from `known-empty` at least semantically. Exact icon/text design is an implementation/UI choice.

## 9. Core invariants

### I1 — concrete truth requires current evidence

```text
truth in {known-empty, known-history}
=>
summary read succeeded for the exact current urlIdentity and current actionGeneration
```

### I2 — revoke before a fallible read

For an admitted HTTP(S) current context:

```text
admit generation G / URL U
-> publish unknown-neutral(G,U)
-> await Journal summary(G,U)
-> publish known/degraded only if G is still current
```

Never:

```text
admit G/U
-> await summary
-> maybe publish
```

### I3 — failure is a state, not absence of work

```text
current summary failure(G,U)
-> desired projection = degraded(G,U)
```

It must not mean “leave whichever concrete browser visual existed previously”.

### I4 — no false zero

`known-empty` requires successful evidence. Timeout, IndexedDB failure, rebuild failure or unknown settlement cannot be rendered as a verified empty Journal.

### I5 — same-document URL changes revoke URL-specific authority

Every observed `changeInfo.url` that changes URL identity admits a new Action generation, even when Chromium keeps the same document and therefore does not reset per-tab Action state.

### I6 — cross-document reset is a positive control, not WebClip authority

Browser clearing on cross-document navigation reduces stale-state exposure, but WebClip should still implement the same neutral-first semantic state machine so correctness does not depend on subtle browser timing and so same-document/restart paths are covered.

### I7 — projection is re-derived after worker restart

No old toolbar visual becomes current authority merely because it survived worker teardown. A new worker refresh re-establishes `unknown -> known/degraded` from current evidence.

### I8 — latest generation still fences late settlement

P1-130 generation checks remain mandatory. An older A summary or Action mutation cannot overwrite B/C projection after a newer generation is admitted.

### I9 — semantic vector publication composes with P1-130

Icon, badge text/background and title form one semantic vector even though Chrome exposes separate calls. P1-217 defines the desired semantic state. Partial browser mutation failure, actual settlement and repair remain P1-130.

### I10 — bounded global recovery remains P1-170

P1-217 does not introduce polling or unbounded worker wakeups. If a startup/global refresh cannot enumerate or repair all tabs, P1-170 owns bounded convergence.

## 10. Tab replacement correction

Chrome documents `chrome.tabs.onReplaced(addedTabId, removedTabId)` for prerender/instant replacement.

Current WebClip source has no explicit `tabs.onReplaced` Action hook.

The historical P1-217 source gate required an `onReplaced` listener as the only acceptable closure. That is too prescriptive. Browser replacement may itself destroy/clear the old per-tab state and other tab lifecycle events may provide sufficient convergence.

Refined acceptance is behavioral:

> after tab replacement, the added/current tab must not display concrete Journal truth unless it has been established for the replacement context; an explicit `onReplaced` handler is one possible mechanism, not the only valid architecture.

Physical current-Chrome evidence is required before declaring replacement lifecycle closure.

## 11. External research

Fresh external review was performed on 2026-09-11.

### Chromium source — current Action reset boundary

`https://chromium.googlesource.com/chromium/src/+/refs/tags/148.0.7778.39/chrome/browser/extensions/extension_action_runner.cc`

Direct implementation evidence:

- committed primary-main-frame cross-document navigation clears Action per-tab values;
- `navigation_handle->IsSameDocument()` returns before that clear;
- WebContents destruction also clears Action state.

This is the decisive correction to the historical broad navigation schedule.

### Chromium `ExtensionAction`

`https://chromium.googlesource.com/chromium/src.git/+/HEAD/extensions/browser/extension_action.cc`

`ClearAllValuesForTab()` erases tab-specific title, icon, badge text/colors and related values.

### Chrome Action API

`https://developer.chrome.com/docs/extensions/reference/api/action`

Confirms:

- Action has browser-managed per-tab state;
- tab-specific values override global values;
- per-tab settings reset when a tab closes.

The public docs do not fully spell out the same-document navigation distinction, so Chromium source is used for that exact implementation boundary.

### Chrome Tabs API

`https://developer.chrome.com/docs/extensions/reference/api/tabs`

Confirms:

- `tabs.onUpdated` exposes `changeInfo.url` when the tab URL changes;
- `tabs.onActivated` can fire before a URL is available;
- `tabs.onReplaced` exists for replaced tabs.

These behaviors map directly to current WebClip event admission.

### Chrome extension service-worker lifecycle

`https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

Confirms extension service workers are ephemeral and globals are lost on termination. This supports re-deriving projection state instead of treating a worker-local map as durable authority.

### MDN WebExtensions Action documentation

`https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/setBadgeText`

MDN describes navigation reset for tab-specific Action values. This is directionally consistent with the Chromium cross-document reset, but is less precise about same-document behavior. It is therefore comparison evidence, not the primary Chrome implementation proof.

## 12. Current target architecture

A future minimal implementation should prefer a central semantic publisher, conceptually:

```text
refreshAction(tabId, observedUrl?)
  -> begin current P1-130 generation G
  -> establish current URL U
  -> if U not applicable:
       publish not-applicable neutral(G,U)
       return
  -> publish unknown neutral(G,U) BEFORE Journal read
  -> read exact current Journal summary(U)
  -> if G stale: stop
  -> success:
       publish known-empty/history(G,U)
  -> failure:
       publish degraded neutral(G,U)
       schedule only bounded/coalesced repair through existing owners
```

The publication helper should own the mapping from semantic state to icon/badge/title so branches cannot accidentally clear only one field and retain contradictory old meaning in another.

P1-130 remains responsible for the fact that the four browser mutation calls are not atomic.

## 13. Acceptance evidence for later runtime closure

Research refinement alone does not close P1-217. Runtime closure should require:

1. exact-source deterministic test proving current HTTP(S) generation publishes neutral/unknown before the first fallible summary read;
2. deterministic SPA A -> B same-document schedule with B summary failure and no surviving A-specific semantic vector;
3. deterministic verified-empty vs degraded distinction;
4. deterministic late A completion after B/C admission cannot overwrite current projection;
5. deterministic worker-restart model where old browser projection is treated as unproven and refresh begins neutral-first;
6. direct current unpacked-Chrome evidence for:
   - cross-document navigation reset positive control;
   - same-document `history.pushState` / `replaceState` Action behavior;
   - current read failure after same-document URL change;
   - service-worker termination/restart while per-tab Action has concrete state;
   - tab replacement behavior if applicable;
7. P1-130 Action mutation settlement regressions remain green;
8. P1-170 all-tabs convergence semantics remain bounded.

This direct Chrome work is engineering closure evidence, not release authorization.

## 14. Research conclusion

P1-217 remains `ACTIVE`, but its current failure model is narrower and more accurate than the 2026-09-08 version.

What remains true:

- HTTP(S) `updateActionForTab()` awaits fallible Journal summary before publishing any current-generation visual;
- caller-level errors are swallowed;
- same-document URL changes are admitted through `tabs.onUpdated(changeInfo.url)`;
- a failed current read therefore has no explicit unknown/degraded settlement.

What is corrected:

- ordinary committed cross-document navigation is already protected by Chromium's browser-owned per-tab Action clear and must not be used as the primary stale-A counterexample;
- same-document/SPA navigation is the deterministic current-platform counterexample because Chromium explicitly skips Action clearing for `IsSameDocument()`;
- durable Action truth storage is not required and would make a re-derivable projection look like business authority;
- an explicit `tabs.onReplaced` listener is not mandatory by architecture; behavioral replacement convergence is the requirement.

Recommended target remains neutral/unknown-before-read, explicit degraded-on-failure, successful-evidence-only known-empty/history, composed with existing P1-130 generation fencing and P1-170 global convergence.

No production implementation was made. No release authority changed.