# WebClip — Wave 1 exact saved-artifact identity architecture — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/wave1-save-operation-receipt-architecture-2026-09-09`  
Mode: **RESEARCH-ONLY**  
Primary owners composed: **P0-070, P0-023, P0-079, P0-073, P0-074, P1-184, P0-078, P0-076**  
Required adjacent authority dependencies: **P0-080, P0-071, P1-198, P0-072** and destination-specific settlement owners.

This document does not change runtime, `manifest.json`, Registry status, release readiness, build, tag, Release or deployment.

## 1. Why Wave 1 must be one architecture program

The final current-baseline synthesis ranked the saved-artifact identity chain as the highest silent-corruption risk.

The individual owner research is already strong, but implementing the owners independently would still leave composition gaps:

```text
P0-070 exact source generation
without P0-079
-> correct source can still feed bytes that are later replaced in a mutable cache alias

P0-079 immutable PDF generation
without P0-023
-> a different live document can still discover/retry the old immutable PDF

P0-073 durable account/root scope
without P0-074
-> recovery can validate expected account A, then later API calls can use newly current auth B

P0-074 immutable Yandex live context
without P0-078
-> an old context/Boolean can still start publication after the user revoked automatic publication

P1-184 exact remote byte proof
without P0-076
-> correct remote content can still be finalized into a stale/recreated Journal authority
```

Therefore the unit of architectural correctness is not an individual helper. It is continuity of exact authority from source admission to final Journal provenance.

No new P-code is needed. **P0-070 is already the end-to-end source/save authority owner; the other owners define narrower stages that P0-070 must compose rather than absorb.**

## 2. Fresh current-source composition proof

Current canonical source still has the exact shapes identified by the separate owner tranches.

### PDF cache identity

Current cache identity is:

```js
function pdfCacheKey(tabId) {
  return `tab:${tabId}`;
}
```

and live retry begins from that mutable tab alias.

Thus there is still no operation-owned exact PDF object identity in production.

### Remote checkpoint

Current `checkpointPendingRemoteSaveIntent()` persists useful fields such as operation correlation and `expectedPdfBytes`, but its durable checkpoint does not yet require the composed Wave-1 authorities:

```text
source generation receipt
exact PDF cache generation
expected SHA-256
immutable account/root scope receipt
publication-policy generation receipt
expected Journal generation
```

### Yandex operation context

Current `yandexApi()` still calls `getValidYandexAccessToken()` inside each request. `ensureYandexServiceFolders()` also rereads current config/token.

Therefore a single logical remote operation can still observe mutable auth/config at multiple stages.

### Publication

Current upload/recovery semantics still derive publication from the Boolean `createPublicLinks`, not a durable generation/revocation receipt plus a pre-mutation publication-admission phase.

### Journal finalization

P0-076 research remains intentionally RED against current runtime: exact Journal generation + per-entry revision authority is not yet the universal finalization gate.

The Wave-1 architecture therefore addresses a real cross-stage absence in current production source, not only documentation structure.

## 3. Architectural principle: receipt graph, not one giant mutable object

The name `SaveOperationReceipt` is useful as a conceptual umbrella, but production should **not** create one giant mutable record that every subsystem rewrites.

Preferred model:

```text
trusted operation generation (P1-198)
        |
        +--> SourceGenerationReceipt (P0-080/P0-070)
        |
        +--> PdfGenerationReceipt (P0-079; carries source provenance)
        |
        +--> DestinationAdmissionReceipt
                |
                +--> YandexAccountRootScope (P0-073)
                +--> Yandex context metadata receipt (P0-074; token is NOT durable)
                +--> PublicationPolicyReceipt (P0-078)
                +--> expected Journal generation (P0-076)
        |
        +--> RemoteContentReceipt (P1-184)
        |
        +--> JournalFinalizationReceipt (P0-076)
```

Each stage is immutable once admitted. A later stage references the exact earlier stage/generation instead of copying mutable current state.

This yields three important properties:

1. **restartability** — durable non-secret receipts survive MV3 worker termination;
2. **non-retargetability** — late callbacks cannot silently bind themselves to a newer tab/document/cache/account/Journal row;
3. **auditable provenance** — final Journal truth can explain exactly which source and bytes were persisted externally.

## 4. Receipt 1 — trusted operation generation

Wave 1 consumes, rather than redefines, the worker-issued live operation authority owned by P1-198.

Conceptually:

```js
operationReceipt = {
  version: 1,
  operationGeneration: '<worker-issued opaque UUID>',
  correlationOperationId: '<bounded caller text, diagnostic only>'
};
```

Rules:

- caller textual `operationId` is not a possession capability;
- two operations may reuse the same caller text and still be different generations;
- every cache/external/Journal continuation must be tied to worker-owned operation authority or a durable descendant receipt;
- restart recovery consumes a durable descendant receipt rather than recreating live authority from caller text.

## 5. Receipt 2 — exact source generation

P0-070 consumes the already-required P0-080 application/selection authority and the actual Chrome sender envelope.

Conceptual bounded receipt:

```js
sourceGenerationReceipt = {
  version: 1,
  tabId,
  browserDocumentId,
  topFrameId: 0,
  applicationGeneration,
  selectionRevision,
  navigationEntryId,
  admittedUrl
};
```

Authority rules:

```text
same tab != same document
same URL != same document
same documentId != necessarily same application/SPА generation
```

Before render:

```text
exact document-target probe
+ exact upstream application/selection receipt comparison
```

During render:

```text
operation-local main-frame navigation fence
+ existing P0-071 guarded Page.printToPDF
```

Any fatal source transition before byte acceptance discards returned PDF bytes and creates no sealed generation.

After a sealed PDF generation commits, later page navigation no longer invalidates those already accepted bytes.

## 6. Receipt 3 — immutable sealed PDF generation

Recommended P0-079 object:

```js
pdfGenerationReceipt = {
  version: 1,
  generation: '<worker-issued opaque PDF generation>',
  ownerOperationGeneration: '<P1-198 receipt reference>',
  sourceGenerationReceipt: '<exact P0-070 receipt/reference>',
  byteLength: N,
  sha256: H,
  sealed: true,
  createdAt
};
```

Physical cache model:

```text
payload store:  pdf:<G> -> exact PDF Blob/bytes
metadata store: pdf:<G> -> exact immutable receipt metadata
optional index: tab:<T> -> latest retry-discovery pointer G
```

The tab pointer is only an index. It is never byte identity.

### Atomic creation

Creation of G must be create-once in one IndexedDB transaction across payload + metadata.

Preferred semantics:

```text
add payload G
add metadata G
commit
```

or an equivalent in-transaction CAS. Ordinary replace-capable `put()` for an already-issued sealed G is not acceptable.

If local caller settlement is unknown, reconcile exact G. Do not blindly rewrite G.

### Exact reads/deletes

Offscreen transfer, retry and cleanup name exact G.

No fallback:

```text
missing G -> latest tab alias
```

Late A cleanup deletes only G-A and clears a tab pointer only if the pointer still equals G-A.

### Digest timing

`sha256` must be part of the sealed-generation integrity receipt before an external content mutation is admitted.

This gives P1-184 a durable local truth even after worker restart.

## 7. P0-023 — live retry is discovery/admission, not recovery ownership

Two semantic APIs should be distinct:

```text
retryForCurrentLiveSource(tab, currentSourceReceipt)
recoverExactOwnedGeneration(pdfGenerationReceipt)
```

### Live retry

Safe flow:

```text
trusted current sender/source S
-> read tab latest pointer -> G
-> read exact sealed G
-> require G.sourceReceipt == S
-> permit live-source retry
```

A same-URL reload with a new `documentId` fails.

A source mismatch may compare-and-clear the stale discovery pointer, but does not delete another operation's sealed G.

### Operation recovery

A durable pending operation may continue exact G after the tab navigates/closes/reloads because it is not granting current document B ownership of A's bytes.

Recovery never consults the tab latest alias.

## 8. Receipt 4 — immutable Yandex account/root scope

Before an operation-owned remote content mutation, persist non-secret P0-073 scope:

```js
yandexAccountRootScope = {
  version: 1,
  accountUid,
  rootPath,
  remotePath
};
```

Rules:

- `remotePath` must be under exact stored root;
- later current-root change does not rewrite the old operation's root;
- account mismatch is deferred/manual context state, not remote 404/failure;
- account/root/path scope of an unresolved checkpoint cannot be rebound in place;
- token is never persisted here.

## 9. Live Yandex context is a secret ephemeral capability

P0-074 requires one coherent live context per logical network item.

Conceptually:

```text
YandexOperationContext
  safe:
    contextId
    accountUid
    rootPath/config snapshot
    authGeneration
    configGeneration
  secret:
    captured access token / request capability
```

The token is memory-only and should be structurally hard to serialize accidentally.

Context acquisition must avoid creating an immutable mixed snapshot. Use monotonic auth/config generations with bounded double-read/recheck or an equivalent coherent acquisition primitive.

All OAuth-authenticated requests for one item use:

```text
yandexApiWithContext(context, ...)
```

and never reread global current auth internally.

A newly current token cannot be silently substituted after 401/timeout/auth switch. A later recovery cycle may acquire a new context and prove it belongs to the same expected durable account.

## 10. Receipt 5 — publication policy generation

Publication authority is separate from Yandex context authority.

Durable current policy:

```js
publicLinkPolicy = {
  version: 1,
  generation: '<monotonic/opaque policy generation>',
  enabled: true | false
};
```

Operation receipt:

```js
publicationPolicyReceipt = {
  version: 1,
  generation: '<exact policy generation observed>',
  requested: true | false
};
```

Publication phase:

```text
skipped-disabled
eligible
admitted
unknown
verified-public
revoked-before-admission
manual-publication-authority-unverifiable
```

### Critical ordering

Before the first `/resources/publish` mutation:

```text
enter bounded local policy-admission serialization
-> compare exact policy generation + enabled
-> durably set publicationPhase=admitted
-> release local serialization
-> perform network publish through immutable P0-074 context
```

If a newer disable commits before admission, old operation is permanently revoked-before-admission.

ABA:

```text
G1 true -> G2 false -> G3 true
```

never resurrects G1 authority.

If publication was already admitted, later false does not prove cancellation. Reconcile remote truth.

## 11. Durable remote-save checkpoint v2

Wave 1 should evolve the remote checkpoint into a versioned composed receipt rather than adding unrelated loose fields indefinitely.

Conceptual v2:

```js
pendingRemoteSaveV2 = {
  version: 2,
  operationGeneration,

  source: {
    receiptVersion,
    receiptIdOrBoundedBody
  },

  pdf: {
    generation,
    byteLength,
    sha256
  },

  yandexScope: {
    version: 1,
    accountUid,
    rootPath,
    remotePath
  },

  yandexContextReceipt: {
    version: 1,
    accountUid,
    authGeneration,
    configGeneration,
    contextId
    // NO token
  },

  publication: {
    policyGeneration,
    requested,
    phase
  },

  journal: {
    expectedJournalGeneration,
    journalEntryId
  },

  remote: {
    phase,
    resourceId,
    revision,
    verificationKind,
    verifiedSha256,
    publicUrl
  },

  attempt/recovery metadata...
};
```

The exact JSON layout is not mandated, but authority domains must remain distinguishable. One generic `generation` field for source/cache/auth/policy/Journal would be dangerous.

## 12. When the durable checkpoint must exist

The operation needs a durable non-secret checkpoint **before the first non-cancellable operation-owned external content/publication mutation is admitted**.

For Yandex content upload, the safe semantic sequence is:

```text
1. source receipt admitted and fenced
2. guarded render succeeds
3. sealed exact PDF generation G + N + H commits
4. acquire coherent Yandex live context
5. derive exact account/root/path under that context
6. capture publication-policy generation
7. capture expected Journal generation
8. persist composed pendingRemoteSaveV2
9. only then admit signed upload/content mutation
10. exact remote-content verification
11. optional exact publication admission/reconciliation
12. Journal CAS finalization
```

Idempotent service-folder preparation may require its own separate external-settlement treatment if it can mutate provider state before step 8. Wave 1 must not casually treat an unknown folder-creation effect as proof about the PDF object. The PDF/content mutation checkpoint remains mandatory before upload admission.

## 13. Receipt 6 — exact remote-content proof

P1-184 consumes the durable PDF truth:

```text
expected byte length N
expected SHA-256 H
expected account/root/path
```

Strong success requires exact content proof.

Preferred validated fast path:

```text
resource metadata
  type=file
  size=N
  sha256=H
  resource_id present
```

Only after live Yandex validation confirms current provider semantics.

Fallback:

```text
exact-context /resources/download
-> bounded stream
-> length N
-> local SHA-256 H
```

Never degrade to:

```text
path + size
RID + size
revision + size
```

as exact-content success.

After exact bytes are proved, bind resource identity/revision as later reconciliation evidence.

## 14. Journal generation must be captured before external admission

P0-076 prevents an operation admitted under old Journal state from later creating/finalizing a row after a destructive reset/import boundary.

The durable external checkpoint therefore carries:

```text
expectedJournalGeneration
```

Before initial external-effect admission, compare it against current authoritative Journal generation.

If a destructive boundary happened before the effect was admitted:

```text
stale Journal generation
-> zero new external content effect
-> zero later Journal success
```

If the external effect was already admitted before reset, P0-072/P0-076 recovery rules take over: the system must preserve external truth/unknown state but must not silently finalize it into a newly recreated Journal generation.

## 15. Receipt 7 — final Journal provenance

Journal success is not merely:

```text
append/update row by textual id
```

The finalizer must prove:

```text
expected Journal generation is current
+ correct entry incarnation/revision where applicable
+ exact operation lineage
+ exact sealed PDF generation
+ exact destination settlement receipt
```

A bounded final provenance record should retain enough non-secret identity to establish:

```text
source S
-> PDF generation G / SHA H
-> destination object/local-effect receipt R
-> Journal generation/entry revision J
```

Do not persist live OAuth capabilities.

## 16. End-to-end state machine

Recommended conceptual states:

```text
SOURCE_ADMITTED
SOURCE_FENCED_FOR_RENDER
PDF_RENDERING
PDF_SEALED
DESTINATION_PREPARED
EXTERNAL_EFFECT_ADMITTED
EXTERNAL_EFFECT_UNKNOWN
REMOTE_CONTENT_VERIFIED
PUBLICATION_ELIGIBLE
PUBLICATION_ADMITTED
PUBLICATION_UNKNOWN
PUBLICATION_VERIFIED / PUBLICATION_SKIPPED / PUBLICATION_REVOKED
JOURNAL_FINALIZING
JOURNAL_FINALIZED
TERMINAL_FAILED / MANUAL_RECONCILIATION
```

Not every destination uses every state.

The key rule is monotonic evidence: a later mutable observation cannot erase an already-proven earlier side effect, and a later setting cannot retroactively authorize an old pre-revocation operation.

## 17. Recovery algorithm

For a durable Yandex checkpoint after worker restart:

```text
load exact checkpoint
-> validate schema/bounds
-> locate exact sealed PDF generation G if still required
-> acquire a NEW live Yandex context
-> prove context account == checkpoint expected account
-> use checkpoint root/path, never current configured root
-> inspect remote object through captured context
-> prove exact bytes H/N (metadata fast path only if validated; otherwise download+hash)
-> reconcile publication phase according to exact old policy receipt and admitted/unknown state
-> compare expected Journal generation
-> finalize only if Journal authority is still valid
```

Never recover by:

```text
current tab -> rerender
current URL -> infer old source
current token/root -> rewrite old scope
current publication true -> resurrect old authority
current same-size path -> infer exact upload
textual Journal id -> infer same entry
```

## 18. Local-download composition

Wave 1's same PDF/source receipt should also feed local download/native Save As paths.

The destination-specific receipt differs, but source/PDF identity must not fork into a second weaker chain.

Conceptually:

```text
SourceGenerationReceipt
-> PdfGenerationReceipt G/H/N
-> LocalDownloadAdmissionReceipt
-> exact downloads/native settlement receipt
-> Journal CAS finalization
```

Unknown Chrome/native settlement is reconciled under existing destination owners; it never rerenders a newer document as a shortcut.

## 19. Legacy migration rules

### Legacy `tab:<id>` cache rows

Do not synthesize exact source/cache authority from the current tab.

Safe choices:

- bounded compatibility read where no exact-generation claim is made;
- expiry/cleanup;
- user-visible inability to exact-retry when required.

### Legacy pending remote rows without SHA-256

Do not mark exact-content verified from path+size.

Use explicit legacy/manual/external reconciliation state unless exact bytes can be independently recovered/proved.

### Legacy publication `true` without policy generation

Do not automatically publish. Authority is unverifiable after possible intervening disable/re-enable.

### Legacy pending rows without expected Journal generation

Adoption is allowed only under the conservative P0-076 bootstrap rules. After a destructive boundary has been seen, missing generation is indeterminate/fail-closed.

## 20. Cross-owner concurrency locks must stay narrow

Do not create one giant global save mutex.

Required serialization domains are different:

- exact PDF generation creation: per issued PDF generation / IndexedDB transaction;
- tab retry pointer: per tab pointer CAS;
- Yandex auth/config snapshot: coherent read/acquisition, not long network lock;
- publication policy admission: short local generation-check + checkpoint CAS;
- Journal finalization: exact Journal/entry transaction/CAS;
- external network calls: no global lock; durable receipt owns settlement.

This preserves concurrency while preventing stale overtakes.

## 21. Failure taxonomy

Machine outcomes should distinguish authority failure from provider failure.

Examples:

```text
stale-source-generation
missing-pdf-generation
pdf-generation-conflict
pdf-integrity-mismatch
yandex-account-mismatch
yandex-context-invalid
remote-content-mismatch
publication-revoked-before-admission
publication-unknown
stale-journal-generation
stale-entry-generation
stale-entry-revision
manual-legacy-authority-unverifiable
```

Do not collapse all of these into generic retryable network failure.

## 22. Defensive-security boundary

This Wave-1 architecture improves integrity and confidentiality without broadening offensive capability.

Requirements:

- OAuth token/access capability remains ephemeral and non-serializable;
- signed Yandex upload/download URLs are not committed/logged as durable evidence;
- source URLs/provenance are sanitized under existing confidentiality owner rules;
- SHA-256 of PDF is durable integrity metadata, not the PDF content itself;
- operation logs record bounded safe context IDs/generations, not secrets;
- public URL is persisted only as product-visible factual publication outcome where allowed.

## 23. Performance implications

The design adds strong SHA-256 and receipt checks but does not require duplicate full-PDF memory copies.

Preferred PDF sealing path:

```text
stream/iterate generated bytes
-> bounded byte count
-> incremental SHA-256
-> write exact Blob/record
-> atomically seal metadata
```

Remote fallback verification should stream and bound to expected size; abort on overrun rather than download unlimited content.

Receipt objects are small and bounded. The main storage cost remains the existing PDF Blob.

## 24. Implementation decomposition

The dependency-safe implementation order is more precise than implementing owners in Registry-number order.

### Commit group A — pure receipt schemas/helpers

Add pure bounded parsing/comparison helpers for:

```text
source generation receipt reference
PDF generation receipt
Yandex account/root scope
publication policy receipt
remote exact-content receipt
```

Do not yet switch runtime authority.

### Commit group B — P0-079 sealed cache foundation

- operation-owned cache generation;
- atomic create-once payload+metadata;
- SHA-256/byte-length sealed receipt;
- exact generation read/delete;
- tab latest pointer as CAS index only;
- offscreen transfer exact-generation verification.

This creates the physical immutable input needed by all later stages.

### Commit group C — P0-070/P0-023 source linkage

- trusted sender `documentId` receipt;
- pre-render exact-document/application validation;
- render-window navigation fence around existing P0-071 guard;
- store exact source provenance in sealed generation;
- live retry requires source-receipt equality;
- recovery exact-generation path separated from live retry.

### Commit group D — P0-074/P0-073 Yandex context and scope

- coherent context acquisition;
- context-bound Yandex API primitive;
- context-bound folder/path/upload/verify flows;
- durable non-secret exact account/root/path scope;
- mismatch/defer outcomes without remote attempt ageing.

### Commit group E — P0-078 publication generation

- dedicated policy generation;
- both writers use one transition rule;
- durable publication receipt/phase;
- serialized exact admission before first publish mutation;
- legacy authority fail-closed.

### Commit group F — P1-184 exact remote content

- checkpoint stores local H/N;
- validate provider metadata SHA fast path through real L5 evidence;
- implement bounded download+hash fallback;
- bind verified content to RID/revision;
- forbid size-only adoption/recovery/publication.

### Commit group G — P0-076 Journal CAS composition

- expected Journal generation captured before external admission;
- finalization requires current generation + entry authority;
- final provenance binds exact PDF/destination receipt;
- destructive-boundary behavior composes with P0-072.

### Commit group H — Closure Sweep

Run end-to-end concurrency/restart schedules across B2/B6/B7/B8/B9 before declaring any cross-owner Wave-1 completion.

## 25. Why P0-079 should land before P1-184

P1-184 requires a durable local hash H that is known to refer to immutable operation-owned bytes.

If remote verification is implemented first while local cache remains mutable `tab:<id>`, the system can truthfully verify H for bytes that are no longer the bytes a retry later reads from the mutable alias.

Therefore:

```text
immutable exact local generation
before
exact remote-content verification
```

is a hard dependency, not only a convenience.

## 26. Why P0-076 finalization should be integrated after durable external receipts exist

P0-076 can provide exact Journal CAS before the remote chain is fixed, but then a correct CAS could still finalize a wrong external object.

Wave-1 end-to-end closure requires:

```text
correct local Journal target
AND
correct exact external artifact
```

Thus P0-076 infrastructure may be implemented independently, but Wave-1 success must be evaluated only after exact PDF/remote receipts are available to the finalizer.

## 27. Cross-owner deterministic model

Added:

`project_tools/test_wave1_save_operation_receipt_model.js`

Exact GitHub Actions execution:

```text
workflow run: 34299470453
job: 102303113885
execution commit: 1f34fee591a7abedce34c8181eb8c5e87f29fa48
runner: ubuntu-24.04
Node: v22.23.2
result: PASS
```

Actual output:

```text
Wave 1 SaveOperationReceipt cross-owner model: PASS
```

The model covers:

1. stable source -> sealed PDF -> exact remote content -> Journal generation success;
2. different browser document cannot claim old live-retry generation;
3. same-tab newer PDF cannot replace exact older generation;
4. stale A cleanup preserves newer B pointer;
5. captured Yandex context does not mutate when global account/root changes;
6. publication disable revokes old generation and later re-enable does not resurrect it;
7. same-size wrong SHA-256 is rejected;
8. cross-account same path/size/hash is rejected;
9. destructive Journal generation change blocks late finalization;
10. restart/recovery continues exact sealed generation rather than rerendering current tab.

This is architecture/model evidence, not runtime closure.

The temporary Actions workflow used to execute the model was deleted from the research branch after the successful run.

## 28. Required integrated source gate

A future Wave-1 source gate should not merely search for eight isolated owner markers. It should prove the composition edges.

Minimum source-visible requirements:

```text
trusted source receipt -> sealed PDF receipt
sealed PDF receipt -> exact cache key/offscreen transfer
sealed PDF H/N -> pending remote checkpoint
captured Yandex scope/context -> every authenticated request in one item
publication policy generation -> durable publish admission
remote exact-content receipt -> publication/finalization eligibility
expected Journal generation -> final Journal CAS
```

The gate should also reject legacy fallback shapes such as:

```text
retry by tabId only
remote success by size only
publish by old Boolean only
Journal success by textual id only
Yandex request helper that silently rereads current auth mid-item
```

## 29. Integrated physical/external closure schedules

Wave-1 implementation is not DONE without real evidence.

Minimum combined schedules:

### W1-A source-navigation race

Save A -> navigation/reload before/during render -> no sealed G, no download/upload, no Journal success.

### W1-B same-tab concurrent saves

A and B in one tab -> distinct G-A/G-B -> A offscreen transfer reads A after B becomes latest -> late A cleanup preserves B.

### W1-C same-URL reload retry

Document A creates G-A -> same URL reload B -> B cannot live-retry G-A -> legitimate operation recovery of A may still consume G-A.

### W1-D account switch during upload

Capture account A context -> global auth switches B -> signed upload verification still uses A context -> no B probing/publication.

### W1-E publication revoke

G1=true operation -> user commits G2=false before publish admission -> zero publish mutation. Then G3=true -> G1 remains revoked.

### W1-F exact remote mismatch

Same path + same byte length + different PDF hash -> reject adoption, publication and Journal success.

### W1-G restart unknown upload

External PUT admitted -> worker dies -> recovery uses durable G/H/N/account/root/path -> proves exact remote bytes or remains truthful unknown; never rerenders.

### W1-H Journal reset race

External effect admitted under Journal G1 -> destructive reset G2 -> later verified external result cannot silently append/finalize into G2.

### W1-I fully stable end to end

Exact source S -> sealed G/H -> exact destination receipt -> exact Journal generation/entry CAS -> one truthful final entry with provenance.

## 30. No new owner conclusion

The integration model does not reveal a ninth independent root cause.

The cross-owner defect is exactly the composition responsibility already represented by P0-070 plus its narrower owners.

Therefore:

```text
P1-231 remains unallocated
```

Creating a new umbrella finding would duplicate the existing ownership graph and make closure harder to reason about.

## 31. Wave-1 research status

For the exact baseline:

```text
cross-owner architecture = DEFINED
cross-owner deterministic model = PASS
current production implementation = RED / NOT IMPLEMENTED
real integrated browser/Yandex/Journal closure = NOT EXECUTED
Registry statuses = unchanged
release state = NOT READY
```

## 32. Recommended next action

The broad research campaign is complete. The next technically rational action is implementation, beginning with **Commit group B — P0-079 sealed cache foundation**, because it is the first hard physical-identity dependency for the rest of Wave 1.

Before any production merge, perform targeted Change Impact against affected C-cells and execute owner-specific source/model tests plus Closure Sweep.
