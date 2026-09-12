(async () => {
  const results = [];
  const check = (label, ok, detail = '') => results.push({label, ok: Boolean(ok), detail});
  const sleep = (ms = 0) => new Promise(r => setTimeout(r, ms));
  const frameLoaded = frame => new Promise(resolve => frame.addEventListener('load', resolve, {once:true}));
  const mkFrame = async (parentDoc, name, body = name) => {
    const f = parentDoc.createElement('iframe');
    f.dataset.name = name;
    const p = frameLoaded(f);
    f.srcdoc = `<!doctype html><body><div>${body}</div></body>`;
    parentDoc.body.appendChild(f);
    await p;
    return f;
  };

  // Exact current-source-shaped refresh behavior for the P1-227 topology surface.
  const currentState = { phase: 'selecting', frameDocuments: new Set(), frameLoadHandlers: new Map() };
  let currentRefreshes = 0;
  function currentRefreshFrameDocuments() {
    currentRefreshes += 1;
    const discovered = new Set();
    const discoveredFrames = new Set();
    const visit = (doc) => {
      if (!doc || discovered.has(doc)) return;
      discovered.add(doc);
      let frames = [];
      try { frames = [...doc.querySelectorAll('iframe, frame')]; } catch (_) {}
      for (const frame of frames) {
        discoveredFrames.add(frame);
        if (!currentState.frameLoadHandlers.has(frame)) {
          const handler = () => {
            if (currentState.phase === 'idle') return;
            currentRefreshFrameDocuments();
          };
          currentState.frameLoadHandlers.set(frame, handler);
          try { frame.addEventListener('load', handler, true); } catch (_) {}
        }
        try {
          const child = frame.contentDocument;
          if (child?.documentElement) visit(child);
        } catch (_) {}
      }
    };
    visit(document);
    for (const [frame, handler] of [...currentState.frameLoadHandlers]) {
      if (discoveredFrames.has(frame) && frame?.isConnected) continue;
      try { frame.removeEventListener('load', handler, true); } catch (_) {}
      currentState.frameLoadHandlers.delete(frame);
    }
    currentState.frameDocuments = discovered;
    return discovered;
  }

  const initial = await mkFrame(document, 'initial');
  currentRefreshFrameDocuments();
  check('current discovers frame existing at refresh', currentState.frameDocuments.has(initial.contentDocument));
  const late = await mkFrame(document, 'late');
  await sleep(20);
  check('current does not auto-discover newly inserted frame element', !currentState.frameDocuments.has(late.contentDocument));
  check('new frame has no current load handler before rediscovery', !currentState.frameLoadHandlers.has(late));
  const beforeExplicit = currentRefreshes;
  currentRefreshFrameDocuments();
  check('explicit refresh discovers late frame', currentState.frameDocuments.has(late.contentDocument));
  check('explicit refresh attached late frame load handler', currentState.frameLoadHandlers.has(late));
  check('explicit refresh count advanced once', currentRefreshes === beforeExplicit + 1);

  // Research contract control using actual MutationObserver and iframe load events.
  class LiveTracker {
    constructor(topDoc) {
      this.topDoc = topDoc;
      this.generation = 0;
      this.active = false;
      this.docs = new Set();
      this.observers = new Map();
      this.frameHandlers = new Map();
      this.queuedGeneration = null;
      this.flushes = 0;
    }
    start() {
      this.stop(false);
      this.generation += 1;
      this.active = true;
      this.reconcile(this.generation);
      return this.generation;
    }
    stop(bump = true) {
      if (bump) this.generation += 1;
      this.active = false;
      this.queuedGeneration = null;
      for (const obs of this.observers.values()) obs.disconnect();
      this.observers.clear();
      for (const [frame, handler] of this.frameHandlers) frame.removeEventListener('load', handler, true);
      this.frameHandlers.clear();
      this.docs.clear();
    }
    schedule(gen) {
      if (!this.active || gen !== this.generation || this.queuedGeneration === gen) return;
      this.queuedGeneration = gen;
      queueMicrotask(() => {
        if (this.queuedGeneration === gen) this.queuedGeneration = null;
        if (!this.active || gen !== this.generation) return;
        this.flushes += 1;
        this.reconcile(gen);
      });
    }
    observeDoc(doc, gen) {
      if (this.observers.has(doc)) return;
      const obs = new MutationObserver(records => {
        if (records.some(r => r.type === 'childList')) this.schedule(gen);
      });
      obs.observe(doc, {childList:true, subtree:true});
      this.observers.set(doc, obs);
    }
    ownFrame(frame, gen) {
      if (this.frameHandlers.has(frame)) return;
      const handler = () => this.schedule(gen);
      this.frameHandlers.set(frame, handler);
      frame.addEventListener('load', handler, true);
    }
    reconcile(gen) {
      if (!this.active || gen !== this.generation) return;
      const docs = new Set();
      const frames = new Set();
      const visit = doc => {
        if (!doc || docs.has(doc)) return;
        docs.add(doc);
        let found = [];
        try { found = [...doc.querySelectorAll('iframe, frame')]; } catch (_) {}
        for (const frame of found) {
          frames.add(frame);
          this.ownFrame(frame, gen);
          try { if (frame.contentDocument?.documentElement) visit(frame.contentDocument); } catch (_) {}
        }
      };
      visit(this.topDoc);
      for (const [doc, obs] of [...this.observers]) {
        if (docs.has(doc)) continue;
        obs.disconnect();
        this.observers.delete(doc);
      }
      for (const [frame, handler] of [...this.frameHandlers]) {
        if (frames.has(frame) && frame.isConnected) continue;
        frame.removeEventListener('load', handler, true);
        this.frameHandlers.delete(frame);
      }
      for (const doc of docs) this.observeDoc(doc, gen);
      this.docs = docs;
    }
  }

  const tracker = new LiveTracker(document);
  const g1 = tracker.start();
  const dynamic = await mkFrame(document, 'dynamic');
  await sleep(30);
  check('MutationObserver plus load discovers dynamic top frame', tracker.docs.has(dynamic.contentDocument));
  check('dynamic top frame gets owned load handler', tracker.frameHandlers.has(dynamic));

  const nested = await mkFrame(dynamic.contentDocument, 'nested');
  await sleep(30);
  check('observer on child document discovers nested dynamic frame', tracker.docs.has(nested.contentDocument));
  check('nested dynamic frame gets owned load handler', tracker.frameHandlers.has(nested));

  // Replacement of frame element is topology change and must converge without unrelated refresh.
  const oldDynamicDoc = dynamic.contentDocument;
  const replacement = document.createElement('iframe');
  replacement.dataset.name = 'replacement';
  const replacementLoaded = frameLoaded(replacement);
  replacement.srcdoc = '<!doctype html><body>replacement</body>';
  dynamic.replaceWith(replacement);
  await replacementLoaded;
  await sleep(30);
  check('replacement frame element becomes discovered', tracker.docs.has(replacement.contentDocument));
  check('detached replaced document is removed', !tracker.docs.has(oldDynamicDoc));
  check('detached replaced frame handler is removed', !tracker.frameHandlers.has(dynamic));

  // Known-frame navigation/reload remains a positive control.
  const oldReplacementDoc = replacement.contentDocument;
  const reloadDone = frameLoaded(replacement);
  replacement.srcdoc = '<!doctype html><body>replacement-v2</body>';
  await reloadDone;
  await sleep(30);
  check('known frame load discovers navigated document', tracker.docs.has(replacement.contentDocument));
  check('known frame load drops previous document identity', !tracker.docs.has(oldReplacementDoc));

  // Synchronous mutation burst must produce at most one tracker flush for that burst.
  const beforeBurst = tracker.flushes;
  for (let i = 0; i < 20; i++) {
    const span = document.createElement('span');
    span.textContent = String(i);
    document.body.appendChild(span);
  }
  await sleep(30);
  check('synchronous DOM mutation burst is coalesced to one rediscovery flush', tracker.flushes === beforeBurst + 1, `${beforeBurst}->${tracker.flushes}`);

  const trackedBeforeRemove = nested.contentDocument;
  nested.remove();
  await sleep(30);
  check('nested detach removes child document', !tracker.docs.has(trackedBeforeRemove));
  check('nested detach removes frame load handler', !tracker.frameHandlers.has(nested));

  tracker.stop();
  const docsAfterStop = tracker.docs.size;
  await mkFrame(document, 'post-stop');
  await sleep(30);
  check('stop disconnects observers so later insertion cannot repopulate tracker', tracker.docs.size === docsAfterStop && docsAfterStop === 0);
  check('stop clears frame handlers', tracker.frameHandlers.size === 0);
  check('stop advances generation', tracker.generation > g1);

  const passed = results.filter(r => r.ok).length;
  return { browser: navigator.userAgent, passed, total: results.length, results };
})()
