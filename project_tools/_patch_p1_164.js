const fs = require('fs');

const BASE = 'ef0e12bda980d947b8a02da816cf6f64be47ceb8';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text, 'utf8'); }
function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText);
  if (first < 0) throw new Error(`Missing anchor: ${label}`);
  if (text.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Ambiguous anchor: ${label}`);
  return text.slice(0, first) + newText + text.slice(first + oldText.length);
}
function assertAbsent(text, marker, label) {
  if (text.includes(marker)) throw new Error(`Already patched: ${label}`);
}

// service-worker.js: extension-only command + durable, verified Yandex unpublish.
{
  const path = 'service-worker.js';
  let text = read(path);
  assertAbsent(text, 'WEBCLIP_JOURNAL_UNPUBLISH', path);
  text = replaceOnce(
    text,
    "      case 'WEBCLIP_JOURNAL_DELETE':\n        return deleteJournalEntry(String(message.id || ''), {",
    "      case 'WEBCLIP_JOURNAL_UNPUBLISH': {\n        if (senderKind !== 'extension') throw new Error('Отключение публичной ссылки доступно только странице журнала расширения.');\n        return unpublishJournalYandexFile(String(message.id || ''), String(message.operationId || ''));\n      }\n\n      case 'WEBCLIP_JOURNAL_DELETE':\n        return deleteJournalEntry(String(message.id || ''), {",
    'runtime unpublish case'
  );

  const fn = String.raw`
async function unpublishJournalYandexFile(id, operationId = '') {
  operationId = String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS) || makeOperationLogId('journal-unpublish');
  if (!id) return { ok: false, error: 'Не указан идентификатор записи журнала.' };
  let entry = await getJournalEntryById(id);
  if (!entry) return { ok: false, error: 'Запись журнала не найдена.' };
  if (entry.destination !== 'yandex') return { ok: false, error: 'Эта запись не относится к Яндекс Диску.' };

  const initialPublicUrl = normalizeImportedHttpsUrl(entry.publicUrl || '');
  const pendingPath = normalizeDiskPath(entry.publicUnpublishPath || '');
  const pending = Boolean(Number(entry.publicUnpublishPendingAt || 0) > 0 && pendingPath);
  if (!initialPublicUrl && !pending) {
    return { ok: false, error: 'Публичная ссылка для этой записи уже отключена.' };
  }

  await startOperationLog(operationId, 'journal-unpublish', 'Отключение публичной ссылки Яндекс Диска', {
    journalEntryId: id,
    remotePath: entry.remotePath || '',
    resourceId: entry.resourceId || '',
    hasPublicUrl: Boolean(initialPublicUrl),
    accountUid: entry.accountUid ? '[BOUND]' : '',
    rootPath: entry.rootPath || '',
    url: entry.url || '',
    filename: entry.filename || ''
  });

  let checkpointWritten = pending;
  let resolvedPath = pendingPath;
  try {
    const config = await getYandexConfig();
    if (!config.rootPath) throw new Error('В настройках не выбрана корневая папка Яндекс Диска.');
    const expectedRootPath = normalizeDiskPath(entry.rootPath || '');
    if (expectedRootPath && expectedRootPath !== config.rootPath) {
      const error = new Error(`Запись журнала относится к корневой папке ${expectedRootPath}, а сейчас выбрана ${config.rootPath}. Операция остановлена без изменений.`);
      error.code = 'YANDEX_ROOT_PATH_MISMATCH';
      throw error;
    }
    if (entry.accountUid) {
      const currentAccountUid = await getCurrentYandexAccountUid(operationId);
      if (String(currentAccountUid || '') !== String(entry.accountUid || '')) {
        const error = new Error('Запись журнала относится к другому аккаунту Яндекс Диска. Публичная ссылка не изменена.');
        error.code = 'YANDEX_ACCOUNT_MISMATCH';
        throw error;
      }
    }

    recordOperationStage(operationId, 'locate', pending
      ? 'Проверяем durable checkpoint предыдущей попытки отключения публичной ссылки…'
      : 'Ищем актуальный файл перед отключением публичной ссылки…', 15, 'running', {
      journalEntryId: id, checkpointPending: pending
    });

    let current;
    if (pending) {
      assertManagedYandexSourcePath(resolvedPath, config.rootPath, [YANDEX_UPLOAD_DIR, YANDEX_READ_LATER_DIR]);
      current = await yandexApi('/resources', {
        method: 'GET', timeoutMs: 10_000, operationId,
        query: { path: resolvedPath, fields: 'name,path,type,public_url,resource_id' }
      });
      if (current?.type !== 'file') throw new Error('Файл из checkpoint отключения публичной ссылки больше не является файлом.');
      const expectedResourceId = String(entry.resourceId || '').trim();
      const currentResourceId = current?.resource_id ? normalizeYandexResourceIdFromApi(current.resource_id) : '';
      if (expectedResourceId && currentResourceId && currentResourceId !== expectedResourceId) {
        const error = new Error('Файл по сохранённому пути больше не совпадает с resourceId записи. Публичная ссылка не изменена.');
        error.code = 'YANDEX_RESOURCE_ID_MISMATCH';
        throw error;
      }
      const currentPublicUrl = current?.public_url ? normalizeYandexPublicUrlFromApi(current.public_url) : '';
      if (initialPublicUrl && currentPublicUrl && currentPublicUrl !== initialPublicUrl) {
        const error = new Error('У файла по сохранённому пути другая публичная ссылка. Операция остановлена без изменений.');
        error.code = 'YANDEX_PUBLIC_URL_MISMATCH';
        throw error;
      }
    } else {
      current = await findYandexFileForJournalEntry(entry, operationId);
      resolvedPath = current?.path ? normalizeYandexDiskPathFromApi(current.path) : normalizeDiskPath(entry.remotePath || '');
      if (!resolvedPath) throw new Error('Яндекс Диск не вернул текущий путь файла.');
      assertManagedYandexSourcePath(resolvedPath, config.rootPath, [YANDEX_UPLOAD_DIR, YANDEX_READ_LATER_DIR]);
      const checkpoint = await updateJournalEntryRecord(id, {
        publicUnpublishPendingAt: Date.now(),
        publicUnpublishOperationId: operationId,
        publicUnpublishPath: resolvedPath,
        publicUnpublishLastError: ''
      });
      if (!checkpoint) throw new Error('Не удалось создать durable checkpoint отключения публичной ссылки.');
      entry = checkpoint;
      checkpointWritten = true;
    }

    let currentPublicUrl = current?.public_url ? normalizeYandexPublicUrlFromApi(current.public_url) : '';
    if (currentPublicUrl) {
      recordOperationStage(operationId, 'unpublish', 'Отзываем публичный доступ к файлу на Яндекс Диске…', 55, 'running', { remotePath: resolvedPath });
      // No blind retry here. PUT /resources/unpublish may have reached Yandex even
      // if the local request later times out; the durable checkpoint makes a user
      // retry reconcile the actual remote state before issuing another mutation.
      await yandexApi('/resources/unpublish', {
        method: 'PUT', query: { path: resolvedPath }, timeoutMs: 15_000, operationId
      });
    } else {
      recordOperationStage(operationId, 'unpublish', 'Публичная ссылка уже отсутствует; завершаем локальный recovery checkpoint.', 55, 'running', { remotePath: resolvedPath });
    }

    recordOperationStage(operationId, 'verify', 'Проверяем, что Яндекс Диск действительно снял публикацию…', 75, 'running', { remotePath: resolvedPath });
    const verifyDeadline = Date.now() + 30_000;
    let verified = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      let remaining = verifyDeadline - Date.now();
      if (remaining <= 500) break;
      if (attempt) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * attempt, Math.max(0, remaining - 500))));
        remaining = verifyDeadline - Date.now();
        if (remaining <= 500) break;
      }
      const metadata = await yandexApi('/resources', {
        method: 'GET', timeoutMs: Math.max(1_000, Math.min(8_000, remaining)), operationId,
        query: { path: resolvedPath, fields: 'name,path,type,public_url,resource_id' }
      });
      if (metadata?.type !== 'file') throw new Error('Яндекс Диск больше не подтверждает ресурс как файл.');
      const expectedResourceId = String(entry.resourceId || '').trim();
      const actualResourceId = metadata?.resource_id ? normalizeYandexResourceIdFromApi(metadata.resource_id) : '';
      if (expectedResourceId && actualResourceId && actualResourceId !== expectedResourceId) {
        const error = new Error('Во время проверки изменился resourceId файла. Локальная ссылка не очищена.');
        error.code = 'YANDEX_RESOURCE_ID_MISMATCH';
        throw error;
      }
      if (!metadata?.public_url) {
        verified = metadata;
        break;
      }
    }
    if (!verified) {
      const error = new Error('Яндекс Диск не подтвердил отключение публичной ссылки за 30 с. Recovery checkpoint сохранён; не создавайте новую ссылку до повторной проверки.');
      error.code = 'YANDEX_TIMEOUT';
      throw error;
    }

    const updated = await updateJournalEntryRecord(id, {
      remotePath: verified.path ? normalizeYandexDiskPathFromApi(verified.path) : resolvedPath,
      filename: verified.name ? normalizeYandexItemNameFromApi(verified.name) : String(entry.filename || ''),
      publicUrl: '',
      // Product decision: after unpublish the journal becomes path-only. We
      // intentionally drop stable identity so moving the file manually may
      // break the association, as explicitly accepted for this feature.
      resourceId: '',
      publicUnpublishPendingAt: 0,
      publicUnpublishOperationId: '',
      publicUnpublishPath: '',
      publicUnpublishLastError: ''
    });
    if (!updated) throw new Error('Запись журнала исчезла до фиксации отключённой публичной ссылки.');
    notifyJournalChanged('yandex-unpublish');
    recordOperationStage(operationId, 'complete', 'Публичная ссылка отключена; запись журнала переведена в path-only режим.', 100, 'success', { remotePath: updated.remotePath || resolvedPath });
    await finishOperationLog(operationId, 'success', 'Публичная ссылка конкретной записи журнала отключена на Яндекс Диске.');
    return { ok: true, entry: updated, operationId, remotePath: updated.remotePath || resolvedPath };
  } catch (error) {
    if (checkpointWritten) {
      await updateJournalEntryRecord(id, {
        publicUnpublishLastError: normalizeError(error).slice(0, 2000),
        publicUnpublishOperationId: operationId,
        publicUnpublishPath: resolvedPath || pendingPath
      }).catch(() => {});
    }
    recordOperationStage(operationId, 'error', `Не удалось отключить публичную ссылку: ${normalizeError(error)}`, 100, 'error', { remotePath: resolvedPath || pendingPath });
    await finishOperationLog(operationId, 'error', `Отключение публичной ссылки не завершено: ${normalizeError(error)}`);
    throw error;
  }
}

`;
  text = replaceOnce(text, "async function deleteJournalEntry(id, { diskAction = 'keep', operationId = '' } = {}) {", fn + "async function deleteJournalEntry(id, { diskAction = 'keep', operationId = '' } = {}) {", 'unpublish service function');
  write(path, text);
}

// journal.js: explicit confirmation + per-entry action + recovery retry button.
{
  const path = 'journal.js';
  let text = read(path);
  assertAbsent(text, 'WEBCLIP_JOURNAL_UNPUBLISH', path);
  text = replaceOnce(
    text,
    "  primaryActions.append(linkedOperationLog.showButton, linkedOperationLog.copyButton);\n  primaryActions.appendChild(makeButton('Удалить запись', false, () => deleteEntry(entry), 'danger'));",
    "  primaryActions.append(linkedOperationLog.showButton, linkedOperationLog.copyButton);\n  const publicUnpublishPending = isYandexDestination && Number(entry.publicUnpublishPendingAt || 0) > 0;\n  if (isYandexDestination && (canOpenYandexFile || publicUnpublishPending)) {\n    primaryActions.appendChild(makeButton(\n      publicUnpublishPending ? 'Повторить отключение публичной ссылки' : 'Отключить публичную ссылку',\n      false,\n      () => unpublishYandexEntry(entry),\n      'danger secondary'\n    ));\n  }\n  primaryActions.appendChild(makeButton('Удалить запись', false, () => deleteEntry(entry), 'danger'));",
    'journal entry unpublish action'
  );

  const fn = String.raw`
async function unpublishYandexEntry(entry) {
  if (!entry?.id || entry.destination !== 'yandex') return;
  const pending = Number(entry.publicUnpublishPendingAt || 0) > 0;
  const warning = pending
    ? 'Предыдущая попытка отключения публичной ссылки не была полностью подтверждена. WebClip сначала сверит фактическое состояние файла на Яндекс Диске и продолжит recovery.\n\nПродолжить?'
    : 'Отключить публичную ссылку только для этой записи?\n\nПосле подтверждения доступ по текущей публичной ссылке будет отозван на Яндекс Диске. WebClip сохранит текущий путь файла, но удалит публичную ссылку и стабильный resourceId из записи журнала. Если затем вручную переместить файл в другую папку, WebClip может потерять связь с ним.\n\nЭто действие требует явного подтверждения и не удаляет сам файл.';
  // User confirmation is mandatory before any remote unpublish request.
  if (!window.confirm(warning)) return;
  if (!beginJournalDestructiveOperation('отключение публичной ссылки')) return;
  const operationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  showLastOperationId(operationId);
  setStatus('Отключаем публичную ссылку на Яндекс Диске…', '');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_UNPUBLISH',
      id: entry.id,
      operationId
    });
    requireOk(result);
    setStatus(`Публичная ссылка отключена. Файл не удалён; журнал хранит только его текущий путь. · operationId: ${result.operationId || operationId}`, 'ok');
    await loadJournal();
  } catch (error) {
    setStatus(`${error?.message || String(error)} · operationId: ${operationId}`, 'error');
  } finally {
    endJournalDestructiveOperation();
  }
}

`;
  text = replaceOnce(text, 'async function deleteEntry(entry) {', fn + 'async function deleteEntry(entry) {', 'journal unpublish handler');
  write(path, text);
}

// Deterministic regression test.
{
  const path = 'project_tools/test_p1_164_yandex_unpublish.js';
  const test = `const fs = require('fs');\nconst assert = require('assert');\n\nconst sw = fs.readFileSync('service-worker.js', 'utf8');\nconst journal = fs.readFileSync('journal.js', 'utf8');\nconst options = fs.readFileSync('options.js', 'utf8');\nconst optionsHtml = fs.readFileSync('options.html', 'utf8');\n\nassert(sw.includes(\"case 'WEBCLIP_JOURNAL_UNPUBLISH'\"));\nassert(sw.includes(\"if (senderKind !== 'extension')\"));\nassert(sw.includes(\"yandexApi('/resources/unpublish'\"));\nassert(sw.includes(\"method: 'PUT', query: { path: resolvedPath }\"));\nassert(sw.includes('publicUnpublishPendingAt: Date.now()'));\nassert(sw.includes(\"notifyJournalChanged('yandex-unpublish')\"));\nassert(sw.includes(\"publicUrl: '',\"));\nassert(sw.includes(\"resourceId: '',\"));\nassert(sw.includes('No blind retry here'));\nassert(sw.includes('Яндекс Диск не подтвердил отключение публичной ссылки за 30 с.'));\n\nconst fnStart = journal.indexOf('async function unpublishYandexEntry(entry)');\nassert(fnStart >= 0);\nconst fnEnd = journal.indexOf('async function deleteEntry(entry)', fnStart);\nassert(fnEnd > fnStart);\nconst fn = journal.slice(fnStart, fnEnd);\nconst confirmAt = fn.indexOf('window.confirm(warning)');\nconst sendAt = fn.indexOf(\"type: 'WEBCLIP_JOURNAL_UNPUBLISH'\");\nassert(confirmAt >= 0 && sendAt > confirmAt, 'confirmation must precede remote command');\nassert(fn.includes('не удаляет сам файл'));\nassert(fn.includes('может потерять связь с ним'));\nassert(journal.includes('Повторить отключение публичной ссылки'));\nassert(journal.includes('Отключить публичную ссылку'));\n\n// Product decision: public links remain enabled by default.\nassert(options.includes('publicLinksEnabled.checked = status.createPublicLinks !== false'));\nassert(optionsHtml.includes('id=\"publicLinksEnabled\" type=\"checkbox\" checked'));\nassert(sw.includes('createPublicLinks: yandexConfig.createPublicLinks !== false'));\n\nconsole.log('P1-164 per-entry Yandex public-link unpublish with mandatory confirmation: PASS');\n`;
  write(path, test);
}

// Closure note.
{
  const path = 'P1-164_CLOSURE.md';
  write(path, `# P1-164 — per-entry Yandex public-link unpublish\n\nStatus: REGRESSION\n\nImplemented on top of baseline ${BASE}.\n\n## Product decision\n\n- Global \`createPublicLinks\` remains enabled by default.\n- Journal exposes a per-entry **Отключить публичную ссылку** action for Yandex PDF entries.\n- A blocking user confirmation is mandatory before any remote unpublish request. Cancel leaves Yandex and the journal unchanged.\n- The confirmation explicitly warns that after unpublish WebClip intentionally drops \`publicUrl\` and stable \`resourceId\`; the journal keeps the current \`remotePath\`, so a later manual move may break the association. The file itself is not deleted.\n\n## Reliability/security\n\n- Only an extension page can invoke \`WEBCLIP_JOURNAL_UNPUBLISH\`.\n- Existing account/root/resource identity checks are preserved.\n- A durable per-entry checkpoint is written before the remote mutation. If the worker/request outcome is uncertain, retry reconciles the current resource state before another mutation.\n- No blind retry is performed after an unknown Yandex mutation outcome.\n- \`PUT /resources/unpublish\` is followed by bounded metadata verification; local \`publicUrl/resourceId\` are cleared only after Yandex confirms \`public_url\` is absent.\n- OperationLog receives bounded structured stages; OAuth credentials are not added to the log.\n\n## Evidence\n\n- \`project_tools/test_p1_164_yandex_unpublish.js\` checks the command boundary, unpublish endpoint, durable checkpoint, local identity clearing, default-on product decision, and that confirmation occurs before the runtime command.\n- Full JS syntax and deterministic \`project_tools/test_*.js\` gate is required by the one-shot workflow.\n- Real Yandex E2E remains part of the release gate and is not claimed by deterministic tests.\n`);
}

// Priority registry: append reserved audit findings and this implemented feature.
{
  const path = 'project_docs/PRIORITIES_P0_P1_P2.md';
  let text = read(path);
  assertAbsent(text, '| P0-065 |', path);
  text += `\n\n## Повторный аудит — продолжение 2026-08-25\n\n| Код | Приоритет | Статус | Пункт |\n|---|---|---|---|\n| P0-065 | P0 | OPEN | Offscreen Blob URL budget проверяется после materialization крупного PDF/text Blob. Нужна reservation до decode/сборки Blob и перевод reservation в зарегистрированный Blob-size, чтобы параллельные extension pages не создавали transient OOM до отказа \`registerBlobUrl\`. |\n| P1-161 | P1 | OPEN | Ошибка/истечение Yandex OAuth из окна выгрузки открывает настройки, но нет bounded non-secret return context и штатного возврата к незавершённой выгрузке после повторной авторизации. Нужен flow upload → Options/OAuth → безопасный возврат в исходную вкладку без автоматического повтора upload. |\n| P1-162 | P1 | OPEN | Journal domain tree bounded по данным, но worst-case раскрытие/поиск может синхронно создать до ~2000 DOM rows. Нужен generation-fenced incremental renderer/yield, аналогичный OperationLog batching. |\n| P1-163 | P1 | OPEN | Streaming JSON import ограничен по памяти/deadline, но parser делает async \`peek/next\` почти на каждый символ. Для валидного backup до 50 MiB это миллионы async continuations и риск parse-timeout. Нужен chunk-local synchronous cursor с await только при смене chunk. |\n| P1-164 | P1 | REGRESSION | Journal позволяет точечно отозвать публичную ссылку Yandex-файла только после обязательного явного подтверждения. Перед remote mutation создаётся durable checkpoint; \`PUT /resources/unpublish\` проверяется bounded metadata read, затем очищаются \`publicUrl\` и \`resourceId\`, сохраняется текущий path-only \`remotePath\`. Файл не удаляется; после ручного перемещения связь может быть потеряна. Глобальный \`createPublicLinks\` остаётся включён по умолчанию. |\n| P1-165 | P1 | OPEN | Текущий manual verification-code OAuth генерирует \`state\`, но finish-flow получает только вручную введённый code и не может проверить возвращённый \`state\`. PKCE S256 остаётся защитой code exchange, однако полноценная state/CSRF binding требует redirect flow, который возвращает state расширению. |\n| P2-017 | P2 | OPEN | Архитектурное исследование более удобного долговременного OAuth без хранения секрета в обычном \`storage.local\`: сравнить session-only baseline, \`chrome.identity.launchWebAuthFlow\` + повторную PKCE-авторизацию, native/OS credential vault и backend token-broker. Не считать шифрование токена ключом, лежащим рядом в extension storage, реальным усилением защиты. |\n`;
  write(path, text);
}

// Deep-audit continuation including token-storage analysis; no token-storage production change.
{
  const path = 'DEEP_AUDIT_2026-08-25.md';
  let text = read(path);
  assertAbsent(text, '## Second-pass continuation after P0-063', path);
  text += `\n\n## Second-pass continuation after P0-063\n\nAudit source-of-truth baseline before the P1-164 product change: \`${BASE}\`. The pass re-read current GitHub main and did not treat the earlier audit as proof.\n\n### Confirmed additional findings\n\n- **P0-065 OPEN — pre-materialization Blob admission.** \`registerBlobUrl(blob)\` enforces the 12 URL / 256 MiB aggregate only after a large Blob already exists. PDF base64 conversion and staged chunk aggregation can therefore produce a transient heap spike before the budget rejects registration. Reserve count/bytes before materialization and release/convert that reservation on actual settlement.\n- **P1-161 OPEN — authorization recovery round-trip.** The upload error dialog can open Disk settings, but there is no bounded non-secret return context back to the still-open upload/retry UI. Add a TTL-bound tab/document return receipt; never store a token/code/verifier in it and never auto-repeat a non-idempotent upload after OAuth.\n- **P1-162 OPEN — Journal domain-tree rendering.** Data is bounded, but the worst-case expanded filter tree can still create roughly two thousand rows synchronously. Render in generation-fenced batches.\n- **P1-163 OPEN — per-character async JSON parser overhead.** The streaming parser is memory-safe and deadline-bounded but its character-level async cursor can turn a valid 50 MiB backup into millions of Promise continuations. Keep chunk acquisition async and parse within the current chunk synchronously.\n- **P1-165 OPEN — OAuth state is generated but not verifiable in the manual verification-code UI.** PKCE S256 protects the code exchange, but the current finish step receives only the manually copied code, so the stored \`state\` is not compared to a returned state value. A redirect-based flow should close this binding gap.\n\n### Public links — explicit product decision\n\n\`createPublicLinks\` is intentionally enabled by default. This is **not** an audit defect. P1-164 adds user-controlled per-entry unpublish with mandatory confirmation while preserving the default-on behavior.\n\n### Token storage / authorization strategy analysis (planning only)\n\nCurrent session-only storage remains the safest simple browser-only baseline: access token and PKCE pending state live in \`chrome.storage.session\`, persistent legacy copies are removed awaited/fail-closed, and local/session storage are restricted to trusted extension contexts. The tradeoff is re-authorization after the browser session ends.\n\nRecommended options, in order of practical fit:\n\n1. **Session-only token + redirect-based PKCE re-authorization.** Keep the token exactly where it is, but replace manual code copy with \`chrome.identity.launchWebAuthFlow\` (or another extension-owned redirect flow supported by the registered Yandex app). This does not create durable token-at-rest risk and gives the best security/complexity ratio. If Yandex login cookies are present, repeat authorization can often require little user interaction. This is the preferred next design study.\n2. **OS/native credential vault through a narrowly scoped Native Messaging host.** Persist a refresh/access credential in Windows Credential Manager/macOS Keychain/libsecret instead of Chrome storage. The extension receives only a short-lived access token when needed. This provides a genuine separate protection boundary, but adds installation, signing, update and native-host attack-surface costs. Appropriate only if seamless persistence is a strong product requirement.\n3. **Backend token broker.** Store refresh credentials server-side and issue short-lived credentials to the extension after authenticating the user/device. This can strongly reduce browser-at-rest exposure but introduces an external trust domain, server security/availability/privacy obligations and contradicts a local-only product model unless deliberately adopted.\n4. **Encrypted token in \`storage.local\` with a user password-derived key.** This can be meaningful only if the decryption key is not persisted beside the ciphertext. It requires the user to unlock the extension after browser restart and introduces KDF/lockout/recovery UX. It is safer at rest than plaintext local storage but less convenient than OS vault integration.\n5. **Encrypted token + key stored in extension storage.** Do **not** treat this as a security improvement. An attacker able to read the extension's stored ciphertext can normally read the adjacent key as well; it mainly obscures data rather than creating a new security boundary.\n\nNo production token-storage change is made by this audit. The recommended plan is first to prototype option 1, measure the real Yandex re-auth UX, and only consider a native vault if users still need durable sign-in across full Chrome restarts.\n`;
  write(path, text);
}

// README marker.
{
  const path = 'README.md';
  let text = read(path);
  assertAbsent(text, 'P1-164 per-entry Yandex unpublish', path);
  text += `\n\n### Audit WIP — P1-164 per-entry Yandex unpublish\n\nJournal Yandex entries can revoke their own public link after an explicit confirmation. The remote mutation is checkpointed and verified before the journal clears \`publicUrl/resourceId\`; the file remains on Disk and the record becomes path-only. Global public-link creation remains enabled by default. See \`P1-164_CLOSURE.md\`.\n`;
  write(path, text);
}

console.log('P1-164 patch applied from baseline', BASE);
