# P0-078 — crash-safe publication start boundary refinement — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent research branch: `research/p0-078-public-link-policy-generation-2026-09-06`  
Owner: **P0-078 ACTIVE**. Adjacent owners: P0-074, P1-184, P1-198, P1-210.

This note refines the previously proposed `publicationPhase=admitted` boundary. Production runtime is unchanged.

## 1. Correction: durable admission is not proof that remote PUT physically started

A local checkpoint cannot be made atomically durable with the external Yandex `PUT /resources/publish` request.

The naive sequence is:

```text
1. policy G1=true is checked
2. checkpoint -> publicationPhase=admitted commits locally
3. worker invokes PUT /resources/publish
```

There is an unavoidable crash schedule:

```text
step 2 commits
worker dies
step 3 never happens
```

Therefore `admitted` cannot truthfully mean "the remote publish request definitely started".

The durable state can prove only:

```text
exact publication authority was reserved
+
a remote request may have started after this point
```

This is an **unknown-start intent boundary**.

## 2. Why this matters after policy revocation

Schedule:

```text
G1=true
U writes durable publication intent
worker dies before network invocation
user commits G2=false
recovery sees old U
```

If recovery interprets the durable intent as proof that publication already started, it might continue with a fresh PUT under G1 after G2 disabled publication. That would violate P0-078.

Conversely, if the worker died just after invoking PUT but before recording any later evidence, G2=false is not proof that the remote publication did not occur.

Therefore the only safe restart behavior is:

```text
intent/unknown-start
-> pure remote reconciliation first
-> never infer cancelled from current false
-> never issue a new publish PUT under a revoked generation
```

## 3. Refined state semantics

Recommended semantics:

```text
publicationPhase =
  skipped-disabled
  eligible
  publish-intent
  reconciling-unknown
  verified-public
  revoked-before-intent
  manual-publication-authority-unverifiable
```

`publish-intent` means:

- exact policy generation was checked while enabled;
- durable intent was committed before external mutation;
- the request may or may not have physically started;
- restart/timeout recovery must treat remote settlement as unknown.

It does **not** prove that a request reached Yandex.

`reconciling-unknown` is optional as a durable/display state; it must not itself authorize another PUT.

## 4. First-attempt execution contract

For a fresh operation:

```text
eligible @ G
-> shared policy admission ordering section
-> prove current policy == G && enabled
-> durably write publish-intent
-> immediately invoke context-bound PUT /resources/publish
-> release local admission ordering as soon as physical invocation has been initiated
-> poll/read metadata
```

P0-074 is required so the network invocation after the policy check cannot silently switch account/token/root.

The local ordering section must not be held while waiting for the remote response.

## 5. Restart / timeout contract

Any restart, abort, timeout, lost response or thrown error after `publish-intent` means:

```text
remote settlement = unknown
```

Recovery must first use **read-only** metadata reconciliation.

Required cases:

### Metadata proves public URL

```text
public_url present
-> verified-public
-> preserve URL truthfully even if current policy is false
```

### Metadata does not yet prove public URL

This is not automatically proof that the earlier PUT never ran or failed permanently. Use bounded provider-consistency/poll semantics owned jointly with remote-settlement owners.

While current policy generation is no longer the exact enabled G:

```text
zero new PUT /resources/publish
```

### Exact generation G is still current and enabled

After bounded reconciliation establishes that there is no completed publication to adopt, a retry may be considered. The retry must be treated as a new physical remote mutation attempt under the existing operation/recovery ownership model; P0-078 does not invent a competing P1-198 operation identity.

A retry cannot be justified merely because `public_url` was absent in one immediate GET.

## 6. Current source-specific problem

Current `ensureYandexPublicUrl()` does:

```text
GET public_url
if absent:
  PUT /resources/publish
poll GET public_url
```

Every call can therefore issue a new publish PUT.

Current `recoverPendingRemoteSaves()` can call `ensureYandexPublicUrl()` again from an old checkpoint. Thus a prior unknown publish is not distinguishable from a fresh not-yet-started publication request.

Future implementation must split these responsibilities, conceptually:

```text
readYandexPublicUrl(context, path)          // read-only
startYandexPublication(context, path)       // mutation; only from exact policy admission
reconcileYandexPublication(context, path)   // read-only bounded reconciliation
```

A helper that always combines GET + PUT + poll is unsafe for restart recovery because recovery sometimes has reconciliation authority but no current mutation authority.

## 7. Disable barrier semantics

When `true -> false` commits:

- older `eligible` rows become `revoked-before-intent` and cannot publish;
- older `publish-intent`/unknown rows are **not** declared cancelled;
- those unknown rows keep read-only reconciliation authority;
- they lose authority for any *new* publish PUT unless an exact still-current generation rule explicitly permits a retry (which cannot be true once generation advanced to false);
- already `verified-public` rows remain factual evidence and are not silently mass-unpublished.

ABA remains strict:

```text
G1=true -> G2=false -> G3=true
```

G3 does not grant a new PUT to G1 unknown rows.

## 8. User-settings import parity

The same rule applies when a settings import commits the `true -> false` transition.

The import path cannot be treated as a weaker writer. Once its bundled settings write is authoritatively committed, old pre-intent G1 operations are revoked and unknown-start G1 operations become reconciliation-only.

P1-008 owns the import generation/marker itself; P0-078 owns the publication-policy transition resulting from the committed setting.

## 9. Source-bound implementation requirements

A future runtime closure should make it mechanically visible that:

1. the generic `ensureYandexPublicUrl()` pattern is no longer used from unknown recovery as an unconditional mutating helper;
2. read-only reconciliation is a separate function/path;
3. a publish mutation call is reachable only after exact policy-generation admission for a fresh/retry attempt;
4. unknown-start recovery under changed policy contains no `/resources/publish` call;
5. `verified-public` metadata remains accepted under current disabled policy;
6. absence of `public_url` in one GET is not equivalent to `publish did not happen`.

## 10. Ownership boundaries

**P0-078 owns:** privacy-policy generation, revocation-before-new-mutation, and no resurrection after disable/ABA.

**P0-074 owns:** immutable auth/account/root/config context across each GET/PUT/poll chain.

**P1-184/P1-090 own:** exact remote object/content identity and same-object adoption where required.

**P1-198 owns:** physical live operation identity/generation; P0-078 must not create a duplicate global operation-id authority.

**P1-210 owns:** page/transport unknown-result presentation and retry UX.

## 11. Status

P0-078 remains **ACTIVE**. This refinement corrects the meaning of local publication admission but changes no production runtime.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
