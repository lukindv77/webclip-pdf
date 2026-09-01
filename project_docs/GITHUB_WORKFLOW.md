# GitHub workflow — WebClip

Canonical private remote: `lukindv77/webclip-pdf`.
Default branch: `main`.

## Source-of-truth model

- Current physical WIP is the Git tree at a specific `main` commit.
- Exact commit SHA is the canonical recovery identity for WIP.
- A released version uses an annotated tag pointing at the exact tested/released commit; target release policy is a cryptographically signed annotated tag when release-signing is configured.
- Generated build/recovery/handoff ZIPs are derived artifacts, never a parallel source of truth.

## PR-first working policy

Normal development, audit, documentation and repository-maintenance changes use:

`fresh main -> work branch -> Pull Request -> exact-head CI -> reviewed merge`

`main` intentionally remains `protected=false`: the repository stays private, and the project will not move to GitHub Pro or public solely for branch protection. This is an accepted constraint, not an unfinished migration.

Compensating process controls:

1. Fresh-fetch `main` immediately before creating/updating the work branch.
2. Keep one logical change per PR where practical; do not mix unrelated runtime fixes with repository cleanup or release-history retirement.
3. Use `.github/pull_request_template.md` and record the exact reviewed PR head SHA.
4. Compare the full PR diff with fresh `main` before review/merge.
5. Merge only when `repository-integrity` is green for that exact head SHA and the head has not moved since review.
6. Immediately before merge re-check head SHA, mergeability and changed files; use expected-head protection in the merge call when available.
7. Prefer squash for repository/docs-only PRs; preserve multi-commit runtime/audit investigations only when their sequence itself is useful evidence.
8. Never force-update `main` as part of normal work.

Direct modification of `main` is reserved for explicitly documented emergency recovery after a separate user decision. `protected=false` is not permission to bypass PR-first workflow.

The detailed P-owner lifecycle is defined in `AUDIT_CHANGE_WORKFLOW.md`.

## Machine-readable PR change contract

`project_tools/check_pr_change_contract.py` compares the exact PR base/head diff and the PR body.

When a PR changes product runtime (`manifest.json`, root extension JS/HTML/CSS/assets) or canonical audit registry/evidence, the PR must select exactly one machine marker:

- `audit-impact: none` — runtime change does not change any P-owner/status/acceptance contract;
- `audit-impact: owner` — one or more P-owners are affected and are listed explicitly.

Every runtime change also requires a concrete `audit-rationale:`. Placeholder/empty/`none`/`n/a` explanations fail closed.

For `audit-impact: owner`:

- durable family/history/registry evidence must change in the same PR;
- declared P-code must occur in the changed durable evidence;
- runtime changes also require a changed deterministic `project_tools/test_*.js`, unless the PR explicitly selects `test-impact: external-only` because acceptance genuinely requires real Chrome/Yandex/another external boundary;
- every declared P-code must occur in the source of the changed deterministic test;
- `test-impact: external-only` is incompatible with changing a deterministic test in the same PR.

If `AUDIT_REGISTRY.md` changes, a second durable audit evidence/history file is mandatory in the same PR.

If `manifest.json` changes, `RELEASE_READINESS.md` and `TEST_STATUS.md` must change in the same PR.

The `external-only` marker is an explicit audited exception, not a generic waiver from deterministic testing.

## Правила синхронизации

- В GitHub отправляются production code, current project docs, active audit evidence/indexes and `project_tools`.
- Исторические отчёты, уже lossless-консолидированные в current evidence/history registries, не обязаны оставаться отдельными файлами в working tree: Git history сохраняет их оригинал.
- Не коммитить OAuth/session tokens, `.env`, private keys, browser profiles, caches, temporary logs или generated recovery archives.
- `.gitignore` является частью security boundary и проверяется consistency gate.
- Manifest `0.9.8` сохраняется до release QA; Git commit сам по себе не является релизом и не требует повышения version.

## Immutable and low-noise CI supply chain

External GitHub Actions are referenced only by exact 40-character commit SHA. Mutable refs such as `@v4`, `@v5`, `@main` or branch names are forbidden by `project_tools/check_ci_pins.py`.

Exact current action pins are intentionally **not duplicated in this document**. The authoritative pin values are the `uses:` lines in the permanent workflow files:

- `.github/workflows/repository-integrity.yml`;
- `.github/workflows/release-gate.yml`.

Dependabot may update those exact SHAs in a reviewed grouped maintenance PR. This policy document changes only when the policy itself changes, not for every routine action-version update. `project_tools/check_ci_pins.py` validates that every external action reference remains a full immutable SHA.

Hosted runner family is fixed to `ubuntu-24.04`; setup inputs are fixed to Python `3.12.14` and Node.js `22.23.2`.

Permanent workflows must remain read-only with respect to the repository: `contents: read`, no `*: write` permission and no mutating `gh api --method POST/PUT/PATCH/DELETE` command. Job/check result itself is the CI status; separate mutable commit-status publication is intentionally not used.

`.github/dependabot.yml` monitors **only** `github-actions`, checks monthly, groups all action updates, and allows at most one open version-update PR. This keeps immutable action SHAs maintainable without creating a stream of unrelated dependency PRs. Dependabot PRs go through the same exact-head CI and review process as any other maintenance PR.

This does not make GitHub-hosted infrastructure mathematically immutable: GitHub can update the `ubuntu-24.04` runner image. It does ensure that action source revisions and language runtime versions cannot silently drift through mutable workflow refs. Updating a pin/version is a normal reviewed PR with full integrity checks.

## GitHub Actions usage minimization

GitHub Actions are an **independent verification and environment-boundary layer**, not the default interactive development/debugging environment. The project minimizes runner usage without weakening required evidence or delivery gates.

Permanent operating rules:

1. **Local-first preflight.** Before the first substantive push of a logical change, all checks that can truthfully run in the available local/tool environment should be completed there first: Python compile/checkers, deterministic model/unit/integration tests, JavaScript syntax/tests, Registry/Matrix/release-readiness consistency and diff/staleness guards. A failing deterministic checker should normally be debugged locally rather than through repeated push→Actions cycles.
2. **Actions remain mandatory at delivery boundaries.** A normal PR still requires one green `repository-integrity` run for the exact reviewed PR head and one green post-merge `repository-integrity` run for the exact resulting canonical `main`. These two gates are not removed merely to save Actions minutes.
3. **Remote browser evidence is exception-driven.** GitHub-hosted Chrome/OS execution is used when the acceptance claim requires L3/L4/L5 evidence that the local environment cannot honestly supply—for example current Chrome renderer semantics, physical PDF evidence, a runner-specific platform boundary or another explicitly external environment. Lower-level deterministic checks do not move to Actions merely because a remote runner is convenient.
4. **No CI-as-debugger loop by default.** Intermediate commits should be batched into a coherent locally preflighted head before push where practical. Every push must have a durable reason; repeated tiny pushes solely to discover ordinary syntax/checker failures are process noise.
5. **Reuse evidence under Change Impact.** Existing physical/browser evidence is not rerun automatically when relevant runtime, contract, browser semantics and fixture assumptions are unchanged. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` Change Impact rules decide when revalidation is required.
6. **Avoid one-off workflows when a reusable path exists.** Browser/audit runs should prefer an existing parameterized or otherwise reusable workflow. A temporary workflow is justified only when the required environment/evidence cannot be expressed through the current permanent workflows; it must be removed before merge unless separately promoted by an explicit infrastructure decision.
7. **Path/scope selectivity for heavy checks.** New heavy workflows must use the narrowest truthful trigger/change-impact scope practical. Documentation-only or audit-tooling-only changes must not cause unrelated Chrome/PDF/Yandex evidence reruns unless their change impact actually invalidates that evidence.
8. **Caching is allowed only as an execution optimization.** Safe caches for immutable browser archives, language packages or build dependencies may reduce Actions minutes, but a cache hit never changes the acceptance/evidence requirement and must not become a second source of truth.
9. **Local limitation must be explicit.** If the available local browser/runtime is too old or otherwise unsuitable, it may be used for lower-level development controls but must not be cited as current-feature evidence. The required remote/current environment is then a deliberate evidence run, not a reason to move the whole development loop into CI.
10. **Optimization must not weaken truthfulness.** Actions minimization may reduce duplicate executions, pushes and runner minutes; it must not skip an evidence layer required by the claim, bypass exact-SHA verification, weaken TOCTOU, suppress post-merge validation or convert an external/unknown boundary into a synthetic PASS.

Target operating shape: the large majority of checker/test development happens before push; GitHub Actions are concentrated on the two delivery integrity gates plus the comparatively small set of current-browser/physical/external evidence runs that genuinely require hosted infrastructure.

## Automated integrity gate

`.github/workflows/repository-integrity.yml` запускается на push/PR в `main` и вручную. Он подтверждает:

1. repository/audit organization через `project_tools/check_repository_consistency.py`;
2. immutable GitHub Actions pins, read-only workflow permissions and low-noise Dependabot scope через `check_ci_pins.py` + self-test;
3. exact PR runtime/audit contract через `check_pr_change_contract.py` + self-test на PR;
4. корректность структуры `RELEASE_READINESS.md` через `check_release_readiness.py status` — статус `NOT READY` здесь допустим;
5. JavaScript syntax для tracked `.js`;
6. deterministic `project_tools/test_*.js`;
7. Git-first recovery builder через `project_tools/test_recovery_archive.py`.

CI PASS на конкретном SHA означает только реально выполненные им checks. Он не заменяет real unpacked Chrome и real Yandex E2E.

## Manual release gate

`.github/workflows/release-gate.yml` запускается только вручную и имеет `contents: read`.

Inputs:

- exact candidate commit SHA;
- exact expected manifest version.

Workflow checkout-ит именно candidate SHA, требует clean tree, повторяет repository consistency, immutable/read-only CI hygiene check/self-test, PR-contract self-test, JS syntax, deterministic suite и recovery provenance, затем запускает:

`project_tools/check_release_readiness.py gate`

Gate fail-closed проверяет `RELEASE_READINESS.md`: real unpacked Chrome evidence, real Yandex E2E evidence, review release-critical P0/P1 owners, explicit release decision и совпадение target/manifest/candidate identity.

**Release gate ничего не публикует:** не создаёт build, tag, Release, asset и не изменяет repository contents. READY — только условие для отдельного явного release action.

## Release / recovery

- Пользовательский extension ZIP строится из exact release commit/tag и не содержит обязательную вложенную полную копию source/recovery ZIP.
- Отдельный offline recovery artifact создаётся только для disaster/offline recovery; правила — в `BUILD_AND_RECOVERY_RULES.md`.
- Официальный recovery artifact создаётся из clean exact commit и фиксирует source commit SHA + file hashes.
- Каждый официальный release asset получает SHA-256; release публикует единый `SHA256SUMS`.
- GitHub Release привязан к exact annotated tag/commit и в описании указывает full commit SHA и реальный статус tag signature.
- Нельзя называть tag подписанным/verified, если подпись фактически не была создана и проверена.
- Исторические pre-release artifacts инвентаризированы в `RELEASE_HISTORY_INDEX.md`; их удаление требует отдельного lossless retirement comparison.

## Handoff

- Dated handoff folders не являются current repository state и не накапливаются в `main`.
- Одноразовый handoff создаётся только по прямому запросу пользователя как disposable export exact commit.
- Для восстановления рабочего контекста используется `RESTORE_PROMPT.md` + current registry/evidence + Git history.

## Steady-state operating policy

Утверждённый постоянный порядок поддержания устойчивого состояния GitHub без излишнего роста repository noise:

1. **Одно смысловое изменение — один рабочий PR.** Перед началом работы выполняется fresh-fetch `main`. В обычном режиме одновременно ведётся не более одного активного проектного PR; единственное штатное исключение — один автоматический Dependabot PR.
2. **Для runtime обязателен audit-contract.** Любое изменение runtime получает `audit-impact` и конкретный `audit-rationale`. При затронутом owner указываются P-код, durable evidence и deterministic regression test либо обоснованный `test-impact: external-only`.
3. **После каждого merge обязателен push-run canonical `main`.** Green PR-head сам по себе недостаточен. Если post-merge `repository-integrity` красный, новая разработка не начинается до возврата `main` в green state.
4. **Рабочие ветки одноразовые и не являются источниками истины после merge.** При доступном автоматическом удалении merged branches они удаляются. Пока `delete_branch_on_merge=false`, прежний exact head сохраняется в PR/Git history, а оставшийся obsolete ref допустимо выровнять с canonical `main` после проверки отсутствия уникального полезного состояния.
5. **Dependabot остаётся месячным и только для GitHub Actions.** Auto-merge не используется. Каждый grouped update проходит exact diff review, оценку major-version implications и полный CI. Exact Action SHA хранится только в executable workflow source, а не дублируется в narrative docs.
6. **Issues создаются только для реальной незавершённой работы или нового finding.** Исторический `AUDIT_REGISTRY` не переносится задним числом в сотни Issues; registry остаётся authority по P-owner/status.
7. **Периодический health review выполняется редко и по порогу:** после каждых **12 merged project PR** либо раз в **3 месяца**, что наступит раньше. Проверяются branches, open PR/Issues, workflow/pins, Releases/tags, broken documentation references и registry/evidence consistency. При отсутствии drift cleanup commits не создаются.
8. **Исторические evidence не удаляются по календарю.** Git history не переписывается через BFG/filter-repo ради уборки. Retirement отдельного evidence/artifact допускается только после доказанного lossless переноса уникального содержания и фиксации retirement evidence.
9. **Release остаётся отдельным явно санкционированным событием.** Требуются explicit release decision, актуальный `RELEASE_READINESS.md`, real unpacked Chrome QA, real Yandex E2E, review release-critical owners и ручной release gate; build/tag/Release выполняются только после этого отдельным действием.
10. **Repository infrastructure не наращивается без наблюдаемой необходимости.** CODEOWNERS, Projects, milestones, новые governance-файлы, дополнительные workflows или более сложная CI/container infrastructure добавляются только когда закрывают конкретно доказанный риск или повторяющуюся операционную проблему.

Эти десять пунктов являются постоянным steady-state регламентом проекта. Изменение самого регламента требует отдельного явного согласования; routine project work не должно порождать новые policy-файлы или дублирующие tracking-сущности.

## Accepted main branch posture

Зафиксированное решение проекта:

- repository остаётся **private**;
- GitHub Pro ради branch protection не приобретается;
- repository не переводится в public ради branch protection;
- `main` остаётся **`protected=false`**;
- защита от ошибок обеспечивается PR-first process, exact-head CI/TOCTOU check, Git history/recovery provenance и запретом обычных direct/force writes в `main`.

Это ограничение нужно учитывать при каждой операции записи, но его не следует снова заводить как open repository-cleanup blocker.

Если API текущей интеграции не умеет удалить obsolete branch refs, такие ветки не считаются источником истины; после доказательства отсутствия уникального полезного состояния их допустимо выровнять с canonical `main`, сохранив прежний exact head SHA в PR/Issue/Git evidence.
