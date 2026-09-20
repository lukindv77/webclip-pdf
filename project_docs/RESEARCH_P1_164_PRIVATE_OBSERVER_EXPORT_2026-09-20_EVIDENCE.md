# P1-164 private observer export — 2026-09-20

## Scope

This tranche adds a bounded bridge from one exact WebClip `publication-revoke-trash` manual-recovery receipt to the GET-only P1-164 live observer introduced in PR #299.

The bridge is deliberately split in two:

1. the installed extension can explicitly export one **private** receipt-derived JSON file through the existing user-owned Chrome Save As path;
2. the repository-side adapter binds that private file to an exact clean Git checkout and writes the final observer input outside the repository.

This tranche does **not** perform a Yandex mutation, does not run a live qualification, and does not claim that the exported receipt proves which Git SHA an already-running unpacked extension used.

## Runtime export boundary

The Journal manual-recovery card exposes `Экспортировать private observer input` only for `publication-revoke-trash` receipts.

The service worker handles the export through
`WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_EXPORT_OBSERVER_PREPARE` and:

- accepts the command only from WebClip `journal.html`;
- re-reads the exact receipt from `pendingDestructiveMoves`;
- requires it still to be manual-recovery state;
- requires exact `updatedAt` equality with the card the operator saw;
- rejects a receipt currently owned by an active destructive operation;
- requires the existing exact provider-identity envelope;
- requires preserved pre-manual remote phase when `phase=manual-resolution`;
- preserves the immutable receipt account/root/source/target/resource/public-link identity;
- snapshots the **current local configured root** separately so a root switch is observable rather than silently retargeted;
- performs no Yandex REST request;
- reads no access token or refresh token;
- serializes the private JSON only through the existing offscreen text-Blob + prepared Save As lifecycle.

The exported file declares:

- `containsSensitiveIdentity: true`
- `containsOAuthCredentials: false`

It intentionally contains raw account UID, paths, stable `resource_id`, and the original public URL because those values are required for exact physical reconciliation. It is therefore a **private operator artifact** and must not be committed or attached to public/project evidence.

## Repository-side adapter

`project_tools/yandex_p1_164_private_export_adapter.js` consumes exactly the private schema and refuses:

- execution under CI;
- input or output paths inside the repository;
- unexpected schema fields;
- any credential-shaped key such as access/refresh token, authorization, client secret, or PKCE verifier;
- a receipt outside the current `destructive:publication-revoke-trash:...` namespace;
- malformed or retargeted observer identity;
- a watch window outside 0–120 seconds;
- overwrite of an existing output file.

The adapter requires a clean tracked checkout and binds the final observer input to `git rev-parse HEAD`. The output is created exclusively and chmodded to mode `0600` where the platform permits it.

This binding means “the observer will run against this exact clean source checkout.” It does **not** by itself prove that the browser instance which originally created the receipt was loaded from the same source SHA. The live observer output therefore now carries the explicit limitation:

`does-not-prove-running-extension-source-sha`

Physical release evidence still needs the normal P1-231 exact tested-runtime/source-generation proof in addition to the receipt/observer evidence.

## Provider and browser safety comparison

External vendor documentation supports the chosen separation:

- Chrome Downloads API documents `saveAs:true` as a user file chooser and requires the existing `downloads` permission:
  https://developer.chrome.com/docs/extensions/reference/api/downloads
- Chrome's Manifest V3 migration guidance directs DOM/window-dependent background work to an offscreen document rather than the extension service worker:
  https://developer.chrome.com/docs/extensions/develop/migrate/checklist
- Yandex Disk REST API is OAuth-authenticated and remains the live provider boundary:
  https://yandex.com/dev/disk/rest/

These sources inform the transport boundary only. WebClip's durable receipt and no-replay protocol remain the project authority.

## Deterministic regression

`project_tools/test_p1_164_private_observer_export.js` covers:

- extension-page ownership and exact stale receipt re-read;
- composite receipt / manual lineage / provider-identity requirements;
- no provider call and no OAuth credential access during export;
- local-root snapshot without receipt retargeting;
- current destructive receipt namespace;
- Prepared Save As composition;
- exact adapter transfer of account/root/source/target/resource/public URL;
- credential-key rejection;
- private file path and exclusive-output constraints;
- clean Git HEAD binding;
- bounded visibility-watch override;
- explicit observer limitation that source SHA of the running extension is not inferred.

The existing `test_p1_164_live_observer.js` is extended to require the same runtime-source limitation.

As always, deterministic/source tests are not physical Yandex evidence.

## Release identity impact

This tranche changes package/runtime members `service-worker.js` and `journal.js`, so the package RPF advances to:

`sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`

The streaming recomputation was cross-checked by running the same exact P1-231 typed framing against canonical pre-tranche `main`, which reproduced the previous RPF
`sha256:bc84a3ae6508f61ff4c3bcb55e384f8484ad10338140f25e8e8f43c180e9239e`.

No release-contract projection/root or builder contract is changed, so the current contract identities remain:

- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The P1-231 S0-F/S0-G/S0-H source-spec fixtures are synchronized to the new RPF. Physical Chrome/Yandex QCF evidence is **not** advanced by this deterministic runtime change.

## Current boundary

P1-164 remains **ACTIVE**.

Still required before it can be treated as physically qualified:

- successful real revoke + Trash settlement;
- unknown response/settlement around both remote admissions;
- target visibility delay;
- auth expiry/re-auth observation;
- account and root switching;
- source replacement / public-URL conflict;
- occupied immutable target / target replacement;
- real manual-resolution operator flow using a private export + adapter + GET-only observer;
- independent evidence that the tested browser runtime is the exact release-candidate source/package generation.

Manifest remains `0.9.8`; release readiness remains **NOT READY**. This tranche creates no build, tag, deployment, GitHub Release, or version bump.
