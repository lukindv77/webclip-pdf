# Audit delta — cross-origin frame-agent lifecycle across MV3 worker restart — 2026-08-27

Source-of-truth `main` immediately before this write: `e371cbca9e1a92261c5da04accaae0132943b05a`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-203 — an injected cross-origin frame-agent can outlive the MV3 worker generation that owns its registry/control session

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide semantic duplicate-check was performed against the canonical priorities, previously read late audit deltas, the current P1-202 comment-deletion commits, and focused search for `P1-203` / worker-restart frame-agent lifecycle. Existing items cover adjacent but different failures:

- **P1-171** — child/top document identity across navigation, same-URL reload, reused frameId, stale LIST/COMMAND/REGISTER/STATE;
- **P1-201** — optional host permission revocation while an injected agent remains alive;
- **P1-192** — ownership/wake/recovery of long background operations when the service worker terminates;
- **P1-200** — command/control generation and stale response ordering within a remote-frame session;
- feature-level **P1-004** — cross-origin iframe functionality.

None of those owns the independent MV3 process-lifetime boundary in which the **same child document and same granted permission remain alive**, `frame-agent.js` remains injected and stateful, but the service worker is restarted and loses its in-memory registry.

## Fresh runtime proof

### 1. Frame-agent authority is stored only in service-worker module memory

`service-worker.js` declares:

`const frameAgentsByTab = new Map();`

The registry is not persisted and has no worker-generation receipt outside the current service-worker instance.

Therefore ordinary MV3 worker termination/restart initializes an empty registry even when already injected content/frame scripts in web documents remain alive.

### 2. The child agent registers only on script evaluation/re-evaluation

At `frame-agent.js` startup:

- if the script has already run in that child document (`__WEBCLIP_FRAME_AGENT_LOADED__`), a repeated injection sends one `WEBCLIP_FRAME_AGENT_REGISTER` and returns;
- on first evaluation the agent installs its implementation and sends one REGISTER at the end.

There is no periodic registration heartbeat, worker-generation challenge, reconnect port, or runtime-restart notification that causes the already-loaded agent to register with a newly created service worker.

Thus worker restart by itself does not re-run the agent and does not reconstruct `frameAgentsByTab`.

### 3. Ordinary STATE traffic cannot self-heal the missing registry

The agent sends `WEBCLIP_FRAME_AGENT_STATE` through `sendState()` after selection changes and several phase transitions.

Fresh worker `forwardFrameAgentState()` does:

1. derive tabId/frameId;
2. get `frameAgentsByTab` record;
3. reject when `!record` (also when documentId changed or permission is absent).

The error says the frame-agent is not registered/stale/permission-revoked.

Therefore the first STATE event after worker restart is **not** treated as a safe re-registration handshake. It fails closed at the worker boundary, while the child-side state remains alive.

### 4. The orphan agent can retain active page interception

`frame-agent.js` keeps state in the child document:

`{ phase, mode, includes, excludes, printStyle, changedAttrs, ... }`.

During `selecting` it installs capture-phase `click` and `keydown` listeners. During `review` or `printing`, the click handler calls `preventDefault`, `stopPropagation` and `stopImmediatePropagation`.

Worker restart does not remove these listeners because they live in the child renderer/document, not the service-worker process.

So a frame can remain locally in a WebClip control phase while the new worker has no registry entry through which the top frame/worker can reliably address and stop it.

### 5. `printing` is the strongest concrete orphan state

`preparePrint()`:

- sets `state.phase = 'printing'`;
- performs resource mutations tracked in `changedAttrs`;
- inserts `PRINT_STYLE_ID` and stores the style element in `state.printStyle`.

Normal rollback requires `restorePrint()` to remove the print style and restore changed attributes.

The Escape handler only:

- changes phase to idle;
- removes click/keydown listeners;
- sends STATE.

It does **not** remove `state.printStyle` and does not replay `changedAttrs` rollback.

Therefore forced worker termination after remote `prepare-print` but before matching `restore-print` can leave a cross-origin child document with WebClip print CSS/resource mutations installed even though the new worker no longer knows the agent exists. This is stronger than a temporary stale registry display: it is an orphaned DOM-control lifecycle.

### 6. Re-injection can recover registration, but it is not a crash-safe lifecycle contract

If some later flow explicitly executes `frame-agent.js` again in the same document, the loaded guard sends REGISTER and can reconstruct a new worker record.

That is a useful positive control, but it is event-dependent:

- worker restart does not guarantee such an injection;
- an orphan printing/review state can persist until an unrelated future feature path performs injection;
- registration alone does not tell the new worker whether the old session should be resumed or forcibly cleaned up;
- a new top/content session must not accidentally adopt stale selections/print state without exact generation proof.

Recovery must therefore be explicit rather than relying on future incidental reinjection.

## Why this is independent from P1-171

P1-171 is primarily a **document/navigation identity** problem: the worker has stale registry records and may address the wrong document/frame generation after reload/navigation/detach.

P1-203 reproduces with:

- no navigation;
- same tabId;
- same frameId;
- same child `documentId`;
- same top document;
- permission still granted.

Only the service-worker generation changes. The old registry disappears while the child-side agent state survives.

The fixes compose: P1-203 re-registration/recovery must still satisfy P1-171 exact child/top document identity. It must not weaken P1-171 by accepting any message from the same frameId as current authority.

## Why this is independent from P1-201

P1-201 is permission lifecycle: the agent can remain active after host permission is revoked and ordinary cleanup commands themselves become permission-blocked.

P1-203 reproduces while permission remains valid. The lost authority is the worker-memory generation, not permission state.

A unified implementation may use the same agent session-generation protocol for both restart and revoke, but the triggers and required evidence are different.

## Required P1-203 contract

### Worker-generation/session handshake

The cross-origin control plane needs an explicit worker/session generation protocol rather than assuming a module-memory map lives as long as injected agents.

A safe design should include a fresh worker-issued nonce/generation for the active top-frame selection/print session. Child agents must be able to discover that their previous worker/session is gone and reconcile without trusting host-page data.

Possible mechanisms include a bounded heartbeat/re-registration handshake or an extension-owned port/session protocol. Exact mechanism is implementation choice; the invariants below are mandatory.

### Re-registration after worker restart

An already injected child agent may re-register with a new worker only after fresh validation of:

- extension sender identity;
- still-granted exact optional host permission (including exact port scope per current audit refinement);
- exact child `documentId` / frameId;
- exact current top-document generation/documentId per P1-171;
- current feature/session generation.

Do not infer authority from tabId/frameId alone.

### Reconcile state, do not silently adopt it

When a new worker encounters an old agent with state from an unknown previous worker generation, it must make an explicit decision:

1. **resume** only if there is a durable/current top-session receipt proving the exact selection/print generation is still owned; or
2. **fail-closed cleanup** the child-local state and start from a clean idle state.

A new worker must not silently accept stale includes/excludes/printing state as belonging to a newly opened selection session merely because the same child document survived.

### Crash-safe local cleanup path

The protocol needs a way to restore child-local state even when the worker registry was lost.

For orphan `printing`, cleanup must include:

- remove `PRINT_STYLE_ID` / `state.printStyle`;
- restore all `changedAttrs` exactly once;
- restore the appropriate post-print phase or idle state;
- remove stale interception listeners when the old session is not resumed.

Cleanup addressing must itself satisfy current document/permission identity. Do not introduce a generic command surface that hostile pages can invoke.

### Top-frame convergence

The top content script must not keep stale remote-frame snapshots/session mappings after the worker generation is lost. Re-registration should either:

- reconstruct exact current child state under the same proven top-session generation; or
- emit a bounded explicit reset/removal event so top-frame selection state converges.

### Permission revoke composition

If permission was revoked while the worker was dead:

- re-registration must fail as authority;
- local child state still requires fail-closed cleanup per P1-201;
- regrant creates a **new** permission/session generation and must not automatically resurrect old selection/print state.

### No artificial persistence of hostile-page data

Do not solve restart by blindly persisting raw frame-agent snapshots/DOM locators in unrestricted storage. Any minimal recovery receipt must remain bounded, extension-owned and carry exact document/session provenance; host DOM is hostile and snapshot/privacy bounds still apply.

## Required deterministic / real-browser regressions

1. Inject agent, enter selecting, forcibly terminate service worker while child/top documents remain unchanged, wake a new worker: agent re-registers/reconciles or is cleanly stopped; it never stays indefinitely orphaned.
2. Same test in review phase: capture click interception cannot remain orphaned after restart recovery.
3. `prepare-print` succeeds, service worker is killed before `restore-print`, new worker wakes: print style and all temporary attributes are deterministically restored unless the exact same proven print session intentionally resumes.
4. Worker restart followed by child STATE before any reinjection: protocol self-heals safely; current behavior (STATE rejected forever until incidental injection) is not accepted.
5. Restart with same frameId/documentId but **new top-document generation**: P1-171 prevents adoption into the new top session.
6. Restart after same-URL child reload with reused frameId: old child/session cannot register as current generation.
7. Permission revoked while worker is down: wake/re-registration does not restore authority; child local control state is cleaned up fail-closed.
8. Permission revoked then regranted after restart: old selections/print state do not revive automatically under the new permission generation.
9. Two successive worker restarts while one child document survives: registry/session state remains bounded and converges without duplicate records/listeners.
10. >64 sequential dynamic frame lifecycles plus worker restart preserves P1-171 stale-record pruning and does not turn re-registration into unbounded registry growth.
11. Hostile child sends fake STATE/REGISTER messages after restart: extension sender/document/permission/session checks prevent self-authorization beyond the already granted exact frame capability.
12. Top-frame UI is informed of reset/resume exactly once and cannot combine pre-restart remote snapshot with a new unrelated selection generation.
13. Forced restart during `prefetchSelected()` before print-style insertion still rolls back any `changedAttrs` recorded before termination/reconciliation.
14. Worker restart while agent is idle causes only bounded handshake work and no unwanted user-visible selection/print mutation.

## Relationship to existing items

- **P1-203** owns worker-generation loss while the same injected frame document survives.
- **P1-171** owns exact top/child document generation and frameId reuse/navigation/detach.
- **P1-200** owns command/control operation generations and stale responses within a session; its receipt can be reused as part of P1-203 restart reconciliation.
- **P1-201** owns permission revocation cleanup and revoke→regrant behavior.
- **P1-193** owns user-gesture-safe permission admission and candidate generation.
- **P1-192** remains background-operation lifetime/wake scheduling; it does not own renderer-side frame-agent state.
- **P0-075** remains hostile synthetic-input/control-plane trust; restart recovery must not weaken trusted-event requirements.
- **P1-004** remains feature-level PARTIAL until all cross-origin iframe lower-level contracts and unpacked Chrome QA pass.

## Duplicate check / numbering

The fresh `main` introduced P1-202 in `AUDIT_DELTA_COMMENT_DELETION_RETENTION_SEMANTICS_2026-08-27.md`, so P1-202 is not reused.

Focused repository search found no existing P1-203 assignment or frame-agent worker-restart lifecycle delta. This checkpoint therefore evidence-reserves **P1-203**.

No new P0/P2 number is created.

## Test / release state

No production runtime/config/manifest changes were made. Product tests were not rerun for this docs-only audit checkpoint. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or Release was created.
