# Audit delta — Journal replace/clear vs verified published remote receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `13f7adf998ae90dadc06e2db35085ff9d1471834`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh proof strengthens the existing Journal-replacement recovery-evidence contract owned by **P0-076**, with **P1-184** remote object proof and **P0-069/P1-164** publication-management lifecycle.

Earlier audit already proves clear/import physically clears `pendingRemoteSaves` even when an external upload is in-flight/unknown. This pass isolates the stronger privacy case: the removed row can already be **`remote-verified` and published**, while the corresponding Journal append has not yet committed.

No new root cause is needed.

## Current full clear removes every remote checkpoint phase

Full Journal clear opens `pendingRemoteSaves` in the same bulk transaction and executes:

`pendingRemoteStore.clear()`.

Import-replace likewise clears the pending remote store as part of replacing Journal contents.

There is no phase distinction at this bulk invalidation boundary. Rows are removed whether they are:

- PREPARED/in-flight/unknown;
- stale-unverified;
- or `remote-verified` awaiting local Journal finalization/cleanup.

## `remote-verified` contains stronger physical truth than a speculative append

A remote-save row reaches `remote-verified` only after the workflow has obtained/checked remote metadata and persisted object fields such as:

- exact remote path;
- expected/observed byte evidence;
- `resourceId` when returned;
- `publicUrl` / observed publication state when present;
- account/root metadata in the current incomplete generation model.

Even though P1-184 still requires stronger exact content/attempt proof, this row is materially stronger than “upload may happen.” It is intended to survive the crash window between remote success and local Journal commit.

Deleting it during clear/import discards known external state, not merely cancellation intent.

## Deterministic verified-public orphan schedule

1. Save A uploads PDF to Yandex.
2. `createPublicLinks=true`; publication completes and remote metadata exposes public URL P / resource identity R.
3. WebClip durably marks A `remote-verified` with the remote object/publication receipt.
4. Before A's Journal entry is atomically appended and checkpoint cleaned, user confirms full Journal clear or import-replace.
5. Bulk transaction intentionally advances/replaces Journal generation and executes `pendingRemoteStore.clear()`.
6. A's Journal finalization correctly loses authority under P0-076 and must not repopulate the replacement Journal.
7. But the verified remote/public object already exists and may remain publicly accessible.
8. The only purpose-built durable receipt relating that object/public URL to A has now been deleted.

The result can be a real published WebClip object with no current Journal entry and no retained exact management/reconciliation receipt.

## Why this is a privacy-management issue

P0-069 already requires an explicit publication outcome before a managed Journal reference disappears during destructive deletion.

Bulk clear/import has a related but distinct lifecycle shape:

- the object may not yet have obtained a Journal entry at all;
- nevertheless WebClip has already created/published it and has a verified pending receipt;
- replacing Journal data should revoke append authority, but it should not silently forget the published object's management identity.

A user action to clear/replace Journal is not automatically an explicit acknowledgement that every already-started, not-yet-journaled public link should remain unmanaged forever.

## Required detached verified-receipt transition

When clear/import invalidates a `remote-verified` generation, transition the physical receipt to a bounded detached state instead of deleting it.

Conceptually include:

- exact remote-save generation;
- originating old Journal generation/id;
- account/root/auth/config operation context;
- exact remote object/content receipt;
- observed `publicUrl` / publication state;
- publication-policy generation/attempt receipt;
- reason for detachment (`journal-clear`, `import-replace`, scoped clear);
- timestamp and management/reconciliation status.

The detached receipt has **no authority to append into the new Journal generation**. It exists to preserve external truth and enable safe diagnostics/explicit management policy.

## Published vs private remote-verified objects

A verified private object still needs detached exact-object evidence for truthful reconciliation.

A verified published object additionally needs explicit privacy handling. Product policy may choose among bounded options such as:

- surface a detached-public-object warning/management list;
- require explicit keep-public acknowledgement before an operation that would erase the last management reference;
- offer a later exact unpublish/manage action under P0-069/P1-164;
- retain compact local evidence even if no automatic cleanup is attempted.

Do not automatically unpublish/delete remotely as part of Journal import/clear unless the product explicitly defines and confirms that destructive policy; bulk local data replacement and remote destruction are separate authorities.

## Scoped clear

Site/domain clear has the same rule for matching remote checkpoints.

If a matching remote generation is already verified/published, scoped clear may invalidate its old Journal append capability but must not erase the external/public identity solely because the site's local records were removed.

## Late physical completion

If clear/import occurs while phase is still PREPARED/unknown and the upload/publish settles later, the receipt transitions from detached-unknown to detached-verified/public once exact reconciliation succeeds.

The system must not require the old Journal entry to exist in order to learn the physical truth.

## Required regressions

1. Remote-verified private A -> full clear before Journal append -> no stale append; detached exact remote receipt survives.
2. Remote-verified published A/P -> full clear -> public/object receipt survives as detached management evidence; P is not silently forgotten.
3. Same sequence with import-replace containing an entry with the same textual id -> old A cannot attach to imported entry; detached receipt remains generation-exact.
4. Scoped site clear removes originating Journal authority but preserves matching verified public receipt separately.
5. PREPARED unknown -> clear -> later remote verify discovers public URL -> detached receipt can record it without repopulating Journal.
6. Published object -> explicit later unpublish management -> exact object/publication receipt is used; successful unpublish clears publication state but preserves object identity per P1-164 correction.
7. User explicitly chooses a future “forget detached object” action -> wording distinguishes forgetting local evidence from proving remote deletion/unpublish.
8. Detached receipt capacity is bounded; pressure does not turn a dropped receipt into a false claim that no public object exists.
9. OperationLog clear has no effect on detached physical/public receipt authority.
10. Normal remote save whose Journal append completes before clear cleans its active checkpoint normally; ordinary existing Journal deletion then follows P0-069 policy.
11. Clear before external side-effect admission prevents old generation from starting upload/publish after its local authority was revoked.
12. Clear after publish admission but before outcome proof retains exact publication-attempt reconciliation state.

## Duplicate check

- **P0-076** primary: clear/import revokes old Journal finalization authority.
- **P1-184** owns exact remote physical object/content receipt.
- **P0-069/P1-164** own publication management/unpublish lifecycle before losing the last useful management reference.
- **P0-078** owns whether a new publish side effect was authorized; it does not authorize forgetting an already observed public state.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
