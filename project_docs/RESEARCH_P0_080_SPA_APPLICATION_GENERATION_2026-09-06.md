# P0-080 — same-document SPA/application generation and live selection authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p0-080-spa-application-generation-2026-09-06`  
Owner: **P0-080 ACTIVE**.

This checkpoint changes no production runtime or manifest.

## 1. Canonical owner

`RESEARCH_REGISTRY.md` defines P0-080 as:

> Same-document SPA/application generation and live selected DOM are separate from browser documentId; stale disconnected selection cannot authorize a save under a newer route/DOM.

P0-080 therefore owns the **pre-save selection authority lifetime inside one loaded browser document**.

Adjacent owners remain distinct:

- **P0-070** — exact full-document save generation from save-command admission through print/cache/download/upload/Journal finalization;
- **P0-023** — PDF retry cache must bind to exact source-document generation;
- **P0-079** — immutable operation-owned PDF byte cache generation after PDF bytes are created;
- **P1-175** — Journal Apply/page command fresh-read of source tab/site/exact document generation before retargeting;
- frame-specific document/session owners such as **P1-171/P1-200** remain authoritative for remote child-frame identity.

## 2. Browser document identity is necessary but not sufficient

Chrome's `documentId` is a unique identifier for a loaded document and changes when a frame navigates to a **new document**.

But Chrome separately exposes `webNavigation.onHistoryStateUpdated` for history-state URL updates while still reporting the loaded document's `documentId`.

The web platform likewise defines `history.pushState()` as activating a different history entry associated with the **current document**. This is the normal SPA model: the application changes route/content without loading a new page.

Therefore:

```text
same browser documentId
!=
same application/route/selection authority generation
```

P0-080 needs a finer generation inside the browser document.

## 3. Fresh current-source proof

### 3.1 Selection state is long-lived DOM references

Current `content.js` holds:

```text
state.includes = new Map()
state.excludes = new Map()
```

and preserves them across ordinary commands while the content script remains loaded.

`startSelection()` explicitly clears selections, but there is no current application-generation transition driven by same-document navigation.

Fresh source inspection found no `pushState`, `popstate`, or `MutationObserver` generation mechanism in `content.js`.

This does not mean those exact APIs are mandatory; it proves only that current source has no explicit same-document application authority fence.

### 3.2 Disconnected selected elements remain authority-bearing map entries

Current outline rendering is defensive:

```text
appendOutline(element, ...)
```

returns when `!element.isConnected`.

That is a useful rendering positive control: disconnected elements are not drawn as visible selection boxes.

But selection authority is not removed.

Current `totalIncludeCount()` returns:

```text
state.includes.size + totalRemoteIncludeCount()
```

without liveness filtering.

Therefore a disconnected local Include still satisfies the UI/save precondition that there is at least one selected Include.

### 3.3 Snapshot serialization also consumes stale map references

Current `serializeSelectionSnapshot()` executes:

```text
[...state.includes.values()].map(createElementLocator)
[...state.excludes.values()].map(createElementLocator)
```

without first requiring every selected local node to be connected and owned by the current application generation.

A selected node that a SPA detached can therefore still be turned into Journal metadata/locator data during a later save flow.

### 3.4 Save metadata uses current URL, not the URL/generation in which selection was authorized

Current `buildSaveMeta()` writes:

```text
url: location.href
selectionSnapshot: serializeSelectionSnapshot()
```

This can combine:

```text
fresh route URL B
+
stale selection references originally chosen under route A
```

A fresh URL read does not make that pair coherent.

### 3.5 Save command does not carry an application-generation receipt

Current content flow calls `prepareForPrint(meta)` and then sends:

```text
WEBCLIP_GENERATE_PDF { meta, operationId }
```

The current source does not expose a same-document `applicationGeneration` / exact selection-generation receipt in that request.

Worker-side current `documentId` handling exists for frame-agent lifecycle and script-execution identity, which is a useful positive control, but it does not create the missing top-level SPA generation.

## 4. Deterministic failure schedules

### Schedule A — SPA route A -> B, same documentId

```text
browser documentId = D
route A
user selects element X
selection authority implicitly belongs to A
SPA calls pushState('/b') and replaces content
browser documentId remains D
old content-script state remains loaded
user invokes save
```

If X remains in the map, D alone cannot prove that selection belongs to route B.

### Schedule B — route changes and selected node is disconnected

```text
A: X selected, state.includes contains X
SPA route B removes X from DOM
outline update skips X because !isConnected
state.includes still contains X
state.includes.size > 0
save precondition passes
serializeSelectionSnapshot still visits X
```

Rendering safety has not revoked save authority.

### Schedule C — same URL DOM replacement

```text
URL remains U
selected X belongs to old application view
SPA replaces/removes X without changing history URL
```

A URL comparison cannot detect this. Fresh local selected-node liveness must independently fail closed.

### Schedule D — URL ABA

```text
selection under /a at application generation G1
SPA -> /b, G2
SPA -> /a, G3
```

Current URL equals the old URL again, and browser documentId may still be D.

Required:

```text
G3 != G1
```

Returning to the same URL must not resurrect G1 selection authority automatically.

### Schedule E — selection changes after review/dialog admission

If the UI opened a save/review state based on selection revision R1 and selection later changes to R2 before final save admission, a stale R1 receipt must not authorize R2 accidentally.

This is a local selection-authority revision problem; later full save mutation fencing remains P0-070.

## 5. Required authority model

Recommended conceptual state inside the content context:

```text
applicationAuthority = {
  version: 1,
  browserDocumentId: <if available/known>,
  applicationGeneration: <monotonic/opaque generation>,
  observedHref: <bounded current href>,
  selectionRevision: <monotonic revision>,
  staleReason: '' | same-document-navigation | selection-disconnected | ...
}
```

A save-admission receipt contains at least:

```text
selectionAuthorityReceipt = {
  version: 1,
  browserDocumentId,
  applicationGeneration,
  selectionRevision,
  href
}
```

The exact representation may differ, but `documentId` and application generation must remain distinct fields/concepts.

## 6. Application-generation transitions

At minimum, P0-080 must notice same-document route/history changes that can retarget an SPA view.

Recommended layered detection without monkey-patching host-owned History methods:

1. when available, observe standard isolated-world/browser navigation signals for same-document navigation;
2. observe `popstate` / `hashchange` as applicable;
3. **mandatory boundary fallback:** before save/review admission, compare bounded current `location.href` with the href associated with the current selection authority;
4. a detected route mismatch advances/invalidates the application generation before save can proceed.

The boundary fallback is mandatory because `pushState()` does not fire `popstate` at the time it is called and implementation-specific event coverage must not become authority.

P0-080 does not require patching or wrapping page-owned `history.pushState()` / `replaceState()` in the main world. Avoiding that is also cleaner with P0-075's host-control isolation direction.

## 7. Live selected-DOM admission

Route generation alone is insufficient because a SPA can replace DOM without changing URL.

Immediately before save authority is admitted, every local selected root that contributes to the operation must satisfy a current liveness contract such as:

```text
node.isConnected === true
node.ownerDocument === current expected Document
node remains inside the expected current frame/document realm
```

If any authority-bearing selected root is disconnected/stale, the safe result is not to silently omit it and continue.

Recommended result:

```text
selection-stale / review-required
```

because silent omission changes the user's requested save scope.

A lightweight mutation observer may be used only as an **early invalidation signal** to improve UI responsiveness. It is not a substitute for the final synchronous/bounded liveness check at save admission. The observer should coalesce work and inspect only bounded selection roots rather than turning every SPA DOM mutation into expensive global rescanning.

## 8. Do not invalidate on every ordinary DOM mutation

A naive global `domEpoch++` on every mutation would make modern dynamic pages unusable: timers, lazy loading, advertisements, accessibility updates and framework rendering continuously mutate DOM.

P0-080 specifically needs to prevent stale selection authority, not freeze the page.

Recommended distinction:

- **same-document route/application transition** -> application generation changes / current selection requires explicit revalidation/reselection;
- **selected root detached/replaced** -> selection authority becomes stale;
- ordinary mutations elsewhere -> no automatic generation change;
- mutations inside a still-connected selected container are not automatically P0-080 failure; P0-070 owns exact save generation once save is admitted, while other fidelity/scope owners govern content semantics.

This avoids turning P0-080 into a generic DOM immutability requirement.

## 9. UX/state behavior after invalidation

Do not silently reuse stale selection under a newer application generation.

Acceptable product behaviors include:

- preserve visual/state evidence but mark it stale and require explicit reselect/reconfirm;
- clear stale selection with a clear user-facing explanation;
- offer explicit re-application through an existing locator-restore flow whose own admission contract is satisfied.

What is not acceptable:

```text
route changed -> current URL is fresh -> old DOM refs silently treated as current authority
```

A later route returning to the old URL also does not auto-reactivate the old selection generation.

## 10. Selection revision vs application generation

These are different axes:

- `applicationGeneration` changes when the SPA/application identity changes inside the document;
- `selectionRevision` changes when the user or explicit restore operation changes Includes/Excludes within the same application generation.

A save dialog/review receipt should capture both.

This prevents:

```text
review opened on R1
user/async restore changes selection to R2
old review action commits R2 unintentionally
```

without pretending that every user selection edit is a new SPA route generation.

## 11. Composition with P0-070

P0-080 owns the authoritative **admission receipt** for the currently selected SPA/application state.

P0-070 owns carrying exact full-document/save authority through later asynchronous phases.

Recommended composition:

```text
P0-080:
  prove current applicationGeneration + live selection + selectionRevision
  -> issue selectionAuthorityReceipt S

P0-070:
  bind save operation to S + browser document/source generation
  -> reject later stale generation before irreversible/print/cache stages
```

P0-080 should not duplicate P0-070's entire end-to-end save-generation mechanism.

## 12. Composition with P0-079/P0-023

After PDF bytes are generated:

- P0-023/P0-070 prove which source/document/save generation produced them;
- P0-079 stores them in an immutable operation-owned PDF cache generation.

Therefore P0-080's selection receipt should be available as provenance to the later pipeline, but the PDF cache key itself is not the application generation.

Each authority retains its own domain.

## 13. Cross-frame boundary

Current worker already records `documentId` for registered remote frame agents and rejects some stale frame-agent events when sender documentId no longer matches.

That is a positive control for cross-document frame lifecycle.

P0-080 does not absorb the dedicated remote-frame session/document-generation owners. Top-level application generation should compose with those receipts when selected content spans frames; it must not invent a competing child-frame authority mechanism.

## 14. External research — 2026-09-06

External sources are comparison evidence, not WebClip source-of-truth.

### Chrome `webNavigation`

Chrome documents `documentId` as unique per loaded document and notes that it changes when a frame navigates and opens a new document. The same API separately exposes `onHistoryStateUpdated`, carrying the loaded document's `documentId`, for history-state URL updates.

Implication: Chrome itself distinguishes loaded-document identity from same-document history/application transitions. P0-080 needs the same conceptual separation.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/webNavigation

### History API / SPA behavior

MDN documents `pushState()` as creating/activating a history entry associated with the current document. Its History API guide explains the SPA pattern: prevent full page load, fetch new content, update the page, and use session history; back/forward can navigate inside the same document without reloading it.

Implication: same-document route/content replacement is normal web behavior and cannot be treated as a new browser `Document` automatically.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
- https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API

### Navigation API

Modern Navigation API documentation explicitly models `sameDocument` navigations and is aimed at SPA routing.

Implication: implementation may use standard same-document navigation signals where supported, but P0-080 should retain a save-boundary fallback rather than making one event API the sole authority.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
- https://developer.mozilla.org/en-US/docs/Web/API/NavigationDestination/sameDocument

## 15. Alternatives considered

### A. Browser `documentId` only

Rejected. Same-document SPA history transitions retain the same loaded document identity.

### B. Current URL equality only

Rejected. It misses same-URL DOM replacement and is vulnerable to URL ABA (`A -> B -> A`).

### C. Clear selection on every DOM mutation

Rejected. Dynamic pages mutate continuously; this would destroy usability and over-expand P0-080 into generic DOM freezing.

### D. Monkey-patch page History API

Not required and undesirable as the primary authority. It increases host-world coupling and still would not cover DOM replacement without URL transition.

### E. Separate application generation + selection revision + mandatory live-root check

**Recommended.**

It is precise, works with same-document navigation, handles disconnected selection, resists ABA, and composes cleanly with P0-070/P0-079.

## 16. Deterministic model

Added:

`project_tools/test_p0_080_spa_application_generation_model.js`

Local run before repository write:

```text
P0-080 SPA/application generation model: PASS
```

The model proves:

1. route change invalidates selection while browser documentId stays unchanged;
2. a fresh href check at save boundary detects pushState-style URL drift without monkey-patching page History methods;
3. URL ABA does not resurrect an old generation;
4. disconnected selected node fails even with unchanged URL;
5. same-URL new/wrong document cannot reuse selection;
6. explicit reselection binds to the new application generation;
7. selection revision prevents an older review receipt from committing a newer selection;
8. documentId alone cannot collapse two application generations.

This is architecture/model evidence only, not current runtime PASS.

## 17. Implementation acceptance cases

Minimum future source/deterministic gate:

1. Selection under route A cannot save after same-document route B without explicit current-generation reselection/revalidation.
2. Browser documentId may be identical in case 1; operation still fails stale.
3. `A -> B -> A` URL ABA does not revive A's old selection generation.
4. Selected local Include detached by SPA DOM replacement makes save fail/review-required even if URL is unchanged.
5. A disconnected Include cannot keep `totalIncludeCount()` authoritative for save admission.
6. `serializeSelectionSnapshot()` cannot serialize stale/disconnected local authority as if current.
7. Save metadata carries exact application/selection authority receipt, not only current `location.href`.
8. Selection edit R1 -> R2 invalidates an old review/save receipt bound to R1.
9. Explicit reselection under new generation yields a valid new receipt.
10. No requirement to monkey-patch page-owned History methods is introduced.
11. Mutation observation, if used, is coalesced/bounded and final save admission still performs direct liveness proof.
12. P0-070 consumes the admitted receipt for later end-to-end save fencing rather than P0-080 duplicating the entire save state machine.
13. P0-079 PDF cache generation remains a separate post-render byte identity.
14. Existing child-frame exact document/session owners remain authoritative for remote frame content.

## 18. Owner boundaries

**P0-080 owns:**

- same-document application/route generation distinct from browser documentId;
- URL ABA resistance for selection authority;
- local selected-root liveness admission;
- stale selection handling after application transition/DOM detachment;
- selection revision at pre-save/review boundary;
- issuance of exact selection/application receipt for downstream save authority.

**P0-070 owns:** carrying exact admitted source/save generation through later print/cache/download/upload/Journal phases.

**P0-023 owns:** exact source-document generation binding for retry cache.

**P0-079 owns:** immutable operation-owned PDF byte cache generations.

**P1-175 owns:** Journal Apply/page retargeting freshness.

**Remote-frame generation owners** retain child-frame document/session authority.

## 19. Status

P0-080 remains **ACTIVE**.

Current content source has long-lived selection Maps, no explicit same-document application-generation receipt, counts disconnected Includes through map size, and serializes map entries without mandatory liveness admission. No production source, manifest, build, tag, GitHub Release or Actions run is changed/claimed by this checkpoint.
