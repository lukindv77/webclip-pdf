# Стартовый промт для нового чата — WebClip PDF

Продолжай полный аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` (Chrome Manifest V3 extension WebClip PDF Prototype).

**GitHub `main` — единственный источник истины.** Архив — только recovery checkpoint. Ничего не восстанавливай из памяти и не переписывай проект с нуля.

В начале нового чата:
1. Получи свежий HEAD `main`.
2. Прочитай `GITHUB_REPOSITORY_STATE.md`.
3. Прочитай `handoff/LATEST.md` и указанный там `handoff/CURRENT_STATE_2026-08-26_2227.md`.
4. Прочитай `project_docs/PRIORITIES_P0_P1_P2.md` и релевантный хвост `DEEP_AUDIT_2026-08-25.md`.
5. Прочитай `manifest.json` и подтверди MV3 / `0.9.8` / minimum Chrome `118`.
6. Сравни HEAD с handoff source `66fd5f828639a9d29f85013fedd4185cd4168e09`. Если `main` новее — сначала изучи новые commits/diff и продолжай с более нового дерева; не reset/revert к handoff.

Handoff — составной lossless checkpoint: полный base ZIP `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip` (SHA-256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`) + текущий delta ZIP 22:27. Production runtime/config между base snapshot и текущим source HEAD не менялся; новые изменения были audit/handoff docs.

Текущий реестр на source HEAD: **P0-078 / P1-194 / P2-019**. Возможные следующие номера: P0-079 / P1-195 / P2-020, но перед присвоением обязательно fresh read + duplicate-check.

Не потерять:
- P0-039 PARTIAL: absence of DownloadItem after 24h не доказывает отсутствие физического файла; нельзя TTL-drop единственный unknown-outcome recovery checkpoint.
- P1-171 / P1-004 PARTIAL: frame agents/commands должны быть exact `documentId`/navigation-generation fenced.
- P1-178 расширен: stale OAuth attempt A не может после network delay откатить более новые settings/config B; нужен общий auth/config generation fence.
- P1-194 OPEN: обычный IndexedDB commit не должен автоматически давать `recoveryGuaranteed`, пока не доказан требуемый eviction/durability class.
- P0-078 OPEN: global `createPublicLinks=false` должен запретить ещё не начавшийся publish старых live/recovery generations.
- P1-189..P1-193: imported hostname authority, imported OperationLog provenance, transactional manual auth replacement, MV3 background lifecycle ownership, user-gesture-safe optional permission request.
- Критичные прежние кластеры: P0-064..P0-077, P1-184, P2-019; P0-022/P0-023/P0-048 остаются PARTIAL.

**Точное место продолжения аудита:** Yandex OAuth capability/scope validation.

Есть сильная гипотеза, но **P1-195 ещё НЕ создан**:
- standard OAuth сохраняет `token.scope`; проверь, валидирует ли WebClip фактически granted scopes;
- manual token имеет `scope: ''` и проверяется в основном read/status путём, что может не доказывать write/move/publish;
- restricted token может выглядеть как полностью подключённый и упасть только на первой мутации;
- не делай destructive permission probes;
- если scope manual token нельзя надёжно introspect, честный capability state `unknown` лучше ложной full-ready семантики.
Только после fresh proof + duplicate-check можно создать P1-195 и синхронизировать оба audit docs.

Режим работы пользователя: **продолжать аудит крупными блоками и фиксировать подтверждённые изменения в GitHub во время аудита**. Перед каждым write fetch fresh `main`; не коммить каждую гипотезу; если root cause уже есть — расширяй существующий P-item. Docs-only sync: оба audit docs вместе, production/manifest untouched, temp workflow удалён финальным commit. Product tests не считать перезапущенными без реального запуска.

Manifest не повышать до 0.9.9 и build/tag/Release не делать без явного запроса после real release QA. Последний доказанный product gate остаётся **88/88 syntax + 74/74 deterministic PASS**; поздние audit commits docs-only.

Инварианты: access token только `storage.session`; PKCE S256; no `client_secret`; host DOM attacker-controlled; Incognito fail-closed; timeout != cancellation; no blind retry unknown non-idempotent side effects; native Save As extension-page owned/no artificial timeout; bounded offscreen/Blob/PDF/IDB/runtime; OperationLog v2 сохранять; cross-origin iframe только explicit optional host permission; full PSL; debugger нужен текущему Page.printToPDF.

Перед реализацией каждого P-item сначала дай короткую русскую «Справку»: проблема, подсистема, эффект закрытия/незакрытия, инварианты, тесты/доказательство.

Начни новый чат с фактического свежего HEAD, короткого подтверждения прочитанного LATEST/CURRENT_STATE и live хвоста P0/P1/P2, затем продолжи OAuth capability/scope audit.
