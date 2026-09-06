# P0-080 — Navigation API entry evidence refinement — 2026-09-06

Date: 2026-09-06  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/p0-080-spa-application-generation-2026-09-06`  
Owner: **P0-080 ACTIVE**.

This note refines route/application-generation detection. Production runtime and manifest are unchanged.

## 1. Why URL comparison alone is not enough

The base P0-080 checkpoint requires a boundary `location.href` comparison as a fallback. That is necessary but insufficient by itself.

Schedule:

```text
selection under /a
SPA -> /b
SPA -> /a
save boundary sees /a again
```

A plain URL check cannot distinguish this ABA from no navigation.

A monotonic application transition generation is therefore still required.

## 2. Navigation API is available under the current Chrome floor

Current manifest requires Chrome 118.

Chrome documents the Navigation API as available from Chrome 102. It centralizes navigation events and exposes `navigation.currentEntry` even for sites that use the legacy History API. Chrome's documentation explicitly notes that the current entry is updated/replaced when `history.pushState()` / `history.replaceState()` are used.

This makes Navigation API a high-quality primary signal for P0-080 without adding the `webNavigation` extension permission and without monkey-patching page-owned History methods.

External comparison evidence:

- https://developer.chrome.com/docs/web-platform/navigation-api
- https://developer.chrome.com/blog/new-in-chrome-102

## 3. Entry id vs key

`NavigationHistoryEntry.id` and `.key` have different semantics.

Current platform documentation describes:

- `id` as a unique UA-generated value representing one specific history entry;
- `key` as the identity of a slot in the history list, which can be reused when an entry is replaced.

For P0-080, `id` is the stronger current-entry evidence because `replaceState`/replace navigation must not silently inherit old selection authority merely because the history-list slot is reused.

`key` may remain useful for navigation/traversal logic, but it should not be the only application-authority identity.

Source:

- https://developer.mozilla.org/en-US/docs/Web/API/NavigationHistoryEntry/id
- https://developer.mozilla.org/en-US/docs/Web/API/NavigationHistoryEntry/key

## 4. Preferred route-generation composition

Recommended content-side state:

```text
routeEvidence = {
  currentEntryId: navigation.currentEntry?.id || '',
  currentEntryKey: navigation.currentEntry?.key || '',
  href: location.href,
  transitionGeneration: <monotonic local generation>
}
```

Preferred signal:

```text
navigation.currententrychange
```

or an equivalent committed Navigation API transition signal.

On every observed committed current-entry change:

```text
transitionGeneration++
refresh currentEntryId/key/href
mark pre-existing selection authority stale
```

The generation must advance even when traversal returns to an older history entry whose `id`/URL equals a value seen earlier. This prevents automatic resurrection of an old selection receipt after `A -> B -> Back(A)`.

## 5. Why entry id alone is also insufficient

A user can traverse back to an exact earlier history entry. In that case the current entry identity can legitimately equal the old entry again.

If P0-080 used only:

```text
selection.entryId == navigation.currentEntry.id
```

then the old selection could be resurrected after an intervening application transition.

Required:

```text
entry evidence
+
monotonic transitionGeneration
```

The generation records that an intervening application transition occurred even if the browser later revisits the same history entry.

Whether product UX should offer explicit revalidation/restoration on return is separate; automatic authority resurrection is not safe.

## 6. Boundary fallback for missed signals

Even with Navigation API event observation, save admission should fresh-read:

```text
navigation.currentEntry?.id
location.href
```

and compare them with the content-side current route evidence.

If the boundary values differ, then an event was missed or current state changed during asynchronous UI work:

```text
missed-navigation-stale
-> advance/invalidate current application authority
-> no save admission from old selection receipt
```

This boundary fallback protects ordinary one-way drift.

It cannot by itself detect a fully missed ABA that returned to exactly the same entry; therefore the ongoing monotonic transition listener remains necessary.

## 7. Fallback if Navigation API is unexpectedly unavailable

The product's declared Chrome minimum should make Navigation API available, but implementation should still fail safely if the object/required fields are unexpectedly unavailable.

Acceptable fallback layers include:

- `popstate` / `hashchange` observation;
- boundary href comparison;
- explicit stale/review outcome when exact same-document generation cannot be proven.

Do not silently downgrade to "documentId + current URL means current selection".

A future decision to add `webNavigation` permission could provide worker-side independent observation, but P0-080 does not require that permission for its primary design.

## 8. DOM liveness remains independent

Navigation entry evidence does not solve same-URL DOM replacement.

The base P0-080 rule remains mandatory:

```text
all authority-bearing local selected roots must be connected and owned by the expected current Document at save admission
```

So the final selection authority composes:

```text
browser document identity
+
Navigation current-entry evidence
+
monotonic application transition generation
+
selection revision
+
live selected-root admission
```

No single field substitutes for the others.

## 9. Deterministic model

Added:

`project_tools/test_p0_080_navigation_entry_generation_model.js`

Local run before repository write:

```text
P0-080 navigation-entry generation model: PASS
```

It proves:

1. push/new-entry transition invalidates old receipt;
2. traversal back to the exact old entry id/URL does not resurrect an old receipt because transition generation advanced;
3. boundary entry-id/href comparison detects a missed one-way navigation signal;
4. replace-entry evidence invalidates old receipt.

## 10. Implementation acceptance additions

1. Under Chrome 118+, same-document History API navigation is observed without monkey-patching host History functions.
2. Current-entry replacement changes/stales selection authority even if a history slot/key is reused.
3. `A -> B -> Back(A)` does not automatically revive A's old selection receipt.
4. Boundary currentEntry.id/href mismatch fails stale even if event processing lagged.
5. Unexpected Navigation API unavailability does not silently reduce authority to browser documentId alone.
6. Direct selected-root liveness check remains mandatory and independent.

## 11. Status

P0-080 remains **ACTIVE**. This is architecture/model evidence only; current production content source has not been changed.
