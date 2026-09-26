# Правила работы Claude в репозитории WebClip PDF

Этот файл задаёт рабочий процесс для любой сессии Claude. Current baseline продукта и
исследований — `README.md` и `project_docs/` (прежде всего `project_docs/RESEARCH_REGISTRY.md`);
этот файл их не заменяет.

## Источник истины

- GitHub `lukindv77/webclip-pdf` — единственный источник истины. SHA, статус CI и состояние PR
  из handoff, чата или памяти не принимаются без свежей проверки.
- В начале работы проверить: canonical `main` SHA, открытые PR/issues, workflow runs для точного
  head, строки нужных P-owner в `RESEARCH_REGISTRY.md`, `manifest.json`,
  `project_docs/RELEASE_READINESS.md`.
- Статус и владение P-кодами определяет только `RESEARCH_REGISTRY.md`.

## Цикл работы

`fresh GitHub evidence → bounded owner tranche → deterministic evidence → local CI mirror →
exact-head CI → TOCTOU → merge → post-merge CI → closure review → next owner`

- Старый CI после изменения head не считается.
- Перед merge проверить: PR открыт, не draft, mergeable, base = текущий `main`, head не менялся,
  обязательные проверки зелёные на этом head. Merge — squash с привязкой к head
  (`gh pr merge --squash --match-head-commit <sha>`).
- P-owner не закрывается без отдельного source/runtime closure review.
  `IMPLEMENTED / RELEASE-REGRESSION` не означает release READY.
- Описание PR — по `.github/pull_request_template.md`; PR change contract собирает **все** P-коды
  из текста описания, и каждый из них должен встречаться в изменённых тестах, поэтому не
  упоминать в описании посторонние P-коды.
- Изменения в git (commit, push, PR, merge) — только по явному решению владельца репозитория;
  перед запросом кратко описать по-русски, что изменено и зачем.

## Запрещено без отдельно утверждённой release phase

Реальные Yandex OAuth/API мутации, реальная Chrome qualification, physical release receipt,
product ZIP/build, release-policy/S2 activation, manifest bump, tag, deploy, GitHub Release,
release decision. Provider calls в детерминированных тестах не превращать в live calls.

## Идентичности и свидетели (P1-231)

- Устаревшие test/identity witnesses не лечить изменениями production-кода.
- Historical identities и исторические evidence-документы не переписывать.
- Текущие пины (current 34-file RPF, legacy 33-file RPF, current full RCF) берутся только из
  P1-231 authority на точном коммите. После коммита, меняющего runtime-файлы пакета или входы
  full RCF (`release_contract_inputs_v1.json`, включая `RESEARCH_REGISTRY.md`):

  ```bash
  node project_tools/sync_current_identity_witnesses.js
  ```

  затем проверить дифф и закоммитить. `--check` только сообщает об устаревших пинах.
- Новый файл в корне репозитория должен быть классифицирован в
  `project_tools/test_p1_231_package_topology_census_model.js`; новый файл пакета меняет
  34-file package contract P1-231 — это отдельное решение.

## Локальная проверка

```bash
bash project_tools/local_ci.sh --fast
bash project_tools/local_ci.sh
```

- Требуется Node 22.23.2 и Python 3.12 (как в CI), git; checkout только с LF
  (`.gitattributes`; на Windows дополнительно `git config core.autocrlf false`).
- `--fast` пропускает медленные транзитивные тесты P1-231; перед push — полный прогон.
- На Windows полный прогон заметно медленнее CI из-за тысяч запусков `git`.
- В Git Bash аргументы вида `rev:path` (`origin/main:file`) переписываются как пути Windows —
  использовать `MSYS_NO_PATHCONV=1` или `git ls-tree`.
