# Audit delta — cross-origin frame selection/control generation

Date: 2026-08-27
Source-of-truth `main` immediately before initial write: `aa7978e106a12b5cf0f1e2740eb26484cb2df973`.
Latest refinement baseline: `7c398b6e1d0ea904439e76307859f6957807c1a3`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. This checkpoint does not claim synchronization into both canonical audit files.

## P1-200 — remote frame selection/control commands are not session-generation fenced

**Status:** CONFIRMED by source audit; pending canonical sync and implementation.

### Root cause

Cross-origin frame selection/control commands are relayed asynchronously through top `content.js` → service worker → child `frame-agent.js`, but the command protocol carries no selection-session generation or monotonic command sequence.

Top-frame callers intentionally launch several control mutations fire-and-forget:

- `setSelectionMode()` calls `commandMappedRemoteFrames('set-mode', { mode })` without awaiting actual settlement;
- `clearSelections()` can call `commandMappedRemoteFrames('clear')` fire-and-forget;
- `stopSelection()` calls `commandMappedRemoteFrames('stop', { clear })` fire-and-forget;
- a newly registered frame while top state is selecting receives `targetRemoteFrame(..., 'start', {mode})` asynchronously.

The service worker does not serialize commands per `{tab, frame, selectionSession}`. `sendFrameAgentCommand()` independently performs a bounded host-permission check and then an independently bounded `tabs.sendMessage`. Two valid commands launched in order A→B can therefore reach the child in order B→A when their prerequisite/IPC latency differs.

`frame-agent.js` accepts the command solely by name and mutates one unversioned state object:

- `start(mode)` unconditionally sets `phase='selecting'`, assigns `mode`, installs listeners;
- `set-mode` unconditionally assigns `state.mode`;
- `clear` unconditionally removes all current include/exclude selections;
- `stop(clearToo)` unconditionally removes listeners and sets `phase='idle'`;
- `restore` mutates current selection maps.

There is no command/session generation check and no last-applied sequence.

### Deterministic failure examples

#### Old stop overtakes new start

1. Selection session A begins closing and sends `stop(A)`; its worker permission/RPC path is delayed.
2. User immediately starts selection session B in the same unchanged document; `start(B)` reaches the child first.
3. Top UI is visibly in selection mode B.
4. Delayed `stop(A)` now reaches the child and sets `phase='idle'`, removing click/keydown selection listeners.
5. A subsequent real user click in that cross-origin iframe is no longer intercepted as WebClip selection and may execute the page's native navigation/control behavior.

This is a control-plane authority mismatch, not just stale display state.

#### Old mode change overtakes latest mode

1. Top sends `set-mode(exclude)`.
2. User switches back to Include and top sends `set-mode(include)`.
3. Include reaches the child first; old Exclude arrives later.
4. Top UI says «Включены», but the child frame treats the next user click as Exclude.

The resulting selection snapshot/PDF semantics can therefore contradict the mode the user explicitly sees.

#### Old clear overtakes new selections

A fire-and-forget `clear` from an earlier selection lifecycle can arrive after a newer `start`/restore/user selection and erase newer remote selections because clear has no generation ownership.

### Child-local Escape independently desynchronizes authoritative phase

Fresh refinement found the same authority split even without command reordering.

`frame-agent.js` installs a local `keydown` handler. If Escape is pressed while child `state.phase !== 'idle'`, the child directly:

1. sets `state.phase='idle'`;
2. removes its click/keydown selection listeners;
3. sends a state event with `phase:'idle'`.

Top `content.js::handleRemoteFrameEvent()` handles `event === 'state'` only when a snapshot is present; it stores `remote.snapshot` and updates counts. It does not consume the child `phase` as an authoritative transition of the top selection session.

Therefore:

1. top and child begin one valid selection session;
2. focus is inside the cross-origin iframe and user presses Escape;
3. child becomes idle and removes selection listeners;
4. top toolbar/session remains `selecting` and still displays the current Include/Exclude mode;
5. the next user click inside that iframe is native page interaction rather than WebClip selection even though the top UI still says selection is active.

The protocol has two independent writers of selection lifecycle state (top commands and child-local Escape) without one generation-aware authority/acknowledgement model.

### Classification / duplicate check

`P1-200` was free in the fresh canonical registry when assigned. A later repository-wide audit-delta review also found existing command-identity checkpoints for top-document navigation (`P1-175/P1-171`) and OperationLog generation (`P1-197`), but no prior same-document remote selection/control-generation owner.

This is not a duplicate of:

- **P1-171** — document/navigation identity of frame registry and commands. P1-200 reproduces in one unchanged document with correct frame/document identity.
- **P1-175** — top-document command admission/retargeting across navigation. P1-200 is child-frame same-document session/control ordering.
- **P1-199** — print-operation generation for `prepare-print`/`restore-print`. P1-200 concerns ordinary selection/control state (`start/stop/set-mode/clear/restore`) before print and requires a selection-session/control ordering contract.
- **P1-167** — aggregate PDF-preparation work/deadline. Short commands can still reorder even when every call is fast/bounded.
- **P1-004** — feature-level cross-origin iframe support umbrella. P1-200 is a concrete same-document command/state authority defect.

P1-199 and P1-200 may share a protocol primitive (versioned command envelope), but they require different lifecycle generations: print generation must not be conflated with selection-session generation.

### Required contract

Introduce a document-bound **selectionSessionId / selectionGeneration** plus monotonic control sequence for remote frame commands and one explicit authority model for child-local lifecycle events.

Required invariants:

1. Every top-level start of a selection lifecycle creates/increments a generation bound to the current top/child document generation from P1-171.
2. `start`, `set-mode`, `clear`, `stop` and `restore` carry that generation; child rejects commands for older generations.
3. Within one generation, mutating control commands carry a monotonic sequence or pass through a per-frame serialized actual-settlement queue so a lower sequence cannot overwrite a higher one.
4. `stop(A)` must never stop selection generation B.
5. `set-mode` latest-wins exactly: child mode after settlement must equal current top UI mode.
6. `clear(A)` must not erase selections created/restored in B.
7. `restore` from an old snapshot/application attempt must not mutate a newer interactive session.
8. Child state responses/events carry generation so top does not accept stale snapshots/phase as current.
9. Escape/local child lifecycle cannot silently create an `idle child / selecting top` split. Either Escape is promoted as a generation-bound request/event that consistently changes the authoritative top session, or the child remains under top authority and does not independently terminate selection.
10. Any child-originated phase transition is acknowledged/reconciled before top UI continues to advertise selection authority for that frame.
11. Navigation/document replacement still invalidates everything per P1-171.
12. Print generation P1-199 is layered on top of the current selection generation and remains separately fenced.

Do not solve this by blind retry after timeout. A local timeout is not proof a command was not delivered; generation/sequence makes late delivery harmless.

### Required regressions

Use deterministic delayed worker/child command delivery:

1. delayed `stop(A)` → `start(B)` → deliver stop(A): child remains selecting B;
2. delayed `set-mode(exclude,#n)` → later `set-mode(include,#n+1)` → deliver old exclude last: final mode remains include;
3. delayed `clear(A)` → start/select in B → deliver clear(A): B selections survive;
4. old `restore(A)` delivered after interactive B starts: no mutation of B maps;
5. stale child `STATE` event from A cannot replace B snapshot/count/phase UI;
6. same-generation commands delivered out of order converge to highest valid sequence;
7. worker/runtime timeout followed by late settlement cannot alter a newer generation;
8. navigation while commands are in flight composes with P1-171 and rejects the old document generation;
9. press Escape while focus is inside a selected cross-origin frame: after settlement top and child have one consistent session phase; no visible selecting UI may coexist with an idle child that passes clicks through;
10. delayed stale Escape/state event from A cannot stop B;
11. print prepare/restore still uses its independent P1-199 generation without reopening selection-control races.

Real unpacked Chrome QA should include rapid Stop/Start, Include↔Exclude toggles, and Escape inside an intentionally delayed cross-origin iframe relay.

## Test / release state

No production files or `manifest.json` were modified by this checkpoint or refinement.

Product tests were **not rerun** for this docs-only audit write. No build/tag/release was created.
