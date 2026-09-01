# P0-064 closure evidence — flattened iframe preflight materialization budget — 2026-09-01

Date: 2026-09-01

Primary owner: `P0-064`.

Baseline canonical `main`: `242cdcd67bc52094737af9d72c2621f8ccc0187c`.

Accepted current-Chrome evidence head: `1f327b46f63f83c52a432938488cb443262cd541`.

Accepted GitHub Actions run: `33466984058`, job `99728777166`, conclusion **SUCCESS**.

Browser: Google Chrome for Testing `152.0.7977.64`.

## 1. Acceptance contract

A selected same-origin iframe BODY that will be flattened for pagination must be admitted against explicit **node / text / estimated-byte** bounds before WebClip:

1. materializes the BODY's complete top-level `childNodes` collection;
2. performs the first deep clone;
3. materializes complete source/target descendant arrays;
4. connects a flattened proxy to the live top document.

The budget is an allocation/work admission boundary. It does not claim to close the separate operation-wide preparation budget, renderer-resource readiness or rendered-state fidelity owners.

## 2. Baseline defect

At the baseline, `content.js::createFlattenedBodyFramePrintProxy()` executed:

```js
for (const node of [...sourceBody.childNodes]) {
  try { proxy.appendChild(node.cloneNode(true)); } catch (_) {}
}

const sourceElements = [sourceBody, ...sourceBody.querySelectorAll('*')];
const targetElements = [proxy, ...proxy.querySelectorAll('*')];
```

Only after the complete clone and complete descendant arrays existed did the 2500-element computed-style limit apply. The style limit therefore did not bound clone allocation or source/target materialization.

## 3. Implementation

`frame-proxy-budget-guard.js` is loaded in WebClip's isolated world before the already-existing inert frame-proxy guard and before `content.js`.

The guard intercepts the `Node.prototype.childNodes` getter only for the exact current flattened-source admission shape:

- node is a BODY;
- BODY has the WebClip Include marker;
- BODY belongs to an accessible same-origin iframe;
- that iframe already has the WebClip selected-frame print marker.

Ordinary top-document `childNodes` access and an unmarked same-origin frame BODY are not intercepted.

The preflight uses pointer-based DFS (`firstChild`, `nextSibling`, `parentNode`) rather than `querySelectorAll()`, array spread or a full NodeList copy. It therefore decides admission without first materializing the subtree it is supposed to bound.

Current explicit envelope:

- maximum nodes: **5,000**;
- maximum text/comment UTF-16 units: **2,000,000**;
- maximum conservative estimated bytes: **8,388,608**;
- per-node structural estimate: **128 bytes**;
- string estimate: conservative **3 bytes per UTF-16 unit** for text/comments and attribute names/values.

Over-budget admission throws `WEBCLIP_FLATTENED_FRAME_BUDGET_EXCEEDED`. The existing caller catches failed proxy creation, so the rejected flattened clone is not connected and the original iframe is not hidden. This is fail-closed with respect to **flattened-copy allocation**; fallback physical fidelity of a non-flattened frame remains governed by its separate owners.

Worker injection rewriting and popup injection both use exact order:

`frame-proxy-budget-guard.js` → `frame-proxy-inert-guard.js` → `content.js`.

## 4. Deterministic regression

`project_tools/test_p0_064_frame_proxy_budget.js` proves:

- exact node/text/byte limits are exposed and stable;
- a small ordinary tree passes with a bounded receipt;
- node-count overflow fails at 5,001;
- text overflow fails at 2,000,001 units;
- estimated-byte overflow fails above 8,388,608;
- the error carries the P0-064 code/receipt;
- an unmarked frame BODY does not trigger the guard;
- worker and popup injection order is budget → inert → content;
- current source ordering keeps the guarded `sourceBody.childNodes` access before the one deep-clone call and before complete source descendant materialization.

Accepted deterministic output:

`P0-064 flattened-frame preflight budget: PASS`

The existing inert-proxy deterministic regression also passed on the same exact evidence head.

## 5. Chrome 152 physical / allocation evidence

### 5.1 Negative controls

Top-document BODY:

- `childNodes` count observed: **14**;
- P0-064 preflight delta: **0**.

Unmarked same-origin child BODY:

- `childNodes` count observed: **0**;
- P0-064 preflight delta: **0**.

Thus the interception is bounded to the print-flattening source boundary rather than all page DOM reads.

### 5.2 Under-budget positive control

The accepted ordinary case contained 80 paragraph elements.

Receipt:

- nodes: **161 / 5,000**;
- text chars: **881 / 2,000,000**;
- estimated bytes: **23,326 / 8,388,608**;
- preflight delta: **1**;
- guarded deep-clone delta: **80**;
- complete source elements after admission: **81**;
- complete target elements after admission: **81**.

The printable proxy contained `P0_064_UNDER_SENTINEL`.

Physical PDF:

- pages: **3**;
- SHA-256: `90035c60d251be5ef7c10c2fa3d2efb10f2fc2a7db98f87240b24a7f6fb30107`;
- extracted-text SHA-256: `ed177cae28e69239a4bc307a8db3f316510e4465976ba7069661a0b761f8b851`;
- under-budget sentinel present: **true**.

This is the required positive discriminator: the budget does not simply disable all flattened-frame output.

### 5.3 Node-count overflow

Observed receipt:

- reason: `nodes`;
- nodes: **5,001**;
- text chars: **0**;
- estimated bytes at rejection: **640,203**;
- preflight delta: **1**;
- deep-clone delta: **0**;
- proxy connected: **false**;
- original iframe display remained `inline`.

### 5.4 Text overflow

Observed receipt:

- reason: `text-chars`;
- nodes visited: **3**;
- text chars: **2,000,001**;
- estimated bytes at rejection: **6,000,462**;
- preflight delta: **1**;
- deep-clone delta: **0**;
- proxy connected: **false**;
- original iframe display remained `inline`.

### 5.5 Estimated-byte overflow

Observed receipt:

- reason: `estimated-bytes`;
- nodes visited: **2**;
- text chars: **0**;
- estimated bytes: **8,388,609**;
- preflight delta: **1**;
- deep-clone delta: **0**;
- proxy connected: **false**;
- original iframe display remained `inline`.

Across all three rejection controls, the first deep clone never occurred. This directly satisfies the owner requirement that budget admission precede complete subtree allocation.

## 6. Revalidation of the preceding inertness closure

Because P0-064 changes the helper injection order immediately before the inert-proxy layer, the already-closed inertness behavior was rerun physically on the same Chrome 152 job.

Results remained discriminating:

- native deep clone: active tags **4**, inline handlers **3**, duplicate ids **2/2/2**, custom construct/connect **+1/+1**, image-error side effect **+1**, nested iframe **+1**, object request **+1**, custom disconnect **+1**;
- guarded path: active tags **0**, inline handlers **0**, duplicate identity attrs **0**, action attrs **0**, duplicate top ids **1/1/1**;
- guarded host effect deltas all **0**;
- guarded nested iframe/object request deltas **0/0**;
- main-world `Node.prototype.cloneNode` remained native before and after injection;
- physical guarded PDF pages: **1**;
- physical guarded PDF SHA-256: `42bf195138273f760632858df7e75de5f0b40b9484c9afff09c63d6f48ffd86e`.

Therefore adding budget-first admission does not reopen the preceding inertness closure.

## 7. Source hashes at accepted evidence head

- budget guard: `7c787f08b3942ecfb50246c45169bf52af7491920edeb2ce8abee9e754da8356`;
- inert guard: `dc4fd3204e52d5c50b57a78ea3f682c64564e49063d2b4a8c7ada8bd01b5ab08`;
- worker injection guard: `2e0d648a27b59962ca3f99920e685d83762779d30b53ecfc316b9b523f67ed94`;
- popup: `07b71219073271b2824cd420c01bb80b8eb8786ddbbe7ce9ade8bd46ebaac6df`;
- content.js: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`.

## 8. Change Impact after accepted evidence head

After evidence head `1f327b46f63f83c52a432938488cb443262cd541`, only the temporary evidence workflow is removed and durable documentation/status/index records may change before delivery. Runtime guards, popup/worker wiring, deterministic regressions and both Chrome harnesses must remain byte-equivalent for this evidence to stay applicable.

## 9. Owner conclusion

`P0-064` satisfies its narrow implementation + direct browser verification contract and can transition to **DONE**.

This does **not** close the separate owner for a single operation-wide preparation/diagnostic node/time/mutation/string budget. It also does not close renderer-resource task lifetime/readiness, aggregate selection admission, or rendered-state fidelity. Those broader boundaries remain independently active in the canonical Registry.

`RELEASE_READINESS.md` remains **NOT READY**. This closure does not create a build, tag or GitHub Release.
