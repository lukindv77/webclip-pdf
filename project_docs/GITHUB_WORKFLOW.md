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

## Правила синхронизации

- В GitHub отправляются production code, current project docs, active audit evidence/indexes and `project_tools`.
- Исторические отчёты, уже lossless-консолидированные в current evidence/history registries, не обязаны оставаться отдельными файлами в working tree: Git history сохраняет их оригинал.
- Не коммитить OAuth/session tokens, `.env`, private keys, browser profiles, caches, temporary logs или generated recovery archives.
- `.gitignore` является частью security boundary и проверяется consistency gate.
- Manifest `0.9.8` сохраняется до release QA; Git commit сам по себе не является релизом и не требует повышения version.

## Automated integrity gate

`.github/workflows/repository-integrity.yml` запускается на push/PR в `main` и вручную. Он подтверждает:

1. repository/audit organization через `project_tools/check_repository_consistency.py`;
2. корректность структуры `RELEASE_READINESS.md` через `check_release_readiness.py status` — статус `NOT READY` здесь допустим;
3. JavaScript syntax для tracked `.js`;
4. deterministic `project_tools/test_*.js`;
5. Git-first recovery builder через `project_tools/test_recovery_archive.py`.

CI PASS на конкретном SHA означает только реально выполненные им checks. Он не заменяет real unpacked Chrome и real Yandex E2E.

## Manual release gate

`.github/workflows/release-gate.yml` запускается только вручную и имеет `contents: read`.

Inputs:

- exact candidate commit SHA;
- exact expected manifest version.

Workflow checkout-ит именно candidate SHA, требует clean tree, повторяет repository consistency, JS syntax, deterministic suite и recovery provenance, затем запускает:

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

## Accepted main branch posture

Зафиксированное решение проекта:

- repository остаётся **private**;
- GitHub Pro ради branch protection не приобретается;
- repository не переводится в public ради branch protection;
- `main` остаётся **`protected=false`**;
- защита от ошибок обеспечивается PR-first process, exact-head CI/TOCTOU check, Git history/recovery provenance и запретом обычных direct/force writes в `main`.

Это ограничение нужно учитывать при каждой операции записи, но его не следует снова заводить как open repository-cleanup blocker.

Если API текущей интеграции не умеет удалить obsolete branch refs, такие ветки не считаются источником истины; после доказательства отсутствия уникального полезного состояния их допустимо выровнять с canonical `main`, сохранив прежний exact head SHA в PR/Issue/Git evidence.