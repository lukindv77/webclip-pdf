const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Source markers not found: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

class FakeTransaction {
  constructor(db, names) {
    this.db = db;
    this.names = new Set(Array.isArray(names) ? names : [names]);
    this.pending = 0;
    this.aborted = false;
    this.completed = false;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this._completionTimer = null;
  }

  objectStore(name) {
    if (!this.names.has(name)) throw new Error(`Store ${name} is not in transaction`);
    return new FakeStore(this, name);
  }

  _begin() {
    if (this.completed || this.aborted) throw new Error('Transaction is inactive');
    this.pending += 1;
    if (this._completionTimer) clearTimeout(this._completionTimer);
    this._completionTimer = null;
  }

  _end() {
    this.pending = Math.max(0, this.pending - 1);
    this._scheduleComplete();
  }

  _scheduleComplete() {
    if (this.pending || this.completed || this.aborted || this._completionTimer) return;
    this._completionTimer = setTimeout(() => {
      this._completionTimer = null;
      if (this.pending || this.completed || this.aborted) return;
      this.completed = true;
      this.oncomplete?.();
    }, 0);
  }

  abort() {
    if (this.completed || this.aborted) return;
    this.aborted = true;
    this.error = this.error || new Error('AbortError');
    if (this._completionTimer) clearTimeout(this._completionTimer);
    queueMicrotask(() => this.onabort?.());
  }
}

class FakeStore {
  constructor(tx, name) {
    this.tx = tx;
    this.name = name;
  }

  get(key) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
    this.tx._begin();
    queueMicrotask(() => {
      if (this.tx.aborted) return this.tx._end();
      try {
        req.result = clone(this.tx.db._get(this.name, key));
        req.onsuccess?.();
      } catch (error) {
        req.error = error;
        req.onerror?.();
      } finally {
        this.tx._end();
      }
    });
    return req;
  }

  put(value) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
    this.tx._begin();
    queueMicrotask(() => {
      if (this.tx.aborted) return this.tx._end();
      try {
        req.result = this.tx.db._put(this.name, clone(value));
        req.onsuccess?.();
      } catch (error) {
        req.error = error;
        req.onerror?.();
      } finally {
        this.tx._end();
      }
    });
    return req;
  }

  openCursor(range, direction = 'next') {
    const req = { result: null, error: null, onsuccess: null, onerror: null };
    const rows = this.tx.db._rows(this.name, range, direction);
    let index = 0;
    let active = true;
    this.tx._begin();

    const deliver = () => queueMicrotask(() => {
      if (!active || this.tx.aborted) {
        if (active) { active = false; this.tx._end(); }
        return;
      }
      if (index >= rows.length) {
        req.result = null;
        req.onsuccess?.();
        active = false;
        this.tx._end();
        return;
      }
      const row = rows[index];
      req.result = {
        value: clone(row.value),
        delete: () => this.tx.db._delete(this.name, row.key),
        continue: () => { index += 1; deliver(); }
      };
      req.onsuccess?.();
    });
    deliver();
    return req;
  }
}

class FakeDb {
  constructor() {
    this.operations = new Map();
    this.events = new Map();
  }

  close() {}

  transaction(names) {
    const tx = new FakeTransaction(this, names);
    tx._scheduleComplete();
    return tx;
  }

  _eventKey(valueOrKey) {
    if (Array.isArray(valueOrKey)) return `${valueOrKey[0]}\u0000${Number(valueOrKey[1])}`;
    return `${valueOrKey.operationId}\u0000${Number(valueOrKey.seq)}`;
  }

  _get(name, key) {
    if (name === 'operations') return this.operations.get(String(key));
    if (name === 'events') return this.events.get(this._eventKey(key));
    throw new Error(`Unknown store ${name}`);
  }

  _put(name, value) {
    if (name === 'operations') {
      this.operations.set(String(value.operationId), value);
      return value.operationId;
    }
    if (name === 'events') {
      const key = this._eventKey(value);
      this.events.set(key, value);
      return [value.operationId, value.seq];
    }
    throw new Error(`Unknown store ${name}`);
  }

  _delete(name, key) {
    if (name === 'operations') this.operations.delete(String(key));
    else if (name === 'events') this.events.delete(this._eventKey(key));
  }

  _rows(name, range, direction) {
    if (name !== 'events') throw new Error('Cursor test only implements events store');
    const rows = [...this.events.values()]
      .filter((row) => {
        if (!range) return true;
        const key = [row.operationId, Number(row.seq)];
        const lower = range.lower || ['', -Infinity];
        const upper = range.upper || ['\uffff', Infinity];
        return key[0] === lower[0] && key[0] === upper[0] && key[1] >= lower[1] && key[1] <= upper[1];
      })
      .sort((a, b) => Number(a.seq) - Number(b.seq))
      .map((value) => ({ key: [value.operationId, Number(value.seq)], value }));
    if (direction === 'prev') rows.reverse();
    return rows;
  }
}

async function main() {
  const fakeDb = new FakeDb();
  const legacyEvents = [
    { timestamp: 1, category: 'operation-start', level: 'info', message: 'start', data: {} },
    { timestamp: 2, category: 'stage', level: 'info', message: 'legacy-1', data: {} },
    { timestamp: 3, category: 'stage', level: 'info', message: 'legacy-2', data: {} }
  ];
  fakeDb.operations.set('legacy-op', {
    operationId: 'legacy-op',
    type: 'local-pdf',
    title: 'Legacy operation',
    createdAt: 1,
    updatedAt: 3,
    status: 'running',
    summary: '',
    meta: {},
    events: clone(legacyEvents)
  });

  const context = vm.createContext({
    console,
    Promise,
    Error,
    Number,
    Math,
    String,
    Array,
    Object,
    Map,
    URL,
    Date,
    JSON,
    setTimeout,
    clearTimeout,
    IDBKeyRange: {
      bound(lower, upper) { return { lower: clone(lower), upper: clone(upper) }; }
    },
    OPERATION_LOG_STORE: 'operations',
    OPERATION_LOG_EVENT_STORE: 'events',
    MAX_OPERATION_LOG_EVENTS: 2500,
    MAX_OPERATION_LOG_EVENT_JSON_CHARS: 64 * 1024,
    MAX_OPERATION_LOG_META_JSON_CHARS: 256 * 1024,
    MAX_OPERATION_LOG_RECORD_JSON_CHARS: 4 * 1024 * 1024,
    MAX_OPERATION_LOG_EVENT_TOTAL_JSON_CHARS: 3 * 1024 * 1024,
    operationLogWriteChains: new Map(),
    openOperationLogDb: async () => fakeDb,
    describeOperation: (_type, title) => title || 'operation'
  });

  const boundsCode = section(swSource, 'function sanitizeOperationLogValue', 'function queueOperationLogWrite');
  const appendCode = section(swSource, 'async function appendOperationLogEventOnce', 'async function appendOperationLogEventDurable');
  const getCode = section(swSource, 'async function getOperationLog(operationId)', 'function deleteOperationLogEventsInTransaction');
  vm.runInContext(`${boundsCode}\n${appendCode}\n${getCode}\nthis.appendForTest = appendOperationLogEventOnce; this.getForTest = getOperationLog;`, context);

  await context.appendForTest('legacy-op', {
    timestamp: 4, category: 'stage', level: 'info', message: 'new-1', data: { pass: 1 }
  });

  let header = fakeDb.operations.get('legacy-op');
  assert.deepStrictEqual(header.events, [], 'legacy events[] must be cleared from the v2 header after first append');
  assert.strictEqual(header.operationStartEvent.message, 'start');
  assert.strictEqual(header.eventStoreCount, 3, 'two legacy tail events + first new event must live in event store');
  assert.strictEqual(header.nextEventSeq, 4);
  assert.strictEqual(fakeDb.events.size, 3);

  let result = await context.getForTest('legacy-op');
  assert.strictEqual(
    Array.from(result.log.events, (event) => event.message).join('|'),
    'start|legacy-1|legacy-2|new-1',
    'v1 timeline must reconstruct in order after migration'
  );

  await context.appendForTest('legacy-op', {
    timestamp: 5, category: 'stage', level: 'info', message: 'new-2', data: { pass: 2 }
  });
  header = fakeDb.operations.get('legacy-op');
  assert.strictEqual(header.eventStoreCount, 4);
  assert.strictEqual(header.nextEventSeq, 5);
  assert.strictEqual(fakeDb.events.size, 4, 'second append must not migrate legacy events a second time');

  result = await context.getForTest('legacy-op');
  assert.strictEqual(
    Array.from(result.log.events, (event) => event.message).join('|'),
    'start|legacy-1|legacy-2|new-1|new-2'
  );

  const openDbCode = section(swSource, 'function openOperationLogDb', 'function sanitizeOperationLogValue');
  assert(/OPERATION_LOG_DB_VERSION/.test(openDbCode));
  assert(/createObjectStore\(OPERATION_LOG_EVENT_STORE/.test(openDbCode), 'v2 schema must create the append-only events store');

  console.log('OperationLog v1->v2 migration test OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
