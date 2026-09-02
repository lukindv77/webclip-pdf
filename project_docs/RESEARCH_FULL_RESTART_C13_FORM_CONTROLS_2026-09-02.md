# WebClip — fresh full-project research restart — C13 form / renderer-owned controls — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start: `main = 77f6be5bbc67eb3193399ab182715e12369e7843`.

Fresh current source identities at tranche start:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-proxy-inert-guard.js` Git blob: `1197b4a5cf752c63ff3a3ecb3d1421aa51e59daa`;
- `RESEARCH_REGISTRY.md` Git blob: `e8384d31758e55540b23618d9d44bebbf69bf48e`.

Fresh restart coordinate:

**C13 — Form / renderer-owned controls**

Classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`**

No new P-code is allocated. No Registry owner/status transition is made. No runtime, manifest/version, build, tag or GitHub Release is changed by this tranche.

## 1. Question and bounded scope

C13 asks whether form controls that the user currently sees inside admitted content are represented faithfully in the static PDF, especially when a same-origin selected iframe BODY is replaced by WebClip's flattened top-document proxy.

The bounded control set is:

- runtime-mutated text `<input>` value;
- runtime-mutated `<textarea>` value;
- runtime single `<select>` selection;
- runtime multiple `<select>` selectedness;
- checkbox `checked` + `indeterminate`;
- radio-group runtime checkedness;
- range runtime value.

This tranche deliberately does **not** claim coverage of:

- file-picker path/content preservation;
- autofill/password-manager state;
- browser-native picker popovers;
- focus/caret/text-selection state (C27);
- top-layer popover/dialog state (C25);
- arbitrary page mutations during the render cut (C35);
- privacy policy for sensitive form contents (C39);
- real unpacked extension L5 behavior (C46).

## 2. Current source inspection

### 2.1 Current flattened-frame path still performs a deep clone call

Fresh `content.js` `createFlattenedBodyFramePrintProxy(frame, sourceBody)` creates the top-document proxy and, for every source BODY child, calls:

`node.cloneNode(true)`

It then pairs source/target element arrays and runs `copyComputedFrameCloneStyle(...)` under the existing style-element budget.

### 2.2 That `cloneNode(true)` is not native for this WebClip path

Fresh `frame-proxy-inert-guard.js` installs an isolated-world replacement for deep element `cloneNode(true)`.

For element nodes, `cloneNodeInert()`:

1. creates a **fresh element** with `ownerDoc.createElement(...)` / `createElementNS(...)`;
2. copies only admitted safe content attributes;
3. strips identity/relationship/action/event attributes according to the existing P0-068 inertness contract;
4. sets `inert` on HTML elements;
5. sets `disabled` on `button`, `input`, `select`, `textarea`, `fieldset`, `option`, and `optgroup`;
6. recursively mirrors child nodes.

This is intentionally safer than native cloning for active content, but it also bypasses browser element-specific cloning steps that normally propagate some runtime form-control state.

### 2.3 Current post-clone materialization has no form-state repair

Fresh `copyFrameCloneUrlState(source, target)` handles URL/media identity such as anchors, images, media `src` and video `poster`. In the inspected current segment it does not materialize:

- `.value`;
- `.checked`;
- `.indeterminate`;
- `selectedIndex` / option selectedness.

`copyComputedFrameCloneStyle()` copies a bounded CSS property allowlist, but a text input's current value, a select's current selected option, checkbox state and range value are not CSS properties.

Therefore the current source contains a direct representational gap: the inert mirror intentionally constructs safe static controls from content attributes, then never reapplies their admitted runtime rendered state.

## 3. Standards and external capture comparison

External sources are hypothesis/architecture input only; the C13 outcome is based on fresh WebClip source plus fresh physical Chromium evidence.

### 3.1 HTML Standard: several input/textarea states are cloning state, not only attributes

The current HTML Living Standard states that cloning steps for `input` propagate value, dirty value flag, checkedness, dirty checkedness and indeterminateness. It separately states that cloning steps for `textarea` propagate raw value and dirty value flag.

References:

- https://html.spec.whatwg.org/multipage/input.html
- https://html.spec.whatwg.org/multipage/form-elements.html

This matters because WebClip's inert guard does not call the native element-specific deep cloning path for its flattened BODY representation; it constructs fresh elements from attributes instead.

### 3.2 Select selectedness is separately stateful

The current HTML Standard defines option `selectedness` and `dirtiness` independently from the `selected` content attribute. Runtime selection can therefore differ from the static markup default.

Fresh Chromium below confirms exactly that distinction: a runtime-selected B option returned to markup-default A in a native deep clone, while other controls retained several runtime fields.

Reference:

- https://html.spec.whatwg.org/multipage/form-elements.html

### 3.3 snapDOM explicitly materializes form state

Current snapDOM feature documentation treats form-control state as a capture concern and explicitly preserves:

- input `value` / `checked` / `indeterminate`;
- textarea value;
- select selection;
- relevant state attributes used by rendered pseudo-class styling.

Reference:

- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md

Transferable lesson: a capture engine that creates a secondary representation must make form state an explicit representation field rather than assume attribute cloning is enough.

### 3.4 Static-archive systems distinguish representation from live execution

Freeze-dry describes its goal as capturing a page as currently shown into a static self-contained document, while broader archival systems such as Scoop/ArchiveBox use multiple complementary outputs when one representation cannot preserve every live browser property.

References:

- https://github.com/WebMemex/freeze-dry
- https://github.com/harvard-lil/scoop
- https://github.com/ArchiveBox/ArchiveBox

For WebClip, the relevant implication is not to preserve live interactive behavior. It is to materialize the admitted **visible static state** while retaining the already-proven P0-068 inertness boundary.

## 4. Fresh managed-Chromium evidence

Environment:

- Chromium `144.0.7559.96`;
- Playwright managed browser;
- physical `page.pdf(print_background=True)`;
- PyMuPDF text extraction from generated PDF bytes;
- self-contained fixture; no network resource dependency.

Durable reproduction harness:

`project_tools/research_c13_form_controls.py`

The local physical probe used the exact current relevant inert-mirror semantics (fresh elements + safe attributes + `inert`/`disabled`) and the current flattened computed-style property allowlist. It also included a native Chromium clone discriminator and a causal final-proxy state materialization control.

### 4.1 Runtime source state

The source form was created with markup defaults and then mutated to:

- text input: `RUNTIME_INPUT` (markup default `DEFAULT_INPUT`);
- textarea: `RUNTIME_TEXTAREA` (markup default `DEFAULT_TEXTAREA`);
- single select: B / `RUNTIME_B` selected (markup default A / `DEFAULT_A`);
- multiple select: `[false, true, true]` (markup default `[true, false, false]`);
- checkbox: `checked=true`, `indeterminate=true` (markup unchecked);
- radios: `[false, true]` (markup `[true, false]`);
- range: `80` (markup default `10`).

### 4.2 Top-document positive physical control

Top-document state remained exactly the runtime state above.

Physical PDF:

- bytes: `15,303`;
- SHA-256: `77e32466097bc912af4b06190570a02097ef6e79042050135ca9dcd958990730`;
- extracted text includes `RUNTIME_INPUT`, `RUNTIME_TEXTAREA`, and single-select `RUNTIME_B`.

This proves Chromium PDF itself can serialize the current control presentation for these representative text/select controls when the live renderer state remains in the document.

### 4.3 Same-origin iframe direct positive control

The same runtime-mutated controls remained live inside a same-origin iframe without flattening.

Physical PDF:

- bytes: `14,100`;
- SHA-256: `f53684c2b56aac3eca5d3b517423626328f5c664ba2a99cef88bb5486707f908`;
- extracted text includes `RUNTIME_INPUT`, `RUNTIME_TEXTAREA`, and `RUNTIME_B`.

Therefore this is not a generic "Chromium cannot print form controls in iframes" limitation.

### 4.4 Native-clone discriminator

A native `document.body.cloneNode(true)` executed in the child document produced:

- text input: `RUNTIME_INPUT` — preserved;
- textarea: `RUNTIME_TEXTAREA` — preserved;
- checkbox: `checked=true`, `indeterminate=true` — preserved;
- radios: `[false, true]` — preserved;
- range: `80` — preserved;
- single select: reverted to `DEFAULT_A` / index 0;
- multiple select: reverted to `[true, false, false]`.

This is an important causal discriminator. Even native cloning is not a sufficient universal form-state capture primitive because current option selectedness can differ from markup defaults. But native cloning does preserve several runtime states that WebClip's current inert mirror discards.

### 4.5 Production-shaped inert proxy loses runtime state broadly

The production-shaped inert mirror produced:

- text input: `DEFAULT_INPUT`;
- textarea: `DEFAULT_TEXTAREA`;
- single select: `DEFAULT_A` / index 0;
- multiple select: `[true, false, false]`;
- checkbox: `checked=false`, `indeterminate=false`, `disabled=true`;
- radios: `[true, false]`;
- range: `10`.

Physical PDF:

- bytes: `16,573`;
- SHA-256: `25a7fe4c73667382a1cc667dd4cbee10d0b40e45e4b41d7dc5467ae3741535eb`;
- extracted text contains `DEFAULT_INPUT` and `DEFAULT_TEXTAREA`;
- extracted single-select text resolves to `DEFAULT_A`;
- `RUNTIME_INPUT` and the selected single-option `RUNTIME_B` are absent.

This is the C13 fresh finding.

The selected form content is not merely non-interactive; it represents **older markup-default state instead of the admitted current rendered state**.

### 4.6 Causal control: materialize runtime state while keeping proxy inert

The final proxy remained `inert` / form controls remained `disabled`. The probe then copied only the relevant current form state from source controls to their corresponding already-safe proxy controls:

- input/textarea `.value`;
- option `.selected` state for single/multiple select;
- checkbox/radio checkedness and indeterminate;
- range value.

Causal proxy state matched the admitted runtime state while checkbox remained `disabled=true`.

Physical PDF:

- bytes: `16,587`;
- SHA-256: `f2371170f02570457a40b853f2e17e943647810fa132f18365893d86de1f7a2c`;
- extracted text again contains `RUNTIME_INPUT`, `RUNTIME_TEXTAREA`, and single-select `RUNTIME_B`.

This proves the immediate failure is **missing state materialization in the secondary representation**, not a requirement to make the archived controls live/interactive and not a PDF renderer inability.

## 5. Duplicate / root-cause reconciliation

### 5.1 P1-187 is the existing current owner

Current Registry authority:

**P1-187 ACTIVE — “Flattened iframe proxy must preserve required rendered state such as canvas bitmap under explicit node/pixel/byte budget.”**

C13 is the same secondary-representation root:

- source current rendered state exists;
- direct renderer can print it;
- the flattened inert representation reconstructs from incomplete state;
- causal state materialization on the final inert proxy restores the physical result.

Therefore **no new P-code** is allocated.

### 5.2 Historical evidence is consistent but did not advance C13

Historical `RESEARCH_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md` had already observed that native Chromium cloning preserved runtime textarea value and checkbox indeterminate state in its tested build, and classified broader browser-owned flattened-state loss under P1-187.

That historical result was used only as a hypothesis/duplicate lookup. C13 advances only because the current 2026-09-02 source and fresh local physical evidence independently reproduced the current root.

### 5.3 P0-068 remains DONE and is not reopened

P0-068 owns the security/inertness requirement that flattened proxies cannot execute page controls, handlers, active nested contexts or duplicated live actions.

The C13 repair must preserve that acceptance contract.

The finding is **not** “remove disabled/inert” or “use an unguarded native clone”. The correct boundary is:

1. build the safe inert representation;
2. materialize admitted visible control state onto that representation;
3. do not restore action authority, submission, focus/picker behavior, file handles, event handlers or page script execution.

## 6. Architecture implication / recommended target state

P1-187's flattened representation should add a bounded explicit form-state materialization pass after inert clone construction and before physical render.

For ordinary non-sensitive controls, candidate fields include:

- text-like input current value when that value is part of admitted visible content;
- textarea raw/current value;
- checkbox/radio checkedness;
- checkbox indeterminate;
- select option selectedness / selected index, including multiple select;
- range/current numeric state where its visual position is material;
- other browser-owned visible state only when separately proven and safe.

The representation must remain inert. State copying must not re-enable controls or recreate form submission/navigation/action authority.

### Privacy/security boundary

C13 does **not** authorize indiscriminate serialization of sensitive form data.

Password/autofill/file-picker state, file handles/content, hidden values, credentials/tokens and other sensitive inputs belong to C39/privacy policy and require explicit data-minimization rules. Where visible fidelity conflicts with secret minimization, truthful degradation is preferable to silently storing sensitive values.

### Budget boundary

The state pass must be bounded under existing P0-064/P1-167 node/time/string/byte envelopes. It should operate only on already-admitted source/target pairs in the flattened representation; it must not create an unbounded second DOM traversal.

## 7. Non-claims

This C13 result does not claim:

- complete form-control coverage;
- that every runtime control state must be persisted;
- that file picker state should be copied;
- that disabled native appearance is pixel-identical to the live control;
- that current source is release-ready after this evidence;
- any P-owner status transition;
- L5 unpacked-extension proof.

It establishes one narrower fact:

> The current same-origin flattened iframe representation can replace user-visible current form-control state with stale markup defaults because its security-motivated inert clone reconstructs controls from attributes and the later materialization path does not restore runtime form state. This is a fresh instance of existing P1-187.

## 8. Fresh restart decision

Advance:

**C13 — Form / renderer-owned controls**

from:

`NOT-TRIAGED / UNKNOWN`

to:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/CAUSAL CONTROLS (P1-187)`**

Next sequential unadvanced coordinate:

**C14 — Pseudo/generated content — `NOT-TRIAGED / UNKNOWN`**.
