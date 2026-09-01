# P0-071 closure evidence — actual printed URI-scheme guard — 2026-09-01

Date: 2026-09-01

Owner: `P0-071`.

Baseline `main`: `32367a49802fe91077a9fd31aa5578c70393c136`.

Accepted current-Chrome evidence head: `84b0f471fe80c8fab0f0670edf1da8968e3c353a`.

Accepted GitHub Actions run: `33463569910`, job `99718684840`, conclusion **SUCCESS**.

Browser: Google Chrome for Testing `152.0.7977.64`.

## 1. Acceptance contract

`P0-071` requires safe URI schemes to be enforced on the **actual representation consumed by `Page.printToPDF`**, including hostile mutation after ordinary preparation and hostile `beforeprint` mutation. A source-only/preparation-only sanitizer is insufficient because the host page is allowed to run between admission/preparation and the native render cut.

Closure requires all of the following:

- the real MV3 service worker installs the guard before ordinary worker code uses `chrome.debugger.sendCommand`;
- page script execution cannot perform a hostile `beforeprint` substitution during the guarded render cut;
- the actual printable DOM is scanned after script execution is frozen;
- unsafe URI schemes are removed from top document, open Shadow DOM and same-origin frame representation before physical PDF generation;
- safe `http`, `https`, `mailto`, `tel`, relative and internal destinations remain usable;
- temporary href removal is reversible and restores the live page after the PDF cut;
- scan/restore is bounded and fails closed rather than returning a silently unsafe PDF;
- a physical PDF inspection proves annotation behavior, because this owner is observable at L4.

## 2. Implementation

Runtime changes:

- `pdf-print-guard.js` wraps `chrome.debugger.sendCommand` and intercepts `Page.printToPDF` only;
- before the native print call it sends `WEBCLIP_PRINT_RENDER_STATE`, freezes page scripts with `Emulation.setScriptExecutionDisabled`, enables the CDP DOM agent, and performs a bounded `a[href], area[href]` search;
- explicit safe schemes are `http`, `https`, `mailto`, `tel`; scheme-less relative/internal links are retained;
- unsafe hrefs are temporarily removed from the actual DOM representation;
- the DOM agent remains enabled through `Page.printToPDF` and href restoration so frontend `nodeId` identities stay valid;
- after restoration, script execution and WebClip UI state are restored;
- cleanup failure after a successful streamed PDF causes fail-closed failure and attempts to close the stream rather than reporting success;
- `MAX_PRINT_LINKS = 20_000`, with bounded search chunks.

Bootstrap change:

- `journal-text-filter.js` already loads synchronously at service-worker startup;
- its worker-only branch now imports `pdf-print-guard.js` when `document` is absent and `importScripts` exists;
- the Journal page path does not install the worker guard.

This intentionally avoids changing the large `service-worker.js` while still installing the guard before its debugger calls.

## 3. Deterministic regression

`project_tools/test_p0_071_print_render_guard.js` covers:

- scheme classification for safe and unsafe URI classes;
- hostile mutation suppression while script execution is disabled;
- top-level and Shadow unsafe href removal before the delegated `Page.printToPDF` call;
- preservation of safe hrefs;
- href restoration after the render cut;
- UI hide/restore bracketing;
- failure-path rollback;
- the regression discovered during current-Chrome proof: `DOM.disable` must occur only **after** href restoration.

Accepted deterministic output at the current-Chrome evidence head:

`P0-071 print render guard: PASS`

## 4. Physical Chrome evidence

The physical harness is `project_tools/audit_p0_071_print_render_guard.py`.

The accepted run first loaded the extension as an MV3 extension in Chrome 152 and proved the actual service worker had installed `WebClipPdfPrintGuard`, the install marker was true, `chrome.debugger.sendCommand` remained callable, and the expected safe-scheme set was present.

### Baseline control

Without the guard, a page-owned `beforeprint` handler changed a safe top-level link to:

`javascript:window.__P0_071_EXECUTED=1`

The physical PDF annotation contained that `javascript:` URI. The same baseline also physically contained hostile nested URIs:

- Shadow DOM: `javascript:window.__P0_071_SHADOW=1`;
- same-origin frame: `data:text/html,P0_071_FRAME`.

Baseline PDF SHA-256:

`1de4b71e9b737540968fcc5fc61cd57293f294640eb786de2fc1e5f97807f69f`

This is the positive failure control proving the browser would serialize the unsafe representation without the new guard.

### Guarded beforeprint + nested case

With the guard active:

- `beforeprint_count = 0` while scripts were frozen;
- the safe top-level URL remained `https://safe.example/article?id=42#section`;
- `mailto:person@example.test` remained;
- `tel:+1234567890` remained;
- the internal destination remained a PDF internal link;
- the hostile Shadow `javascript:` URI was absent from PDF annotations;
- the hostile same-origin frame `data:` URI was absent from PDF annotations;
- both hostile live href values were restored after printing.

Guarded PDF SHA-256:

`09bdfcb6587aa86f68806b1593e62e2b4ea8777f51b1bd5bb2dcf0f8e8d896a3`

### Already-mutated case

The top-level target was deliberately changed to:

`data:text/html,P0_071_RENDER_CUT`

**before** entering the guarded print cut. The guard still removed it from the actual printable representation; the physical PDF contained no unsafe annotation, and the live DOM value was restored after printing.

PDF SHA-256:

`d9d8210b82bda5372f59eec42034a44be9352f65d1a37cdef2e5f25ea1c83bc7`

Across the physical cases, extracted-text SHA-256 remained:

`880e396fd5ad859a114d570d8046f76f9c9d2ae8d92321eaf065cd0a422122b7`

so the URI guard did not change the fixture text content.

## 5. Current-Chrome correction discovered during closure

The first current-Chrome attempt at head `8249045cf2f1d5c1f023fc9b551accd0a4313185` failed after the PDF because Shadow/frame href restoration did not succeed. That run was `33463366107`, job `99718076669`.

Root cause was in the first guard implementation: it called `DOM.disable` after the scan and then re-enabled DOM before restoration. Chrome frontend `nodeId` identities are not stable across that lifecycle, so the old IDs were not reliable restoration capabilities.

The implementation and deterministic regression were corrected so one DOM-agent lifetime spans scan -> `Page.printToPDF` -> restore -> `DOM.disable`. The next targeted current-Chrome run, `33463569910`, job `99718684840`, succeeded.

This failed attempt is retained as useful closure evidence rather than hidden, because it directly tightened rollback correctness.

## 6. Change Impact after accepted browser head

After accepted physical evidence head `84b0f471fe80c8fab0f0670edf1da8968e3c353a`, the only subsequent branch change before this durable closure record was deletion of the temporary browser-evidence workflow. No runtime, deterministic test or harness behavior changed. Therefore the accepted Chrome 152 evidence remains applicable to the final PR head unless a later runtime/test/harness change is introduced.

## 7. Owner conclusion

`P0-071` satisfies its implementation + direct L4 verification acceptance contract and can transition to **DONE**.

This closure is deliberately narrow. It does **not** close:

- `P0-070` exact full-document generation authority;
- `P0-075` broader host-page trust/control-plane isolation;
- other PDF fidelity, temporal-state, frame-generation or rollback owners.

Those remain governed by their canonical Registry status and evidence.

Release readiness is unchanged. `RELEASE_READINESS.md` remains **NOT READY** and this engineering closure does not create a build, tag or GitHub Release.
