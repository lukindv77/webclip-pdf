## Scope

Describe the exact purpose of this change and the intended files/subsystems.

## Source safety

- [ ] I started from a fresh fetch of current `main`.
- [ ] I know the exact PR head SHA being reviewed.
- [ ] Runtime/source files changed are listed explicitly, or this is docs/tooling-only.
- [ ] `manifest.json` is unchanged, or a version/release decision is explicitly justified.
- [ ] No generated ZIP/CRX, recovery archive, token, secret, browser profile or private key is being committed.

## Audit / P-owner safety

- [ ] `AUDIT_REGISTRY.md` remains the single owner/status authority and P-numbers were not reused.
- [ ] I followed `project_docs/AUDIT_CHANGE_WORKFLOW.md` for any new/refined finding.
- [ ] Duplicate/root-cause check was performed before allocating a new P-code, or no new P-code is allocated.
- [ ] New/changed durable audit evidence is in the correct family/history document; no acceptance detail exists only in Issue/PR/chat.
- [ ] Historical PASS evidence is not described as a current rerun unless it actually ran on the relevant exact SHA.
- [ ] Requirements/architecture/test documentation was updated where the implementation contract changed, or no contract changed.

P-owner(s) affected, or `none`:

`______________________________`

## Validation

- [ ] `repository-integrity` is green for the exact PR head SHA.
- [ ] JavaScript syntax and deterministic tests relevant to the changed tree passed through CI.
- [ ] Release-readiness schema/status validation passed; `NOT READY` is acceptable unless this PR explicitly prepares a release candidate.
- [ ] Real unpacked Chrome QA is completed if the owner/transition requires it, otherwise it remains explicit pending evidence.
- [ ] Real Yandex OAuth/API E2E is completed if the owner/transition requires it, otherwise it remains explicit pending evidence.

## Release impact

- [ ] No build/tag/Release is implied by this PR unless an explicit release request/decision exists.
- [ ] If release readiness changes, `project_docs/RELEASE_READINESS.md` contains concrete evidence references and will be checked by manual `Release gate`.
- [ ] Historical Releases/tags are not deleted or rewritten without a separate lossless retirement comparison.

## Merge record

Exact reviewed head SHA: `______________________________`

Immediately before merge:

- [ ] head SHA is unchanged from the reviewed CI result;
- [ ] changed-files list still matches reviewed scope;
- [ ] PR is mergeable;
- [ ] expected-head protection is used by the merge operation where supported.

`main` is intentionally `protected=false`; this checklist and exact-head verification are compensating controls, not optional ceremony.
