# Audit delta — Yandex account cache generation

Date: 2026-08-27
Source-of-truth `main` immediately before write: `4b7c7cb894006bfff6ce60f224216d25aa8969ba`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P0-074 must be refined — account metadata cache commits are not auth-generation fenced

P0-074 already requires immutable operation-scoped Yandex auth/config identity. Fresh audit proves that the same generation fence is also required for **account metadata writes after network responses**: a stale `/v1/disk` response can contaminate the newer auth session's cached account UID and thereby weaken P0-073 account fencing in future operations.

### Fresh source proof

`testYandexConnection()` currently performs:

1. `const info = await yandexApi('')`;
2. `const account = extractDiskAccount(info)`;
3. only **after** that network request settles, `const authState = await readYandexAuthState()`;
4. obtains whatever `yandexAuth` is current at that later moment;
5. assigns `yandexAuth.account = account`;
6. writes that object with `writeYandexAuth(yandexAuth)`.

No auth-session generation/token identity captured before the GET is compared before the account metadata write.

`writeYandexAuth()` itself serializes storage operations but has no semantic compare-and-set generation: if the supplied object contains an access token, it writes that object to `chrome.storage.session`.

`getCurrentYandexAccountUid()` then prefers the cache:

- read current `yandexAuth`;
- derive `cachedUid = yandexAuth.account.uid`;
- if non-empty, return it immediately;
- only if cache is empty does it call `/v1/disk` again.

### Concrete A→B race

1. Active OAuth/session is account/token A.
2. `testYandexConnection()` starts and `yandexApi('')` sends `/v1/disk` using A.
3. Before the response/metadata commit finishes, the user disconnects/reauthorizes and current session becomes B.
4. The old request returns account metadata A.
5. `testYandexConnection()` now fresh-reads current auth B, assigns `account=A` into that B object and writes it.
6. Current storage is now logically inconsistent: access token B + cached account UID A.
7. A later destructive Journal operation for an entry whose `expectedAccountUid=A` calls `getCurrentYandexAccountUid()` and receives cached A without verifying `/v1/disk` under token B.
8. The P0-073 account comparison can therefore pass even though subsequent real Yandex API calls use account B.

Path/root/object fences may still stop many concrete mutations, but the account UID fence itself has been made unsound and cannot be treated as proof of current account identity.

### Classification / duplicate check

No new P-number is created.

This is a direct refinement of **P0-074** because the root cause is an async Yandex response committing into a different auth generation. P0-074's immutable `YandexOperationContext` / auth-session generation must cover metadata/cache writers as well as mutating API chains.

Related owners remain:

- **P0-073**: accountUid + rootPath fence for remote save/recovery/destructive identity. This finding explains one way its current cached UID input can become false.
- **P1-178**: OAuth/pending/config completion generation. OAuth completion must not overwrite newer auth/config; this checkpoint additionally covers the ordinary `testYandexConnection()` metadata refresh path even when no OAuth finish is the stale writer.
- **P1-191**: transactional manual-token replacement. Manual validation has its own replacement semantics.
- **P1-196**: token validity state. Validity does not prove account identity.

### Required P0-074 refinement

Every network-derived auth/account metadata write must be conditional on the exact auth generation that authorized the request.

Required invariants:

1. Before `/v1/disk`, capture immutable auth-session generation/fingerprint sufficient to distinguish A from B without persisting plaintext token into logs/checkpoints.
2. After response and before writing `account`, fresh-read current auth state and exact-compare generation.
3. If generation changed, discard the stale account result; never merge account A into auth B.
4. `writeYandexAuth`-style metadata updates should use generation-aware compare/update rather than caller-side read→mutate→blind write.
5. Cached `account.uid` may be used as fast proof only when it is explicitly bound to the same auth generation as the current access token/session.
6. Legacy cached account metadata lacking generation provenance must be treated as unverified and refreshed before it can satisfy P0-073 destructive account fencing.
7. Disconnect/reauth invalidates old account metadata immediately.
8. Account refresh failure must not corrupt/replace a newer valid session.
9. The same rule applies to account-info refresh after OAuth/manual-token/test-connection flows; no async response may write across generations.

### Required regressions

- Token A `testYandexConnection()` delayed → reauth B → A response: final auth remains B and account metadata is B/empty-unverified, never A.
- After that race, destructive entry expectedAccountUid=A must not pass account fence merely from stale cache while token B is current.
- Same auth generation A throughout: account cache update succeeds normally.
- Disconnect while account GET is in flight: late response cannot recreate auth/account state.
- A→B→A with distinct generation ids: old A response from generation 1 cannot be accepted merely because token/account value later resembles generation 3.
- Manual-token and OAuth account-info refresh paths obey the same generation-aware helper.
- Legacy account cache without generation is refreshed/fail-closed before destructive account proof.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.
