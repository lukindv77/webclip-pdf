# Audit delta — Create Folder completion must not supersede newer folder browsing — 2026-08-29

Baseline `main` before this write: `1a38f3b03a682c951f5ee586e2207339278e6ccc`.

Docs-only audit checkpoint. Runtime, tests, manifest, build, tag and Release are unchanged.

## Classification

**New P1-223 — late Create Folder completion can start a stale folder reload that supersedes a newer user browse intent.**

Remote mutation target capture is not the problem here: the create request correctly builds `path` before awaiting. The defect is the later UI refresh authority.

## Source proof

`options.js` folder navigation uses `folderBrowseGeneration`; `loadFolders(path)` increments it and rejects late older list responses. This correctly implements latest-navigation-wins for list requests.

Folder-row buttons call:

```js
button.addEventListener('click', () => loadFolders(folder.path));
```

`WEBCLIP_YANDEX_CREATE_FOLDER` captures the target path before await:

```js
const path = joinPath(currentBrowsePath, name);
const response = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_YANDEX_CREATE_FOLDER',
  path
});
requireOk(response);
newFolderName.value = '';
await loadFolders(currentBrowsePath);
```

The post-create reload does not capture/validate the browse generation or the browse path that was current when create began.

## Deterministic race

1. User is viewing folder A; `currentBrowsePath === A`.
2. User starts Create Folder `A/X`; remote mutation is now in flight.
3. User clicks folder B. `loadFolders(B)` starts a newer browse generation, but until its response commits, `currentBrowsePath` may still be A.
4. Create `A/X` settles successfully first.
5. Create handler executes `loadFolders(currentBrowsePath)` and therefore starts a **newer** list generation for A.
6. The pending user navigation B becomes stale by generation and is discarded.
7. UI remains/returns at A even though B was the newer user navigation intent.

The physical create still occurred in A, so this must not be "fixed" by retargeting the create operation to B. Only the post-mutation UI refresh needs proper intent fencing.

## Required contract

Create Folder should capture both:

- immutable mutation target context/path for the remote operation;
- browse generation/path at admission only for deciding whether a post-success refresh is still relevant.

After create settles:

- if the user has not navigated since admission, refresh the admitted parent folder;
- if a newer browse generation exists, do **not** start a stale reload of the old folder;
- optionally refresh/cache the old folder out of band only if it cannot mutate current UI/navigation generation;
- success feedback should identify the actual created path from the operation receipt, not infer success location from current browse state.

Unknown settlement/reconciliation of the Yandex create itself remains governed by the existing Create Folder mutation owner; P1-223 is only the extension-page presentation/navigation race after a verified result.

## Required regressions

1. Create in A, no navigation -> A refreshes and shows new folder.
2. Create in A, user starts B navigation before create settles -> B remains the winning navigation.
3. B list settles before create -> create success does not send UI back to A.
4. Create fails after user navigated -> error may be shown but does not mutate browse path/list generation.
5. Create result is unknown/reconciled later -> no stale navigation reload is injected into current browser state.
6. Two browse requests still retain existing latest-generation semantics.

## Duplicate check / numbering

Repository search for Create Folder + `currentBrowsePath` + browse-generation/stale completion found no existing dedicated audit item. Existing folder listing generation protects request-vs-request order; existing Yandex Create Folder reconciliation/auth-generation owners protect the remote mutation. Neither protects newer user navigation from a late mutation-completion refresh.

Current repository search found no `P1-223`; P1-222 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-223**.

## Validation state

Documentation only. Historical 88/88 syntax + 74/74 deterministic PASS were not rerun for this HEAD.