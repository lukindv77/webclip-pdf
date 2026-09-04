# Модели данных WebClip 0.9.5

## Journal entry

```json
{
  "id": "uuid",
  "createdAt": 0,
  "localDayKey": "YYYY-MM-DD",
  "operationDateTime": "DD.MM.YYYY HH:MM:SS",
  "destination": "download|yandex",
  "filename": "...pdf",
  "remotePath": "",
  "folder": "",
  "publicUrl": "https://disk.yandex.ru/...",
  "resourceId": "<Yandex Disk resource_id>",
  "accountUid": "<Yandex account uid>",
  "rootPath": "/WebClips",
  "hostname": "its.1c.ru",
  "siteAddress": "https://its.1c.ru",
  "url": "https://...",
  "urlKey": "https://...",
  "siteKey": "its.1c.ru",
  "title": "...",
  "selectionSnapshot": { "version": 3, "includes": [], "excludes": [] },
  "includeCount": 1,
  "excludeCount": 0
}
```

## Locator / frame-aware selector

```json
{
  "framePath": [{
    "cssPath": "iframe#w_metadata_doc_frame",
    "domPath": [],
    "tag": "iframe",
    "id": "w_metadata_doc_frame",
    "role": "",
    "parentText": "...",
    "siblingIndex": 0,
    "sameTagIndex": 0
  }],
  "cssPath": "body > p:nth-of-type(2)",
  "domPath": [1, 4],
  "tag": "p",
  "id": "",
  "classes": [],
  "text": "...",
  "ariaLabel": "",
  "name": "",
  "title": "",
  "src": "",
  "role": "",
  "href": "",
  "parentTag": "article",
  "parentId": "",
  "parentRole": "",
  "parentText": "...",
  "previousText": "...",
  "nextText": "...",
  "siblingIndex": 1,
  "sameTagIndex": 1
}
```

P1-001: новые записи используют `SelectionSnapshot v3`. Structural fields (`id/cssPath/domPath`) сохраняются для evidence, но restore принимает v3 candidate только после contextual scoring. `role/href`, parent/neighbor text и sibling indices ограничены по длине/диапазону на service-worker boundary. Ambiguous v3 match не записывается как выбранный DOM node; старые v1/v2 snapshots остаются допустимыми legacy inputs.

## Full journal export

```json
{
  "schema": "webclip-journal",
  "schemaVersion": 1,
  "backupKind": "full-journal",
  "exportedAt": "ISO timestamp",
  "extension": { "name": "...", "version": "0.9.5" },
  "journal": { "entryCount": 0, "entries": [] }
}
```

Один документ содержит всё необходимое для восстановления полного журнала.

## Yandex config

`chrome.storage.local.yandexConfig`:

```json
{
  "clientId": "...",
  "rootPath": "/WebClips",
  "createPublicLinks": true,
  "journalBackupEnabled": true,
  "journalBackupIntervalMinutes": 1440,
  "journalBackupRetryMinutes": 60
}
```

Отдельного `journalBackupFolder` больше нет.

## User settings export — P1-008

Переносимые пользовательские настройки имеют отдельную схему и не являются Journal backup:

```json
{
  "schema": "webclip-user-settings",
  "version": 1,
  "exportedAt": "ISO timestamp",
  "extensionVersion": "0.9.8",
  "settings": {
    "yandex": {
      "clientId": "...",
      "rootPath": "/WebClips",
      "createPublicLinks": true,
      "journalBackupEnabled": true,
      "journalBackupIntervalMinutes": 1440,
      "journalBackupRetryMinutes": 60
    },
    "journal": { "groupByUrl": false },
    "operationLog": { "retentionHours": 24 }
  }
}
```

OAuth/PKCE/session credentials, Journal entries, pending/durable checkpoints, `journalBackupState` и OperationLog records отсутствуют в schema. Import commit дополнительно временно пишет `chrome.storage.local.webclipUserSettingsImportPending = {version, createdAt, schema}`; marker служит только для scheduler reconciliation после late settlement/crash и удаляется после успешного reconciliation.

## Backup state

```json
{
  "lastSuccessAt": 0,
  "lastAttemptAt": 0,
  "lastFailureAt": 0,
  "lastBackgroundSuccessAt": 0,
  "lastBackgroundFailureAt": 0,
  "lastBackgroundError": "",
  "lastError": "",
  "lastEntryCount": 0,
  "lastReason": "periodic-alarm",
  "lastRemotePath": "/WebClips/Backup/Journal/08-2026/WebClip_Journal_2026-08-23_18-53-10-123.json"
}
```

## PDF retry cache

IndexedDB `WebClipPdfRetryCache`, store `pdfs`, key `tab:<tabId>`. Содержит base64 PDF, filename и meta/selection snapshot. При Yandex retry PDF не переформируется.


## Action indicator derived state

Индикатор панели не является отдельным source of truth. Он вычисляется из `WebClipJournal.entries` по точному `urlKey`:

- `lastSavedAt = max(createdAt)`;
- `uniqueDays = count(distinct localDayKey)`;
- green при возрасте `≤24h`;
- orange при `>24h && ≤30d`;
- red при `>30d`;
- neutral при отсутствии entries.

`localDayKey` фиксируется в момент успешной записи журнала. Для старых импортированных записей без этого поля он восстанавливается из `createdAt`.


## Уточнение статистики URL (0.9.4)

`destination` — источник истины для режима операции:
- `download` = режим `Файл`: запись хранится в журнале, но не участвует в action-indicator;
- `yandex` = режим `Яндекс Диск`: запись создаётся только после успешной загрузки/проверки и участвует в action-indicator.

Action summary для URL вычисляется только по `destination === "yandex"`:
- `lastSavedAt` = максимальный `createdAt`;
- `uniqueDays` = количество уникальных `localDayKey`.

## Journal entry: дополнение 0.9.8

Для `destination = "yandex"` Journal хранит identity/locator context:

```json
{
  "resourceId": "<Yandex Disk resource_id>",
  "accountUid": "<Yandex account uid>",
  "rootPath": "/WebClips"
}
```

`resourceId` — основной устойчивый идентификатор после rename/move. `accountUid` и `rootPath` связывают запись с аккаунтом и управляемым корнем на момент сохранения. `publicUrl` остаётся secondary identity/open locator, `remotePath` — путь на момент сохранения. При известном `resourceId` один path не считается доказательством identity; exact `publicUrl` может заменить отсутствующий `resource_id`, но не конфликтующий. Для legacy-записей новые поля могут отсутствовать; тогда сохраняется managed-path compatibility.

Удаление записи не записывает новое поле состояния в entry: при успешном удалении сама entry исчезает, а PDF переносится в `<root>/Trash/MM-YYYY`.

## PDF resource report — P1-003

Новые сохранения могут содержать bounded `resourceReport`:

```json
{
  "version": 1,
  "limit": 500,
  "deadlineMs": 15000,
  "attempted": 12,
  "loaded": 10,
  "failed": 2,
  "omittedByLimit": 0,
  "scanTruncated": false,
  "deadlineExceeded": false,
  "elapsedMs": 740,
  "failures": [
    {
      "kind": "image",
      "resource": "https://example.test/path/image.png",
      "reason": "image-load-error"
    }
  ]
}
```

`failures` ограничен 40 элементами; resource labels — 500 символов. Для HTTP(S) диагностический URL сохраняется только как `origin + pathname`, без query/hash. `data:` и `blob:` заменяются `[data-url]` / `[blob-url]`. Старые Journal entries без `resourceReport` остаются валидными и не получают фиктивный `0/0` report при import.


## Recovery metadata added by research

Journal entries may temporarily contain `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId`, `readMoveLastError` while `Прочитать позже → Прочитано` is not fully finalized. These fields are cleared after successful local finalization and are preserved on import/export for recovery.

`chrome.storage.local.webclipPendingJournalAppends` is a bounded recovery queue for the narrow failure window after a file has already been physically saved but the corresponding Journal append cannot be committed. Each pending item uses a stable `journalEntryId`/`journalCreatedAt`, making replay idempotent. It contains no OAuth token or signed upload URL.

## Research additions: pending local downloads / transfer chunks

### `WebClipJournal.pendingDownloads`

Key path remains `downloadId`, but keys may be either:

- `intent:<operationId>` — durable pre-download intent written before calling `chrome.downloads.download()`;
- numeric Chrome `downloadId` — intent bound to an actual DownloadItem.

Common fields include `kind`, `createdAt`, `updatedAt`, `operationId`, normalized journal `data`, and an internal `blobUrl` used only to recover a worker interruption between start and bind. These records are cleared atomically with journal replace/clear operations.

### `WebClipOffscreenTransfers` export chunks

Current chunk records use `kind: journal-export-chunk-blob` and `blob: Blob`; legacy `text: string` chunks remain supported for WIP compatibility. The export manifest continues to carry `chunkCount`, `totalChars`, `totalBytes`, `entryCount` and timestamp metadata.

### `pendingRemoteSaves` (WebClipJournal v7)

Durable Yandex save checkpoint keyed by future Journal `id`. Important fields: `phase` (`prepared`/`remote-verified`), `expectedPdfBytes`, `createPublicLinks`, `operationId`, timestamps/error counters and normalized Journal append `data`. It is written before remote transfer/finalization and is removed only after Journal append is successful or another durable `pendingAppends` checkpoint has taken responsibility.

### Backup lease

Stored as `meta[key=webclipJournalBackupLease].value`; acquisition is a single readwrite transaction, preventing two concurrent backup operations from both acquiring the lease.



## Research state additions — 2026-08-24

### `webclipJournalStatsDirty` v2

Persistent repair marker for derived `urlStats`:

- `version: 2`
- `tokens[]`: bounded active mutation tokens (`token`, `reason`, `changedAt`)
- `overflow`: forces a full rebuild when more concurrent tokens existed than retained individually
- `revision`: changes on every marker mutation; a rebuild clears the marker only if this revision stayed unchanged
- legacy single-token markers are normalized on read.

### `pendingRemoteSaves.phase`

Allowed recovery phases now include `prepared`, `remote-verified`, and `stale-unverified`. `stale-unverified` entries do not consume the active queue; they are retained for diagnosis with bounded retention/cap.

### `pendingDownloads` identity

Pre-download intents store `blobUrl` plus `expectedBytes`. Recovery primarily matches the exact Blob URL; only a short-window fallback may use filename + exact expected size. Journal finalization re-checks the checkpoint transactionally before append.

### `webclipJournalBackupPendingUpload`

Fields include `phase` (`prepared`/`remote-verified`), `createdAt`, `attemptCount`, `lastCheckedAt`, `remotePath`, `expectedBytes`, entry/export metadata. A prepared 404 is not enough to discard the checkpoint: several checks plus the grace period are required.

### `importStaging` (WebClipJournal v7)

Temporary normalized records used only by confirmed large Journal import. Store key path: `key`; indexes: `importId`, `createdAt`. Each record contains `importId`, normalized `entryId`, normalized `entry`, and `createdAt`. The store is in the **same IndexedDB database** as `entries`, allowing final replace + pending-checkpoint cleanup + staging deletion to commit atomically. Records are deleted on success/error and by bounded TTL maintenance after 2 hours if a worker/browser interruption leaves them behind. It is not a user-visible source of truth.

Raw import bytes remain in `WebClipOffscreenTransfers` as `journal-import-manifest` + `journal-import-chunk-blob` records (1 MiB chunks, total input cap 50 MiB). New import paths do not persist the whole backup as a JS/text string.

### C44 Journal import preview receipt

The worker-issued value has this exact structured-clone contract:

```json
{
  "version": 1,
  "mode": "replace",
  "stagingKey": "journal-import-…",
  "stagingGeneration": "manifest:<createdAt>:<chunkCount>:<totalBytes>",
  "source": "file | yandex",
  "operationId": "…",
  "contentSha256": "<64 lowercase hex>",
  "entryCount": 0,
  "exportedAt": "ISO timestamp or empty",
  "expectedJournalRevision": "…"
}
```

Unknown/missing fields, invalid bounds, caller field mismatch, re-read digest/generation/count/export-time mismatch, or Journal revision mismatch all fail closed. The authoritative revision compare runs inside the same `WebClipJournal` readwrite transaction before replacement starts. The receipt is confirmation authority for one attempt, not a lease or browser-restart resume token.

### P1-004 cross-origin frame locators

Для cross-origin iframe используется тот же `SelectionSnapshot v3`: top-frame добавляет к locator, созданному frame-agent внутри разрешённого frame, внешний `framePath`. Browser `frameId/documentId` — только runtime identity и в Journal не сохраняются. При restore top сначала fail-closed разрешает внешний frame locator, затем передаёт оставшийся locator зарегистрированному agent; stale `documentId` после frame navigation не принимается.
