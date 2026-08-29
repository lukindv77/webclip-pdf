## Scope

Describe the exact purpose of this change and the intended files/subsystems.

## Source safety

- [ ] I started from a fresh fetch of current `main`.
- [ ] I know the exact PR head SHA being reviewed.
- [ ] Runtime/source files changed are listed explicitly, or this is docs/tooling-only.
- [ ] `manifest.json` is unchanged, or a version/release decision is explicitly justified.
- [ ] No generated ZIP/CRX, recovery archive, token, secret, browser profile or private key is being committed.

## Audit / documentation safety

- [ ] `AUDIT_REGISTRY.md` ownership/status remains authoritative and P-numbers were not reused.
- [ ] New/changed audit evidence is indexed or consolidated in the correct family, or this change does not affect audit evidence.
- [ ] Historical PASS evidence is not described as a current rerun unless it actually ran on this head SHA.
- [ ] Requirements/architecture/test documentation was updated where the implementation contract changed, or no contract changed.

## Validation

- [ ] `repository-integrity` is green for the exact PR head SHA.
- [ ] JavaScript syntax and deterministic tests relevant to the changed tree passed through CI.
- [ ] Real unpacked Chrome QA is completed if the change requires it, otherwise it remains an explicit release gate.
- [ ] Real Yandex OAuth/API E2E is completed if the change requires it, otherwise it remains an explicit release gate.

## Release impact

- [ ] No build/tag/Release is implied by this PR unless an explicit release request/decision exists.
- [ ] Historical Releases/tags are not deleted or rewritten without a separate lossless retirement comparison.

## Merge record

Exact reviewed head SHA: `______________________________`

Merge only after checking that the PR head has not moved since the reviewed CI result.
