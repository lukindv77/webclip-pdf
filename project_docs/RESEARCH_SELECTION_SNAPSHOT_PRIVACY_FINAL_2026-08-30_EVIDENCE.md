# Durable research evidence — SelectionSnapshot privacy revalidation final classification — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This file closes the interruption-safe deep-research tranche whose detailed Blocks 1–48 are preserved in:

- `RESEARCH_SELECTION_SNAPSHOT_PRIVACY_REVALIDATION_2026-08-30_EVIDENCE.md` — Blocks 1–16, live locator construction and durable Journal admission;
- `RESEARCH_SELECTION_SNAPSHOT_PRIVACY_PORTABILITY_2026-08-30_EVIDENCE.md` — Blocks 17–32, export/Yandex/import/cache/recovery propagation;
- `RESEARCH_SELECTION_SNAPSHOT_PRIVACY_RESOLVER_2026-08-30_EVIDENCE.md` — Blocks 33–48, resolver weights, privacy-preserving feature semantics and legacy migration.

Researched exact source baseline: `main = a899ae3d22c365010a663389dc07844b34c86f77`.

Managed Chromium control: `144.0.7559.96` on Debian 13. Browser evidence is deterministic engineering evidence, not real unpacked-extension release QA.

No runtime, `manifest.json`, version, build, tag or GitHub Release is changed by this research tranche.

## Executive result

**No new permanent P-code and no canonical status transition.**

Fresh source and managed-browser evidence strongly revalidate **P1-182 ACTIVE** exactly as currently worded: durable SelectionSnapshot locator context still persists surrounding plaintext and sensitive raw `href/src`, and restore quality therefore needs a versioned privacy-preserving feature contract rather than reversible context.

Supporting owners remain:

- **P0-066 ACTIVE** — durable URL confidentiality for locator URLs, including secret query/fragment/userinfo/capability material;
- **P1-001 ACTIVE** — truthful restore confidence/ambiguity after locator feature minimization;
- **P1-168 ACTIVE** — bounded locator/fingerprint computation before materialization/scoring;
- **P1-188 ACTIVE** — imported `cssPath` cannot become an unsafe fallback authority;
- **P0-077 ACTIVE** — portable export/import must remain self-restorable after schema migration.

P1-230 is deliberately **not allocated**.

## Blocks 49–56 — cross-cutting controls and final acceptance

### Block 49 — the canonical owner already names the exact root cause — duplicate control

Current P1-182 states that durable SelectionSnapshot locator context must not persist surrounding plaintext/sensitive raw `href/src` and must preserve restore quality with privacy-preserving fingerprints.

The fresh findings are direct manifestations and propagation paths of that exact root. A new privacy P-number would split one implementation contract across duplicate owners.

### Block 50 — size/schema admission is already a useful independent positive control

Worker `sanitizeSelectionSnapshot()` caps lists/fields/frame depth/JSON size and content/import paths can reject overflow. The research does not ask to weaken those controls.

Privacy minimization is an additional boundary: a correctly bounded 120-character sibling secret is still a secret.

### Block 51 — extension storage/runtime isolation reduces direct host access, but does not solve minimum disclosure

Current architecture keeps extension-owned persistence in extension contexts and has separate sender/storage access controls. The reproduced issue is not “page JavaScript can directly open WebClip IndexedDB”.

The problem is that WebClip itself intentionally copies non-selected/sensitive page data into durable Journal/recovery/export/backup representations. Security isolation and data minimization are complementary.

### Block 52 — Incognito fail-closed behavior is a separate positive privacy boundary

P0-045 already governs blocking ordinary private-tab content from normal persistent Journal/backup paths. Preserve it.

P1-182 concerns the normal-profile snapshots that the product is allowed to persist; Incognito isolation does not justify storing unnecessary neighboring plaintext in those permitted records.

### Block 53 — privacy repair should not require changing PDF visual bytes

The sensitive fields reproduced here are locator/restore metadata. The selected PDF can remain visually identical while durable locator representation changes.

This separation is useful for implementation and regression: metadata privacy can improve without replacing Chromium rendering or altering the user's selected archive content.

### Block 54 — already externalized backup files cannot be retroactively scrubbed by a schema patch

A future minimized schema can stop new Journal rows, local exports and Yandex backups from perpetuating legacy plaintext. It cannot erase JSON files the user already exported or remote backup objects that already exist outside the current write operation.

Migration acceptance should therefore distinguish **future-write non-propagation** from any optional explicit historical-backup cleanup product policy. Do not report old external copies as silently repaired.

### Block 55 — one central durable serializer is required to prevent privacy drift between surfaces

The current snapshot is independently copied through live Journal append, local/remote recovery, retry cache, full export, Yandex backup and import staging. Patching each sink independently invites schema skew.

Required direction: one versioned `durableSelectionSnapshot` admission/normalization contract produces the exact representation all durable sinks store. Ephemeral current-page matching can remain a separate bounded internal representation.

### Block 56 — final deterministic acceptance matrix

A complete implementation gate must prove, on local and remote-frame paths:

1. selected benign child adjacent to unique secret text -> no parent/previous/next secret substring in any durable snapshot;
2. raw link/image/frame URL with userinfo/query/fragment/session/signature -> no forbidden capability material in Journal, pending stores, retry cache, local export, Yandex staged backup or import staging;
3. Include and Exclude parity;
4. nested same-origin framePath and cross-origin prefix parity;
5. legacy v1/v2/v3 read/apply compatibility without re-exporting plaintext;
6. new schema version survives worker admission rather than being coerced to v3;
7. safe-feature collision produces ambiguous/fail-closed restore, never optimistic high confidence;
8. top/frame-agent scoring uses the same feature semantics;
9. existing count/depth/byte limits, Journal revision fencing, recovery durability and backup self-restore remain valid;
10. real unpacked Chrome regression covers Journal Apply plus local export/import and Yandex backup/restore on an ordinary non-Incognito profile.

## Fresh evidence summary

The managed fixture selected only `Quarterly report` but current-shaped locator extraction also retained:

- previous unselected `RECOVERY PHRASE: SEVEN-TULIP-SECRET`;
- next unselected `SSN-LIKE NEIGHBOR: 999-88-7777`;
- parent aggregate text containing both;
- raw link `access_token=RAW_HREF_SECRET` query/fragment;
- raw image `sig=RAW_SRC_SECRET` query.

Fresh worker source truncates rather than privacy-transforms those fields. Journal append persists the snapshot. Full-Journal export serializes the complete entry, and both local JSON export and Yandex backup consume that same staged JSON. Import sanitization retains the fields and writes them into import staging/live Journal. Pending local/remote save checkpoints and PDF retry cache create additional legitimate persistence classes.

A source-shaped sanitize → export JSON → import sanitize model preserved all tested secret substrings.

Resolver analysis explains why the fields exist: selected text can contribute 24 points, raw `href` 14, raw `src` 10, and parent/previous/next context together up to 18. Removing reversible context therefore requires a coordinated versioned scoring/ambiguity migration, not a serialization-only patch.

## Final duplicate / status decision

- P1-182 stays **ACTIVE**; no status transition.
- Registry wording is already sufficient; `RESEARCH_REGISTRY.md` should remain unchanged in this docs-only tranche.
- No P1-230 or later code is allocated.
- The completed session contains **56 researched blocks** when the detailed staged evidence and these closing controls are counted together.

The branch-level interruption checkpoints are intentionally preserved in Git history. The obsolete initial post-freeze planning file may be removed from the final tree because all unique dedup decisions are now preserved in the privacy evidence set; removing it does not erase its checkpoint commit from branch history.

PR delivery is intentionally classified as existing-owner research impact (`- [x] research-impact: owner`) with P1-182 and its supporting owners declared; docs-only evidence does not require a runtime test-impact exception.