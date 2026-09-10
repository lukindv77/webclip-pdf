# WebClip — runtime production-entry selective-adoption reconciliation — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 8704480b2ec0df9a7a9753821407d6772dee858a`  
Canonical owner overlap: `P1-231 | ACTIVE` only where historical production-entry material crosses release-control authority  
Mode: **RESEARCH-ONLY / CURRENT-BASELINE RECONCILIATION**  
Production/runtime modification: **NONE**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche reconciles pre-P1-231 production-entry research with the current canonical project baseline. It does **not** revive or merge historical research branches wholesale. Its purpose is to establish a deterministic selective-adoption rule: retain still-valid runtime/data-plane invariants, revalidate source-facing claims against fresh `main`, preserve old physical evidence only as historical provenance unless exact reuse is independently justified, and reject stale authority/release framing.

The key result is stronger than the earlier assumption that old branches were merely stale by date. Most A/B/C/D/J0 runtime contracts remain useful because production source did not materially move between their historical baselines and current `main`. However, at least one material design conflict exists: the historical W5 auth-core target uses `chrome.identity.getRedirectURL()/launchWebAuthFlow()` and a `chromiumapp.org` redirect, while the current canonical WebClip requirement requires Authorization Code + PKCE with fixed redirect `https://oauth.yandex.ru/verification_code`. W5 therefore requires **split adoption**, not blanket reuse.

---

## 1. Current authority hierarchy

The current research policy requires each substantive tranche to start from fresh `main`, current requirements, current rationale, current architecture/contracts and current Registry ownership. Historical research is evidence/provenance, not current authority when it conflicts with these sources.

For this reconciliation the authority order is:

```text
USER_REQUIREMENTS.md
+ DECISIONS_AND_RATIONALE.md
+ current architecture/contracts
+ RESEARCH_REGISTRY.md owner/status authority
+ current production source
        > historical research source-spec/model/receipt
```

Historical material may contribute design hypotheses or previously measured browser behavior, but it cannot override a current requirement or silently authorize release/implementation.

Fresh current facts on baseline `8704480b...`:

- `RESEARCH_REGISTRY.md` says `P1-231 | ACTIVE` and explicitly records that earlier statements leaving P1-231 unallocated are historical only.
- `USER_REQUIREMENTS.md` requires Yandex Authorization Code + PKCE and fixed Redirect URI `https://oauth.yandex.ru/verification_code`.
- `DECISIONS_AND_RATIONALE.md` repeats PKCE + supported fixed redirect and no embedded Client Secret.
- `service-worker.js` uses `YANDEX_FIXED_REDIRECT_URI = 'https://oauth.yandex.ru/verification_code'`, posts the same redirect to Yandex authorization/token choreography, and still exposes the manual `WEBCLIP_YANDEX_FINISH_AUTH` boundary.
- `manifest.json` contains no `identity` permission.
- P1-231 S2 remains behind `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
- current P1-231 release generation is still blocked by the known PSL Windows portability problem; this reconciliation does not repair it.

---

## 2. Exact historical tranche identities

The following branch heads were read as provenance inputs, not as mutable current authorities.

| Historical tranche | Exact historical head | Relationship to current main | Selective-adoption disposition |
|---|---|---|---|
| A0/U0/J0 production-entry source contract | `e0993dc6098f67400605a452e9ceab8efd214392` | diverged; historical source baseline predates current P1-231 chain | retain core runtime/data migration invariants; reject stale P1-231/release framing; fresh source check required at implementation |
| A1/A2 authority/admission delta | `e5590470c2fe932ff4f0810f0e4844d09d4cdbdf` | diverged | retain exact-content -> P -> second-probe ordering; reject stale owner/status text; fresh source/browser proof required |
| B1 PDF cache v4 production-entry | `5d6294f6df85f8e547ca3ed41bc0c0af55f2f4d5` | diverged | retain immutable PDF-generation/cache invariants; historical Chrome fixture is provenance only |
| W5 auth-core production-entry | `63d979c3011b361c5edf51839b88d24db619464a` | diverged | **split**: retain generation/capability/anti-race invariants; reject `chrome.identity` redirect transport and historical workflow |
| C0/C1 production-entry delta | `35d362cbc87ba4f36c5bd76a4e65e4ac493120b3` | diverged | retain immutable remote-operation context/effect identity and started-unknown semantics; Yandex L5 remains future |
| D0-D2 production-entry finalization | `f7eec8eea98400d572c347cd3c1212ea8864c8dc` | diverged | retain F/JG/ER gating, same-P recovery, read-only reconciliation, CAS cutover rules; no provider authority implied |
| J0 v8 cross-wave schema package | `262fe7a9c00300c1f8ac6a65bc56c06ec40840d2` | diverged | retain proposed physical v8 schema candidate; fresh production migration + Chrome proof still required |

The branch names remain useful provenance locators only. Future implementation must bind any adopted clause to these immutable commit SHAs or to a newer canonical replacement, never to the moving branch name alone.

---

## 3. Source-freshness observation

Two historical baseline families were compared with current `main`:

```text
d4f5b268fa3f7ced5a7bc68da52784863d614138 -> 8704480b2ec0df9a7a9753821407d6772dee858a
  current main ahead by 26 commits

e971bb796e1eed8c295032ab439bd2a8ef5e0d1a -> 8704480b2ec0df9a7a9753821407d6772dee858a
  current main ahead by 23 commits
```

The observed changed paths across these ranges are project research/control documentation and deterministic research tooling, plus the Registry update that admitted P1-231. No production/runtime extension file appears in those comparison deltas.

This supports a narrow conclusion:

```text
historical current-source RED observations are not invalid merely because 23-26 research commits landed later
```

It does **not** support the stronger conclusion:

```text
historical branch is safe to merge or its old browser evidence closes current production
```

Every production implementation PR still begins from its own fresh exact `main` and re-inspects the affected source functions.

---

## 4. Selective-adoption classes

Every historical assertion is classified into one of five classes.

### A — current-compatible design invariant

May be carried forward as a candidate requirement for implementation after fresh conflict review.

Examples:

- A0 durable operation receipt/resource-reservation authority;
- U0 protocol/version incompatibility must fail closed rather than install a second authority instance;
- A1/A2 exact reviewed content -> worker probe -> durable P -> long preparation -> second probe -> effect;
- B1 create-once immutable PDF generation identity and exact bytes/hash binding;
- C/D started-unknown and exact effect/finalization identity;
- J0 service-worker-owned schema migration and passive-v8 before coordinated CAS activation;
- W5 distinct auth-attempt generation vs committed credential generation, generation-bound late-result rejection, capability truth, and reserved Authorization-header ownership.

### B — current-source observation requiring fresh implementation-time revalidation

May explain why a future change is needed, but cannot be copied as current truth forever.

Examples include current DB versions, missing target stores, old Boolean realm sentinels, exact current function names and exact current UI paths.

### C — historical physical/deterministic evidence

Old L2/L3 receipts remain provenance that a mechanism was once exercised on an exact historical source/browser pair. They may guide test design. They do not close a current production gate unless an explicit current contract permits reuse and exact source/artifact equivalence is proven.

### D — stale framing to reject

Must not be copied into current work:

- `P1-231 = NOT ALLOCATED`;
- an old baseline SHA presented as current authority;
- runtime cutover `Z` interpreted as release authorization;
- historical Chrome/provider success interpreted as S2 approval or V1 readiness completion;
- an old research branch name treated as an authoritative dependency.

### E — conflicting design requiring replacement

A historical design that conflicts with current canonical requirements cannot be selectively adopted in that form.

Current concrete member:

```text
W5 historical chrome.identity/chromiumapp.org redirect transport
```

The surrounding auth generation/capability model remains separable and potentially reusable.

---

## 5. A0/U0/J0 disposition

Retain as candidate invariants:

```text
WebClipOperationReceipts v1 has receipts + resourceReservations
unresolved authority is not evicted as ordinary capacity cleanup
legacy caller operationId does not become physicalOperationId
content/offscreen/page protocol versions are explicit
legacy Boolean content realm is not hot-overlaid with a second authority instance
URL existence of offscreen document is not compatibility proof
extension-page reload requires current operation-safety admission
Journal v8 structural migration has one schema owner
Journal page never invents missing schema in onupgradeneeded
schema-ready barrier precedes direct page reads
versionchange remains short; large projections/backfills are restartable post-open work
passive-v8 precedes coordinated authority-mode activation
```

Historical controlled Chrome IndexedDB cases remain useful mechanism evidence, especially around `versionchange`, blocking, rollback and old opener behavior. They are not a production migration receipt for a future implementation commit.

Reject as stale:

```text
P1-231 unallocated
historical exact main/Registry presented as current
any implication that A0/U0/J0 completion itself authorizes release
```

---

## 6. A1/A2 disposition

Retain the central authority sequence:

```text
reviewed exact content authority
-> exact current worker probe
-> durable physical operation P
-> long preparation
-> second exact probe
-> render/external-effect authority
```

Also retain fail-closed principles around document/navigation/selection generation and same-clientRequestId dedup to the same P.

The old Chrome fixture is historical evidence only. Exact future `documentId`, navigation, selection-revision and worker-restart behavior must be rerun against the production implementation commit.

---

## 7. B1 disposition

Retain:

```text
single structural migration owner
legacy v3 rows do not magically gain exact authority
worker-issued exact pdfGeneration
create-once payload/metadata keys
exact byteLength + SHA-256 before downstream effect admission
duplicate generation cannot overwrite different bytes
operation recovery may consume exact sealed G without a live tab
stale cleanup cannot delete a newer generation/pointer
partial/mismatched cache state fails closed
```

The historical Chrome IndexedDB fixture is a useful migration/transaction precedent, not current production closure.

---

## 8. W5 split-adoption finding

### 8.1 Useful invariants to retain

The historical W5 model contains several valuable architecture refinements independent of redirect transport:

```text
authAttemptGeneration != authGeneration
newer auth intent invalidates older callback/commit
committed credential has exact authRecordId + generation
late 401 may demote only the exact credential generation it observed
403 is not blanket invalid-auth authority
manual-token capability may be unknown rather than fabricated full
OAuth response scope can refine capability truth
caller cannot override worker-owned Authorization header
unknown token lifetime != never expires
disconnect invalidates both pending auth intent and current credential authority
secret/verifier values are not exposed in status
```

These can be adapted to the current fixed-redirect flow.

### 8.2 Historical transport that conflicts with current WebClip authority

The historical W5 target uses a redirect such as:

```text
https://<extension-id>.chromiumapp.org/yandex-oauth
chrome.identity.getRedirectURL(...)
chrome.identity.launchWebAuthFlow(...)
```

Current WebClip authority instead requires:

```text
Authorization Code + PKCE
redirect_uri=https://oauth.yandex.ru/verification_code
no Client Secret in extension
```

Current production source and manifest are aligned with that decision: fixed Yandex redirect is present and `identity` permission is absent.

Therefore a future auth-core implementation should **port the generation/capability state machine onto the fixed-redirect/manual confirmation-code transport** unless the canonical requirement is separately changed first. Research cannot silently replace the current product requirement merely because Chrome offers a convenient identity API.

### 8.3 Historical workflow is non-importable

The W5 historical branch contains `.github/workflows/w5-auth-core-research.yml`. It was branch-specific evidence infrastructure and uses `actions/checkout@v4` rather than the current repository's immutable action-pin discipline.

It must not be merged/cherry-picked into current `main`. Any future environment-bound W5 evidence should use current canonical CI conventions or an explicitly temporary bounded workflow that is retired before final merge when repository policy requires that pattern.

---

## 9. C0/C1 and D0-D2 disposition

Retain the remote-effect authority chain:

```text
exact source authority
-> durable P
-> sealed local PDF generation G/H/N
-> immutable account/auth/capability/root/publication context
-> durable exact remote effect admission
-> started-unknown before non-cancellable provider settlement
-> exact remote object/content verification
-> Journal/finalization CAS under current dataset/entry authority
```

Retain negative semantics:

```text
revoked F/JG/ER before start => zero new provider effect
start already won => later local clear cannot claim cancellation
verified remote effect + stale finalization authority => suppress local Journal finalization
missing local detail after durable P => recover same P, never mint replacement authority
pendingRemoteSaves != pendingRemoteMutations
reconciliation/read paths cannot create a new provider effect
unresolved authority is not GC'd merely because it is old
```

Provider-specific claims such as exact Yandex object revision/resource semantics remain L5 work and are not upgraded by this reconciliation.

---

## 10. J0 v8 schema disposition

The historical final v8 physical package remains a coherent **candidate**:

```text
PRESERVE:
  entries
  urlStats
  meta
  pendingAppends
  pendingDownloads
  pendingRemoteSaves
  importStaging

ADD:
  journalFinalizations
  pendingRemoteMutations
  urlStatsV2
  journalSummaries

ADD pendingRemoteSaves indexes:
  phase
  physicalOperationId
  finalizationId
  phaseUpdatedAt
  keep updatedAt

SEED META:
  datasetGeneration
  authorityMode=passive-v8
  urlIdentityMigration
  projection state/generations
  schemaContract marker
```

Still forbidden inside the `versionchange` transaction: full entry rewrite, remote-checkpoint rewrite, complete `urlStats` rebuild or summary rebuild.

This candidate is not a license to implement from the old branch. Future J0 production work must re-check every physical store/index/meta need against the then-current contracts and execute a current exact-source browser migration matrix.

---

## 11. Three-plane separation

Historical production-entry research mixed three kinds of progress too easily. The current canonical model keeps them independent.

### Plane R — runtime/data implementation

Conceptual sequence includes A0/U0/J0/A1/A2/B1/W5/C0/C1/D0-D2 and later runtime cutover nodes. A runtime node answers whether product state/data/effects have the required authority semantics.

### Plane C — P1-231 release-control

S0/S1 establish passive identity, generation, evidence, settlement, builder and shadow-verification machinery. S2 changes release authority and is fenced by explicit user approval.

### Plane X — actual qualification/release execution

Exact current package/runtime must still receive the applicable Chrome/Yandex qualification, blocker review, final decision, deterministic artifact verification, fresh-main recheck and publish choreography required by the current release policy.

No edge is permitted:

```text
R.complete -> S2.authorized
R.complete -> release.ready
historical_L3.pass -> current_release.ready
C.shadow_pass -> release.ready
```

---

## 12. Deterministic selective-adoption procedure

For each future runtime implementation PR:

1. Resolve fresh exact `main`, current Registry, `USER_REQUIREMENTS.md`, `DECISIONS_AND_RATIONALE.md` and applicable architecture/contracts.
2. Identify the exact immutable historical commit containing a potentially reusable clause.
3. Classify each candidate clause A/B/C/D/E; do not import a whole branch because some clauses are useful.
4. Re-inspect exact current production functions and data schemas touched by the planned implementation.
5. Reject any historical clause that conflicts with current requirements or current owner authority.
6. Restate adopted invariants in the current implementation/source-spec PR so review does not depend on a stale branch.
7. Add current deterministic negative-path tests for the implemented authority boundary.
8. Re-run physical/browser/provider evidence on the exact implementation commit whenever the claim crosses that boundary; historical evidence is not silently promoted.
9. Keep P1-231 release-control independent. Runtime progress cannot satisfy the S2 approval fence.
10. Merge only through current repository integrity/change-contract rules and fresh-head/main guards.

Forbidden shortcuts:

```text
git merge research/<old-tranche>
git cherry-pick <whole historical tranche sequence>
copy old workflow into main to reproduce evidence
copy old P1-231 status text
reuse old Chrome/Yandex pass because source "looks unchanged"
treat runtime cutover or research completeness as release authorization
```

Selective adoption is clause/contract reuse after current validation, not branch resurrection.

---

## 13. Physical evidence reuse rule

Historical physical evidence may be cited as provenance when all of the following are explicit:

```text
historical exact source SHA
historical exact browser/provider/tool version where relevant
historical case matrix
what mechanism it actually proved
what current claim it does NOT prove
```

It may count toward a current authoritative gate only if the current gate explicitly allows evidence reuse and independently verifies the required equivalence dimensions (for example exact package/runtime identity, applicable current contract generation, ancestry and latest-attempt semantics under P1-231).

A prose statement that the source is unchanged is not sufficient release evidence.

---

## 14. External research cross-check

External material was used as constraint/evidence, not as project authority.

### Chrome extension lifecycle

Chrome's current update-lifecycle documentation says an update is installed when the extension is idle; open extension pages prevent idle, while the MV3 service worker is event-driven. Chrome's service-worker lifecycle documentation separately emphasizes that worker globals disappear on shutdown and durable state must live in storage. This supports, rather than replaces, U0/A0 requirements for protocol-safe transitions and durable operation authority.

Sources:

- https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

### Offscreen document lifecycle

Chrome documents `runtime.getContexts()` as an existence lookup for offscreen documents and separately exposes create/close lifecycle. URL/context existence is therefore useful discovery information but is not a provider guarantee of application-level protocol/schema compatibility. WebClip's proposed explicit compatibility handshake remains an application correctness rule.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/offscreen

### IndexedDB migration

MDN and the W3C IndexedDB materials confirm that schema changes occur in `versionchange`/`upgradeneeded`, existing connections can block an upgrade, and applications must handle version changes/old openers. This is consistent with a single structural owner and cooperative close/fail-closed handling; it does not by itself prove the exact proposed WebClip v8 package.

Sources:

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://www.w3.org/TR/IndexedDB/all/

### OAuth/PKCE and redirect transport

Chrome's Identity API documents that `getRedirectURL()` yields a `https://<app-id>.chromiumapp.org/*` URL and that `launchWebAuthFlow()` completes when a provider redirects to that pattern. This proves the historical W5 transport is technically plausible in Chrome, but not that WebClip is required to use it.

Yandex documents Authorization Code requests with `state`, `code_challenge` and `code_challenge_method`, and its token response documents `scope` as optional and returned when OAuth grants a smaller set of rights than requested. Current OAuth security BCP for browser-based public clients requires Authorization Code + PKCE and discusses CSRF protection via PKCE/state. These sources support retaining the W5 PKCE/generation/capability concepts while leaving the WebClip-selected fixed redirect authoritative.

Sources:

- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://yandex.com/dev/id/doc/en/codes/code-url
- https://www.rfc-editor.org/rfc/rfc10017.html
- https://www.rfc-editor.org/rfc/rfc9700.html

A public GitHub discussion around Chrome-extension OAuth also illustrates that `launchWebAuthFlow()` integrations depend on an exact registered `chromiumapp.org` redirect and callback model; it is comparison evidence only, not a WebClip recommendation:

- https://github.com/pocketbase/pocketbase/discussions/1899

---

## 15. New finding and root-cause classification

The W5 redirect conflict is **not** a new root cause requiring a new P-code. It is a stale historical implementation-direction conflict created by reading an old research branch after current requirements were normalized.

Ownership remains with existing Yandex/auth and release-control owners. P1-231 remains the current owner only for exact release-generation/evidence authority; this tranche does not broaden P1-231 into ownership of runtime OAuth semantics.

The architectural corrective action is selective adoption + current-authority precedence, not a new owner.

---

## 16. Residual risks after this tranche

Research still does not prove that every historical runtime clause is implementation-optimal on a future source commit. In particular:

- A0/J0 cross-database durability and GC schedules still need production-code composition tests;
- A1/A2 exact browser document/selection generation needs current implementation + Chrome evidence;
- B1 exact PDF cache migration/hash/seal needs production implementation + current Chrome evidence;
- W5 generation/capability state machine must be redesigned around the fixed redirect/manual-code transport before source implementation;
- C/D provider-independent unknown-settlement logic needs production adapter tests;
- provider-specific Yandex semantics remain deferred to authorized L5;
- J0 v8 schema remains a candidate until implementation-time current-contract revalidation.

None of these residual risks is reduced by importing historical branches wholesale.

---

## 17. Current release-control state preserved

This tranche intentionally leaves the current release state unchanged:

```text
P1-231                 ACTIVE
S0-F generation gate   blocked-portability
S1 identity eligibility false
S1 settlement/equivalence candidate-ineligible
S2                      NOT AUTHORIZED
V1 readiness            NOT READY
official product ZIP    NOT BUILT
real Yandex L5          NOT RUN
manifest/version        UNCHANGED
release/tag/deployment  NONE
```

No historical runtime research result changes these facts.

---

## 18. Decision

The old production-entry branches are neither disposable nor directly mergeable.

The safe current interpretation is:

```text
A0/U0/J0  = selective design reuse + fresh source/browser validation
A1/A2     = selective design reuse + fresh source/browser validation
B1        = selective design reuse + fresh migration/hash/seal validation
W5        = SPLIT ADOPTION; keep generation/capability invariants, reject chrome.identity redirect transport
C0/C1     = selective remote-effect authority reuse; provider claims remain external
D0-D2     = selective finalization/recovery/CAS reuse
J0-v8     = candidate physical schema only; fresh implementation migration proof required
old L2/L3 = provenance, not automatic current closure
old branch/workflow = never wholesale import authority
runtime progress = never S2/release authorization
```

This is the durable handoff rule for future production-entry implementation research. The next useful research edge is to refine the W5 fixed-redirect auth state machine (attempt-generation, credential-generation, capability and late-result semantics) directly against current source/requirements, or to perform an equivalent current-main implementation-entry refinement for the first runtime node actually selected for production work. Neither step activates S2.