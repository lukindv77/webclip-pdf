# Durable research evidence — privacy-preserving SelectionSnapshot resolver contract — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This third interruption-safe checkpoint continues Blocks 1–32 from the two preceding SelectionSnapshot privacy evidence files on exact baseline `a899ae3d22c365010a663389dc07844b34c86f77`.

No runtime, manifest, version, build, tag or release change is made. No new P-code is allocated.

## Blocks 33–48 — resolver semantics, privacy features and legacy migration

### Block 33 — selected plaintext text is a high-weight restore signal — P1-182 / P1-001

Current top v3 scoring gives exact/strong selected text similarity up to 24 points. The child frame-agent uses the same 24-point similarity function.

Therefore selected text is not decorative metadata. Removing/replacing it changes locator discrimination and must be versioned with resolver thresholds rather than silently dropped after serialization.

### Block 34 — surrounding plaintext contributes up to 18 points — P1-182 / P1-001

`parentText`, `previousText` and `nextText` each contribute one quarter of the current similarity score, so an exact match contributes up to 6 + 6 + 6 = 18 points.

This quantifies why unselected surrounding text was persisted: it can move a candidate across the ambiguity-margin boundary. Privacy repair must preserve truth, not necessarily the same acceptance rate.

### Block 35 — raw locator URL attributes are explicit weighted identity signals — P1-182 / P0-066 / P1-001

Current exact-attribute scoring gives raw `href` equality +14 with mismatch penalty -3 and raw `src` equality +10 with mismatch penalty -2. The comparison is against `candidate.getAttribute(...)`, i.e. the raw current DOM attribute representation.

A future durable URL sanitizer cannot merely rewrite stored strings while leaving the old raw-string comparator unchanged; the feature and comparator must migrate together.

### Block 36 — cross-origin frame-agent repeats the same privacy/scoring contract — P1-182 / P1-200

Fresh `frame-agent.js` independently stores plaintext text/context/raw `src/href` and independently uses the same weights: text 24, context up to 18, `href` 14, `src` 10.

A top-only privacy fix would leave remote-frame snapshots both privacy-inconsistent and semantically scored under a different feature contract. Local/remote parity is mandatory.

### Block 37 — deterministic threshold model: context can turn ambiguity into accepted medium — P1-001

Using current weights, two otherwise identical candidates with:

- base score 4;
- exact selected text +24;
- matching parent tag +4;

score 32/32 and are ambiguous.

If one candidate alone gets exact parent/previous/next context, it becomes 50/32. Current ambiguity rule is `second >= 28 && margin < 18`; margin is exactly 18, so the candidate is no longer rejected as ambiguous and is accepted at medium confidence.

This proves that deleting plaintext context changes behavior materially and sometimes correctly increases ambiguity.

### Block 38 — reduced restore success is preferable to false confidence after minimization — P1-001 positive safety rule

When privacy-safe features cannot distinguish the 32/32 example, the correct result is ambiguous/fail-closed, not threshold relaxation until one candidate is accepted.

P1-182 implementation must be evaluated together with P1-001 false-match regression tests. “Same historical restore success percentage” is not a valid requirement if it needs reversible private context.

### Block 39 — equality fingerprints can preserve some discrimination without plaintext, but need a threat model — P1-182

A bounded fingerprint of normalized context can in principle preserve exact-equality evidence without storing the original text. This is a design direction, not proof that any hash is automatically safe.

The durable schema must identify the normalization/fingerprint version so candidate-side recomputation uses exactly the same semantics.

### Block 40 — plain unsalted hashes of common text remain offline-guessable — P1-182

Journal exports and Yandex backups are portable files. An attacker who obtains one can hash a dictionary of common labels, names, account states or short secrets and compare against globally deterministic unsalted fingerprints.

Therefore “replace plaintext with SHA-256” alone does not satisfy a meaningful privacy-preserving contract for low-entropy text. The implementation needs an explicit correlation/dictionary-resistance policy or must omit that feature.

### Block 41 — device-secret keyed fingerprints conflict with cross-device restore unless portability is designed — P1-182 / P0-077

A device-local secret can improve resistance to offline guessing, but an exported backup restored on another browser cannot recompute the same feature unless the key/protocol is intentionally portable.

P1-182 and P0-077 therefore constrain each other: the self-restorable backup contract cannot be repaired by silently making locator fingerprints device-bound.

### Block 42 — URL minimization can intentionally collapse token variants — P0-066 / P1-001

Two links may share the same safe origin/path while differing only in query/session/signature material. A privacy-safe URL feature that omits userinfo/query/fragment can collapse them to the same durable identity.

That collision is not itself a defect. If no other safe signals distinguish the nodes, restore must become ambiguous rather than persisting the secret query simply to recover discrimination.

### Block 43 — raw URL secrets should not become matching authority merely because they are unique — P1-182 / P0-066

A unique access token, signed query or session id is often highly discriminative precisely because it is sensitive. Current exact raw-string scoring rewards that uniqueness.

The acceptance contract must invert that incentive: sensitive capability material is excluded from durable authority even if it would improve locator score.

### Block 44 — privacy field taxonomy is broader than sibling text and URLs — P1-182

Current durable locator also retains selected text, ARIA label, `name`, `title`, ids and class tokens. Historical P1-182 evidence already called out element/ARIA/name/title text; ids/classes can also encode user or tracking identifiers on some sites.

The fix should explicitly classify every durable locator field as structural, user-visible semantic, potentially sensitive, or forbidden-capability material rather than patch only the four reproduced strings.

This block does not claim every id/class is secret; it prevents an incomplete privacy allowlist.

### Block 45 — current worker snapshot versioning cannot represent a new v4 contract yet — P1-182 / P1-001

`sanitizeSelectionSnapshot()` currently normalizes the version to `3` for every input version `>= 3`, otherwise 2 or 1.

Therefore simply emitting `{version:4,...}` from content would be silently collapsed to v3 at the worker boundary. A privacy-minimized locator schema requires coordinated version admission in content, frame-agent, worker, Journal import/export and Apply/restore.

### Block 46 — legacy v1/v2/v3 read compatibility must not imply legacy plaintext write compatibility — P1-182

Current code intentionally supports older snapshot versions. That compatibility may remain for reading old Journal rows/backups.

However, once a legacy row is successfully normalized/migrated, newly persisted/exported state should use the new minimized schema. Otherwise every backup indefinitely republishes old surrounding plaintext.

### Block 47 — import is the natural durable migration boundary — P1-182 / P0-077

`normalizeImportedJournalEntry()` already constructs a normalized entry before `JOURNAL_IMPORT_STAGING_STORE` and before destructive replace. This is the correct place to convert legacy locator fields into the new durable feature representation, subject to the same limits and restore semantics as live capture.

Staging should receive the migrated representation, not raw legacy plaintext plus a promise to clean it later.

### Block 48 — Apply may need an ephemeral compatibility adapter, not a durable legacy echo — P1-182 / P1-001 / P1-188

For a legacy v3 row, Apply/restore may temporarily parse old fields in trusted extension memory to resolve the current page. That does not require writing those fields back to the Journal, pending checkpoint, cache or next export.

If an old `cssPath` is present, P1-188 still applies: compatibility must not execute arbitrary imported native selector semantics merely because other plaintext signals were removed.

## Stage 4 classification

No new P-number or status transition is justified.

The fresh evidence materially refines the current P1-182 acceptance contract but does not change its root wording: **durable SelectionSnapshot locator context must not persist surrounding plaintext/sensitive raw href/src; preserve restore quality with privacy-preserving fingerprints.**

The strongest implementation constraint added by this tranche is that privacy and restore confidence are one versioned protocol: field transformation, candidate-side feature computation, score weights, ambiguity margins, local/remote parity, import migration and portable backup format must change coherently.

## Final implementation acceptance candidate

1. Introduce a versioned minimized durable locator schema rather than mutating v3 field meanings in place.
2. Keep raw sensitive page values ephemeral and bounded; do not serialize them into durable Journal/cache/checkpoint/export/backup state.
3. Eliminate parent/previous/next plaintext from new durable snapshots or replace it with a threat-modeled non-reversible feature.
4. Apply the P0-066 URL confidentiality policy before durable locator serialization; do not keep query/fragment/userinfo/signed/session material for score bonuses.
5. Recompute the same minimized features on current candidate nodes under bounded P1-168 work.
6. Recalibrate score/ambiguity rules using deterministic collision/low-entropy tests. Privacy collisions lower confidence; they never trigger optimistic fallback.
7. Keep top and frame-agent feature schema/scoring identical where semantics are intended to match.
8. Worker remains authoritative schema/count/depth/byte admission and must preserve the new version instead of coercing it to v3.
9. Journal rows, pending appends/downloads/remote saves, retry cache, local JSON export, Yandex backup and import staging all use the same minimized durable representation.
10. Legacy snapshots remain readable with bounded compatibility, but import/re-save/export migrates them and does not perpetuate plaintext.
11. Portable backup remains self-restorable under P0-077; do not rely on an unavailable device-local secret unless a safe explicit portability protocol exists.
12. P1-188 imported-selector restrictions and P1-001 rendered-target admission remain intact.

## Checkpoint status

Blocks 1–48 are now durably preserved across three privacy evidence files. Final session work should add only cross-cutting positive controls/dedup conclusions, index the evidence, remove the obsolete initial post-freeze checkpoint from the final branch diff if its unique recovery information is already preserved in Git history, then deliver through PR/CI/TOCTOU/merge/post-merge CI.