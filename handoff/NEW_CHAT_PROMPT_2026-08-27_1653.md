# Стартовый промт для нового чата — WebClip PDF

Продолжай полный аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` — Chrome Manifest V3 extension **WebClip PDF Prototype**.

## 0. Главное правило

**GitHub `main` — единственный источник истины.** Архивы/handoff-файлы — recovery/context checkpoints, но они никогда не имеют приоритета над более новым `main`.

Ничего не восстанавливай из памяти, прошлых сообщений или старого handoff поверх GitHub. Не переписывай проект с нуля. Если `main` новее этого handoff — сначала изучи новые commits/diff и продолжай с более нового дерева.

Handoff был сформирован на базе pre-handoff HEAD:
`e836b86f322713bf960626a6733bfaeafaf99411`

Tree этого source snapshot:
`61e92fca5d8f0d6b6ff35e0e26f5bab498de7d89`

После этого baseline могут идти только handoff/docs commits. В новом чате всё равно сначала получи фактический свежий HEAD `main`.

## 1. Первые действия в новом чате — выполнить до любого анализа/изменения

1. Получи свежий HEAD `main` репозитория `lukindv77/webclip-pdf`.
2. Прочитай:
   - `GITHUB_REPOSITORY_STATE.md`
   - `handoff/LATEST.md`
   - указанный там актуальный `handoff/CURRENT_STATE_2026-08-27_1653.md`
   - `PROMPT_FOR_NEW_CHAT.md`
   - `project_docs/PRIORITIES_P0_P1_P2.md`
   - `DEEP_AUDIT_2026-08-25.md`
   - **все** `project_docs/AUDIT_DELTA_*.md`, особенно датированные 2026-08-26/27.
3. Прочитай `manifest.json`; ожидаемый инвариант handoff: MV3, version `0.9.8`, minimum Chrome `118`.
4. Сравни свежий HEAD с `e836b86f322713bf960626a6733bfaeafaf99411`. Если есть более новые commits — сначала классифицируй их (runtime/test/docs/handoff) и используй более новый код.
5. Перед назначением любого нового P0/P1/P2 **ищи номер и root cause во всём репозитории**, включая canonical tables, closure files и `AUDIT_DELTA_*`. Недостаточно искать только canonical registry: часть новых evidence-reserved items пока живёт в delta.
6. Коротко сообщи пользователю фактический HEAD, что handoff прочитан, что production/runtime изменился или не изменился после baseline, и затем продолжай работу.

## 2. Текущий режим работы пользователя

Пользователь просит: **продолжать аудит крупными блоками и обновлять GitHub с учетом проведенного аудита.**

Практический режим:
- перед каждым write делай fresh fetch `main`;
- если `main` продвинулся — изучи новые commits, не overwrite/revert их;
- не коммить каждую гипотезу;
- сначала source proof + semantic duplicate-check;
- если root cause уже имеет P-item — расширяй существующий item;
- новые номера выдавай только самостоятельному root cause;
- стабильные audit findings фиксируй в GitHub крупными lossless docs-only checkpoints;
- canonical `PRIORITIES` и `DEEP_AUDIT` нельзя объявлять синхронизированными, пока оба не обновлены losslessly вместе;
- не утверждай, что тесты перезапущены, если они реально не запускались.

Перед реализацией каждого P-item дай короткую русскую **«Справку»**: проблема → подсистема → эффект закрытия/незакрытия → инварианты → тесты/доказательство.

## 3. Build/release policy

- `manifest.json` остается `0.9.8`.
- Не повышай до `0.9.9`.
- Не делай build/tag/GitHub Release без отдельного явного запроса пользователя **после** реального release QA.
- Последний доказанный product gate: **88/88 JS syntax PASS + 74/74 deterministic PASS**.
- Последующие audit commits преимущественно docs-only; тесты после них не перезапускались.
- Real unpacked Chrome QA и real Yandex E2E остаются release blockers.

## 4. Архитектурные/безопасностные инварианты

- OAuth access token — только `chrome.storage.session`.
- PKCE S256; никакого `client_secret`.
- Host page/DOM считается attacker-controlled.
- Incognito fail-closed.
- `timeout != cancellation`.
- Нельзя blind-retry неизвестно завершившиеся non-idempotent side effects.
- Native `Save As` принадлежит visible extension page и не имеет искусственного timeout.
- Offscreen/Blob/PDF/IDB/runtime pipelines должны быть bounded.
- Durable checkpoint/receipt создается до irreversible side effect.
- Unknown settlement не превращать в ложное «операция ничего не изменила».
- Exact document/navigation generation важнее одного `tabId`/URL.
- Exact operation identity должна выдаваться trusted worker/extension boundary.
- Yandex destructive authority требует exact account/root/object/content/provenance proof, не одного path.
- Global privacy policy disable должен отзывать еще не начавшиеся старые publish generations.
- OperationLog v2 сохраняется; administrative clear/retention требует generation semantics.
- Cross-origin iframe поддержка только после explicit optional host permission.
- Frame registry/commands обязаны быть exact document generation fenced.
- Print generation и ordinary selection-session generation — разные generations.
- Full bundled Public Suffix List — общая основа siteKey/domain routing.
- Current PDF implementation требует `chrome.debugger` / `Page.printToPDF`.

## 5. Критичные свежие evidence-reserved / audit items

Перед изменением статуса/номера сверяй GitHub-файлы, потому что canonical registry может отставать от delta.

### P0-079 — operation-owned PDF bytes/cache
Tab-owned mutable retry cache опасен для concurrent saves, local retry TOCTOU и tab-close/navigation cleanup. Нужен immutable PDF operation/generation receipt + отдельный latest-retry pointer.

### P1-195 — Yandex OAuth capability/scope truthfulness
Requested/granted/missing/unknown; manual opaque token != proven write/move/publish capability.

### P1-196 — Yandex OAuth validity/lifetime truthfulness
valid/expired/invalid/unknown; current-generation 401 demotion; stale 401 не чистит новую auth; 403 != revocation.

### P1-197 — OperationLog history generation
**Уже существует в audit delta.** Administrative clear/retention без durable epoch позволяет late old writer воскресить удаленную историю.

### P1-198 — worker-owned operation identity
Authoritative operationId/receipt должен выдаваться trusted worker/extension boundary, а не content caller.

### P1-199 — cross-origin print prepare/restore generation
Old async `restore-print(A)` может прийти после `prepare-print(B)` и разрушить B; есть lost-pointer/orphan style case.

### P1-200 — remote frame selection/control generation
`start/stop/set-mode/clear/restore` идут async без selection generation/sequence; child Escape может сделать child idle при top UI selecting.

## 6. Важные расширения существующих items

P0-022 imported remote provenance; P0-023/P0-070 exact document generation; P0-039/P0-048 local-download unknown settlement/identity; P0-050 urlStats rebuild isolation; P0-066 URL confidentiality; P0-068 flattened print active/network semantics; P0-069/P1-164 public link lifecycle; P0-071 safe printable URI boundary; P0-073 legacy Yandex account binding; P0-074 auth/config/account generation; P0-075 hostile control plane; P0-076 Journal per-entry/bulk generation; P0-077 restore envelope; P0-078 publication privacy generation; P1-035 active import staging lifetime; P1-043 global quota reservation; P1-052 prepared backup negative proof; P1-064 local download recovery fairness; P1-086 IDB request-before-tx-complete; P1-090/P1-183/P1-184 exact remote identity/content; P1-138 hidden Yandex mutations; P1-158 late prerequisite read admission; P1-167 aggregate remote-frame preparation budget; P1-171/P1-175/P1-193 document/permission generation; P1-173 actual-settlement queue admission; P1-177 usable-auth scheduler; P1-178 auth/config/pending PKCE generation; P1-182/P1-188/P1-189/P1-190 import privacy/provenance; P1-192 MV3 lifecycle; P1-194 durability class.

## 7. Audit documentation state

Canonical large files могут отставать от последних findings. Обязательно прочитай все `project_docs/AUDIT_DELTA_*.md`. Не считай номер свободным только потому, что его нет в canonical table.

Если синхронизируешь canonical registry: обновляй **оба** canonical audit docs together; сохраняй историю и стабильные номера; не объявляй CLOSED только на основании разговора; production/manifest не трогай в docs-only canonical sync.

## 8. Recovery / handoff composition

Старый полный source snapshot:
`handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`
SHA-256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`.

Старый handoff source: `66fd5f828639a9d29f85013fedd4185cd4168e09`.

Текущий handoff — composite: старый full source snapshot + Git history/current `main` как authoritative delta + новый dated handoff ZIP с prompt/state/checksums. Новый ZIP — context/audit delta, а не замена Git source.

Исторический загруженный файл «Продолжение разработки расширения.txt» от 25 августа считать только старым контекстом; он superseded текущим GitHub.

## 9. Точное место продолжения

Последние audit-блоки: P1-199 print generation; P1-200 selection/control generation; P1-035 active import staging lifetime; P0-074 stale Yandex account-cache generation; P1-064 local-download recovery fairness; P1-167 remote-frame command fan-out.

Если GitHub не продвинулся, следующий разумный блок: **Yandex destructive/recovery object identity + remaining cross-context/storage actual-settlement ordering**.

Не начинай с реализации автоматически. Сначала fresh GitHub state + priorities.

Начни новый чат кратким сообщением: фактический HEAD; подтверждение чтения LATEST/CURRENT_STATE/audit deltas; есть ли runtime changes после handoff baseline; какие P0/P1 evidence items сейчас ближайшие release blockers; затем продолжай задачу пользователя.
