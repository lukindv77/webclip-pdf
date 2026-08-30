# Durable audit evidence — mandatory hover exclusion contract — C26 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`.

Exact fresh audited runtime baseline: `main = 153d09c164473643229b29946dc35ba413715913`.

Working branch: `audit/hover-exclusion-contract-2026-08-30`.

Normative acceptance: `WEBCLIP_PDF_FIDELITY_CONTRACT.md` requires the current primary PDF to exclude hover-only state even when the user is hovering at admission. Hover menus/tooltips/overlays/flyouts and hover-only pseudo/state styling are outside the current PDF representation. If hover cannot be disentangled without destroying other admitted non-hover state, the result must be truthful degraded/unknown rather than silently faithful.

Managed browser used for fresh direct probes: Chromium 144, with screen media and physical PDF generation. Probes are deterministic engineering evidence, not real unpacked-extension release QA. Safe local fixtures only; no external site was exercised. Reproducible probe: `project_tools/audit_hover_exclusion_contract.py`.

No runtime source, registry status, manifest/version/build/tag/release state is changed by this audit tranche.

## Executive classification

**C26 = `ARTIFACT-COVERED / FINDING`. No new P-code and no canonical status transition.**

Fresh current source plus L3/L4 controls show a narrower result than “hover is generically preserved”:

- direct Chromium can physically serialize CSS `:hover`, hover-generated pseudo text and JS hover-mounted content;
- current WebClip's full-screen review backdrop naturally removes ordinary CSS `:hover` and causes `pointerleave` in the tested top-document and same-origin-frame controls;
- therefore a broad “all CSS hover enters PDF” finding is rejected for the normal review-overlay path;
- however current capture/preparation has no immutable non-hover representation/provenance boundary. A flyout mounted by hover/pointer entry that remains in the live DOM after `pointerleave` is indistinguishable from ordinary selected DOM and is physically saved;
- current diagnostics do not receipt hover provenance or prove that a mounted node/state was independent of hover;
- an open non-hover dialog remains physically present in the same controls, proving that a valid repair cannot simply delete all transient/top-layer state.

This is a **current-contract refinement of existing P0-075 / P0-070 / P0-004**, not an independent new owner. The earlier focus/interaction tranche already proved the live control-plane interaction root cause and explicitly assigned physical hover branches to these owners while product semantics were still undecided. The later PDF contract resolves that ambiguity in favor of mandatory hover exclusion; it does not create a different underlying mechanism.

## Blocks 1–6 — current source and historical boundary

### Block 1 — current selection UI tracks an extension hover outline, not page hover provenance

Fresh `content.js` still has `state.hoverElement` and registers capture-phase `mousemove` listeners during selection. `onMouseMove()` updates WebClip's own suggested/hover outline when `state.phase === 'selecting'`.

On transition to review, current command flow sets:

- `state.phase = 'review'`;
- `state.hoverElement = null`;
- `updateHoverOutline()`.

This clears the **WebClip outline state only**. It is not a browser/page `:hover` normalization receipt and does not classify page DOM that was mounted because of earlier pointer activity.

### Block 2 — review backdrop changes pointer hit testing

Current Shadow host is fixed/high-z with `pointer-events:none`, while `.backdrop` is fixed `inset:0` and `pointer-events:auto` when the save/review modal is visible.

Therefore the ordinary review UI can become the pointer hit target and make the underlying page stop matching CSS `:hover`. This is a useful current positive mechanism and is tested directly below rather than assumed to be insufficient.

### Block 3 — beforeprint hides the WebClip host but does not construct a non-hover representation

Current `hideWebClipUiForPrintRender()` records diagnostics, then applies `state.host.style.display = 'none'` for the print render and restores the host after print.

There is no source phase that:

- records which page presentation/DOM was caused only by hover;
- creates an inert non-hover clone/representation;
- removes hover-opened mounted page UI by trusted provenance;
- or reports inability to distinguish such state as degraded/unknown.

### Block 4 — current same-origin top capture also has no page hover-history record

Top `content.js` selection listeners observe mouse movement for WebClip selection UX, but current state/diagnostics do not maintain an immutable pointer/hover provenance graph. A node that exists in selected DOM at preparation time is generally treated as current content unless another selection/materialization rule removes it.

### Block 5 — cross-origin frame agent has no hover admission model

Fresh `frame-agent.js` state contains phase/mode/Include/Exclude/print rollback data. Its selection listeners are click/keydown based and its `preparePrint()` operates on current selected DOM/resources. It carries no pointer/hover receipt and no non-hover materialization phase.

This means frame parity cannot be inferred from the top WebClip outline state.

### Block 6 — historical PR #48 proved the platform mechanism but not today's product outcome

The earlier focus/interaction tranche directly proved that hovered CSS state and hover-only mounted content can be physically serialized, and that pointer movement to WebClip-like UI changes that state. It intentionally did not choose whether hover should be preserved because the capture-mode policy was then unresolved.

The current PDF contract now explicitly answers that product question: hover-only state is excluded. The old factual L4 controls remain valid, but the outcome must be reclassified against the new acceptance rule.

## Blocks 7–13 — fresh top-document L3/L4 controls

### Block 7 — direct hovered representation is physically printable

Fresh fixture contained:

- `HOVER_TARGET` with normal blue background;
- CSS `:hover` red background;
- nested `CSS_HOVER_ONLY` shown only by `:hover`;
- `::after` generated `PSEUDO_HOVER_ONLY` only by `:hover`;
- JS `pointerenter` mounting `JS_HOVER_MOUNTED`;
- independent open `<dialog>` `OPEN_DIALOG_POSITIVE`.

Pointer remained over the target for direct screen-media PDF.

Before print:

- target `:hover = true`;
- CSS hover panel `display:block`;
- JS hover-mounted node present.

Physical PDF text contained all of:

- `HOVER_TARGET`;
- `CSS_HOVER_ONLY`;
- `PSEUDO_HOVER_ONLY`;
- `JS_HOVER_MOUNTED`;
- `OPEN_DIALOG_POSITIVE`.

PDF SHA-256: `c3d4172d4a8804d5fff29b6968bf4593a2cdc8e353ad1ef39ab5effb1f26910f`.

This is a platform risk control, not yet the current-path finding.

### Block 8 — WebClip-shaped backdrop clears ordinary CSS hover: positive control

On a fresh equivalent fixture, pointer first entered the target and created all hover states. Then a WebClip-shaped zero-size Shadow host/full-screen pointer-active backdrop plus focused Shadow textarea was installed without a synthetic page click.

After the backdrop appeared:

- target `:hover` became false;
- CSS hover panel became `display:none`;
- page event log became exactly `enter, leave`;
- the JS-mounted node remained present because this fixture intentionally retained it on leave;
- non-hover `<dialog open>` remained open.

This rejects the broad claim that current review UI necessarily leaves ordinary CSS hover active.

### Block 9 — beforeprint host hiding did not re-enable CSS hover in the tested path

The fixture modeled current beforeprint behavior by hiding the WebClip-shaped host during `beforeprint` and restoring it during `afterprint`.

Both pre-hide and post-hide lifecycle snapshots remained:

- target `:hover = false`;
- CSS panel hidden;
- JS hover-mounted node present.

Therefore this fresh tranche does **not** claim a new “beforeprint host hide reactivates CSS hover” defect in tested Chromium.

### Block 10 — sticky hover-opened JS content physically survives current-shaped review flow: FINDING

Physical PDF after the WebClip-shaped backdrop/leave sequence contained:

- `HOVER_TARGET`;
- `JS_HOVER_MOUNTED`;
- `OPEN_DIALOG_POSITIVE`.

It did **not** contain:

- `CSS_HOVER_ONLY`;
- `PSEUDO_HOVER_ONLY`.

PDF SHA-256: `264511dcf0edbbf57872a8f6a96631f313d4272ea0bce191b278da4139fe6c52`.

The user-triggered hover flyout is therefore still in the physical artifact even though ordinary CSS hover has already ended. Current preparation has no provenance boundary that can say “this mounted DOM exists only because the user hovered before WebClip opened its review UI”. It silently treats the mounted result as ordinary current DOM.

Under the current PDF contract this is a violation: hover-opened flyout state must not enter the copy merely because page code retained its DOM after pointerleave.

### Block 11 — page-owned leave cleanup is a positive control

Equivalent fixture removed `JS_HOVER_MOUNTED` from its own `pointerleave` handler.

After WebClip-shaped backdrop:

- CSS hover false;
- event log `enter, leave`;
- JS hover node absent.

Physical PDF contained `HOVER_TARGET` and `OPEN_DIALOG_POSITIVE`, but no CSS/pseudo/JS hover-only text.

PDF SHA-256: `a5372cb2a6086fc0e85fb745a95fe9b877414a27a2fa96c9373b0540e7b2af7a`.

Thus the finding is not “WebClip must invoke arbitrary page close handlers”. Page-owned cleanup sometimes happens naturally. The defect is the lack of a trusted admitted non-hover representation/truth boundary when it does not.

### Block 12 — non-hover open dialog survives: contract-boundary positive control

`OPEN_DIALOG_POSITIVE` remained in both WebClip-shaped physical PDFs, including the one where CSS hover and page-owned JS flyout were absent.

This is required precision: current PDF preserves admitted non-hover top-layer state. A future hover repair cannot implement “remove all overlays/dialogs/transient nodes”. It must distinguish hover-only representation from allowed non-hover state, or report degradation when that distinction cannot be proven.

### Block 13 — physical outcomes are materially distinguishable

Screen-media physical hashes were distinct:

- direct hovered: `c3d4172d4a8804d5fff29b6968bf4593a2cdc8e353ad1ef39ab5effb1f26910f`;
- WebClip-shaped sticky JS: `264511dcf0edbbf57872a8f6a96631f313d4272ea0bce191b278da4139fe6c52`;
- WebClip-shaped page-cleaned JS: `a5372cb2a6086fc0e85fb745a95fe9b877414a27a2fa96c9373b0540e7b2af7a`.

The finding is a physical artifact difference, not only a source-theory concern.

## Blocks 14–17 — frame breadth and truth boundary

### Block 14 — same-origin frame repeats the mechanism

Fresh parent fixture contained a same-origin/srcdoc frame with:

- frame CSS hover content `FRAME_CSS_HOVER`;
- frame `pointerenter` mounting persistent `FRAME_JS_HOVER_MOUNTED`;
- independent top `TOP_OPEN_DIALOG`.

Before top review overlay:

- child target `:hover = true`;
- frame CSS hover visible;
- frame JS hover node present.

After WebClip-shaped top backdrop:

- child `:hover = false`;
- child event log `enter, leave`;
- frame CSS hover hidden;
- persistent frame JS hover node still present.

### Block 15 — parent physical PDF retains sticky child hover-opened DOM

Physical parent PDF contained:

- `FRAME_TARGET`;
- `FRAME_JS_HOVER_MOUNTED`;
- `TOP_OPEN_DIALOG`.

It did not contain `FRAME_CSS_HOVER`.

PDF SHA-256: `91ede3b7a19a75cf8871cb7838b663eb80cfb11dee8db6c85bf89dc46b28a5f6`.

This confirms the root mechanism is not top-document-only. Same-origin frame capture needs the same non-hover representation contract.

### Block 16 — cross-origin parity remains adjacent, not silently PASS

Fresh source inspection shows the cross-origin frame agent has no hover provenance/normalization state. However this tranche does not claim a real optional-permission/unpacked cross-origin extension L5 result. Cross-origin exact lifecycle/media/selection remains under existing frame owners and release boundaries.

C26's core current-PDF claim is already physically proven at L4 in top and same-origin-frame contexts. Cross-origin parity is a closure requirement for any future repair, not a reason to downgrade the confirmed top/frame finding to UNKNOWN.

### Block 17 — inability to infer hover provenance is itself a truth problem

Once a page leaves a hover-opened node mounted, current DOM alone may not distinguish it from an ordinary non-hover node with identical markup/style. Blind deletion would risk removing admitted content; blind inclusion violates hover exclusion.

The contract already defines the correct fallback: if the capture architecture cannot prove a non-hover representation without losing other admitted state, result must be degraded/unknown. Current path has no such hover-specific receipt/degradation state.

## Blocks 18–22 — duplicate/root-cause reconciliation

### Block 18 — P0-075 remains primary

**P0-075 ACTIVE** already states that the host page is not a trusted UI/control plane and the print representation should be isolated. The root of this C26 finding is exactly that current live shared-DOM/control-plane path lacks an inert admitted non-hover representation. Hover-opened page state can survive the WebClip UI transition and is then consumed by print as ordinary DOM.

No new owner is needed merely because the product contract now names hover exclusion explicitly.

### Block 19 — P0-070 remains exact-generation/admission authority

**P0-070 ACTIVE** owns one exact save generation from command admission through physical result. Hover normalization requires a deterministic admission boundary: user/page state caused only by hover must not accidentally become authoritative because WebClip moved the pointer or because page cleanup happened/failed after review UI appeared.

This supports C26 but does not independently describe the isolation root.

### Block 20 — P0-004 remains physical selected-copy authority

**P0-004 ACTIVE** owns selected PDF fidelity/selection-bounded physical representation. Historical PR #48 already classified hover-dependent pixels/mounted selected content under P0-004 as a physical manifestation. Current contract changes the expected representation to non-hover, not the physical-fidelity owner structure.

### Block 21 — P1-003 and P2-007 are not primary

The confirmed sticky JS node is already mounted and needs no deferred resource. Therefore this is not P1-003 resource readiness.

P2-007 remains broader future multi-mode architecture, but mandatory hover exclusion in the current primary PDF is no longer a product-mode ambiguity.

### Block 22 — no P1-231 allocation

A new owner would duplicate the existing live-page isolation/admission/physical representation decomposition already proven by PR #48 and owned by P0-075/P0-070/P0-004. This tranche therefore **does not allocate P1-231**.

If future source introduces a separate hover-normalization subsystem with an independent defect after shared-live-page isolation is solved, that future mechanism may justify its own owner after ordinary duplicate reconciliation.

## 23. C26 achieved coverage / remaining acceptance

C26 is now audit-complete at the required current engineering evidence level as:

**`ARTIFACT-COVERED / FINDING`**.

This does not mean implementation is fixed.

Future closure/re-audit for the relevant existing owners must prove:

1. current primary PDF derives from a trusted non-hover admitted representation rather than accidental pointer placement/page cleanup;
2. CSS hover/pseudo and JS hover-opened menus/tooltips/flyouts do not enter the physical artifact;
3. WebClip does not synthetic-click/dispatch arbitrary page controls/events merely to close hover UI;
4. allowed non-hover focus/top-layer/control state is not blanket-deleted;
5. same-origin and cross-origin frame parity is explicit;
6. inability to distinguish hover provenance from legitimate admitted content becomes truthful degraded/unknown;
7. positive/negative controls are re-run at L3+L4 after implementation.

## 24. Rejected/negative controls retained

Do not reopen these broad claims without new evidence:

- **“All current CSS hover survives the review modal.” — rejected.** Pointer-active backdrop cleared tested CSS hover.
- **“Beforeprint host hiding reactivates tested CSS hover.” — rejected in fresh Chromium control.** Pre/post-hide snapshots stayed non-hover.
- **“Any JS hover-created UI necessarily survives.” — rejected.** Page-owned pointerleave cleanup removed it in the positive control.
- **“Fix hover by removing every dialog/overlay/transient state.” — rejected by contract and physical positive control.** Non-hover open dialog is allowed and remained present.
- **“This requires a new hover P-code.” — rejected after root-cause reconciliation.** Existing P0-075/P0-070/P0-004 already own the independent mechanism.

## 25. Next campaign gap

After C26, the highest explicit new-contract revalidation gap remains **C24 — inert spoiler/disclosure expansion**: safe closed content must be represented expanded for later reading without synthetic page-owned activation, Exclude reintroduction, or silent network/stateful expansion. Required evidence remains L3+L4.