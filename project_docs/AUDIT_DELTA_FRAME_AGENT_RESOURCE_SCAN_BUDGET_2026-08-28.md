# Audit delta — cross-origin frame-agent resource discovery must honor DOM scan budget — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owners: **P1-003** bounded resource prefetch, **P1-160** shared DOM traversal budget and **P1-004** cross-origin iframe feature parity.

## Source proof

Top `content.js` has an explicit selected-resource DOM discovery cap (`PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5000`) and bounded resource task count.

Cross-origin `frame-agent.js::prefetchSelected()` uses a different implementation:

```js
const imgs=[];
for (const root of state.includes.values()) {
  if (root.matches?.('img')) imgs.push(root);
  for (const x of root.querySelectorAll?.('img') || []) imgs.push(x);
  if (imgs.length >= 100) break;
}
```

The intended final image count is small (`imgs.slice(0,100)`), but the limit is checked only **after** `querySelectorAll('img')` for one include root has been fully returned and iterated.

## Why the 100-image cap is not a traversal cap

For one selected container containing N images:

1. `querySelectorAll('img')` scans the complete subtree synchronously;
2. the `for...of` loop pushes every returned image into `imgs`;
3. only after the full loop finishes does code test `imgs.length >= 100`;
4. later network/decode work uses only `imgs.slice(0,100)`.

Thus a 100-item task limit can still require O(N) DOM discovery and retain O(N) element references for that root.

The 5-second `end=Date.now()+5000` budget is created after discovery and therefore cannot abort the synchronous scan itself.

## Deterministic stress case

- Cross-origin iframe has granted optional host permission.
- User selects one large root.
- Root contains 200k image elements (or a framework-generated pathological subtree).
- `prepare-print` reaches `prefetchSelected()`.
- Before any bounded image decode loop begins, frame-agent scans and pushes the full 200k list.
- The child can stall its document/extension command channel and retain a large JS array despite the advertised 100-resource result cap.

This can make top multi-frame preparation hit timeout and also compose with P1-214 partial-prepare cleanup behavior in sibling frames.

## Required contract

Cross-origin frame resource discovery should use the same class of bounded traversal as top content:

1. common visited-node cap, or a remote-specific cap that is no weaker than the documented resource policy;
2. stop as soon as enough image tasks have been collected;
3. avoid materializing a full array/NodeList result merely to take its first N matches;
4. include traversal time in the frame prepare deadline;
5. on traversal budget exhaustion, return bounded diagnostics (`scanTruncated/omitted`) and continue/fail according to product policy rather than hanging;
6. do not retain references to discarded candidates.

A TreeWalker/indexed live collection with explicit visited/task counters is preferable to full-selector materialization for this path.

## Regression cases

1. Selected remote root with 10 images -> all eligible tasks behave normally.
2. Root with 100 images -> at most 100 tasks.
3. Root with 10k/200k images -> traversal stops at documented visited/task budget without first retaining the full set.
4. Multiple include roots share one aggregate budget rather than each receiving an unbounded scan.
5. Budget exhaustion reports truncation without converting it into a false “all resources checked” success.
6. Slow/large frame cannot indefinitely block sibling-frame prepare outside the parent operation deadline.
7. Top and cross-origin paths expose comparable bounded diagnostics.

## Duplicate check

P1-003 already owns bounded resource prefetch and P1-160 owns broad traversal. P1-004 requires cross-origin feature behavior to preserve those safety properties. No new stable item is necessary.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.