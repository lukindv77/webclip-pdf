# Repository Integrity exact-head checkout — 2026-09-20

## Scope

This structural tranche aligns `.github/workflows/repository-integrity.yml` with the already-canonical PR lifecycle:

`fresh main -> branch -> bounded change -> PR -> exact-head Repository Integrity -> fresh TOCTOU -> expected-head squash merge -> exact new main -> post-merge Repository Integrity`.

No runtime behavior, manifest version, release gate, build, tag, deployment, GitHub Release, P-code status, or physical QA contract changes in this tranche.

## Finding

PR #300 exposed a delivery-verification ambiguity.

Repository Integrity run #899 was associated with PR head
`39f358553f254087c2de0410f356c480f7f13d04`, but the default `actions/checkout` behavior for a `pull_request` event checked out GitHub's synthetic merge ref. The deterministic test logs therefore reported
`GITHUB_SHA=cc2225cdf63a4891d06f06060b95e13ba78f18f1`.

For that PR the ambiguity did not change tested bytes: the synthetic merge commit and PR head had the exact same Git tree
`a95bc3cb96b81e1f1b678ec3afde474257309797`, because canonical `main` had not moved and was an ancestor of the branch. PR #300 was merged only after that tree equality was verified, and post-merge Repository Integrity #900 ran on literal canonical main
`e54d700b93ba88924dc0453f371cd467ad2b16e5`.

The workflow name/step already said “exact commit”, and repository policy already required exact-head CI. The implementation therefore lagged the documented contract.

## External verification

GitHub documents that, for an open mergeable `pull_request` event:

- `GITHUB_REF` is the pull-request merge branch;
- `GITHUB_SHA` is the last merge commit of that merge branch;
- because `actions/checkout` uses the event ref by default, the default checkout tests the merged result;
- to test the PR head itself, checkout should use `github.event.pull_request.head.sha`.

References:

- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://github.com/actions/checkout/blob/main/README.md#checkout-pull-request-head-commit-instead-of-merge-commit

The project uses the ordinary `pull_request` event with read-only workflow permissions, not `pull_request_target`. This change therefore does not introduce a privileged base-context execution path.

## Implemented contract

Repository Integrity now supplies this checkout ref:

`github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha`

Consequences:

- PR events checkout the literal PR head commit;
- push events checkout the literal pushed commit;
- manual workflow-dispatch events resolve to their selected `github.sha`;
- full history remains available with `fetch-depth: 0` for base/head comparison and ancestry-aware tests.

Immediately after checkout, the workflow independently computes:

`git rev-parse HEAD`

and requires exact equality with the same expected SHA expression. A checkout action regression, expression regression, or unexpected ref substitution therefore fails before project scripts execute.

## Policy regression guard

`project_tools/check_ci_pins.py` now treats the exact-head checkout markers as part of CI/supply-chain hygiene for the permanent Repository Integrity workflow.

The checker fails closed if any of these are missing:

- explicit checkout `ref` selecting PR head or event SHA;
- `EXPECTED_SHA` using the same expression;
- actual `git rev-parse HEAD` capture;
- exact actual/expected comparison.

`project_tools/test_ci_pins.py` adds:

- a positive exact-head workflow fixture;
- a negative fixture with the checkout `ref` removed;
- a negative fixture with the actual HEAD verification removed.

## Release identity impact

This tranche changes no runtime package member, so current RPF remains:

`sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`

`.github/workflows/repository-integrity.yml`, `project_tools/check_ci_pins.py`, and `project_tools/test_ci_pins.py` are not members of the current P1-231 full RCF root set. No QA-contract projection or builder contract changes.

Therefore current identities remain:

- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No Chrome or Yandex physical QCF evidence is advanced.

## Current boundary

This is repository-process hardening, not release authorization.

Manifest remains `0.9.8`; release readiness remains **NOT READY**. Existing ACTIVE owners, including P1-164 and P0-072, are not closed or reclassified by this tranche.
