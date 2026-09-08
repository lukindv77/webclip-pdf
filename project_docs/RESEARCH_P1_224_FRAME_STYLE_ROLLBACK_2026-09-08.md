# P1-224 — generation-owned compare-before-restore for same-origin frame/ancestor print styles

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-224`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Research branch: `research/p1-224-frame-style-rollback-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-224 remains the single current owner for this root cause:

> Same-origin frame/ancestor print style/marker rollback needs compare-before-restore; whole old style cannot overwrite newer host inline style.

Historical family evidence already identified the defect in `RESEARCH_DELTA_FRAME_LAYOUT_STYLE_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`. The current pass binds it to fresh `main`, expands the contract from whole-style corruption to property/value/priority ownership, covers marker parity and preparation-generation takeover, and adds deterministic/model + source-bound closure gates.

No new P-code is required.

## 2. Current source — receipt is an old snapshot, not mutation authority

Current `content.js::rememberFramePrintMutation()` deduplicates by exact element and stores:

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

This captures historical state but not the exact temporary state WebClip later writes.

There is no explicit preparation generation/epoch in the receipt.

## 3. Current source — WebClip mutates many live inline properties

`applySelectedFramePrintFlow()` writes a broad set of properties directly into page-owned live DOM using `style.setProperty(..., 'important')`.

Representative properties include:

- `display`;
- `visibility`;
- `opacity`;
- `position`;
- `float`;
- `inset`;
- `transform`;
- `clip` / `clip-path`;
- `contain`;
- `content-visibility`;
- `overflow`, `overflow-x`, `overflow-y`;
- `max-height`, `min-height`, `min-width`;
- selected iframe `height`, `width`, `max-width`, `box-sizing`, margins;
- ancestor-chain `height:auto`.

`markFrameChainsForPrint()` additionally writes WebClip markers:

- `FRAME_INCLUDE_ATTR`;
- `FRAME_CHAIN_ATTR`.

The purpose is legitimate and belongs to the existing selected-frame print-flow architecture. P1-224 is not a proposal to remove P1-149 behavior; it controls cleanup authority while those live mutations remain.

## 4. Current cleanup — whole-style stale writer

`restoreFramePrintMutation(item)` currently does:

```js
if (item.oldStyle == null) element.removeAttribute('style');
else element.setAttribute('style', item.oldStyle);

if (item.hadFrameInclude) element.setAttribute(FRAME_INCLUDE_ATTR, item.oldFrameInclude ?? '');
else element.removeAttribute(FRAME_INCLUDE_ATTR);

if (item.hadFrameChain) element.setAttribute(FRAME_CHAIN_ATTR, item.oldFrameChain ?? '');
else element.removeAttribute(FRAME_CHAIN_ATTR);
```

No live temporary-state comparison is performed.

Therefore an old snapshot is treated as authority to rewrite current host state.

## 5. Deterministic stale-write counterexample

Initial host style:

```text
position: relative;
color: black;
```

Preparation G writes:

```text
position: static !important;
```

While G is active, the page legitimately writes an unrelated property:

```text
color: red;
```

Current cleanup restores the complete old style string:

```text
position: relative;
color: black;
```

The newer page-owned `color:red` is destroyed even though WebClip never owned `color`.

The defect is stronger when the original element had no `style` attribute: a host style created during preparation can be deleted wholesale by `removeAttribute('style')`.

## 6. Touched-property supersession

The same root cause affects properties WebClip did touch.

Example:

1. host has `position:relative`;
2. G writes `position:static !important`;
3. host later writes `position:fixed`;
4. G cleanup restores `position:relative` from the old style snapshot.

The live host value proves WebClip no longer owns the temporary state. Cleanup must preserve `fixed` and report the rollback as superseded.

## 7. CSS priority is part of exact ownership

For inline CSS, exact temporary state is not only the textual property value.

The ownership receipt must include:

```text
{
  present,
  value,
  priority
}
```

where `priority` distinguishes ordinary inline state from `!important`.

A host write that changes only priority is still a state change. Comparing only `getPropertyValue()` would allow WebClip to mutate a property after ownership was lost.

The source closure gate therefore requires both `getPropertyValue()` and `getPropertyPriority()`.

## 8. Marker parity

`FRAME_INCLUDE_ATTR` and `FRAME_CHAIN_ATTR` have the same compare-before-restore requirement.

A marker receipt needs:

```text
originalMarker { present, value }
temporaryMarker { present, value }
```

Cleanup may restore/remove the marker only when the live marker still exactly equals `temporaryMarker` for the owning generation.

If the host changes/removes the marker, mismatch means `superseded-by-host`, not authority to force the historical value back.

## 9. Target receipt model

A practical receipt for one element is conceptually:

```text
FramePrintMutationReceipt {
    generation
    element
    kind

    properties: Map<PropertyName, {
        original { present, value, priority }
        temporary { present, value, priority }
    }>

    markers: Map<AttributeName, {
        original { present, value }
        temporary { present, value }
    }>
}
```

The exact production schema/name is implementation-specific.

The important property is that the receipt describes WebClip's **specific mutations**, not a general historical snapshot of the element.

## 10. Core invariants

### I1 — property-scoped authority

WebClip can roll back only properties it explicitly changed.

An unrelated host inline property is outside WebClip cleanup authority.

### I2 — compare before restore

For each WebClip-touched property:

```text
live value+priority == exact temporary value+priority
```

is required before restoring the original property state.

Mismatch means no mutation.

### I3 — marker compare before restore

The same rule applies independently to `FRAME_INCLUDE_ATTR` and `FRAME_CHAIN_ATTR`.

### I4 — no whole-style rollback

An old complete `style` string is evidence/history only. It cannot be written back as cleanup authority.

Likewise `oldStyle == null` cannot justify removing the current whole `style` attribute.

### I5 — preparation-generation ownership

A mutation receipt belongs to one exact preparation generation.

Cleanup G1 cannot mutate a property/marker currently owned by a newer G2.

### I6 — takeover preserves the true host baseline

If G2 begins while G1's exact temporary value is still live, G2 may take over that mutation but must inherit G1's true original host baseline rather than treating G1's temporary value as page state.

If the host already superseded G1 before G2 begins, G2 must use the new host state as its own original baseline.

### I7 — bounded diagnostics

A host-superseded rollback should be observable through bounded diagnostics such as property/marker name and outcome, without serializing page-controlled style contents unnecessarily.

## 11. Preparation-generation schedules

### Schedule A — intact ownership

```text
host original
→ G writes temporary
→ no host mutation
→ G compares exact live temporary
→ restore exact original
```

PASS behavior.

### Schedule B — touched property superseded

```text
host position=relative
→ G position=static!important
→ host position=fixed
→ cleanup sees mismatch
→ preserve fixed
```

### Schedule C — unrelated property changed

```text
host color=black
→ G touches layout properties, not color
→ host color=red
→ G restores only owned properties
→ color=red survives
```

### Schedule D — original style absent

```text
no original inline style
→ G installs temporary layout properties
→ host adds border-top-width
→ G removes/restores only G-owned properties
→ host border remains
```

### Schedule E — marker superseded

```text
G marker='1'
→ host marker='host-new'
→ mismatch
→ preserve host-new
```

### Schedule F — pre-existing marker

```text
host marker='host-before'
→ G marker='1'
→ unchanged temporary remains
→ restore host-before
```

### Schedule G — G1 → G2 takeover

```text
host baseline H
→ G1 installs T1
→ G2 observes still-owned T1 and installs T2
→ late G1 cleanup cannot mutate G2
→ G2 cleanup restores H
```

### Schedule H — host supersedes before G2

```text
host H1
→ G1 temporary T1
→ host H2
→ G2 begins and captures H2 as baseline
→ G1 cleanup cannot alter G2
→ G2 cleanup restores H2
```

## 12. Deterministic model

Added:

`project_tools/test_p1_224_frame_style_rollback_model.js`

The model first reproduces the current whole-style stale-write counterexample.

It then runs the same A-H ownership suite for:

- `same-origin-frame`;
- `ancestor-chain`.

Expected output:

```text
P1-224 current-shape counterexample: whole-style rollback destroys newer host inline style
P1-224 same-origin-frame parity suite: PASS
P1-224 ancestor-chain parity suite: PASS
P1-224 frame/ancestor style+marker rollback deterministic model: PASS
```

This is a deterministic state model, not physical Chrome evidence.

## 13. Source-bound closure gate

Added:

`project_tools/test_p1_224_frame_style_rollback_source.js`

Positive controls retain the current feature shape:

- `changedFrameStyles`;
- `rememberFramePrintMutation()`;
- `applySelectedFramePrintFlow()`;
- `restoreFramePrintMutation()`;
- `FRAME_INCLUDE_ATTR`;
- `FRAME_CHAIN_ATTR`.

The future production gate requires:

1. explicit preparation generation/epoch;
2. property-level structured receipts;
3. exact temporary property state;
4. live value read before rollback;
5. live priority read before rollback;
6. compare/superseded/generation branch;
7. no whole `style` restoration from `oldStyle`;
8. no whole `style` removal because old style was absent;
9. exact temporary marker receipts;
10. live marker compare-before-restore.

Current source is expected RED against this closure contract.

## 14. Owner boundaries

### P1-149

P1-149 owns the selected iframe/ancestor print-flow normalization and its normal exact restoration behavior. P1-224 does not reopen the reason that normalization exists.

P1-224 adds the concurrent ownership rule when host state changes after temporary mutation.

### P1-218

P1-218 owns compare-before-restore for temporary resource attributes such as `src`, `srcset`, and `loading`, including frame-agent parity.

P1-224 owns CSS layout properties and `FRAME_INCLUDE_ATTR` / `FRAME_CHAIN_ATTR` for same-origin frame/ancestor print normalization.

### P1-199 / P1-214

Those owners govern cross-origin remote-frame print generation/partial-success settlement. P1-224 is about live same-origin DOM style/marker mutation authority.

### P0-075

P0-075's isolated/frozen print representation remains the preferred architectural direction because avoiding live host mutation eliminates this class of rollback race.

P1-224 remains necessary while live normalization exists.

## 15. Required production regressions

Before P1-224 can close, production evidence should cover at least:

1. No host mutation after prepare -> exact original WebClip-touched style properties restore.
2. Host changes an unrelated inline property while G is active -> the property survives cleanup.
3. Host changes a property WebClip also touched -> host value survives and cleanup reports superseded.
4. Original element had no style attribute; host adds style during print -> cleanup does not remove the host style.
5. Host changes only CSS priority on a touched property -> cleanup treats it as superseded.
6. Host changes/removes `FRAME_INCLUDE_ATTR` -> cleanup does not overwrite the host marker state.
7. Host changes/removes `FRAME_CHAIN_ATTR` -> cleanup does not overwrite the host marker state.
8. Pre-existing host marker value restores when exact temporary WebClip marker remains.
9. G1 cleanup cannot undo G2 preparation.
10. G2 takeover of still-owned G1 temporary state ultimately restores the true pre-G1 baseline.
11. Host supersedes G1 before G2 -> G2 ultimately restores the newer host baseline.
12. Same-origin iframe height stabilization continues to produce the required selected-content print geometry when ownership remains exact.
13. Ancestor-chain normalization retains existing P1-149 positive behavior.
14. Success and failure cleanup paths use the same ownership rule.

Physical Chrome evidence is required before closure for actual live DOM/CSSOM behavior, including `!important`, style-attribute serialization and same-origin iframe print rendering.

## 16. Validation state

Actually executed during this research block:

- `node --check project_tools/test_p1_224_frame_style_rollback_model.js` — PASS on the locally created model bytes;
- deterministic model execution — PASS;
- local Git blob hash of the executed model bytes recorded for exact committed-blob comparison;
- `node --check project_tools/test_p1_224_frame_style_rollback_source.js` — PASS on locally created gate bytes;
- local Git blob hash of the source-gate bytes recorded for exact committed-blob comparison.

The source gate was **not** executed against an exact materialized current `content.js` checkout in the execution container. Current RED is established by direct GitHub source inspection, not misrepresented as executed source-gate evidence.

No production PASS and no physical Chrome E2E are claimed.

## 17. Research conclusion

Current `content.js` restores whole old inline-style strings and historical marker state without proving that the current state remains WebClip-owned. This can overwrite both touched and unrelated newer host mutations.

The minimal live-DOM-safe direction is property/value/priority CAS + marker CAS + preparation-generation ownership. The stronger architectural direction remains moving normalization into a WebClip-owned frozen print representation.

P1-224 therefore remains ACTIVE until production implementation and direct verification satisfy the closure criteria.
