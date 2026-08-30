# Durable audit evidence — C24 inert disclosure/spoiler contract — 2026-08-30

Canonical current P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`.

Exact fresh baseline: `main = 0ecfff217d8cc81099fadd9476532d8d7d845f28` after the completed PR #58 delivery tail and post-merge Repository Integrity #168 SUCCESS.

Audit branch: `audit/inert-disclosure-contract-2026-08-30`.

Managed browser: Chromium `144.0.7559.96` on Debian 13. Physical PDFs were produced only from deterministic local fixtures; no external site, privileged extension API, policy bypass or offensive action was used.

## Scope and contract

Coverage row: **C24 — Spoilers/disclosures / inert expansion**.

The current primary PDF contract requires a closed safe disclosure inside selected scope to be represented expanded for later reading while preserving the distinction between `sourceState=closed` and `staticRepresentation=expanded`. Expansion must happen on a capture/clone/static representation, not by synthetic page-owned click on the live page. Stateful/network content that exists only after application interaction must not be silently activated. `Exclude` remains absolute priority. If safe completeness cannot be proven within budgets, the result must become truthful partial/degraded/unknown or error rather than silent full success.

Required evidence for this tranche: L1 current-source proof plus managed Chromium L3 and physical PDF L4 controls.

## Executive classification

**C24 = `ARTIFACT-COVERED / FINDING`.**

No new P-code is created.

Primary current owners already cover the reproduced root causes:

- **P0-067 ACTIVE / P1-212 ACTIVE** — PDF preparation must not synthesize activation of page-owned controls merely to reveal content.
- **P1-167 ACTIVE** — preparation needs one shared node/time/mutation/string budget; disclosure candidate scans and serial waits are already part of this owner.
- **P0-075 ACTIVE** — the live hostile page is not a neutral trusted preparation/control plane.
- **P0-070 ACTIVE** — admitted source state and the static generation consumed by PDF must be exact and authoritative.
- **P0-004 ACTIVE** — physical selected-copy completeness and absolute Exclude consequences.
- **P1-004 ACTIVE umbrella** supports the cross-origin frame parity limitation described below; no separate cross-origin disclosure owner is allocated by this tranche.

Historical local-prepare evidence already explicitly classified disclosure `.click()` and serial disclosure work under P0-067/P1-212/P1-167 without a new P-number. The current PDF contract makes C24 semantics explicit, but it does not make the same implementation root cause independent.

## L1 — current source proof

### 1. Native `<details>` is mutated on the live page

`prepareForPrint(meta)` calls `await expandSpoilersInIncludedContent()` before PDF generation.

For each selected closed `<details>`, current `content.js` executes:

```js
details.open = true;
```

This is better than a synthetic click in one narrow sense, but it is still a mutation of the live hostile document. Page `toggle` handlers, MutationObservers and custom application logic can observe/react to it. Current code does not first clone/freeze the selected representation.

### 2. The snapshot set is not a rollback receipt

`expandSpoilersInIncludedContent()` creates `const snapshotted = new Set()` and stores native details, disclosure controls, panels and containers in it. Current function never reads this set again before returning. It therefore provides neither rollback nor provenance.

### 3. Page-owned ARIA/accordion controls are actually clicked

For page-owned controls current code calls:

```js
const clicked = triggerInternalClick(control);
```

and `triggerInternalClick()` performs:

```js
control.click();
```

with only WebClip's own click interceptor bypassed by `state.internalInteraction`. Page listeners and default browser behavior remain active.

`isSafeDisclosureControl()` is not an inertness proof. It permits a semantic non-hash `<a href=...>` when disclosure-like attributes are present, and permits `button[type=submit]` when it has disclosure-like attributes. Thus navigation/submission-capable controls can reach `.click()`.

### 4. Fallback expansion also mutates live application DOM

If the page handler did not expose an already-existing panel, `forcePanelVisible()` mutates `hidden`, `aria-hidden`, `display`, `visibility`, `opacity`, `max-height`, `height`, `overflow`, and the control's `aria-expanded` directly on the live page.

### 5. Disclosure mutations deliberately are not rolled back

`restoreAfterPrint()` explicitly states that expanded spoilers/accordion are intentionally **not** closed after PDF. It restores resource attributes, image wrappers, normalized links, print styles and frame styles, but not disclosure state.

Therefore success, failure and retry can leave the source page changed by WebClip's own preparation.

### 6. No disclosure provenance/diagnostic receipt

Current page diagnostics contain selected element/layout/resource/frame information but no receipt that distinguishes source disclosure state from static representation. There is no durable `sourceState=closed` / `staticRepresentation=expanded` record, no count of inertly expanded details, and no truthful flag for controls skipped because safe inert materialization could not be proven.

### 7. Disclosure work has no shared operation budget

The native details query and disclosure-control query are independent broad selector scans. The control scan can repeat for three passes. Candidate count is not capped. Every successful `.click()` adds a serial `await delay(40)`, followed by pass waits and a final settle wait. This is the already-owned P1-167 root cause.

### 8. Cross-origin frame-agent has no disclosure expansion path

Current `frame-agent.js` `preparePrint()` only prefetches selected images, measures document height and installs selected-only print CSS. It contains no native `<details>` or ARIA disclosure materialization step.

Therefore the top-document disclosure helper can handle selected same-origin child DOM that is directly accessible, while a SOP-isolated cross-origin child handled by the frame agent has different C24 semantics. A closed native `<details>` in that child remains closed unless the user/page already opened it.

## L3/L4 deterministic local probe

Probe: `project_tools/audit_inert_disclosure_contract.py`.

The probe copies the exact relevant current disclosure decision/control shape into a safe fixture and uses Chromium `Page.printToPDF` through Playwright. It records page events/mutations and extracts text from physical PDF bytes using `pypdf`.

### Control A — native closed/open/nested details and Exclude

Initial selected fixture contained:

- one closed native `<details>` with `NATIVE_CLOSED_CONTENT`;
- an explicitly excluded descendant `EXCLUDED_DETAIL_CONTENT`;
- one nested closed `<details>` with `NESTED_CONTENT_ONCE`;
- one already-open `<details>` with `NATIVE_ALREADY_OPEN`.

After current-shaped preparation:

- outer closed details: `open false -> true`;
- nested details: `open false -> true`;
- already-open details remained open;
- physical PDF contained `NATIVE_CLOSED_CONTENT`;
- physical PDF contained `NESTED_CONTENT_ONCE` exactly once;
- physical PDF did **not** contain `EXCLUDED_DETAIL_CONTENT`.

This is an important positive control: native static completeness and Exclude can coexist physically.

### Control B — live native toggle side effect enters the PDF

The closed native details had a page-owned `toggle` handler that appends `NATIVE_TOGGLE_CREATED_CONTENT` when the details becomes open.

Setting `details.open = true` triggered the handler. The newly page-created node was then present in the physical PDF.

Thus native `.open=true` on the live page is not equivalent to inert clone expansion. It can create application content/state after admission and WebClip currently has no provenance boundary to reject it.

### Control C — ARIA/stateful/submit/anchor controls are synthetic-activated

The selected fixture contained four disclosure-like controls:

1. ordinary ARIA button over an existing hidden panel;
2. ARIA button whose page click handler appends new `STATEFUL_CREATED_BY_SYNTHETIC_CLICK` content;
3. `button[type=submit]` with `aria-controls`;
4. non-hash anchor with `aria-controls`.

Current-shaped preparation generated exactly one page click for each of the four controls. The semantic submit also generated one real `submit` event. The fixture prevented navigation/submission settlement only to keep the local audit deterministic.

`STATEFUL_CREATED_BY_SYNTHETIC_CLICK` appeared in the physical PDF. This directly violates the current C24 rule that interaction-created application content must not be silently activated and then presented as ordinary safe disclosure content.

### Control D — outside-selected disclosure is not activated

A disclosure control outside the selected scope received zero clicks, remained `aria-expanded=false`, and its hidden panel text was absent from the physical PDF.

This is a positive user-scope control.

### Control E — source page remains mutated after physical PDF

After `printToPDF`, the fixture still had:

- native outer and nested details open;
- ARIA/stateful/submit/anchor controls changed to `aria-expanded=true` where fallback/page logic did so;
- stateful page-created DOM still mounted.

The probe observed 34 live mutations in the selected subtree for this fixture. Exact mutation count is fixture-specific; the durable result is that no disclosure rollback occurs.

### Control F — same-origin frame parity for native details

A selected same-origin child body with a closed native details changed `open=false -> true` through the top-document current-shaped helper, and physical PDF contained `SAME_ORIGIN_FRAME_DETAILS_CONTENT`.

### Control G — SOP-isolated child without disclosure expansion

A sandboxed `srcdoc` iframe with an opaque origin was confirmed SOP-inaccessible from the top page. With no child disclosure expansion, Chromium's physical PDF contained `CROSS_FRAME_SUMMARY` but did **not** contain `CROSS_ORIGIN_CLOSED_DETAILS_CONTENT` from the closed details body.

Combined with L1 frame-agent source proof, this demonstrates current cross-origin C24 parity is absent.

### Control H — serial disclosure wait floor

A selected fixture with 24 accepted ARIA disclosure controls completed current-shaped disclosure expansion in approximately `1253.7 ms` (`52.2 ms/control` in this environment). The structural floor comes from the source's serial `40 ms` wait per successful click; exact wall-clock timing is not a product invariant.

This revalidates P1-167 rather than creating a new performance owner.

## Physical artifact fingerprints

The probe produced these local physical PDFs in the recorded run:

- top disclosure control: `17138` bytes, SHA-256 `74b3d40fbfacf7c83f2737163fc9a202819ea02731b220a0ef6423d9ce9f06d8`;
- same-origin frame control: `8301` bytes, SHA-256 `0153c103ab8f0bc7334d5dc5a818a466e74974d2b6f0914ecffd10ddd43ccfb6`;
- SOP-isolated closed-details negative control: `16238` bytes, SHA-256 `933914a950dcf154bffe8b29808599c595aca12a5eb1127dff702323d7e2c312`.

Artifact bytes themselves are ephemeral local audit outputs; the durable repository evidence is the deterministic probe, asserted text/state results and fingerprints above.

## Contract conclusions

### What currently works

- native closed details content can be made physically readable;
- nested details are expanded in deterministic DOM order for the tested case;
- already-open details remains semantically open;
- explicit Exclude stayed absent from the physical artifact;
- disclosure controls outside selected scope were not activated;
- selected same-origin frame native details received top-helper expansion.

### What fails current C24

1. expansion is performed on the live page rather than an inert capture/static representation;
2. native `details.open=true` can execute page `toggle` logic and admit post-admission application mutations;
3. ARIA/accordion path explicitly performs page-owned `.click()`;
4. semantic submit/navigation-capable controls can pass the current heuristic and receive synthetic activation;
5. stateful content created only because of WebClip's synthetic interaction can enter the physical PDF;
6. disclosure mutations are not rolled back on success/failure/retry;
7. no source-closed/static-expanded provenance or truthful skipped/unknown disclosure diagnostic exists;
8. cross-origin frame-agent preparation does not implement disclosure expansion parity;
9. candidate/mutation/string/wall-clock work is not part of one shared preparation budget.

## Required implementation acceptance shape

A future implementation should not fix this by teaching `isSafeDisclosureControl()` more click heuristics. The acceptance boundary is representation ownership:

- capture/freeze exact admitted disclosure source state;
- inertly expand native/safe already-existing disclosure content in a WebClip-owned clone/static representation;
- preserve Exclude before and after materialization;
- never synthesize page-owned click/submit/navigation merely to generate content;
- do not silently include nodes/resources that only appear because a stateful interaction was invoked;
- apply explicit node/control/mutation/time/string budgets shared with the rest of PDF preparation;
- provide top/same-origin/cross-origin parity where supported, otherwise truthful partial/degraded/unknown;
- record `sourceState` separately from `staticRepresentation` where materially relevant;
- cleanup/retry must not leave WebClip preparation mutations on the live source page.

## Coverage/history action

C24 moves from `REVALIDATION-REQUIRED / UNKNOWN` to **`ARTIFACT-COVERED / FINDING`**.

No `P1-231` or other new code is allocated. `P1-231` remains unallocated after this tranche. Current registry statuses do not change.