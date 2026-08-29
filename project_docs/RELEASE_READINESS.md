# Release readiness — WebClip

Этот документ хранит **только текущую release-readiness декларацию**, которую проверяет ручной workflow `.github/workflows/release-gate.yml`.

Он не является build manifest и не создаёт release автоматически. Exact release candidate SHA передаётся workflow как input и сверяется с фактически checkout-нутым commit.

<!-- WEBCLIP_RELEASE_READINESS_V1
target_version=0.9.9
unpacked_chrome_qa=pending
unpacked_chrome_evidence=none
yandex_e2e=pending
yandex_e2e_evidence=none
release_blockers_review=pending
release_blockers_evidence=none
explicit_release_decision=pending
release_decision_evidence=none
-->

## Current state

**NOT READY.** Текущий manifest остаётся `0.9.8`; `0.9.9` — только целевая WIP-версия.

Release gate должен оставаться fail-closed, пока одновременно не выполнены все условия:

1. реальный unpacked Manifest V3 QA в подходящем Chrome;
2. требуемые реальные permission/debugger/download/native Save As сценарии;
3. реальный Yandex OAuth/API E2E для требуемой auth/account/root/capability модели;
4. review открытых release-critical P0/P1 owners с зафиксированным evidence/решением;
5. explicit release decision;
6. `manifest.json` уже содержит именно target version кандидата;
7. candidate SHA точно совпадает с checkout release-gate.

## Evidence fields

Статус `pass`/`approved` допустим только вместе с конкретной durable evidence-ссылкой или идентификатором: GitHub Issue/PR, test artifact, externally retained QA record или project evidence document.

Нельзя использовать `historical`, `mock`, managed-only browser result или старый Release как замену текущего real release evidence.

## Transition rule

Обновление этого документа само по себе проходит обычный PR-first процесс. Release readiness становится READY только когда `check_release_readiness.py gate` возвращает PASS на exact candidate commit.

Даже READY gate **не создаёт** tag/build/GitHub Release. Публикация выполняется отдельным явным действием после решения пользователя.