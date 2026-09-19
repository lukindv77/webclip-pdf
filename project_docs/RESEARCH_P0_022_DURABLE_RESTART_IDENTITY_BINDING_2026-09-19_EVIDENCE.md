# Research evidence — P0-022 durable restart identity binding — 2026-09-19

Implementation baseline: `main` at `93ffc150baeef1fd55eb7acb93dfb3e527ae7b71`.

Current owner/status authority remains `RESEARCH_REGISTRY.md`. P0-022 remains **ACTIVE / IMPLEMENTATION-IN-PROGRESS**:

> Imported/legacy Yandex locator metadata is not destructive object provenance; remote destructive authority requires proven exact object identity.

## Preceding production receipt

- PR: `#292`;
- exact reviewed head: `8301be789872611737c48f16d1d29d88e525ae09`;
- exact-head Repository Integrity run: `35434307368` — PASS;
- squash merge / resulting `main`: `93ffc150baeef1fd55eb7acb93dfb3e527ae7b71`;
- post-merge Repository Integrity run: `35434454774` — PASS.

## Fresh gap

The first production tranche created current-provider remote identity receipts and copied their account/root/resource/path observation into detached destructive-move checkpoints.

The closure sweep found one bounded restart gap:

1. automatic restart finalization did not independently validate that a durable `remote-verified` row still contained the complete P0-022 provider authority/context/object binding;
2. ReadLater→Upload restart finalization restored verified path/resource metadata but did not promote the Journal row to `provider-verified`, unlike the live terminal path.

The remote move was not replayed during restart, which remains the required positive control. The gap was local authority and provenance continuity after a terminal remote outcome.

## Implemented invariant

The runtime now persists and validates a versioned durable identity envelope containing:

- exact provider authority;
- exact operation binding;
- account and root context;
- source and target paths inside that root;
- exact source `resource_id`;
- provider-observation and context-capture timestamps;
- original Journal locator provenance class.

The envelope is validated when created and checked again immediately before physical remote admission. Terminal verification independently requires:

- phase `remote-verified`;
- exact expected target path;
- the same `resource_id` observed at the source;
- a finite positive terminal verification timestamp.

After worker restart, automatic local-only finalization is admitted only when the terminal durable receipt preserves that identity continuity. Missing, legacy, malformed, path-retargeted, or resource-substituted terminal receipts become durable manual-resolution evidence.

Restart reconciliation still:

- performs no Yandex API request;
- never retries the destructive move;
- retains admitted-unknown outcomes for manual resolution;
- requires P0-076 Journal reset-generation and row-revision CAS for final local mutation.

For a complete verified ReadLater terminal receipt, restart local finalization now records `remoteIdentityProvenance=provider-verified`, matching the live path.

## Deterministic evidence

- `project_tools/test_p0_022_restart_identity_binding.js` — PASS 33 checks;
- `project_tools/test_p0_022_remote_identity_authority.js` — PASS 32 checks;
- `project_tools/test_p0_072_destructive_restart_reconciliation.js` — PASS 75 checks;
- `project_tools/test_p0_073_remote_recovery_namespace_authority.js` — PASS 24 checks;
- `project_tools/test_p0_074_yandex_recovery_operation_context.js` — PASS 48 checks.

Exact local source identities before PR:

- runtime SHA-256: `564680b7d34603e6256cf851b5b4b1ab5a37abdad09d49d2aedb33358adef939`;
- runtime Git blob: `4a82632e40ebfe4e03f88f971d9ecc5d00c30145`;
- restart regression SHA-256: `829697fa33db457d8f71fe9b44328f2f26cac043c8a6677823dfa00834901913`;
- restart regression Git blob: `6bce361460bf5271282220d3632d906012641276`.

The first PR workflow event stopped at the PR metadata contract before syntax or deterministic tests because the initial body mentioned adjacent owners as contextual prose. The body was narrowed to the actual declared owners before the next candidate commit; that run is not implementation evidence.

## Closure boundary

This tranche does not claim P0-022 closure. The following remain open:

- real Yandex provider evidence;
- explicit public-object deletion composition with P0-069;
- authorized end-to-end account/root switching.

Manifest remains `0.9.8`; release remains **NOT READY**. No build, tag, deployment, or GitHub Release is authorized by this tranche.
