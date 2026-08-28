# Стартовый промт для нового чата — WebClip PDF — handoff 2026-08-28

Продолжай аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` — Chrome Manifest V3 extension **WebClip PDF Prototype**.

## Главное правило
**GitHub `main` — единственный источник истины.** Handoff/ZIP/старые сообщения нужны только для восстановления контекста и никогда не имеют приоритета над более новым `main`. Ничего не восстанавливай из памяти или архива поверх GitHub и не переписывай проект с нуля.

Pre-handoff source HEAD: `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6`
Tree: `d430775b544fbaa23fae4d1c5b0cea1643e4ad7e`
Последний известный runtime baseline без последующих production-изменений: `e836b86f322713bf960626a6733bfaeafaf99411`.

Runtime blob identities на pre-handoff source HEAD:
- service-worker.js `9c81d080051ee14d468b78c575dcd9f21ecda803`
- content.js `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
- journal.js `05cb89db3c322d547faf17b2359e92161d0bcbe7`
- manifest.json `259a7c3706e78c1a22021db7dc4769e8accdfb3e`

В новом чате всё равно сначала fresh-fetch фактический `main`.

## Первые обязательные действия
1. Получи свежий HEAD `main`.
2. Прочитай `GITHUB_REPOSITORY_STATE.md`, `handoff/LATEST.md`, `handoff/CURRENT_STATE_2026-08-28.md`, `handoff/CURRENT_STATE_2026-08-28.json`, `handoff/AUDIT_INDEX_2026-08-28.md`, `PROMPT_FOR_NEW_CHAT.md`, `handoff/NEW_CHAT_PROMPT_2026-08-28.md`, `manifest.json`.
3. Прочитай `project_docs/PRIORITIES_P0_P1_P2.md`, `DEEP_AUDIT_2026-08-25.md` и **все** `project_docs/AUDIT_DELTA_*.md`, особенно все от 2026-08-28. Для архитектуры при необходимости читай `ARCHITECTURE.md`, `DATA_MODELS.md`, `DECISIONS_AND_RATIONALE.md`, `TEST_PLAN.md`.
4. Сравни свежий HEAD с `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6`. Если появились новые commits — классифицируй runtime/test/docs/handoff и продолжай с более нового дерева. Не reset/revert к handoff.
5. До любого нового P-номера ищи номер и semantic root cause во всём repo: canonical + deltas + closure/history + source. Стабильные номера не переиспользовать.
6. Кратко сообщи пользователю: фактический HEAD, что handoff+deltas прочитаны, менялся ли runtime после `bcdf3e5235b0c1bd3df3b36ac3d46c88a40762a6`, ближайшие P0/P1 release blockers.
7. Затем продолжай текущий режим пользователя: **аудит несколькими крупными объёмами по многим блокам и синхронизация подтверждённых результатов в GitHub**.

## Дисциплина аудита
- Перед каждым write fresh-fetch `main`; если HEAD продвинулся, изучи новые commits.
- Не коммить гипотезы: source proof -> deterministic schedule/impact -> repo-wide duplicate-check.
- Если root cause уже имеет P-item, расширяй/reopen его; новый номер только для независимого root cause.
- Confirmed findings фиксировать lossless docs-only checkpoints.
- Не объявлять `PRIORITIES_P0_P1_P2.md` и `DEEP_AUDIT_2026-08-25.md` синхронизированными, пока оба не обновлены losslessly вместе.
- Не утверждать, что тесты перезапускались, если реально не запускались.
- Не реализовывать P-item автоматически. Перед реализацией дать короткую русскую **«Справку»**: проблема -> подсистема -> эффект закрытия/незакрытия -> инварианты -> тесты/доказательство.

## Build/release policy
- Manifest остаётся MV3 / `0.9.8` / Chrome >=118.
- Не повышать до `0.9.9`.
- Не делать build/tag/GitHub Release без отдельного явного запроса пользователя после реального release QA.
- Последний доказанный product gate: **88/88 JS syntax PASS + 74/74 deterministic PASS**. После него шёл docs-only аудит; тесты не считать перезапущенными.
- Real unpacked Chrome QA и real Yandex E2E остаются release blockers.

## Архитектурные/security-инварианты
- OAuth access token только `chrome.storage.session`; PKCE S256; никакого `client_secret`.
- Host DOM attacker-controlled; Incognito fail-closed.
- `timeout != cancellation`; никаких blind retry unknown-settlement non-idempotent side effects.
- Native Save As принадлежит visible extension page и не имеет искусственного timeout.
- Blob/PDF/offscreen/IDB/runtime bounded; durable checkpoint/receipt до irreversible side effect.
- Exact document/navigation generation важнее одного tabId/URL; worker/extension boundary выдаёт authoritative operation identity.
- Yandex требует exact account/root/auth-config/object/content/operation provenance, не одного path/size.
- Publication policy generation: disable отзывает ещё не начатую старую authority, re-enable не воскресит её.
- OperationLog v2; clear/retention требует durable history generation.
- Cross-origin iframe только после explicit optional host permission; frame commands exact document + selection-session generation fenced.
- Print generation и selection-session generation различны.
- Full bundled PSL сохраняется.
- PDF path остаётся `chrome.debugger` / `Page.printToPDF`.

## Самые свежие результаты
**P1-210** — `AUDIT_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`.
Lost/rejected outer `runtime.sendMessage` response не доказывает terminal failure. Yandex/local-download/manual-backup UI может предложить fresh non-idempotent retry, хотя worker уже создал PDF cache/durable checkpoint и physical outcome in-progress/unknown. Нужен third-state `result unknown`, exact worker-issued receipt, bounded read-only durable reconciliation и запрет blind fresh generation.

**P1-124 refinement** — `AUDIT_DELTA_TAB_CREATE_MV3_RECEIPT_2026-08-28.md`.
Same-worker `tabCreateSettlements` живёт только в module memory. MV3 restart может стереть receipt, а созданная Chrome tab выживает -> duplicate on retry. Нужен crash-recoverable exact create intent/nonce/generation; не использовать heuristic same-URL reuse.

**P1-167 refinement** — `AUDIT_DELTA_MULTI_BLOCK_REVALIDATION_PART2_2026-08-28.md`.
Bounded diagnostics output не означает bounded computation: full `body.innerText/textContent` scans могут повторяться. Нужен shared traversal/time/string budget и explicit truncation.

**P1-035/P1-043 refinement** — тот же delta.
Quota-pressure `ensureStorageBudget()` вызывает TTL cleanup staging. Active staging/recovery evidence требует owner/lease/generation; storage estimate — snapshot, не reservation; concurrent writers требуют admission/reservation.

**P1-208** — remote recovery phase fairness: bounded oldest prefix может скрывать `remote-verified` rows за auth-blocked PREPARED.
**P1-209** — extension-page version refresh marker публикуется до доказанного успешного reload.
**P1-206** — Journal composed-view revision coherence; grouped-pagination boundary — дополнительная manifestation.
**P1-141** — Options single-flight read freshness across mutation epochs.
**P0-033** — signed URL OperationLog redaction reopened.

**P1-201…P1-210 нельзя считать свободными.** Читай все 2026-08-28 deltas и whole-repo search перед новым номером.

## Ранее подтверждённый критичный кластер
Сохранять и перечитать source/deltas перед реализацией:
- P0-079 operation-owned immutable PDF cache/content generation.
- P0-073/P0-074 exact Yandex account/root/auth/config generation; missing legacy accountUid не wildcard.
- P1-184 exact remote object/content/attempt proof.
- P1-183/P1-090 durable pre-move Trash checkpoint + exact post-move reconciliation.
- P0-072/P0-076/P0-077 destructive fencing, Journal generations/CAS, versioned restore envelope.
- P0-078/P0-069/P1-164 publication generation/lifecycle/unpublish.
- P1-195/P1-196 OAuth capabilities and validity/lifetime truthfulness.
- P1-197/P1-205 OperationLog history epoch + cleanup/write linearization.
- P1-198 worker-issued operation identity.
- P1-199/P1-200 cross-origin print generation + selection/control session generation.
- P1-192/P1-194 MV3 background lifecycle/watchdog + truthful durability class.
- P0-045 Incognito action/popup disclosure; P0-050 urlStats rebuild isolation.
- P1-052 prepared backup unknown upload settlement; P1-064 local-download recovery fairness.
- P1-130/P1-170 Action repair/admission/fanout; P1-174 Journal heavy eager materialization.
- P0-075/P0-067/P0-068/P0-071/P0-066 hostile DOM/real host side effects/active iframe clone/link safety/URL confidentiality.
- P1-138 hidden mutations in read paths; P1-086 readonly IDB early request-success.
- P1-178/P1-191 auth attempt generation + transactional manual replacement.
- P1-207 successful backup must carry exact source Journal revision.

`AUDIT_DELTA_YANDEX_REMOTE_CHECKPOINT_GENERATION_2026-08-27.md` важен: `pendingRemoteSaves` keyed journalEntryId, retry B может заменить PREPARED A, а late A verified/failure/cleanup мутирует/удаляет B. Owner — P0-074/P0-073/P1-184 с P0-076/P0-079/P0-078/P1-198. Нужен immutable remoteSaveGenerationId, exact CAS, separate latest pointer, compare-and-delete own generation.

## Последние пройденные audit-блоки без нового номера
- staging UUID/chunk keys: independent key-reuse root не подтверждён; unknown transfer settlement остаётся у P1-048/P1-052/P1-069/P1-179.
- trusted Journal/Options UUID operationIds не расширили hostile-content P1-198.
- streaming import parser имеет duplicate-key/depth/string/container bounds, fatal streaming UTF-8 и cleanup; independent parser blocker не подтверждён.
- OAuth/PKCE low-level crypto controls положительные; blockers в state-machine semantics.
- generic queue fairness нового root не дала; owners P1-064/P1-208.
- offscreen readonly early result остаётся P1-086; write staging ждёт tx commit.
- destructive public-link: single P0-069, bulk P1-180, point unpublish P1-164.
- native Save As audit был начат, но не закончен; positive controls: distinct prepared/started/released session keys, durable RELEASED tombstone, cap 64, serialized mutation; **новый P не подтверждён**.

## Точное место продолжения
После fresh GitHub, если runtime не изменился, продолжай крупными cross-cutting блоками. Хороший первый блок — завершить native Save As lifecycle: page crash/reload, active-index/tombstone retention, exact owner/generation, Blob URL lifetime, Chrome download actual settlement. Затем user-operation reconciliation P1-210 audit surface, destructive remote receipts, worker-memory-only browser generations, recovery/dead-letter/capacity fairness, global resource reservations, hostile-DOM print/iframe interactions, extension-page stale-read/version-repair ordering.

Каждый блок заканчивать source proof + duplicate decision + при необходимости GitHub checkpoint.

## Handoff composition
Старый full source snapshot остаётся `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`, SHA256 `b9e1fa364bacc8fa21da29d0c721307cc7aa29051e2178f3123da65d3f46ff14`.
Предыдущий context delta: `handoff/WebClip_Handoff_Audit_Delta_2026-08-27_1653_e836b86f.zip`, SHA256 `2b5badfe603580313c244cb019712f1d286ea5f9e8f7392e84c27b225302bc2c`.
Новый ZIP/checksum указан в `handoff/LATEST.md`.

**Current GitHub main always wins.**

Начни новый чат кратким фактическим отчётом по HEAD/runtime/blockers и сразу продолжай крупный аудит. Не проси повторно то, что можно получить чтением GitHub.
