# Durable audit evidence — flattened-frame CSS environment — Final Blocks 49–56 — 2026-08-30

This file completes the **56-block** fresh-source tranche begun in:

- `AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT_2026-08-30_EVIDENCE.md` — Blocks 1–16;
- `AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE2_2026-08-30_EVIDENCE.md` — Blocks 17–32;
- `AUDIT_FLATTENED_CSS_NAMED_ENVIRONMENT_STAGE3_2026-08-30_EVIDENCE.md` — Blocks 33–48.

Exact runtime baseline: `4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab`.
Managed Chromium: `144.0.7559.96`.
No runtime source, canonical registry status, manifest/version, build, tag or Release change is made by this audit tranche.

## Block 49 — duplicate/root-cause reconciliation

Fresh results are materially new physical regression cases, but they do **not** justify a new permanent P-code.

They refine existing owners:

- **P1-213 ACTIVE** already owns the requirement that a same-origin flattened print proxy be inert before live insertion. A stylesheet becoming active, registering names or affecting paged media merely because its cloned node is connected is exactly this root-cause family.
- **P0-068 ACTIVE** already owns flattened-document global/identity side effects. CSS named environments (`@counter-style`, `@keyframes`, `@property`) and top-document stylesheet authority are additional document-global/tree-scoped namespaces under the same isolation requirement.
- **P1-187 ACTIVE** already owns the required rendered-state fidelity of the secondary frame representation. Structural selector context, CSSOM current state, viewport/media environment and named-rule provenance are renderer state needed for faithful later reading.
- **P0-075 ACTIVE** already requires capture isolation from hostile/shared host DOM. Child stylesheet rules that can restyle top content or override global `@page` are direct supporting evidence.
- **P1-003 ACTIVE** already owns the actual final visual-resource graph and truthful bounded convergence. Rebased/new stylesheet requests after proxy connection are another concrete graph transition.
- **P0-070 ACTIVE** owns exact physical generation; a first proxy whose meaning can change when a later proxy connects is not a frozen generation receipt.
- **P0-004 ACTIVE** owns selected visual completeness/presentation.
- **P1-167 / P0-064 ACTIVE** own bounded preparation/materialization work.

PR #41 already preserved HTML/SVG/document-local id/name/group collisions. PR #42 already preserved document-local `@font-face`, typography, SVG paint and other full-style losses. The current tranche intentionally does not reallocate those findings.

`P1-230` remains deliberately unallocated.

## Block 50 — the CSS fidelity object is an owning environment, not stylesheet text

The user-visible CSS result at capture time is a function of more than DOM `<style>` / `<link>` nodes.

Fresh evidence requires the model to include at least:

1. exact live DOM/tree scope and structural selector context;
2. exact live CSSOM rule set, including `insertRule/deleteRule` mutations;
3. stylesheet enabled/disabled runtime state;
4. constructed/adopted stylesheets with no DOM clone node;
5. named-rule environments and their scope/order (`@counter-style`, `@keyframes`, `@property`, already-known `@font-face`);
6. conditional environment such as the iframe viewport used by media queries;
7. resource/base provenance of external stylesheets and imports;
8. global/paged-media rules such as `@page`;
9. stylesheet accessibility/opacity (cross-origin CSSOM can be renderer-usable but script-unreadable);
10. exact connection/order generation because later stylesheet insertion can retroactively alter earlier representation.

Therefore the correct abstraction is a **CSS/render environment receipt**, not a copy of source CSS text.

## Block 51 — pre-connection isolation is mandatory

The strongest causal controls all point to one ordering requirement:

> Page-owned stylesheet material must not become live top-document author CSS before the representation is isolated/sanitized/materialized.

Current order creates the opposite property: body stylesheet nodes become top-author styles at proxy connection.

By the time a later cleanup/rewrite notices a collision, observable state may already have changed:

- unrelated top pixels can be restyled;
- global page size can change;
- earlier proxies can be rebound to later named definitions;
- network requests can have begun.

This aligns with P1-213's existing pre-live-insertion requirement.

## Block 52 — rule-class matrix: no single transfer primitive is sufficient

The completed controls show different behavior by rule class:

| CSS state class | Live top clone | Shadow isolation control | Required interpretation |
|---|---|---|---|
| ordinary `.class` rule | works but can leak globally | local rule works without top leak | useful only with isolation |
| `body/html/:root` structural context | can change/loss | does not magically recreate source BODY/HTML | materialize source context or computed result |
| `@page` | can override whole PDF | tested shadow rule did not override global page | must remain globally extension-owned |
| `@counter-style` | independent frames collapse/rebind | separate shadow roots preserved names | tree-scoped isolation is promising |
| `@keyframes` | later same name wins across proxies | separate shadow roots preserved values | tree-scoped isolation is promising |
| `@property` | duplicate registration collapsed red+blue to blue+blue | shadow rule did not reproduce registration semantics | requires separate handling / cannot rely on shadow copy |
| `@font-face` | prior PR #42 proves document-scoped provenance | not reopened here | preserve exact font identity/resource under P1-003/P1-187 |
| adopted/constructed sheet | no DOM clone representation | must be explicitly acquired/materialized if required | bounded CSSOM state |
| cross-origin external CSS | renderer uses it; CSSOM may be `SecurityError` | absolute isolated link may still render | opaque/degraded boundary if semantic rewrite is required |
| media query | re-evaluates against top environment | still needs source viewport semantics | environment capture/materialization |
| relative stylesheet URL | rebases to top on adoption | still rebases if left raw | pre-absolutize exact source provenance |

A correct implementation must therefore be **rule-class aware**.

## Block 53 — strong repair controls and their limits

The best positive engineering controls from this tranche are:

- extension-owned shadow tree prevented child global selector leakage into top content;
- shadow-local child `@page` did not replace top PDF MediaBox;
- same `@counter-style` and `@keyframes` names remained independent in separate shadow roots;
- long shadow flow preserved 180/180 markers across 10 PDF pages;
- pre-absolutizing stylesheet URL preserved frame resource provenance.

But these controls have explicit limits:

- raw body/html selector semantics are still different;
- `@property` registration was not reproduced by simple shadow stylesheet copy;
- raw relative URLs still rebase;
- arbitrary source `:host` text gains new meaning inside a shadow tree and can hide the extension host;
- CSSOM-only and opaque stylesheet state need additional paths.

Thus ShadowRoot is evidence for an isolation primitive, not a complete fix by itself.

## Block 54 — boundedness is part of fidelity acceptance

This audit does **not** recommend cloning/serializing every stylesheet or recursively parsing unlimited CSS.

A safe implementation needs explicit shared limits consistent with P1-167/P0-064, e.g. bounded:

- stylesheet count;
- CSS rule count / nesting depth;
- total accessible CSS text bytes;
- selector/reference rewrite bytes;
- named-rule dependency count;
- external stylesheet/resource count and URL length;
- CSSOM enumeration time;
- per-frame and aggregate representation bytes/nodes;
- retries/waits for newly materialized stylesheet resources.

If required CSS state exceeds the admitted envelope, the saved result must be explicitly partial/unknown rather than silently falling back to a plausible but different style environment.

## Block 55 — truthful final representation states

For CSS/frame fidelity, current binary notions such as "proxy created" or "resource task list finished" are insufficient.

Acceptance needs at least the conceptual distinction:

- **CSS environment confirmed** — the final printed representation's admitted visual CSS dependencies/environment are proven stable and isolated;
- **partial-known** — known required CSS state/resource/rule was omitted, failed or exceeded a declared bound;
- **CSS environment unknown/non-converged** — exact equality cannot be proven, e.g. opaque stylesheet requires semantic rewrite, live CSSOM state cannot be represented, or later connection can still change earlier regions.

These are acceptance semantics, not current runtime labels.

Useful diagnostics/receipts should be generation-bound and may include bounded counts/flags such as:

- active DOM stylesheet nodes retained/neutralized;
- CSSOM-only/adopted sheet count;
- opaque stylesheet count;
- live disabled-state mismatches;
- named-rule mappings/collisions;
- source viewport/media-environment mismatch;
- suppressed global/paged-media rules;
- rebased/rewritten stylesheet URLs;
- post-materialization resource convergence status;
- style/rule/byte/time truncation.

Telemetry alone is not proof; the receipt must gate any "faithful/complete" success claim.

## Block 56 — final architecture statement / owner result

Completed 56-block conclusion:

> A same-origin iframe's visible CSS is an owning-document renderer environment. Faithful later-reading capture cannot be obtained by deep-cloning body nodes into the live top document and copying a fixed set of computed declarations. The final representation must preserve or deliberately materialize the exact required CSS semantics **before connection**, isolate frame-local stylesheet authority from the top/other frames, preserve source resource/viewport provenance, and remain generation-bound until all admitted style resources settle. Where the platform or bounded implementation cannot prove equivalence, the result must be truthfully partial/unknown.

No new P-code and no status transition.

Final existing-owner set for this tranche:

`P1-213, P1-187, P0-068, P0-075, P1-003, P0-070, P0-004, P1-167, P0-064`.

`P1-230` remains unallocated.

Managed Chromium evidence remains engineering proof only; real unpacked Chrome remains release QA.