# P1-164 live Yandex observation harness — 2026-09-20

## Scope

This tranche starts from canonical `main` commit `14da19c15aa2468483e30f399f8f2fc60e3895f7` and prepares reproducible real-provider qualification without inventing provider evidence or embedding credentials.

The repository does **not** have authorized live Yandex credentials in the current development environment. Therefore this tranche does not execute revoke, move, publish, delete, upload, or any other Yandex mutation and does not claim a live PASS.

The added helper is:

`project_tools/yandex_p1_164_live_observer.js`

It is deliberately observation-only. It may issue only authenticated `GET /v1/disk` and `GET /v1/disk/resources` reads. It contains no `unpublish`, `move`, `publish`, upload, POST, PUT, or DELETE command surface.

## Why this boundary

P1-164 now has durable at-most-once command admission in production. The remaining qualification problem is physical settlement and operator evidence, especially after a response becomes unknown.

External comparison supports keeping command ownership and observation separate:

- Yandex Disk REST API uses OAuth-authenticated HTTP operations: https://yandex.com/dev/disk/rest/
- the typed `yd-sdk` exposes move, unpublish and operation-status as separate API methods and documents that move may yield an operation link: https://github.com/axtk/yd-sdk
- Yandex's Java REST client keeps `unpublish` as its own resource operation: https://github.com/yandex-disk/yandex-disk-restapi-java/blob/master/disk-restapi-sdk/src/main/java/com/yandex/disk/rest/RestClient.java
- another public Yandex Disk client documents move with overwrite=false semantics and asynchronous operation objects: https://github.com/jack-theripper/yandex

These sources are comparison inputs only. WebClip's current durable receipt, exact provider identity and no-replay rules remain authoritative.

## Observer input and secret boundary

The observer requires a private JSON file **outside the repository** and refuses CI execution. The OAuth token is accepted only through the transient environment variable `WEBCLIP_YANDEX_OAUTH_TOKEN`.

A qualification input binds:

- exact tested Git SHA;
- receipt kind `publication-revoke-trash`;
- durable phase, or `manualResolutionSourcePhase` for a manual-resolution receipt;
- exact operation id;
- exact account uid;
- exact receipt root;
- exact immutable source and Trash target paths;
- exact stable `resource_id`;
- exact original public URL;
- separately supplied current root context;
- optional bounded read-only visibility watch, maximum 120 seconds.

Example private input shape:

```json
{
  "schema": "webclip-p1-164-live-observer-input/v1",
  "testedSourceSha": "<exact-clean-checkout-sha>",
  "kind": "publication-revoke-trash",
  "phase": "move-admitted-unknown",
  "receipt": {
    "operationId": "<exact-receipt-operation-id>",
    "accountUid": "<exact-receipt-account-uid>",
    "rootPath": "/WebClip",
    "sourcePath": "/WebClip/Upload/<file>.pdf",
    "targetPath": "/WebClip/Trash/MM-YYYY/<file>.pdf",
    "sourceResourceId": "<exact-resource-id>",
    "sourcePublicUrl": "<exact-original-public-url>"
  },
  "currentContext": {
    "rootPath": "/WebClip"
  },
  "watchSeconds": 45
}
```

The example is schema documentation only. Real values are private and must not be committed.

Invocation:

```text
WEBCLIP_YANDEX_OAUTH_TOKEN=... node project_tools/yandex_p1_164_live_observer.js --live --config /absolute/private/input.json
```

Before any provider read, the helper requires the checkout HEAD to equal `testedSourceSha` and requires a clean tracked worktree. It also runs the current P1-231 S0-E identity engine and binds the sanitized observation to the current RPF and Yandex QCF.

## Sanitized evidence output

Stdout contains no raw OAuth token, account uid, source/target path, resource id or public URL. Private identity values are represented only by domain-separated SHA-256 digests. Provider reads are reduced to equality/publicity booleans, HTTP status class and bounded phase classification.

The output explicitly carries:

`evidenceClass = live-provider-observation-only`

and limitations stating that the observer:

- issued no provider mutation;
- does not prove WebClip command admission by itself;
- does not close P1-164 by itself;
- does not advance the Yandex QCF by itself.

A real qualification record therefore needs both the WebClip/authorized-operator admission evidence and the matching observer result.

## Phase-aware qualification schedule

The observer classifies the same durable phases as production:

- `prepared`: prove exact published source, account/root match and clear immutable target before an admission; already-private and occupied-target states are separate;
- `revoke-admitted-unknown`: private exact source may settle revoke; a still-public or unavailable source remains observation-only and explicitly forbids another unpublish;
- `revoke-verified`: require the exact source to remain private and target to be clear before returning command ownership to WebClip for the one move admission;
- `move-admitted-unknown`: exact private target may settle move; source-still-present, both-missing and visibility-delay states explicitly forbid another move;
- `remote-verified`: re-observe exact private terminal identity before local-only finalization;
- `manual-resolution`: require preserved `manualResolutionSourcePhase`; legacy receipts with missing lineage are not invented by the helper.

The classifier also fails closed for auth rejection/expiry, account switch, root switch, source replacement, public-URL replacement, occupied immutable target, target replacement and terminal-public regression.

A bounded `watchSeconds` window supports target-visibility-delay qualification using repeated GET-only observation. Expiry of that window does not convert unknown settlement into success.

## Deterministic validation

`project_tools/test_p1_164_live_observer.js` is network-free and verifies:

- GET-only provider surface and absence of mutation endpoints/methods;
- CI refusal and env-only token ownership;
- private config path requirement;
- exact phase/manual-lineage validation;
- no-replay classifications after revoke and move admission;
- auth/account/root/source/target conflict handling;
- bounded visibility watch input;
- identity digesting and removal of raw private identity from durable output;
- explicit evidence limitations.

Local preflight on the candidate source: **PASS 64 checks**, `network_calls=0`, `mutating_provider_endpoints=0`.

This deterministic PASS proves only the observer contract. It is not live Yandex evidence.

## Release/evidence boundary

No runtime/package file, `manifest.json`, release gate, P1-231 release-contract root or physical qualification artifact is changed by this tranche. The runtime version remains `0.9.8`; release readiness remains **NOT READY**.

P1-164 remains **ACTIVE**. Real authorized Yandex qualification is still required for successful revoke+move, unknown settlement around both admissions, target visibility delay, auth expiry, account/root switch, source replacement, occupied immutable target and real manual-resolution UX.
