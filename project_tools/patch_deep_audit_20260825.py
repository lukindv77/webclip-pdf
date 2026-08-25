from pathlib import Path
import re


def read(path):
    return Path(path).read_text('utf-8')


def write(path, text):
    Path(path).write_text(text, 'utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, got {count}')
    return text.replace(old, new, 1)

# P1-155: make existing 5000-candidate locator limits real. Avoid creating an
# unbounded Array from querySelectorAll before slicing it.
content = read('content.js')
anchor = "  function resolveElementLocatorLegacyInDocument(locator, ownerDoc, allowFrame = false) {\n"
helper = """  function collectTagCandidatesBounded(ownerDoc, tag, limit = 5000) {
    const out = [];
    if (!ownerDoc?.getElementsByTagName) return out;
    const safeLimit = Math.max(0, Math.min(5000, Math.floor(Number(limit) || 0)));
    if (!safeLimit) return out;
    let collection = null;
    try { collection = ownerDoc.getElementsByTagName(String(tag || '*').toLowerCase() || '*'); } catch (_) { collection = null; }
    if (!collection) return out;
    const count = Math.min(safeLimit, Math.max(0, Number(collection.length) || 0));
    for (let index = 0; index < count; index += 1) {
      const element = collection[index];
      if (element?.nodeType === 1) out.push(element);
    }
    return out;
  }

  function collectFrameElementsBounded(ownerDoc, limit = 256) {
    const out = [];
    const seen = new Set();
    const safeLimit = Math.max(0, Math.min(256, Math.floor(Number(limit) || 0)));
    if (!ownerDoc?.getElementsByTagName || !safeLimit) return out;
    for (const tag of ['iframe', 'frame']) {
      let collection = null;
      try { collection = ownerDoc.getElementsByTagName(tag); } catch (_) { collection = null; }
      if (!collection) continue;
      const count = Math.min(Math.max(0, Number(collection.length) || 0), safeLimit - out.length);
      for (let index = 0; index < count; index += 1) {
        const frame = collection[index];
        if (!frame || seen.has(frame)) continue;
        seen.add(frame);
        out.push(frame);
        if (out.length >= safeLimit) return out;
      }
    }
    return out;
  }

"""
content = replace_once(content, anchor, helper + anchor, 'content bounded helper insertion')
old_candidate = "      candidates = [...ownerDoc.querySelectorAll(tag)].slice(0, 5000);"
if content.count(old_candidate) != 2:
    raise SystemExit(f'content locator candidate anchors: expected 2, got {content.count(old_candidate)}')
content = content.replace(old_candidate, "      candidates = collectTagCandidatesBounded(ownerDoc, tag, 5000);")
content = replace_once(
    content,
    "      try { frames = [...ownerDoc.querySelectorAll('iframe, frame')].slice(0, 256); } catch (_) { frames = []; }",
    "      try { frames = collectFrameElementsBounded(ownerDoc, 256); } catch (_) { frames = []; }",
    'content cross-origin frame bounded enumeration'
)
content = replace_once(
    content,
    "    const links = [...el.querySelectorAll('a[href]')];\n    const linkTextLength = links.reduce((sum, a) => sum + ((a.innerText || '').trim().length), 0);",
    "    let linkTextLength = 0;\n    try {\n      const links = el.getElementsByTagName('a');\n      const linkLimit = Math.min(5000, Math.max(0, Number(links.length) || 0));\n      for (let index = 0; index < linkLimit; index += 1) {\n        const link = links[index];\n        if (!link?.hasAttribute?.('href')) continue;\n        linkTextLength += (link.innerText || '').trim().length;\n        if (linkTextLength >= textLength) { linkTextLength = textLength; break; }\n      }\n    } catch (_) {}",
    'content link-density bounded enumeration'
)
write('content.js', content)

frame = read('frame-agent.js')
anchor = "  function resolve(l){"
helper = """  function tagCandidatesBounded(tag,limit=5000){const out=[];const cap=Math.max(0,Math.min(5000,Math.floor(Number(limit)||0)));if(!cap)return out;let c=null;try{c=document.getElementsByTagName(String(tag||'*').toLowerCase()||'*')}catch(_){c=null}if(!c)return out;const n=Math.min(cap,Math.max(0,Number(c.length)||0));for(let i=0;i<n;i++){const el=c[i];if(el?.nodeType===1)out.push(el)}return out}
"""
frame = replace_once(frame, anchor, helper + anchor, 'frame-agent bounded helper insertion')
old = "let cand=[];try{cand=[...document.querySelectorAll(String(l.tag||'*').toLowerCase()||'*')].slice(0,5000)}catch(_){}"
frame = replace_once(frame, old, "let cand=[];try{cand=tagCandidatesBounded(String(l.tag||'*').toLowerCase()||'*',5000)}catch(_){}", 'frame-agent bounded locator candidates')
write('frame-agent.js', frame)

# P1-159: OperationLog list renders incrementally and raw multi-MB JSON is
# materialized only on explicit Show/Copy. Keep permanent diagnostics unchanged.
options = read('options.js')
options = replace_once(
    options,
    "let backupStatusGeneration = 0;\n",
    "let backupStatusGeneration = 0;\nconst OPERATION_LOG_RENDER_BATCH_SIZE = 80;\nconst OPERATION_LOG_SEARCH_DEBOUNCE_MS = 120;\nlet operationLogRenderGeneration = 0;\nlet operationLogSearchTimer = 0;\nlet selectedOperationLogValue = null;\nlet selectedOperationLogJsonText = '';\n",
    'options OperationLog render state'
)
options = replace_once(
    options,
    "  operationLogSearch.addEventListener('input', renderOperationLogList);",
    "  operationLogSearch.addEventListener('input', () => {\n    if (operationLogSearchTimer) clearTimeout(operationLogSearchTimer);\n    operationLogSearchTimer = setTimeout(() => {\n      operationLogSearchTimer = 0;\n      renderOperationLogList();\n    }, OPERATION_LOG_SEARCH_DEBOUNCE_MS);\n  });",
    'options OperationLog search debounce'
)
options = replace_once(
    options,
    "  el('copyOperationLog').addEventListener('click', () => copyText(operationLogJson.textContent, 'Весь лог скопирован в буфер обмена.'));",
    "  el('copyOperationLog').addEventListener('click', () => copySelectedOperationLog());",
    'options OperationLog copy lazy JSON'
)
options = replace_once(
    options,
    "    selectedOperationLogId = '';\n    operationLogDetail.classList.add('hidden');\n    showMessage('Все диагностические логи удалены.', 'ok');",
    "    selectedOperationLogId = '';\n    selectedOperationLogValue = null;\n    selectedOperationLogJsonText = '';\n    operationLogJson.textContent = '';\n    operationLogDetail.classList.add('hidden');\n    showMessage('Все диагностические логи удалены.', 'ok');",
    'options clear OperationLog detail state'
)
start = options.index('function renderOperationLogList() {')
end = options.index('\nfunction openOperationLog(', start)
new_render = r'''function createOperationLogRow(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'operation-log-row';
  button.addEventListener('click', () => openOperationLog(item.operationId));

  const main = document.createElement('div');
  main.className = 'operation-log-row-main';
  const title = document.createElement('div');
  title.className = 'operation-log-row-title';
  title.textContent = item.description || item.title || item.type || 'Операция WebClip';
  const technicalTitle = document.createElement('div');
  technicalTitle.className = 'operation-log-row-description';
  technicalTitle.textContent = item.title && item.title !== title.textContent ? item.title : '';
  const meta = document.createElement('div');
  meta.className = 'operation-log-row-meta';
  meta.textContent = `${formatDateTime(item.updatedAt) || 'дата не указана'} · событий: ${Number(item.eventCount || 0)}${item.summary ? ` · ${item.summary}` : ''}`;
  const id = document.createElement('div');
  id.className = 'operation-log-row-id';
  id.textContent = item.operationId || '';
  main.append(title);
  if (technicalTitle.textContent) main.append(technicalTitle);
  main.append(meta, id);

  const state = document.createElement('span');
  const status = String(item.status || 'running');
  state.className = `operation-log-status-pill ${status}`;
  state.textContent = status === 'success' ? 'Успешно' : status === 'partial' ? 'Частично' : status === 'error' ? 'Ошибка' : status === 'canceled' ? 'Отменено' : 'Выполняется';
  button.append(main, state);
  return button;
}

function renderOperationLogList() {
  const generation = ++operationLogRenderGeneration;
  const query = operationLogSearch.value.trim().toLowerCase();
  const filtered = operationLogs.filter((item) => {
    if (!query) return true;
    return [item.operationId, item.title, item.description, item.type, item.status, item.summary]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
  operationLogList.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'operation-log-empty';
    empty.textContent = query ? 'Совпадений не найдено.' : 'Диагностических логов пока нет.';
    operationLogList.appendChild(empty);
    return;
  }

  let index = 0;
  const appendBatch = () => {
    if (generation !== operationLogRenderGeneration) return;
    const fragment = document.createDocumentFragment();
    const end = Math.min(filtered.length, index + OPERATION_LOG_RENDER_BATCH_SIZE);
    for (; index < end; index += 1) fragment.appendChild(createOperationLogRow(filtered[index]));
    operationLogList.appendChild(fragment);
    if (index < filtered.length) {
      const schedule = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      schedule(appendBatch);
    }
  };
  appendBatch();
}
'''
options = options[:start] + new_render + options[end:]
options = replace_once(
    options,
    "      selectedOperationLogId = '';\n      operationLogDetail.classList.add('hidden');",
    "      selectedOperationLogId = '';\n      selectedOperationLogValue = null;\n      selectedOperationLogJsonText = '';\n      operationLogJson.textContent = '';\n      operationLogDetail.classList.add('hidden');",
    'options list refresh clears stale detail'
)
options = replace_once(
    options,
    "    operationLogJson.textContent = JSON.stringify(response.log || {}, null, 2);\n    operationLogJson.classList.remove('hidden');\n    el('toggleOperationLogText').textContent = 'Свернуть текст лога';",
    "    selectedOperationLogValue = response.log || {};\n    selectedOperationLogJsonText = '';\n    operationLogJson.textContent = '';\n    operationLogJson.classList.add('hidden');\n    el('toggleOperationLogText').textContent = 'Показать JSON лога';",
    'options lazy OperationLog detail JSON'
)
old_toggle = """function toggleOperationLogText() {
  const hidden = operationLogJson.classList.toggle('hidden');
  el('toggleOperationLogText').textContent = hidden ? 'Развернуть текст лога' : 'Свернуть текст лога';
}
"""
new_toggle = """function materializeSelectedOperationLogJson() {
  if (!selectedOperationLogValue) return '';
  if (!selectedOperationLogJsonText) selectedOperationLogJsonText = JSON.stringify(selectedOperationLogValue, null, 2);
  return selectedOperationLogJsonText;
}

function toggleOperationLogText() {
  const currentlyHidden = operationLogJson.classList.contains('hidden');
  if (currentlyHidden) {
    operationLogJson.textContent = materializeSelectedOperationLogJson();
    operationLogJson.classList.remove('hidden');
    el('toggleOperationLogText').textContent = 'Скрыть JSON лога';
  } else {
    operationLogJson.classList.add('hidden');
    el('toggleOperationLogText').textContent = 'Показать JSON лога';
  }
}

async function copySelectedOperationLog() {
  const text = materializeSelectedOperationLogJson();
  if (!text) throw new Error('Сначала выберите операцию.');
  await copyText(text, 'Весь лог скопирован в буфер обмена.');
}
"""
options = replace_once(options, old_toggle, new_toggle, 'options lazy toggle materialization')
write('options.js', options)

journal = read('journal.js')
# Build large domain tree detached, then attach once.
fn_start = journal.index('function renderDomainFilter() {')
fn_end = journal.index('\nfunction makeDomainFilterButton(', fn_start)
block = journal[fn_start:fn_end]
block = replace_once(block, "  if (!visible) return;\n\n", "  if (!visible) return;\n  const fragment = document.createDocumentFragment();\n\n", 'journal domain fragment init')
block = block.replace('domainFilterTree.appendChild(', 'fragment.appendChild(')
block = block.rstrip() + "\n  domainFilterTree.appendChild(fragment);\n}\n"
# Previous block already includes closing brace; remove duplicated closing brace before appended final line.
block = block.replace("\n}\n  domainFilterTree.appendChild(fragment);\n}\n", "\n  domainFilterTree.appendChild(fragment);\n}\n")
journal = journal[:fn_start] + block + journal[fn_end:]
# Linked Journal OperationLog: no duplicate stringify on load/copy; materialize once on explicit action.
journal = replace_once(journal, "  let cachedLog = null;\n  let loading = null;", "  let cachedLog = null;\n  let cachedJson = '';\n  let loading = null;", 'journal linked log cache state')
journal = replace_once(journal, "        pre.textContent = JSON.stringify(log, null, 2);\n        return log;", "        cachedJson = '';\n        return log;", 'journal linked log lazy load')
journal = replace_once(journal, "      await load();\n      pre.classList.remove('hidden');", "      const log = await load();\n      if (!cachedJson) cachedJson = JSON.stringify(log, null, 2);\n      pre.textContent = cachedJson;\n      pre.classList.remove('hidden');", 'journal linked log show materialization')
journal = replace_once(journal, "      const log = await load();\n      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));", "      const log = await load();\n      if (!cachedJson) cachedJson = JSON.stringify(log, null, 2);\n      await navigator.clipboard.writeText(cachedJson);", 'journal linked log copy cached materialization')
write('journal.js', journal)

# Regression tests.
Path('project_tools/test_p1_155_bounded_dom_enumeration.js').write_text(r'''const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const content = fs.readFileSync('content.js', 'utf8');
const frame = fs.readFileSync('frame-agent.js', 'utf8');
assert(content.includes('function collectTagCandidatesBounded(ownerDoc, tag, limit = 5000)'));
assert(!content.includes("[...ownerDoc.querySelectorAll(tag)].slice(0, 5000)"));
assert(content.includes('collectFrameElementsBounded(ownerDoc, 256)'));
assert(!content.includes("[...ownerDoc.querySelectorAll('iframe, frame')].slice(0, 256)"));
assert(frame.includes('function tagCandidatesBounded(tag,limit=5000)'));
assert(!frame.includes("[...document.querySelectorAll(String(l.tag||'*').toLowerCase()||'*')].slice(0,5000)"));
const match = content.match(/  function collectTagCandidatesBounded\(ownerDoc, tag, limit = 5000\) \{[\s\S]*?\n  \}\n\n  function collectFrameElementsBounded/);
assert(match, 'bounded helper extraction');
const fnSource = match[0].replace(/\n\n  function collectFrameElementsBounded[\s\S]*$/, '');
let reads = 0;
const collection = new Proxy({ length: 100000 }, { get(target, prop) { if (/^\d+$/.test(String(prop))) { reads += 1; return { nodeType: 1, index: Number(prop) }; } return target[prop]; } });
const sandbox = { ownerDoc: { getElementsByTagName() { return collection; } }, result: null };
vm.createContext(sandbox);
vm.runInContext(`${fnSource}\nresult = collectTagCandidatesBounded(ownerDoc, 'div', 5000);`, sandbox);
assert.strictEqual(sandbox.result.length, 5000);
assert.strictEqual(reads, 5000, 'must not enumerate beyond the declared limit');
console.log('P1-155 bounded DOM candidate enumeration regression PASS');
''', 'utf-8')

Path('project_tools/test_p1_159_large_result_render.js').write_text(r'''const fs = require('fs');
const assert = require('assert');
const options = fs.readFileSync('options.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');
assert(options.includes('const OPERATION_LOG_RENDER_BATCH_SIZE = 80'));
assert(options.includes('const OPERATION_LOG_SEARCH_DEBOUNCE_MS = 120'));
assert(options.includes('const generation = ++operationLogRenderGeneration'));
assert(options.includes('document.createDocumentFragment()'));
assert(options.includes('requestAnimationFrame'));
assert(options.includes('function materializeSelectedOperationLogJson()'));
assert(!options.includes("operationLogJson.textContent = JSON.stringify(response.log || {}, null, 2)"));
assert(options.includes("operationLogSearch.addEventListener('input', () =>"));
assert(options.includes('copySelectedOperationLog()'));
const domain = journal.slice(journal.indexOf('function renderDomainFilter() {'), journal.indexOf('function makeDomainFilterButton('));
assert(domain.includes('const fragment = document.createDocumentFragment()'));
assert(domain.includes('domainFilterTree.appendChild(fragment)'));
assert(!domain.includes('domainFilterTree.appendChild(allRow)'));
const linked = journal.slice(journal.indexOf('function buildLinkedOperationLog(entry)'), journal.indexOf('function renderEntry', journal.indexOf('function buildLinkedOperationLog(entry)')) > 0 ? journal.indexOf('function renderEntry', journal.indexOf('function buildLinkedOperationLog(entry)')) : journal.length);
assert(linked.includes("let cachedJson = ''"));
assert(linked.includes('navigator.clipboard.writeText(cachedJson)'));
console.log('P1-159 large-result incremental/lazy render regression PASS');
''', 'utf-8')

# Audit and closure documentation.
Path('DEEP_AUDIT_2026-08-25.md').write_text('''# Deep code and architecture audit — 2026-08-25\n\nBaseline product HEAD: `cd7ec913e256b820033028e5e876260d65331de2` (P1-153 real its.1c.ru verification). The audit was repeated from the current main source, not reconstructed from prior findings.\n\n## Scope and baseline\n\nRuntime/config inventory: 19 JS/HTML/JSON product files. Largest runtime files: `service-worker.js` ~523 KiB, `content.js` ~186 KiB, `journal.js` ~151 KiB, bundled PSL ~167 KiB. Static inventory found 3 network `fetch()` sites and 3 `AbortController` sites, 254 Chrome API call patterns, 70 runtime messages, 11 tab messages, 64 timers, 90 Map/Set constructions, no `eval`/`new Function`. Baseline deterministic gate: 84/84 JS syntax and 71/71 tests PASS.\n\nPermanent OperationLog diagnostics (`pageAnalysis`, `printDiagnostics`, `frameMeasurements`, `flattenedFrames`, `rootLayout`, `page-analysis`, `copy-save`) are product functionality and are explicitly retained.\n\n## Security / external services\n\n- Manifest V3, explicit self-only extension CSP, no remotely hosted/executed code and no eval-like execution.\n- Cross-origin page access is optional host permission requested at runtime; no install-time all-sites host permission.\n- `chrome.storage.local/session` are restricted to TRUSTED_CONTEXTS; Yandex access token is session-only, legacy persistent token cleanup is awaited/fail-closed.\n- OAuth authorization code flow uses `state` and PKCE S256. Tokens are sent in Authorization headers, not query strings.\n- All three network fetch paths are HTTPS and AbortController-bounded; signed offscreen Disk transfers reject redirects and only accept Yandex Disk signed hosts.\n- No new direct token exfiltration, arbitrary remote-code execution, or content-script-to-admin privilege bypass was found in this pass.\n\n## New findings\n\n### P0\n- **P0-063 OPEN — global offscreen signed-transfer admission/memory budget.** Blob-URL memory is capped, but `activeTransfers` is only a counter and does not reject/queue concurrent large transfers. Multiple trusted tabs/pages can simultaneously materialize up to tens of MiB each in IDB/Blob/fetch bodies. Add global count + actual byte budget; reserve before materialization and release only on actual settlement.\n- **P0-064 OPEN — flattened iframe deep-clone preflight budget.** P1-151 limits computed-style copying to 2500 elements, but `cloneNode(true)`, `querySelectorAll('*')` and source/target arrays are created before that limit. A pathological same-origin selected iframe can create an OOM-sized temporary DOM. Add a bounded preflight node/text/estimated-byte budget and fail safely before cloning; then walk source/target incrementally instead of materializing all descendants.\n\n### P1\n- **P1-154 OPEN — top-document live selection budget.** `content.js` Include/Exclude Maps have no count cap while every mutation refreshes outlines and later snapshot work is O(N). `frame-agent.js` already caps selections at 250. Add an equivalent top-frame budget and bounded restore behavior.\n- **P1-155 REGRESSION — candidate enumeration allocated beyond its declared limit.** Locator restore used `[...querySelectorAll()].slice(0,5000)`, so huge NodeLists were fully copied before slicing. Fixed by indexed bounded tag collections in top/frame-agent paths and bounded link-density enumeration.\n- **P1-156 OPEN — prepared Save As page cleanup lifecycle.** The page-owned `downloads.onChanged` listener has no fallback removal/reconciliation if the terminal event is missed, and the best-effort release runtime message can itself remain unsettled. Keep native `saveAs:true` unbounded/page-owned, but add bounded listener lifetime + terminal `downloads.search` reconciliation and bounded/deduplicated release control RPC.\n- **P1-157 OPEN — extension-page/content Chrome API deadline coverage.** Popup, Journal, Options and content still contain direct `runtime.sendMessage`, `tabs.sendMessage`, `executeScript`, `tabs.update/query` paths outside their newer bounded helpers. Reads/idempotent calls need local deadlines; non-idempotent calls require operation-id/actual-settlement reconciliation rather than blind retry.\n- **P1-158 OPEN — residual service-worker Chrome maintenance/config reads.** Examples include raw `yandexConfig` reads and version-refresh `storage/tabs` maintenance. Audit every remaining direct awaited Chrome call and route it through bounded read or serialized actual-settlement mutation infrastructure where appropriate.\n- **P1-159 REGRESSION — large-result UI work blocked the extension-page main thread.** OperationLog could create up to 500 multi-node rows synchronously on every search keystroke and eagerly stringify a multi-MiB detail. Fixed with 120 ms search debounce, 80-row animation-frame batches + DocumentFragment, lazy/cached raw JSON, one-time linked-Journal JSON materialization, and detached Journal domain-tree construction.\n- **P1-160 OPEN — auto-content/page discovery scan budget.** Main-content detection and some page/frame discovery paths still run broad `querySelectorAll` scans over arbitrary page DOM without a visited-node/time budget. Add a shared traversal deadline/node cap and fail/degrade to manual selection without freezing the page.\n\n### P2\n- **P2-014 OPEN — split oversized runtime modules / reduce coupling.** `service-worker.js` (~523 KiB) and `content.js` (~186 KiB) combine many unrelated subsystems. Split by trust boundary and subsystem with explicit interfaces/tests; evaluate cold-start parse cost before/after.\n- **P2-015 OPEN — streaming large offscreen upload bodies.** Chunked Journal export is staged safely, but upload reconstruction still forms a complete Blob. After P0-063, investigate bounded streaming request bodies/chunk pipeline to reduce peak memory while preserving Yandex signed-upload semantics.\n- **P2-016 OPEN — least-privilege page capability/manifest review.** Introduce an exact extension-page capability matrix for privileged runtime commands and re-evaluate broad `tabs` permission usage. `debugger` remains functionally required for Chromium `Page.printToPDF`; optional site access must remain user-granted.\n\n## Large-result cost assessment\n\nBefore P1-159, the OperationLog list could synchronously construct roughly 500 buttons and several thousand child DOM nodes/listeners per refresh, including once per input event. The Journal domain tree can expose up to 500 bases + 1500 child domains. OperationLog records are bounded to 4 MiB, but eager pretty JSON created an additional multi-MiB string and text node immediately on detail selection. The new path yields after each 80 OperationLog rows, coalesces typing for 120 ms, constructs the domain tree detached, and materializes full raw JSON only on an explicit user action. Exact wall-clock improvement depends on device/Chrome and will be measured in real browser QA; the synchronous work and peak duplicate-string count are structurally reduced.\n\n## Existing safeguards revalidated\n\nIDB/import/export size/deadline budgets, OperationLog caps, Blob URL caps/TTL, offscreen idle lifecycle, debugger attach/detach fencing, Chrome Action fencing, late-settlement storage/alarm queues, PDF streaming, Journal recovery markers, full PSL, Yandex path/account/resource identity and backup lease/recovery remain intact under the deterministic regression gate.\n''', 'utf-8')

Path('P1-155_CLOSURE.md').write_text('''# P1-155 Closure — bounded DOM candidate enumeration\n\nStatus: REGRESSION\n\nExisting 5000-element restore limits no longer allocate an unbounded Array before slicing. Top-document and frame-agent locator restore use indexed bounded tag collections; cross-origin candidate enumeration and link-density work also avoid the previous spread-before-limit pattern. Dedicated regression: `project_tools/test_p1_155_bounded_dom_enumeration.js`.\n''', 'utf-8')
Path('P1-159_CLOSURE.md').write_text('''# P1-159 Closure — large-result extension-page rendering\n\nStatus: REGRESSION\n\nOperationLog search is debounced 120 ms; list DOM is appended in 80-row animation-frame batches using fragments; multi-MiB pretty JSON is cached/materialized only on explicit Show/Copy; linked Journal OperationLog avoids duplicate stringify; domain filter construction is detached before a single append. Permanent diagnostic fields are unchanged. Dedicated regression: `project_tools/test_p1_159_large_result_render.js`.\n''', 'utf-8')

registry = read('project_docs/PRIORITIES_P0_P1_P2.md')
if 'P0-063' in registry or 'P1-154' in registry or 'P2-014' in registry:
    raise SystemExit('new audit IDs already present')
registry += '''\n\n## Повторный глубокий аудит 2026-08-25 — memory / timeout / security / performance\n\n| Код | Приоритет | Статус | Пункт |\n|---|---|---|---|\n| P0-063 | P0 | OPEN | Offscreen signed-transfer не имеет глобального admission budget по числу/байтам реально незавершённых крупных transfer. Несколько параллельных 50–64 МБ операций могут одновременно материализовать IDB/Blob/fetch body и создать OOM/крах Chrome; нужен actual-settlement count+byte budget до materialization. |\n| P0-064 | P0 | OPEN | Same-origin iframe flattening ограничивает только копирование computed styles (2500), но deep clone и полные source/target descendant arrays создаются до лимита. Нужен preflight node/text/byte budget и инкрементальный traversal, чтобы патологический iframe fail-safe завершался ошибкой вместо OOM. |\n| P1-154 | P1 | OPEN | Top-document Include/Exclude в `content.js` не имеют live-count budget; каждое изменение запускает O(N) outline/snapshot work. Требуется лимит, согласованный с frame-agent (250), и bounded restore с понятной диагностикой. |\n| P1-155 | P1 | REGRESSION | Реальный предел DOM locator candidates: устранён spread полного `querySelectorAll` перед `.slice(0,5000)`; top/frame-agent используют bounded indexed tag collections, cross-origin frame enumeration/link-density также не создают прежний полный Array. |\n| P1-156 | P1 | OPEN | Page-owned native Save As: listener `downloads.onChanged` может остаться навсегда при пропущенном terminal event; release RPC не имеет bounded control deadline. Native `saveAs:true` остаётся без timeout, но cleanup требует fallback lifetime + `downloads.search` reconciliation и bounded/dedup release RPC. |\n| P1-157 | P1 | OPEN | В popup/Journal/Options/content остались прямые Chrome API/runtime RPC вне централизованных deadline helpers. Reads/idempotent calls должны быть bounded; non-idempotent side effects — operation-id/actual-settlement reconciled без blind retry. |\n| P1-158 | P1 | OPEN | В service-worker остались direct awaited Chrome maintenance/config reads (в т.ч. отдельные yandexConfig/version-refresh/tabs paths), которые не все проходят центральный bounded read/serialized mutation слой. Нужен полный per-call reconciliation. |\n| P1-159 | P1 | REGRESSION | Большие UI-результаты: OperationLog search debounce 120 мс, список по 80 строк/frame + DocumentFragment, raw JSON lazy/cached, Journal linked log без двойного stringify, domain tree строится detached. |\n| P1-160 | P1 | OPEN | Auto-content/page discovery всё ещё содержит широкие DOM query scans без общего visited-node/time budget. Нужен shared traversal budget с graceful fallback к ручному выбору вместо риска подвисания страницы. |\n| P2-014 | P2 | OPEN | Декомпозиция монолитов `service-worker.js` (~523 KiB) и `content.js` (~186 KiB) по trust/subsystem boundaries; измерить cold-start parse/maintenance эффект и закрепить интерфейсы regression-тестами. |\n| P2-015 | P2 | OPEN | После P0-063 исследовать streaming upload крупных staged/chunked payload в signed Yandex upload, чтобы не восстанавливать полный 50–64 МБ Blob в памяти перед fetch. |\n| P2-016 | P2 | OPEN | Least-privilege hardening: exact capability matrix для extension pages и повторная проверка необходимости широкого `tabs` permission. `debugger` остаётся функционально необходимым для `Page.printToPDF`, optional host access — только по user grant. |\n'''
write('project_docs/PRIORITIES_P0_P1_P2.md', registry)

readme = read('README.md')
readme += '''\n\n### Deep audit — 2026-08-25\nПовторный аудит с нуля зафиксирован в `DEEP_AUDIT_2026-08-25.md`. Новые safety/backlog: P0-063/P0-064, P1-154…P1-160, P2-014…P2-016. В этом проходе закрыты regression P1-155 (реально bounded DOM candidate enumeration) и P1-159 (large-result UI batching/lazy JSON). Постоянная OperationLog page/print диагностика сохранена без сокращения.\n'''
write('README.md', readme)

qa = read('QA_STATUS_0_9_9.md')
qa += '''\n\n## 2026-08-25 — повторный deep audit\n- Audit baseline: 84/84 JS syntax, 71/71 deterministic tests до изменений.\n- Новые findings зарегистрированы как P0-063/P0-064, P1-154…P1-160, P2-014…P2-016.\n- P1-155/P1-159 исправлены и должны пройти новый полный gate.\n- OperationLog structural/page/print diagnostics остаются постоянным продуктовым функционалом.\n- Этот аудит не заменяет unmanaged unpacked Chrome + реальный Yandex release QA.\n'''
write('QA_STATUS_0_9_9.md', qa)

print('deep audit remediation patch applied')
