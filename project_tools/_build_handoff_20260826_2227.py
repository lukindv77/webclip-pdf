from pathlib import Path
import hashlib
import subprocess
import zipfile

SOURCE_HEAD = "66fd5f828639a9d29f85013fedd4185cd4168e09"
STAMP = "2026-08-26_2227"
DISPLAY_TIME = "2026-08-26 22:27 +07:00"
ARCHIVE_NAME = f"WebClip_Handoff_Audit_{STAMP}_{SOURCE_HEAD[:8]}.zip"
ARCHIVE_PATH = Path("handoff") / ARCHIVE_NAME
CHECKSUM_PATH = Path("handoff") / f"{ARCHIVE_NAME}.sha256"
STATE_PATH = Path("handoff") / f"CURRENT_STATE_{STAMP}.md"
MANIFEST_PATH = Path("handoff") / f"ARCHIVE_MANIFEST_{STAMP}.txt"
TEMP_BUILDER = "project_tools/_build_handoff_20260826_2227.py"
TEMP_WORKFLOW = ".github/workflows/handoff-20260826-2227.yml"

current_state = r'''# WebClip — current handoff state — 2026-08-26 22:27 +07:00

This checkpoint was explicitly requested by the user to move the work to a new chat without losing the current discussion context, audit progress, source code, tests, architecture decisions, or GitHub synchronization state.

## Canonical source of truth

- Repository: `lukindv77/webclip-pdf`
- Branch: `main`
- Audit/handoff source HEAD before packaging: `66fd5f828639a9d29f85013fedd4185cd4168e09`
- GitHub `main` is the **only authoritative working state**. The ZIP is a synchronized recovery convenience, never a reason to roll back a newer `main`.
- At the start of the next chat, fetch fresh `main` first. If it is newer than this source HEAD, inspect all newer commits/diff and continue from the factual newer tree.

## Product/source status

- Chrome Manifest V3 extension WebClip PDF Prototype.
- Manifest remains version `0.9.8`, `minimum_chrome_version: 118`.
- Do **not** bump to `0.9.9`, create a build, tag, or GitHub Release without an explicit user request after real release QA.
- Published 0.9.8 build source remains `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`; requested pre-release tag remains `v0.9.8-build-20260825-1442`.
- Production runtime/config code last changed at P0-063 commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`. Subsequent work through this handoff has been audit documentation/handoff synchronization; production runtime/config has not been changed by the latest audit syncs.
- Last proven product gate remains **88/88 JavaScript syntax PASS + 74/74 deterministic `project_tools/test_*.js` PASS**. These were **not rerun** for later docs-only audit/handoff commits.
- Release QA remains BLOCKED pending real unmanaged unpacked Chrome, real optional host-permission prompt/revoke, real Yandex OAuth/API/upload/move/backup E2E, and remaining visual/timing/storage QA.

## Canonical documents to read before work

1. `GITHUB_REPOSITORY_STATE.md`
2. `handoff/LATEST.md`
3. this file
4. `PROMPT_FOR_NEW_CHAT.md`
5. `project_docs/PRIORITIES_P0_P1_P2.md` — canonical IDs/status/acceptance criteria
6. tail/relevant sections of `DEEP_AUDIT_2026-08-25.md` — evidence/reasoning
7. `manifest.json`
8. subsystem-specific `P*-*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `QA_STATUS_0_9_9.md`, `PROJECT_RECOVERY.md`, tests and source before any fix

## Audit registry at this checkpoint

The current registry reaches:

- **P0-078**
- **P1-194**
- **P2-019**

Before allocating any new ID, re-read the live registry tail. At this exact checkpoint the next potentially free IDs are **P0-079 / P1-195 / P2-020**, but they are not reserved and must not be used without fresh duplicate-check and proof.

Important statuses that must not be accidentally treated as closed include:

- `P0-022` PARTIAL — imported/legacy Yandex remote identity/provenance remains unsafe for destructive authority.
- `P0-023` PARTIAL — retry-cache still lacks exact document identity across same-URL reload/document replacement.
- `P0-039` **PARTIAL** — local download recovery still has unresolved outcome retention issue described below.
- `P0-048` PARTIAL — local-download fallback identity remains ambiguous when multiple matching own-extension downloads exist.
- `P1-004` PARTIAL with detailed document-identity root cause tracked in `P1-171`.
- Other current `PARTIAL` items in the live registry remain authoritative; do not infer closure from historical regression text.

## Most recent audit progress/results in the current chat

The user asked to continue the full audit in **large blocks** and to update GitHub during the audit. The following work was done after the previous 10:47 handoff.

### Confirmed and synchronized findings/refinements

1. **P1-004/P1-171 frame document identity** — child-frame registration/commands are not fully document-bound. `frameAgentsByTab` can retain a stale record across child-frame navigation; outbound commands target only `frameId` and not stored `documentId`; missing documentId is not fail-closed in all paths. This was synchronized earlier in this chat as docs-only; feature remains PARTIAL and detailed root cause is P1-171.

2. **P0-039 local-download recovery — PARTIAL** — a previous capacity hypothesis was correctly rejected, then a real unresolved-outcome defect was proven. In `reconcilePendingLocalDownloads()`, if a bound/intent DownloadItem cannot be found and the checkpoint age exceeds 24 h, WebClip deletes `pendingDownloads` and logs that Journal metadata was not created. Chrome download history can be cleared even though the physical file exists, so absence of DownloadItem is not proof of no side effect. Unknown outcome metadata must not be irreversibly TTL-dropped; keep a bounded dead-letter/manual-resolution/reconciliation record. Final audit-sync commit for this refinement: `59fe8fe89ba3af39dd2202639f25b7bcc48879f0`.

3. **P1-178 OAuth/config generation fence expanded** — storage settlement queues do not fence an OAuth attempt that is still in the network phase. Scenario: PKCE attempt A with `clientId=A` starts; user imports/saves newer settings `clientId=B`; old token exchange A completes later and `finishYandexOAuth()` calls `updateYandexConfig(clientId=A)`, rolling back the newer user choice. Auth attempt generation must fence late auth/config commits against newer settings/config generations, not only pending-key removal. Final audit-sync commit: `a6829b7c93e8372e69a6531d4f48a486a01b7464`.

4. **P1-194 OPEN — IndexedDB eviction / durability class** — newly assigned in this chat. Journal and recovery checkpoints live in extension-origin web-platform storage. The product can report/request `navigator.storage.persist()`, but persistence is not an invariant before irreversible save flows, manifest does not request `unlimitedStorage`, and code can report `recoveryGuaranteed=true` merely because an IndexedDB checkpoint committed. Under storage pressure Chrome can evict non-persistent origin data, which can remove the Journal/checkpoint that is the only recovery evidence after a physical local/Yandex side effect. Introduce an explicit durability-class contract: obtain/verify appropriate eviction protection or downgrade the guarantee and surface the state; do not call recovery guaranteed unless the protection required by the product contract is proven. `unlimitedStorage` is a product/permission choice, not an automatic prescribed fix. Final audit-sync commit: `66fd5f828639a9d29f85013fedd4185cd4168e09`.

5. Existing newer registry items from the continued audit remain important, especially:
   - `P0-078` OPEN — `createPublicLinks=false` needs a privacy-policy generation/revocation fence so older live/recovery operations cannot start a new publish after the user disables publication.
   - `P1-189` OPEN — imported `hostname` can disagree with normalized URL and become privileged Yandex routing authority.
   - `P1-190` OPEN — imported `operationId` can falsely bind an imported entry to an unrelated live local OperationLog.
   - `P1-191` OPEN — manual-token replacement must validate candidate before replacing a known-good auth session and must participate in auth generation fencing.
   - `P1-192` OPEN — long alarm-started MV3 background backup/maintenance promises lack a reliable lifecycle owner during long pure-IDB work.
   - `P1-193` OPEN — optional host permission discovery has too many async boundaries before `permissions.request()`, risking loss of user gesture; use a two-phase discovery → explicit grant UX.

### Large audit blocks examined without allocating duplicate/new IDs

The following blocks were inspected and either found internally consistent or mapped cleanly to existing P-items, so no duplicate IDs were created:

- Journal comment soft-delete retention/export/filter semantics: soft-delete is intentional audit history, not physical erasure.
- Full backup/export consistency: Unicode byte/char, >100k entries and >4 MiB single-entry self-restore gaps already belong to `P0-077`; Journal revision fencing covers concurrent entry/comment mutations during snapshot construction.
- Recovery visibility/diagnostics: active/stale remote checkpoints and OperationLog recovery stages exist; broader telemetry remains P2-008.
- Chrome storage trust boundary at cold start: `storage.*.setAccessLevel(TRUSTED_CONTEXTS)` is awaited/fail-closed before privileged runtime/injection paths.
- Manifest/exposed extension surface: no `web_accessible_resources` or `externally_connectable` bypass found; least-privilege matrix remains P2-016.
- Bulk clear/import vs versioned backup: no independent defect beyond existing destructive-side-effect/public-link contracts; snapshot revision fencing is present.
- Extension-page direct Chrome API settlement: remaining direct calls map to P1-157; no new root cause allocated in that pass.
- Streaming Journal import parser/staging: top-level duplicate keys, null-prototype object construction, depth/item/string/total/deadline limits, trailing-data rejection and atomic replace are present. `entryCount` is not authoritative enough to create a separate defect.
- Incognito: manifest default `spanning` plus explicit content/source/anchor fail-closed paths did not expose a new bypass; P0-045 remains valid.
- Remote stale checkpoint retention: 24 h/6 attempts → stale, bounded 30-day/100 retention is the accepted P1-046 dead-letter policy. Account/root mismatch effects belong to P0-073/P0-074.
- OperationLog confidentiality: persistent sanitizer redacts token/code/verifier/auth keys, Bearer/OAuth strings, URL query/userinfo/fragment and signed Yandex paths. Broader durable URL confidentiality stays P0-066/P1-182.
- Action/urlStats large-data performance: global all-tab refresh fan-out is already P1-170; existing bounded rebuild architecture remains P1-057 unless a fresh repro disproves it.
- Yandex object/content proof: path + exact size and publish-before-proof issue already fully covered by P1-184.
- Trusted extension-page DOM/XSS: no external Journal/Yandex/OperationLog data was found flowing into executable HTML; dynamic external values use DOM nodes/textContent.
- Frame-role privilege: current `frame-agent.js` only emits REGISTER/STATE and hostile host page has no direct `chrome.runtime`; no independent privileged-save exploit proven beyond existing trust/document items.
- Filename/Yandex path safety: PDF names are normalized/sanitized and forced to `.pdf`; Yandex segments sanitize separators/control chars and normalized path containment is P0-040.
- Concurrent same-entry comment/live mutations: stale read→write lost-update and clear/import replacement risk are already explicitly covered by P0-076 CAS/generation requirements.
- Signed Yandex transfer boundary: both worker and offscreen enforce HTTPS `disk.yandex.net` allowlist and offscreen uses `redirect:'error'`.
- Yandex backup-import authority: selected path is normalized and constrained under current `Backup/Journal`, signed download channel is allowlisted, and imported content still goes through untrusted streaming validation.
- OAuth response field bounds: token/clientId/code/scope/account/error fields have dedicated caps; not relying only on total JSON-body cap.
- OAuth requested scopes (`cloud_api:disk.read`, `disk.write`, `disk.info`) are functionally justified by current read/write/account features; no excess-scope finding was allocated merely for the requested set.

## Exact place where the audit stopped

The next block was **Yandex OAuth capability/scope validation**.

A strong but **NOT YET REGISTERED** candidate was identified and must be re-proven/duplicate-checked on fresh `main` before assigning P1-195:

- Standard OAuth response stores bounded `token.scope`, but current flow does not appear to require that the actually granted scope set contains all capabilities WebClip advertises/needs.
- Manual token stores `scope: ''` and is validated primarily by Yandex account/disk read/status. That can prove the token is syntactically/account-valid but does not necessarily prove write/move/publish capabilities before WebClip reports the connection as healthy.
- Potential UX/reliability consequence: a read/info-only or otherwise restricted token can look fully connected, while upload/backup/move/publish fails only on the first mutation.
- Before creating P1-195, inspect the current auth/status code and current registry for any existing capability-probe/permission finding. Decide whether a non-mutating API/known scope claim can reliably prove capabilities; do **not** perform destructive probe operations merely to test rights. Manual tokens may lack introspectable scope metadata, so the correct product behavior may be capability state `unknown` with precise UI rather than pretending full write readiness.

This hypothesis was intentionally **not synchronized into the registry** before the handoff request. Preserve that distinction.

## High-risk open architecture orientation

The full registry is authoritative. Important active clusters include:

- P0-064/P0-065 — memory admission before iframe deep-clone / Blob materialization.
- P0-066 — one canonical confidentiality sanitizer for durable/display URL-bearing metadata.
- P0-067/P0-068 — host-page side effects and live active iframe clone during PDF preparation.
- P0-069 + P1-164/P1-180 — public-link lifecycle, explicit per-entry unpublish confirmation, bulk-operation warnings.
- P0-070/P0-023/P1-171/P1-125 — exact document/navigation generation identity across PDF, retry-cache, frame agents and scripting settlements.
- P0-071 — unsafe PDF URI annotations and hostile mutation after one-time sanitizer.
- P0-072 — clear/import cannot be treated as cancellation of actually running download/upload/publish side effects.
- P0-073/P0-074/P1-179 — immutable Yandex account/root/auth/config operation identity and backup namespace.
- P0-075 — hostile host DOM cannot be a trusted control plane for WebClip UI/selection.
- P0-076 — Journal generation + per-entry revision/CAS for stale single-entry mutations.
- P0-077 — self-generated backup must always fit the same build's import envelope.
- P0-078 — publication policy generation/revocation fence.
- P1-184 — stronger remote object/content proof before reuse/publish/recovery.
- P1-192 — lifecycle ownership of long alarm-started MV3 background work.
- P1-193 — user-gesture-safe optional host permission request.
- P1-194 — storage eviction/durability class vs `recoveryGuaranteed` claim.
- P2-019 — single authoritative IndexedDB schema migration owner.

## Product decisions/invariants that must be preserved

- `createPublicLinks` intentionally remains **ON by default**; that default is not a defect.
- Journal needs per-entry Yandex `unpublish`. **Every unpublish must have explicit user confirmation before remote mutation.**
- After verified unpublish, keep path-only association through saved `remotePath`; open via authenticated Yandex API. If user later manually moves the file, loss of association is acceptable. No hidden global search/re-upload.
- OAuth access token stays only in `chrome.storage.session`; no plaintext persistent refresh token unless a separate architecture decision is explicitly approved.
- PKCE S256 remains. Manual verification-code flow still lacks full returned-state validation (`P1-165`).
- Never put `client_secret` in the extension; ciphertext plus key in the same `storage.local` is not a security improvement.
- Content/page input and host DOM are attacker-controlled. Privileged operations require trusted extension context and exact sender/frame/document/account validation.
- Incognito fail-closed.
- Yandex paths/account/root/object identity fail-closed. A timeout never means a non-cancellable/non-idempotent side effect was cancelled.
- No blind retry for unknown-completion upload/move/download/publish/Chrome side effects. Use durable checkpoints + actual-settlement reconciliation.
- `chrome.downloads.download({saveAs:true})` remains visible extension-page owned with no artificial timeout for the native user dialog; P1-156 requires backing Blob lifecycle to survive the real dialog.
- Offscreen/Blob/PDF/IDB/runtime payloads stay bounded; readonly results publish only after transaction completion.
- OperationLog v2/persistent structural diagnostics are product functionality.
- Cross-origin iframe only after explicit optional host permission; stale/revoked document must fail closed.
- Full PSL stays bundled. `debugger` remains functionally required for `Page.printToPDF` under current architecture.

## GitHub working rules requested by the user

- **Fix all stable changes in GitHub as work progresses.** Do not leave confirmed findings only in chat.
- Before every GitHub write, fetch fresh `main`.
- New findings require proof on current code + duplicate check. If the root cause already exists, expand that P-item instead of allocating a new number.
- Docs-only audit sync normally updates both `project_docs/PRIORITIES_P0_P1_P2.md` and `DEEP_AUDIT_2026-08-25.md` in one guarded batch; production/manifest remain unchanged.
- A temporary one-shot workflow/patch is acceptable for guarded synchronization but must be removed by the final commit and verified absent afterward.
- Do not claim 88/88 + 74/74 were rerun for docs-only changes.
- Before implementing any P-item, first provide a short Russian **«Справка»**: problem, subsystem, effect of closing/not closing, invariants, tests/proof.
- For large `service-worker.js` / `content.js` changes, guarded GitHub Actions patching may be used with exact baseline, targeted tests, `node --check`, all `project_tools/test_*.js`, manifest invariants, and removal of temporary tooling.
- Do not rewrite code from an archive and do not reset a newer `main` to this checkpoint.
- Do not create another handoff/archive unless the user explicitly asks again.

## Immediate continuation in the next chat

The user is still running a **full audit**, not asking to implement the open P-items unless they explicitly change the task. Start from fresh GitHub `main`, verify this handoff against it, then continue the OAuth capability/scope-validation block described above and proceed through remaining large audit blocks. Synchronize stable audit results to GitHub during the work.
'''

prompt = r'''# Стартовый промт для нового чата — WebClip PDF

Продолжай полный аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` (Chrome Manifest V3 extension WebClip PDF Prototype).

## Единственный источник истины

**GitHub `main` — единственный источник истины.** Ничего не восстанавливай из памяти и не переписывай проект с нуля. Handoff ZIP — только синхронизированная аварийная копия; если `main` новее архива, продолжай с нового `main`.

В самом начале нового чата обязательно:

1. Получи свежий HEAD `main`.
2. Прочитай `GITHUB_REPOSITORY_STATE.md`.
3. Прочитай `handoff/LATEST.md` и указанный там `handoff/CURRENT_STATE_2026-08-26_2227.md`.
4. Прочитай `project_docs/PRIORITIES_P0_P1_P2.md` и хвост/релевантные разделы `DEEP_AUDIT_2026-08-25.md`.
5. Прочитай `manifest.json` и подтверди: Manifest V3 / version `0.9.8` / minimum Chrome `118`.
6. Сравни фактический HEAD с handoff source HEAD `66fd5f828639a9d29f85013fedd4185cd4168e09`. Если появились новые commits — сначала изучи их diff и продолжай с фактического более нового состояния. Не reset/revert к handoff.

## Текущая точка

На handoff source HEAD реестр аудита дошёл до **P0-078 / P1-194 / P2-019**. Перед новым ID заново проверь хвост. На этой точке ориентировочно свободны **P0-079 / P1-195 / P2-020**, но они не зарезервированы.

Production runtime/config после P0-063 (`ef0e12bda980d947b8a02da816cf6f64be47ceb8`) последними audit-sync не менялся. Manifest остаётся `0.9.8`. Не делай `0.9.9`, build/tag/Release без отдельного явного запроса пользователя после release QA.

Последний доказанный product gate остаётся **88/88 JS syntax PASS + 74/74 deterministic tests PASS**. Для docs-only commits эти тесты не перезапускались — не утверждай обратное. Release QA по-прежнему BLOCKED до real unmanaged unpacked Chrome, optional host permission prompt/revoke, real Yandex OAuth/API/upload/move/backup E2E и оставшегося visual/timing/storage QA.

## Режим работы

Пользователь требует продолжать **полный аудит крупными блоками** и **фиксировать подтверждённые изменения в GitHub во время аудита**. Не оставляй стабильные findings только в чате.

Каждый новый finding:

- докажи на актуальном коде;
- проверь на дубль в `PRIORITIES_P0_P1_P2.md` и `DEEP_AUDIT_2026-08-25.md`;
- если root cause уже существует — расширь acceptance/status существующего P-item, не создавай новый номер;
- стабильный docs-only пакет синхронизируй в оба canonical audit docs;
- перед каждым write заново fetch fresh `main`;
- temporary workflow/patch должен быть удалён финальным commit;
- production/manifest не менять в docs-only sync;
- не заявлять повторный прогон product gate без реального запуска.

Перед **реализацией** каждого P-item сначала дай короткую русскую «Справку»: проблема, подсистема, эффект закрытия/незакрытия, инварианты, тесты/доказательство. Для больших worker/content изменений допустим guarded one-shot GitHub Actions patch с exact baseline, `node --check`, всеми `project_tools/test_*.js`, targeted tests, manifest invariants и удалением временного tooling.

## Ключевые свежие результаты аудита

Полная формулировка — в реестре и `CURRENT_STATE_2026-08-26_2227.md`. Особо не потерять:

- `P0-039` теперь **PARTIAL**: после unknown local-download outcome отсутствие DownloadItem через 24 ч не доказывает отсутствие физического файла; текущий TTL-drop может уничтожить единственный recovery checkpoint. Нужен bounded unresolved/dead-letter/manual-resolution путь.
- `P1-171` / `P1-004 PARTIAL`: cross-origin frame registry/commands должны быть exact `documentId`/navigation-generation fenced; reused frameId новой document не должен получить stale command.
- `P1-178` расширен: старая OAuth attempt A может завершить network после более новых settings B и поздно откатить `clientId/config`; authAttempt generation должна fence late config/auth commits, не только pending cleanup.
- `P1-194 OPEN`: IndexedDB checkpoint не должен автоматически означать `recoveryGuaranteed`, пока не доказан требуемый eviction/durability class (`persisted()`/осознанная alternative strategy). Не добавляй `unlimitedStorage` автоматически без product/permission решения.
- `P0-078 OPEN`: `createPublicLinks=false` должен через generation/revocation fence запретить ещё не начавшийся publish старых live/recovery операций.
- `P1-189..P1-193` — новые audit findings про imported hostname authority, OperationLog provenance, transactional manual auth replacement, MV3 background lifecycle ownership и user-gesture-safe optional permission request.

Критичные ранее открытые кластеры: P0-064/065 memory admission; P0-066 confidentiality; P0-067/068 PDF host side-effects/live clone; P0-069 public-link lifecycle; P0-070 document-bound print; P0-071 unsafe PDF URI; P0-072 in-flight external side effects vs clear/import; P0-073/074 immutable Yandex identity/context; P0-075 hostile host DOM control plane; P0-076 Journal generation/per-entry CAS; P0-077 self-restorable backup envelope; P1-184 Yandex exact object/content proof; P2-019 single IndexedDB migration owner. P0-022/P0-023/P0-048 остаются PARTIAL.

## Точное место остановки аудита

Продолжи сначала блок **Yandex OAuth capability/scope validation**.

Есть сильная гипотеза, но **P1-195 ещё НЕ создан и НЕ зафиксирован**. Перед присвоением номера заново докажи и проверь дубли:

- обычный OAuth flow сохраняет bounded `token.scope`, но нужно проверить, валидирует ли WebClip фактически выданные scopes против реально необходимых `disk.read/write/info`;
- manual token сохраняется с `scope: ''` и проверяется в основном чтением account/disk status; это может не доказывать write/move/publish capability;
- restricted/read-only token может выглядеть как полностью «подключён», а upload/backup/move/publish упадёт только при первой мутации;
- не делай destructive probe ради проверки rights. Если manual token scope нельзя надёжно introspect, корректным решением может быть capability state `unknown` и честный UX, а не ложная «полная готовность».

Если эта гипотеза после fresh proof является новым root cause — тогда только после проверки хвоста присвой P1-195 и синхронизируй оба audit docs.

## Инварианты продукта/архитектуры

- `createPublicLinks` остаётся ON by default — это продуктовая настройка, не defect.
- Для каждого будущего per-entry Yandex `unpublish` обязательно явное подтверждение пользователя **до** remote mutation. После verified unpublish запись path-only через сохранённый `remotePath`; ручное последующее перемещение файла может разорвать связь, глобальный скрытый поиск не делать.
- OAuth access token только `chrome.storage.session`; persistent plaintext refresh token не вводить без отдельного архитектурного решения.
- PKCE S256 сохранить; manual verification-code flow не имеет полной returned-state validation — P1-165.
- `client_secret` в extension не хранить; ciphertext+key в одном `storage.local` не считать защитой.
- Host DOM/content/page messages attacker-controlled. Privileged operations — trusted extension context + sender/frame/document/account identity.
- Incognito fail-closed.
- Timeout не равен cancellation non-cancellable/non-idempotent side effect. Никаких blind retry unknown upload/move/download/publish; durable checkpoint + actual-settlement reconciliation.
- Native `chrome.downloads.download({saveAs:true})` остаётся visible extension-page owned без искусственного timeout; backing Blob должен жить весь реальный dialog lifecycle.
- Offscreen/Blob/PDF/IDB/runtime payloads bounded; readonly data publish только после transaction completion.
- OperationLog v2/persistent diagnostics — продуктовая функция.
- Cross-origin iframe только после explicit optional host permission; stale/revoked document fail closed.
- Full PSL сохранить. `debugger` пока функционально нужен для `Page.printToPDF`.

## Handoff-правило

Новый handoff создан потому, что пользователь явно попросил перейти в новый чат. Не создавай следующий архив после каждой задачи; только по явному запросу.

Начни ответ в новом чате с фактического свежего HEAD, подтверждения прочитанного `LATEST/CURRENT_STATE`, текущего хвоста P0/P1/P2 и проверки, нет ли commits новее handoff. Затем продолжай аудит с OAuth capability/scope блока и синхронизируй стабильные результаты в GitHub.
'''

github_state = f'''# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` until real release QA and an explicit user request for a new build/release.
- GitHub `main` is the only source of truth for continued work. Never reconstruct production code from a handoff archive when a newer `main` exists.
- During the current full audit, confirmed findings are synchronized to GitHub in small coherent docs-only batches as the audit progresses.
- Builds and GitHub Releases are created only on explicit user request.
- Handoff archive/prompt is created only on explicit user request. The {DISPLAY_TIME} checkpoint was explicitly requested.

## Product/build checkpoints

- Currently published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Current product runtime/config code last changed at P0-063 commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`.
- Audit/handoff source HEAD before this checkpoint packaging: `{SOURCE_HEAD}`.
- Last verified product gate: 88/88 JS syntax PASS and 74/74 deterministic tests PASS. Later docs-only audit/handoff syncs did not rerun that gate.
- Audit registry at the source HEAD reaches P0-078 / P1-194 / P2-019.

## Current handoff

- Handoff pointer: `handoff/LATEST.md`.
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`.
- Current-state note: `handoff/CURRENT_STATE_{STAMP}.md`.
- Archive: `handoff/{ARCHIVE_NAME}`.
- Archive checksum: `handoff/{ARCHIVE_NAME}.sha256`.
- Archive contents manifest: `handoff/ARCHIVE_MANIFEST_{STAMP}.txt`.

Historical incomplete `.bootstrap` transport and temporary synchronization workflows are not part of the active tree and must not be restored.

The handoff archive is a synchronized recovery convenience. The authoritative live working tree is always the **current** `main` branch plus the audit/closure documentation committed with it. A newer `main` always wins over this archive.
'''

latest = f'''# Latest WebClip handoff

Canonical handoff checkpoint explicitly requested on **{DISPLAY_TIME}**.

- Repository: `lukindv77/webclip-pdf`
- Branch: `main`
- Audit/handoff source HEAD before packaging: `{SOURCE_HEAD}`
- Current-state note: `handoff/CURRENT_STATE_{STAMP}.md`
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`
- Archive: `handoff/{ARCHIVE_NAME}`
- Archive SHA-256 file: `handoff/{ARCHIVE_NAME}.sha256`
- Archive contents manifest: `handoff/ARCHIVE_MANIFEST_{STAMP}.txt`
- Manifest: MV3 / `0.9.8` / minimum Chrome `118`
- Last product gate: 88/88 JavaScript syntax PASS; 74/74 deterministic tests PASS (not rerun for docs-only handoff/audit syncs)
- Current audit registry at source HEAD reaches **P0-078 / P1-194 / P2-019**
- Exact audit continuation: finish fresh proof/duplicate-check of Yandex OAuth capability/scope validation; the possible P1-195 is **not yet registered**.

**Start every new chat by fetching fresh GitHub `main`.** If it is newer than the source HEAD above, inspect the newer commits and continue from that newer state. Do not reset to the archive.
'''

Path("handoff").mkdir(parents=True, exist_ok=True)
STATE_PATH.write_text(current_state, encoding="utf-8")
Path("PROMPT_FOR_NEW_CHAT.md").write_text(prompt, encoding="utf-8")
Path("GITHUB_REPOSITORY_STATE.md").write_text(github_state, encoding="utf-8")
Path("handoff/LATEST.md").write_text(latest, encoding="utf-8")

tracked = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
extra = [str(STATE_PATH)]
paths = []
for rel in tracked + extra:
    if not rel or rel in paths:
        continue
    if rel.startswith(".github/workflows/"):
        continue
    if rel == TEMP_BUILDER:
        continue
    if rel.lower().endswith(".zip") or rel.lower().endswith(".sha256"):
        continue
    p = Path(rel)
    if p.is_file():
        paths.append(rel)

# The archive manifest is generated from exactly the payload files and is then
# itself included in the archive, so a future chat can inspect the snapshot.
manifest_lines = [
    "WebClip handoff archive contents manifest",
    "",
    f"Created: {DISPLAY_TIME}",
    "Repository: lukindv77/webclip-pdf",
    "Branch: main",
    f"Audit/handoff source HEAD before packaging: {SOURCE_HEAD}",
    f"Archive: handoff/{ARCHIVE_NAME}",
    "Manifest: MV3 / 0.9.8 / minimum Chrome 118",
    "Audit registry: P0-078 / P1-194 / P2-019",
    "Product gate reference: 88/88 JS syntax PASS + 74/74 deterministic tests PASS; not rerun for docs-only handoff",
    "",
    "Payload files (SHA-256 of uncompressed file contents):",
]
for rel in sorted(paths):
    digest = hashlib.sha256(Path(rel).read_bytes()).hexdigest()
    manifest_lines.append(f"{digest}  webclip-pdf/{rel}")
manifest_text = "\n".join(manifest_lines) + "\n"
MANIFEST_PATH.write_text(manifest_text, encoding="utf-8")
paths.append(str(MANIFEST_PATH))

if ARCHIVE_PATH.exists():
    ARCHIVE_PATH.unlink()
with zipfile.ZipFile(ARCHIVE_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for rel in sorted(paths):
        zf.write(rel, f"webclip-pdf/{rel}")

with zipfile.ZipFile(ARCHIVE_PATH, "r") as zf:
    bad = zf.testzip()
    if bad:
        raise SystemExit(f"Archive integrity failure at {bad}")
    names = set(zf.namelist())
    required = {
        "webclip-pdf/manifest.json",
        "webclip-pdf/service-worker.js",
        "webclip-pdf/content.js",
        "webclip-pdf/offscreen.js",
        "webclip-pdf/frame-agent.js",
        "webclip-pdf/journal.js",
        "webclip-pdf/options.js",
        "webclip-pdf/popup.js",
        "webclip-pdf/PROMPT_FOR_NEW_CHAT.md",
        f"webclip-pdf/handoff/CURRENT_STATE_{STAMP}.md",
        f"webclip-pdf/handoff/ARCHIVE_MANIFEST_{STAMP}.txt",
        "webclip-pdf/project_docs/PRIORITIES_P0_P1_P2.md",
        "webclip-pdf/DEEP_AUDIT_2026-08-25.md",
        "webclip-pdf/GITHUB_REPOSITORY_STATE.md",
    }
    missing = sorted(required - names)
    if missing:
        raise SystemExit(f"Archive missing required files: {missing}")

archive_digest = hashlib.sha256(ARCHIVE_PATH.read_bytes()).hexdigest()
CHECKSUM_PATH.write_text(f"{archive_digest}  {ARCHIVE_NAME}\n", encoding="utf-8")
print(f"Built {ARCHIVE_PATH} sha256={archive_digest} files={len(paths)}")
