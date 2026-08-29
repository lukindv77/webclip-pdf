# Audit delta — resource-prefetch rollback must not overwrite newer host DOM — 2026-08-29

Baseline `main` before this write: `e19853efa10e8be3863ad8001348a395e5b3bb18`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-218 — temporary resource-prefetch rollback is an unfenced stale writer.**

`P1-003` already owns bounded renderer-side prefetch and the requirement to restore temporary `src` / `srcset` / `loading` mutations after print. This delta does not duplicate that owner. It adds the missing ownership/CAS rule for rollback itself: WebClip must restore an attribute only if the live DOM still contains the exact temporary value written by the same preparation generation.

## Source proof

`content.js::rememberResourceAttribute()` stores only the pre-WebClip state:

```js
state.changedResourceAttributes.push({
  element,
  name,
  had: element.hasAttribute(name),
  value: element.getAttribute(name)
});
```

`setTemporaryResourceAttribute()` then writes the print-preparation value, for example:

- `loading="lazy"` -> `loading="eager"`;
- `data-src` -> `src`;
- `data-srcset` -> `srcset`.

At cleanup, `restoreAfterPrint()` iterates the remembered records and unconditionally restores the old value or removes the attribute:

```js
if (had) element.setAttribute(name, value ?? '');
else element.removeAttribute(name);
```

The record does **not** retain the exact temporary value WebClip wrote, an ownership token, or a preparation generation. Cleanup therefore cannot tell whether the current attribute is still WebClip-owned.

## Deterministic stale-rollback schedule

1. Host image starts with `loading="lazy"` and `src="preview-A.jpg"`.
2. WebClip print generation G remembers those values and promotes resource attributes, e.g. writes `loading="eager"` and `src="full-A.jpg"`.
3. While print preparation/rendering is in progress, the SPA/lazy-loader legitimately advances the same live image to `src="full-B.jpg"` and perhaps changes/removes `loading`.
4. PDF generation finishes or fails.
5. `restoreAfterPrint()` for G writes the **old pre-G** values back.
6. The newer page-owned state B is lost even though WebClip no longer owns the current attribute value.

This remains possible when the browser document and SPA route are unchanged; therefore `P0-080` application-generation fencing alone does not solve it.

## Why this is distinct from existing print-side-effect owners

- `P1-003` owns bounded resource prefetch and basic rollback presence.
- `P0-067/P1-212` own page-control activation during print prep.
- `P0-071/P0-075` own frozen printed representation / hostile-page TOCTOU.
- `P1-218` owns **rollback write authority on mutable host attributes** after WebClip temporarily changed them.

The existing audit note that resource prefetch mutates live host DOM established the side effect; it did not establish a compare-before-restore contract. Here the corruption mechanism is specifically the late rollback overwriting a newer host mutation.

## Required contract

Each temporary mutation record must capture at least:

- element identity within the accepted document/application generation;
- attribute name;
- original `{present,value}`;
- exact temporary `{present,value}` written by WebClip;
- print/preparation generation or equivalent ownership receipt.

Rollback must be compare-and-restore:

1. verify the cleanup still belongs to the active/completing preparation generation;
2. read the live attribute immediately before rollback;
3. restore/remove only if live `{present,value}` exactly equals the temporary value written by that generation;
4. if the host changed it, leave the host value untouched and record bounded diagnostic `rollback-superseded` rather than treating cleanup as failure;
5. stale cleanup from an older print generation must never modify values owned by a newer WebClip preparation generation.

This is the DOM analogue of CAS: a fresh read of the element is not enough if the read is used to overwrite a value that no longer matches the write being rolled back.

## Architectural direction

The stronger `P0-075` direction — prepare an inert/frozen WebClip-owned print representation instead of mutating live page resources — naturally eliminates most of this rollback authority. Until that boundary exists, live-DOM temporary writes require explicit write receipts and compare-before-restore semantics.

The same invariant should be applied to any other temporary host-DOM mutation that is later restored from a saved pre-value. Do not automatically merge unrelated mutations into P1-218; classify separately when their authority/lifecycle differs.

## Required regressions

1. WebClip changes `loading=lazy` to `eager`; host changes it to another valid state before cleanup -> WebClip leaves host state untouched.
2. WebClip promotes `data-src` into `src`; host replaces `src` before cleanup -> old `src` is not resurrected.
3. WebClip promotes `srcset`; host replaces `srcset` -> host value survives.
4. Attribute originally absent, WebClip adds temporary value, host writes a different value -> cleanup does not remove it.
5. Attribute remains exactly equal to WebClip temporary value -> exact original state is restored.
6. Failed print path applies the same compare-before-restore rule.
7. Generation G1 cleanup occurring after G2 wrote its own temporary value cannot restore G1 original over G2.
8. Detached/replaced element is not used as authority for a new live DOM node; cleanup is bounded and harmless.
9. Existing P1-003 prefetch success/failure/resource budgets remain unchanged.
10. Operation diagnostics distinguish `restored`, `superseded-by-host`, and genuine rollback failure without persisting sensitive resource URLs.

## Duplicate check / numbering

Before assigning a number, current `main` registry/handoff and repository audit files were checked semantically for `changedResourceAttributes`, resource-attribute rollback ownership, concurrent host mutation and stale prefetch restore. Existing material covers resource prefetch side effects and rollback existence, but no owner was found for compare-before-restore of those attributes. Current handoff names P1-217 as the newest assigned P1 owner, and `P1-218` was not found in the current repository search.

Therefore this checkpoint assigns **P1-218**.

## Validation state

Documentation only. Historical **88/88 JS syntax + 74/74 deterministic tests PASS** remain historical evidence and were **not rerun** for this current HEAD. Real unpacked Chrome QA remains a release requirement.