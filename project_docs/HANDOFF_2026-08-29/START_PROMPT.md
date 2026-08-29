# START PROMPT — WebClip PDF / продолжение разработки и глубокого аудита

Продолжаем проект **WebClip PDF / Chrome extension** из репозитория `lukindv77/webclip-pdf`.

## Сначала восстанови контекст из GitHub

GitHub `main` — абсолютный source of truth.

Контрольный HEAD перед записью этого handoff:
`e42e4bbb08f00b6717b59e3ec94693e03eb1cda6`

После commit'ов самого handoff HEAD стал новее. Первым действием:

1. получи свежий HEAD `main`;
2. открой `project_docs/HANDOFF_2026-08-29/`;
3. прочитай `START_PROMPT.md`, `HANDOFF_CONTEXT.md`, `RECENT_COMMITS.md` и `RESTORE_ARCHIVE.md`;
4. прочитай `project_docs/PRIORITIES_P0_P1_P2.md`;
5. просмотри newest `project_docs/AUDIT_DELTA_*.md` после handoff baseline;
6. fresh-fetch runtime files по теме: `service-worker.js`, `content.js`, `frame-agent.js`, `journal.js`, `options.js`, `popup.js`, `offscreen.js`.

Старый `project_docs/HANDOFF_2026-08-28/` — исторический; новый пакет его supersede'ит.

## Как вести аудит

Продолжай глубокий аудит несколькими крупными объёмами по множеству блоков.

Каждую сессию:
- начинай минимум с **10 крупных блоков**;
- до инструментов дай краткую оценку способности закончить их в этой же сессии и риска переноса;
- если тема уже покрыта canonical/delta — не пиши дубль, замени её соседней незакрытой;
- каждый завершённый finding/positive-control фиксируй отдельным `project_docs/AUDIT_DELTA_*.md` и commit в `main`;
- перед новым P-number делай repository-wide semantic duplicate-check;
- не предполагай, что следующий номер свободен, пока не проверил текущий `main`.

## Критические архитектурные правила

- exact generation / immutable receipt / CAS;
- `not-admitted` != `unknown` != `verified` != `superseded`;
- caller timeout/AbortController не является cancellation/remote rollback;
- exact browser document generation + отдельная SPA/application generation;
- exact child document + permission generation;
- exact Yandex account/auth/root/config/publication context;
- exact DownloadItem/remote-object identity вместо filename/path/size heuristics;
- durable correctness receipt отдельно от OperationLog/diagnostics;
- portable Journal schema отдельно от internal DB/recovery/capability fields;
- stale async generation не переписывает newer user-visible state;
- fresh read current row по одному textual id не заменяет CAS и может ретаргетить stale action.

## Owners, которые нельзя потерять

Особенно учитывать:
- **P0-080** — same-document SPA/application generation.
- **P1-211** — deleted comment tombstone retention/capacity, включая portable backup/import capacity debt.
- **P1-212** — synthetic page-control activation during print prep.
- **P1-213** — inert flattened iframe proxy.
- **P1-214** — remote-frame prepare/restore rollback receipts.
- **P1-215** — import staging confirmation lease.
- **P1-216** — legacy URL derived-identity parity.
- **P1-217** — Chrome Action degraded truth.

И existing owners: P0-022, P0-023, P0-039, P0-048, P0-070, P0-074, P0-075, P0-076, P0-078, P1-090, P1-157, P1-171, P1-175, P1-177, P1-178, P1-183, P1-184, P1-191, P1-198, P1-206, P1-207, P1-210.

Не назначай следующий номер без проверки current registry.

## Самые свежие findings после старого handoff

- Save confirmation должна быть связана с SPA/application generation.
- PDF retry cache URL equality не доказывает same application generation.
- Journal Apply должен revalidate target SPA generation прямо перед action.
- ReadLater->Upload и Delete->Trash не могут switch account/root/config mid-saga.
- Mutating Yandex timeout означает **remote settlement unknown**, а не “данные не изменились”.
- Deleted comment capacity debt переносится через официальный backup/import.
- Multi-segment folder creation не может switch auth между path segments.
- Create Folder result loss требует exact-account reconciliation.
- Disconnect — partial auth commit.
- Known numeric Chrome `downloadId` нельзя терять при failed bind.

## Runtime/test/release truth

Handoff-baseline `manifest.json`: version `0.9.8`, Manifest V3, minimum Chrome `118`.
Canonical priorities ведут `0.9.9 WIP`, но runtime manifest = 0.9.8.

Историческое evidence: **88/88 JS syntax PASS + 74/74 deterministic tests PASS**. Эти tests НЕ перезапускались после большого массива docs-only commits. Не называй их новым gate current HEAD. Real unpacked Chrome QA и real Yandex E2E остаются release requirements. Не создавай build/tag/Release для docs-only работы без отдельного запроса.

## Стиль работы

- GitHub `main` — source of truth.
- Короткие progress updates каждые несколько tool calls.
- Ошибку собственного аудита исправляй correction delta.
- Не маскируй unknown settlement retry/reset патчем.
- В конце session fresh-check HEAD/compare и перечисляй только реально созданные commits.
- Все material conclusions должны быть в GitHub, а не только в чате.

Начни с fresh HEAD-check, перечисли прочитанные handoff-файлы, затем предложи план минимум из 10 крупных блоков и продолжай аудит.
