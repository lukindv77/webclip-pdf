# P1-231 S0-C passive production release-contract authority — 2026-09-21

Status: **PASSIVE PRODUCTION INPUT AUTHORITY IMPLEMENTED / IDENTITY-ENGINE INTEGRATION PENDING**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`08b4ea65399af67541e8da30e74382795fb06009`

Baseline post-merge Repository Integrity:

- run #993
- exact main: `08b4ea65399af67541e8da30e74382795fb06009`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes P1-231 S0-C from research-only modeling to passive production authority.

New canonical surfaces:

- `release_contract_inputs_v1.json`
- `project_tools/release_contract_authority.js`
- `project_tools/test_release_contract_authority.js`

No release policy, evidence settlement, readiness mutation, product build, tag or provider action is activated.

## Authority contents

Schema:

`webclip-release-contract-inputs/v1`

Fingerprint profile:

`webclip-contract-fingerprint-v1`

The canonical full-RCF set contains exactly 11 blob inputs:

- `.github/workflows/release-gate.yml`
- `project_docs/BUILD_AND_RECOVERY_RULES.md`
- `project_docs/CONTEXT_MANIFEST.json`
- `project_docs/DECISIONS_AND_RATIONALE.md`
- `project_docs/RESEARCH_REGISTRY.md`
- `project_docs/TEST_PLAN.md`
- `project_docs/USER_REQUIREMENTS.md`
- `project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md`
- `project_tools/build_public_suffix_js.py`
- `project_tools/check_pr_change_contract.py`
- `project_tools/check_release_readiness.py`

Mutable readiness/status/evidence files remain explicitly forbidden as full-RCF inputs.

The only QCF projection kinds are:

- `unpacked-chrome`
- `yandex-e2e`

Each projection has a closed schema, subject, environment-policy token set and case/assertion set. The manifest contains no executor commands or provider credentials.

## Exact-Git authority

For an exact candidate commit, production resolution requires every full-RCF root to be:

- present in the exact candidate tree;
- Git object type `blob`;
- mode `100644`;
- read by object id from Git, not from the mutable working tree.

The deterministic witness temporarily dirties `project_docs/USER_REQUIREMENTS.md` and proves the candidate full RCF is unchanged, then restores the file.

## Identity-framing reconciliation

Exact-head Repository Integrity #994 exposed an important authority split before merge.

The historical S0-C research source-spec contains an earlier local framing (`WEBCLIP_QCF_V1` / `WEBCLIP_RCF_V1`) and, for the same current projection semantics, produces research-only values such as Chrome `2f0e5a...`. The later S0-E identity-engine source-spec is the current owner of the typed `WEBCLIP_RELEASE_IDENTITY_V1` framing and produces the recorded current identities.

Promoting the old S0-C hash functions would therefore create a second fingerprint authority. This tranche explicitly does **not** do that.

Production S0-C now owns only:

- canonical projection semantics;
- canonical full-RCF root paths;
- exact candidate Git-object resolution;
- identity-engine input payloads.

The deterministic production witness independently applies the current S0-E typed framing to those S0-C inputs and requires:

- Chrome QCF:
  `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF:
  `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF:
  `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`

That test is a compatibility witness, not a second production hash owner. Production S0-E remains responsible for the eventual typed fingerprint engine.

Chrome semantic changes alter the typed Chrome QCF while leaving typed Yandex QCF unchanged; Yandex semantic changes behave symmetrically. Representation order of set-like fields remains normalized by S0-C before S0-E consumes the payload.

## Separation from receipts and release decisions

The production S0-C input authority does not interpret:

- attempt sequence;
- receipt id;
- outcome;
- evidence reference;
- browser/account observation metadata;
- release readiness text.

Returned state explicitly remains:

- `policy_mutation=false`
- `receipt_interpretation=false`
- `release_authorized=false`

Physical Chrome/Yandex PASS still requires real qualification and typed evidence settlement later in the DAG.

## Package/runtime boundary

`release_contract_inputs_v1.json` is a control-plane root, not an extension package member.

The package remains the canonical 34-member S0-A projection. This tranche changes no extension runtime/package bytes.

## Next bounded step

After this tranche is accepted and post-merge integrity is green, S0-D builder-contract authority is the next missing passive production authority before production S0-E identity-engine composition can consume A/C/D.

S1/S2 activation remains downstream.

## Explicit non-actions

No product ZIP/build, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, readiness migration, S2 authorization or release decision is performed.
