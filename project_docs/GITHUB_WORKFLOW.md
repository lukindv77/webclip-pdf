# GitHub workflow — WebClip

Canonical private remote: `lukindv77/webclip-pdf`.
Default branch: `main`.

## Правила синхронизации

- В GitHub отправляется current physical WIP: production code, project docs, closure/static-check evidence и `project_tools`.
- Не коммитить OAuth/session tokens, `.env`, private keys, browser profiles, caches, temporary logs или generated recovery archives, кроме handoff ZIP, который пользователь прямо попросил сохранить в GitHub.
- `.gitignore` является частью security boundary и должен проверяться перед bulk sync.
- Manifest `0.9.8` сохраняется до release QA; Git commit сам по себе не является релизом и не требует повышения version.
- Handoff ZIP создаётся только по запросу пользователя и должен соответствовать конкретному GitHub commit.
- После sync в handoff фиксировать repository, branch, commit SHA и SHA-256 архива.
