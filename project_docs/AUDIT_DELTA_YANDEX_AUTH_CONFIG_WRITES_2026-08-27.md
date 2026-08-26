# Yandex auth / config write audit delta — 2026-08-27

Baseline source HEAD: `28afad016a977dbee73bf6d7839b34f7fac09c6d`.

This is a lossless audit checkpoint, not a canonical-registry replacement. No production/runtime/config/manifest change is made by this checkpoint. No P1-197 is assigned in this block because the confirmed races belong to existing P1-178/P1-191/P0-074 contracts.

## Whole-object auth write inventory — P1-178 must cover every writer

`writeYandexAuth()` serializes the physical `chrome.storage.session.set/remove` operation and performs legacy persistent-secret cleanup, but it has no expected-generation/CAS argument. Serialization prevents physical write overtaking; it does **not** make a logically stale whole-object write valid.

Fresh inventory of current writers proves several stale-completion classes.

### `finishYandexOAuth()` ancillary account write can overwrite a newer auth

After token exchange, `finishYandexOAuth()` writes the new `yandexAuth`, removes pending PKCE, then performs a separate `yandexApi('')` account-info request. When it returns, the function mutates the original local `yandexAuth.account` and calls `writeYandexAuth(yandexAuth)` again.

If a newer manual auth / OAuth attempt / disconnect commits while this account request is in flight, the late second whole-object write can republish the older auth. The comment that profile-read failure must not destroy authorization is correct but insufficient: profile-read **success** must also not restore an obsolete authorization generation.

Required P1-178 regression: OAuth A token commits -> account-info A remains in flight -> auth B commits -> late A account response must not overwrite B or attach data to B without exact identity proof.

### `setManualYandexToken()` late validation failure can clear a newer auth

The current manual-token path publishes the manual candidate first, then validates it with `yandexApi('')`. Its catch unconditionally executes `writeYandexAuth(null)`.

Beyond the already recorded P1-191 bug (invalid candidate destroys the previously working auth), this has a cross-generation variant:

1. manual candidate A is written and validation starts;
2. another flow commits valid auth B;
3. A's validation later fails;
4. A's stale catch executes `writeYandexAuth(null)` and logs B out.

Likewise, if A validation succeeds after B was committed, the second `writeYandexAuth(yandexAuthA)` can restore A.

Required contract is the composition of **P1-191 candidate->validate->commit** and **P1-178 generation fencing**. A candidate that has not been committed as the exact current generation has no authority to clear or overwrite another generation on either success or failure.

Required regressions:

- working/current B + late failure from obsolete manual A => B remains current;
- working/current B + late success from obsolete manual A => B remains current unless the user initiated a newer explicit replacement that owns the current generation;
- candidate validation must not use the globally published auth slot as a transport mechanism.

### `testYandexConnection()` can attach account A to current auth B

`testYandexConnection()` first executes `const info = await yandexApi('')`, then extracts `account`, and **after the network response** calls `readYandexAuthState()` again. If a reauthorization happens between those phases, the account metadata returned using auth A can be attached to newly current auth B and written as a whole object.

This path is safer than the stale-token resurrection in `getCurrentYandexAccountUid()` because it re-reads the current auth before writing, but it still has no proof that the account response was produced by that same auth generation.

Required P1-178/P0-074 rule: external identity response and the auth object it enriches must share one immutable auth-generation receipt. If generation changed, discard the ancillary result and re-read/re-test under the new generation if needed; never transplant account metadata across sessions.

### `getCurrentYandexAccountUid()` stale snapshot can restore A with B metadata

This stronger case was already checkpointed in `AUDIT_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`: the function snapshots A before network, `yandexApi()` may run with B, then `{...A, accountFromB}` can be written back. It remains a mandatory P1-178/P0-074 regression and demonstrates why mere physical write serialization is not a logical authority check.

### Explicit Disconnect must be an auth-generation tombstone

`WEBCLIP_YANDEX_DISCONNECT` calls `writeYandexAuth(null)` and removes pending PKCE. Without a generation/tombstone fence, any already-running OAuth completion, manual validation, account-cache write, or account test can later call `writeYandexAuth(...)` and silently reconnect the user after an explicit disconnect.

Required behavior: Disconnect increments/commits the auth generation (or equivalent immutable tombstone). Every older async completion fails its expected-generation check. An already issued signed transfer may still physically settle and must be reconciled under its operation context; that is not permission to republish the old auth session.

## P1-196 invalid-token demotion must also use exact-generation mutation

P1-196 requires authoritative current-token 401 to demote/invalidate auth. This write inventory shows why the fix cannot call a generic unconditional `writeYandexAuth(null)`: a stale request A can receive 401 after reauth B. Demotion must carry the exact auth generation/token identity used by the failed request and only modify state when it still matches current auth.

A useful centralized model is one logical auth mutation API with an explicit expected generation/attempt identity for `commit`, `enrich account`, `demote invalid`, and `disconnect`. The exact implementation can differ, but every whole-object writer must obey the same authority rule.

## Config/root write inventory — P0-074 generation must cover post-commit verification too

`saveYandexRoot(rootPath)` demonstrates a separate stale-operation problem:

1. it reads the current auth snapshot;
2. `updateYandexConfig()` serially commits requested root B;
3. if the earlier auth snapshot had an access token, it calls `ensureYandexServiceFolders(...)`;
4. that helper calls `getYandexConfig()` again and therefore uses whichever root is current at that later time;
5. if another root change C committed between steps 2 and 3/4, the older B operation can actually verify/create service folders under C;
6. it nevertheless returns `rootPath: B` and `structureVerified: true` to its caller.

Thus storage mutation serialization again does not make the multi-step operation generation-consistent. The UI can be told B was verified while the remote side effect happened under C.

Required P0-074 refinement:

- root/config mutation creates an immutable config generation/receipt;
- any post-save remote verification/creation must use the exact committed root/generation or fail stale before side effect;
- a stale older save must not return `structureVerified:true` for a different newer root;
- scheduler reinitialization must apply to the current generation and must not let a late older operation publish status for B after C is current.

Required regression: save root B -> before remote ensure, save root C -> late B continuation performs no mutation attributed to B under C and cannot render B as verified/current.

## Read-only status classification note

`WEBCLIP_YANDEX_STATUS` is wrapped by Options as a read-only RPC, but `getYandexStatus()` may remove an expired/invalid `yandexOAuthPending`. The already recorded P1-178 compare-and-remove race is therefore another proof that the read-only label describes UI intent, not actual side-effect semantics. P1-138's read-only inventory must classify this cleanup as a mutation and either make it atomic/generation-safe or move cleanup to an explicit repair path.

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun. The previously proven product gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS; real unpacked Chrome and real Yandex auth/root-change concurrency E2E remain release QA blockers.
