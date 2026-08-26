from pathlib import Path
import hashlib
import subprocess
import zipfile

SOURCE_HEAD = "a57042fe82e9c8659a6241b23728f613ae905531"
STAMP = "2026-08-26_1047"
ARCHIVE_NAME = f"WebClip_Handoff_Audit_{STAMP}_{SOURCE_HEAD[:8]}.zip"
ARCHIVE_PATH = Path("handoff") / ARCHIVE_NAME
CHECKSUM_PATH = Path("handoff") / f"{ARCHIVE_NAME}.sha256"
STATE_PATH = Path("handoff") / f"CURRENT_STATE_{STAMP}.md"
MANIFEST_PATH = Path("handoff") / f"ARCHIVE_MANIFEST_{STAMP}.txt"

current_state = r'''# WebClip — current handoff state — 2026-08-26 10:47 +07:00

This checkpoint was explicitly requested by the user for moving the work to a new chat without losing audit/development context.

## Canonical source of truth

- Repository: `lukindv77/webclip-pdf`
- Branch: `main`
- Audit/handoff source HEAD before packaging: `a57042fe82e9c8659a6241b23728f613ae905531`
- GitHub `main` is always authoritative. The archive is only a synchronized recovery convenience.
- At the start of a new chat, fetch fresh `main` first. If it is newer than this handoff source HEAD, inspect the intervening commits and continue from the newer tree; never reset to this checkpoint.

## Product/source status

- Manifest: MV3 / version `0.9.8` / minimum Chrome `118`.
- Do **not** bump to `0.9.9`, create a build, or create a GitHub Release without explicit user request after real release QA.
- Published 0.9.8 build source remains `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`; published pre-release tag remains `v0.9.8-build-20260825-1442`.
- Current product code last changed at P0-063 commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`. Comparing that commit to this handoff source HEAD changes only `DEEP_AUDIT_2026-08-25.md` and `project_docs/PRIORITIES_P0_P1_P2.md`; production runtime/config files are byte-unchanged through this handoff.
- Last verified product gate at P0-063: JavaScript syntax **88/88 PASS**; deterministic `project_tools/test_*.js` **74/74 PASS**. These tests were not rerun for docs-only audit commits.
- Release gate is still BLOCKED pending real unmanaged unpacked Chrome, real optional host-permission grant/revoke UI, real Yandex OAuth/API/upload/move/backup E2E, and remaining visual/timing/storage QA.

## Canonical audit documents

Read these before any new audit/fix:

1. `project_docs/PRIORITIES_P0_P1_P2.md` — canonical IDs/statuses/acceptance criteria.
2. `DEEP_AUDIT_2026-08-25.md` — detailed audit evidence and reasoning.
3. `GITHUB_REPOSITORY_STATE.md` — repository/build/handoff policy.
4. Relevant `P*-*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `QA_STATUS_0_9_9.md`, `PROJECT_RECOVERY.md`, and tests for the subsystem being changed.

Current audit registry reaches **P0-077**, **P1-188**, and **P2-019**. Verify the tail before assigning any new ID. At this checkpoint the next potentially free IDs are P0-078, P1-189, P2-020, but do not use them until a fresh registry read confirms they are still free.

## Most recent confirmed critical audit findings

The registry is exhaustive; this is only the latest/high-risk orientation list.

- `P0-064` OPEN — same-origin flattened iframe deep clone happens before node/text/byte admission budget.
- `P0-065` OPEN — offscreen Blob materialization can happen before active Blob admission rejects it.
- `P0-066` OPEN — source URL credentials/token-like data can enter PDF/Journal/backup without one durable confidentiality sanitizer.
- `P0-067` OPEN — PDF preparation can call real host-page `.click()` and trigger page side effects.
- `P0-068` OPEN — flattened iframe proxy is live DOM, not inert; nested browsing/custom-element/page semantics can run.
- `P0-069` OPEN — destructive Journal/Yandex flows can lose local control while a public link remains active.
- `P0-070` OPEN — live `Page.printToPDF` is not fenced to the originating `documentId`/navigation generation.
- `P0-071` OPEN — unsafe URI schemes such as `javascript:`, `data:` and `file:` can become PDF link annotations.
- `P0-072` OPEN — clear/replace-import can delete durable checkpoints while external upload/download side effects are still actually running.
- `P0-073` OPEN — remote-save completion/recovery/retry is not fully fenced to immutable account/root identity.
- `P0-074` OPEN — long Yandex operations do not use one immutable operation-scoped auth/config context.
- `P0-075` OPEN — content UI/selection is exposed to hostile page DOM: open shadow comment disclosure, page-visible selection attrs and synthetic DOM clicks can form a confused-deputy control channel.
- `P0-076` OPEN — stale single-entry Journal mutations can commit after clear/import and corrupt/delete replacement entries with the same ID; needs Journal generation/per-entry revision CAS.
- `P0-077` OPEN — WebClip can produce a successful full backup outside the same build's import envelope (byte count, entry count, per-entry size mismatch).
- `P0-022`, `P0-023`, `P0-048` are PARTIAL and must not be treated as closed.
- `P0-063` remains REGRESSION; do not reopen without a current reachable reproduction, but dormant transfer hardening is tracked separately.

Newest P1/P2 findings include:

- `P1-181` OPEN — version-refresh marker commits before the reload repair it represents.
- `P1-182` OPEN — SelectionSnapshot v3 stores plaintext parent/previous/next text outside the user's selected node; new backups should use privacy-preserving fingerprints.
- `P1-183` OPEN — delete→Yandex Trash lacks a durable exact target checkpoint before the destructive move.
- `P1-184` OPEN — remote upload/recovery uses path + exact size as proof of object/content identity; needs stronger durable proof.
- `P1-185` OPEN — imported timestamps/localDayKey are not normalized to a safe temporal domain.
- `P1-186` OPEN — imported journal comment IDs need uniqueness/collision handling.
- `P1-187` OPEN — iframe flattening loses rendered canvas state (and needs browser verification for other live rendered state).
- `P1-188` OPEN — imported locator `cssPath` executes arbitrary CSS selector grammar; only canonical generated grammar or bounded structural restore should be accepted.
- `P2-019` OPEN — IndexedDB schema upgrade ownership is duplicated between worker and Journal view; future migrations can be skipped.

## Important user/product decisions

- `createPublicLinks` intentionally stays **ON by default**. Do not classify that default as a defect.
- Journal must eventually support per-entry Yandex `unpublish`. **Every** per-entry public-link revoke requires explicit user confirmation before any remote mutation.
- After verified unpublish, keep a path-only association and allow opening through authenticated Yandex API by the saved `remotePath`; if the user later moves the file manually, losing the association is acceptable. Do not silently run a global search by resource identity after unpublish.
- Bulk clear/import must not silently imply that public links were revoked; P1-180/P0-069 cover the warning/control requirements.
- Permanent OperationLog diagnostics are product functionality. Do not remove/truncate them merely to simplify code.
- Do not create a handoff archive after every task. This checkpoint exists because the user explicitly requested it.

## Security/architecture invariants to preserve

- OAuth access token only in `chrome.storage.session`; no plaintext refresh-token persistence; `storage.local/session` trusted contexts; legacy token cleanup awaited/fail-closed.
- PKCE S256/state; current manual verification-code flow does not truly validate returned state (`P1-165`). Prefer redirect capture via `chrome.identity.launchWebAuthFlow()` when implementing the auth UX redesign.
- Do not store `client_secret` in the extension. Do not call same-storage ciphertext+key a security improvement.
- Potential token-persistence alternatives already analyzed in `DEEP_AUDIT_2026-08-25.md`: session-only default, passphrase-encrypted advanced mode, Native Messaging + OS keychain, backend/BFF, and R&D WebAuthn/PRF. Do not change production credential storage without a separate explicit implementation task.
- Treat content-script/page messages and host DOM as attacker-controlled. Privileged operations stay in trusted extension contexts and must validate sender/target/document/account identity.
- Incognito boundary fail-closed; no silent persistent browsing history.
- Yandex paths canonicalized; destructive operations must prove managed-branch/account/root/object provenance.
- Timeout never means a non-cancellable Chrome/network side effect was cancelled. Use durable checkpoint + actual-settlement reconciliation; no blind retry for non-idempotent operations.
- `chrome.downloads.download({saveAs:true})` remains visible extension-page owned. Do not move native Save As to MV3 worker or give the user-owned dialog an artificial caller timeout. P1-156 additionally requires the backing Blob lease to survive the dialog without a hidden wall-clock TTL.
- Offscreen Blob/PDF/transfer lifecycle and IDB/runtime payloads stay bounded; readonly results publish only after transaction completion.
- OperationLog v2 stays append-only/auditable except explicit bounded maintenance.
- Cross-origin iframe support only after explicit optional host permission; validate sender/frame/document and revoke/stale state fail-closed.
- Full PSL remains bundled/current; debugger permission remains functionally required for `Page.printToPDF` unless architecture changes with proof.

## GitHub/audit working mode requested by the user

During the ongoing audit, **update GitHub as the audit progresses**. Do not wait until the whole audit is finished. Commit only stable, confirmed batches (normally a few related findings/acceptance-criteria updates), not every thought.

For docs-only audit synchronization:

- fetch fresh `main` immediately before every write;
- guard against the exact baseline;
- update `project_docs/PRIORITIES_P0_P1_P2.md` and `DEEP_AUDIT_2026-08-25.md` together;
- keep manifest/product code untouched;
- if using a one-shot workflow, remove the workflow/temp patch file in its final product/docs commit and re-fetch `main` to prove the tree is clean;
- never claim product tests reran if the commit only changed docs.

For implementation tasks, first give a short Russian **«Справка»**: problem, subsystem, impact if fixed/not fixed, invariants, and proof/tests. Before implementation fetch fresh `main` again. For large worker/content changes, a guarded one-shot GitHub Actions patch workflow is acceptable; it must run `node --check`, all deterministic `project_tools/test_*.js`, relevant targeted tests, enforce manifest 0.9.8/MV3/Chrome 118 invariants, remove temp tooling, and report the exact final HEAD.

Do not rewrite project history or reconstruct code from old archives. Do not create build/Release unless explicitly requested.

## Immediate continuation for the new chat

The user was running a **full audit**, not asking to fix the open P-items yet. Continue audit from fresh GitHub `main` unless the user explicitly changes the goal. Cover remaining security/trust boundaries, external I/O, recovery/crash consistency, large-result CPU/memory, storage/parser behavior, UI/admin diagnostics, duplication/dead code, standards and architecture. Check every candidate against the current registry before allocating a new ID, and sync each stable confirmed batch to GitHub during the audit.
'''

prompt = r'''# Стартовый промт для нового чата — WebClip PDF

Продолжай полный аудит и разработку приватного GitHub-репозитория `lukindv77/webclip-pdf` (Chrome Manifest V3 extension WebClip PDF Prototype).

## Главное правило

**GitHub `main` — единственный источник истины.** Ничего не восстанавливай из памяти и не переписывай проект с нуля. Архив handoff — только аварийная копия, а не более новый источник, чем `main`.

В самом начале нового чата:

1. Получи свежий HEAD ветки `main`.
2. Прочитай `GITHUB_REPOSITORY_STATE.md`.
3. Прочитай `handoff/LATEST.md` и указанный там `CURRENT_STATE_2026-08-26_1047.md`.
4. Прочитай `project_docs/PRIORITIES_P0_P1_P2.md` и хвост `DEEP_AUDIT_2026-08-25.md`.
5. Прочитай `manifest.json`; должно оставаться MV3 / `0.9.8` / minimum Chrome `118`.
6. Если текущий HEAD новее handoff source HEAD, сначала изучи новые commits/diff и продолжай **с фактического нового HEAD**. Никогда не reset/revert к handoff без явной причины.

Handoff source baseline перед упаковкой: `a57042fe82e9c8659a6241b23728f613ae905531`. На этой точке реестр аудита уже дошёл до **P0-077 / P1-188 / P2-019**. Перед присвоением нового номера обязательно проверь актуальный хвост реестра; ориентировочно следующие свободные номера были P0-078 / P1-189 / P2-020.

## Состояние production-кода

Manifest остаётся `0.9.8`; не повышай версию до `0.9.9` и не создавай build/GitHub Release без отдельного явного запроса пользователя после реального release QA.

Production runtime/config код после P0-063 не менялся: последний product commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`; между ним и handoff source HEAD менялись только `DEEP_AUDIT_2026-08-25.md` и `project_docs/PRIORITIES_P0_P1_P2.md`. Последний доказанный product gate: **88/88 JS syntax PASS + 74/74 deterministic tests PASS**. Не утверждай, что эти тесты были повторно прогнаны для docs-only audit commits.

Release QA по-прежнему BLOCKED до реального unmanaged unpacked Chrome, optional host permission prompt/revoke, реального Yandex OAuth/API/upload/move/backup E2E и оставшегося visual/timing/storage QA.

## Что сейчас делали

Мы продолжали **полный аудит** и по ходу аудита синхронизировали подтверждённые findings в GitHub небольшими docs-only пакетами. Продолжай этот режим, если пользователь не поменяет задачу: проверяй security/trust boundaries, внешние I/O, recovery/crash consistency, CPU/memory на больших данных, storage/parser, UX/admin/diagnostics, dead/duplicate code, стандарты и архитектуру.

Новый finding сначала докажи на актуальном коде и проверь на дубль. Если root cause уже покрыт существующим P-item — расширь его acceptance criteria/status, не создавай новый номер. Подтверждённые стабильные пакеты синхронизируй в `project_docs/PRIORITIES_P0_P1_P2.md` + `DEEP_AUDIT_2026-08-25.md` **во время аудита**, а не только в самом конце. Перед каждым write заново fetch fresh `main`. Docs-only sync не должен менять production/manifest; временный workflow/patch должен быть удалён в финальном commit.

## Критичные открытые ориентиры

Полный список — только в текущем реестре. Среди наиболее важных незакрытых пунктов на handoff:

- P0-064/065 — memory admission до iframe deep-clone / Blob materialization.
- P0-066 — единая confidentiality sanitation source URL до PDF/Journal/backup.
- P0-067/068 — host-page side effects и live iframe clone при PDF preparation.
- P0-069 — public-link lifecycle при destructive Journal/Yandex действиях.
- P0-070 — `Page.printToPDF` должен быть document-generation fenced.
- P0-071 — unsafe PDF URI schemes.
- P0-072 — clear/import нельзя считать отменой реально живых upload/download side effects.
- P0-073/074 — immutable Yandex account/root/auth/config operation fencing.
- P0-075 — hostile host page видит/может синтетически управлять WebClip DOM UI/selection; shared DOM нельзя считать trusted control-plane.
- P0-076 — stale single-entry mutations после clear/import; нужен Journal generation/per-entry CAS.
- P0-077 — единый self-restorable backup envelope.
- P0-022/P0-023/P0-048 — PARTIAL, не считать закрытыми.
- P1-181…P1-188 — последние новые audit items; особенно locator privacy, delete→Trash recovery, Yandex content proof, temporal import, duplicate comment IDs, canvas fidelity, imported CSS selector grammar.
- P2-019 — единый owner IndexedDB schema migrations.

## Зафиксированные продуктовые решения

`createPublicLinks` **должен оставаться включённым по умолчанию** — это не дефект.

Нужно добавить точечное снятие публичной ссылки у конкретной Journal entry. Перед **каждым** таким `unpublish` обязательно получить явное подтверждение пользователя. После подтверждённого unpublish запись становится path-only: `publicUrl/resourceId` больше не являются связью, но пока сохранённый `remotePath` существует, Journal должен уметь открыть файл через авторизованный Yandex API. Если пользователь потом вручную переместил файл, потеря связи допустима; не делай скрытый глобальный поиск/автоповтор upload.

## Инварианты, которые нельзя ломать

- OAuth access token — только `chrome.storage.session`; refresh token не хранить plaintext/persistently без отдельного архитектурного решения.
- PKCE S256; manual verification-code flow сейчас не делает полноценную returned-state validation — P1-165.
- Не хранить `client_secret` в extension. Шифрование token в `storage.local` ключом, который лежит там же, не считать реальной защитой.
- Content/page input и host DOM — attacker-controlled. Privileged operations только в trusted extension context с sender/frame/document/account validation.
- Incognito fail-closed.
- Yandex paths/account/root/object identity fail-closed; non-idempotent operation timeout не означает cancellation.
- Никаких blind retry для неизвестно завершившегося upload/move/download/Chrome side effect; только durable checkpoints + actual-settlement reconciliation.
- `chrome.downloads.download({saveAs:true})` остаётся extension-page owned и без искусственного timeout системного диалога. P1-156 требует также не дать backing Blob истечь скрытым 16-минутным TTL пока диалог реально открыт.
- Offscreen/Blob/PDF/IDB/runtime payloads bounded; readonly publish только после completion.
- OperationLog v2 и постоянная структурная диагностика — продуктовая функция, не удалять ради упрощения.
- Cross-origin iframe только после explicit optional host permission; revoke/stale document fail-closed.
- Full PSL сохранить. `debugger` сейчас функционально нужен для `Page.printToPDF`.

## Режим GitHub

Пользователь явно потребовал фиксировать изменения в GitHub **во время аудита**. Делай небольшие, но завершённые audit sync commits по подтверждённым findings. Не коммить каждую гипотезу.

Перед каждой новой implementation P-задачей дай короткую русскую **«Справку»**: проблема, подсистема, эффект закрытия/незакрытия, инварианты, тесты/доказательство. Перед write снова fetch fresh `main`. Для крупных `service-worker.js`/`content.js` изменений разрешён guarded one-shot GitHub Actions patch: exact baseline, targeted tests, `node --check`, все `project_tools/test_*.js`, manifest invariants, temp workflow/patch удаляется финальным commit.

Не создавай handoff/archive после каждой задачи. Этот handoff создан только потому, что пользователь специально попросил перейти в новый чат.

Начни новый чат с подтверждения свежего HEAD и краткого резюме того, что ты прочитал из `handoff/LATEST.md`/`CURRENT_STATE` и текущего хвоста реестра. Затем продолжай аудит от фактического GitHub `main`.
'''

github_state = r'''# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository for WebClip PDF Prototype.

## Current policy

- Production manifest remains MV3 / `0.9.8` until real release QA and an explicit user request for a new build/release.
- GitHub `main` is the only source of truth for continued work. Never reconstruct production code from a handoff archive when a newer `main` exists.
- During the current full audit, confirmed findings are synchronized to GitHub in small coherent docs-only batches as the audit progresses.
- Builds and GitHub Releases are created only on explicit user request.
- Handoff archive/prompt is created only on explicit user request. The 2026-08-26 10:47 +07 checkpoint was explicitly requested.

## Product/build checkpoints

- Currently published 0.9.8 build source: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`.
- Requested pre-release tag: `v0.9.8-build-20260825-1442`.
- Published ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`.
- Current product runtime/config code last changed at P0-063 commit `ef0e12bda980d947b8a02da816cf6f64be47ceb8`.
- Audit/handoff source HEAD before the new checkpoint packaging: `a57042fe82e9c8659a6241b23728f613ae905531`.
- Comparing P0-063 product commit to that audit HEAD changes only `DEEP_AUDIT_2026-08-25.md` and `project_docs/PRIORITIES_P0_P1_P2.md`.
- Last verified product gate: 88/88 JS syntax PASS and 74/74 deterministic tests PASS.

## Current handoff

- Handoff pointer: `handoff/LATEST.md`.
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`.
- Current-state note: `handoff/CURRENT_STATE_2026-08-26_1047.md`.
- Archive: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`.
- Archive checksum: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip.sha256`.
- Archive contents manifest: `handoff/ARCHIVE_MANIFEST_2026-08-26_1047.txt`.

Historical incomplete `.bootstrap` transport and temporary synchronization workflows are not part of the active tree and must not be restored.

The handoff archive is a checkpoint convenience. The authoritative live working tree is always the **current** `main` branch plus the audit/closure documentation committed with it.
'''

latest = r'''# Latest WebClip handoff

Canonical handoff checkpoint explicitly requested on **2026-08-26 10:47 +07:00**.

- Repository: `lukindv77/webclip-pdf`
- Branch: `main`
- Audit/handoff source HEAD before packaging: `a57042fe82e9c8659a6241b23728f613ae905531`
- Current-state note: `handoff/CURRENT_STATE_2026-08-26_1047.md`
- New-chat prompt: `PROMPT_FOR_NEW_CHAT.md`
- Archive: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip`
- Archive SHA-256 file: `handoff/WebClip_Handoff_Audit_2026-08-26_1047_a57042fe.zip.sha256`
- Archive contents manifest: `handoff/ARCHIVE_MANIFEST_2026-08-26_1047.txt`
- Manifest: MV3 / `0.9.8` / minimum Chrome `118`
- Last product gate: 88/88 JavaScript syntax PASS; 74/74 deterministic tests PASS
- Current audit registry at source HEAD reaches P0-077 / P1-188 / P2-019

**Start every new chat by fetching fresh GitHub `main`.** If it is newer than the source HEAD above, inspect the newer commits and continue from that newer state. Do not reset to the archive.
'''

manifest_text = f'''WebClip handoff archive manifest\n\nCreated: 2026-08-26 10:47 +07:00\nRepository: lukindv77/webclip-pdf\nBranch: main\nAudit/handoff source HEAD before packaging: {SOURCE_HEAD}\nProduct runtime/config last changed at: ef0e12bda980d947b8a02da816cf6f64be47ceb8\nManifest: MV3 / 0.9.8 / minimum Chrome 118\nAudit registry at source HEAD: P0-077 / P1-188 / P2-019\n\nArchive policy:\n- GitHub main is authoritative.\n- Snapshot includes tracked repository source/docs plus the new current-state/manifest files.\n- Excludes .github/workflows temporary tooling, project_tools/_build_handoff_20260826_1047.py, all nested *.zip and *.sha256 files to avoid recursive archives.\n- Git history is not embedded; use GitHub main for history.\n'''

Path("handoff").mkdir(parents=True, exist_ok=True)
STATE_PATH.write_text(current_state, encoding="utf-8")
Path("PROMPT_FOR_NEW_CHAT.md").write_text(prompt, encoding="utf-8")
Path("GITHUB_REPOSITORY_STATE.md").write_text(github_state, encoding="utf-8")
Path("handoff/LATEST.md").write_text(latest, encoding="utf-8")
MANIFEST_PATH.write_text(manifest_text, encoding="utf-8")

tracked = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
extra = [str(STATE_PATH), str(MANIFEST_PATH)]
paths = []
for rel in tracked + extra:
    if not rel or rel in paths:
        continue
    if rel.startswith(".github/workflows/"):
        continue
    if rel == "project_tools/_build_handoff_20260826_1047.py":
        continue
    if rel.lower().endswith(".zip") or rel.lower().endswith(".sha256"):
        continue
    p = Path(rel)
    if p.is_file():
        paths.append(rel)

ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
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
        "webclip-pdf/project_docs/PRIORITIES_P0_P1_P2.md",
        "webclip-pdf/DEEP_AUDIT_2026-08-25.md",
        "webclip-pdf/PROMPT_FOR_NEW_CHAT.md",
        f"webclip-pdf/{STATE_PATH}",
        f"webclip-pdf/{MANIFEST_PATH}",
    }
    missing = sorted(required - names)
    if missing:
        raise SystemExit(f"Archive missing required files: {missing}")
    if any(name.startswith("webclip-pdf/.github/workflows/") for name in names):
        raise SystemExit("Temporary workflow leaked into archive")

sha256 = hashlib.sha256(ARCHIVE_PATH.read_bytes()).hexdigest()
CHECKSUM_PATH.write_text(f"{sha256}  {ARCHIVE_NAME}\n", encoding="utf-8")
print(f"ARCHIVE={ARCHIVE_PATH}")
print(f"SHA256={sha256}")
print(f"FILES={len(paths)}")
