from pathlib import Path
import subprocess

BASE = "d72ac2f6c23cf3b529b56643781352c8c489ac99"
TEMP = {"project_tools/_audit_sync_20260825_b.py", ".github/workflows/audit-sync-20260825-b.yml"}
changed = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", f"{BASE}..HEAD"], text=True).splitlines()))
if changed != TEMP:
    raise SystemExit(f"Guard failed: unexpected changes since baseline: {sorted(changed)}")

pp = Path("project_docs/PRIORITIES_P0_P1_P2.md")
ap = Path("DEEP_AUDIT_2026-08-25.md")
priorities = pp.read_text(encoding="utf-8")
audit = ap.read_text(encoding="utf-8")

for code in ("P0-070", "P0-071", "P1-171", "P1-172", "P2-018"):
    if f"| {code} |" in priorities:
        raise SystemExit(f"Guard failed: {code} already exists")

def replace_row(text, code, row):
    lines = text.splitlines()
    hits = [i for i,l in enumerate(lines) if l.startswith(f"| {code} |")]
    if len(hits) != 1:
        raise SystemExit(f"Guard failed: expected one row for {code}, got {len(hits)}")
    lines[hits[0]] = row
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

priorities = replace_row(priorities, "P1-125",
"| P1-125 | P1 | PARTIAL | Service-worker `chrome.scripting.executeScript()` имеет bounded actual-settlement helper и one-use late-success receipt, но document-generation invalidation неполна: logical keys `content:<tabId>` / `frame-agent:<tabId>:all` не содержат document identity, а cleanup выполняется при `changeInfo.url`. Same-URL reload может оставить 60-секундный late-success старого документа и следующий запуск ошибочно потребит его вместо новой injection. Очищать tab-scoped scripting settlements при full-document `status=loading` независимо от URL и/или включить documentId/navigation generation в key; late success старого документа не может удовлетворять новую generation. |")
priorities = replace_row(priorities, "P1-154",
"| P1-154 | P1 | OPEN | Top-document Include/Exclude в `content.js` не имеют live-count budget; каждое изменение запускает O(N) outline/snapshot work. Лимит должен быть aggregate для local + всех remote frame snapshots **до** materialization/serialization: per-frame `MAX_SELECTIONS=250` не мешает десяткам frame-agent накопить тысячи locator, которые top-frame сначала собирает и лишь затем `.slice(0,250)`. Нужны единый live count/byte budget, bounded restore и явная диагностика вместо молчаливого отбрасывания хвоста. |")
priorities = replace_row(priorities, "P1-164",
"| P1-164 | P1 | OPEN | Product requirement: `createPublicLinks` остаётся включённым по умолчанию. В Journal нужна точечная команда отключения публичной ссылки конкретной Yandex-записи. Перед любым remote unpublish обязательно явное подтверждение пользователя; Cancel ничего не меняет. После подтверждённого Yandex `resources/unpublish` и verify очистить `publicUrl` и стабильный `resourceId`, сохранив актуальный `remotePath`, то есть запись становится path-only. Badge `Яндекс Диск` после этого должен открывать/скачивать файл через авторизованный Yandex API по сохранённому exact path; глобальный поиск по Диску не выполнять. Если пользователь затем вручную переместил файл, связь может потеряться — это принятый product tradeoff. Remote mutation требует durable checkpoint/reconciliation и OperationLog, без blind retry после timeout. |")
priorities = replace_row(priorities, "P1-167",
"| P1-167 | P1 | OPEN | Bounded resource prefetch не ограничивает другие PDF-preparation/print paths. Top `collectIncludedElements()`/`collectDisclosureControls()` делают full-subtree `querySelectorAll` + Set и удерживают `changedLinks`/`wrappedImages`; frame-agent `prefetchSelected()` может добавить весь `root.querySelectorAll('img')` до проверки intended cap=100. Print CSS top/frame-agent использует глобальные relational `:has([include])` selectors по потенциально всему DOM. Нужен общий selected-content node/time/mutation/string budget, реальный bounded remote image enumeration, bounded href copies и отказ от global `:has()` через заранее помеченные bounded ancestor chains; partial/fail-safe диагностика обязательна. |")
priorities = replace_row(priorities, "P2-017",
"| P2-017 | P2 | OPEN | Архитектура Yandex-авторизации: session-only access token остаётся безопасным default. Исследовать persistence между restart: Native Messaging + OS keychain, passphrase-derived encryption, backend/BFF, WebAuthn/PRF; не хранить refresh token/client_secret plaintext или в sync и не считать ciphertext+key в одном `storage.local` защитой. Отдельно проверить реальным Yandex E2E session-only refresh-token режим: актуальная документация refresh grant указывает `grant_type` + `refresh_token` обязательными, а `client_id/client_secret` дополнительными; если конкретный public-client WebClip реально refresh'ится без secret, refresh token можно держать **только в `storage.session`** для продления длинной browser session без улучшения restart persistence. До E2E это лишь кандидат, не предположение о поддержке. |")
priorities = replace_row(priorities, "P0-034",
"| P0-034 | P0 | REGRESSION | OAuth-ответ Яндекса раньше сохранял неиспользуемый `refresh_token`. В текущей модели он не сохраняется: в session остаётся только необходимый access token. Если P2-017 позже подтвердит реальным Yandex E2E полезный session-only refresh grant для public client, возвращать refresh token допустимо только как отдельное явно проверенное session-only изменение, без persistent/sync storage. |")

append = r'''

## Продолжение глубокого аудита 2026-08-25 — live document identity / PDF output boundary / dead capability

| Код | Приоритет | Статус | Пункт |
|---|---|---|---|
| P0-070 | P0 | OPEN | Live PDF generation не привязана к документу, инициировавшему save. Runtime sender уже имеет `documentId`, но handler передаёт дальше только `tabId`; `generatePdfBlob(tabId)` через debugger печатает текущий документ вкладки. Reload/navigation между content `sendMessage` и `Page.printToPDF` может поэтому сформировать PDF нового документа с metadata/Journal identity старого, включая переход на другой авторизованный origin. Зафиксировать sender `documentId` + per-tab full-document navigation generation, fail-closed проверить непосредственно перед print и после print до cache/download/upload/Journal; при смене generation Blob уничтожить и ничего не финализировать. |
| P0-071 | P0 | OPEN | PDF output не имеет safe URI-scheme boundary. `absolutizeLinksInIncludedContent()` переносит любой `a/area[href]` через `link.href`, а WebClip сам оборачивает незалинкованные изображения и разрешает `file:`, `data:` и `blob:`. Headless Chromium audit repro подтвердил, что print-to-PDF сохраняет `javascript:`, `data:` и `file:` как link/file annotations. Перед print разрешать только явно безопасные durable schemes (минимум `http/https`, отдельно решить `mailto/tel`), удалять clickability для `javascript/data/file/blob/chrome*` и других active/local schemes, ограничить URI length и не создавать image-link для non-durable schemes; видимый текст/изображение сохранять. |
| P1-171 | P1 | OPEN | Cross-origin frame registry/commands не полностью document-bound при same-URL reload. `frameAgentsByTab` очищается только при `changeInfo.url`; LIST возвращает stale records без проверки current document, а command отправляется по `frameId` без `documentId`. `forwardFrameAgentState` уже сравнивает sender `documentId`, но этого недостаточно для LIST/COMMAND. Очищать registry на full-document loading, хранить top/child generation, target `tabs.sendMessage` exact `documentId` где поддерживается и не сопоставлять stale frameId новой document generation. Scripting late-receipt часть этого сценария остаётся в P1-125 PARTIAL. |
| P1-172 | P1 | OPEN | Save metadata ограничивается слишком поздно. `content.js buildSaveMeta()` берёт полный `location.href`, `document.title` и file comment; textarea не имеет `maxLength`; PDF header создаётся из этих raw значений до worker `sanitizeContentSaveMeta()` (URL 8192/title 4000/comment 100000). В итоге large page/user strings уже создают DOM/IPC cost, а PDF может содержать больше данных, чем Journal/cache. Нужна shared client-side normalization **до header и runtime message** с теми же limits и P0-066 URL confidentiality rules; textarea/input UX должен предотвращать oversized значения, worker остаётся второй authoritative boundary. |
| P2-018 | P2 | OPEN | Удалить dormant privileged transfer surface: worker `putTransferTextPayload()`/`getTransferTextPayload()` не имеют live callers, а offscreen всё ещё разрешает `text-payload-upload`. Эта ветка дополнительно имеет chars-vs-UTF-8-byte reservation weakness: 64 MiB code units превращаются в Blob до actual byte resize. Если capability не нужна — удалить mode/helpers/constants/tests; если нужна будущему feature — сначала сделать byte-bounded admission и добавить явный live caller/regression вместо неиспользуемой привилегированной ветки. |
'''
priorities = priorities.rstrip() + append + "\n"
pp.write_text(priorities, encoding="utf-8")

if any(code in audit for code in ("P0-070", "P0-071", "P1-171", "P1-172", "P2-018")):
    raise SystemExit("Guard failed: continuation already exists in audit")

audit_append = r'''

## Continuation at HEAD `d72ac2f6c23cf3b529b56643781352c8c489ac99` — live document and PDF output security

No production source changed in this continuation. The audit re-read current `content.js`, `frame-agent.js`, `service-worker.js`, `journal.js`, `options.js`, `options.html` and `offscreen.js`, plus a local headless Chromium print-to-PDF reproduction used only as audit evidence.

### Newly confirmed findings

- **P0-070 OPEN — live print is tab-bound, not document-bound.** Content-originated generate/upload messages expose `MessageSender.documentId`, but current handlers retain only `tabId`. Both local and Yandex generation eventually call `generatePdfBlob(tabId)`, which attaches debugger to the current tab and issues `Page.printToPDF`. A full reload/navigation during the gap can therefore print a replacement document while metadata, selection identity and destination naming remain from the previous one. Introduce a per-tab full-document generation plus exact initiating `documentId`; verify before print and after print before any durable/cache/download/upload/Journal finalization. A changed generation discards the Blob and fails closed.
- **P0-071 OPEN — unsafe/non-durable URI schemes survive into PDF annotations.** Top content currently absolutizes arbitrary anchors/areas without a scheme allowlist and additionally wraps unlinked images for `http(s)`, `file:`, `data:` and `blob:` sources. A headless Chromium audit repro printed four anchors and the resulting PDF contained URI annotations for `javascript:alert('x')`, `data:text/html,...`, an external file annotation for `/etc/passwd`, and the normal HTTPS link. Because the PDF is a portable durable artifact, strip clickability for active/local/non-durable schemes before print while preserving visible content; bound copied URI lengths. `http/https` remain safe baseline, with `mailto/tel` requiring an explicit product allowlist decision.
- **P1-171 OPEN — cross-origin frame volatile state survives same-URL document replacement.** The registry records child `documentId`, but tab cleanup occurs only on URL change; LIST does not revalidate records, and `sendFrameAgentCommand` targets only `frameId`. Clean the registry on full-document loading and target exact document identity/generation. The related `executeScriptSingletonBounded` late-success bug belongs to existing P1-125, which is now PARTIAL because its tab-only logical keys can consume a 60-second late-success receipt from the old document after same-URL reload.
- **P1-172 OPEN — content metadata has no pre-header/pre-IPC bounds.** Raw title/source URL/file comment are put into `meta`; the optional comment textarea has no `maxLength`; `prepareForPrint()` builds the visible PDF header before the service-worker sanitizer applies its 8192/4000/100000-character limits. This creates avoidable large-DOM/message allocation and can make PDF metadata differ from Journal/cache metadata. Normalize client-side first using the same shared schema and P0-066 confidentiality rules, then validate again in the worker.
- **P2-018 OPEN — dormant text-payload upload capability.** The worker text-payload put/get helpers are definition-only in the reviewed product call graph, while offscreen still advertises/implements `text-payload-upload`. The dormant branch reserves a byte budget from a character limit and creates the UTF-8 Blob before resizing the reservation, so Unicode can exceed the pre-materialization assumption. Removing unused privileged code is preferred; otherwise make it byte-bounded before reintroducing a live caller.

### Existing tasks strengthened

- **P1-154:** enforce a single aggregate local+remote selection count/byte budget before storing remote snapshots or materializing locators; per-frame 250-item limits plus a final top `.slice(0,250)` are not an aggregate bound.
- **P1-164:** after verified unpublish the Journal entry intentionally becomes path-only. The Yandex badge must still open/download the file through authenticated Yandex API using the saved exact `remotePath`; do not fall back to broad Disk search. If the user manually moves the file afterward, the accepted tradeoff is loss of association.
- **P1-167:** include frame-agent's false prefetch cap (`querySelectorAll('img')` can enqueue a huge single-root result before the 100 check), bounded href copying, and expensive global print `:has([include])` selectors in the shared selected-content budget/refactor.
- **P2-017 / P0-034:** current Yandex refresh documentation lists refresh grant `grant_type` + `refresh_token` as mandatory and `client_id/client_secret` as additional fields. The current code comment that refresh categorically requires Client Secret is therefore too strong. Do not persist a refresh token based on documentation alone; instead add a real Yandex public-client E2E experiment. If it succeeds without secret, a refresh token kept only in `storage.session` could improve long-running-session UX while preserving the current no-restart-persistence default.

### Revalidated boundaries

- Journal/content `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` remains HTTPS/Yandex-domain restricted and reads the entry again by ID; the unsafe URI finding is specifically the PDF artifact construction path.
- External Yandex JSON bodies remain bounded before parsing (`safeJson` uses an 8 MiB bounded text reader), so no new unbounded `response.json()` regression was found.
- `makeMetaRow()` uses Text nodes, so the raw metadata issue is allocation/confidentiality consistency rather than HTML injection.

### Test evidence note

No product code changed and the deterministic product suite was not rerun. The local Chromium reproduction was an audit-only print-to-PDF experiment confirming annotation preservation for unsafe schemes, not a release regression gate. The last verified product gate remains 88/88 JavaScript syntax PASS + 74/74 deterministic tests PASS from P0-063.
'''
audit = audit.rstrip() + audit_append + "\n"
ap.write_text(audit, encoding="utf-8")

updated = pp.read_text(encoding="utf-8")
for req in ("| P0-070 |", "| P0-071 |", "| P1-125 | P1 | PARTIAL |", "| P1-171 |", "| P1-172 |", "| P2-018 |"):
    if req not in updated:
        raise SystemExit(f"Postcondition failed: {req}")
print("audit continuation patch PASS")
