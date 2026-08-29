# Audit delta — temporary PDF image wrappers need structural rollback ownership — 2026-08-29

Baseline `main` before this write: `46addbcac5fb4b6d87bcd8e92e88898c37d93480`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-219 — temporary image-link structural rollback can reparent a host node after the host has superseded WebClip's mutation.**

This is distinct from P1-218. P1-218 owns attribute compare-before-restore. P1-219 owns temporary **DOM topology** changes where WebClip moves a page-owned node and later moves it again during cleanup.

## Source proof

`content.js::wrapUnlinkedImagesForPdf()` makes an unlinked selected image clickable in PDF by inserting a temporary anchor immediately before the image and then moving the original image node inside that anchor:

```js
const nextSibling = image.nextSibling;
...
parent.insertBefore(link, image);
link.appendChild(image);
state.wrappedImages.push({ image, link, parent, nextSibling });
```

`restoreAfterPrint()` later performs unconditional topology restoration:

```js
if (image && parent) {
  if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(image, nextSibling);
  else parent.appendChild(image);
}
link?.remove();
```

There is no proof that `image.parentNode === link`, that `link` is still the exact WebClip-owned wrapper in the expected location, or that the host has not intentionally moved the image since preparation.

## Deterministic stale-cleanup schedule

1. Image `I` belongs to page parent `P`.
2. WebClip generation G inserts wrapper `W` under `P` and moves `I` under `W`.
3. A page MutationObserver/component reacts and legitimately moves the same image `I` to a new container `Q` or otherwise adopts it into newer application state.
4. PDF ends/fails.
5. G cleanup sees saved `{image:I,parent:P,nextSibling}` and moves `I` back under `P`.
6. The newer host-owned topology `Q -> I` is destroyed by stale WebClip rollback.

A same-document SPA/application generation change is not required. This can occur in one route and one browser document solely because live DOM is shared mutable state.

## Required contract

A structural rollback record must include an exact ownership receipt for the topology WebClip created. Cleanup may reverse it only when the live tree still proves that exact temporary topology, for example:

- wrapper node is the exact generated node for the active preparation generation;
- `image.parentNode === wrapper`;
- wrapper remains attached in the expected WebClip-created position/generation;
- no newer WebClip preparation generation owns the image/wrapper.

If the page has moved/adopted the image, cleanup must treat the original mutation as **superseded** and must not reparent the image. It may remove an empty still-owned wrapper if that removal cannot affect page-owned descendants/state.

Do not attempt to "repair" host topology from the pre-print snapshot after ownership was lost.

## Architectural direction

P0-075's inert/frozen WebClip-owned print representation avoids this class entirely: clone/snapshot the image into the print artifact and add PDF-only link semantics there, rather than moving the live page's image node.

Until then, live structural mutations require generation-aware compare-before-rollback just as attribute mutations require CAS.

## Required regressions

1. Image remains inside exact WebClip wrapper until cleanup -> original topology restores.
2. Host moves image from wrapper to another live parent before cleanup -> WebClip does not move it back.
3. Host removes/replaces wrapper while retaining image elsewhere -> cleanup does not adopt/reparent image.
4. Host inserts/removes original `nextSibling` -> cleanup remains ownership-based, not position-heuristic.
5. Older print generation cleanup cannot unwrap/reparent structure created by a newer print generation.
6. Failure path and success path obey the same ownership rule.
7. PDF still exposes the intended image link when the frozen/owned representation is intact.
8. Bounded diagnostics distinguish restored vs superseded structural cleanup without serializing page content.

## Duplicate check / numbering

Repository semantic search for `wrappedImages`, image-wrapper rollback, reparent/parent/nextSibling stale restore found no existing audit owner. Existing P0-075 covers the broader frozen-representation direction and P0-071/P0-004 cover printable link semantics, but no existing item owns late reparenting of the live host image.

Current repository search found no `P1-219`, after P1-218 had just been assigned and committed on current `main`. This checkpoint therefore assigns **P1-219**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests remain prior evidence only and were not rerun for this HEAD.