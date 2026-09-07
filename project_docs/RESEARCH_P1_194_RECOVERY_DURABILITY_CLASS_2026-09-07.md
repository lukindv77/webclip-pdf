# P1-194 — truthful recovery durability class under browser storage eviction

Date: 2026-09-07

Branch: `research/p1-194-recovery-durability-class-2026-09-07`

Canonical baseline at branch creation:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`
- canonical `service-worker.js` Git blob = `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`
- `manifest.json` version = `0.9.8`
- minimum Chrome = `118`

Registry owner:

> `P1-194 | ACTIVE | Recovery durability class must be truthful about browser storage eviction; ordinary IDB commit cannot be reported as guaranteed recovery unless protection is proven.`

This checkpoint is architecture/model research only. It does **not** change production runtime, `manifest.json`, Registry status, release readiness, version, tag, or release process.

## 1. Research question

WebClip already uses IndexedDB as the durable state boundary for many restart/recovery workflows. That word is useful when it means "the state is no longer only in a Manifest V3 worker global and can survive worker/page restart while the extension-origin storage still exists".

It is not sufficient evidence for a stronger statement such as "recovery is guaranteed".

P1-194 asks a narrower question:

> What durability class may WebClip truthfully report after a local recovery checkpoint commits, given that Chrome may evict extension-origin web storage under storage pressure unless protection is proven?

The owner is not about transaction atomicity. Existing transaction/revision/CAS owners remain authoritative for whether a checkpoint was committed correctly. P1-194 is about the *retention/failure-domain claim* that can be made after that commit.

## 2. Current canonical source evidence

### 2.1 `manifest.json` does not grant `unlimitedStorage`

The canonical manifest currently grants:

- `activeTab`
- `scripting`
- `downloads`
- `debugger`
- `offscreen`
- `storage`
- `alarms`
- `contextMenus`
- `tabs`

It does **not** grant `unlimitedStorage`.

This research does not propose silently adding that permission. Whether WebClip should request it is a separate product/permission decision.

### 2.2 Runtime already observes Chrome persistence state

`service-worker.js` already has `getStorageHealth()` and calls `navigator.storage.persisted()` when supported. The result is returned as `persisted` together with quota/usage/free-space diagnostics.

That is a useful positive control: WebClip already has a source of Chrome-side protection evidence.

However, the current result is health/diagnostic information. The source does not define an explicit recovery durability class and does not bind recovery claims to `persisted === true`.

### 2.3 User-visible flow already requests persistence explicitly

`options.js` already exposes an explicit user action that calls `navigator.storage.persist()` and then refreshes storage health.

The current UI truthfully distinguishes:

- Chrome confirmed persistent storage;
- Chrome did not confirm persistent storage;
- persistence status unavailable.

`options.html` also explains that Chrome may reject the request and WebClip then continues with the ordinary storage policy.

This is another positive control. P1-194 should compose with it rather than invent a second persistence mechanism.

### 2.4 Recovery architecture uses stronger "durable" / "guaranteed" language

The canonical architecture uses local IndexedDB checkpoints extensively for Journal/recovery state such as pending appends, pending downloads, pending remote saves, staged import/recovery data and related receipts.

Several architecture contracts intentionally use "durable" to distinguish a committed checkpoint from volatile worker memory. One local-download recovery passage also reasons about whether a Journal recovery checkpoint is "guaranteed" before relying on it.

The missing boundary is that an IDB transaction completing successfully proves transaction settlement/visibility for the current extension-origin storage. It does **not**, by itself, prove immunity from later browser storage eviction.

Therefore the architectural defect is not "IndexedDB is wrong". The defect is a semantic promotion:

`IDB transaction committed`

must not imply

`recovery storage is eviction-proof / guaranteed`.

## 3. Current Chrome platform evidence

Official Chrome extension documentation, checked on 2026-09-07:

- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- https://developer.chrome.com/docs/extensions/reference/permissions-list

The Chrome documentation states that extension-origin web storage is subject to normal quota restrictions by default and can be evicted under heavy storage pressure. It identifies two protection mechanisms relevant to this owner:

1. manifest permission `unlimitedStorage`, which exempts extension/web storage from quota restrictions and eviction;
2. `navigator.storage.persist()`, which requests protection against eviction.

The permissions reference explicitly lists `unlimitedStorage` for `chrome.storage.local`, IndexedDB, Cache Storage and OPFS.

Important scope boundary: protection against *automatic storage-pressure eviction* is still not an absolute recovery guarantee. Uninstall, explicit user deletion, profile loss/corruption, disk failure, browser/profile reset and other failure domains remain possible.

## 4. Root cause

The root cause owned by P1-194 is conflation of two independent evidence axes:

### Axis A — commit evidence

Did the intended local mutation settle atomically and become visible according to the owning transaction/revision/CAS contract?

Examples:

- IDB transaction `oncomplete`;
- exact revision/generation CAS succeeded;
- pending receipt was committed before an external side effect.

### Axis B — retention/failure-domain evidence

What does the platform currently prove about the lifetime of that committed data?

Examples:

- session-only;
- ordinary browser-managed local storage;
- Chrome-protected local storage;
- independently verified external copy.

P1-194 says Axis A cannot be promoted into Axis B.

## 5. Target durability vocabulary

The exact runtime type name is an implementation detail, but the semantics should converge on the following classes.

| Class | Required evidence | Truthful claim | Must not claim |
|---|---|---|---|
| `session-only` | State exists only in session/ephemeral storage | usable in the current browser session according to that API's lifetime | recovery across full browser restart |
| `browser-managed-local` | committed extension-origin local state; no affirmative eviction protection | survives ordinary worker/page restart while Chrome retains the origin; usable for local recovery | protected from storage-pressure eviction; guaranteed recovery |
| `protected-local` | committed local state **and** affirmative Chrome protection evidence: `persisted() === true` or separately approved `unlimitedStorage` | protected from the Chrome automatic storage-pressure eviction class covered by that evidence | absolute recovery guarantee |
| `external-copy-confirmed` | an owning external identity/content contract has verified an independent exact copy | independent recovery copy exists in another failure domain | absolute guarantee; authority based only on path/name/size |

An additional implementation state such as `uncommitted` / `unknown` is reasonable for incomplete operations, but it is not a successful durability class.

## 6. Classification rules

### 6.1 Ordinary IDB commit

Given:

- the transaction committed;
- `unlimitedStorage` is absent;
- `navigator.storage.persisted()` is `false` or unavailable/unknown;

classification must be no stronger than:

`browser-managed-local`.

Unknown protection evidence fails toward the weaker class. It must never fail open into `protected-local`.

### 6.2 `persisted() === true`

If the data still exists and Chrome affirmatively reports persistent storage, local state may be classified as:

`protected-local`.

The protection classification should be derived from current evidence, not frozen forever into a checkpoint. If a user grants persistence later, still-existing local records can be reclassified without rewriting every record.

Conversely, a stale historical boolean stored inside the same origin is not sufficient proof of current protection by itself.

### 6.3 `unlimitedStorage`

If a future separately approved runtime/manifest change adds `unlimitedStorage`, it is valid Chrome-side evidence for the protected local class.

P1-194 source/model research must **not require** that permission. The current explicit `navigator.storage.persist()` UX can remain the chosen protection mechanism.

### 6.4 Multiple same-origin checkpoints are one retention failure domain

A copy in another IndexedDB object store, another record, or another extension-origin web-storage database can improve logical recovery options, corruption isolation or workflow reconciliation.

It does not create an independent browser-eviction failure domain. If Chrome evicts the extension origin, several same-origin copies may disappear together.

Therefore:

`two committed IDB copies`

is not equivalent to

`one local + one independent external copy`.

### 6.5 External copy

P1-194 does not redefine remote identity or content verification.

A remote copy may be promoted to `external-copy-confirmed` only after the owning contracts have proven the exact scope/content. In the current research graph this composes especially with:

- P1-179 immutable backup account/root namespace;
- P1-184 exact remote content receipt;
- P0-076 local Journal authority/CAS.

Weak facts such as "same path and same size" are not enough for P1-194 to call a remote copy confirmed.

### 6.6 Local Downloads file

A confirmed browser download may create another useful recovery copy outside extension-origin IDB. Its identity/settlement remains owned by the local-download owners.

P1-194 may describe such a copy as an external/local-file failure domain once the owning receipt proves it, but must still not use the word "guaranteed" absolutely: user deletion, OS/filesystem failure and other failure domains remain.

## 7. Meaning of `durable` after P1-194

The project does not need to ban the word `durable`.

It needs a scoped definition:

> `durable checkpoint` means state that has crossed the volatile execution boundary and was committed to its declared storage authority; it does not by itself assert browser-eviction immunity or an absolute recovery guarantee.

Where the stronger retention property matters, documentation/runtime/UI should additionally report the durability class.

Examples:

- `durable + browser-managed-local`;
- `durable + protected-local`;
- `durable + external-copy-confirmed`.

This preserves the useful MV3/restart meaning established by existing recovery owners while removing the overclaim.

## 8. Runtime contract for a future implementation

A future implementation should have one explicit classifier/derived state, conceptually:

```text
RecoveryDurabilityEvidence {
  commitState,
  storageKind,
  persistedStatus,
  unlimitedStorageGranted,
  externalReceiptState
}

-> RecoveryDurabilityClass
```

Requirements:

1. transaction settlement and retention class are separate fields/axes;
2. `persisted === false` or unknown cannot produce `protected-local` when `unlimitedStorage` is absent;
3. `persisted === true` can protect still-existing local origin data from the storage-pressure eviction class;
4. neither `persisted === true` nor `unlimitedStorage` can produce an absolute `guaranteed` flag;
5. same-origin duplicate checkpoints do not count as independent external copies;
6. external classification consumes exact receipts from the owning identity/content contracts instead of reimplementing them;
7. storage/recovery diagnostics should expose the current class so UI and logs do not have to infer it from unrelated fields;
8. loss of protection evidence must degrade the reported class rather than silently preserve a stronger historical label.

## 9. UI / documentation truthfulness

The existing Options storage health is already close to the needed product surface. Future implementation should make the recovery consequence explicit.

Suggested semantics, not final copy:

- `browser-managed-local`: "Локальные данные сохранены в хранилище Chrome, но защита от автоматического вытеснения не подтверждена.";
- `protected-local`: "Chrome подтвердил защиту локального хранилища от автоматического вытеснения при нехватке места.";
- external exact copy: "Подтверждена независимая точная копия" only when the owning receipt proves it.

Avoid:

- "данные гарантированно восстановятся" after IDB commit;
- "защищено навсегда" after `persist()`;
- treating a requested-but-rejected persistence grant as protection;
- treating `persisted()` unavailable as success.

## 10. Composition with existing owners

### P0-076 — Journal generation/CAS

P0-076 remains the authority for whether local Journal state is the right/current generation. P1-194 only classifies retention of the resulting committed state.

### P1-179 / P1-184 — Yandex namespace and content

They prove the remote copy's exact namespace/content. P1-194 consumes their verified result to distinguish an independent external copy from unverified remote hints.

### P1-192 — MV3 lifecycle/fair progress

P1-192 determines whether recovery work can resume fairly across service-worker wakes and whether an unknown external effect remains reconciliation work. P1-194 determines what retention claim may be made about the checkpoints that P1-192 relies on.

A durable phase cursor that is only `browser-managed-local` remains valid architecture for normal restart, but the system must not describe it as eviction-proof unless Chrome protection is proven.

### Existing local-download owners

They remain responsible for exact download admission/settlement/recovery identity. P1-194 only classifies the resulting failure domain after their evidence exists.

## 11. Deterministic model

Added:

`project_tools/test_p1_194_recovery_durability_class_model.js`

The model proves:

1. committed ordinary IDB + no protection -> `browser-managed-local`;
2. unknown persistence -> weaker class, never protected;
3. `persisted === true` -> `protected-local` against modeled automatic storage-pressure eviction, but not absolute guarantee;
4. `unlimitedStorage` is an alternative protection source, not a mandatory target;
5. several unprotected same-origin copies share the eviction failure domain;
6. session storage cannot be restart recovery authority;
7. still-existing data can be reclassified after persistence is granted;
8. only exact namespace/content external receipt becomes `external-copy-confirmed`;
9. no local class produces an absolute `guaranteed recovery` claim.

Expected result:

`P1-194 recovery durability class model: PASS`

This PASS proves the target model only. It is not production or physical-Chrome evidence.

## 12. Source-bound implementation gate

Added:

`project_tools/test_p1_194_recovery_durability_class_source.js`

The gate intentionally remains RED against the current canonical runtime until implementation exists. It requires, while preserving existing positive controls:

- explicit runtime recovery-durability classifier/state;
- truthful `session-only`, browser-managed/evictable, and `protected-local` semantics;
- durability class surfaced to status/recovery consumers;
- `protected-local` bound to affirmative `persisted() === true` when `unlimitedStorage` is absent;
- Options explanation of browser-managed vs protected local retention;
- architecture statement of the storage-pressure eviction boundary;
- explicit separation between transaction commit and recovery-retention guarantee.

It deliberately does **not** require adding `unlimitedStorage`.

Expected current result:

`P1-194 recovery durability class source gate: RED`

## 13. Physical evidence required before closure

Do not close P1-194 merely because the model passes or the future source gate becomes green.

At minimum, a closure pass should record real unpacked-Chrome evidence for the platform assumptions actually used by the implementation, for example:

1. current `navigator.storage.persisted()` result before the user action;
2. result of the existing Options persistence request on an extension page;
3. `persisted()` after that action;
4. runtime durability class changes consistently with the observed result;
5. browser restart does not falsely promote/demote committed data due only to worker lifecycle;
6. if `unlimitedStorage` is ever introduced, separately verify the shipped manifest/permission state and do not infer it from source intentions alone.

A destructive forced-eviction experiment should not be invented as evidence unless a controlled Chrome profile/harness can actually demonstrate it. Official Chrome documentation plus real API-state evidence can establish the architecture boundary; claims beyond what was physically tested must remain qualified.

## 14. Non-goals / safety boundary

This research does not:

- hunt browser vulnerabilities;
- attempt storage-pressure exploitation;
- modify production runtime;
- modify `manifest.json`;
- request new permissions;
- change Registry status;
- close P1-194;
- alter release readiness;
- build/tag/release version `0.9.9` or any other version.

The work stays inside defensive architecture, data-integrity and recovery-truthfulness analysis.

## 15. Research conclusion

P1-194 is a real architectural gap, but the existing product already has valuable primitives for the fix: storage health observes `persisted()`, and Options exposes an explicit persistence request.

The missing layer is a truthful recovery durability classifier and vocabulary.

The central invariant is:

> **A successful IndexedDB commit proves committed local state, not guaranteed retained state. WebClip may claim storage-pressure protection only when Chrome protection is affirmatively proven, and even protected local storage is not an absolute recovery guarantee.**

P1-194 therefore remains `ACTIVE` after this research checkpoint. Runtime implementation, source-gate convergence, and appropriate real-Chrome evidence are still required before any closure decision.
