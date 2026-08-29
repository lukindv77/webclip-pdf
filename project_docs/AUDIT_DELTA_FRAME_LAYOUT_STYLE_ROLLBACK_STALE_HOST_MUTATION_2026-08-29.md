# Audit delta — frame/ancestor print-layout rollback must not overwrite newer host styles — 2026-08-29

Baseline `main` before this write: `632c8cd539abbb1706baaaa565ab95c584cdb8e1`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-224 — same-origin iframe/ancestor print-layout rollback restores a whole pre-print `style` snapshot and marker state without proving that the current state is still WebClip-owned.**

P1-149 owns the need to normalize selected iframe/ancestor layout and restore it. P1-224 adds the missing concurrent-ownership rule: “exactly restore the old inline style” is unsafe if the host legitimately changed that style after WebClip's temporary write.

## Source proof

`rememberFramePrintMutation()` captures only the pre-mutation state:

```js
{
  element,
  kind,
  oldStyle: element.getAttribute?.('style') ?? null,
  hadFrameInclude,
  oldFrameInclude,
  hadFrameChain,
  oldFrameChain
}
```

`applySelectedFramePrintFlow()` then modifies multiple inline style properties on the **live frame/ancestor DOM**.

At cleanup `restoreFramePrintMutation()` unconditionally replaces/removes the entire `style` attribute and restores/removes WebClip marker attributes:

```js
if (item.oldStyle == null) element.removeAttribute('style');
else element.setAttribute('style', item.oldStyle);
```

No temporary-style snapshot, generation receipt or compare-before-restore is checked.

## Deterministic stale rollback

1. Ancestor/frame element E has inline style S0.
2. WebClip print generation G snapshots S0 and applies temporary print normalization S1.
3. During print, SPA/layout code updates E's inline style to newer S2, for example responsive height/transform/overflow/position state.
4. G cleanup runs.
5. `restoreFramePrintMutation()` replaces the **entire** current `style` attribute with S0.
6. Every page-owned inline change made after G started is lost, including properties WebClip never intended to own individually.

Because the rollback writes the complete `style` string, one host update to any unrelated inline property can be destroyed.

The same ownership problem applies to `FRAME_INCLUDE_ATTR` / `FRAME_CHAIN_ATTR`: restoring from only old presence/value does not prove the current marker value is still G's temporary write. These markers are page-visible and can also be changed by the host or a newer WebClip generation.

## Required contract

Prefer P0-075's isolated/frozen print representation so host layout is not mutated.

While live normalization remains:

- capture exact temporary values/properties written by the preparation generation;
- rollback each owned property/marker only if the live value still matches the generation's temporary value;
- do not replace the whole `style` attribute from an old snapshot after any host change;
- preserve host changes to unrelated style properties;
- generation-token the frame/ancestor mutation set so G1 cleanup cannot undo G2 preparation;
- treat mismatch as `superseded-by-host`, not as a reason to force old layout back;
- if safe property-level rollback cannot be made reliable, move the normalization to a WebClip-owned print clone/proxy instead of live DOM.

## Required regressions

1. No host mutation after G -> exact original WebClip-owned style properties restore.
2. Host changes an unrelated inline style property while G active -> property survives cleanup.
3. Host changes a property also touched by WebClip -> host value survives; cleanup reports superseded.
4. Original element had no style attribute; host adds style during print -> cleanup does not remove it.
5. Old G1 cleanup cannot overwrite G2 frame normalization.
6. Marker attributes changed by host/newer generation are not restored/removed using stale G1 snapshot.
7. Same-origin iframe height stabilization still restores correctly when ownership remains exact.
8. P1-149 real-page regression remains valid after property-level/frozen rollback design.

## Duplicate check / numbering

Repository semantic search for `changedFrameStyles`, `oldStyle`, concurrent host style mutation, frame-layout rollback CAS found no dedicated existing audit item. P1-149 specifies exact rollback to original inline styles but does not define compare-before-restore against newer host writes; P0-075 supplies the broader frozen-representation direction.

Current repository search found no `P1-224`; P1-223 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-224**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests were not rerun for this HEAD. Real unpacked Chrome QA remains required.