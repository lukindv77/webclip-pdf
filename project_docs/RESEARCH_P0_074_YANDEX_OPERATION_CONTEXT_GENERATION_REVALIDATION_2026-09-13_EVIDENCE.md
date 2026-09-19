# P0-074 — Yandex operation-context generation revalidation — 2026-09-13

## Classification

- Owner: `P0-074`.
- Current registry state at research start: `ACTIVE`.
- Result: `ACTIVE / ROOT-CAUSE-REVALIDATED`.
- Research level: current-source review + deterministic model + current official external documentation.
- Not claimed: real authorized Yandex L5/E2E closure.
- Runtime / manifest / workflow changes: none.
- Release effect: none; `project_docs/RELEASE_READINESS.md` remains `NOT READY`.

## Canonical baseline

Research was performed against canonical `main`:

`4f324ddf75deef0e964491e1eb3f6f942017c736`

At the start of this tranche:

- open pull requests: 0;
- open issues: 0;
- post-merge Repository Integrity for the preceding P0-076 research merge had completed successfully on the exact baseline SHA.

The registry definition under test is:

> long-running remote/destructive operations require immutable auth/account/root/config/publication context and generation; later stages cannot silently switch to new global context.

## Executive finding

The P0-074 root cause remains present in current source.

WebClip performs useful point-in-time account/root checks, and some upload/checkpoint records persist `accountUid` / `rootPath`. Those controls do not form an immutable remote-operation context across a multi-request operation.

Current lower-level Yandex requests still resolve global mutable auth at request time, while service-folder preparation can re-read global mutable configuration. Therefore a logical operation that was admitted or preflighted under context A can execute a later folder/move/verify/publish request after the user reconnects or changes root/policy, using context B.

The dangerous case does not require a different textual root. Account A and account B can both have `/WebClip`; the same path string is interpreted in different remote namespaces because authorization is account-scoped.

This is a current reproduction of historical P0-074 research, not a new owner family.

## Current-source proof

### 1. `getYandexConfig()` is a current-global read

`getYandexConfig()` reads the extension's current Yandex configuration from storage and normalizes, among other values:

- current root path;
- current public-link preference.

It is not an operation snapshot supplied by the caller.

### 2. `ensureYandexServiceFolders()` re-reads config inside the operation

Current `ensureYandexServiceFolders(...)` begins by calling `getYandexConfig()` itself. It then validates/creates service folders using that freshly read root.

Consequently, a higher-level operation can capture one config/root and later enter this helper after global settings have changed.

### 3. `yandexApi()` resolves authorization per request

Current `yandexApi(...)` obtains a valid Yandex access token for the individual request and sends it as:

`Authorization: OAuth <token>`

The long-running caller does not provide an immutable auth/account generation to this helper.

Therefore two HTTP requests in one logical operation can use different global-current auth state.

### 4. account/root preflight is point-in-time, not a continuation fence

`findYandexFileForJournalEntry(...)` currently does important initial checks:

- compares stored `rootPath` with currently configured root;
- if `entry.accountUid` is present, calls `getCurrentYandexAccountUid(...)` and fails on account mismatch;
- locates the candidate object.

That prevents many wrong-account operations at preflight.

However, after this function returns, later code performs additional awaits and Yandex calls. No immutable operation generation is carried through those later requests. A reconnect or config change after preflight remains a TOCTOU gap.

### 5. ReadLater -> Upload remains multi-context-capable

Current `moveReadLaterEntryToRead(...)` has the following relevant structure:

1. read Journal entry;
2. `findYandexFileForJournalEntry(...)` locates/checks the current source;
3. `getYandexConfig()` reads current root;
4. `ensureYandexServiceFolders(...)` independently reads current config again;
5. target folders/collision path are prepared through later Yandex calls;
6. `POST /resources/move` is sent through `yandexApi(...)`;
7. the result is verified through later Yandex calls.

A switch A -> B between stages can therefore cause later remote requests to resolve B even though the operation's source/provenance was established under A.

### 6. Delete -> Trash has the same TOCTOU

Current `moveJournalYandexFileToTrash(...)` similarly:

1. reads current config;
2. locates/verifies the Journal entry's current remote object;
3. prepares Trash hierarchy / target naming;
4. sends `POST /resources/move` through request-time `yandexApi(...)`;
5. verifies later.

The move request and verify are not cryptographically or transactionally bound to the same auth/config generation that passed preflight.

### 7. upload / publish / verification paths have the same primitive

Current upload flow captures some operation metadata (`accountUid`, root/path/public-link policy) but calls helpers that can independently resolve current config or current auth on subsequent awaits.

That means persisted metadata about A is not proof that every later HTTP request was actually executed under A.

The same primitive affects post-admission verification and publication: a later request issued under B cannot prove settlement of an effect admitted under A.

## Exact deterministic schedules

### Schedule A — ReadLater move account switch

1. Journal entry E belongs to account A, root `/WebClip`, exact source S.
2. Mark Read starts.
3. `findYandexFileForJournalEntry(E)` proves A and locates S.
4. User reconnects extension to account B; B also uses textual root `/WebClip`.
5. later service-folder and move calls resolve B's current token.
6. the same textual `from:S` / `path:T` is now evaluated in B's remote namespace.

Result: the logical operation spans two account contexts.

### Schedule B — Delete -> Trash account switch

1. Delete preflight locates exact source under A.
2. User reconnects to B before Trash preparation or move.
3. current helper calls create/check B's Trash hierarchy.
4. `POST /resources/move` resolves B token.

Result: WebClip can act on B after proving authority/identity in A.

### Schedule C — admitted A move, B verification

1. operation context A admits a move request.
2. remote outcome is delayed/unknown.
3. user reconnects to B.
4. verification call uses B token and observes B namespace.

Result: B observations cannot settle A's admitted effect, regardless of path equality.

### Schedule D — same-account root/config switch

1. operation starts in account A, root R1, config generation G1.
2. user changes root to R2 / generation G2.
3. nested folder helper re-reads global config.
4. later target preparation or verification uses R2 while earlier source/provenance came from R1.

Result: account equality alone does not preserve operation context.

### Schedule E — same-account reauthentication

1. operation starts under account A/auth generation A1.
2. credentials are replaced/refreshed in a way that establishes a new auth generation A2.
3. later request reads global A2.

Result: account UID equality is insufficient if generation compatibility was never explicitly established.

The model also contains a positive control for a deliberately compatible credential rotation: a token string may change without superseding the operation only if the implementation has explicit generation-equivalence semantics. Merely reading the latest token is not such proof.

### Schedule F — publication policy switch

1. upload operation begins while public links are enabled, publication generation P1.
2. user disables public links, publication generation becomes P2.
3. stale operation later reaches publish stage under its old intent.

Result: stale publication authorization must not override newer privacy policy merely because the operation started earlier.

P0-078 owns the stronger publication-generation/revocation truth. P0-074 supplies the general immutable operation-context prerequisite.

## Historical duplicate reconciliation

`project_docs/RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` already preserves multiple retired deltas that assign this root to P0-074, including:

- `RESEARCH_DELTA_READLATER_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`;
- `RESEARCH_DELTA_TRASH_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_DESTRUCTIVE_MOVE_AUTH_GENERATION_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_MIXED_ROOT_PUBLICATION_CONTEXT_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_GLOBAL_LOCATE_PAGINATION_COHERENCE_2026-08-28.md`;
- adjacent replace/recovery/publication deltas.

The historical ReadLater schedule explicitly describes:

- source proved in account A;
- auth changed to account B after preflight;
- later config/token reads observe B;
- target preparation/move can happen in B.

The historical Trash schedule likewise records point-in-time account validation followed by request-time auth reuse as a TOCTOU generation gap.

Fresh current-source review reproduces that mechanism. Therefore:

- no new P-code is assigned;
- status remains P0-074 `ACTIVE`;
- classification is `ROOT-CAUSE-REVALIDATED`, not novelty.

## Current external evidence

Fresh official Yandex documentation was reviewed on 2026-09-13.

Yandex OAuth documentation states that an OAuth token carries/identifies the account to which access is allowed, the application, and the permission set. Yandex also documents that a token is used to access services on behalf of a specific user.

Yandex Disk REST documentation describes the API as user access to personal Yandex Disk files through HTTP requests.

Sources:

- https://yandex.com/dev/id/doc/en/concepts/ya-oauth-intro
- https://www.yandex.com/dev/id/doc/en/access
- https://yandex.com/dev/disk/rest/?lang=en

This external evidence does **not** by itself prove the WebClip race. It establishes the account-scoped meaning of request authorization. The race conclusion is an inference from that documented semantics combined with current WebClip source, where later requests can resolve a different current token.

## Deterministic model

Added research model:

`project_tools/test_p0_074_yandex_operation_context_generation_model.js`

Environment:

- Node.js `v22.16.0`.

Commands:

```text
node --check project_tools/test_p0_074_yandex_operation_context_generation_model.js
node project_tools/test_p0_074_yandex_operation_context_generation_model.js
```

Result:

`PASS 63 checks`

SHA-256 of the model prepared for this research tranche:

`d03011a562072aa59ca00d72c609392e52e39544aef315c2e2d9513f5b02f05b`

### Model coverage

The model covers:

1. current-style preflight under A followed by request-time B auth;
2. same textual root across different accounts;
3. ReadLater -> Upload A/B split;
4. Delete -> Trash A/B split;
5. upload checkpoint A vs later B request;
6. admitted A mutation vs B verification;
7. same-account root/config generation switch;
8. same-account reauth generation switch;
9. stale publication-policy authorization;
10. immutable-context positive control across a global A -> B switch;
11. fail-closed continuation after supersession;
12. durable receipt binding to account/root/auth/config/publication generation;
13. operation-id reuse not granting new-context authority;
14. source/target path differences while preserving one context;
15. unchanged-context positive control;
16. explicitly compatible token refresh positive control.

This is a bounded deterministic model, not a claim that a real Yandex service produced the modeled account-switch mutation.

## Research invariant

The strongest compact invariant supported by the evidence is:

> Every long-running Yandex mutation or reconciliation operation must bind once, before remote admission, to an immutable remote-operation context containing the auth/account identity and the relevant root/config/publication generation. Every subsequent remote request and local settlement must prove that it belongs to that same context. A reconnect or settings change may supersede the operation, but it may not silently retarget it to the new global context.

## Candidate implementation direction — not accepted architecture

A plausible direction for future implementation/closure is:

- capture a bounded immutable `YandexOperationContext` at operation admission;
- include account UID and explicit auth generation/credential-equivalence identity;
- include root/config generation and publication generation where relevant;
- pass that context into lower-level folder/request/verify/publish helpers instead of re-reading mutable global settings for admitted operations;
- gate every continuation before a new remote mutation;
- preserve P0-072's durable admitted-effect receipt if the operation becomes superseded/unknown;
- require P0-076 CAS before any late local settlement mutates a Journal record;
- require P1-090/P1-184 exact object/content identity where object identity is the question;
- fail closed or quarantine/manual-resolve when context continuity cannot be proved.

This document does not select a runtime architecture and does not implement those changes.

## Owner boundaries

- `P0-074`: immutable auth/account/root/config/publication operation context and generation continuity.
- `P0-073`: durable account/root identity/provenance authority, including legacy/import boundaries.
- `P0-078`: publication generation/revocation truth and privacy-sensitive stale-publication prevention.
- `P0-072`: admitted external side-effect receipts survive Journal clear/replace/reset.
- `P0-076`: stale single-entry operation cannot mutate/delete a replacement Journal record.
- `P1-090`: destructive move must prove the same exact remote object after unknown settlement.
- `P1-184`: exact remote object/content creation receipt for upload/object creation.

These owners compose; none substitutes for P0-074.

## Closure evidence still required

P0-074 must remain `ACTIVE` until implementation and evidence prove, at minimum:

1. exact-source regressions for all long-running Yandex mutation/reconciliation paths;
2. immutable context propagated through every relevant request helper rather than only stored in metadata;
3. account A -> B switch before folder preparation causes fail-closed before B mutation;
4. A -> B switch after admission preserves A receipt and never uses B observation as A settlement proof;
5. same-account R1 -> R2/config-generation switch is rejected or explicitly superseded;
6. same-account credential rotation has explicit compatibility/generation semantics rather than implicit current-global reuse;
7. publication policy generation changes cannot be overridden by stale operations;
8. restart/recovery retains the operation's original context authority;
9. P0-072/P0-076/P1-090/P1-184 composition tests cover reset/replacement/unknown settlement;
10. authorized isolated real-Yandex E2E with at least two test accounts or otherwise proven account-generation switching behavior;
11. exact-head Repository Integrity and post-merge integrity on the eventual implementation PR.

No credentials were available or used in this research tranche, so no real-Yandex L5 closure is claimed.

## Release interpretation

Research coverage remains complete in the project-wide sense, but critical closure remains incomplete.

Current release readiness remains explicitly `NOT READY`; target `0.9.9` is still WIP and manifest remains `0.9.8` at the reviewed baseline.

This research tranche does not authorize or perform build, tag, deploy, publication, or release.


## Implementation progress — 2026-09-19

Canonical starting point for this bounded implementation tranche:

`54275d23bfe09cd8c2ea7a29af4650bafdfa1ddd`

This tranche implements immutable live-operation context for the P0-073 restart/maintenance remote-save recovery path without claiming repository-wide P0-074 closure:

- recovery captures one auth/config snapshot before processing the bounded queue;
- the memory-only context contains the exact access token, account UID, normalized root path, publication-policy value, and capture timestamp;
- the context object is frozen and is never written to a durable checkpoint, operation log, or evidence artifact;
- the checkpoint account/root binding must match the captured context before the target-object read;
- the target metadata read receives the captured context, so a later global reconnect cannot silently select another account's token;
- publication requires a second capability proof against the same captured context and fails closed when publication was disabled in that snapshot;
- every read, publish, and poll request inside the covered publication helper receives the same context;
- uncovered Yandex callers retain the current compatibility fallback and therefore remain outside this tranche's closure claim.

Deterministic production regression:

`project_tools/test_p0_074_yandex_recovery_operation_context.js`

Local candidate result:

`P0-074 Yandex recovery operation context: PASS 45 checks`

The regression executes the source-extracted production authority and covers immutable capture, account/root mismatch, global A -> B token/account/root mutation after capture, missing/oversized fields, publication-policy denial, one-snapshot capture, request-helper propagation, source ordering, and the absence of mutable global token/account rereads from the covered recovery path.

### Remaining boundary

P0-074 remains `ACTIVE / IMPLEMENTATION-IN-PROGRESS`. This bounded tranche does not yet provide:

- explicit auth/config/publication generation counters or compatible credential-rotation semantics;
- immutable context propagation through upload, ReadLater, Trash, backup, and every other long-running Yandex path;
- durable restart authority capable of reconstructing a secret-free equivalent context across browser sessions;
- authorized isolated two-account real-Yandex E2E.

No Yandex credentials were added or used. The manifest remains `0.9.8`; release readiness remains `NOT READY`. No build, tag, GitHub Release, or release decision is implied.

P1-231 exact-generation evidence must be synchronized to the final runtime-byte candidate before merge.


### Exact-generation CI receipt — 2026-09-19

The first fully green candidate containing the bounded P0-074 recovery context and synchronized P1-231 direct goldens was:

- exact head: `9010a216da468afef466d96703a99eb1e46e5bdc`;
- Repository Integrity: run `35414754702`, conclusion `success`;
- deterministic P0-074 production authority regression: `PASS 48 checks`;
- exact runtime/package fingerprint: `sha256:7a43fec77555a966bfe6a4ace57f785a541ae0e899decb3b43d99585874db734`;
- package topology: unchanged at 34 current root package files;
- manifest: unchanged at `0.9.8`.

This is deterministic implementation-progress evidence, not authorized two-account Yandex closure. P0-074 remains `ACTIVE`; release readiness remains `NOT READY`.
