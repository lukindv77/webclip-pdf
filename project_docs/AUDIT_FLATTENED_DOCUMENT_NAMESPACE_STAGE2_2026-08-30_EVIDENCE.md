# Durable audit evidence — flattened document namespace fidelity — Blocks 17–32 — 2026-08-30

This is the second interruption-safe stage of the fresh audit begun in `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md`.

Exact fresh baseline remains `main = 013bea563f504a325f501ecc4521b1e41cdd11ef`. Runtime, registry/status, manifest/version/build/tag/release state remain unchanged.

Canonical owner authority remains `AUDIT_REGISTRY.md`.

## Block 17 — duplicate check against complex-layout evidence

`AUDIT_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md` already proves several flattened-frame context losses:

- writing-mode/direction;
- frame-local generated styles;
- layout gaps/tracks;
- visual effects;
- current select choice;
- relative SVG external-use/resource provenance;
- 2500-element style-budget degradation.

This tranche does **not** reopen those as new findings. Its fresh scope is the interaction created when multiple otherwise-correct source `Document` namespaces are collapsed into one top document, plus source-document state that cannot exist in the proxy merely by copying nodes.

## Block 18 — image-map `name/usemap` association collapses in DOM

Two iframe documents independently used:

- `<img usemap="#shared">`;
- `<map name="shared">`;
- different `<area href>` destinations.

Inside each source document the image was associated with its own map.

After production-shaped body cloning into one top document, both `usemap="#shared"` references resolved to the first top-document map. The second image's effective area destination therefore changed from the second source URL to the first source URL at the DOM association level.

This is structurally the same namespace-collapse family as radio/form/SVG IDs.

## Block 19 — image-map PDF consequence is not proven

Exact worker-equivalent Chromium 144 PDF produced no URI annotations from the image-map `<area>` elements in either direct source or flattened output.

Therefore this audit does **not** promote the image-map association collision as a current saved-PDF navigation finding. It remains a document-semantics observation only and a future regression control if output mode or Chromium behavior changes.

Do not claim that current WebClip PDF image-map links are wrong from this evidence; current tested Chromium did not preserve them at all.

## Block 20 — SVG local `<use>` source control

Two iframe documents each contained their own:

`<g id="s">...different colored shape...</g>`

and `<use href="#s">`.

Frame 1's local symbol rendered red; frame 2's local symbol rendered blue.

Direct PDF raster preserved both independent references:

- red: ~37.7k classified pixels;
- blue: ~37.7k classified pixels.

## Block 21 — SVG `<use>` ID collision changes the saved pixels

After both child bodies were cloned into the top document, the representation contained two `id="s"` elements and two raw `href="#s"` references in one document namespace.

The second `<use>` resolved to the first symbol.

Flattened PDF raster:

- red: ~75.5k classified pixels;
- blue: 0 classified pixels.

This independently confirms that the Stage-1 gradient result was not peculiar to paint-server gradients. Local SVG fragment references across flattened frame documents can rebind to an earlier frame's definition and physically replace selected content.

Owners: P0-068/P1-213 namespace/connection semantics; P1-187 physical secondary-representation fidelity.

## Block 22 — clipPath exploratory fixture rejected

An exploratory duplicate-`clipPath id` fixture did not produce a valid colored positive control in the tested PDF path: both direct and flattened rasters lacked the expected clipped colored shapes.

Because the direct source control failed, this probe is explicitly rejected and is not used as evidence of a WebClip defect.

Gradient and `<use>` probes provide the valid SVG fragment-reference evidence.

## Block 23 — named `<details>` groups are document-scoped state

Chromium 144 supports the HTML `<details name="...">` exclusive disclosure grouping behavior.

Two independent iframe documents each contained:

`<details name="shared" open>`

with distinct body text.

Both source frames reported `open=true` because they were different document groups.

Direct PDF contained both disclosure bodies:

- `D1_BODY`;
- `D2_BODY`.

## Block 24 — connecting the second named details closes it

Each child body was cloned into a separate top-document proxy.

After the first proxy connected, its named details stayed open.
After the second proxy connected, final top-document state was:

- first details: open;
- second details: closed.

The formerly independent `name="shared"` disclosure groups had become one document group. No synthetic click or page script was needed.

## Block 25 — named-details collision physically removes selected content

Direct PDF text:

`D1_SUMMARY / D1_BODY / D2_SUMMARY / D2_BODY`

Flattened PDF text:

`D1_SUMMARY / D1_BODY / D2_SUMMARY`

The second selected disclosure body disappeared from the artifact solely because WebClip combined two document-local groups.

This is especially material to the project's later-reading goal: content the user could see in the source frame is absent after save.

Primary owner remains P0-068/P1-213; P1-187/P0-004 cover resulting saved-copy fidelity.

## Block 26 — source `:target` is a document-state positive control

A child iframe document contained `#target` and had its own location fragment set to `#target`.

The source element matched `:target=true`. Frame CSS exposed that state as visible generated text `TARGET_ACTIVE`.

Direct PDF contained:

`ANCHOR TARGET_ACTIVE`.

Thus direct Chromium printing preserves this source-document presentation state in the tested path.

## Block 27 — node cloning cannot preserve child document URL target state

The same `#target` element was cloned into a top-owned proxy while the top document had no matching location fragment.

The clone retained `id="target"`, but it matched `:target=false` because `:target` is derived from the owning document's URL state, not an element attribute/property that `cloneNode` can carry.

## Block 28 — `:target` loss reaches physical PDF

Flattened PDF contained only:

`ANCHOR`

and lost the source `TARGET_ACTIVE` presentation.

This is a P1-187 representation-state refinement with P0-068/P1-213 architectural relevance: preserving nodes/IDs is insufficient when visual state depends on the source document object/state.

## Block 29 — document-context versus style-whitelist distinction

Older complex-layout evidence already owns lost inherited writing-mode/direction and missing child styles. The `:target` case is different:

- even a complete copy of the relevant CSS rule and element attributes would not make the proxy match source `:target` unless source target state were explicitly materialized;
- therefore this is not solved merely by enlarging `FLATTENED_FRAME_STYLE_PROPERTIES`.

A faithful static representation needs either state materialization or an isolated document-preserving representation.

## Block 30 — grouping/state namespace taxonomy now physically proven

Across Blocks 1–28, valid direct controls prove three distinct collapse mechanisms:

1. **group names** — radio `name`, details `name`;
2. **ID/fragment reference namespaces** — `form=id`, SVG gradient/`use` fragments;
3. **owning-document state** — `:target` from child `location.hash`.

All can change selected presentation after otherwise ordinary deep cloning/adoption.

## Block 31 — owner decision remains deduplicated

No new P-code is justified.

- **P0-068 ACTIVE** explicitly names duplicate-identity side effects in flattened iframe representation and remains the architectural root for namespaces that should stay isolated;
- **P1-213 ACTIVE** requires the flattened proxy to be inert before live insertion and is refined by connection-triggered radio/details grouping changes;
- **P1-187 ACTIVE** remains the rendered-state owner for wrong gradient/symbol/form-validity/checked/open/target presentation in the secondary representation;
- **P0-004 ACTIVE** is supporting end-product fidelity where selected visible content is changed or omitted.

## Block 32 — second-stage acceptance boundary

A closure design for flattened-frame fidelity must treat each source frame as a namespace-bearing document, not merely a subtree.

At minimum it must preserve or safely materialize:

- group identity without cross-frame radio/details collisions;
- HTML IDREF ownership without rebinding to another frame;
- local SVG fragment-resource identity without first-match collisions;
- source-document-derived visual states such as `:target` when faithful-current-view semantics require them;
- source and final-proxy equivalence checks after connection/materialization;
- bounded rewrite/isolation receipts and truthful degradation when exact preservation is impossible.

The image-map and clipPath exploratory controls above remain explicitly non-promoted.

## Interruption-safe resume point

Blocks 1–32 are complete. Next stage should focus on whether namespace remapping alone is sufficient: test self-contained per-frame ID rewriting controls, radio/details name remapping controls, cross-reference completeness, and whether rewriting creates new collisions or breaks frame-local hyperlinks/SVG references. Also inspect current diagnostics for any ability to detect namespace collisions after flattening.