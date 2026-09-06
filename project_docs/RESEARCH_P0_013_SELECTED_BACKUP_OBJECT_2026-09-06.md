# P0-013 — exact selected Yandex backup object authority — 2026-09-06

Canonical owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

Baseline used by this research branch:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- runtime version remains `0.9.8`;
- this branch changes research documentation/tools only.

## Status

**P0-013 remains ACTIVE.**

This research saturates the current architecture/source contract, but it does not implement or release-test it.

Registry owner:

> Imported/restore selection authority must be bound to the exact explicitly selected backup object/staging receipt; old selection/file identity cannot silently retarget.

## Executive finding

Current C44 staged-import machinery is materially stronger than the old Yandex backup picker, but it protects the wrong side of the remaining race.

After download, WebClip already has a strong staging/content receipt including fields such as:

- `stagingKey`;
- `stagingGeneration`;
- `contentSha256`;
- `entryCount`;
- `exportedAt`;
- import lease ownership/generation.

That proves which bytes are staged and later applied.

It does **not** prove that those bytes came from the same remote Yandex backup object/version that the user explicitly selected in the picker.

Current picker state still collapses the selected remote object to one mutable locator string:

`selectedYandexBackupPath`.

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP` then sends only that path and fetches whichever object occupies it later.

Therefore the remaining P0-013 gap is the missing causal bridge:

`selected remote object/version -> authorized fetch -> downloaded bytes -> exact staging receipt`.

## Fresh source proof

### 1. LIST has more information than selection retains

`listJournalBackupsOnYandex()` returns backup file records that include at least:

- name;
- path;
- type;
- size;
- modified.

The UI displays these values.

However `journal.js` retains only:

`let selectedYandexBackupPath = '';`

and the radio change handler assigns only:

`selectedYandexBackupPath = radio.value`.

### 2. Proceed sends only the path

`importSelectedYandexBackup()` copies `selectedYandexBackupPath` and calls:

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP { path, operationId, ownerSessionId }`.

No immutable selected-object receipt crosses the UI/worker boundary.

### 3. FETCH resolves the current object at that path

`fetchJournalBackupFromYandex(requestedPath, ...)` validates path containment and then requests:

`GET /resources/download?path=<remotePath>`.

There is no fresh exact metadata read and compare against the picker selection before the signed download URL is issued.

### 4. Same path can therefore retarget

Deterministic schedule:

1. LIST observes remote object A at path P.
2. UI shows A metadata; user selects A.
3. UI remembers only P.
4. A is replaced by B at the same P.
5. Proceed sends P.
6. worker asks for a download URL for current P.
7. B is downloaded and staged.
8. staging SHA/lease correctly prove B.
9. user later confirms replacement based on a payload that was not the remote object/version selected in step 2.

The strong staging receipt does not retroactively repair step 4.

## Positive controls to preserve

### C44 staging/content receipt

The current preview/staging/lease design is useful and must remain.

P0-013 should compose with it rather than invent a second staging identity system.

### Path containment

The worker checks that the selected path belongs to the configured Journal backup namespace.

This remains a necessary namespace control, but path containment is not selected-object identity.

### Existing list generation/UI ordering

The picker already uses `yandexBackupListGeneration` to stop stale list results from repainting the current picker.

That is a UI ordering control. It is not remote object/version authority.

### P0-074 immutable live Yandex context

Account/root/auth/config generation continuity is separately owned by P0-074.

P0-013 consumes that immutable context receipt; it does not create another account-generation system.

## Required authority chain

One explicit import of a Yandex backup should produce and preserve this chain:

1. **list operation context receipt** — immutable P0-074 Yandex account/root/context generation;
2. **selected remote object receipt** — versioned immutable description of the exact object/version the user selected;
3. **fresh pre-download verification receipt** — proves the selected object receipt still names the current object/version under the same immutable context;
4. **download transfer receipt** — signed transport remains tied to the same operation context and verified selection;
5. **staging receipt** — existing C44 `stagingGeneration + contentSha256 + entryCount + exportedAt`;
6. **import lease/confirmation** — existing exact staging/owner/revision authority;
7. **replace commit** — applies only the staged generation whose provenance chain is still intact.

No later receipt can replace an earlier missing one.

In particular:

- content SHA proves bytes, not prior picker selection;
- path proves namespace/location, not object version;
- account/root context proves namespace, not object version;
- user confirmation proves intent to apply the shown staging preview, not that the remote selection was unchanged before download.

## Selected remote object receipt

Conceptually:

```text
selectedBackupObjectReceipt = {
  version: 1,
  accountUid,
  rootPath,
  yandexContextGeneration,
  path,
  providerObjectGeneration,
  observedSize,
  observedModified,
  observedName
}
```

The exact physical fields depend on what Yandex actually documents/proves.

### Strong provider object generation

If real Yandex API evidence establishes a stable object/version identifier suitable for this operation, that identifier should dominate weaker metadata.

Do not call a field strong solely because it is named `resource_id`.

The required property is operationally verified semantics: replacement at the same path must not compare equal to the selected version.

### Weak metadata

`size`, `modified`, `name` and path are useful mismatch evidence but are not cryptographic/content identity.

A replacement can in principle preserve one or more of them.

Therefore they may:

- strengthen fail-closed mismatch detection;
- support diagnostics/reselect;
- participate in a temporary conservative acceptance only if provider semantics are explicitly characterized.

They must not be documented as exact selected-version proof without evidence.

### No documented strong generation available

If the public API cannot provide a verified version/generation primitive, P0-013 remains open for the exact guarantee.

Safe behavior is to fail closed/reselect when exact proof is unavailable rather than silently treating path/current metadata as equivalent to the selected remote version.

Real Yandex E2E characterization is then required before closure.

## Pre-download verification

Immediately before asking Yandex for `/resources/download`, worker must:

1. acquire/use the same immutable P0-074 operation context;
2. validate receipt version and bounded fields;
3. prove account/root/context generation matches list selection;
4. fresh-read metadata for the exact selected path without provisioning folders;
5. compare strong provider object generation if available;
6. otherwise apply the explicitly documented conservative metadata rule;
7. reject `selection-stale` before requesting the signed download URL on mismatch/unknown;
8. only after successful verification request the signed URL.

The UI must not be authoritative for this check.

## Residual verification-to-download race

A provider can theoretically replace an object after the fresh metadata GET but before `/resources/download` resolves.

If Yandex offers a documented conditional/version-bound download mechanism, use it.

If it does not, WebClip must not claim atomic exact-version selection merely from two sequential requests.

Required release evidence must characterize this real provider boundary.

Possible safe approaches, depending on actual provider semantics:

- download link response itself is bound to the verified object generation;
- a stable provider object id is reverified after transfer and is proven to correspond to the downloaded object/version;
- the downloaded payload contains an authenticated/versioned self-identity tied to the selected receipt;
- otherwise the product remains fail-closed or explicitly documents a weaker guarantee instead of closing P0-013.

## Linking remote selection to staging

When downloaded bytes are accepted into C44 staging, the staging metadata/preview receipt must carry a bounded non-secret provenance reference such as:

```text
remoteSelectionReceipt = {
  version,
  contextReceiptId,
  selectedObjectReceiptId,
  verifiedAt,
  remotePath
}
```

or equivalent immutable fields.

The provenance reference must not contain OAuth tokens or signed download URLs.

The staging `contentSha256` remains the exact byte identity after transfer.

On restart, the durable lease must continue to identify both:

- the exact staged bytes;
- the remote-selection receipt that authorized their download.

Restart must not rebuild remote provenance from current settings/path.

## Relist/reselect semantics

Any of the following invalidates the old selection:

- P0-074 account generation change;
- incompatible root/config generation change;
- selected object version/generation mismatch;
- path disappears;
- provider identity becomes unverifiable;
- picker list generation is superseded before selection receipt is committed.

The user may relist and choose a new object, which creates a new receipt.

A later object at the same textual path is a new selection, not continuation of the old one.

## Same path and same weak metadata

This is a mandatory regression case.

A replacement B can deliberately use:

- same path;
- same file name;
- same size;
- possibly same/coarsened modified value.

If the implementation accepts B solely because those weak fields match, P0-013 is not closed.

The deterministic model in this branch represents the real provider version as `providerObjectGeneration` and proves that same-path/same-metadata replacement must still fail.

This model is an architecture proof, not evidence that the real Yandex API currently exposes such a field with those semantics.

## Relation to P0-074

P0-074 owns immutable live Yandex operation context.

P0-013 requires the selected object receipt to carry/reference that context and rejects A->B account/root/config retargeting.

P0-013 adds the separate same-context case:

`same account + same root + same path + different remote object/version`.

## Relation to P1-184

P1-184 owns stronger exact object/content creation/adoption receipts for upload/reuse/recovery.

P0-013 does not declare that the selected backup `resource_id` is sufficient for P1-184 or vice versa.

Shared provider identity primitives may eventually be reused only after their semantics are proven.

## Relation to P1-138

Backup LIST/FETCH observation must not secretly provision folders.

Pre-download verification required by P0-013 is a read operation and must remain read-only; a missing backup namespace returns empty/not-found/stale-selection rather than creating it.

## Relation to P1-139

Picker request ordering/single-flight prevents stale list responses from repainting UI.

P0-013 is object authority after the user selects a row. A perfectly ordered picker can still select A and later download replacement B without P0-013.

## Relation to P1-215 / C44

P1-215 already gives staged import durable restart ownership/lease semantics.

Preserve it.

P0-013 only extends the provenance carried into that staging generation for Yandex-origin imports.

Local file imports naturally have a different source receipt: the user-selected local file bytes become the staging input directly and do not need Yandex remote-object identity.

## Security/data minimization

Selection receipts are non-secret metadata.

Do not persist:

- OAuth token;
- Authorization header;
- signed download URL;
- other temporary transport capability.

Persist only bounded identity/provenance metadata needed for exact selection/recovery.

Signed transport secrecy remains P0-033.

## Deterministic acceptance matrix

1. A listed/selected, A unchanged -> pre-download verification succeeds.
2. A selected, B replaces same path with different provider generation -> reject before `/resources/download`.
3. A selected, B replaces same path with same size/name/modified -> still reject when strong provider generation differs.
4. A selected, account A -> B before Proceed -> P0-074 context mismatch, zero B fetch.
5. A selected, root generation changes -> reject/relist.
6. selected receipt lacks provable provider generation under an exact-guarantee implementation -> fail closed/reselect.
7. fresh metadata unavailable/timeout -> no signed download request; selection remains stale/unknown, not success.
8. signed download succeeds and C44 staging produces content SHA -> staging receipt includes/reference the verified remote-selection receipt.
9. worker restarts after staging -> lease resumes exact staged bytes and original remote provenance; no reconstruction from current path/settings.
10. staged payload valid but originated from replacement B after stale A selection -> P0-013 rejects before staging in the corrected architecture.
11. local file import continues using current C44 staging receipt without a synthetic Yandex selection receipt.
12. backup LIST/FETCH verification creates no remote folders merely to observe the selection.

## Source-bound runtime gate

This branch adds `project_tools/test_p0_013_selected_backup_object_source.js`.

It should remain RED until production source has all of the following:

- picker stores a versioned object receipt rather than only path;
- list returns the identity/version metadata needed by that receipt;
- fetch RPC carries the receipt;
- worker performs fresh metadata verification before `/resources/download`;
- same P0-074 context is part of the receipt/admission;
- path-only fetch is rejected;
- staging/preview receipt retains a reference to verified remote selection provenance;
- current C44 `contentSha256/stagingGeneration` positive controls remain present;
- no token/signed URL becomes durable provenance.

## External provider evidence boundary

Official Yandex Disk REST material confirms that the API manages authenticated user files and exposes a live API/Polygon, but this research did not find a public documented conditional/version-bound download guarantee sufficient by itself to prove exact selected-version atomicity.

Therefore provider semantics remain a real-E2E/official-contract closure requirement, not an assumption embedded into the model.

## Closure rule

P0-013 may move out of ACTIVE only after:

1. production implementation satisfies the source gate;
2. deterministic replacement/context/restart regressions pass;
3. real Yandex evidence proves the chosen provider object/version identity semantics and the verification-to-download boundary;
4. C44 staging/lease regressions remain green;
5. P0-074 context continuity remains green;
6. no runtime/manifest/release status is inferred from this docs-only branch.
