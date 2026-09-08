'use strict';
const assert = require('assert');

function joinPath(parent, name) {
  const base = String(parent || '/').replace(/\/+$/, '') || '/';
  return `${base === '/' ? '' : base}/${String(name).replace(/^\/+/, '')}` || '/';
}

class FolderBrowseModel {
  constructor(path = '/') {
    this.currentBrowsePath = path;
    this.folderBrowseGeneration = 0;
    this.nextCreateGeneration = 1;
    this.visibleListPath = path;
    this.backgroundCache = new Map();
  }

  startBrowse(path) {
    const generation = ++this.folderBrowseGeneration;
    return { generation, path };
  }

  completeBrowse(receipt, responsePath = receipt.path) {
    if (receipt.generation !== this.folderBrowseGeneration) return { applied: false, reason: 'stale-browse' };
    this.currentBrowsePath = responsePath;
    this.visibleListPath = responsePath;
    return { applied: true, reason: 'current-browse' };
  }

  startCreate(name) {
    const parentPath = this.currentBrowsePath;
    return {
      createGeneration: this.nextCreateGeneration++,
      parentPath,
      targetPath: joinPath(parentPath, name),
      browseGenerationAtAdmission: this.folderBrowseGeneration
    };
  }

  completeCreate(receipt, { ok = true, responsePath = receipt.targetPath } = {}) {
    if (!ok) return { success: false, refresh: null, createdPath: null };
    const createdPath = responsePath;
    if (this.folderBrowseGeneration !== receipt.browseGenerationAtAdmission) {
      return { success: true, refresh: null, createdPath, reason: 'newer-browse-intent' };
    }
    // Refresh the admitted parent, never whatever currentBrowsePath happens to be later.
    const refresh = this.startBrowse(receipt.parentPath);
    return { success: true, refresh, createdPath, reason: 'refresh-admitted-parent' };
  }

  cacheOldParent(path, folders) {
    this.backgroundCache.set(path, [...folders]);
    // Deliberately no browse-generation mutation.
  }
}

// Current-shape counterexample: create A finishes while browse B is in flight,
// then loadFolders(currentBrowsePath) restarts A and makes B stale.
{
  let currentBrowsePath = '/A';
  let folderBrowseGeneration = 0;
  const createTarget = joinPath(currentBrowsePath, 'New');
  const browseB = ++folderBrowseGeneration; // user intent B starts; current path is still A until response
  const createRefreshA = ++folderBrowseGeneration; // late create calls loadFolders(currentBrowsePath === A)
  assert.strictEqual(currentBrowsePath, '/A');
  assert.strictEqual(createTarget, '/A/New');
  assert.notStrictEqual(browseB, folderBrowseGeneration, 'B is now stale because create completion started A reload');
  assert.strictEqual(createRefreshA, folderBrowseGeneration);
  console.log('P1-223 current-shape counterexample: late create completion supersedes newer browse B');
}

// A. No navigation after create admission -> refresh admitted parent A.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const result = m.completeCreate(create);
  assert.strictEqual(result.createdPath, '/A/New');
  assert.ok(result.refresh);
  assert.strictEqual(result.refresh.path, '/A');
  m.completeBrowse(result.refresh, '/A');
  assert.strictEqual(m.currentBrowsePath, '/A');
}

// B. Browse B starts while create A is pending -> create completion must not start A reload.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseB = m.startBrowse('/B');
  const result = m.completeCreate(create);
  assert.strictEqual(result.refresh, null);
  m.completeBrowse(browseB, '/B');
  assert.strictEqual(m.currentBrowsePath, '/B');
  assert.strictEqual(result.createdPath, '/A/New');
}

// C. Browse B completes before create A -> current UI remains B and create success still identifies A/New.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseB = m.startBrowse('/B');
  m.completeBrowse(browseB, '/B');
  const result = m.completeCreate(create, { responsePath: '/A/New' });
  assert.strictEqual(result.refresh, null);
  assert.strictEqual(m.currentBrowsePath, '/B');
  assert.strictEqual(result.createdPath, '/A/New');
}

// D. B then C navigation while create A is pending -> C stays authoritative.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseB = m.startBrowse('/B');
  const browseC = m.startBrowse('/C');
  assert.strictEqual(m.completeBrowse(browseB, '/B').applied, false);
  m.completeCreate(create);
  m.completeBrowse(browseC, '/C');
  assert.strictEqual(m.currentBrowsePath, '/C');
}

// E. Remote create target is immutable and never retargeted to later browse state.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseB = m.startBrowse('/B');
  m.completeBrowse(browseB, '/B');
  assert.strictEqual(create.targetPath, '/A/New');
  assert.strictEqual(create.parentPath, '/A');
}

// F. Even a newer navigation back to the same textual path is a newer intent generation.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseA2 = m.startBrowse('/A');
  const result = m.completeCreate(create);
  assert.strictEqual(result.refresh, null);
  m.completeBrowse(browseA2, '/A');
  assert.strictEqual(m.currentBrowsePath, '/A');
}

// G. Failed create has no post-success reload authority.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const result = m.completeCreate(create, { ok: false });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.refresh, null);
  assert.strictEqual(m.folderBrowseGeneration, 0);
}

// H. Optional background refresh/cache of old A must not participate in current UI generation.
{
  const m = new FolderBrowseModel('/A');
  const create = m.startCreate('New');
  const browseB = m.startBrowse('/B');
  const before = m.folderBrowseGeneration;
  m.cacheOldParent(create.parentPath, ['New']);
  assert.strictEqual(m.folderBrowseGeneration, before);
  m.completeBrowse(browseB, '/B');
  assert.strictEqual(m.currentBrowsePath, '/B');
  assert.deepStrictEqual(m.backgroundCache.get('/A'), ['New']);
}

console.log('P1-223 Create Folder browse-intent deterministic model: PASS');
