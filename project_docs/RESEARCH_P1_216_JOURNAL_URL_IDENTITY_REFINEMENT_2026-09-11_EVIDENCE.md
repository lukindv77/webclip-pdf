# P1-216 — Journal exact-URL identity refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = 57b605101a9afbba91cde86405e517b3214396ac`.

Current Registry owner:

> P1-216 ACTIVE — Legacy and modern Journal rows share one derived URL identity domain for view/clear/delete/stats/templates; missing persisted urlKey cannot create ghost scope.

Current production source inspected:

- `service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

Historical provenance inspected only as provenance:

- branch `research/p1-216-journal-url-identity-2026-09-08`;
- historical baseline `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- historical `service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

The relevant runtime blob is therefore byte-identical between the historical branch and current canonical main. No historical branch is imported wholesale.

Production/runtime modification: **NONE**.

This tranche does not modify `manifest.json`, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Fresh result

P1-216 remains a current source defect.

The Journal still has two physical representations of one intended exact-URL identity:

1. canonical identity derivable from bounded row `url` through the existing `normalizeJournalUrl()` policy;
2. persisted `urlKey`, used by several indexes and targeted operations.

Modern writes/import normalize the two together, but legacy rows may have valid `url` with missing `urlKey`. Current operations do not consume that case consistently.

The root invariant is:

```text
persisted urlKey is an indexed materialization of canonical exact-URL identity,
not an independent authority domain.
```

Every Journal surface that answers “does row E belong to exact URL K?” must use one semantic predicate, even when the optimized physical plan differs.

## 2. Why this remains one owner

The same legacy row may be:

- visible in an ungrouped current-URL view through a derived fallback;
- invisible in a grouped/indexed view;
- invisible in exact-URL template/list reads;
- left behind by exact-URL clear;
- deletable by record id while the affected exact-URL stats domain is not repaired;
- omitted by targeted per-URL stats rebuild;
- counted by a full stats rebuild that derives from raw `url`.

Those are not separate product bugs. They are all consequences of one membership predicate being represented differently across read, destructive, grouping and derived-state paths.

## 3. Existing normalizer remains the semantic authority

P1-216 does **not** create a new URL policy.

The current Journal normalizer already defines the exact-URL domain. Required semantics to preserve include:

- only accepted HTTP/HTTPS values gain exact-URL authority;
- browser URL parsing performs canonical serialization;
- URL fragments are excluded from Journal exact-URL identity;
- query string remains part of identity;
- exact URL identity is separate from broader site/domain identity;
- malformed/unavailable URLs must not be guessed from hostname/title/current tab.

Fresh platform comparison confirms that browser `URL()` parsing is an explicit parse/canonicalization primitive and throws for invalid URL input; URL components expose hash/search/host separately. The project's explicit removal of `hash` therefore remains a WebClip policy layered on the browser parser rather than a new P1-216 rule.

## 4. Current positive controls

Modern Journal writes already materialize a normalized `urlKey` from the row URL.

Modern import normalization likewise recomputes the effective key from bounded imported URL instead of treating a supplied historical key as unquestioned scope authority.

Full stats rebuild already contains a derived fallback for legacy rows.

Ungrouped URL view already demonstrates a correctness-compatible plan: scan a bounded universal ordering domain and derive effective URL identity in JS.

Site-scope paths already derive their own broader site identity and are intentionally not substitutes for exact-URL identity.

These controls mean P1-216 is compatibility/convergence work, not a new portable URL schema.

## 5. Current deterministic split-brain schedule

Let:

```text
K = normalizeJournalUrl(U)
M = modern row { url: U, urlKey: K }
L = legacy row { url: U, urlKey: missing }
```

A current ungrouped exact-URL view may apply an effective expression equivalent to:

```text
entry.urlKey || normalizeJournalUrl(entry.url)
```

and show both M and L.

An indexed/grouped/list/clear path can use the persisted `urlKey` domain and observe only M.

Thus:

```text
view(U)  -> M, L
clear(U) -> removes M only
view(U)  -> L reappears
```

A successful destructive scope operation cannot be considered truthful when its membership predicate is weaker than the predicate that rendered the scope to the user.

## 6. IndexedDB is an optimization boundary, not semantic authority

Fresh IndexedDB documentation confirms that indexes/cursors exist inside transaction scopes and provide key-range iteration over indexed records. That is the correct physical mechanism for efficient current rows, but an index cannot semantically define membership for a historical row that lacks the indexed materialized key.

P1-216 therefore distinguishes:

```text
semantic membership
    effective exact-URL identity

physical acceleration
    persisted urlKey + urlKeyCreatedAt/indexes
```

The implementation may optimize once canonical-index readiness is proven, but it must not define user-visible/destructive truth solely as “what this index happened to contain.”

## 7. Canonical effective identity receipt

A useful implementation primitive is a classified receipt, not a naked fallback string:

```text
JournalUrlIdentity {
  state: persisted | derived | mismatch | unavailable,
  key,
  persistedKey?,
  derivedKey?
}
```

Conceptual derivation:

```text
P = normalizeJournalUrl(entry.urlKey)
D = normalizeJournalUrl(entry.url)

P && D && P != D  -> mismatch, no destructive exact-URL authority
P && (!D || P==D) -> persisted(P)
!P && D            -> derived(D)
!P && !D           -> unavailable
```

The classification matters because `entry.urlKey || normalizeJournalUrl(entry.url)` silently hides corruption/migration disagreement.

## 8. Mismatch must fail closed

Consider:

```text
entry.urlKey canonicalizes to K1
entry.url canonicalizes to K2
K1 != K2
```

Blind preference for K1 makes persisted cache/index data an independent destructive authority. Blind preference for K2 silently overrides an inconsistent persisted representation while indexes/stats may still be keyed by K1.

Required behavior:

- exact-URL destructive operations do not target the row by either K1 or K2 while mismatch is unresolved;
- ordinary unscoped/recovery/diagnostic representation may expose the row truthfully;
- migration/reconciliation may resolve the row only under the normal Journal mutation authority;
- no ad-hoc lazy read repair is allowed to bypass generation/revision controls.

This is a refinement over the simple legacy fallback and prevents “fixing” missing-key ghosts by introducing a corrupted-key destructive authority.

## 9. Read-only compatibility and migration are different operations

P1-216 needs two distinct mechanisms.

### 9.1 Compatibility path

Until canonical index readiness is proven, bounded reads/destructive scope enumeration must be able to detect canonicalizable legacy rows outside the persisted index domain.

Acceptable shape:

- bounded cursor/page scan over a universal store ordering;
- derive effective identity per row;
- preserve existing query/page/deadline limits;
- never whole-store unbounded `getAll()` merely to compensate for a missing index key.

### 9.2 Explicit migration/backfill

A named maintenance operation may backfill missing canonical materialized `urlKey` values in bounded batches.

It must carry:

- durable migration generation/cursor or equivalent resumable state;
- bounded batch/time work;
- exact current Journal generation;
- exact entry revision/identity mutation authority where required by P0-076;
- explicit mismatch/unavailable handling;
- dependent stats rebuild/publication through P0-050's generation contract;
- a truthful “canonical index ready” completion receipt before fast indexed-only semantics are allowed.

## 10. No lazy read mutation

This pattern remains rejected:

```text
view row
→ notice missing urlKey
→ silently write urlKey
```

Reasons:

- read-only UI unexpectedly gains mutation authority;
- clear/import/replace may supersede the row;
- late lazy writes can target a replacement generation;
- migration completeness remains unknowable;
- stats/index readiness remains ambiguous;
- behavior depends on which UI happened to read which records.

Observation may diagnose compatibility state. Mutation requires explicit mutation authority.

## 11. Exact membership equivalence

For every canonicalizable, non-mismatched row E and exact URL K:

```text
ShownInCurrentUrlView(E,K)
== ListedForUrl(E,K)
== GroupContains(E,K)
== GroupEntriesContain(E,K)
== TemplateListedForUrl(E,K)
== ClearCurrentUrlWouldTarget(E,K)
== StatsCounts(E,K)
```

Different surfaces may use different bounded physical plans, but semantic membership cannot diverge.

For mismatch/unavailable rows, destructive exact-URL membership is false until explicit reconciliation.

## 12. Record identity remains separate

Two rows can share exact URL K and remain independent Journal records.

P1-216 does not deduplicate records and does not replace:

```text
entry id / entry revision / mutation provenance
```

with URL identity.

Single-entry deletion still targets exact record identity. P1-216 only supplies the exact URL domain whose dependent derived state must be repaired after that record mutation.

## 13. Stats composition with P0-050

P1-216 owns **which exact URL domain** a row belongs to.

P0-050 separately owns generation-safe `urlStats` rebuild/publication in the presence of concurrent point mutations.

Therefore:

```text
P1-216: derive K correctly
P0-050: publish stats(K) under correct generation ordering
```

Supplying K correctly does not close P0-050.

The current targeted/full rebuild disagreement is still useful proof of P1-216:

```text
targeted rebuild(K) using persisted index -> misses legacy L
full rebuild deriving url fallback         -> counts legacy L
```

After P1-216 both plans must agree semantically before P0-050 publication ordering is considered.

## 14. Mutation authority composition with P0-076

Backfill is a Journal mutation.

A stale migration pass must not execute:

```text
read old E under generation A
replace/import installs E' under generation B
late A writes derived urlKey into B
```

The late A write must be stale/no-op through the existing Journal-generation/per-entry revision authority owned by P0-076.

P1-216 does not invent a parallel CAS domain.

## 15. Import/export boundary

Current import behavior that derives the materialized key from bounded URL is a positive control.

Portable rows need not gain a second independent `urlKey` truth source merely for P1-216.

If the portable form contains a key for compatibility/diagnostics, import must still validate/reconcile it against canonical URL semantics rather than trusting it as destructive authority.

This owner is therefore separate from restore envelope limits (P0-077) and import staging/lease correctness (P1-215).

## 16. Templates and grouped views remain within owner scope

The Registry explicitly names templates because content-side template reads inherit exact-URL listing semantics.

A legacy row must not be:

```text
visible in site templates
invisible in current-URL templates
visible in ungrouped Journal current-URL view
invisible in grouped URL view
```

unless the difference is explained by an intentional scope distinction rather than missing persisted index materialization.

No new P-code is needed for these downstream manifestations.

## 17. Site identity remains a separate domain

Exact URL and site/domain identity must not collapse.

Example:

```text
https://example.com/a?q=1
https://example.com/b?q=2
```

may share one site identity while remaining distinct exact-URL identities.

Replacing P1-216 with hostname/site matching would over-group and over-delete.

## 18. Fragment/query semantics remain stable

Existing normalization policy intentionally makes:

```text
https://example.com/a#one
https://example.com/a#two
```

one Journal exact-URL identity after fragment removal.

But:

```text
https://example.com/a?q=1
https://example.com/a?q=2
```

remain different identities.

Migration, compatibility reads, destructive clears, templates and stats must all reuse the same normalizer.

## 19. Boundedness and readiness

P1-216 cannot trade ghost scope for unbounded scans.

Required implementation properties:

- bounded cursors/pages;
- explicit deadlines;
- bounded migration batches;
- durable/reconstructable migration progress;
- fail-closed capacity/deadline outcome rather than silently skipping rows;
- no entire Journal materialization solely to classify URL identity;
- indexed-only fast path only after exact readiness proof for the relevant schema/generation.

## 20. Fresh external research and applicability

### 20.1 MDN IndexedDB terminology

Fresh MDN IndexedDB material confirms:

- operations are transaction-scoped;
- cursors iterate indexed/object-store key ranges;
- write transaction scopes serialize conflicting work.

Applicability: supports a bounded cursor/backfill design and reinforces that index traversal is a physical access strategy, not a reason to define business identity from index presence.

Source: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

### 20.2 MDN URL

Fresh MDN URL documentation confirms `URL()` parses URL strings and throws for invalid input, while `hash`, `host`, `hostname`, `pathname` and related components remain separately represented.

Applicability: supports reusing the project's browser-URL-based canonicalizer and preserving explicit WebClip fragment policy instead of inventing ad-hoc string normalization.

Source: https://developer.mozilla.org/en-US/docs/Web/API/URL

### 20.3 MDN URL port normalization

MDN documents that default ports serialize through the URL model as an empty `port` value for their protocol.

Applicability: reinforces why all historical/materialized keys must be produced by one parser/canonicalizer; raw textual URL equality is not a stable identity policy.

Source: https://developer.mozilla.org/en-US/docs/Web/API/URL/port

External sources are comparison/platform evidence only. They do not allocate WebClip requirements or replace the Registry.

## 21. Deterministic acceptance schedules

Implementation is not complete until deterministic tests cover at least:

1. modern persisted row has one exact identity;
2. legacy missing-key row derives the same identity;
3. ungrouped/grouped/list/template membership converges;
4. exact-URL clear removes every canonical member shown in that scope;
5. single-entry delete derives the affected stats URL domain;
6. targeted/full stats rebuild agree on legacy membership;
7. mismatch row is excluded from destructive exact-URL authority;
8. unavailable malformed row gets no guessed exact identity;
9. fragment variants preserve current policy;
10. query variants remain distinct;
11. site scope remains broader and separate;
12. record identity is not deduplicated by URL identity;
13. bounded backfill preserves semantic identity before/after materialization;
14. stale migration generation cannot write into replacement/import generation;
15. indexed-only path cannot be enabled before exact readiness receipt;
16. compatibility path respects batch/deadline bounds;
17. current import remains canonical-key positive control;
18. no lazy read mutation is required for correctness.

## 22. Owner composition

P1-216 owns only exact Journal URL membership/materialization convergence.

It composes with, but does not absorb:

- **P0-050** — generation-safe `urlStats` rebuild/publication;
- **P0-076** — per-entry revision + Journal-generation CAS for mutations;
- **P0-077** — Journal export/import envelope limits;
- **P1-206** — one composed Journal view must be exact source-revision coherent;
- **P1-207** — backup success/freshness exact Journal source revision;
- **P1-211/P1-202** — deleted-comment lifecycle/retention semantics;
- **P1-215** — import staging lease/receipt correctness;
- **P1-231** — release evidence/authorization plane.

No new P-code is allocated.

## 23. Release boundary

This research model may PASS while production remains unresolved.

P1-216 remains **ACTIVE** pending runtime implementation and required current evidence.

No release authorization follows from this tranche.
