# GitHub workflow — WebClip

Canonical private remote: `lukindv77/webclip-pdf`.
Default branch: `main`.

## Source-of-truth model

- Current physical WIP is the Git tree at a specific `main` commit.
- Exact commit SHA is the canonical recovery identity for WIP.
- A released version should use an annotated tag pointing at the exact tested/released commit.
- Generated build/recovery/handoff ZIPs are derived artifacts, never a parallel source of truth.

## Правила синхронизации

- В GitHub отправляются production code, current project docs, active audit evidence/indexes and `project_tools`.
- Исторические отчёты, уже lossless-консолидированные в current evidence/history registries, не обязаны оставаться отдельными файлами в рабочем дереве: Git history сохраняет их оригинал.
- Не коммитить OAuth/session tokens, `.env`, private keys, browser profiles, caches, temporary logs или generated recovery archives.
- `.gitignore` является частью security boundary и должен проверяться перед bulk sync.
- Manifest `0.9.8` сохраняется до release QA; Git commit сам по себе не является релизом и не требует повышения version.

## Release / recovery

- Пользовательский extension ZIP строится из exact release commit/tag и не обязан содержать вложенную полную копию source/recovery ZIP.
- Отдельный offline recovery artifact создаётся только когда он действительно нужен для disaster/offline recovery; правила — в `BUILD_AND_RECOVERY_RULES.md`.
- Официальный recovery artifact создаётся из clean exact commit и обязан фиксировать source commit SHA + file hashes.
- Если создаётся GitHub Release, его artifacts/checksums должны быть привязаны к exact release tag/commit.

## Handoff

- Handoff ZIP создаётся только по прямому запросу пользователя.
- Handoff должен фиксировать repository, branch, exact commit SHA и checksum артефакта.
- Handoff не заменяет Git history и после переноса уникального разговорного контекста в project docs может быть удалён из current tree.
