# Durable audit evidence — post-freeze physical render cut, final classification — 2026-08-30

This file closes the interruption-safe **56-block** deep-audit tranche whose detailed Blocks 1–44 are preserved in:

- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_2026-08-30_EVIDENCE.md` — Blocks 1–12;
- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE2_2026-08-30_EVIDENCE.md` — Blocks 13–20;
- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE3_2026-08-30_EVIDENCE.md` — Blocks 21–32;
- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_STAGE4_2026-08-30_EVIDENCE.md` — Blocks 33–44.

Exact fresh runtime baseline audited: `main = 2b2522130792d8d023b540216f9742c3f7226d2e`.

Working branch: `audit/post-freeze-physical-render-cut-20260830`.

Managed Chromium: `144.0.7559.96` on Debian 13. Direct PDF/raster probes are deterministic engineering evidence, not real unpacked-extension release QA.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this audit tranche.

## Executive result

**No new permanent P-code and no canonical status transition.**

The tranche directly revalidates existing frozen-render architecture with current browser proof rather than discovering an independent root cause:

- **P0-070 ACTIVE — primary.** Exact full-document save generation currently ends only conceptually; the physical Chromium render remains a later mutable live-DOM cut. `meta`, `meta.pageAnalysis`, beforeprint diagnostics and post-print diagnostics are not an immutable receipt for the bytes returned by `Page.printToPDF`.
- **P0-075 ACTIVE — primary.** Shared page DOM and page-dispatch `beforeprint/afterprint` cannot be trusted as the control plane for authoritative print filtering, WebClip UI hiding, print metadata header, flattened proxies or internal print-lifecycle state. Isolated JavaScript worlds do not isolate shared DOM artifacts.
- **P0-004 ACTIVE — primary.** The user-selected physical PDF can gain/lose content, change geometry/page size or rasterized presentation after preparation through ordinary page lifecycle mutation.
- **P1-003 ACTIVE — supporting refinement.** A bounded resource-prefetch report is not proof of the resource identity ultimately rasterized: already-loaded `<img>` and CSS background resources can be switched in `beforeprint`, while pseudo/CSS visual state can also change.
- **P1-187 ACTIVE — supporting refinement.** Connected flattened proxies and renderer-owned bitmap state such as canvas remain mutable at the final cut; an inert clone is insufficient if the host can still rewrite/remove it before print.
- **P1-229 ACTIVE — supporting refinement.** Cross-origin/opaque child selected representation must be both media-correct and page-non-authoritative. Fixing only `screen` versus `print` does not close a child filter that the child page can remove in `beforeprint`.

P1-230 is deliberately **not allocated**. The current registry permanently occupies P1-195…P1-229, and all fresh schedules fit existing owners above.

## Blocks 45–56 — dedup, controls and closure contract

### Block 45 — historical frozen-print evidence already owns the general live-DOM TOCTOU — duplicate control

The consolidated PDF family already states that after `prepareForPrint(meta)` returns, Chromium renders the current live representation and that page timers, MutationObservers and `beforeprint` can alter it. It already requires a frozen representation where later host marker/href/src/subtree/stylesheet mutation cannot expand privileged output.

Fresh Blocks 1–44 add direct current Chromium proof, event-order/lifecycle proof and rendered-state breadth; they do not justify splitting the same architecture across another permanent owner.

### Block 46 — P0-071 remains the URI-specific sibling, not the owner of all physical mutation — duplicate boundary

Historical P0-071 explicitly owns hostile `beforeprint` / post-sanitization URI recontamination on the actual printed representation.

This tranche proves the same architectural boundary for text, children, styles, header, proxies, frames, images, backgrounds, canvas, SVG, form values, disclosure state and `@page` geometry. Those non-URI manifestations remain P0-070/P0-075/P0-004 rather than expanding P0-071 into a generic print owner.

### Block 47 — PR #25 cascade override and direct style removal are different schedules under the same root

PR #25 proved that page author-origin important declarations can defeat WebClip's live selected-only hide rule.

Fresh Block 7 proves the page can instead remove WebClip's shared `<style data-webclip-print-style>` during `beforeprint`, with no competing cascade declaration at all, and unselected content enters the PDF.

The schedules differ, but both demonstrate the same P0-075/P0-004 invariant: live page CSS/DOM cannot be the authoritative selected-only representation.

### Block 48 — P1-229 media correction must compose with host-isolation, not replace it

PR #24 established the current cross-origin child `screen`/`print` mismatch. Stage 3's emulated-print control proves that with media semantics corrected the child selected-only filter works in a neutral fixture, but a child page `beforeprint` can remove the shared style and reveal unselected content.

Acceptance for P1-229 therefore requires one WebClip-owned selected representation that is both media/geometry-correct **and** not page-removable/overridable at the physical cut.

### Block 49 — rollback owners P1-218/P1-219/P1-220/P1-224 stay distinct

Targeted dedup checked the late print-cleanup owners:

- P1-218 — temporary resource-attribute compare-before-restore;
- P1-219 — image-wrapper structural reparent rollback;
- P1-220 — exact generated print-header node cleanup;
- P1-224 — same-origin frame/ancestor style/marker compare-before-restore.

Fresh `printUiHidden` stale-latch and event-delivery schedules are not those rollback identities. They refine P0-075/P0-070 because internal lifecycle correctness currently depends on untrusted page-dispatch event delivery. Do not merge or repurpose the narrower rollback owners.

### Block 50 — mutation after the physical cut does not retroactively alter generated bytes — positive control

Blocks 1 and 11 repeatedly separate `beforeprint`/microtask mutation from later `afterprint`/timer mutation:

- values established before Chromium layout appear in the PDF;
- values changed only in `afterprint` or a later timer do not rewrite the already returned PDF.

This is useful: the defect is not an impossible demand to freeze the page forever. The required immutable/fenced interval ends when the physical PDF byte generation for that operation is settled.

### Block 51 — rAF and newly created iframe negative controls bound the timing claim

Two hypotheses did **not** reproduce as physical mutations in the reviewed Chromium path:

1. `requestAnimationFrame` scheduled from `beforeprint` ran only after the print cut; PDF retained the prepared value.
2. a brand-new `srcdoc` iframe created synchronously in `beforeprint` did not load child text in time for that PDF.

These controls prevent overclaim. Synchronous listener work and microtasks do win; already-loaded hidden frame content can be revealed; arbitrary later animation frames/new frame navigations are not claimed to complete before layout.

### Block 52 — checking `event.isTrusted` is necessary for synthetic-event hardening but not sufficient for physical isolation

Blocks 29–30 prove synthetic `beforeprint/afterprint` can directly drive the current print-UI latch because handlers do not reject `isTrusted=false`.

Adding a trusted-event check would close those two exact synthetic schedules, but would **not** close:

- earlier page `stopImmediatePropagation()` suppressing the trusted handler;
- later trusted page listener undoing shared-DOM mutations;
- page/child mutation of selected content, styles, resources, proxy or geometry during its own trusted print event;
- microtask/MutationObserver reactions to WebClip's shared-DOM writes.

Therefore `isTrusted` is defense-in-depth, not the architecture closure.

### Block 53 — capture/listener-order tricks cannot make a page-dispatch event an authority boundary

The current handlers are ordinary `window.addEventListener('beforeprint', ...)` / `afterprint` listeners. Content script is injected on demand, so an ordinary page listener can preexist it.

Even changing listener options cannot establish exclusive ownership of a shared event target: page code can have an earlier listener, can mutate after an extension listener, can dispatch synthetic events unless rejected, and can mutate shared DOM through observers/microtasks independently of event order.

Closure must not depend on “our listener runs last/first”.

### Block 54 — diagnostics should stay bounded telemetry, not grow into a privacy-expensive DOM hash surrogate

Fresh proof shows current diagnostics intentionally omit rendered state such as form `.value`, canvas bitmap, background resource identity and pseudo generated content. Same-length text replacement can also preserve structural counters.

Trying to authorize PDF bytes by logging progressively more raw page state would conflict with bounded-work/privacy goals and still be difficult to make complete for renderer state.

Preserve P1-167-style bounded diagnostics as troubleshooting evidence. Establish render authority through representation/generation ownership instead.

### Block 55 — required deterministic regression matrix

A future implementation should preserve automated/managed-browser regressions for at least:

1. selected text replaced in hostile `beforeprint` -> emitted representation remains admitted value or operation fails/reconfirms;
2. sensitive descendant inserted after preparation -> absent;
3. selected descendant removed -> operation does not silently report the older scope as exact;
4. WebClip selected-only style/header/proxy page removal or mutation -> cannot change authoritative output;
5. earlier `stopImmediatePropagation()` cannot strand correctness;
6. later page listener cannot re-show WebClip UI in the PDF;
7. synthetic `beforeprint/afterprint` cannot control extension print state;
8. operation cleanup clears all internal print lifecycle latches even if browser event delivery is absent;
9. already-ready `<img>` and CSS background resource switch cannot change frozen output;
10. canvas/SVG/form/disclosure/pseudo state is bound to the same render generation;
11. hostile `@page` mutation cannot replace the admitted WebClip page-box contract unless product semantics explicitly delegate it;
12. opaque/cross-origin child `beforeprint` cannot change selected-only physical representation;
13. P1-229 media-independent/print-media positive control remains selected-only and page-non-authoritative;
14. afterprint/timer mutation after byte settlement does not incorrectly invalidate an already exact completed PDF;
15. rAF/new-frame negative controls remain documented so timing assertions stay precise.

### Block 56 — implementation acceptance / session closure

The 56-block tranche converges on one closure contract:

1. **Freeze or isolate the exact selected representation before physical render.** Page JavaScript/CSS must be unable to expand, shrink or rewrite authoritative printable content after admission.
2. **Bind metadata, selection receipt, resources, frame representations and physical bytes to one operation/document/application/render generation.**
3. **Do not use beforeprint/afterprint diagnostics as authorization.** They remain bounded telemetry.
4. **Do not depend on page-dispatch print events for correctness.** UI hiding/event hooks may remain best-effort if failure cannot affect output authority.
5. **Reset operation-owned internal print lifecycle state from explicit cleanup/finally paths**, independent of event delivery.
6. **Treat synthetic lifecycle events as untrusted input** if event handlers remain, while recognizing this is only defense-in-depth.
7. **Preserve resource/frame owner composition:** P1-003, P1-187 and P1-229 must consume the same frozen render generation rather than independently preparing a later-live page.
8. **Keep rollback CAS/exact-node owners distinct** for any unavoidable temporary live-DOM mutation before the frozen representation is established.
9. **Fail/reconfirm rather than silently claim exactness** if the source generation changes before the immutable physical representation is committed.
10. **Real unpacked Chrome remains required release QA** for content-isolated-world, optional-host-permission cross-origin frames and actual extension lifecycle. Managed Chromium fixtures here are direct engineering evidence, not a release PASS.

## Final owner/status decision

No registry edit is required because the current owner wording already covers the root causes and remains ACTIVE.

Materially refined owners for PR impact are:

`P0-070, P0-075, P0-004, P1-003, P1-187, P1-229`

No other P-code status/owner is changed. P1-230 remains unallocated by this tranche.
