# Audit delta — P1-218 remote-frame resource rollback parity — 2026-08-29

Baseline `main` before this write: `41b24308d70a16d93faa63a0933d5991f3615688`.

Docs-only audit checkpoint. Runtime/tests/manifest/build/release are unchanged.

## Classification

**Extend existing P1-218; no new P-number.**

The same compare-before-restore defect confirmed in top-frame `content.js` also exists independently in cross-origin `frame-agent.js`.

## Source proof

`frame-agent.js::prefetchSelected()` temporarily mutates selected image attributes:

- missing `src` may be populated from `data-src`;
- `loading="lazy"` is changed to `loading="eager"`;
- `rememberAttr()` records prior state in `state.changedAttrs`.

`restorePrint()` later does:

```js
for (const x of state.changedAttrs.reverse()) {
  try {
    x.had ? x.el.setAttribute(x.name, x.value ?? '') : x.el.removeAttribute(x.name)
  } catch (_) {}
}
```

There is no comparison against the temporary value WebClip itself wrote. A page script in that child document can therefore change `src`/`loading` after prepare, and late restore will overwrite the newer page-owned value with the pre-prepare snapshot.

## Boundary vs P1-214

`P1-214` owns the top↔remote-frame prepare/restore saga and exact rollback settlement receipt: which child generation was prepared, whether restore was sent/acknowledged, and what remains unresolved.

That does not prove authority for each DOM write **inside** the child. Even a restore RPC delivered to the exact correct child document can still be a stale writer with respect to newer host-page mutations in that same document.

Therefore remote-frame cleanup needs both:

1. P1-214 exact child prepare/restore settlement ownership; and
2. P1-218 compare-before-restore ownership for temporary resource attributes.

## Required regression parity

1. Child image has no `src`; WebClip copies `data-src`; child app writes a different `src`; restore leaves child app value.
2. Child `loading=lazy` -> WebClip `eager`; child changes/removes it; restore does not resurrect `lazy` over newer state.
3. Exact temporary value still present -> original value/presence restores normally.
4. Old child prepare generation restore cannot touch a new child document generation under P1-214.
5. Correct child generation but host superseded the attribute -> P1-218 marks cleanup `superseded-by-host`, not failure.

## Duplicate check

Repository audit map already contains P1-214 for remote-frame restore settlement and the immediately preceding P1-218 delta for resource rollback ownership. No separate owner is warranted; this is execution-context parity of the same root cause.

## Validation state

Documentation only. Historical 88/88 syntax and 74/74 deterministic test results were not rerun for this HEAD.