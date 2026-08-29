# GitHub workflow — WebClip

Canonical private remote: `lukindv77/webclip-pdf`.
Default branch: `main`.

## Source-of-truth model

- Current physical WIP is the Git tree at a specific `main` commit.
- Exact commit SHA is the canonical recovery identity for WIP.
- A released version uses an annotated tag pointing at the exact tested/released commit; target release policy is a cryptographically signed annotated tag when release-signing is configured.
- Generated build/recovery/handoff ZIPs are derived artifacts, never a parallel source of truth.

## PR-first working policy

Normal development, audit, documentation and repository-maintenance changes should use:

`fresh main -> short-lived branch -> Pull Request -> exact-head CI -> reviewed merge -> branch deletion`.

This is the default process even while GitHub branch protection is not technically available/enforced for this private repository. The policy is procedural until GitHub reports active protection/ruleset enforcement.

Rules:

1. Fresh-fetch `main` immediately before creating/updating the work branch.
2. Keep one logical change per PR where practical; do not mix unrelated runtime fixes with repository cleanup or release-history retirement.
3. Use `.github/pull_request_template.md` and record the exact reviewed PR head SHA.
4. Merge only when `repository-integrity` is green for that exact head SHA and the head has not moved since review.
5. Prefer `squash` for maintenance/docs-only PRs unless preserving a meaningful multi-commit investigation is useful; runtime/audit changes may retain commits when their sequence is evidence.
6. Direct writes to `main` are exceptional: emergency recovery or a tooling limitation that makes a safe PR path impossible. They still require fresh-fetch, exact-SHA verification and a post-write CI check.
7. Delete merged short-lived branches once GitHub branch-deletion capability is available. Never preserve a branch merely as a substitute for Git history or a Release artifact.

## Правила синхронизации

- В GitHub отправляются production code, current project docs, active audit evidence/indexes and `project_tools`.
- Исторические отчёты, уже lossless-консолидированные в current evidence/history registries, не обязаны оставаться отдельными файлами в рабочем дереве: Git history сохраняет их оригинал.
- Не коммитить OAuth/session tokens, `.env`, private keys, browser profiles, caches, temporary logs или generated recovery archives.
- `.gitignore` является частью security boundary и проверяется consistency gate.
- Manifest `0.9.8` сохраняется до release QA; Git commit сам по себе не является релизом и не требует повышения version.

## Automated integrity gate

`.github/workflows/repository-integrity.yml` запускается на push/PR в `main` и вручную. Он должен подтверждать:

1. repository/audit organization через `project_tools/check_repository_consistency.py`;
2. JavaScript syntax для tracked `.js`;
3. deterministic `project_tools/test_*.js`;
4. Git-first recovery builder через `project_tools/test_recovery_archive.py`.

CI PASS на конкретном SHA можно считать текущим детерминированным gate только для реально выполненных им checks. Он не заменяет real unpacked Chrome и real Yandex E2E.

## Release / recovery

- Пользовательский extension ZIP строится из exact release commit/tag и не содержит обязательную вложенную полную копию source/recovery ZIP.
- Отдельный offline recovery artifact создаётся только для disaster/offline recovery; правила — в `BUILD_AND_RECOVERY_RULES.md`.
- Официальный recovery artifact создаётся из clean exact commit и фиксирует source commit SHA + file hashes.
- Каждый официальный release asset получает SHA-256; release публикует единый `SHA256SUMS`.
- GitHub Release привязан к exact annotated tag/commit и в описании указывает full commit SHA и реальный статус tag signature.
- Нельзя называть tag подписанным/verified, если подпись фактически не была создана и проверена.
- Исторические pre-release artifacts инвентаризированы в `RELEASE_HISTORY_INDEX.md`; их удаление требует отдельного lossless retirement comparison и не совмещается с обычной разработкой.

## Handoff

- Dated handoff folders не являются current repository state и не накапливаются в `main`.
- Одноразовый handoff создаётся только по прямому запросу пользователя как disposable export exact commit.
- Для восстановления рабочего контекста используется `project_docs/RESTORE_PROMPT.md` + current registry/evidence + Git history.

## Main branch safety target

`main` должен защищаться от force-push и удаления и, когда GitHub позволяет это для данного private repository, требовать `repository-integrity` для merge через PR.

На checkpoint 2026-08-29 GitHub API сообщал `protected=false`; repository rulesets для этого private repository возвращали требование GitHub Pro либо public repository, а branch-protection endpoint был недоступен текущей интеграции. Поэтому protection **не считается включённым**. Наличие PR-first policy и CI снижает риск, но не заменяет реальную серверную защиту ветки.
