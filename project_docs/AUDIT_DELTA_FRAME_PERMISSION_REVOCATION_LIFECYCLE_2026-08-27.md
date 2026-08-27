# Audit delta — cross-origin frame optional-permission revocation lifecycle — 2026-08-27

Source-of-truth `main` immediately before this write: `691565558a8722b8375d23eaac575ba6d9777d35`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## New confirmed item: P1-201 — revoking optional host permission can strand a live frame-agent session

**Classification:** P1 / evidence-reserved / confirmed by source audit plus current Chrome API lifecycle contract.

Repository-wide semantic duplicate-check was performed against the canonical audit files and all current `project_docs/AUDIT_DELTA_*.md` checkpoints before assigning the number.

This is distinct from:

- `P1-193` — user-gesture/admission correctness when requesting optional host permission;
- `P1-171` — exact top/child document identity and frame registry lifetime across navigation;
- `P1-200` — selection-session/control command generation and ordering while commands remain admitted;
- `P1-199` — print prepare/restore generation ordering;
- `P0-075` — hostile-page synthetic-input/control-plane trust;
- feature-level `P1-004`, which remains the umbrella for cross-origin iframe support and real permission QA.

The missing invariant here is **revocation lifecycle ownership**: once the user removes the optional host permission, an already injected frame-agent must promptly lose WebClip behavioral authority and must not survive as an uncleanable active selection/print session in the current document.

## Source proof

### 1. Worker validates permission on REGISTER, STATE and ordinary COMMAND

The service worker correctly checks optional host permission in several places:

- `registerFrameAgent(sender)` rejects a child whose origin no longer has permission;
- `forwardFrameAgentState()` rejects STATE if the current sender/registered URL no longer has permission;
- `sendFrameAgentCommand()` rechecks permission immediately before `tabs.sendMessage()` and removes the registry record if permission is absent.

This is a valuable positive boundary: after revoke, new frame state is not intentionally accepted as trusted by the worker.

### 2. There is no `chrome.permissions.onRemoved` lifecycle handler

Fresh source search finds no `chrome.permissions.onRemoved.addListener(...)` in the current worker.

Therefore WebClip has no event-driven transition when Chrome reports that one of the optional iframe origins was revoked.

Registry cleanup happens only opportunistically when later code tries to address the frame and `sendFrameAgentCommand()` discovers the missing permission.

### 3. The ordinary cleanup path becomes impossible after revoke

`sendFrameAgentCommand()` performs the permission check **before** sending any child command.

If permission is absent it deletes the worker registry row and throws:

`Host permission для iframe отсутствует или был отозван.`

That same helper is used for lifecycle commands including:

- `stop`;
- `clear`;
- `restore-print`;
- `set-mode` and other normal controls.

Consequently, once permission has been revoked, WebClip's normal worker-mediated cleanup path refuses to send the very `stop`/`restore-print` command that would make an already injected frame-agent inert.

### 4. Already injected frame-agent has real local behavior independent of later worker permission checks

`frame-agent.js` installs capture-phase DOM listeners when `start()` is called:

- `document.addEventListener('click', click, true)`;
- `document.addEventListener('keydown', key, true)`.

While `state.phase === 'selecting'`, a usable click is intercepted with:

- `preventDefault()`;
- `stopPropagation()`;
- `stopImmediatePropagation()`;

and then mutates the frame-agent's local Include/Exclude maps/attributes.

While phase is `review` or `printing`, the click handler still prevents/default-stops the event even though it does not create a new selection.

These behaviors execute locally inside the already injected isolated-world script. They do not require another worker COMMAND for each click.

### 5. Rejected STATE messages do not stop the child

After revoke, `sendState()` can still call `chrome.runtime.sendMessage()` from the existing child script. The worker's STATE path correctly rejects it because permission is gone.

But rejection is only a failed message response. `frame-agent.js` catches/discards send errors; it does not transition itself to idle or remove listeners when the worker refuses the state update.

Thus worker-side fail-closed data admission and child-side lifecycle cleanup are currently different things.

### 6. Top content retains stale remote snapshot/state

Top `content.js` keeps `state.remoteFrames` entries and their last accepted `remote.snapshot`.

Ordinary remote lifecycle operations such as `stop`, `clear`, `set-mode` are fire-and-forget through `commandMappedRemoteFrames(...).catch(() => {})`; individual command failures are ignored unless an explicitly fail-closed print operation requested otherwise.

If permission was revoked, the worker may delete its registry row while top content still retains the previous mapped frame/snapshot and count state.

Therefore the UI can remain based on a previously selected remote frame even though current permission no longer authorizes access to that frame.

A later `prepare-print` for a selected remote frame uses `failClosed=true`, so the save can then fail because the stale top snapshot still demands a frame that the worker correctly refuses to command.

### 7. Revoke during print can strand `printing` behavior

`preparePrint()` in the child sets `state.phase = 'printing'`, mutates resource attributes and mounts the print stylesheet.

Normal cleanup requires `restore-print`, which removes the current print style, restores changed attributes and returns phase toward selecting.

If permission is revoked after `prepare-print` but before cleanup, the worker's permission precheck prevents `restore-print` from being sent through the current command helper.

The child may therefore remain in `printing` state with its capture click handler still suppressing page interaction and with temporary print/resource state not restored until another local escape/navigation/reload path happens to alter the environment.

Pressing Escape is not an adequate cleanup contract: the child Escape handler sets phase idle/removes input listeners, but it does not execute `restorePrint()` and therefore does not prove print-style/resource rollback.

### 8. Re-grant does not create a fresh agent generation

At top of `frame-agent.js`:

- if `globalThis.__WEBCLIP_FRAME_AGENT_LOADED__` is already true, a reinjection attempt only sends `WEBCLIP_FRAME_AGENT_REGISTER` and returns;
- it does **not** recreate `state`, clear old selections, remove old listeners, reset print state or establish a new permission/session generation.

Therefore revoke -> later grant -> reinjection in the **same document** can re-register the old in-memory agent rather than create a clean post-consent session.

If local Include/Exclude state changed while permission was absent, `start()` after re-grant does not clear those maps; it simply sets `phase/mode`, installs listeners (idempotently) and sends the current snapshot.

This means state that survived the revoked interval can become visible/current again after re-grant even though the new grant should authorize a fresh explicit lifecycle, not silently resurrect an old one.

## Chrome platform contract relevant to this finding

Current Chrome documentation exposes `chrome.permissions.onRemoved` specifically to notify an extension when access has been removed.

Current `chrome.scripting` documentation also explicitly notes that unregistering content scripts does not remove scripts or styles that have already been injected. WebClip uses programmatic injection rather than dynamic registration, but the important lifecycle point is the same: extension code cannot assume that removing future injection authority itself performs cleanup inside an already running document.

Current Chrome messaging documentation describes `tabs.sendMessage()` as messaging an extension's existing content script in a tab; host permission is required to **inject** into arbitrary hosts, while WebClip's additional permission check in `sendFrameAgentCommand()` is its own fail-closed policy. Therefore cleanup of an already-known exact injected agent needs an explicit narrowly scoped revocation path rather than relying on ordinary privileged-command admission.

Real unmanaged Chrome QA remains required to characterize revoke/re-grant behavior exactly for the project's supported Chrome build, but the current source has no safe lifecycle even under the conservative assumption that the injected isolated-world context survives until document replacement.

## User-visible / correctness effects

A permission revoke during an active cross-origin frame session can produce one or more of:

- clicks inside the iframe remain swallowed by the old agent even though the user revoked access;
- top UI retains stale Include/Exclude counts/snapshot for the revoked frame;
- ordinary Stop/Clear cannot reach the agent because the worker refuses the command after permission loss;
- PDF preparation fails closed later because top state still references a selected frame that is no longer commandable;
- revoke during print leaves child print/resource mutations incompletely restored;
- re-grant in the same document re-registers an old in-memory selection/print session instead of establishing a fresh permission generation.

The worker's data-admission checks prevent this from being classified as a confirmed post-revoke confidentiality exfiltration. The confirmed issue is lifecycle/control correctness and honoring user revocation promptly, hence P1 rather than P0.

## Required P1-201 contract

### Permission-generation authority

Treat optional host permission as a lifecycle generation/capability, not only a boolean checked at each command.

For every registered remote frame, bind at least:

- exact child document identity from `P1-171`;
- top document generation;
- granted origin/pattern;
- permission generation/receipt;
- current selection session generation (`P1-200`);
- current print generation when applicable (`P1-199`).

A permission generation becomes permanently stale when Chrome reports removal of that origin.

### Event-driven revocation

Listen to `chrome.permissions.onRemoved` and identify affected registered frame agents immediately.

On revoke:

1. invalidate/remove affected worker registry authority;
2. notify exact top document/session so stale remote snapshots/counts are removed or explicitly marked unavailable;
3. attempt a **cleanup-only** command to the exact already injected child document when it is still reachable;
4. cleanup command must not grant or reuse ordinary page-data authority and must not accept new selection/content data after revoke;
5. if exact child cleanup cannot be delivered/proved, top state still becomes revoked/fail-closed and the condition is surfaced diagnostically until document replacement.

Do not route this cleanup through the same permission precheck that intentionally blocks ordinary `start/set-mode/restore/prepare-print` commands after revoke.

### Child fail-safe

The child agent needs an explicit revocation/disable transition that is idempotent and local:

- remove click/keydown listeners;
- restore any print-owned temporary state safely by exact generation;
- clear or quarantine selection maps/markers according to product policy;
- reject later ordinary commands from an old permission/session generation;
- remain inert until a fresh granted generation is explicitly started.

A child-side runtime disconnect/error alone is not proof of revoke and should not blindly clear legitimate state; revocation must come from worker-owned permission authority or exact session teardown.

### Re-grant must be fresh

Granting the same origin again must establish a new permission generation.

An already-loaded `__WEBCLIP_FRAME_AGENT_LOADED__` instance may be reused as code, but its old lifecycle state must not silently become current. Re-registration must reset/reconcile to the newly issued generation before `start`, and stale pre-revoke snapshots/print generations cannot cross that boundary.

### Compose with P1-200/P1-199

Permission generation is orthogonal to selection and print generations:

- `stop(A-permission)` cannot affect a newer re-granted generation B except through an explicit safe cleanup rule;
- old selection-session events cannot become valid merely because origin permission is later granted again;
- old `restore-print` cannot touch a newer print generation;
- revoked permission must dominate all ordinary session commands regardless of their sequence number.

## Required deterministic/browser regressions

1. Start remote selection under permission generation A; revoke origin; immediately click inside iframe: old agent no longer intercepts the click after revocation cleanup settles.
2. Revoke while top UI has remote includes: top removes/marks unavailable the remote snapshot and does not continue showing it as currently authorized selection.
3. Revoke then call ordinary Stop/Clear: cleanup does not depend on an ordinary permission-authorized command and leaves child inert.
4. Revoke while child phase is `review`: page clicks are no longer swallowed after cleanup.
5. Revoke after `prepare-print(A)` but before `restore-print(A)`: child print style/resource attrs are restored/neutralized exactly; no permanent `printing` state survives.
6. Revoke when cleanup delivery fails because child navigated/detached: worker/top still invalidate authority; no stale snapshot remains usable.
7. Revoke -> interact with page -> re-grant same origin in same document: a fresh permission generation starts with no selections created/changed during revoked interval.
8. Re-grant does not accept delayed STATE/REGISTER from pre-revoke generation as current.
9. Revoke one of several allowed origins: only affected frames are invalidated; unrelated granted frame sessions continue normally.
10. Permission removal event for an unrelated optional permission does not tear down valid frame agents.
11. Same-origin iframe path remains unaffected; P0-003 behavior is preserved.
12. Navigation/document replacement during revoke composes with P1-171 and cannot retarget cleanup to a reused frameId/document.
13. Delayed old selection/control messages compose with P1-200 and remain stale even after re-grant.
14. Delayed old print cleanup composes with P1-199 and cannot roll back a newer print generation.
15. Real unpacked Chrome: revoke from extension/site-access UI while actively selecting in a cross-origin iframe, verify immediate inert behavior, then re-grant and verify clean new session.

## Classification / numbering

- New evidence-reserved `P1-201` assigned by this audit block.
- `P1-004` remains the feature-level cross-origin iframe umbrella and stays PARTIAL until P1-171/P1-193/P1-199/P1-200/P1-201 plus real permission QA are closed.
- `P1-193` remains permission-request user-gesture/admission.
- `P1-200` remains selection/control ordering.
- `P1-199` remains print-generation ordering.
- `P0-075` remains hostile-page control-plane trust.
- No new P0 or P2 number is assigned.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.