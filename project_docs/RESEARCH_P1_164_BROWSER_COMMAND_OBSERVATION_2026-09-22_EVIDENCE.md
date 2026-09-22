# P1-164 passive browser command-execution observation tooling — 2026-09-22

Status: **QUALIFICATION TOOLING IMPLEMENTED / NO LIVE DESTRUCTIVE COMMAND OBSERVATION EXECUTED**

Owner:

`P1-164 | ACTIVE`

Canonical baseline:

`b34800cfe0bcd063565270a3c89090ffe194839b`

Baseline post-merge Repository Integrity:

- run #1046
- run id `35694983870`
- exact main: `b34800cfe0bcd063565270a3c89090ffe194839b`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

The previous P1-164 runtime-source attestation tranche can prove that the inspected running MV3 service worker and extension package match the exact tested candidate.

It intentionally leaves:

- `commandExecutionProven=false`
- `providerMutationCausalityProven=false`
- `qualificationPass=false`

This tranche adds a second browser-side qualification tool:

`project_tools/chrome_p1_164_command_observer.js`

with deterministic coverage:

`project_tools/test_p1_164_command_observer.js`

The tool passively observes destructive HTTP request emission from the same already-running, source-attested WebClip service-worker target. It does not call Yandex itself.

No live command observation is executed in this tranche.

## External platform basis

Chrome DevTools Protocol exposes the Network domain, including:

- `Network.enable`;
- `Network.requestWillBeSent`;
- `Network.responseReceived`;
- `Network.loadingFailed`.

Reference:

https://chromedevtools.github.io/devtools-protocol/tot/Network/

The existing runtime attestor already discovers and attaches only to a matching WebClip MV3 service-worker target through loopback DevTools.

Reference:

https://chromedevtools.github.io/devtools-protocol/tot/Target/

The Yandex Disk REST API remains the actual provider boundary.

Reference:

https://yandex.com/dev/disk/rest/

These sources are platform/comparison inputs only. WebClip command shape and qualification authority remain the current repository source and P1-164 contracts.

## Why receipt input is intentionally not required before watching

For the destructive WebClip path, durable remote admission is immediately followed by the corresponding provider request inside the running extension operation.

A private recovery receipt therefore cannot reliably be exported by an operator between admission and request emission.

The command observer consequently starts **before** the user triggers the intended WebClip action. It does not require the private receipt in advance.

Instead it records stable sanitized path digests using the same domain-separated source/target digest convention as the existing GET-only Yandex observer. A later evidence-join tranche can compare those digests with the durable receipt/session evidence produced after the operation.

This prevents the qualification tool from changing WebClip command timing or inserting a new provider-visible correlation token.

## Live invocation boundary

The tool requires:

- exact clean tracked Git checkout;
- `--live`;
- loopback-only Chrome DevTools endpoint;
- one explicit expected command shape:
  - `unpublish`;
  - `move`;
  - or `both`;
- bounded watch duration from 1 to 120 seconds.

Example:

`node project_tools/chrome_p1_164_command_observer.js --live --cdp http://127.0.0.1:9222 --expect both --watch-seconds 60`

The tool refuses CI.

It reads no Yandex OAuth token and constructs no provider request.

## Same-target runtime-source proof

Before arming Network observation, the tool reuses the current runtime-attestor contract against the exact tested SHA.

On the same service-worker target it requires:

- exact current manifest identity;
- exact current 34-member package bytes;
- current typed RPF;
- exact current recursively derived worker/importScripts graph;
- exact parsed worker source digests.

Only after that succeeds does the tool enable Network observation.

Therefore a successful future live output may state:

`runningExtensionSourceProven=true`

for the exact service-worker target whose destructive requests were observed.

## Command shapes

The observer recognizes only the current source-authorized destructive endpoints.

### Unpublish

Required request:

- origin: `https://cloud-api.yandex.net`;
- path: `/v1/disk/resources/unpublish`;
- method: `PUT`;
- exact query key set: `path`.

The path value is immediately normalized and replaced with the same domain-separated `source` digest used by the GET-only observer.

### Move

Required request:

- origin: `https://cloud-api.yandex.net`;
- path: `/v1/disk/resources/move`;
- method: `POST`;
- exact query key set:
  - `from`;
  - `path`;
  - `overwrite`;
  - `force_async`;
- `overwrite=false`;
- `force_async=false`.

`from` becomes the shared `source` digest and `path` becomes the shared `target` digest.

Browser `OPTIONS` preflight traffic is ignored and cannot satisfy command proof.

Any wrong method, unexpected destructive query shape, duplicate expected command, unexpected destructive command kind, or `move` before `unpublish` in `--expect both` fails closed.

## Bounded retained trace

The CDP event stream is not persisted wholesale.

Before an event can enter the retained in-memory trace:

- request headers are discarded;
- cookies are discarded;
- request body is discarded;
- raw loading-failure text is discarded;
- only method, URL and CDP request id are retained long enough for classification/response correlation.

The final output contains no raw URL/path or raw request id.

It retains only:

- destructive command kind;
- method;
- endpoint;
- domain-separated request-id digest;
- source/target path digests;
- immutable move flags;
- bounded network outcome;
- optional numeric HTTP response status.

The observer bounds total CDP events and retained relevant events.

## Proof semantics

A successful live output has schema:

`webclip-p1-164-browser-command-observation/v1`

and may assert:

- `runningExtensionSourceProven=true`;
- `commandExecutionProven=true`.

Here, `commandExecutionProven=true` means that the exact source-attested running WebClip service worker emitted the matching destructive HTTP request during the armed watch window.

It does **not** mean:

- Yandex state actually changed;
- the observed response is sufficient proof of provider mutation;
- the later provider observation belongs to the same durable receipt;
- P1-164 is qualified.

Therefore output permanently remains:

- `providerStateObserved=false`;
- `providerMutationCausalityProven=false`;
- `qualificationPass=false`;
- `releaseAuthorized=false`.

## Response boundary

If CDP reports a response, only the numeric status is retained.

If request emission is observed but the browser reports a loading failure or no terminal response before the bounded watch ends, command execution can still be proven while network outcome remains `loading-failed` or `unknown`.

This is important for the existing unknown-settlement qualification cases: the tool must not convert an ambiguous network outcome into a retry instruction.

The durable WebClip receipt and GET-only provider observation remain authoritative for settlement.

## Future evidence join

After a live command observation, the existing P1-164 flow can still:

1. export the exact private WebClip receipt;
2. build the private observer input outside the repository;
3. perform GET-only provider observation;
4. append/verify the bounded observation-session ledger.

The new command output uses the same `source` and `target` digest domains as that observer/session path.

A later bounded binder may therefore require:

- identical tested source SHA;
- identical RPF/Yandex QCF;
- matching source/target path digests;
- command kind/order compatible with receipt phase;
- matching sanitized receipt/session subject;
- provider observation after the command evidence.

Only that future join can address provider-state causality. This tranche does not pre-claim it.

## Deterministic witness

`project_tools/test_p1_164_command_observer.js` is network-free.

It covers:

- current exact runtime contract: 34 package members / 10 parsed worker scripts;
- current RPF and Yandex QCF;
- exact unpublish request recognition;
- exact move request recognition;
- shared source/target digest parity with the existing Yandex observer;
- browser preflight ignored;
- non-Yandex traffic ignored;
- wrong method/query/overwrite/force-async rejected;
- Authorization/Cookie headers removed before retained trace;
- loading failure detail removed before retained trace;
- response-status-only retention;
- duplicate command rejection;
- unexpected command rejection;
- missing expected command rejection;
- `move`-before-`unpublish` rejection for composite expectation;
- raw source/target paths absent from final output;
- raw extension id absent from final output;
- runtime source proof required before command-proof finalization;
- explicit `commandExecutionProven=true` only for a successful synthetic trace;
- permanent `providerMutationCausalityProven=false`;
- permanent `qualificationPass=false`;
- permanent `releaseAuthorized=false`;
- no OAuth token consumption and no provider request construction.

Synthetic events exercise the validator only. They are not physical command evidence.

## Runtime-attestor refactor

The existing runtime attestor exports its already-bounded CDP helper primitives so the command observer can reuse exactly the same:

- loopback endpoint policy;
- CDP JSON retrieval;
- WebSocket client;
- Runtime result extraction;
- parsed-script source collection.

This is an internal qualification-tool refactor only; runtime attestation semantics do not change.

## Shared observer digest helper

The existing GET-only Yandex observer now exports the same internal domain-separated identity-digest helper it already used for its sanitized receipt identities.

Its output schema and digest values do not change.

This avoids introducing a second path-digest algorithm in the command observer.

## Identity impact

This tranche changes only qualification tooling/tests/docs.

No extension package member, S0-C projection/full-RCF root, S0-D builder semantic manifest or `manifest.json` version changes.

Expected current identities remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

## Remaining physical boundary

P1-164 remains **ACTIVE**.

No live command observation, Chrome qualification or Yandex mutation is executed here.

The remaining physical matrix still includes:

- successful revoke + Trash;
- unknown settlement around unpublish admission;
- unknown settlement around move admission;
- target visibility delay;
- auth expiry / reauthorization;
- account/root switching;
- source/public-link replacement;
- occupied/replaced immutable target;
- real manual-resolution operator flow;
- live command/provider-state evidence join sufficient for case causality.

No deterministic/source result is promoted to physical Yandex PASS.

## Explicit non-actions

No extension runtime/package byte is modified.

No Yandex OAuth/API request is made by this tooling tranche.

No live browser qualification run, receipt mutation, product ZIP/build, readiness mutation, version bump, release-gate execution, tag, deployment, GitHub Release, S2 activation or release decision is performed.
