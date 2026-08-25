from pathlib import Path
import subprocess

BASE = "9f204576c50b1b7782c7003758985d4ffc7aafd8"
TEMP = {"project_tools/_audit_sync_20260826_d.py", ".github/workflows/audit-sync-20260826-d.yml"}
changed = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", f"{BASE}..HEAD"], text=True).splitlines()))
if changed != TEMP:
    raise SystemExit(f"Guard failed: unexpected changes since baseline: {sorted(changed)}")

pp = Path("project_docs/PRIORITIES_P0_P1_P2.md")
ap = Path("DEEP_AUDIT_2026-08-25.md")
priorities = pp.read_text(encoding="utf-8")
audit = ap.read_text(encoding="utf-8")
for code in ("P1-176", "P1-177", "P1-178"):
    if f"| {code} |" in priorities or code in audit:
        raise SystemExit(f"Guard failed: {code} already exists")

priority_append = r'''

## Продолжение глубокого аудита 2026-08-26 — pre-IPC inputs / disconnect scheduler / OAuth completion

| Код | Приоритет | Статус | Пункт |
|---|---|---|---|
| P1-176 | P1 | OPEN | Trusted extension-page user inputs имеют authoritative bounds в worker, но часть UI не ограничивает данные **до** structured-clone/runtime IPC. Journal comment textarea не имеет `maxLength` и отправляет полный `input.value`; Options `clientId`, verification code, manual token, rootPath/new-folder name также не имеют matching UI/pre-send caps, хотя worker уже режет/отклоняет 512/4096/16 KiB/2048 и другие пределы после получения сообщения. Пользователь может вставить очень большую строку и создать лишний extension-page heap + structured clone/message allocation до authoritative boundary. Добавить shared pre-IPC validation/maxLength, совпадающий с worker limits, сохранив worker как обязательную вторую границу; не молча усекать security-sensitive token/code — показывать понятную ошибку. |
| P1-177 | P1 | OPEN | `WEBCLIP_YANDEX_DISCONNECT` удаляет session OAuth и pending PKCE, но оставляет `journalBackupEnabled` и существующие periodic/retry alarms. Background backup после сознательного disconnect продолжает просыпаться, заведомо падать на отсутствии токена и при enabled status снова планировать retry. Disconnect должен переводить backup scheduler в явно paused/no-auth состояние и очищать активные backup alarms без потери выбранных interval/enabled preferences; успешная reauth должна безопасно восстановить scheduler. Уже запущенный remote transfer не считать отменённым только из-за удаления OAuth: показать/логировать, что in-flight signed transfer имеет собственное actual settlement/reconciliation. |
| P1-178 | P1 | OPEN | OAuth code exchange и локальная фиксация результата не образуют completion-aware state machine. `finishYandexOAuth()` сначала получает token по network POST, затем отдельно обновляет config, пишет `yandexAuth` в `storage.session` и удаляет `yandexOAuthPending`. Любой локальный timeout non-cancellable storage/config операции после успешного token response способен вернуть UI ошибку в промежуточном состоянии: token ещё не сохранён и code уже был exchanged, либо поздний session write подключит Диск после ошибки UI, а pending PKCE останется. Нельзя автоматически повторять token exchange после unknown settlement. Нужен один completion/reconciliation contract: после успешного network response атомарно/одним serialized session mutation зафиксировать auth + consumed/pending state, поздний settlement трактовать как pending outcome, status/restart reconciliation завершают cleanup/config repair; ancillary config write не должен превращать уже сохранённую OAuth-сессию в ложный terminal failure. |
'''
pp.write_text(priorities.rstrip() + priority_append + "\n", encoding="utf-8")

audit_append = r'''

## Continuation at HEAD `9f204576c50b1b7782c7003758985d4ffc7aafd8` — extension-page input and OAuth lifecycle

No production source changed during this continuation.

### Newly confirmed findings

- **P1-176 OPEN — pre-IPC bounds for trusted user inputs.** Worker-side boundaries remain authoritative, but the visible Journal comment editor and several Options inputs accept unbounded strings and send them through `chrome.runtime.sendMessage()` before the worker can reject them. This includes Journal comment text and Yandex client/code/manual-token/root/folder inputs. Match UI/pre-send caps to the existing worker contract so very large pasted values do not allocate a large structured-clone payload first. Sensitive token/code values should be rejected with an explicit message rather than silently truncated.
- **P1-177 OPEN — disconnect does not pause background backup scheduling.** Disconnect removes session credentials but does not change `journalBackupEnabled`, clear periodic/retry alarms, or otherwise tell the scheduler that authorization is intentionally absent. A background failure while enabled schedules another retry, so a deliberate disconnect can create recurring known-failure wakes. Preserve the user's backup preference but pause alarms while unauthenticated, then reinitialize them after successful authorization. A transfer that already owns a signed upload/download URL remains governed by its durable actual-settlement reconciliation; deleting the OAuth token is not cancellation of that already-started side effect.
- **P1-178 OPEN — post-exchange OAuth completion is not reconciled as one operation.** The token POST completes before several separately bounded/non-cancellable storage/config steps. A later local timeout can therefore report authorization failure after the remote exchange already succeeded, or a late `storage.session.set` can make the account connected after the UI showed an error while old pending PKCE state remains. Do not blindly rerun the code exchange. Commit auth and pending/consumed state together as far as Chrome Storage allows, expose unknown local settlement as pending, and let status/startup reconciliation repair ancillary config/cleanup.

### External OAuth note

Current Yandex documentation continues to describe confirmation-code exchange as a separate network step that returns `access_token`, `refresh_token` and lifetime information. The project intentionally stores only the access token in `storage.session`; P1-178 concerns crash/timeout consistency **after** a successful exchange response and does not propose persisting the refresh token.

### Test evidence note

Audit documentation only; production tests were not rerun. The last verified production gate remains 88/88 JavaScript syntax + 74/74 deterministic tests from P0-063, and real unpacked Chrome/Yandex E2E remains a release blocker.
'''
ap.write_text(audit.rstrip() + audit_append + "\n", encoding="utf-8")
