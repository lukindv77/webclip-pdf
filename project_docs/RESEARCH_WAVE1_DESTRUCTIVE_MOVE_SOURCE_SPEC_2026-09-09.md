# WebClip — Wave 1 D1 exact destructive-move state machine for Delete→Trash and Mark Read — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-destructive-move-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION DOMAIN STATE-MACHINE SPECIFICATION**  
Production implementation: **NOT STARTED**.

Primary owners: **P0-069, P0-072, P0-073, P0-074, P0-076, P1-090, P1-183**.  
Supporting owners/boundaries: **P0-022, P0-078, P1-138, P1-164, P1-177, P1-184, P1-198, P1-208, P1-210**.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

The Journal infrastructure chain is now defined at architecture/model level:

```text
P = worker-issued physical operation
F = Journal finalization authority
E = independent remote mutation receipt
C = immutable Yandex operation context

P admission
 -> F admission
 -> E prepared
 -> E started-unknown
 -> provider effect
 -> exact reconciliation
 -> E verified
 -> Journal CAS / publication composition
 -> terminal F/E
 -> compact P archive
```

This tranche removes the remaining operation-specific ambiguity for two current destructive Yandex flows:

```text
1. Delete Journal entry -> move Yandex file to Trash
2. Mark Read -> move Yandex file ReadmeLater -> Upload
```

The key safety property is:

> an outer timeout/error, target-path observation, same-size file, or freshly observed object at the target can never by itself authorize a second move or local Journal success.

The operation must prove continuity of the **same exact remote object** across source and target.

---

# Part I — current production source proof

## 2. Current Delete→Trash has no durable pre-move domain receipt

Current `moveJournalYandexFileToTrash(entry, operationId)` roughly performs:

```text
read current Yandex config
locate current file
ensure Trash/YYYY-MM folder
choose available target path
POST /resources/move
poll target path
return move result
```

The move uses:

```text
overwrite=false
force_async=false
```

but there is no independent durable E row committed before the move call.

Therefore a worker stop or lost outer response after provider admission can leave no exact independent destructive-effect owner.

This is the direct P1-183/P0-072 gap.

---

## 3. Current target verification is path/type based at the final cut

After the move, current Delete/Mark Read polling requests fields equivalent to:

```text
name
path
type
size
public_url
resource_id
```

but the success loop currently breaks when:

```text
moved.type == file
```

It does not require:

```text
moved.resource_id == source.resource_id
```

before treating the target observation as the moved file.

This is materially weaker than P1-090.

A different file occupying `targetPath` must not become evidence that the original source object moved successfully.

---

## 4. Current Mark Read is a useful partial positive control

Current `moveReadLaterEntryToRead()` already writes an embedded checkpoint into the Journal entry before the provider move:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
readMoveLastError
```

This correctly recognizes the important ordering:

```text
persist plan
before
remote destructive action
```

However it is not sufficient for Wave 1 because the checkpoint:

- lives inside the mutable Journal row that later CAS must protect;
- is not independently retained if the row is replaced/cleared;
- does not carry exact P/F/C authority;
- does not establish exact provider object revision/content identity;
- does not have an explicit `started-unknown` effect boundary;
- is legacy textual operationId based.

J0/D1 therefore must preserve old `readMove*` evidence as legacy but use independent E for new v2 operations.

---

## 5. Current source locator has stronger identity logic than final move verification

`findYandexFileForJournalEntry()` already prefers stored `resourceId` and refuses to treat path alone as identity once a stable resourceId is known.

This is an important positive control.

D1 should carry that identity discipline through the entire move lifecycle instead of weakening it at the target verification cut.

---

## 6. Current target-name selection is a TOCTOU preflight, not a reservation

Both Trash and Upload target selection follow the general pattern:

```text
probe candidate path
404 -> candidate appears free
later POST move overwrite=false
```

The 404 observation does not reserve the path.

Between probe and move:

```text
another WebClip operation
another browser/device
another user action
provider-side activity
```

may occupy the target.

Therefore `chooseAvailableTargetPath()` / `chooseYandexTrashTarget()` provides a **candidate**, not exclusive ownership.

The exact target becomes part of E and must be treated as frozen once effect-start is crossed.

---

# Part II — external provider evidence boundary

## 7. Current Yandex Disk platform

The current Yandex Disk REST API remains the provider interface, and Yandex exposes an API Polygon/sandbox for exercising requests.

This research therefore assumes only the broad capability:

```text
read resource metadata
move a resource
observe source/target after move
```

It does **not** claim L5 proof for the WebClip account of:

- exact `resource_id` persistence across move;
- exact `revision` behavior across move;
- exact provider status/code semantics for target collision;
- exact metadata availability in every account/API response;
- public-link behavior after moving into Trash.

These must be verified later against the real provider.

If the real provider does not expose a strong enough stable object identity after move, the implementation must use a stronger bounded verification route or remain `manual-resolution`.

It must not fall back to path+size success.

---

# Part III — D1 identifiers and durable record

## 8. Required identity chain

A new destructive move must be bound to:

```text
P = physicalOperationId
F = finalizationId
E = remoteEffectId
C = yandexContextId
```

and the Journal authority captured by F:

```text
JG
ER / legacy-JR bridge where applicable
```

No caller textual `operationId` is physical ownership.

---

## 9. Move E shape

Conceptual bounded record:

```js
{
  version: 1,
  recordRevision,

  remoteEffectId: E,
  physicalOperationId: P,
  finalizationId: F,
  yandexContextId: C,

  kind: 'delete-trash' | 'mark-read',
  phase,

  source: {
    path,
    resourceId,
    revision,
    sha256,
    byteLength,
    publicUrlPresent
  },

  target: {
    path,
    folder,
    collisionOrdinal
  },

  result: {
    path,
    resourceId,
    revision,
    sha256,
    byteLength
  } | null,

  createdAt,
  updatedAt,
  effectStartedAt,
  verifiedAt,
  terminalAt,
  attemptCount,
  lastError
}
```

Fields that the provider cannot prove are left explicitly absent/unknown; they are not invented from old Journal metadata.

No token, Authorization header or signed transport capability is persisted.

---

# Part IV — exact source-object admission

## 10. Source must be proven before E is prepared

For new v2 destructive moves, the source object receipt must be sufficient for later same-object verification.

Preferred source identity:

```text
resourceId = required stable provider identity
revision   = captured where available
sha256/N   = captured where useful/available for additional verification
path       = current observed source location
```

A path-only legacy Journal row is not automatically upgraded into this receipt.

If exact source identity cannot be established:

```text
operationClass = evidence-limited / failed-before-effect according to admission path
external move = NOT STARTED
```

Do not create a destructive v2 move from guessed identity.

---

## 11. Immutable Yandex context

Source discovery and later move/reconciliation use the same operation context C:

```text
accountUid
rootPath
authGeneration
config/routingGeneration
```

A later re-auth/account/root change cannot silently retarget the move.

Ordinary current-state UI browsing may use current global config; physical D1 operation may not.

---

# Part V — target candidate / reservation semantics

## 12. Target is selected before effect-start

Delete:

```text
managed Trash root
-> YYYY-MM folder
-> collision-safe candidate filename
```

Mark Read:

```text
managed Upload root
-> site folder
-> collision-safe candidate filename
```

The selected target path is persisted in E while:

```text
phase = prepared
```

before provider mutation.

---

## 13. `overwrite=false` is required but not sufficient proof

A non-overwriting move request is desirable because a target collision should fail rather than replace an unrelated object.

However the local preflight is still TOCTOU.

Therefore the rule is:

```text
candidate appears free
!= target reserved
```

The actual provider move/precondition settlement determines whether that candidate was usable.

---

## 14. When a new target may be selected

A different candidate may be selected only while there is exact proof that the previous provider mutation did not start/settle.

Safe examples conceptually include:

```text
E still prepared and no move admitted
```

or a future provider-specific negative outcome proven to mean:

```text
request rejected before mutation because target exists
```

But a generic:

```text
timeout
network error
worker stop
lost response
```

is not no-effect proof.

Once E is `started-unknown`, target path is frozen until exact reconciliation resolves that effect.

Forbidden:

```text
move target A times out
-> choose target B
-> issue second move
```

---

# Part VI — effect-start linearization

## 15. Prepared phase

After source/context/target validation:

```text
E.phase = prepared
```

No provider mutation has been admitted yet.

Reconciliation projects:

```text
domain-pending
same-operation-only
```

Generic maintenance does not start the move.

---

## 16. F revoke before start

In one Journal transaction, if F is no longer admitted before effect-start:

```text
E prepared -> canceled-before-start
```

No provider call occurs.

Common outcome may become an exact pre-effect cancellation/failure according to the user/domain action.

---

## 17. Started-unknown must commit before provider call

Effect-start transaction verifies:

```text
F exact + admitted
E exact + prepared
P/F ownership
JG/ER authority where required
```

then commits:

```text
E.phase = started-unknown
E.effectStartedAt = now
E.recordRevision++
```

Only after transaction completion may the provider `/resources/move` call begin.

This is the destructive-move equivalent of write-ahead effect ownership.

---

## 18. F revoke after start

Once E is `started-unknown`:

```text
F revoke
!= move canceled
```

E stays `started-unknown` until provider settlement is reconciled.

This is central to P0-072.

---

# Part VII — provider settlement verification

## 19. Same-object continuity rule

A successful move requires proof conceptually equivalent to:

```text
source object identity before move = R

post-settlement target object identity = R

and no conflicting same-R source observation remains
```

Primary stable identity should use the provider's strongest available object identifier, currently expected to be `resource_id` pending L5 verification.

Path is location, not identity.

---

## 20. Target path alone is forbidden

Forbidden success test:

```text
target exists
AND target.type == file
-> success
```

Forbidden:

```text
target path + size match
-> success
```

Forbidden:

```text
target path + same filename
-> success
```

These can adopt an unrelated object after collision/unknown settlement.

---

## 21. Same-size/same-hash but different stable object id

For a move, the operation's purpose is continuity of the exact object, not merely equivalent bytes.

Therefore if a provider supplies a stable object id and target has:

```text
same size
same content hash
resourceId != source.resourceId
```

it is still not automatic proof of the move.

It may be a copied/replaced object.

Default:

```text
evidence-limited / manual-resolution
```

unless an explicit provider-specific move identity contract proves equivalence safely.

---

## 22. Observation matrix

Let `R` be exact source resource identity.

### Target has R, source no longer has R

```text
move verified
E -> verified
```

### Target has R, source also has R

Unexpected/inconsistent provider observation:

```text
no terminal success
continue bounded reconciliation
then manual-resolution if unresolved
```

### Target occupied by other object, source still has R

This is compatible with:

```text
target collision / move not completed
```

But whether a new target may be chosen depends on exact provider request settlement classification.

If the original request was already `started-unknown`, read-only observation alone must not mint a second effect without the operation-specific continuation policy proving no first effect can still settle later.

### Target occupied by other object, source R absent

Identity ambiguous.

```text
manual-resolution
```

Do not move another object and do not fabricate success.

### Neither source nor target proves R

```text
manual-resolution / evidence-limited
```

---

# Part VIII — bounded reconciliation

## 23. Reconciliation is read-only

`reconcileRemoteMove(E,C)` may:

- GET exact source path;
- GET exact target path;
- perform bounded identity search if provider/owner contract permits;
- compare resource ids/revisions/hashes;
- update E observations/phase based on evidence.

It must not:

- issue another move;
- choose a new target;
- delete/create a file;
- publish/unpublish;
- mutate Journal entry.

---

## 24. Timeout does not mean failure

Provider-call timeout/transport loss leaves:

```text
E.phase = started-unknown
```

UI:

```text
operationClass = effect-unknown
retryDisposition = reconcile-only
```

Never directly:

```text
move failed
-> Retry
```

---

## 25. Bounded exhaustion

If exact identity cannot be established after the operation-specific bounded reconciliation policy:

```text
E.phase = manual-resolution
terminal domain outcome = evidence-limited/manual-resolution
```

Exact source/target/context observations are retained according to the longer manual retention policy.

---

# Part IX — Mark Read finalization

## 26. Remote verified first

After exact same-object target verification:

```text
E.phase = verified
```

Remote effect is complete, but the Journal row is still not automatically updated.

---

## 27. Journal CAS

Mark Read local finalization requires exact F authority:

```text
same JG
same ER / legacy bridge
same journalEntryId
F still authorizes local finalization
```

Then one Journal transaction updates the row to the exact moved result:

```text
readingMode = read
remotePath = verified target
folder = verified target folder
filename = provider-verified name
publicUrl/resourceId = verified values
movedToReadAt
new ER
```

Legacy `readMove*` fields may be cleared only as compatibility cleanup after the v2 E result is durably authoritative.

---

## 28. Mark Read remote success + stale/revoked Journal authority

If move is verified but F/ER/JG can no longer mutate the original row:

```text
E -> remote-complete-local-suppressed
F terminal outcome -> settled-partial / none
```

Do not repeat the move.

Do not mutate a replacement entry with the same textual id.

---

# Part X — Delete→Trash finalization

## 29. Remote move verified first

Exact same-object verification places E in:

```text
verified
```

This proves the move component only.

It does not by itself authorize deletion of the Journal row.

---

## 30. Public-link outcome is a separate authority

If the Journal/source object has public-link state, P0-069 requires explicit publication outcome before the local record can disappear as a fully successful deletion.

This research deliberately does not invent the final product policy.

Acceptable future product policies could include an explicitly user-authorized outcome such as:

```text
revoke public access
```

or another consciously retained/public outcome whose control/provenance remains represented.

But current implicit behavior:

```text
move to Trash
-> delete local row
-> assume publication issue solved
```

is insufficient.

---

## 31. Publication effect may need its own E

If delete-to-trash requires a provider-side unpublish mutation, it should be modeled as its own exact remote effect receipt or another equally strong publication receipt.

Do not overload the move E's `verified` phase to mean:

```text
move verified + public access revoked
```

unless both effects truly share one provider atomic operation, which is not currently established.

The terminal F outcome composes all required domain effects.

---

## 32. Publication unknown

If move is verified but an admitted unpublish/publication mutation is unknown:

```text
operation remains effect-unknown/domain-pending according to publication owner
Journal row is not deleted as full success
```

No second move occurs.

---

## 33. Delete local CAS

Only after required publication outcome and move settlement are exact may the delete CAS remove the original Journal entry.

If JG/ER/F authority is stale:

```text
remote move remains exact
local delete suppressed
terminal outcome = settled-partial
retryDisposition = none for the move
```

A replacement same-id Journal row is untouched.

---

# Part XI — collision schedules

## 34. D1-C1 target occupied before effect-start

```text
candidate A probed free
before start another object appears at A
```

If this is detected while E remains `prepared` and no provider move was admitted:

```text
select new candidate
update E target while still prepared
```

Then effect-start freezes it.

---

## 35. D1-C2 provider returns exact no-move collision

If L5/provider-specific contract proves a response means the move was rejected before any mutation:

```text
E remains/reverts to pre-effect continuation class according to exact state machine
new candidate may be selected for SAME P/E generation or a versioned continuation
```

This exact response mapping must be tested, not guessed from generic HTTP status text.

---

## 36. D1-C3 timeout after move call

```text
E started-unknown
call times out
```

Expected:

```text
target frozen
no new move
read-only reconciliation only
```

---

## 37. D1-C4 target now contains unrelated file

```text
target.resourceId != R
```

Never accept target merely because name/path/size matches.

---

## 38. D1-C5 old target unrelated + source still R

This suggests no observed move, but a late provider settlement may still be possible depending on the original request state.

Do not automatically retarget from generic observation alone while the original effect remains `started-unknown`.

Provider-specific exact no-effect proof is required.

---

# Part XII — restart schedules

## 39. R1 worker stops after E prepared

Persisted:

```text
E prepared
provider call not admitted
```

Recovery:

```text
same P/E rediscovered
same-operation continuation possible
no blind fresh P
```

If F was revoked meanwhile:

```text
E -> canceled-before-start
```

---

## 40. R2 worker stops after E started-unknown before provider call invocation

The write-ahead state conservatively says the effect may start.

Recovery therefore performs reconciliation/continuation policy; it cannot simply infer no effect from the missing in-memory call site.

This deliberate conservative window is safer than issuing a duplicate move.

A future implementation may refine the provider invocation handoff with an additional exact local attempt token, but it must not weaken the no-duplicate invariant.

---

## 41. R3 worker stops after provider accepted move before response

```text
E started-unknown survives
```

Recovery proves exact object at source/target.

No second move.

---

## 42. R4 worker stops after E verified before Journal CAS

```text
E verified
```

Recovery prioritizes cheap local finalization (P1-208), subject to F/JG/ER/publication authority.

No network move repetition.

---

## 43. R5 worker stops after local finalization

F/E terminal state is later compacted into P by the cross-DB terminalization protocol.

The restart cannot re-run the remote effect based on missing UI response.

---

# Part XIII — legacy compatibility

## 44. Existing Mark Read embedded checkpoint

Classify as:

```text
legacy-domain-checkpoint
```

It may continue its existing conservative recovery path until explicitly migrated by production cutover logic.

Do not fabricate:

```text
P
F
E
C
resource revision
content hash
```

for historical rows merely because v8 exists.

---

## 45. Existing Delete→Trash operation

Current code has no equivalent independent durable move checkpoint.

After Wave 1 cutover, a new v2 delete must use E.

An interrupted legacy delete without strong exact receipt remains legacy/evidence-limited; the new code must not invent a v2 effect identity retrospectively.

---

# Part XIV — source-change specification

## 46. Suggested helper boundaries

```text
captureDestructiveMoveSourceReceipt()
chooseDestructiveMoveTargetCandidate()
prepareRemoteMutationEffect()
markRemoteMutationEffectStarted()
executeYandexMoveEffect()
reconcileYandexMoveEffect()
markRemoteMutationVerified()
finalizeMarkReadJournalCas()
finalizeDeleteJournalCas()
settleDeletePublicationOutcome()
```

The exact names may vary, but effect-start and reconciliation must remain separate.

---

## 47. Current functions to refactor/replace

Primary current integration points:

```text
findYandexFileForJournalEntry
chooseYandexTrashTarget
chooseAvailableTargetPath
moveJournalYandexFileToTrash
deleteJournalEntry
moveReadLaterEntryToRead
updateJournalEntryRecord
deleteJournalEntryRecordOnly
```

Avoid a parallel second implementation that leaves old unsafe paths callable for new v2 operations.

---

## 48. Current final verification must become exact

Replace conceptual current gate:

```text
GET target
if type=file -> success
```

with:

```text
GET/reconcile source + target under C
prove target.resourceId == E.source.resourceId
prove source settlement compatible with move
capture provider revision/hash/size where supported
commit E verified
```

No Journal mutation before that commit.

---

# Part XV — deterministic evidence

## 49. Model

Research file:

```text
project_tools/test_wave1_destructive_move_model.js
```

Observed local result:

```text
Wave 1 destructive move model: PASS cases=37
```

Covered schedules include:

- prepared has zero provider calls;
- durable started-unknown before effect;
- same-object target verification;
- Mark Read local finalization;
- revoke-before-start cancellation;
- revoke-after-start cannot cancel effect;
- verified remote + revoked F -> settled-partial;
- timeout remains unknown with no second move;
- wrong target resource id rejected;
- target occupied/source unmoved distinction;
- provider-classified no-move collision control;
- weak/path-only source identity rejected;
- Delete public-link outcome gate;
- Delete non-public success;
- same size/hash but different stable object id rejected;
- replacement Journal ER blocks stale finalization;
- target is frozen after effect-start.

This is L2 deterministic architecture evidence only.

---

## 50. Production source gate

Research file:

```text
project_tools/test_wave1_destructive_move_source.js
```

It is intentionally RED against current main until production D1 lands.

Future source must visibly contain the independent E lifecycle, exact source/target identity and Journal/publication finalization gates rather than merely changing UI messages.

---

# Part XVI — L5 provider acceptance

## 51. Required real Yandex schedule

On an exact production commit and the real WebClip account, capture at least:

1. source metadata before Mark Read;
2. source `resource_id`, revision/hash fields actually returned;
3. exact target candidate persisted in E;
4. move request settlement;
5. target metadata after move;
6. prove whether `resource_id` is stable across move;
7. record revision behavior;
8. verify source-path absence/changed state;
9. repeat for Delete→Trash;
10. deliberately create target collision with `overwrite=false`;
11. record exact provider response/status/body semantics;
12. inject/force response-loss schedule if feasible and reconcile from metadata;
13. test public-link behavior when a public object is moved to Trash;
14. verify whether explicit unpublish is required/available and its exact settlement semantics.

If stable `resource_id` continuity is not available, stop and refine the object-proof design before activation.

---

# Part XVII — owner/status impact

## 52. No new P-code

All discovered issues are direct refinements of existing owners:

```text
P1-183 durable Delete→Trash checkpoint
P1-090 same exact object after unknown move
P0-072 non-cancellable side-effect lifecycle
P0-076 Journal CAS
P0-069 publication outcome
P0-073/P0-074 immutable Yandex context
P1-210 reconciliation/retry authority
```

Therefore:

```text
P1-231 = NOT ALLOCATED
```

---

## 53. Current D1 research state

```text
Delete→Trash exact move state machine          = DEFINED
Mark Read exact move state machine             = DEFINED
source-object receipt                           = DEFINED
candidate/TOCTOU semantics                      = DEFINED
effect-start write-ahead boundary               = DEFINED
same-object target verification                 = DEFINED
collision/timeout retarget rule                 = DEFINED
publication composition for delete             = DEFINED AS REQUIRED BOUNDARY
legacy Mark Read treatment                      = DEFINED
D1 deterministic model                         = PASS 37/37

Production D1                                  = NOT IMPLEMENTED
Yandex move L5                                 = REQUIRED
P0/P1 owners                                   = remain ACTIVE
Release                                         = NOT READY
```

---

## 54. Project-wide coverage boundary

This tranche does not re-declare project-wide deep-research coverage complete.

The separate PD7 exact current-target receipt and fresh Coverage Reconciliation remain required before any such re-declaration.

---

## 55. Next research boundary

The next valuable D1-adjacent tranche is the **publication-control state machine for Delete→Trash / per-entry unpublish (P0-069 + P1-164)**:

```text
public state admission
-> immutable publication policy/intent
-> unpublish prepared
-> unpublish started-unknown
-> exact current provider public state reconciliation
-> move/publication composition
-> Journal deletion CAS
-> settled-partial/manual outcomes
```

That should resolve whether publication is represented by a second E or a dedicated publication receipt and define the UI disclosure/choice without assuming that moving to Trash revokes the public link.

Production implementation remains out of scope until explicitly entered.
