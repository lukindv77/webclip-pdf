# CSS visual dependency graph audit — Stage 3 — Blocks 33–48

Interruption-safe continuation of the CSS visual dependency graph tranche.

Exact tranche base remains `cd342ac548606ab93eba3d1f2ebc9a68f2f51c08`.

Current status/owner authority remains `project_docs/AUDIT_REGISTRY.md`.

## Blocks 33–48

### Block 33 — exact production flatten ordering

Fresh `content.js` constructs a top-document-owned proxy, then for every child body node runs `proxy.appendChild(node.cloneNode(true))`. Only **after all nodes are cloned/adopted into that owner document** does it construct `sourceElements`/`targetElements` and call `copyComputedFrameCloneStyle(source, target)`.

Thus source computed-style acquisition does not occur against the untouched pre-adoption source graph.

### Block 34 — clone without adoption positive control

Isolated Chromium control:

- child document base: `https://frame.test/frame/`;
- source inline `background-image:url(bg.png)`;
- top document base: `https://top.test/top/`.

Before cloning, source computed background was `https://frame.test/frame/bg.png`.

`cloneNode(true)` alone left both source ownership and source computed URL unchanged. This excludes clone allocation itself as the cause.

### Block 35 — adoption into a detached top-owned container mutates source URL resolution state

The clone was appended to a `div` created by the top document, while that container itself remained disconnected.

After this adoption:

- source element still reported `ownerDocument.baseURI = https://frame.test/frame/`;
- clone owner became top document;
- source `getComputedStyle(...).backgroundImage` changed to `url("https://top.test/top/bg.png")`;
- the original source style attribute remained the same relative `url(bg.png)`.

No new top resource request was required merely by the detached adoption, and the already-rendered source remained green in the screenshot (~26,400 frame-green pixels, 0 top-magenta). This is a renderer/CSS URL-resolution state effect, not ordinary DOM ownership replacement of the source node.

### Block 36 — current production order observes the mutated source value

A full production-shaped body-proxy model cloned/adopted all body child nodes first and only then read source computed styles with the exact current style-property whitelist.

At that copy point the source `#box` computed `background-image`, originally frame-relative, was already `url("https://top.test/top/bg.png")`.

The copied target inline style therefore received the **wrong absolute top-document URL with `!important`**.

### Block 37 — covered `background-image` is not protected by the computed-style whitelist under current order

The whitelist contains `background-image`, which superficially appears to protect frame URL provenance by copying the computed absolute value.

The physical/source probe shows that under current ordering the value being copied is already post-adoption/top-based. Therefore “background-image is whitelisted” is not sufficient acceptance evidence for frame provenance.

### Block 38 — completed prefetch can become stale during flatten

Production-shaped schedule:

1. child source computed background = `https://frame.test/frame/bg.png`;
2. a current-shaped prefetch explicitly loaded/confirmed that frame resource;
3. flatten adopted clones;
4. source computed background changed to top URL;
5. copy wrote the top URL to the proxy;
6. connection of proxy initiated a new request to `https://top.test/top/bg.png`.

The new resource was not part of the already-completed prefetch graph.

### Block 39 — physical post-prefetch resource loss

Top `bg.png` was delayed 1.5 seconds.

After the earlier frame resource was confirmed ready, production-shaped flatten created the delayed top request. Immediate `Page.printToPDF` completed in about **8.4 ms** and contained **0 frame-green and 0 top-magenta pixels** in the proxy resource region. After top-resource settlement, the same proxy PDF contained about **108,691 top-magenta pixels** and 0 frame-green.

This is direct `P1-003` graph-generation drift plus `P1-187` secondary-representation provenance loss.

### Block 40 — copy-before-adoption precision control

A control first captured all source computed whitelist values while source nodes were still untouched in the frame document, then cloned/adopted the node and applied the captured values.

Result:

- captured background remained `https://frame.test/frame/bg.png`;
- clone computed background remained the same frame URL after top adoption;
- physical screenshot contained about **20,000 frame-green pixels** and 0 top-magenta;
- source computed background also remained frame-based in this schedule.

Therefore preservation is possible without raising budgets; the causal boundary is the ordering/representation transition.

### Block 41 — non-whitelisted inline `border-image-source` rebases through top document

In the full proxy fixture the source inline relative border image computed as `https://frame.test/frame/border.png`.

Because `border-image-source` is absent from the current computed-style whitelist, the clone retained the raw relative inline declaration. Once adopted into the top document it computed as `https://top.test/top/border.png` and requested that top resource.

With the top border delayed, the immediate PDF had no top-border pixels; after settlement the border/fill produced about **100,880 top-blue pixels** in the first PDF page raster.

### Block 42 — non-whitelisted inline `list-style-image` rebases through top document

The source list marker resolved to `https://frame.test/frame/list.png`; the adopted proxy marker resolved to `https://top.test/top/list.png` and requested the top resource.

After settlement the proxy PDF contained about **9,559 top-red list-image pixels**, with 0 frame-green marker pixels.

This combines an already-known P1-003 unscanned CSS image class with P1-187 frame-base provenance loss.

### Block 43 — custom-property URL base is a useful positive/precision control

The same fixture used inline:

`--b:url(var.png); border-image-source:var(--b)`.

Unlike the ordinary raw relative border declaration, the cloned/adopted computed border URL remained `https://frame.test/frame/var.png`; the proxy issued another request to the frame URL and settled PDF retained about **66,852 frame-orange pixels**, with 0 top-cyan.

Therefore URL rebasing is not safely generalized to every syntactic path. Acceptance must be based on the actual rendered/property representation, not text replacement assumptions.

### Block 44 — child-head `border-image` rule disappears independently

A child element whose border image existed only through the child document `<head><style>` had source computed `url("https://frame.test/frame/headborder.png")`.

The body proxy clones body nodes, not the child head stylesheet, and `border-image-source` is not in the computed whitelist. The proxy computed value became `none`.

This is representation loss even with a fully settled source resource.

### Block 45 — child-head pseudo image rule disappears independently

A child `#headpseudo::before { content:url(pseudo.png) }` rule produced a source computed pseudo URL. The proxy had no child head rule and no pseudo computed-state reconstruction, so its pseudo computed content became `none`.

This is the same P1-187 secondary representation boundary and supports P1-003 if the resource-readiness/reporting layer claims completeness.

### Block 46 — flattened-proxy marker can itself create a new host CSS dependency graph

Current proxy nodes are inserted with `data-webclip-pdf-flattened-frame` after resource prefetch.

Physical top-page control:

`body:has([data-webclip-pdf-flattened-frame]) #selected { background-image:url(delayed-red) }`.

Before marker insertion selected background was `none`; immediately after insertion it was the delayed resource URL. Immediate PDF completed in about **11.9 ms** with **0 red pixels**; after settlement the PDF contained about **88,831 red pixels**.

So proxy insertion itself is another page-observable post-scan graph mutation, alongside the header/style/image-wrapper controls from Stage 2.

### Block 47 — no final resource revalidation after flatten

Fresh source order ends local representation preparation with frame flattening and then captures diagnostics. There is no second `prefetchIncludedResources()` or equivalent dependency-graph convergence pass after header/style/wrapper/proxy insertion and after flattened target properties are established.

Thus both newly page-induced resources and newly proxy-rebased resources can reach the physical cut without a readiness task or truthful omission receipt.

### Block 48 — Stage 3 classification

No new P-code or canonical status transition.

Primary owners:

- `P1-003 ACTIVE` — the actual final selected rendered visual dependency graph must be acquired under bounded semantics, not a pre-mutation approximation;
- `P1-187 ACTIVE` — same-origin flattened representation must preserve renderer state and frame-local resource provenance.

Strong supporting boundaries:

- `P0-070 ACTIVE` — exact physical save generation;
- `P0-075 ACTIVE` — page-observable helper/proxy mutations must not make host CSS authoritative over the final capture graph;
- `P1-167 ACTIVE` — any convergence/revalidation must stay under one bounded preparation budget;
- `P0-004 ACTIVE` — selected physical fidelity;
- `P1-229` / `P1-004` — cross-origin parity remains separate from same-origin proxy mechanics.

## Final-stage questions

Blocks 49–56 should now be used for final duplicate/history reconciliation and acceptance formulation rather than proliferating similar fixtures:

1. define what graph receipt is actually truthful (`ready`, `partial-known`, `graph-unknown/non-converged`);
2. distinguish renderer-selected alternatives from parser-discovered candidate alternatives;
3. preserve source/proxy base provenance without mutating/depending on live source computed state after adoption;
4. ensure top/same-origin/cross-origin resource graph parity under one bounded contract;
5. state exact positive controls and rejected hypotheses;
6. final registry/history/Git duplicate check before delivery.
