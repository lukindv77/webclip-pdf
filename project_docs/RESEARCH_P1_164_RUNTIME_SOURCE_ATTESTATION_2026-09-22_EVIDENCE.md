# P1-164 running-extension source attestation tooling — 2026-09-22

Status: **QUALIFICATION TOOLING IMPLEMENTED / NO LIVE BROWSER ATTESTATION EXECUTED**

Owner:

`P1-164 | ACTIVE`

Canonical baseline:

`469d7d9fb06e6fddc9ec0fa5a54c648129755659`

Baseline post-merge Repository Integrity:

- run #1040
- run id `35692342025`
- exact main: `469d7d9fb06e6fddc9ec0fa5a54c648129755659`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

The existing P1-164 qualification tooling can bind:

- one exact clean candidate checkout;
- the source-level two-admission revoke+Trash contract;
- one sanitized GET-only Yandex observation;
- private receipt export/session continuity.

It intentionally left one important qualification claim false:

`runningExtensionSourceProven=false`

A real provider observation is not enough if the browser extension that actually executed the workflow cannot be tied to the exact tested package generation.

This tranche adds a browser-side provenance tool without changing the extension runtime:

`project_tools/chrome_p1_164_runtime_attestor.js`

and deterministic contract coverage:

`project_tools/test_p1_164_runtime_source_attestor.js`

No live Chrome attestation is executed in this tranche.

## External platform basis

The design uses public platform capabilities rather than a WebClip-specific debug endpoint.

Chrome's extension runtime API exposes:

- `chrome.runtime.getManifest()`, which returns the current extension manifest;
- `chrome.runtime.getURL(path)`, which resolves a path inside the installed extension package.

Reference:

https://developer.chrome.com/docs/extensions/reference/api/runtime

Puppeteer's official extension guide documents MV3 service workers as inspectable extension background contexts and shows evaluating code in the service-worker context.

Reference:

https://pptr.dev/guides/chrome-extensions

Chrome DevTools Protocol provides the target/runtime/debugger primitives used by the attestor:

- target discovery / service-worker targets;
- runtime evaluation in the inspected context;
- parsed-script reporting and script-source retrieval.

References:

https://chromedevtools.github.io/devtools-protocol/tot/Target/
https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
https://chromedevtools.github.io/devtools-protocol/tot/Debugger/

These sources are comparison/platform inputs only. WebClip's package authority, release identity and P1-164 qualification rules remain repository authority.

## Live invocation boundary

The tool requires:

- an exact clean tracked Git checkout;
- `--live`;
- a loopback-only Chrome DevTools HTTP endpoint.

Example:

`node project_tools/chrome_p1_164_runtime_attestor.js --live --cdp http://127.0.0.1:9222`

The tool refuses CI execution.

It refuses:

- HTTPS DevTools endpoints;
- non-loopback hosts;
- credential-bearing DevTools URLs;
- non-WebClip MV3 service-worker targets;
- ambiguous matching WebClip service workers.

It contains no Yandex OAuth token handling and no Yandex provider endpoint.

## Exact expected runtime contract

The expected contract is derived from current production P1-231 authorities for the exact tested SHA:

1. S0-A package authority resolves the exact 34 package members from Git;
2. S0-E computes the exact current RPF and Yandex QCF;
3. exact `manifest.json` bytes provide the service-worker path/version;
4. the worker's static `importScripts(...)` graph is derived recursively from exact package bytes.

The exact recursive worker execution-script set is therefore:

- `service-worker.js`
- `public-suffix.js`
- `journal-import-stream.js`
- `journal-text-filter.js`
- `local-download-identity.js`
- `journal-import-digest.js`
- `pdf-print-guard.js`
- `content-injection-guard.js`
- `operation-log-redaction-guard.js`
- `journal-restore-envelope-guard.js`

The extra four scripts are imported by `journal-text-filter.js`; the attestor derives this recursively from exact package bytes rather than hardcoding only the worker's first-level imports.

Dynamic/non-literal `importScripts` syntax fails closed rather than being guessed.

## Two independent runtime checks

### 1. Installed package bytes

Inside the already-running extension service-worker context, the tool evaluates a bounded read-only probe.

For each of the canonical 34 package paths it:

- resolves `chrome.runtime.getURL(path)`;
- fetches the extension-owned resource;
- computes SHA-256;
- records byte length;
- recomputes the typed `WEBCLIP_RELEASE_IDENTITY_V1 / RPF_V1` fingerprint from the browser-fetched bytes.

The browser-computed RPF must equal the exact tested candidate RPF:

`sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`

Every member path/length/digest must also match the exact Git package authority.

### 2. Currently parsed worker sources

Package-file equality alone is not enough for an unpacked extension: files on disk could theoretically change after a worker generation was loaded.

The tool therefore separately enables the DevTools Debugger domain for the matching service-worker target, collects currently parsed `chrome-extension://<id>/...` scripts and requests each parsed script's source.

The current parsed set must match the exact worker/importScripts graph above.

Each parsed source SHA-256 must equal the exact Git package member bytes.

Unexpected extension-origin parsed scripts, missing expected scripts, duplicates, or source mismatch fail closed.

This distinguishes:

- installed package bytes; from
- the JavaScript source currently parsed by the running worker generation.

## Sanitized live output

A successful live invocation emits:

`webclip-p1-164-runtime-source-attestation/v1`

It contains:

- exact `testedSourceSha`;
- current RPF;
- current Yandex QCF;
- bounded browser product string;
- a domain-separated digest of the extension id, never the raw id;
- canonical package member count;
- parsed worker-script count;
- exact-match booleans.

Only an actual successful live DevTools collection may emit:

`runningExtensionSourceProven=true`

The output permanently remains:

- `commandExecutionProven=false`
- `providerMutationCausalityProven=false`
- `qualificationPass=false`
- `releaseAuthorized=false`

This tool proves source provenance for the inspected running browser context only. It does not prove that a particular Yandex provider mutation was caused by that context.

## Deterministic witness

`project_tools/test_p1_164_runtime_source_attestor.js` is network-free.

It covers:

- current exact 34-member package contract;
- current RPF and Yandex QCF;
- current ten-script recursive worker/importScripts graph;
- static import parser and dynamic-import fail-closed behavior;
- package-member length/digest equality;
- service-worker URL / extension-id consistency;
- manifest identity;
- browser RPF equality;
- missing/changed/duplicate package members;
- missing/changed/unexpected parsed worker scripts;
- loopback-only DevTools URLs;
- browser probe construction;
- absence of Yandex/OAuth/provider mutation surfaces;
- explicit non-proof of command execution/provider causality/qualification/release.

The deterministic fixture can exercise the validator, but it is not a live browser attestation.

## Remaining physical boundary

P1-164 remains **ACTIVE**.

A future authorized physical session still needs to run this attestor against the actual browser instance used for qualification and retain the sanitized output alongside the existing receipt/provider observation evidence.

Even after source provenance is physically proven, the remaining P1-164 matrix still requires real authorized evidence for:

- successful revoke + Trash;
- unknown settlement around unpublish admission;
- unknown settlement around move admission;
- target visibility delay;
- auth expiry / reauthorization;
- account/root switching;
- source/public-link replacement;
- occupied/replaced immutable target;
- real manual-resolution operator flow;
- command/provider-state causality sufficient for the qualification case.

No source/deterministic result is promoted to a physical Yandex PASS.

## Identity impact

This tranche changes qualification tooling/tests/docs only.

No extension package member, S0-C projection/full-RCF root, S0-D builder semantics or manifest version changes.

Expected current identity axes remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

## Explicit non-actions

No extension runtime/package byte is modified.

No Yandex OAuth/API request, browser qualification run, receipt mutation, product ZIP/build, readiness mutation, version bump, release-gate execution, tag, deployment, GitHub Release, S2 activation or release decision is performed.
