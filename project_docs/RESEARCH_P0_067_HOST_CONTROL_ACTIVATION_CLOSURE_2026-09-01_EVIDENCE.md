# P0-067 closure evidence — host-page control activation during PDF preparation — 2026-09-01

Date: 2026-09-01

Primary owner: `P0-067`.

Canonical integration baseline: `main = 014ee40a283d2cdb4499ac12e450daa550fe37f8` after P0-033 delivery.

Accepted integrated evidence head: `c6fa0c73ddd9b826c66fbd577136f82ee93deb61`.

Accepted GitHub Actions execution: workflow run `33469993760`, **attempt 2**, job `99737912236`, conclusion **SUCCESS**.

Browser: Google Chrome for Testing `152.0.7977.64`.

The temporary evidence workflow was deleted after the accepted execution. Production P0-067 files and the accepted Chrome harness were not changed after the evidence head before documentation/status delivery.

## 1. Owner contract

P0-067 requires PDF preparation to never obtain authority by synthesizing a real page-owned control activation. WebClip preparation must not call a host button/link/control strongly enough to execute arbitrary page click handlers, submit forms, navigate, or trigger other page-owned side effects.

This is the narrow **activation-authority** owner. It does not claim that every disclosure whose content is generated only by arbitrary site JavaScript can be reproduced without separate representation/fidelity work.

## 2. Baseline finding

Existing durable finding: `RESEARCH_FUNCTIONAL_P0_067_HOST_CONTROL_ACTIVATION_2026-09-01.md`.

Before the repair, exact `content.js` followed:

`prepareForPrint()` → `expandSpoilersInIncludedContent()` → `triggerInternalClick(control)` → real `control.click()`.

The accepted finding used a disclosure-looking `button[type=submit]` with `aria-expanded="false"` and `aria-controls`. Chrome 152 run `33459232299` / job `99705678594` observed:

- before preparation: host `clicks=0`, `submits=0`;
- after WebClip preparation: host `clicks=1`, `submits=1`;
- the path still reached `WEBCLIP_GENERATE_PDF`.

`state.internalInteraction` protected only WebClip's own selection handler and could not suppress host-page listeners or native default activation.

## 3. Repair

`host-control-activation-guard.js` is injected in WebClip's extension isolated world before `content.js`.

Its policy is deliberately narrow:

- WebClip-owned elements rooted in the extension Shadow DOM under `#webclip-pdf-extension-root` may use programmatic `.click()`;
- page-owned programmatic `.click()` from the isolated world is rejected before native activation;
- accessible same-origin frame realms receive the same isolated-world policy;
- the page main world is not patched.

Trusted user input and site JavaScript executing in the page main world therefore retain normal browser semantics.

`content-injection-guard.js` now enforces:

`frame-proxy-budget-guard.js` → `frame-proxy-inert-guard.js` → `host-control-activation-guard.js` → `content.js`.

`popup.html` installs the same injection guard before `popup.js`, so popup and worker injection paths use one prefix policy.

Current `content.js` is unchanged and still contains exactly one programmatic `.click()` call: the researched `triggerInternalClick(control)` boundary. When that page-owned activation is blocked, existing code can still apply `forcePanelVisible(panel, control)` to a linked disclosure panel that already exists in the selected DOM.

## 4. Integration with P0-033

While the first P0-067 branch was being prepared, canonical `main` advanced through PR #80 / P0-033. The P0-033 change added `operation-log-redaction-guard.js` to the worker bootstrap in `journal-text-filter.js` and changed related regressions, but did not change the P0-067 production files.

Rather than merge a stale Registry, P0-067 was rebuilt on fresh `main = 014ee40a...`.

The production P0-067 blobs were carried byte-identically. The deterministic repository-binding assertion was updated only to require the current integrated worker bootstrap:

`pdf-print-guard.js`, `content-injection-guard.js`, `operation-log-redaction-guard.js`.

The integrated managed gate ran both:

- `P0-067 host control activation guard: PASS`;
- `P0-033 signed Yandex OperationLog redaction: PASS`.

Thus P0-067 delivery does not reopen the immediately preceding P0-033 closure.

## 5. Managed evidence history

Earlier P0-067 development runs that are **not** closure evidence:

- `33469256932` / `99735459851`: deterministic VM fixture accidentally shared one HTMLElement prototype between simulated realms;
- `33469316214` / `99735632837`: synchronous Playwright harness accidentally used an async Python helper before product commands ran;
- `33469440306` / `99736002561`: the final main-world control was timed after WebClip's intentional selection capture listener and therefore measured selection interception rather than prototype leakage.

Pre-P0-033 accepted development run `33469545801` / `99736317876` proved the repaired behavior on the earlier baseline, but it is not used as the final integration authority.

On the fresh P0-033 baseline, run `33469993760` attempt 1 failed before product assertions because the MV3 fixture service worker did not appear within the startup window. Both integrated deterministic regressions had already passed. The same exact commit was rerun without changes.

Run `33469993760` **attempt 2**, job `99737912236`, then completed SUCCESS and is the accepted integrated evidence.

## 6. Accepted integrated Chrome 152 results

### 6.1 Source identity

SHA-256 values emitted by the accepted run:

- `frame-proxy-budget-guard.js`: `7c787f08b3942ecfb50246c45169bf52af7491920edeb2ce8abee9e754da8356`;
- `frame-proxy-inert-guard.js`: `dc4fd3204e52d5c50b57a78ea3f682c64564e49063d2b4a8c7ada8bd01b5ab08`;
- `host-control-activation-guard.js`: `e0cc737d6f607bb7ed53d9f3f4d157c85bec5549a08bfdda17002cd5962e0b39`;
- `content-injection-guard.js`: `e32ada74fa2c9dab60e4dc57f1096a82339f3a793a28fa35203755e93c955b12`;
- `content.js`: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`.

### 6.2 Realm controls

Main-world `HTMLElement.prototype.click` remained native:

- before injection: `true`;
- after injection: `true`;
- after the complete PDF-preparation flow: `true`.

A page-main-world programmatic control click executed once, proving normal page semantics were not globally patched.

The extension isolated world reported the guard installed in two realms: top document and same-origin child frame.

Two isolated-world negative probes — one page-owned top control and one same-origin-frame control — produced:

- `blockedPageClicks = 2`;
- host top probe clicks = `0`;
- host frame probe clicks = `0`.

A WebClip-owned temporary Shadow-DOM button was then programmatically clicked:

- WebClip button click count = `1`;
- `allowedWebClipClicks = 1`.

### 6.3 Exact product preparation path

The harness used real WebClip commands/UI:

1. `WEBCLIP_START_SELECTION`;
2. `WEBCLIP_COMMAND / auto-content`;
3. `WEBCLIP_COMMAND / download`;
4. trusted physical activation of WebClip's `Сформировать PDF` button;
5. real `downloadPdf()` → `prepareForPrint()` → disclosure preparation;
6. actual `WEBCLIP_GENERATE_PDF` message.

Before preparation:

- disclosure host clicks = `0`;
- form submits = `0`.

After preparation:

- disclosure host clicks = **`0`**;
- form submits = **`0`**;
- linked existing panel `aria-expanded = "true"`;
- linked existing panel visible = `true`;
- final `blockedPageClicks = 3` (top probe + frame probe + actual preparation attempt);
- final `allowedWebClipClicks = 1`;
- generate-PDF message count = `1`.

This reverses the original P0-067 discriminator without merely aborting PDF preparation.

### 6.4 Physical PDF control

The generate response was held until a physical `Page.printToPDF` captured the actual prepared representation.

Accepted result:

- pages: `1`;
- PDF SHA-256: `d4bb8124df8841de132adaa06e93886973483be056fcfed7b93c5e94f58d741c`;
- selected-article text present;
- `P0_067_STATIC_DISCLOSURE_SENTINEL` present.

The repair therefore preserves an already-existing linked disclosure panel in physical output while refusing to execute the page-owned submit control.

## 7. Residual boundaries

This closure does **not** close:

- `P0-004` — complete selection-bounded PDF fidelity;
- `P0-075` — broader host-page trust/control-plane and isolated print representation;
- `P1-003` — selected renderer-resource readiness;
- separate representation owners for content that does not exist until arbitrary site JavaScript generates it;
- release readiness.

A future representation strategy may choose an inert clone/materialization or another bounded method for site-JS-only disclosures. P0-067 only forbids obtaining that content by synthesizing real host activation.

No new P-code is warranted.

## 8. Owner conclusion

P0-067 satisfies its narrow implementation plus direct current-browser verification contract and can transition to **DONE** after normal PR delivery gates.

The final accepted integration proves that WebClip PDF preparation no longer activates a real host control, same-origin frame realms are covered, WebClip's own Shadow UI remains functional, the page main world retains native click semantics, the product path still reaches PDF generation, physical disclosure content remains present, and the preceding P0-033 regression remains PASS.

`DEEP-RESEARCH-COVERAGE-COMPLETE` remains true while broader critical closure remains incomplete.

`RELEASE_READINESS.md` remains **NOT READY**. This tranche does not change manifest version, build, tag, or GitHub Release.
