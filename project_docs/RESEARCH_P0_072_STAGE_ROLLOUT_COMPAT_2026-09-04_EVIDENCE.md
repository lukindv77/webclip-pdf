# P0-072 — stage-admission rollout compatibility for preexisting rows — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ c5169d1e66d2e6590b69171274e02d6ceb404398`  
Deterministic model commit: `cd46056dc43ec9bd42d15d9af4c5eb029c23cda4`  
Owner: **P0-072 ACTIVE**.

This checkpoint defines how the new explicit external-stage admission model must interpret recovery rows that already exist before the implementation ships. Runtime is unchanged.

## 1. Missing admission metadata is not `prepared`

The new target model adds explicit stage state so reset and side-effect admission serialize.

Preexisting rows do not have that field.

It is unsafe to initialize every missing field as:

```text
prepared
```

because the old runtime may already have crossed the external API boundary even though no durable admission marker exists.

The compatibility rule is:

```text
missing explicit stage state -> admission-unknown unless current durable facts prove a stronger state
```

Only rows created by the new writer protocol may use explicit `prepared` as proof that the corresponding external stage has not been admitted yet.

## 2. Existing local intent is ambiguous

Current old-format sequence is:

1. durable `kind:'intent'` written;
2. later `chrome.downloads.download()` called;
3. Promise may remain unresolved for a caller-visible interval;
4. numeric id is bound later.

Therefore an old-format `kind:'intent'` found after upgrade can mean either:

- Chrome start not yet called;
- Chrome start already called but numeric settlement not yet durably bound.

Compatibility classification:

```text
legacy intent + no explicit download-start stage -> admission-unknown / reconciling
```

Reset must not call this `cancelled-before-start`.

## 3. Existing numeric local row proves start admission

A valid numeric `downloadId` row exists only after a successful bind from the Chrome start result.

Therefore, under the existing P0-048 identity rules:

```text
legacy numeric download -> download-start admitted
```

Its later `complete/interrupted/unknown` facts remain separately tracked.

This does not mean the Journal is authorized after reset; it only classifies the physical start stage.

## 4. Existing local unknown remains unknown

P0-039 preserved `kind:'unknown'/manual-resolution` specifically because physical outcome could not be proved.

Upgrade must not reinterpret those rows as prepared/cancelled.

They remain admission/outcome uncertainty until an exact later DownloadItem or explicit reconciliation proves more.

## 5. Existing remote `prepared` is also ambiguous

Current remote checkpoint is written before signed upload transfer, but no durable `upload admitted` marker exists.

After checkpoint creation the old worker may already have:

- started the signed transfer;
- timed out while it continues;
- completed upload but not yet written later phase;
- remained before transfer.

Therefore:

```text
legacy remote phase=prepared + no explicit upload stage -> upload admission-unknown
```

Do not convert it to `cancelled-before-start` merely because the new schema knows about a prepared state.

## 6. Existing remote publication is separately ambiguous

For an old remote row with `createPublicLinks=true` and no explicit publish-stage marker:

- a durable `publicUrl`/observed metadata can prove publication fact already exists under current semantics;
- absence of `publicUrl` does not prove publish was never admitted;
- caller timeout/crash can occur around the publish mutation.

Therefore missing publish admission state defaults to unknown unless factual publication evidence already exists.

P0-078 remains the owner for publication policy/revocation generation.

## 7. Stronger existing durable facts may upgrade classification

Compatibility classification may use already durable factual state, but never invent certainty.

Examples:

### Local

- numeric DownloadItem id -> start admitted;
- `unknown/manual-resolution` -> remains unknown.

### Remote

- `remote-verified` -> remote file existence is a terminal/verified fact under current remote-save semantics;
- persisted/observed public URL -> publication observed fact;
- `stale-unverified` -> uncertainty/manual, not pre-start cancellation.

These facts still do not close P0-073/P0-074/P1-090 identity semantics.

## 8. New rows are different

Once the new stage protocol is active, writers create explicit stage metadata before effect admission.

For those rows:

```text
explicit prepared + reset wins transaction order -> cancelled-before-start
explicit admitted + reset wins later -> retain admitted/reconciling
```

That stronger inference is valid only because the admission helper and reset transaction share durable ordering.

This creates a clean migration boundary without rewriting historical uncertainty.

## 9. Do not perform a destructive bulk backfill

No startup migration should blindly rewrite all old rows to a fabricated stage state.

Preferred implementation:

- normalization/classification understands both old and new shapes;
- old shape remains stored until an exact factual transition naturally updates it;
- when an old row is rewritten for another legitimate reason, preserve a compatibility state such as `admission-unknown` if exact stage truth is still unknown;
- never backfill `prepared` from absence.

This avoids upgrade-time false cancellation.

## 10. Reset disposition initial outcome for old rows

When reset encounters a preexisting row without stage metadata:

- local intent -> detached pending/unknown-capable reconciling;
- numeric local -> detached admitted/reconciling until exact DownloadItem terminal state;
- local unknown -> detached unknown/manual;
- remote prepared -> detached admission-unknown/reconciling or manual according to existing age/failure facts;
- remote stale-unverified -> detached unknown/manual;
- remote-verified -> detached terminal remote-verified.

The reset itself does not manufacture a more precise historical stage.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_stage_rollout_compat_model.js`

Local Node result before durable write:

```text
P0-072 stage rollout compatibility model: PASS
```

Covered controls:

1. legacy local intent is admission-unknown, not prepared;
2. legacy numeric local row is classified as already admitted;
3. legacy local unknown remains unknown;
4. legacy remote prepared is not cancelled-before-start;
5. remote-verified/publicUrl preserve only already-known facts;
6. a new explicit prepared stage supports reset-before-admission cancellation.

The model is architecture evidence, not runtime PASS.

## 12. Regression requirements

When stage admission is implemented, tests need both old-shape and new-shape fixtures.

Required negative controls:

- old intent without stage field cannot be labelled `cancelled-before-start` by reset;
- old remote prepared without stage field cannot be labelled upload-not-started;
- old unknown rows never regain active replay authority just because a new field is absent;
- explicit new prepared row does cancel when reset transaction wins;
- explicit new admitted row remains factual/reconciling when reset wins later.

This rollout coverage is required before runtime closure, otherwise the new protocol would only be correct for fresh installations.

## 13. Owner boundaries

This compatibility rule is part of P0-072's reset truthfulness.

It does not close:

- P1-146 automatic-download actual-settlement recovery;
- P0-078 publication generation/revocation;
- P0-073/P0-074 remote operation context;
- P1-090 exact remote-object continuity;
- P1-210 user-facing reconciliation.

No new P-code is allocated.

## 14. Status

P0-072 remains **ACTIVE**. Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
