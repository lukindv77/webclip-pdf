# P1-223 — Create Folder completion must not supersede newer browse intent

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-223`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`options.js` Git blob: `e603455b346f56d047a650b03986453c3ad663a9`  
Research branch: `research/p1-223-create-folder-browse-intent-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-223 remains the single current owner for this root cause:

> Create Folder remote mutation target and UI browse-refresh authority are separate generations; late completion cannot supersede newer navigation.

The remote mutation target is already captured correctly before the `await`. The defect is not remote retargeting. The defect is that successful completion later starts a new visible folder reload using mutable `currentBrowsePath`, which can cancel a newer user navigation already in flight.

This research binds the historical `RESEARCH_DELTA_OPTIONS_CREATE_FOLDER_STALE_BROWSE_COMPLETION_2026-08-29.md` finding to current `main`, models the exact A/B race, and adds a source-bound production closure gate. No new P-code is required.

## 2. Positive control — ordinary folder list navigation is generation-fenced

Current `options.js` has:

```js
let folderBrowseGeneration = 0;
let folderBrowseLoadingGeneration = 0;
```

`loadFolders(path)` starts with:

```js
const generation = ++folderBrowseGeneration;
folderBrowseLoadingGeneration = generation;
```

and after the async list response checks:

```js
if (generation !== folderBrowseGeneration) return;
```

The error path is also generation-fenced.

This is a correct latest-navigation-wins mechanism for competing list requests. A slow older list response cannot normally replace a newer navigation.

## 3. Current Create Folder flow

Current Create Folder code captures:

```js
const name = newFolderName.value.trim();
const path = joinPath(currentBrowsePath, name);
```

before sending:

```js
WEBCLIP_YANDEX_CREATE_FOLDER { path }
```

This is important positive evidence: the physical create target is immutable once admitted. If the user later browses from A to B, the remote operation still creates the requested child under A. P1-223 must not "fix" the race by retargeting the already-admitted mutation to B.

After the worker response, however, current code does:

```js
requireOk(response);
newFolderName.value = '';
await loadFolders(currentBrowsePath);
showMessage(`Папка создана: ${response.path}`, 'ok');
```

The call to `loadFolders(currentBrowsePath)` is the P1-223 authority defect.

## 4. Exact stale-navigation schedule

Let the folder picker currently display parent A.

1. User starts Create Folder `A/New`.
2. The code captures exact remote target `/A/New` and awaits the remote mutation.
3. While create is pending, user clicks folder B.
4. `loadFolders(B)` starts as browse generation G1.
5. Until G1 returns, `currentBrowsePath` can still be A because current path is published only on successful current list completion.
6. Remote Create Folder A completes first.
7. Current completion executes `loadFolders(currentBrowsePath)` and therefore starts another load of A as G2.
8. `folderBrowseGeneration` is now G2.
9. The pending B response G1 arrives and is correctly rejected as stale by the ordinary generation fence.
10. The UI remains/returns to A, even though B was the newer user navigation intent.

The ordinary `loadFolders()` fence is therefore working exactly as designed; P1-223 arises because an old mutation completion incorrectly admits a **new navigation generation** after the user already admitted B.

## 5. Required dual receipt

Create Folder needs two independent captures at admission:

### Remote mutation receipt

```text
CreateMutationReceipt {
  createGeneration
  parentPath
  targetPath
  operation identity / worker receipt as required by other owners
}
```

This controls the physical remote mutation and does not change when browsing changes.

### UI refresh relevance receipt

```text
BrowseIntentReceipt {
  browseGenerationAtAdmission
  parentPathAtAdmission
}
```

This controls only whether a later success is still allowed to start a visible refresh.

The two receipts must not be conflated.

## 6. Post-success rule

After successful create settlement:

```text
if current folderBrowseGeneration == browseGenerationAtAdmission:
    refresh parentPathAtAdmission
else:
    do not start any visible reload from this old create completion
```

The refresh must use the admitted parent path, not mutable `currentBrowsePath`.

Even if the user has navigated away and later back to the same textual path A, a newer browse generation is still a newer intent. The old create completion should not create another competing visible navigation generation merely because the path strings happen to match.

An implementation may optionally refresh/cache the old parent out of band, but that activity must not increment or mutate the current visible browse generation.

## 7. Success feedback authority

Create success feedback may still report the actual physical result:

```js
response.path
```

This is separate from current UI location.

If the user is now browsing B, the UI can truthfully say "Folder created: /A/New" without forcing navigation back to A.

## 8. Adjacent P1-222 coverage found during this pass

The same current handler also does:

```js
newFolderName.value = '';
```

after awaiting the create result.

If the user types a new folder-name draft while the old create is pending, this can erase the newer draft. That is not P1-223; it is an additional concrete instance of existing **P1-222 latest-user-edit-wins**.

P1-223 remains limited to browse/navigation authority. Production work should compose both owners in this handler:

- P1-223 decides whether a visible folder reload is still relevant;
- P1-222 decides whether the captured `newFolderName` draft is still current enough to clear.

## 9. Owner boundaries

P1-223 does not replace:

- `P0-074` immutable account/root/config context for Yandex operations;
- `P1-157` Chrome/runtime lifetime semantics;
- `P1-210` lost outer transport result reconciliation;
- `P1-222` editable Options draft ownership;
- folder-list `folderBrowseGeneration` itself, which is a positive control and should remain.

P1-223 owns only the right of a **late create completion** to start a new visible browse refresh.

## 10. Deterministic model

Added:

`project_tools/test_p1_223_create_folder_browse_intent_model.js`

The model first reproduces the current-shape A/B race, then covers:

A. no navigation after create admission -> refresh admitted parent A;
B. B starts while create A is pending -> no A reload; B wins;
C. B completes before create -> B stays current and success still reports A/New;
D. B then C start while create A is pending -> C remains authoritative;
E. physical create target remains immutable `/A/New` despite later browse B;
F. newer navigation back to the same textual A path still counts as newer intent;
G. failed create has no post-success refresh authority;
H. optional background cache refresh of A does not mutate visible browse generation.

Expected output:

```text
P1-223 current-shape counterexample: late create completion supersedes newer browse B
P1-223 Create Folder browse-intent deterministic model: PASS
```

This is deterministic UI state-machine evidence, not physical Chrome/Yandex evidence.

## 11. Source-bound closure gate

Added:

`project_tools/test_p1_223_create_folder_browse_intent_source.js`

The gate preserves positive controls for:

- `folderBrowseGeneration`;
- `loadFolders()` generation advancement;
- stale list-response rejection;
- immutable `path = joinPath(currentBrowsePath, name)` before Create Folder await.

It then requires:

1. capture of browse generation at Create Folder admission;
2. capture of parent path at admission;
3. post-success visible refresh only when browse generation is unchanged;
4. visible refresh of the admitted parent, not mutable `currentBrowsePath`;
5. rejection of the current blind `await loadFolders(currentBrowsePath)` shape;
6. success feedback tied to actual `response.path`.

Current production source is expected RED against this contract.

## 12. Required regressions before closure

1. Create A/New, no navigation -> success refreshes A and displays New.
2. Create A/New pending, browse B starts -> create completion does not start A reload; B remains latest generation.
3. Same, B response arrives after create -> B is still accepted, not made stale by create completion.
4. Same, B response arrives before create -> B remains current after create settles.
5. Create A/New pending, browse B then C -> C remains current.
6. User navigates A -> B -> A with a newer generation while create is pending -> old create does not force an extra A reload.
7. Physical mutation receipt always reports/retains `/A/New`; it is never retargeted to B.
8. Create failure starts no success refresh.
9. Create success message identifies actual created path even when current UI is elsewhere.
10. Optional background refresh/cache for old A cannot increment current visible navigation generation.
11. P1-222 composition: newer `newFolderName` draft survives old create completion.
12. Lost/unknown create result composes with P1-210 and must not blindly start a fresh mutation merely to refresh UI.

Physical Options-page evidence should exercise actual timing with delayed create and delayed list responses, because the bug depends on `currentBrowsePath` publication timing relative to `folderBrowseGeneration`.

## 13. Conclusion

Fresh current-source review confirms P1-223. The remote create target is already captured correctly, and ordinary folder list responses are already latest-navigation-wins. The missing authority is specifically the post-create visible refresh: old mutation completion can admit a newer A reload after the user has already admitted B.

P1-223 remains ACTIVE. Production closure requires a dual mutation/browse receipt, generation-fenced post-success refresh relevance, deterministic source regression and applicable physical Options-page evidence.
