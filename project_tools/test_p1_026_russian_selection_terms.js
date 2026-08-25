'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

const journal = read('journal.js');
const content = read('content.js');
const sw = read('service-worker.js');
const manifest = read('manifest.json');
const help = read('yandex-auth-help.html');

assert(!journal.includes('Сохранено областей: ${entry.includeCount || 0} · Исключено: ${entry.excludeCount || 0}'),
  'P1-026: duplicate Journal counters row must be removed');
assert(journal.includes('Области страницы Включены/Исключены (${includes.length}/${excludes.length})'),
  'P1-026: Journal selection summary must use Russian terminology and retain the counts');
assert(journal.includes("buildLocatorGroup('Включены', includes, 'include')"));
assert(journal.includes("buildLocatorGroup('Исключены', excludes, 'exclude')"));
assert(journal.includes("makeButton('Применить Включены/Исключены'"));
assert(journal.includes('Выделение восстановлено. Включены: ${result.restoredIncludes || 0}, Исключены: ${result.restoredExcludes || 0}.'));

assert(content.includes('<span class="count">Включены: 0 · Исключены: 0</span>'));
assert(content.includes('state.countLabel.textContent = `Включены: ${includeCount} · Исключены: ${excludeCount}'));
assert(content.includes('области Включены/Исключены'));
assert(content.includes('· Включены: ${entry.includeCount || 0} · Исключены: ${entry.excludeCount || 0}'));
assert(sw.includes("await child('clear', 'Очистить Включены / Исключены');"));
assert(!manifest.includes('Include/Exclude'), 'manifest user-facing description must not expose Include/Exclude');
assert(!help.includes('Include/Exclude'), 'Yandex help must use Russian user-facing terminology');

const forbidden = [
  'Применить Include/Exclude',
  'Области Include/Exclude',
  'Проверьте Include/Exclude',
  'настройки Include/Exclude',
  'Include: ${entry.includeCount',
  'Exclude: ${entry.excludeCount',
  'Выделение восстановлено. Include:',
  'Очистить Include / Exclude',
  'Текущие Include/Exclude',
  'Все Include/Exclude сняты'
];
for (const text of forbidden) {
  assert(!journal.includes(text) && !content.includes(text) && !sw.includes(text), `P1-026: old user-facing term remains: ${text}`);
}

console.log('P1-026 Russian selection terminology regression: PASS');
