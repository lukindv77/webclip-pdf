(() => {
  'use strict';

  const DEFAULT_MAX_TOTAL_CHARS = 50 * 1024 * 1024;
  const DEFAULT_MAX_ENTRY_CHARS = 8 * 1024 * 1024;
  const DEFAULT_MAX_STRING_CHARS = 4 * 1024 * 1024;
  const DEFAULT_MAX_DEPTH = 64;
  const DEFAULT_MAX_CONTAINER_ITEMS = 20_000;
  const DEFAULT_MAX_ENTRIES = 100_000;

  class AsyncJsonCharReader {
    constructor(chunks, { maxTotalChars = DEFAULT_MAX_TOTAL_CHARS, deadlineAt = 0 } = {}) {
      if (!chunks || typeof chunks[Symbol.asyncIterator] !== 'function') {
        throw new TypeError('Streaming JSON source must be an async iterable of text chunks.');
      }
      this.iterator = chunks[Symbol.asyncIterator]();
      this.buffer = '';
      this.offset = 0;
      this.eof = false;
      this.totalReceivedChars = 0;
      this.consumedChars = 0;
      this.maxTotalChars = Math.max(1024, Number(maxTotalChars) || DEFAULT_MAX_TOTAL_CHARS);
      this.deadlineAt = Math.max(0, Number(deadlineAt) || 0);
      this.localConsumedLimit = 0;
    }

    assertDeadline() {
      if (this.deadlineAt && Date.now() >= this.deadlineAt) {
        const error = new Error('Потоковый разбор журнала превысил безопасный deadline.');
        error.code = 'JOURNAL_IMPORT_PARSE_TIMEOUT';
        throw error;
      }
    }

    async fill() {
      this.assertDeadline();
      while (!this.eof && this.offset >= this.buffer.length) {
        const next = await this.iterator.next();
        this.assertDeadline();
        if (next.done) {
          this.buffer = '';
          this.offset = 0;
          this.eof = true;
          return false;
        }
        const chunk = String(next.value ?? '');
        this.totalReceivedChars += chunk.length;
        if (this.totalReceivedChars > this.maxTotalChars) {
          throw new Error('Файл журнала превышает безопасный размер импорта.');
        }
        if (!chunk) continue;
        this.buffer = chunk;
        this.offset = 0;
      }
      return this.offset < this.buffer.length;
    }

    async peek() {
      return (await this.fill()) ? this.buffer[this.offset] : '';
    }

    async next() {
      if (!(await this.fill())) return '';
      const value = this.buffer[this.offset];
      this.offset += 1;
      this.consumedChars += 1;
      if (this.localConsumedLimit && this.consumedChars > this.localConsumedLimit) {
        const error = new Error('Одна запись журнала превышает безопасный размер потокового импорта.');
        error.code = 'JOURNAL_IMPORT_ENTRY_TOO_LARGE';
        throw error;
      }
      return value;
    }
  }

  function syntax(message) {
    const error = new SyntaxError(message);
    error.code = 'JOURNAL_IMPORT_JSON_SYNTAX';
    return error;
  }

  async function skipWhitespace(reader) {
    while (true) {
      const ch = await reader.peek();
      if (!ch || !/[\u0009\u000a\u000d\u0020]/.test(ch)) return;
      await reader.next();
    }
  }

  async function expectChar(reader, expected) {
    await skipWhitespace(reader);
    const actual = await reader.next();
    if (actual !== expected) throw syntax(`Ожидался символ «${expected}».`);
  }

  async function parseJsonString(reader, limits) {
    await skipWhitespace(reader);
    if (await reader.next() !== '"') throw syntax('Ожидалась JSON-строка.');
    let out = '';
    while (true) {
      const ch = await reader.next();
      if (!ch) throw syntax('JSON-строка неожиданно завершилась.');
      if (ch === '"') return out;
      if (ch === '\\') {
        const escaped = await reader.next();
        if (!escaped) throw syntax('Некорректная escape-последовательность JSON.');
        switch (escaped) {
          case '"': out += '"'; break;
          case '\\': out += '\\'; break;
          case '/': out += '/'; break;
          case 'b': out += '\b'; break;
          case 'f': out += '\f'; break;
          case 'n': out += '\n'; break;
          case 'r': out += '\r'; break;
          case 't': out += '\t'; break;
          case 'u': {
            let hex = '';
            for (let i = 0; i < 4; i += 1) {
              const digit = await reader.next();
              if (!/[0-9a-f]/i.test(digit)) throw syntax('Некорректная Unicode escape-последовательность JSON.');
              hex += digit;
            }
            out += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default:
            throw syntax('Некорректная escape-последовательность JSON.');
        }
      } else {
        if (ch.charCodeAt(0) < 0x20) throw syntax('JSON-строка содержит управляющий символ.');
        out += ch;
      }
      if (out.length > limits.maxStringChars) {
        const error = new Error('Одна JSON-строка в backup превышает безопасный лимит.');
        error.code = 'JOURNAL_IMPORT_STRING_TOO_LARGE';
        throw error;
      }
    }
  }

  async function parseJsonNumber(reader) {
    await skipWhitespace(reader);
    let raw = '';
    while (true) {
      const ch = await reader.peek();
      if (!ch || /[\s,\]}]/.test(ch)) break;
      raw += await reader.next();
      if (raw.length > 128) throw syntax('JSON-число имеет недопустимую длину.');
    }
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) throw syntax('Некорректное JSON-число.');
    const value = Number(raw);
    if (!Number.isFinite(value)) throw syntax('JSON-число находится вне допустимого диапазона.');
    return value;
  }

  async function parseLiteral(reader, literal, value) {
    for (const expected of literal) {
      if (await reader.next() !== expected) throw syntax(`Некорректный JSON literal ${literal}.`);
    }
    return value;
  }

  async function parseValue(reader, limits, depth = 0, materialize = true) {
    if (depth > limits.maxDepth) {
      const error = new Error('JSON backup имеет слишком глубокую вложенность.');
      error.code = 'JOURNAL_IMPORT_JSON_TOO_DEEP';
      throw error;
    }
    await skipWhitespace(reader);
    const ch = await reader.peek();
    if (!ch) throw syntax('JSON неожиданно завершился.');
    if (ch === '"') return parseJsonString(reader, limits);
    if (ch === '-' || /\d/.test(ch)) return parseJsonNumber(reader);
    if (ch === 't') return parseLiteral(reader, 'true', true);
    if (ch === 'f') return parseLiteral(reader, 'false', false);
    if (ch === 'n') return parseLiteral(reader, 'null', null);
    if (ch === '[') {
      await reader.next();
      const output = materialize ? [] : null;
      let count = 0;
      await skipWhitespace(reader);
      if (await reader.peek() === ']') { await reader.next(); return output; }
      while (true) {
        count += 1;
        if (count > limits.maxContainerItems) {
          const error = new Error('JSON-массив внутри одной записи превышает безопасный лимит элементов.');
          error.code = 'JOURNAL_IMPORT_CONTAINER_TOO_LARGE';
          throw error;
        }
        const value = await parseValue(reader, limits, depth + 1, materialize);
        if (materialize) output.push(value);
        await skipWhitespace(reader);
        const separator = await reader.next();
        if (separator === ']') return output;
        if (separator !== ',') throw syntax('Ожидалась запятая или закрывающая скобка JSON-массива.');
      }
    }
    if (ch === '{') {
      await reader.next();
      const output = materialize ? Object.create(null) : null;
      let count = 0;
      await skipWhitespace(reader);
      if (await reader.peek() === '}') { await reader.next(); return output; }
      while (true) {
        count += 1;
        if (count > limits.maxContainerItems) {
          const error = new Error('JSON-объект внутри одной записи превышает безопасный лимит полей.');
          error.code = 'JOURNAL_IMPORT_CONTAINER_TOO_LARGE';
          throw error;
        }
        const key = await parseJsonString(reader, limits);
        await expectChar(reader, ':');
        const value = await parseValue(reader, limits, depth + 1, materialize);
        if (materialize) Object.defineProperty(output, key, { value, enumerable: true, writable: true, configurable: true });
        await skipWhitespace(reader);
        const separator = await reader.next();
        if (separator === '}') return output;
        if (separator !== ',') throw syntax('Ожидалась запятая или закрывающая скобка JSON-объекта.');
      }
    }
    throw syntax(`Неожиданный символ JSON: ${ch}.`);
  }

  async function parseJournalObject(reader, limits, onEntry, state) {
    await expectChar(reader, '{');
    const seenKeys = new Set();
    await skipWhitespace(reader);
    if (await reader.peek() === '}') { await reader.next(); return; }
    while (true) {
      const key = await parseJsonString(reader, limits);
      if (seenKeys.has(key)) throw syntax(`Дублирующее поле journal.${key} в backup.`);
      seenKeys.add(key);
      await expectChar(reader, ':');
      if (key === 'entries') {
        state.entriesSeen = true;
        await expectChar(reader, '[');
        await skipWhitespace(reader);
        if (await reader.peek() !== ']') {
          while (true) {
            if (state.entryCount >= limits.maxEntries) {
              const error = new Error('Файл содержит слишком много записей журнала.');
              error.code = 'JOURNAL_IMPORT_TOO_MANY_ENTRIES';
              throw error;
            }
            const entryStart = reader.consumedChars;
            const previousLocalLimit = reader.localConsumedLimit;
            reader.localConsumedLimit = entryStart + limits.maxEntryChars;
            try {
              if (onEntry) {
                const rawEntry = await parseValue(reader, limits, 0, true);
                if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
                  throw new Error(`Некорректная запись журнала №${state.entryCount + 1}.`);
                }
                await onEntry(rawEntry, state.entryCount, { sourceChars: reader.consumedChars - entryStart });
              } else {
                await parseValue(reader, limits, 0, false);
              }
            } finally {
              reader.localConsumedLimit = previousLocalLimit;
            }
            state.entryCount += 1;
            await skipWhitespace(reader);
            const separator = await reader.next();
            if (separator === ']') break;
            if (separator !== ',') throw syntax('Ожидалась запятая или закрывающая скобка массива journal.entries.');
          }
        } else {
          await reader.next();
        }
      } else if (key === 'entryCount') {
        const value = await parseValue(reader, limits, 0, true);
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) state.declaredEntryCount = value;
      } else {
        await parseValue(reader, limits, 0, false);
      }
      await skipWhitespace(reader);
      const separator = await reader.next();
      if (separator === '}') return;
      if (separator !== ',') throw syntax('Ожидалась запятая или закрывающая скобка объекта journal.');
    }
  }

  async function process(chunks, options = {}) {
    const limits = {
      maxTotalChars: Math.max(1024, Number(options.maxTotalChars) || DEFAULT_MAX_TOTAL_CHARS),
      maxEntryChars: Math.max(1024, Number(options.maxEntryChars) || DEFAULT_MAX_ENTRY_CHARS),
      maxStringChars: Math.max(1024, Number(options.maxStringChars) || DEFAULT_MAX_STRING_CHARS),
      maxDepth: Math.max(4, Math.min(128, Number(options.maxDepth) || DEFAULT_MAX_DEPTH)),
      maxContainerItems: Math.max(100, Number(options.maxContainerItems) || DEFAULT_MAX_CONTAINER_ITEMS),
      maxEntries: Math.max(1, Number(options.maxEntries) || DEFAULT_MAX_ENTRIES)
    };
    const reader = new AsyncJsonCharReader(chunks, { maxTotalChars: limits.maxTotalChars, deadlineAt: options.deadlineAt });
    const state = {
      schema: '',
      schemaVersion: null,
      exportedAt: '',
      entryCount: 0,
      declaredEntryCount: null,
      entriesSeen: false,
      journalSeen: false
    };
    const seenTopKeys = new Set();
    await expectChar(reader, '{');
    await skipWhitespace(reader);
    if (await reader.peek() !== '}') {
      while (true) {
        const key = await parseJsonString(reader, limits);
        if (seenTopKeys.has(key)) throw syntax(`Дублирующее поле ${key} в backup.`);
        seenTopKeys.add(key);
        await expectChar(reader, ':');
        if (key === 'schema') {
          const value = await parseValue(reader, limits, 0, true);
          state.schema = typeof value === 'string' ? value : '';
        } else if (key === 'schemaVersion') {
          state.schemaVersion = await parseValue(reader, limits, 0, true);
        } else if (key === 'exportedAt') {
          const value = await parseValue(reader, limits, 0, true);
          if (typeof value === 'string' && value.length > 256) throw new Error('Поле exportedAt в backup превышает безопасный лимит.');
          state.exportedAt = typeof value === 'string' ? value : '';
        } else if (key === 'journal') {
          state.journalSeen = true;
          await parseJournalObject(reader, limits, typeof options.onEntry === 'function' ? options.onEntry : null, state);
        } else {
          await parseValue(reader, limits, 0, false);
        }
        await skipWhitespace(reader);
        const separator = await reader.next();
        if (separator === '}') break;
        if (separator !== ',') throw syntax('Ожидалась запятая или закрывающая скобка корневого JSON-объекта.');
      }
    } else {
      await reader.next();
    }
    await skipWhitespace(reader);
    if (await reader.peek()) throw syntax('После корневого JSON-объекта обнаружены лишние данные.');

    if (state.schema !== String(options.expectedSchema || 'webclip-journal')) {
      throw new Error('Это не файл экспорта журнала WebClip.');
    }
    if (Number(state.schemaVersion) !== Number(options.expectedVersion || 1)) {
      throw new Error(`Неподдерживаемая версия схемы журнала: ${state.schemaVersion}.`);
    }
    if (!state.journalSeen || !state.entriesSeen) throw new Error('В файле отсутствует полный список записей журнала.');
    return {
      schema: state.schema,
      schemaVersion: Number(state.schemaVersion),
      exportedAt: state.exportedAt,
      entryCount: state.entryCount
    };
  }

  globalThis.WebClipJournalImportStream = Object.freeze({ process });
})();
