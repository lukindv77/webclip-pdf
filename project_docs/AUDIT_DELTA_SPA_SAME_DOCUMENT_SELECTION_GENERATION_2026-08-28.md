# Audit delta — SPA / same-document selection generation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `1eeb997ac062e7f5af67a5108c9907b04a538497`.

Docs-only audit checkpoint. Runtime, tests, configuration and `manifest.json` are unchanged.

## New confirmed item: P0-080

**P0-080 — WebClip selection authority can survive same-document SPA/history navigation after the selected DOM has been replaced. The content script stores Includes/Excludes as direct element references and counts Map entries regardless of `isConnected`; it has no History API/popstate generation fence or general selection-pruning observer. A SPA route can therefore detach all selected elements while WebClip still reports non-zero Includes. A subsequent save uses the new current URL/title but stale detached selection state, allowing blank/mismatched PDF/Journal output under the new route.**

This is distinct from P0-070/P0-023 full-document identity: `MessageSender.documentId` may legitimately stay unchanged during `history.pushState()`/`replaceState()`/hash/popstate navigation.

## Source proof

### Selection is object-reference state

`content.js` keeps local selection in:

- `state.includes = new Map()`;
- `state.excludes = new Map()`.

The maps contain actual page `Element` objects.

`totalIncludeCount()` currently returns:

`state.includes.size + totalRemoteIncludeCount()`

It does not require local elements to remain connected to the current document.

### Rendering already knows disconnected elements are possible

Several visual helpers explicitly test `element?.isConnected`. For example outline rendering simply returns when a selected element is disconnected.

That is useful defensive rendering, but it means a stale selection can become **invisible without being removed from selection authority**:

- count can remain non-zero;
- save/review commands can still pass their `totalIncludeCount()` gate;
- the user may no longer see the stale outline that explains what WebClip thinks is selected.

Ad-suggestion cleanup prunes disconnected suggestions, and remote-frame handling checks connected frame elements, but there is no equivalent authoritative pruning for `state.includes` / `state.excludes`.

### No same-document navigation generation is tracked

Fresh audit found no content-side `popstate` listener, History API generation wrapper, or general MutationObserver that invalidates/revalidates selection when a SPA replaces its route content.

Because `content.js` is a singleton in the same document, a normal `history.pushState()` or `replaceState()` does not reload the content script. Its in-memory maps therefore survive.

### Save metadata is current while selection may be old

Current worker-side P0-030 normalization correctly treats `sender.tab.url` as authoritative save URL. Content metadata also naturally observes current `location.href` / title.

That is a positive trust-boundary control, but in this scenario it creates a mixed generation:

- URL/title = current SPA route B;
- selection references = old route A detached DOM;
- `documentId` = same browser document for A and B.

P0-070's exact documentId fence cannot distinguish those application generations.

### Snapshot generation does not repair the authority

`serializeSelectionSnapshot()` iterates the current maps and calls `createElementLocator()` for each element. A detached old element still has object/text/attribute state and an `ownerDocument`, so serialization is not itself proof that the element belongs to the live current route representation.

Structural paths for a detached subtree can also degrade or cease to describe the current body. Persisting such a locator under route B makes later restore semantics misleading.

## Deterministic SPA schedule

1. User is on SPA route A at `https://example.test/item/a`.
2. WebClip selects live element `EA`; `state.includes.size === 1`.
3. The application calls `history.pushState(..., '/item/b')` and replaces the route root. `EA` becomes disconnected.
4. The content script remains loaded because this is same-document navigation.
5. No WebClip generation change/pruning runs; `state.includes.size` is still 1.
6. Outline rendering silently skips disconnected `EA`, so visible selection can disappear while count/authority remains.
7. User/context-menu invokes Download/Yandex/Finish.
8. Gate sees `totalIncludeCount() > 0` and admits save.
9. Current metadata/sender URL identifies route B.
10. Selected-only print machinery operates on current live document B, while WebClip's local Include marker lives on detached `EA` from A.
11. Output can be empty/partial or otherwise not represent the selection the user authorized, and Journal metadata/snapshot can be associated with B.

This is a correctness/data-integrity problem, not only an outline UX issue.

## Same URL DOM replacement is also relevant

A SPA or hostile page can replace a selected subtree without changing `location.href` at all.

Therefore a URL/history generation signal is necessary but not sufficient. Immediately before destructive/save admission, WebClip must also prove that every authoritative selected local element is still connected to the expected live document/tree.

Disconnected Includes must never count toward the minimum-one-Include save precondition.

## Required P0-080 contract

### Application/navigation generation

The content command/session model needs a bounded same-document application generation receipt. At minimum, WebClip should observe route changes that alter navigation identity, including:

- History API `pushState` / `replaceState`;
- `popstate`;
- hash/navigation changes according to the chosen product URL-identity policy.

A route generation change must either:

1. explicitly invalidate/clear selection and cached save authority; or
2. revalidate the whole selection against the new route and require explicit user reconfirmation before save.

Silently carrying old route selection into a new route is not acceptable.

### Live-selection validation before review/print/save

Immediately before `finish`, `download`, `yandex`, `read-later`, template-derived save and other save admissions:

- prune or reject disconnected local Includes/Excludes;
- verify selected elements belong to the current expected document/frame generation;
- refresh/reconcile remote-frame selection under P1-171;
- require at least one **live** Include after validation;
- if stale entries were removed, surface an explicit message rather than saving a blank representation.

The same validation must run again at the frozen print-representation boundary required by P0-075/P0-071 so host mutation cannot invalidate the accepted selection between UI confirmation and print.

### Interaction with URL/document owners

- **P0-070** still owns full-document generation from content command through `Page.printToPDF` and finalization.
- **P0-023** still owns exact retry-cache document identity/invalidation.
- **P1-171** owns cross-origin child document generation.
- **P0-080** owns the narrower but independent case where browser `documentId` is unchanged while SPA/application representation and selected DOM generation changed.
- **P0-004/P1-001** remain selected-content output and snapshot locator semantics.

## Required regressions

1. Route A selection -> `pushState` route B + old subtree removed -> save is blocked/selection invalidated; no blank B PDF is created.
2. Route A -> route B while selected node remains live intentionally -> chosen product policy either re-confirms/rebinds or invalidates; no silent authority carry-over.
3. Same URL, selected element is removed/replaced -> stale element is pruned before save and cannot satisfy Include count.
4. All local Includes disconnected, remote Include remains valid -> only verified remote selection may keep save enabled.
5. Local iframe selected element -> iframe same-document/remount generation changes -> stale child element does not remain authoritative.
6. `popstate` back to a previous route does not automatically resurrect an old in-memory selection without explicit verified generation semantics.
7. `replaceState` URL change is treated consistently with `pushState` under the URL-identity policy.
8. Hash-only navigation follows one documented rule and does not create accidental mismatch between metadata URL and selection authority.
9. A page removes selected nodes after review but before print -> final live/frozen representation validation fails closed under P0-080/P0-075 rather than producing blank output.
10. Ordinary static page with connected selection remains unaffected.
11. SelectionSnapshot written after navigation contains only elements proven live for the accepted current application generation.
12. PDF retry cache remains independently fenced by P0-023; fixing selection generation does not make an old cached PDF valid for a new route.

## Duplicate check / numbering

Repository commit search for `SPA`, `same-document navigation`, and `selection navigation` found no existing audit checkpoint assigning this root cause. Canonical priorities contain no `P0-080` assignment, and GitHub commit history contains no `P0-080` assignment.

The issue cannot be reduced to P0-070 because the browser document itself may be unchanged. It cannot be reduced to P1-001 because locator quality after an intentional restore is different from stale live selection authority before save.

This checkpoint therefore assigns **P0-080**.

## Test / release state

Documentation only. Product tests were not rerun. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.
