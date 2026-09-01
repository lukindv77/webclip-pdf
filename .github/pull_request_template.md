## Scope

Describe the exact purpose of this change and the intended files/subsystems.

## Source safety

- [ ] I started from a fresh fetch of current `main`.
- [ ] I know the exact PR head SHA being reviewed.
- [ ] Runtime/source files changed are listed explicitly, or this is docs/tooling-only.
- [ ] `manifest.json` is unchanged, or release/test truth is synchronized in the same PR.
- [ ] No generated ZIP/CRX, recovery archive, token, secret, browser profile or private key is being committed.

## Repository hygiene

- [ ] This open PR is a real merge candidate, not provenance/archive storage.
- [ ] This PR has one bounded purpose/root and does not duplicate an already active branch/PR for the same owner without explicit coordination.
- [ ] The final PR tree contains no temporary workflow; only approved permanent workflows remain unless this PR explicitly changes infrastructure policy and its guard.
- [ ] At most one temporary `RESEARCH_DELTA_*.md` exists, and any active staged evidence belongs to at most one indexed staged-family.
- [ ] Completed staged checkpoints were compacted losslessly into durable evidence instead of being retained as BASE/STAGE noise.
- [ ] The head branch is disposable after squash merge; `delete_branch_on_merge=true` is expected to remove it automatically.

## Research / P-owner safety

- [ ] `RESEARCH_REGISTRY.md` remains the single owner/status authority and P-numbers were not reused.
- [ ] I followed `project_docs/RESEARCH_CHANGE_WORKFLOW.md` for any new/refined finding.
- [ ] Duplicate/root-cause check was performed before allocating a new P-code, or no new P-code is allocated.
- [ ] New/changed durable research evidence is in the correct family/history document; no acceptance detail exists only in Issue/PR/chat.
- [ ] Historical PASS evidence is not described as a current rerun unless it actually ran on the relevant exact SHA.
- [ ] Requirements/architecture/test documentation was updated where the implementation contract changed, or no contract changed.

### Machine-readable research impact

For any runtime or canonical research/evidence change, select **exactly one**:

- [ ] `research-impact: none` — no canonical research registry/evidence and no P-owner/status/acceptance contract is affected.
- [ ] `research-impact: structural` — canonical research structure, terminology, navigation or provenance location changes, but runtime and P-owner/status/acceptance semantics do not.
- [ ] `research-impact: owner` — one or more P-owners are affected; list them below and update durable research evidence in this PR.

P-owner(s) affected, or `none`:

`______________________________`

For every runtime change and every `research-impact: structural` change, replace the placeholder below with a concrete explanation of why no existing owner/invariant changes, or how the declared owner(s) are affected:

`research-rationale: <replace with concrete rationale>`

If `research-impact: owner` changes runtime and no deterministic regression test is appropriate, select this explicit escape hatch and keep the required real boundary in durable evidence:

- [ ] `test-impact: external-only` — acceptance requires real Chrome/Yandex/other external verification; no suitable deterministic test is being added by this PR.

When deterministic tests are added for `research-impact: owner`, each declared P-code must appear in the changed test source. The PR gate validates these markers against the actual changed-file set. Do not check `external-only` merely to avoid writing a deterministic test.

## Validation

- [ ] `repository-integrity` is green for the exact PR head SHA.
- [ ] Repository growth hygiene and its deterministic self-test passed.
- [ ] PR change-contract validation passed for the exact base/head diff.
- [ ] JavaScript syntax and deterministic tests relevant to the changed tree passed through CI.
- [ ] Release-readiness schema/status validation passed; `NOT READY` is acceptable unless this PR explicitly prepares a release candidate.
- [ ] Real unpacked Chrome QA is completed if the owner/transition requires it, otherwise it remains explicit pending evidence.
- [ ] Real Yandex OAuth/API E2E is completed if the owner/transition requires it, otherwise it remains explicit pending evidence.

## Release impact

- [ ] No build/tag/Release is implied by this PR unless an explicit release request/decision exists.
- [ ] If `manifest.json` changes, `project_docs/RELEASE_READINESS.md` and `project_docs/TEST_STATUS.md` change in the same PR.
- [ ] If release readiness changes, `project_docs/RELEASE_READINESS.md` contains concrete evidence references and will be checked by manual `Release gate`.
- [ ] Historical Releases/tags are not deleted or rewritten without a separate lossless retirement comparison.

## Merge record

Exact reviewed head SHA: `______________________________`

Immediately before merge:

- [ ] head SHA is unchanged from the reviewed CI result;
- [ ] changed-files list still matches reviewed scope;
- [ ] PR is mergeable;
- [ ] expected-head protection is used by the merge operation where supported.

`main` is intentionally `protected=false`; this checklist, exact-head verification and automated PR change contract are compensating controls, not optional ceremony.
