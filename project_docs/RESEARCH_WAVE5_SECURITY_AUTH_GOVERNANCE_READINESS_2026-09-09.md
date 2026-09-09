# WebClip — Wave 5 security / privacy / auth / public-link governance readiness — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/wave5-security-auth-governance-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / DEFENSIVE SECURITY ARCHITECTURE / IMPLEMENTATION-READINESS**  
Production implementation: **NOT STARTED**  
Real Yandex provider validation: **L5 DEFERRED TO FINAL EXTERNAL STAGE**

This tranche does not change production runtime, `manifest.json`, Registry status, version, build, tag, release or deployment.

Security scope is intentionally defensive only: confidentiality, integrity, minimization, credential/capability lifecycle, safe transfer and truthful authorization/publication state. It does not perform vulnerability scanning, exploit development, bypass research or offensive testing.

---

## 1. Executive result

Wave 5 has **18 primary ACTIVE owners** and this research assigns all 18 exactly once without allocating a new P-code:

### Contextual privacy / minimization

```text
P0-045  Incognito fail-closed contextual boundary
P0-066  durable/display URL confidentiality sanitizer
P0-075  host page is not trusted UI/control plane
P1-172  save metadata/user inputs bounded before DOM/IPC
P1-176  extension-page pre-IPC validation matching worker limits
P1-182  SelectionSnapshot durable privacy/fingerprints
```

### Auth capability lifecycle

```text
P1-161  bounded non-secret reauthorization return context + manual resume
P1-165  effective OAuth returned-state verification
P1-177  disconnect/re-auth + backup paused/resume generation semantics
P1-178  auth attempt + settings generation state machine
P1-191  manual-token replacement validate-before-generation-commit
P1-195  actual Yandex capability/scope truth
P1-196  401 demotion exact auth-generation fenced
```

### Remote/public governance

```text
P0-022  imported locator != destructive Yandex provenance
P0-069  deleting Journal entry with public link requires publication outcome
P1-138  pure Yandex observation separated from provisioning mutation
P1-164  per-entry public-link revoke durable/reconciled
P1-180  bulk destructive operations disclose public-link control loss
```

Supporting owners remain supporting rather than being moved into W5:

```text
P0-073/P0-074   immutable Yandex account/root/live operation context
P0-078           publication-policy generation/revocation (primary W1)
P1-184           exact remote object/content receipt (primary W1)
P1-193           optional host-permission user-owned flow (primary W2)
P1-198           worker-issued physical operation identity (primary W1)
P0-076           Journal generation/revision CAS (primary W1/W4 composition)
P1-168/P1-188    locator computation/import grammar (W6/W4 dependencies)
```

No P1-231 is allocated.

Wave 5 research state:

```text
owner partition                    COMPLETE
current-source RED proof           COMPLETE
standards/current-platform input   COMPLETE
cross-owner architecture           DEFINED
L2 deterministic model             PASS 60 cases
production source                  RED / NOT IMPLEMENTED
real Yandex provider semantics     EXTERNAL-REQUIRED / DEFERRED
real unmanaged Incognito QA        RELEASE-EXTERNAL / NOT RUN HERE
```

---

# Part I — source and standards boundary

## 2. Current-source observations that remain RED

### 2.1 P1-165 — generated OAuth `state` is not effectively verified

Current `startYandexOAuth()` already generates:

```text
state
codeVerifier
codeChallenge = S256(codeVerifier)
```

and persists the pending PKCE state in `chrome.storage.session`.

This is a valuable positive control.

However the current user flow opens an ordinary OAuth tab and later asks the user to copy a confirmation code back into Options. `finishYandexOAuth(code)` consumes the pending `clientId + codeVerifier`, but it does not receive the authorization redirect URL and therefore cannot compare a returned `state` with the exact pending attempt.

The existence of a random generated `state` is not equivalent to returned-state verification.

**Required direction:** use `chrome.identity.launchWebAuthFlow()` or an equivalent exact captured redirect mechanism so the extension receives the final redirect URL, verifies the exact redirect URI, verifies returned `state`, and only then exchanges the code under the same attempt generation.

### 2.2 P1-178 — OAuth pending state lacks immutable attempt generation

Current pending object contains client id, verifier, state and timestamps, but the lifecycle is still fundamentally one mutable `yandexOAuthPending` slot.

Required form:

```text
AuthAttemptReceipt {
  version,
  attemptGeneration AG,
  clientIdGeneration,
  clientId,
  redirectUri,
  state,
  pkceVerifierSecret,       // session-only; never durable diagnostics
  pkceChallenge,
  createdAt,
  expiresAt,
  phase
}
```

A later attempt AG2 must make every completion/cleanup for AG1 stale. Clearing pending state is compare-and-remove by AG, never unconditional deletion of the slot.

### 2.3 P1-191 — manual token replacement currently commits candidate before validation

Current manual-token path constructs an auth object and writes it as current auth before provider validation. It then performs an API read; on failure it clears auth.

This creates a window where an invalid candidate has already displaced an older working auth generation.

Required sequence:

```text
candidate token (ephemeral)
→ provider/account/scope validation using candidate only
→ candidate proof
→ atomic AuthGeneration commit
→ old generation superseded
```

Candidate failure leaves current auth untouched.

### 2.4 P1-195 — token presence / requested scopes are not actual capability truth

Current status reports connected from `Boolean(accessToken)`. It exposes a constant requested scope list (`YANDEX_SCOPES`) even though current auth state separately carries a provider token response `scope`, and the manual-token flow has no granted-scope proof at all.

A token string is not sufficient proof that the application currently has every capability needed for read/write/info operations.

Target capability receipt:

```text
YandexCapabilityReceipt {
  authGeneration ARG,
  accountUid,
  grantedScopes[],
  requiredScopesSatisfied,
  validationKind,
  validatedAt
}
```

`connected` may remain a UI convenience, but mutation admission consumes exact capability proof, not the convenience Boolean.

### 2.5 P1-196 — request response must be bound to the auth generation that sent it

`yandexApi()` currently obtains a token from mutable current auth and later returns/throws a response. A future 401 demotion must never clear whatever token happens to be current at response time.

Required request receipt:

```text
YandexRequestContext {
  contextId,
  authGeneration ARG,
  accountUid,
  root/config generation,
  tokenSecret       // ephemeral only
}
```

If request under ARG1 later returns 401 after ARG2 was committed:

```text
401(ARG1) != authority to clear ARG2
```

Only `currentAuthGeneration == response.authGeneration` permits demotion of current auth.

### 2.6 P1-138 — read-like flows must not hide provisioning

Observation and mutation are separate capabilities:

```text
observeYandex*()   // GET/list/status only; cannot create/ensure
ensureYandex*()    // explicit mutation, admitted as effect
```

`Test connection`, folder browse, status refresh and read-only reconciliation cannot silently create service folders merely because an implementation helper named `ensure*` is convenient.

A read result can explicitly report:

```text
missing-required-folder
not-provisioned
read-degraded
```

without making the read itself mutate external state.

### 2.7 P0-045 — contextual popup reads normal-profile state before privacy classification

Current popup runs `loadBackupStatus()` immediately after rendering the extension version. Active-tab resolution and `Tab.incognito` classification happen later and only inside source-sensitive button handlers.

The contextual private popup can therefore receive/render shared normal-profile backup history before any privacy gate.

Current optional-host permission flow likewise validates only that the source is HTTP(S), discovers private-page frame origins and can send those origins to `chrome.permissions.request()`.

Target invariant:

```text
ContextualTabReceipt {
  tabId,
  privacy: normal | incognito | unknown,
  url/document receipt as needed,
  classificationGeneration
}
```

Every contextual popup/Action/frame-permission operation obtains this receipt first.

For `incognito` or `unknown`:

```text
normal Journal/urlStats reads           forbidden
normal backup-history projection        forbidden
shared optional-host permission request forbidden
frame-agent enable                       forbidden
private URL/title/origin durable trace   forbidden
```

The result is a fixed neutral private/unknown state.

### 2.8 P0-066 — one exact URL string currently serves incompatible roles

Current source URL is useful for exact operational provenance, but the same raw string reaches PDF header/link, pending state, Journal and portable backup. Query, fragment and URL userinfo are therefore eligible to become durable archival data.

Target split:

```text
OperationalSourceUrlReceipt
  exact source authority or privacy-preserving exact-equality digest
  ephemeral / capability-classified

DurableDisplayUrl
  HTTP(S) only
  no userinfo
  no forbidden query capability material
  no fragment
  bounded
```

Do not weaken P0-070/P0-080 source identity by using a lossy display URL as generation authority.

### 2.9 P1-182 — bounded locator text is still reversible private data

Current SelectionSnapshot schema includes selected text plus parent/previous/next plaintext and raw `href/src` context. Length bounds do not convert those values into minimum-disclosure metadata.

Target durable schema is versioned separately from ephemeral current-page matching:

```text
SelectionSnapshot durable v4+
  structural bounded signals
  privacy-preserving fingerprints
  no surrounding raw plaintext
  no raw sensitive href/src capability material
```

If minimizing features lowers restore confidence, restore becomes ambiguous/degraded under P1-001 rather than reintroducing raw secrets.

### 2.10 P1-172 — content-side input is bounded too late

Current file-comment flow captures `textarea.value.trim()` and builds metadata without an early UI/content admission limit. `buildSaveMeta()` also copies `document.title`, `location.href` and serializes current selection before worker validation.

Required:

```text
user/page-controlled field
→ bounded read/admission
→ bounded normalization
→ only then snapshot/DOM/IPC materialization
→ worker revalidates independently
```

This is not merely an IPC payload limit; it bounds computation/memory before IPC.

### 2.11 P1-176 — extension pages rely too heavily on worker limits

Options has strong bounds for settings import files and async read behavior, but auth text inputs (`clientId`, manual token, confirmation code and similar mutation values) are sent to the worker after `trim()` without one shared extension-page bounds contract matching worker acceptance.

Worker validation remains mandatory, but extension pages should reject over-bound input before allocation/IPC and display the same limit semantics.

### 2.12 P0-078 supporting dependency — publication checkpoint stores a Boolean, not generation authority

Current remote checkpoint stores:

```text
createPublicLinks: Boolean(createPublicLinks)
```

Recovery can later use that Boolean to decide whether to publish.

This is incompatible with P0-078 ABA semantics:

```text
PG1 enabled
PG2 disabled
PG3 enabled
```

PG1 cannot silently regain publication authority merely because the current Boolean is true again.

W5 does not move P0-078 out of W1. It consumes the W1 publication-generation receipt for the concrete P0-069/P1-164/P1-180 governance below.

---

## 3. Current external standards / platform input

External sources are design constraints, not substitutes for WebClip source proof.

### 3.1 OAuth Security BCP — RFC 9700

Current IETF OAuth Security Best Current Practice requires redirect-based clients to prevent CSRF and strongly defines transaction-specific PKCE/state handling. Public clients use PKCE; `state` remains a recognized one-time CSRF token when used and must be bound to the user-agent session.

Reference:

`https://www.rfc-editor.org/rfc/rfc9700`

### 3.2 Browser-Based Applications BCP — RFC 10017, August 2026

The current browser-based-applications BCP recommends Authorization Code + PKCE as the baseline pattern and treats browser-hosted credential/capability handling as a distinct security architecture problem.

Reference:

`https://www.rfc-editor.org/rfc/rfc10017.html`

WebClip is an MV3 browser extension rather than an ordinary site SPA, but the code+PKCE and in-browser capability-minimization principles are directly relevant.

### 3.3 Chrome Identity API

Chrome documents `chrome.identity.launchWebAuthFlow()` as the mechanism for non-Google auth flows. It captures a redirect matching the extension redirect pattern and returns the final redirect URL to the extension.

Reference:

`https://developer.chrome.com/docs/extensions/reference/api/identity`

This is the preferred P1-165 architecture because it turns returned redirect/state into an extension-observed receipt instead of a manually copied code-only flow.

### 3.4 Chrome Incognito model

Current project manifest does not specify `incognito`, so Chrome's default extension behavior remains `spanning` unless the manifest is intentionally changed. In that model the shared extension process receives Incognito-tab events carrying the Incognito classification; persistent/shared extension state therefore requires contextual application-level isolation.

Reference:

`https://developer.chrome.com/docs/extensions/reference/manifest/incognito`

No W5 recommendation changes the manifest mode merely to hide application-level privacy bugs.

### 3.5 Yandex OAuth

Current Yandex OAuth documentation supports authorization code, `state` and PKCE `code_verifier` / `code_challenge` / `S256` style flow. Yandex documentation also describes the token as carrying account/application/permission capability information.

References:

`https://yandex.com/dev/id/doc/en/codes/code-url`

`https://yandex.com/dev/id/doc/en/concepts/ya-oauth-intro`

Therefore WebClip should prove account/scope capability rather than infer it from token presence.

---

# Part II — target authority model

## 4. Never create one generic `securityGeneration`

Wave 5 needs at least these independent authority domains:

```text
PrivacyContextReceipt      PC
AuthAttemptGeneration      AG
AuthGeneration             ARG
PublicationPolicyGeneration PG   // primary owner P0-078 in W1
PublicationEffectReceipt   PE
DurablePrivacySchema       DPS
```

They solve different questions:

```text
PC   may this contextual extension operation inspect shared profile state?
AG   which exact OAuth authorization attempt does this callback belong to?
ARG  which exact token/account/scopes capability made this request?
PG   which exact user publication policy authorized admission?
PE   what is actually known about remote public/private state?
DPS  which minimum-disclosure durable representation is allowed to persist?
```

A matching `ARG` does not authorize publication; matching `PG` does not prove remote content/object identity; a normal `PC` does not prove Yandex scopes.

---

## 5. PrivacyContextReceipt — P0-045

Conceptual form:

```text
PrivacyContextReceipt {
  version: 1,
  tabId,
  privacy: normal | incognito | unknown,
  browserDocumentId?,
  observedUrlClass,
  classificationGeneration,
  observedAt
}
```

Rules:

1. Fresh bounded tab read is preferred for every contextual operation.
2. Event-provided `Tab` may be consumed only while bound to the same Action generation; do not down-convert the event into URL string and lose `incognito`.
3. `privacy=incognito` and `privacy=unknown` both fail closed for normal persistent/history projection.
4. Privacy classification occurs before Journal/urlStats/backup reads and before optional-host permission discovery/request.
5. No private-page origin can be converted into shared optional-host permission state.
6. Late Action repair reacquires or consumes a generation-bound PrivacyContextReceipt; it cannot re-enter normal history merely because the URL string is still known.

### Private contextual popup contract

Allowed:

```text
extension version
fixed text: private mode
non-sensitive global help/settings navigation explicitly initiated by user
```

Not automatically projected:

```text
normal backup success/failure history
normal Journal saved-date/day-count state
normal remote root/folder path history
private-page frame-origin permission candidates
```

---

## 6. AuthAttemptReceipt — P1-165/P1-178

Preferred new flow:

```text
user explicitly clicks Connect
→ validate/bound clientId
→ mint AG
→ generate state + PKCE verifier/challenge
→ persist session-only AuthAttemptReceipt(AG)
→ launchWebAuthFlow(auth URL)
→ capture final redirect URL
→ compare exact redirect + returned state against AG
→ extract code
→ exchange code with AG verifier
→ obtain candidate token response
```

No auth generation is current yet merely because remote exchange returned a token.

### Attempt cleanup

All cleanup is exact:

```text
remove pending only if current.AG == completing.AG
```

A stale AG1 callback/timeout/cleanup cannot consume AG2.

### OAuth result classes

Preserve the earlier research distinction:

```text
validation-failed
redirect-cancelled
redirect-outcome-unknown
state-mismatch
exchange-outcome-unknown
candidate-token-received
candidate-local-validation-failed
auth-committed-reconciliation-pending
fully-reconciled
```

Do not collapse every post-exchange failure into “authorization failed”.

---

## 7. AuthGeneration + YandexCapabilityReceipt — P1-178/P1-191/P1-195/P1-196

A validated token produces immutable capability metadata:

```text
AuthGenerationReceipt {
  version: 1,
  authGeneration: ARG,
  source: oauth | manual,
  clientIdGeneration?,
  accountUid,
  grantedScopes[],
  requiredScopesSatisfied,
  validationKind,
  validatedAt,
  expiresAt,
  tokenSecretRef/session capability
}
```

The token itself remains session-secret data and is never copied into durable OperationLog/Journal/reconciliation metadata.

### Manual token

```text
old ARG remains current
candidate token validated separately
→ account proof
→ scope proof
→ only then commit ARG-next
```

Failure leaves old ARG current.

### 401 demotion

Every authenticated request records the safe generation metadata of the exact context that supplied the token.

```text
request Q used ARG1
ARG2 becomes current
late Q returns 401(ARG1)
→ record ARG1 failure
→ DO NOT clear ARG2
```

Only an exact current-generation 401 may demote current capability.

### Capability truth

Required scopes for a logical operation are explicit input to admission. If granted scope proof is incomplete:

```text
connected-but-insufficient-scope
or
capability-unknown
```

not ordinary full capability.

---

## 8. Disconnect / reauthorization — P1-161/P1-177

Disconnect is an auth-generation transition, not `token=null` only.

It must:

1. invalidate current auth capability by exact generation;
2. invalidate account/status caches tied to that generation;
3. pause backup/scheduler operations that need the old generation;
4. preserve any already-admitted unknown external effects as separate receipts;
5. preserve only bounded non-secret reauthorization return context.

Conceptual return context:

```text
ReauthReturnContext {
  destination,
  sealedPdfGeneration?,
  sourceReceiptRef?,
  operationClass,
  reason,
  createdAt,
  expiresAt
}
```

Must NOT contain:

```text
access token
PKCE verifier
signed transport URL
raw sensitive source URL
selected page plaintext
file comment unless strictly required and separately approved
```

After reauthorization:

```text
NO automatic upload replay
```

User explicitly resumes. Resume mints a fresh physical operation generation and may consume an old sealed PDF generation only if W1 exact-artifact/source policy explicitly permits that recovery class.

---

# Part III — public-link governance

## 9. Observation, policy and external effect are different truths

Publication has three distinct states:

```text
PublicationPolicyReceipt    PG / what the user authorized
PublicationAdmissionReceipt PA / whether network mutation was admitted
PublicationEffectReceipt    PE / what is known externally
```

Do not infer one from another.

### Example

```text
PG7 enabled
publish admitted under PG7
user disables → PG8 disabled
network outcome becomes unknown
```

PG8 proves new publication admission is forbidden. It does NOT prove the already-admitted PG7 remote effect did not happen.

---

## 10. Per-entry revoke — P1-164

Conceptual lifecycle:

```text
entry has verified-public PE
→ explicit user revoke confirmation
→ capture exact Journal JG/ER + remote object/account/context receipt
→ persist unpublish EffectIntent before mutation
→ admit exact unpublish network effect
→ settle/reconcile
```

Terminal classes:

```text
verified-private
still-public
unknown
manual-resolution
```

Local entry metadata changes to private only after `verified-private` or an explicitly documented detached/unknown representation. A transport timeout is not a successful revoke.

---

## 11. Delete with public link — P0-069

Local Journal deletion cannot silently abandon publication control.

If the entry owns verified or unresolved public publication authority, user-facing deletion must choose an explicit policy:

```text
A. revoke-first
   local destructive finalization after verified-private

B. keep-public-explicitly
   user intentionally deletes local Journal control while acknowledging remote public access may remain

C. unresolved
   local operation cannot claim fully deleted/private while revoke outcome is unknown
```

This composes with P0-076: stale old entry generation cannot revoke/delete publication authority of a replacement row that happens to reuse the textual id.

---

## 12. Bulk destructive disclosure — P1-180

Before a bulk clear/replace that affects entries with publication authority, produce a bounded impact summary:

```text
public entries affected
verified-public count
publication-unknown count
revoke action chosen
what control/history will be detached or lost
```

The summary must not require unbounded enumeration in UI. Use bounded aggregate/count + explicit exceptional rows when required.

If the chosen action is revoke-first, each public object remains an independently owned external-effect receipt; clearing the Journal does not mean those remote operations were cancelled.

P0-072 remains the cross-cutting external-side-effect owner.

---

# Part IV — imported provenance and read/mutate separation

## 13. Imported Yandex metadata — P0-022

Portable fields such as:

```text
remotePath
publicUrl
resourceId
accountUid
rootPath
```

are historical descriptors after import.

They do not authorize:

```text
move
trash
delete
unpublish
rename
replace
```

Conceptual imported form:

```text
HistoricalRemoteDescriptor {
  source: import,
  historical: true,
  ...display fields,
  destructiveCapability: false
}
```

Destructive authority can be obtained only by a new live-provider proof under exact account/root/object context:

```text
LiveRemoteAuthority {
  account/root context receipt,
  exact object identity proof,
  provider observation receipt,
  allowed operation class
}
```

Same path/size, or merely re-observing a resource id in the current account, is not automatically enough unless the corresponding existing owner contract says it is exact.

This is a direct W4/W5 boundary: W4 normalizes portable provenance; W5 controls when it can become live capability.

---

## 14. Pure observation — P1-138

Required API partition:

```text
observeDiskStatus(context)
observeResource(context, identity)
listFolder(context, identity)

ensureServiceFolders(context)
createFolder(context, ...)
```

The first group has a no-mutation invariant. The second group requires effect admission and reconciliation semantics.

UI should be able to tell the user:

```text
Connected, required WebClip folders are missing.
```

without creating them during a status refresh.

---

# Part V — durable privacy schemas

## 15. URL roles — P0-066

One versioned helper family should define:

```text
parseOperationalSourceUrl()
makeOperationalUrlEqualityReceipt()
makeDurableDisplayUrl()
makeDurableLinkTarget()
makeDiagnosticUrlSummary()
```

These are deliberately separate.

### Durable-display baseline

Default durable source URL projection should exclude:

```text
userinfo
fragment
credential/session/signature query material
non-HTTP(S) schemes
```

Whether some non-sensitive query keys are retained is a product/schema policy. The secure baseline is no query unless an allowlist/purpose exists.

Do not use a blacklist of parameter names as the only secret detector.

### Migration

A future Journal schema migration can stop new propagation and minimize current local records. It cannot claim to erase:

```text
old user-exported JSON
old external Yandex backup objects
old already-created PDFs
```

Those are separate external artifacts.

---

## 16. SelectionSnapshot durable v4 — P1-182

Split ephemeral resolver features from durable portable features.

### Ephemeral current-document resolver feature

May temporarily inspect bounded page values required to resolve the current user action, under P0-075/P1-168 limits.

### Durable portable locator

Must contain only bounded minimum-disclosure signals, e.g.:

```text
tag / structural path grammar
versioned frame path
safe ordinal/index features
non-reversible fingerprints of selected text/context
bounded feature-presence flags
no raw sibling/parent plaintext
no raw sensitive href/src
```

Fingerprint design needs an explicit threat model; a plain unsalted hash of low-entropy strings is not automatically confidential. Production should prefer keyed/session- or installation-bound fingerprints where portability requirements permit, or other non-reversible coarse features.

If portable cross-install restore requires stable fingerprints, document dictionary-attack limitations and minimize input entropy/value exposure accordingly.

This design must compose with P1-001 ambiguity and P1-188 versioned imported selector grammar.

---

# Part VI — pre-IPC bounds and host trust

## 17. Shared field-limit contract — P1-172/P1-176

Define one pure limits module or exact duplicated protocol constants consumed by:

```text
content.js
frame-agent.js
popup.js
options.js
journal.js
service-worker.js
```

For every field:

```text
limit
normalization
empty policy
error code
whether truncation is allowed or reject-overflow is required
```

Sensitive credentials and destructive identifiers should reject overflow rather than silently truncate into a different authority value.

### Content/page path

Bound page-controlled values before expensive operations:

```text
document title
URL text copied for display
file comment
locator strings/context
resource labels
selection serialization
```

### Extension-page path

Bound before `chrome.runtime.sendMessage()`:

```text
OAuth client id
verification/auth callback values
manual token
folder name/path
public-link/destructive selection ids
settings mutation values
```

Worker independently revalidates all values.

---

## 18. Host-page boundary — P0-075

The host page is data input, not control authority.

Sensitive operations must be admitted by extension-owned UI/receipt:

```text
credential commit
optional host permission request
public-link publish/revoke
remote destructive action
```

Page synthetic events, page-visible markers or `postMessage` cannot authorize them.

Existing isolated-world controls and inert print representation remain positive controls and must not be weakened.

---

# Part VII — implementation dependency graph

## 19. Recommended W5 production tranches

No production implementation is performed here. Preferred order:

```text
S0  shared security protocol primitives + field limits
 ↓
S1  PrivacyContextReceipt + contextual popup/Action fences
 ↓
S2  durable URL representation + SelectionSnapshot privacy schema foundation
 ↓
A0  OAuth AuthAttemptReceipt + launchWebAuthFlow redirect/state capture
 ↓
A1  candidate capability validation + AuthGeneration commit
 ↓
A2  manual-token validate-before-commit + exact 401 demotion
 ↓
A3  disconnect/reauth/backup-generation choreography
 ↓
R0  pure Yandex observe vs explicit ensure/create split
 ↓
P0  consume W1 publication-policy generation in publish admission
 ↓
P1  per-entry revoke + delete public-link governance
 ↓
P2  bulk destructive publication-impact governance
 ↓
D0  imported historical descriptor -> live destructive authority proof boundary
 ↓
Z0  cross-wave closure sweep + external-validation preparation
```

### Why privacy groundwork precedes OAuth

OAuth improvements should not be added while contextual Incognito paths can still project shared auth/backup state or while extension inputs can allocate arbitrarily before worker bounds.

### Why auth capability precedes W1 C0/C1 closure

W1 C0 can freeze an immutable Yandex context only after the auth subsystem can identify which exact validated auth capability it is freezing.

### Why publication revoke follows W1 P0-078

Per-entry unpublish must consume the exact policy/effect model rather than introduce an independent Boolean publication authority.

---

# Part VIII — cross-wave Change Impact

## 20. W1 impact

W5 **refines prerequisites** for W1 remote implementation; it does not replace W1 ownership.

Before W1 C0/C1 production closure, context should consume:

```text
ARG
accountUid
validated granted scopes
config/root generation
publication PG
```

not merely a token string plus current config.

The planned W1 `pendingRemoteSaveV2` should therefore reference safe auth/capability generation metadata and never durably contain the token secret.

P0-078's publication policy generation remains W1 primary ownership.

---

## 21. W2 impact

P0-045 privacy classification must be an input to W2 optional-permission/frame-agent lifecycle.

A perfect frame-session generation does not authorize operation on an Incognito target.

W2 P1-193 prompt lifecycle remains user-owned; W5 only says a private/unknown contextual source never reaches that prompt admission.

---

## 22. W3 impact

P1-182 introduces a durable SelectionSnapshot schema change that must preserve W3 selection/restore fidelity semantics.

Do not patch W4 serialization only and leave W3 resolver interpreting removed features as if they still existed.

Required composition:

```text
EphemeralSelectionFeatures
→ durable privacy transform
→ SelectionSnapshot v4
→ W3 truthful restore confidence/ambiguity
```

---

## 23. W4 impact

W4 already defines portable provenance and versioned locator grammar. W5 adds confidentiality/capability semantics.

Because planned W1/J0 Journal v8 is not yet implemented, the correct production plan is to integrate these schema fields into that same forward migration plan where practical rather than immediately schedule v9.

Potential v8 fields/metadata to align before implementation:

```text
durableUrlSchemaVersion
selectionSnapshotSchemaVersion
historicalRemoteProvenanceVersion
datasetGeneration / ER from W1/W4
urlStats generation from W4
```

OperationLog remains a separate DB/migration domain.

---

# Part IX — deterministic model and source gate

## 24. L2 model

Durable model:

```text
project_tools/test_wave5_security_auth_governance_model.js
```

GitHub Actions execution receipt:

```text
run      34356360251
job      102481938329
commit   00d7f9671520fceb92e1d58700b42b41d1a7ce0f
runner   Ubuntu 24.04.5 / ubuntu-24.04
Node     v22.23.2
result   Wave 5 security/auth governance model: PASS; cases=60
```

The temporary workflow used only to obtain this execution receipt was removed from the branch immediately afterwards.

Covered deterministic schedules include:

1. normal vs Incognito vs unknown contextual history admission;
2. private source cannot request shared host permission;
3. AG1 redirect cannot complete AG2 slot;
4. returned state mismatch rejected;
5. exact AG compare-and-remove;
6. required-scope proof is explicit;
7. late 401(ARG1) cannot clear ARG2;
8. current-generation 401 can demote that exact generation;
9. bad manual token leaves prior auth current;
10. validated manual token atomically becomes new ARG;
11. reauth context excludes credentials and auto replay;
12. fresh physical operation required on manual resume;
13. pure observation performs zero provisioning mutation;
14. PG disable invalidates old not-started publish authority;
15. ABA re-enable cannot resurrect old PG;
16. publication effect `unknown` stays unknown;
17. delete with unresolved public revoke cannot claim full local deletion;
18. explicit keep-public remains distinguishable from revoke success;
19. bulk impact summary counts publication authority;
20. imported descriptor has no destructive capability;
21. wrong live resource identity does not upgrade imported authority;
22. exact live provider proof can create capability;
23. durable URL removes userinfo/query/fragment;
24. operational equality authority remains separate from display URL;
25. durable locator contains no raw surrounding/href/src secrets;
26. pre-IPC input bounds reject over-limit credential fields;
27. extension-owned gesture receipt, not host event trust, authorizes sensitive command;
28. disconnect pauses bound backup and reauth requires manual resume;
29. authority domains remain independent.

---

## 25. SOURCE acceptance gate

Target source gate:

```text
project_tools/test_wave5_security_auth_governance_source.js
```

This file is intentionally **RED on current main**. It asserts target production signatures such as:

```text
captured OAuth redirect/state
AG / ARG generations
provider-validated scopes
manual candidate validation before commit
401 generation fence
pure observe vs ensure APIs
PrivacyContextReceipt / Incognito contextual fence
durable/display URL split
SelectionSnapshot privacy v4+
publication PG + unpublish/revoke path
historical imported remote authority separation
manual reauth resume
pre-IPC limits
```

It was not run as a passing production test in this research tranche.

---

# Part X — acceptance matrix by owner

## 26. P0-045

Required closure:

1. Contextual popup resolves PC before automatic normal-profile history/status reads.
2. Incognito/unknown Action performs zero normal Journal/urlStats reads.
3. Startup global Action refresh filters private/unknown tabs before history work.
4. Late repair remains privacy-generation bound.
5. Private iframe origins never reach shared permission request.
6. Worker frame-enable fresh-checks target privacy.
7. Normal-profile behavior preserved.
8. Real unmanaged Chrome with Allow in Incognito enabled required release QA.

## 27. P0-066

Required closure:

1. Operational exact URL authority remains possible.
2. Durable PDF/Journal/recovery/export URL is policy-safe.
3. PDF visible text and hyperlink annotation both use safe target.
4. Imported URL goes through same durable contract.
5. Historical external artifacts are not falsely claimed scrubbed.
6. Non-HTTP(S) durable links fail closed.

## 28. P0-075

Required closure:

1. Credentials/permission/publication actions require extension-owned authority.
2. Host synthetic interaction does not create authorization.
3. Page-visible markers are not capability tokens.
4. Existing isolated/inert print safety remains.

## 29. P1-172 / P1-176

Required closure:

1. Bounds apply before expensive DOM/string/snapshot work.
2. Extension pages reject oversized mutation values before IPC.
3. Worker independently validates same or stricter contract.
4. Credential/identity values reject overflow rather than truncate.
5. Error codes/messages remain bounded.

## 30. P1-182

Required closure:

1. No raw neighbor/parent plaintext in durable locator.
2. No raw sensitive href/src in durable locator.
3. Include/Exclude parity.
4. local/same-origin/remote-frame parity.
5. legacy read compatibility does not re-export raw data.
6. minimized feature collision becomes ambiguous/fail-closed.
7. local export/Yandex backup/import all use central durable serializer.

## 31. P1-161

Required closure:

1. return context bounded and non-secret;
2. no automatic upload replay;
3. explicit user resume;
4. fresh physical operation generation;
5. old sealed artifact only reused under exact W1 recovery contract.

## 32. P1-165 / P1-178

Required closure:

1. exact redirect capture;
2. exact redirect URI;
3. returned state compared;
4. PKCE S256 preserved;
5. AG exact lifecycle;
6. stale completion/cleanup rejected;
7. post-exchange partial commit states truthful.

## 33. P1-177

Required closure:

1. disconnect exact ARG transition;
2. account/status cache generation invalidated;
3. backup paused under old generation;
4. already-admitted external unknown effects preserved;
5. reauth does not silently auto-resume old side effects.

## 34. P1-191 / P1-195 / P1-196

Required closure:

1. manual candidate validate-before-commit;
2. old auth survives candidate failure;
3. account and actual granted scopes proven;
4. status distinguishes insufficient/unknown capability;
5. every authenticated request tied to ARG;
6. late 401 cannot clear newer ARG;
7. current ARG 401 can demote exact current capability.

## 35. P0-022

Required closure:

1. imported remote fields are historical only;
2. no destructive operation accepts them directly;
3. exact live provider proof required for destructive capability;
4. account/root mismatch fails closed;
5. replacement at same path cannot inherit old destructive authority.

## 36. P0-069 / P1-164 / P1-180

Required closure:

1. public state represented by effect receipt, not Boolean only;
2. revoke has durable intent before network mutation;
3. revoke timeout is unknown, not success;
4. delete exposes revoke-first vs keep-public explicitly;
5. bulk clear/replace discloses affected publication control;
6. external receipts survive local generation replacement where required;
7. no local operation falsely claims remote private state.

## 37. P1-138

Required closure:

1. pure status/list/browse paths contain no provisioning mutation;
2. missing structure returned as observation;
3. create/ensure requires explicit mutation admission;
4. bounded deadlines retained;
5. read errors do not trigger hidden create fallback.

---

# Part XI — external closure boundary

## 38. What L2/L3 can prove before Yandex L5

Local/source/browser evidence can prove:

```text
AG/ARG/PG generation semantics
redirect-state parsing logic
Incognito contextual fail-closed logic
pre-IPC bounds
durable serializer minimization
manual token commit ordering
401 generation compare logic
read-vs-ensure call graph
publication intent/reconciliation state machines
```

## 39. What remains real-provider external proof

Do not locally upgrade these to provider PASS:

```text
actual Yandex granted-scope reporting semantics
actual account identity fields used for capability receipt
actual token revocation/401 behaviors across tested account changes
actual publish/unpublish remote settlement and metadata semantics
actual public-link revocation confirmation
actual object identity continuity required by destructive flows
```

These remain part of the final Yandex L5 stage.

---

# Part XII — conclusion

For exact baseline `d4f5b268fa3f7ced5a7bc68da52784863d614138`:

```text
W5 owner coverage              COMPLETE
W5 implementation architecture DEFINED
W5 L2 model                     PASS / 60 cases
W5 source implementation        RED
new P-code                      NO
P1-231 allocation               NO
production changes              NO
Registry status changes         NO
release readiness change        NO
Yandex L5                       DEFERRED
```

The dominant W5 architectural principle is:

> **A secret string, a contextual source, a user policy and a remote observation are four different kinds of authority. WebClip must preserve their exact generations and only compose them at explicit admission/settlement boundaries.**

The next project-wide research tranche after W5 is Wave 6: performance / boundedness / maintenance / scalability. After W6, a final cross-wave reconciliation should re-evaluate W1–W6 schema/migration and implementation order before production work starts.
